import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, clearDB } from './setup';
import { User } from '../modules/user/user.model';
import { Trip } from '../modules/trip/trip.model';
import { Destination } from '../modules/destination/destination.model';
import { Itinerary } from '../modules/itinerary/itinerary.model';
import { Conversation } from '../modules/ai-assistant/conversation.model';
import { Message } from '../modules/ai-assistant/message.model';
import * as assistantService from '../modules/ai-assistant/assistant.service';
import { executeTool } from '../modules/ai-assistant/assistant-tools';

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
    status: 'planned',
  });
};

describe('Conversation - Creation', () => {
  it('should create a conversation', async () => {
    const user = await createTestUser();
    const conversation = await assistantService.createConversation(user._id.toString());

    expect(conversation.userId.toString()).toBe(user._id.toString());
    expect(conversation.title).toBe('New Conversation');
    expect(conversation.status).toBe('active');
  });

  it('should create a conversation with trip context', async () => {
    const user = await createTestUser();
    const dest = await createTestDestination(user._id.toString());
    const trip = await createTestTrip(user._id.toString(), dest._id.toString());

    const conversation = await assistantService.createConversation(
      user._id.toString(),
      trip._id.toString(),
    );

    expect(conversation.tripId?.toString()).toBe(trip._id.toString());
  });

  it('should reject invalid trip ID', async () => {
    const user = await createTestUser();
    await expect(
      assistantService.createConversation(user._id.toString(), 'invalid-id'),
    ).rejects.toThrow('Invalid trip ID');
  });

  it('should reject trip belonging to another user', async () => {
    const user1 = await createTestUser('user1@test.com');
    const user2 = await createTestUser('user2@test.com');
    const dest = await createTestDestination(user1._id.toString());
    const trip = await createTestTrip(user1._id.toString(), dest._id.toString());

    await expect(
      assistantService.createConversation(user2._id.toString(), trip._id.toString()),
    ).rejects.toThrow('Access denied');
  });
});

describe('Conversation - Ownership', () => {
  it('should enforce ownership on getConversation', async () => {
    const user1 = await createTestUser('user1@test.com');
    const user2 = await createTestUser('user2@test.com');

    const conv = await assistantService.createConversation(user1._id.toString());

    await expect(
      assistantService.getConversation(conv._id.toString(), user2._id.toString()),
    ).rejects.toThrow('Access denied');
  });

  it('should enforce ownership on deleteConversation', async () => {
    const user1 = await createTestUser('user1@test.com');
    const user2 = await createTestUser('user2@test.com');

    const conv = await assistantService.createConversation(user1._id.toString());

    await expect(
      assistantService.deleteConversation(conv._id.toString(), user2._id.toString()),
    ).rejects.toThrow('Access denied');
  });

  it('should return 404 for non-existent conversation', async () => {
    const user = await createTestUser();
    const fakeId = new mongoose.Types.ObjectId().toString();

    await expect(
      assistantService.getConversation(fakeId, user._id.toString()),
    ).rejects.toThrow('Conversation not found');
  });

  it('should return 400 for invalid conversation ID', async () => {
    const user = await createTestUser();
    await expect(
      assistantService.getConversation('invalid', user._id.toString()),
    ).rejects.toThrow('Invalid conversation ID');
  });
});

describe('Conversation - Deletion', () => {
  it('should delete conversation and messages', async () => {
    const user = await createTestUser();
    const conv = await assistantService.createConversation(user._id.toString());

    await Message.create({
      conversationId: conv._id,
      role: 'user',
      content: 'Hello',
    });

    await assistantService.deleteConversation(conv._id.toString(), user._id.toString());

    const deleted = await Conversation.findById(conv._id);
    expect(deleted).toBeNull();

    const messages = await Message.find({ conversationId: conv._id });
    expect(messages).toHaveLength(0);
  });
});

describe('Messages', () => {
  it('should get paginated messages', async () => {
    const user = await createTestUser();
    const conv = await assistantService.createConversation(user._id.toString());

    for (let i = 0; i < 5; i++) {
      await Message.create({
        conversationId: conv._id,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      });
    }

    const result = await assistantService.getMessages(conv._id.toString(), user._id.toString(), 1, 3);
    expect(result.messages).toHaveLength(3);
    expect(result.pagination.total).toBe(5);
  });

  it('should reject access to other users messages', async () => {
    const user1 = await createTestUser('user1@test.com');
    const user2 = await createTestUser('user2@test.com');
    const conv = await assistantService.createConversation(user1._id.toString());

    await expect(
      assistantService.getMessages(conv._id.toString(), user2._id.toString()),
    ).rejects.toThrow('Access denied');
  });
});

