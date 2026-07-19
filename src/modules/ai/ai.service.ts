import { Types } from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../../config';
import * as tools from './ai.tools';
import { TRIP_PLANNER_SYSTEM_PROMPT, TRIP_PLANNER_TEMPLATE } from './ai.prompts';
import { AITripPlanRequest, AITripPlanResponse } from './ai.types';
import { tripPlannerRequestSchema } from './ai.validation';
import { ApiError } from '../../utils/ApiError';
import { safeNotify } from '../notification/notification.service';
import { reserveCredit, rollbackCredit } from '../subscription/subscription.service';

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

const sanitizeInput = (val: string): string => {
  return val.replace(/[<>{}]/g, '').trim();
};

const parseAIResponse = (text: string): AITripPlanResponse => {
  let cleaned = text.trim();
  if (cleaned.startsWith('`')) {
    cleaned = cleaned.replace(/^`(?:json)?\n?/, '').replace(/\n?`$/, '');
  }
  return JSON.parse(cleaned) as AITripPlanResponse;
};

const validateResponse = (data: AITripPlanResponse, durationDays: number, _dailyBudget: number): void => {
  if (!data.summary || typeof data.summary !== 'string') {
    throw ApiError.badRequest('AI response missing summary');
  }
  if (!Array.isArray(data.days) || data.days.length === 0) {
    throw ApiError.badRequest('AI response missing days');
  }
  const dayNumbers = new Set<number>();
  const activityTitles = new Set<string>();
  for (const day of data.days) {
    if (dayNumbers.has(day.dayNumber)) {
      throw ApiError.badRequest('Duplicate day number: ' + day.dayNumber);
    }
    dayNumbers.add(day.dayNumber);
    if (!Array.isArray(day.activities)) {
      throw ApiError.badRequest('Day ' + day.dayNumber + ' missing activities');
    }
    for (const act of day.activities) {
      const key = day.dayNumber + ':' + act.title.toLowerCase();
      if (activityTitles.has(key)) {
        throw ApiError.badRequest('Duplicate activity: ' + act.title + ' on day ' + day.dayNumber);
      }
      activityTitles.add(key);
      if (typeof act.estimatedCost !== 'number' || act.estimatedCost < 0) {
        throw ApiError.badRequest('Invalid cost for activity: ' + act.title);
      }
    }
  }
  if (data.days.length !== durationDays) {
    throw ApiError.badRequest('Expected ' + durationDays + ' days but got ' + data.days.length);
  }
  if (!data.costBreakdown || typeof data.costBreakdown !== 'object') {
    throw ApiError.badRequest('AI response missing costBreakdown');
  }
  for (const val of Object.values(data.costBreakdown)) {
    if (typeof val !== 'number' || val < 0) {
      throw ApiError.badRequest('Invalid cost breakdown value');
    }
  }
};

export const generateTripPlan = async (requestBody: Record<string, unknown>, userId: string, tripId: string) => {
  const input = tripPlannerRequestSchema.parse(requestBody);

  const hasCredit = await reserveCredit(userId);
  if (!hasCredit) {
    throw ApiError.badRequest(
      'No AI generation credits remaining. Upgrade to Pro or purchase a Credit Pack.',
    );
  }

  let generationSucceeded = false;

  try {
    const user = await tools.getUser(userId);
    const trip = await tools.getTrip(tripId);
    if (trip.userId.toString() !== userId) {
      throw ApiError.forbidden('You can only generate plans for your own trips');
    }
    const destination = await tools.getDestination(input.destinationId);
    const durationDays = tools.calculateTripDays(input.startDate, input.endDate);
    const dailyBudget = tools.calculateBudget(input.budget, durationDays, input.travelers);

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
        startDate: input.startDate,
        endDate: input.endDate,
        durationDays,
        budget: input.budget,
        dailyBudget,
        travelers: input.travelers,
        currency: input.currency,
        travelStyle: input.travelStyle,
        interests: input.interests,
        accommodationPreference: input.accommodationPreference,
        transportPreference: input.transportPreference,
        dietaryRequirements: input.dietaryRequirements,
        accessibilityRequirements: input.accessibilityRequirements,
        additionalNotes: sanitizeInput(input.additionalNotes),
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
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: TRIP_PLANNER_SYSTEM_PROMPT,
    });

    const startTime = Date.now();
    let result: AITripPlanResponse | null = null;
    let lastError: Error | null = null;
    let tokenUsage = undefined;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await model.generateContent(prompt);
        const responseText = response.response.text();
        const usageMetadata = response.response.usageMetadata;
        if (usageMetadata) {
          tokenUsage = {
            promptTokens: usageMetadata.promptTokenCount || 0,
            completionTokens: usageMetadata.candidatesTokenCount || 0,
            totalTokens: usageMetadata.totalTokenCount || 0,
          };
        }
        console.log('[AI] Generation attempt ' + (attempt + 1) + ' completed in ' + (Date.now() - startTime) + 'ms');
        result = parseAIResponse(responseText);
        validateResponse(result, durationDays, dailyBudget);
        break;
      } catch (err) {
        lastError = err as Error;
        console.error('[AI] Generation attempt ' + (attempt + 1) + ' failed:', (err as Error).message);
        if (attempt === 1) break;
      }
    }

    if (!result) {
      console.error('[AI] All generation attempts failed');
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

    if (!tools.validateBudget(result.costBreakdown, input.budget)) {
      console.warn('[AI] Budget mismatch detected, adding warning');
      result.warnings.push('Generated plan exceeds budget by more than 15%. Consider adjusting activities.');
      safeNotify({
        userId: userId,
        type: 'budget_warning',
        title: 'Budget Warning',
        message: 'Your trip plan for ' + destination.title + ' exceeds your budget by more than 15%',
        relatedEntityType: 'trip',
        relatedEntityId: tripId,
        metadata: { budget: input.budget, currency: input.currency },
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
      model: 'gemini-2.0-flash',
      tokenUsage,
    });

    await tools.updateTripItinerary(tripId, { itineraryId: itinerary._id, estimatedCost: Object.values(result.costBreakdown).reduce((s, v) => s + v, 0) });

    safeNotify({
      userId: userId,
      type: 'ai_generation_completed',
      title: 'AI Trip Plan Generated',
      message: 'Your trip plan for ' + destination.title + ' has been generated successfully',
      relatedEntityType: 'trip',
      relatedEntityId: tripId,
      metadata: { itineraryId: itinerary._id.toString(), destinationTitle: destination.title },
    });

    generationSucceeded = true;
    console.log('[AI] Itinerary saved: ' + itinerary._id + ', trip updated');
    return { itinerary, generationTime: Date.now() - startTime };
  } finally {
    if (!generationSucceeded) {
      await rollbackCredit(userId);
    }
  }
};
