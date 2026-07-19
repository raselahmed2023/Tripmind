import { Types } from 'mongoose';
import * as tools from './ai.tools';
import { TRIP_PLANNER_SYSTEM_PROMPT, TRIP_PLANNER_TEMPLATE } from './ai.prompts';
import { AITripPlanRequest, AITripPlanResponse } from './ai.types';
import { tripPlannerRequestSchema } from './ai.validation';
import { ApiError } from '../../utils/ApiError';
import { safeNotify } from '../notification/notification.service';
import { generateWithFallback, AIInput } from '../../services/ai-provider.service';

const sanitizeInput = (val: string): string => {
  return val.replace(/[<>{}]/g, '').trim();
};

const parseAIResponse = (text: string): AITripPlanResponse => {
  let cleaned = text.trim();

  // Strip markdown code fences
  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  } else {
    cleaned = cleaned.replace(/^`{3}(?:json)?\s*\n?/, '').replace(/\n?\s*`{3}\s*$/, '');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw ApiError.internal('AI returned invalid JSON. Please try again.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw ApiError.internal('AI returned unexpected response format. Please try again.');
  }

  return parsed as AITripPlanResponse;
};

const validateResponse = (data: AITripPlanResponse, durationDays: number): void => {
  if (!data.summary || typeof data.summary !== 'string') {
    throw ApiError.internal('AI response missing summary');
  }
  if (!Array.isArray(data.days) || data.days.length === 0) {
    throw ApiError.internal('AI response missing days');
  }
  const dayNumbers = new Set<number>();
  const activityTitles = new Set<string>();
  for (const day of data.days) {
    if (dayNumbers.has(day.dayNumber)) {
      throw ApiError.internal('Duplicate day number: ' + day.dayNumber);
    }
    dayNumbers.add(day.dayNumber);
    if (!Array.isArray(day.activities)) {
      throw ApiError.internal('Day ' + day.dayNumber + ' missing activities');
    }
    for (const act of day.activities) {
      const key = day.dayNumber + ':' + act.title.toLowerCase();
      if (activityTitles.has(key)) {
        throw ApiError.internal('Duplicate activity: ' + act.title + ' on day ' + day.dayNumber);
      }
      activityTitles.add(key);
      if (typeof act.estimatedCost !== 'number' || act.estimatedCost < 0) {
        throw ApiError.internal('Invalid cost for activity: ' + act.title);
      }
    }
  }
  if (data.days.length !== durationDays) {
    throw ApiError.internal('Expected ' + durationDays + ' days but got ' + data.days.length);
  }
  if (!data.costBreakdown || typeof data.costBreakdown !== 'object') {
    throw ApiError.internal('AI response missing costBreakdown');
  }
  for (const val of Object.values(data.costBreakdown)) {
    if (typeof val !== 'number' || val < 0) {
      throw ApiError.internal('Invalid cost breakdown value');
    }
  }
};