describe('Assistant Tools', () => {
  it('should get trip context', async () => {
    const user = await createTestUser();
    const dest = await createTestDestination(user._id.toString());
    const trip = await createTestTrip(user._id.toString(), dest._id.toString());

    const result = await executeTool('get_trip_context', {}, trip._id.toString(), user._id.toString());

    expect(result.toolName).toBe('get_trip_context');
    expect((result.result as Record<string, unknown>).title).toBe('Japan Trip');
    expect((result.result as Record<string, unknown>).budget).toBe(3000);
  });

  it('should reject tool access for wrong user', async () => {
    const user1 = await createTestUser('user1@test.com');
    const user2 = await createTestUser('user2@test.com');
    const dest = await createTestDestination(user1._id.toString());
    const trip = await createTestTrip(user1._id.toString(), dest._id.toString());

    await expect(
      executeTool('get_trip_context', {}, trip._id.toString(), user2._id.toString()),
    ).rejects.toThrow('Access denied');
  });

  it('should identify expensive activities', async () => {
    const user = await createTestUser();
    const dest = await createTestDestination(user._id.toString());
    const trip = await createTestTrip(user._id.toString(), dest._id.toString());

    await Itinerary.create({
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
            { title: 'Cheap activity', description: '', startTime: '09:00', endTime: '11:00', estimatedCost: 10, category: 'sightseeing', location: '', notes: '' },
            { title: 'Expensive activity', description: '', startTime: '14:00', endTime: '16:00', estimatedCost: 200, category: 'tour', location: '', notes: '' },
          ],
        },
      ],
      costBreakdown: { accommodation: 500, food: 200 },
      aiModel: 'gemini-2.0-flash',
    });

    const result = await executeTool('identify_expensive_activities', {}, trip._id.toString(), user._id.toString());

    expect(result.toolName).toBe('identify_expensive_activities');
    const data = result.result as Record<string, unknown>;
    expect((data.expensiveActivities as Array<Record<string, unknown>>)[0].estimatedCost).toBe(200);
  });

  it('should summarize budget', async () => {
    const user = await createTestUser();
    const dest = await createTestDestination(user._id.toString());
    const trip = await createTestTrip(user._id.toString(), dest._id.toString());

    await Itinerary.create({
      tripId: trip._id,
      userId: user._id,
      destinationId: dest._id,
      summary: 'Test',
      days: [],
      costBreakdown: { accommodation: 1500, food: 500, activities: 300 },
      aiModel: 'gemini-2.0-flash',
    });

    const result = await executeTool('summarize_budget', {}, trip._id.toString(), user._id.toString());

    expect(result.toolName).toBe('summarize_budget');
    const data = result.result as Record<string, unknown>;
    expect(data.totalBudget).toBe(3000);
    expect(data.estimatedCost).toBe(2300);
  });
});

describe('Send Message (without Gemini)', () => {
  it('should save user message', async () => {
    const user = await createTestUser();
    const conv = await assistantService.createConversation(user._id.toString());

    try {
      await assistantService.sendMessage(conv._id.toString(), user._id.toString(), 'Hello');
    } catch {
      // Expected to fail without valid Gemini key
    }

    const messages = await Message.find({ conversationId: conv._id });
    expect(messages.some(m => m.role === 'user' && m.content === 'Hello')).toBe(true);
  });

  it('should reject empty message', async () => {
    const user = await createTestUser();
    const conv = await assistantService.createConversation(user._id.toString());

    await expect(
      assistantService.sendMessage(conv._id.toString(), user._id.toString(), ''),
    ).rejects.toThrow('Message cannot be empty');
  });

  it('should reject access to other users conversation', async () => {
    const user1 = await createTestUser('user1@test.com');
    const user2 = await createTestUser('user2@test.com');
    const conv = await assistantService.createConversation(user1._id.toString());

    await expect(
      assistantService.sendMessage(conv._id.toString(), user2._id.toString(), 'Hello'),
    ).rejects.toThrow('Access denied');
  });
});
