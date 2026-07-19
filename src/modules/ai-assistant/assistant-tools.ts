import { Types } from 'mongoose';
import { Trip } from '../trip/trip.model';
import { Destination } from '../destination/destination.model';
import { Itinerary } from '../itinerary/itinerary.model';
import { ApiError } from '../../utils/ApiError';

export interface ToolResult {
  toolName: string;
  result: Record<string, unknown>;
}

export const getTripContext = async (tripId: string, userId: string): Promise<ToolResult> => {
  if (!Types.ObjectId.isValid(tripId)) {
    throw ApiError.badRequest('Invalid trip ID');
  }

  const trip = await Trip.findById(tripId).populate('destinationId');
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.userId.toString() !== userId) throw ApiError.forbidden('Access denied');

  const destination = trip.destinationId as unknown as { title: string; country: string; city: string; averageDailyCost: number; highlights: string[] };

  return {
    toolName: 'get_trip_context',
    result: {
      title: trip.title,
      destination: destination.title + ', ' + destination.city + ', ' + destination.country,
      startDate: trip.startDate,
      endDate: trip.endDate,
      travelers: trip.travelers,
      budget: trip.budget,
      currency: trip.currency,
      travelStyle: trip.travelStyle,
      interests: trip.interests,
      estimatedCost: trip.estimatedCost,
      dailyBudget: Math.round((trip.budget / Math.max(1, Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)))) * 100) / 100,
      destinationHighlights: destination.highlights,
      averageDailyCost: destination.averageDailyCost,
    },
  };
};

export const getItinerary = async (tripId: string, userId: string): Promise<ToolResult> => {
  if (!Types.ObjectId.isValid(tripId)) {
    throw ApiError.badRequest('Invalid trip ID');
  }

  const trip = await Trip.findById(tripId);
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.userId.toString() !== userId) throw ApiError.forbidden('Access denied');

  if (!trip.itineraryId) {
    return {
      toolName: 'get_itinerary',
      result: { hasItinerary: false, message: 'No itinerary generated for this trip yet.' },
    };
  }

  const itinerary = await Itinerary.findById(trip.itineraryId);
  if (!itinerary) {
    return {
      toolName: 'get_itinerary',
      result: { hasItinerary: false, message: 'Itinerary not found.' },
    };
  }

  return {
    toolName: 'get_itinerary',
    result: {
      hasItinerary: true,
      summary: itinerary.summary,
      totalDays: itinerary.days.length,
      costBreakdown: itinerary.costBreakdown,
      warnings: itinerary.warnings,
      recommendations: itinerary.recommendations,
      days: itinerary.days.map(day => ({
        dayNumber: day.dayNumber,
        date: day.date,
        title: day.title,
        activityCount: day.activities.length,
        activities: day.activities.map(act => ({
          title: act.title,
          startTime: act.startTime,
          endTime: act.endTime,
          estimatedCost: act.estimatedCost,
          category: act.category,
          location: act.location,
        })),
      })),
    },
  };
};

export const summarizeBudget = async (tripId: string, userId: string): Promise<ToolResult> => {
  const tripContext = await getTripContext(tripId, userId);
  const itineraryResult = await getItinerary(tripId, userId);

  const breakdown = (itineraryResult.result as Record<string, unknown>).costBreakdown as Record<string, number> || {};
  const totalEstimated = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
  const budget = (tripContext.result as Record<string, unknown>).budget as number;
  const remaining = budget - totalEstimated;

  return {
    toolName: 'summarize_budget',
    result: {
      totalBudget: budget,
      estimatedCost: totalEstimated,
      remaining: remaining,
      percentageUsed: Math.round((totalEstimated / budget) * 100),
      breakdown,
      isOverBudget: totalEstimated > budget,
    },
  };
};

export const identifyExpensiveActivities = async (tripId: string, userId: string): Promise<ToolResult> => {
  const itineraryResult = await getItinerary(tripId, userId);
  const days = (itineraryResult.result as Record<string, unknown>).days as Array<{ activities: Array<{ title: string; estimatedCost: number; category: string; location: string }> }> || [];

  const allActivities: Array<{ title: string; estimatedCost: number; category: string; location: string; dayNumber: number }> = [];
  days.forEach((day, idx) => {
    day.activities.forEach(act => {
      allActivities.push({ ...act, dayNumber: idx + 1 });
    });
  });

  allActivities.sort((a, b) => b.estimatedCost - a.estimatedCost);

  return {
    toolName: 'identify_expensive_activities',
    result: {
      expensiveActivities: allActivities.slice(0, 5),
      totalActivities: allActivities.length,
      averageCost: allActivities.length > 0
        ? Math.round(allActivities.reduce((sum, a) => sum + a.estimatedCost, 0) / allActivities.length)
        : 0,
    },
  };
};