export const generateTripPlan = async (requestBody: Record<string, unknown>, userId: string, tripId: string) => {
  tripPlannerRequestSchema.parse(requestBody);

  const user = await tools.getUser(userId);
  const trip = await tools.getTrip(tripId);

  if (trip.userId.toString() !== userId) {
    throw ApiError.forbidden('You can only generate plans for your own trips');
  }

  // Check payment
  if (!trip.isPlanPurchased || trip.paymentStatus !== 'paid') {
    throw ApiError.paymentRequired('Purchase this trip plan before generating the itinerary.');
  }

  const destination = await tools.getDestination(
    (trip.destinationId as Types.ObjectId).toString()
  );

  const durationDays = tools.calculateTripDays(
    trip.startDate.toISOString(),
    trip.endDate.toISOString()
  );
  const dailyBudget = tools.calculateBudget(trip.budget, durationDays, trip.travelers);

  const context: AITripPlanRequest = {
    destination: {
      title: destination.title,
      country: destination.country,
      city: destination.city,
      shortDescription: destination.shortDescription,
      fullDescription: destination.fullDescription,
      category: destination.category,
      averageDailyCost: destination.averageDailyCost,
      currency: destination.currency,
      bestSeason: destination.bestSeason,
      recommendedDays: destination.recommendedDays,
      highlights: destination.highlights,
    },
    trip: {
      startDate: trip.startDate.toISOString().split('T')[0],
      endDate: trip.endDate.toISOString().split('T')[0],
      durationDays,
      budget: trip.budget,
      dailyBudget,
      travelers: trip.travelers,
      currency: trip.currency,
      travelStyle: trip.travelStyle,
      interests: trip.interests,
      accommodationPreference: trip.accommodationPreference,
      transportPreference: trip.transportPreference,
      dietaryRequirements: sanitizeInput(requestBody.dietaryPreferences as string || ''),
      accessibilityRequirements: sanitizeInput(requestBody.accessibilityNeeds as string || ''),
      additionalNotes: sanitizeInput(requestBody.additionalNotes as string || ''),
    },
  };

  safeNotify({
    userId: userId,
    type: 'ai_generation_started',
    title: 'AI Trip Plan Generation Started',
    message: 'Generating your trip plan for ' + destination.title + ', ' + destination.city,
    relatedEntityType: 'trip',
    relatedEntityId: tripId,
    metadata: { destinationTitle: destination.title },
  });

  const prompt = TRIP_PLANNER_TEMPLATE(context);

  const startTime = Date.now();
  let result: AITripPlanResponse | null = null;
  let lastError: Error | null = null;
  let tokenUsage = undefined;
  let providerUsed = '';

  const aiInput: AIInput = {
    prompt,
    systemInstruction: TRIP_PLANNER_SYSTEM_PROMPT,
  };

  try {
    const aiResult = await generateWithFallback(aiInput);
    result = parseAIResponse(aiResult.text);
    validateResponse(result, durationDays);
    tokenUsage = aiResult.tokenUsage;
    providerUsed = aiResult.providerUsed;
  } catch (err) {
    lastError = err as Error;
    console.error('[AI] Generation failed:', (err as Error).message);
  }

  if (!result) {
    console.error('[AI] Generation failed');
    safeNotify({
      userId: userId,
      type: 'ai_generation_failed',
      title: 'AI Trip Plan Generation Failed',
      message: 'Failed to generate trip plan for ' + destination.title + '. Please try again.',
      relatedEntityType: 'trip',
      relatedEntityId: tripId,
      metadata: { error: lastError?.message || 'Unknown error' },
    });

    throw ApiError.internal('Failed to generate trip plan: ' + (lastError?.message || 'Unknown error'));
  }

  if (!tools.validateBudget(result.costBreakdown, trip.budget)) {
    console.warn('[AI] Budget mismatch detected, adding warning');
    result.warnings.push('Generated plan exceeds budget by more than 15%. Consider adjusting activities.');
    safeNotify({
      userId: userId,
      type: 'budget_warning',
      title: 'Budget Warning',
      message: 'Your trip plan for ' + destination.title + ' exceeds your budget by more than 15%',
      relatedEntityType: 'trip',
      relatedEntityId: tripId,
      metadata: { budget: trip.budget, currency: trip.currency },
    });
  }

  const itinerary = await tools.saveItinerary({
    tripId: new Types.ObjectId(tripId),
    userId: user._id,
    destinationId: destination._id,
    summary: result.summary,
    days: result.days,
    costBreakdown: result.costBreakdown,
    warnings: result.warnings,
    recommendations: result.recommendations,
    generatedAt: new Date(),
    aiModel: providerUsed,
    tokenUsage,
  });

  await tools.updateTripItinerary(tripId, {
    itineraryId: itinerary._id,
    estimatedCost: Object.values(result.costBreakdown).reduce((s, v) => s + v, 0),
  });

  safeNotify({
    userId: userId,
    type: 'ai_generation_completed',
    title: 'AI Trip Plan Generated',
    message: 'Your trip plan for ' + destination.title + ' has been generated successfully',
    relatedEntityType: 'trip',
    relatedEntityId: tripId,
    metadata: { itineraryId: itinerary._id.toString(), destinationTitle: destination.title, provider: providerUsed },
  });

  console.log('[AI] Itinerary saved: ' + itinerary._id + ', provider: ' + providerUsed);
  return { itinerary, generationTime: Date.now() - startTime };
};
