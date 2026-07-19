export interface AITripPlanRequest {
  destination: {
    title: string;
    country: string;
    city: string;
    shortDescription: string;
    fullDescription: string;
    category: string;
    averageDailyCost: number;
    currency: string;
    bestSeason: string;
    recommendedDays: number;
    highlights: string[];
  };
  trip: {
    startDate: string;
    endDate: string;
    durationDays: number;
    budget: number;
    dailyBudget: number;
    travelers: number;
    currency: string;
    travelStyle: string;
    interests: string[];
    accommodationPreference: string;
    transportPreference: string;
    dietaryRequirements: string;
    accessibilityRequirements: string;
    additionalNotes: string;
  };
}

export interface AITripPlanResponse {
  summary: string;
  days: {
    dayNumber: number;
    date: string;
    title: string;
    activities: {
      title: string;
      description: string;
      startTime: string;
      endTime: string;
      estimatedCost: number;
      category: string;
      location: string;
      notes: string;
    }[];
  }[];
  costBreakdown: Record<string, number>;
  warnings: string[];
  recommendations: string[];
}