export const suggestLowerCostReplacements = async (tripId: string, userId: string, category?: string): Promise<ToolResult> => {
  const trip = await Trip.findById(tripId);
  if (!trip) throw ApiError.notFound('Trip not found');
  if (trip.userId.toString() !== userId) throw ApiError.forbidden('Access denied');

  const destination = await Destination.findById(trip.destinationId);
  if (!destination) throw ApiError.notFound('Destination not found');

  const suggestions = [
    'Consider visiting free attractions like parks, markets, and walking tours',
    'Look for combo tickets or city passes that bundle attractions',
    'Eat at local street food vendors instead of sit-down restaurants',
    'Use public transportation instead of taxis or ride-shares',
    'Visit attractions during free or discounted hours',
    'Look for accommodation with included breakfast to reduce food costs',
  ];

  if (category) {
    return {
      toolName: 'suggest_lower_cost_replacements',
      result: {
        category,
        destination: destination.title,
        suggestions: suggestions.filter(s => s.toLowerCase().includes(category.toLowerCase()) || true),
      },
    };
  }

  return {
    toolName: 'suggest_lower_cost_replacements',
    result: {
      destination: destination.title,
      averageDailyCost: destination.averageDailyCost,
      suggestions,
    },
  };
};

export const identifyLongTravelGaps = async (tripId: string, userId: string): Promise<ToolResult> => {
  const itineraryResult = await getItinerary(tripId, userId);
  const days = (itineraryResult.result as Record<string, unknown>).days as Array<{ dayNumber: number; activities: Array<{ title: string; startTime: string; endTime: string; location: string }> }> || [];

  const gaps: Array<{ dayNumber: number; gapStart: string; gapEnd: string; durationHours: number }> = [];

  days.forEach(day => {
    for (let i = 0; i < day.activities.length - 1; i++) {
      const currentEnd = day.activities[i].endTime;
      const nextStart = day.activities[i + 1].startTime;

      const [endH, endM] = currentEnd.split(':').map(Number);
      const [startH, startM] = nextStart.split(':').map(Number);
      const gapMinutes = (startH * 60 + startM) - (endH * 60 + endM);

      if (gapMinutes > 120) {
        gaps.push({
          dayNumber: day.dayNumber,
          gapStart: currentEnd,
          gapEnd: nextStart,
          durationHours: Math.round(gapMinutes / 60 * 10) / 10,
        });
      }
    }
  });

  return {
    toolName: 'identify_long_travel_gaps',
    result: {
      gaps,
      totalGaps: gaps.length,
    },
  };
};

export const TOOL_DEFINITIONS = [
  {
    name: 'get_trip_context',
    description: 'Get the full context of a trip including destination, dates, budget, and preferences',
  },
  {
    name: 'get_itinerary',
    description: 'Get the full itinerary with all days and activities',
  },
  {
    name: 'summarize_budget',
    description: 'Summarize the budget breakdown and spending analysis',
  },
  {
    name: 'identify_expensive_activities',
    description: 'Identify the most expensive activities in the itinerary',
  },
  {
    name: 'suggest_lower_cost_replacements',
    description: 'Suggest lower-cost alternatives for activities',
  },
  {
    name: 'identify_long_travel_gaps',
    description: 'Identify long gaps between activities that could be filled',
  },
];

export const executeTool = async (
  toolName: string,
  args: Record<string, string>,
  tripId: string,
  userId: string,
): Promise<ToolResult> => {
  switch (toolName) {
    case 'get_trip_context':
      return getTripContext(tripId, userId);
    case 'get_itinerary':
      return getItinerary(tripId, userId);
    case 'summarize_budget':
      return summarizeBudget(tripId, userId);
    case 'identify_expensive_activities':
      return identifyExpensiveActivities(tripId, userId);
    case 'suggest_lower_cost_replacements':
      return suggestLowerCostReplacements(tripId, userId, args.category);
    case 'identify_long_travel_gaps':
      return identifyLongTravelGaps(tripId, userId);
    default:
      throw ApiError.badRequest('Unknown tool: ' + toolName);
  }
};
