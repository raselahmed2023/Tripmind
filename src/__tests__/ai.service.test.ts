import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, clearDB } from './setup';
import { User } from '../modules/user/user.model';
import { Destination } from '../modules/destination/destination.model';
import { Trip } from '../modules/trip/trip.model';
import * as aiTools from '../modules/ai/ai.tools';
import { tripPlannerRequestSchema } from '../modules/ai/ai.validation';

beforeAll(async () => await setupTestDB());
afterEach(async () => await clearDB());
afterAll(async () => await teardownTestDB());

const createTestUser = async (email = 'test@test.com') => {
  return User.create({
    name: 'Test User',
    email,
    password: 'password123',
    role: 'user',
  });
};

const createTestDestination = async (userId: string) => {
  return Destination.create({
    title: 'Tokyo',
    slug: 'tokyo',
    country: 'Japan',
    city: 'Tokyo',
    shortDescription: 'Vibrant capital',
    fullDescription: 'Tokyo is the capital.',
    images: [],
    category: 'city',
    averageDailyCost: 100,
    currency: 'USD',
    rating: 4.5,
    reviewCount: 100,
    bestSeason: 'Spring',
    recommendedDays: 5,
    latitude: 35.6762,
    longitude: 139.6503,
    highlights: ['Shibuya'],
    status: 'published',
    createdBy: new mongoose.Types.ObjectId(userId),
  });
};

const createTestTrip = async (userId: string, destinationId: string) => {
  return Trip.create({
    userId: new mongoose.Types.ObjectId(userId),
    destinationId: new mongoose.Types.ObjectId(destinationId),
    title: 'Japan Trip',
    startDate: new Date('2025-04-01'),
    endDate: new Date('2025-04-06'),
    travelers: 2,
    budget: 3000,
    currency: 'USD',
    travelStyle: 'mid-range',
    interests: ['food', 'culture'],
    accommodationPreference: 'hotel',
    transportPreference: 'public',
    status: 'planned',
  });
};

describe('AI Tools - Data Derivation', () => {
  it('should get trip with populated destination', async () => {
    const user = await createTestUser();
    const dest = await createTestDestination(user._id.toString());
    const trip = await createTestTrip(user._id.toString(), dest._id.toString());

    const fetched = await aiTools.getTrip(trip._id.toString());
    expect(fetched._id.toString()).toBe(trip._id.toString());
    expect(fetched.userId.toString()).toBe(user._id.toString());
  });

  it('should throw 400 for invalid trip ID', async () => {
    await expect(aiTools.getTrip('invalid')).rejects.toThrow('Invalid trip ID');
  });

  it('should throw 404 for non-existent trip', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(aiTools.getTrip(fakeId)).rejects.toThrow('Trip not found');
  });

  it('should calculate trip days correctly', () => {
    const days = aiTools.calculateTripDays('2025-04-01', '2025-04-06');
    expect(days).toBe(5);
  });

  it('should calculate daily budget correctly', () => {
    const daily = aiTools.calculateBudget(3000, 5, 2);
    expect(daily).toBe(300);
  });

  it('should validate budget within 15%', () => {
    expect(aiTools.validateBudget({ accommodation: 1000, food: 500 }, 3000)).toBe(true);
    expect(aiTools.validateBudget({ total: 5000 }, 3000)).toBe(false);
  });
});

describe('AI Tools - Itinerary Persistence', () => {
  it('should save itinerary with aiModel field', async () => {
    const user = await createTestUser();
    const dest = await createTestDestination(user._id.toString());
    const trip = await createTestTrip(user._id.toString(), dest._id.toString());

    const itinerary = await aiTools.saveItinerary({
      tripId: trip._id,
      userId: user._id,
      destinationId: dest._id,
      summary: 'Test itinerary',
      days: [
        {
          dayNumber: 1,
          date: '2025-04-01',
          title: 'Day 1',
          activities: [
            {
              title: 'Visit temple',
              description: 'Morning visit',
              startTime: '09:00',
              endTime: '11:00',
              estimatedCost: 20,
              category: 'sightseeing',
              location: 'Asakusa',
              notes: '',
            },
          ],
        },
      ],
      costBreakdown: { accommodation: 500, food: 200 },
      warnings: [],
      recommendations: [],
      generatedAt: new Date(),
      aiModel: 'gemini-2.0-flash',
    });

    expect(itinerary.aiModel).toBe('gemini-2.0-flash');
    expect(itinerary.days[0].date).toBe('2025-04-01');
    expect(itinerary.days[0].activities[0].location).toBe('Asakusa');
  });

  it('should update trip with itineraryId', async () => {
    const user = await createTestUser();
    const dest = await createTestDestination(user._id.toString());
    const trip = await createTestTrip(user._id.toString(), dest._id.toString());

    const itinerary = await aiTools.saveItinerary({
      tripId: trip._id,
      userId: user._id,
      destinationId: dest._id,
      summary: 'Test',
      days: [],
      costBreakdown: {},
      warnings: [],
      recommendations: [],
      aiModel: 'gemini-2.0-flash',
    });

    const updated = await aiTools.updateTripItinerary(trip._id.toString(), {
      itineraryId: itinerary._id,
      estimatedCost: 1500,
    });

    expect(updated!.itineraryId?.toString()).toBe(itinerary._id.toString());
    expect(updated!.estimatedCost).toBe(1500);
  });
});

describe('AI Validation - Schema', () => {
  it('should accept empty optional body', async () => {
    const result = tripPlannerRequestSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should accept optional fields', async () => {
    const result = tripPlannerRequestSchema.safeParse({
      dietaryPreferences: 'vegetarian',
      accessibilityNeeds: 'wheelchair',
      activityPreferences: ['hiking', 'museums'],
      additionalNotes: 'prefer mornings',
    });
    expect(result.success).toBe(true);
  });
});
