import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, clearDB } from './setup';
import { Destination } from '../modules/destination/destination.model';
import { User } from '../modules/user/user.model';
import * as destinationService from '../modules/destination/destination.service';

beforeAll(async () => await setupTestDB());
afterEach(async () => await clearDB());
afterAll(async () => await teardownTestDB());

const createTestUser = async () => {
  return User.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin',
  });
};

const createTestDestination = async (userId: string, overrides: Record<string, unknown> = {}) => {
  return Destination.create({
    title: 'Tokyo',
    slug: 'tokyo',
    country: 'Japan',
    city: 'Tokyo',
    shortDescription: 'Vibrant capital of Japan',
    fullDescription: 'Tokyo is the capital of Japan.',
    images: ['https://example.com/tokyo.jpg'],
    category: 'city',
    averageDailyCost: 100,
    currency: 'USD',
    rating: 4.5,
    reviewCount: 100,
    bestSeason: 'Spring',
    recommendedDays: 5,
    latitude: 35.6762,
    longitude: 139.6503,
    highlights: ['Shibuya', 'Shinjuku'],
    status: 'published',
    createdBy: new mongoose.Types.ObjectId(userId),
    ...overrides,
  });
};

describe('Destination Service - Filtering', () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user._id.toString();

    await createTestDestination(userId, {
      title: 'Tokyo', slug: 'tokyo', country: 'Japan', city: 'Tokyo',
      category: 'city', averageDailyCost: 100, rating: 4.5,
    });
    await createTestDestination(userId, {
      title: 'Kyoto', slug: 'kyoto', country: 'Japan', city: 'Kyoto',
      category: 'culture', averageDailyCost: 80, rating: 4.8,
    });
    await createTestDestination(userId, {
      title: 'Paris', slug: 'paris', country: 'France', city: 'Paris',
      category: 'city', averageDailyCost: 150, rating: 4.2,
    });
  });

  it('should return all published destinations with no filters', async () => {
    const result = await destinationService.getAllDestinations({});
    expect(result.destinations).toHaveLength(3);
    expect(result.pagination.total).toBe(3);
  });

  it('should filter by text search', async () => {
    const result = await destinationService.getAllDestinations({ search: 'Tokyo' });
    expect(result.destinations).toHaveLength(1);
    expect(result.destinations[0].title).toBe('Tokyo');
  });

  it('should filter by search (case insensitive)', async () => {
    const result = await destinationService.getAllDestinations({ search: 'tokyo' });
    expect(result.destinations).toHaveLength(1);
  });

  it('should filter by category', async () => {
    const result = await destinationService.getAllDestinations({ category: 'city' });
    expect(result.destinations).toHaveLength(2);
  });

  it('should filter by country', async () => {
    const result = await destinationService.getAllDestinations({ country: 'Japan' });
    expect(result.destinations).toHaveLength(2);
  });

  it('should filter by minimum cost', async () => {
    const result = await destinationService.getAllDestinations({ minCost: 100 });
    expect(result.destinations).toHaveLength(2);
  });

  it('should filter by maximum cost', async () => {
    const result = await destinationService.getAllDestinations({ maxCost: 100 });
    expect(result.destinations).toHaveLength(2);
  });

  it('should filter by cost range', async () => {
    const result = await destinationService.getAllDestinations({ minCost: 80, maxCost: 100 });
    expect(result.destinations).toHaveLength(2);
  });

  it('should filter by minimum rating', async () => {
    const result = await destinationService.getAllDestinations({ minRating: 4.5 });
    expect(result.destinations).toHaveLength(2);
  });

  it('should filter by combined criteria', async () => {
    const result = await destinationService.getAllDestinations({
      country: 'Japan',
      minCost: 90,
      maxCost: 110,
    });
    expect(result.destinations).toHaveLength(1);
    expect(result.destinations[0].title).toBe('Tokyo');
  });

  it('should exclude draft destinations from public listing', async () => {
    await createTestDestination(userId, {
      title: 'Draft City', slug: 'draft-city', country: 'Test',
      city: 'Test', status: 'draft',
    });
    const result = await destinationService.getAllDestinations({});
    expect(result.destinations).toHaveLength(3);
  });

  it('should support pagination', async () => {
    const result = await destinationService.getAllDestinations({ page: 1, limit: 2 });
    expect(result.destinations).toHaveLength(2);
    expect(result.pagination.total).toBe(3);
    expect(result.pagination.totalPages).toBe(2);
  });

  it('should sort by newest', async () => {
    const result = await destinationService.getAllDestinations({ sort: 'newest' });
    expect(result.destinations[0].title).toBe('Paris');
  });

  it('should sort by highest rating', async () => {
    const result = await destinationService.getAllDestinations({ sort: 'highest_rating' });
    expect(result.destinations[0].title).toBe('Kyoto');
  });

  it('should sort by lowest cost', async () => {
    const result = await destinationService.getAllDestinations({ sort: 'lowest_cost' });
    expect(result.destinations[0].title).toBe('Kyoto');
  });
});

describe('Destination Service - Admin Listing', () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user._id.toString();
    await createTestDestination(userId, { title: 'Published City', slug: 'published-city', status: 'published' });
    await createTestDestination(userId, { title: 'Draft City', slug: 'draft-city', status: 'draft' });
  });

  it('should return both draft and published destinations for admin', async () => {
    const result = await destinationService.getAllDestinationsAdmin({});
    expect(result.destinations).toHaveLength(2);
  });

  it('should filter admin listing by status', async () => {
    const result = await destinationService.getAllDestinationsAdmin({ status: 'draft' });
    expect(result.destinations).toHaveLength(1);
    expect(result.destinations[0].status).toBe('draft');
  });
});

describe('Destination Service - CRUD', () => {
  let userId: string;

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user._id.toString();
  });

  it('should create a destination with slug', async () => {
    const dest = await Destination.create({
      title: 'Test Place',
      country: 'Test Country',
      city: 'Test City',
      shortDescription: 'Short desc',
      fullDescription: 'Full desc',
      images: [],
      category: 'test',
      averageDailyCost: 50,
      currency: 'USD',
      rating: 0,
      reviewCount: 0,
      bestSeason: 'All',
      recommendedDays: 3,
      latitude: 0,
      longitude: 0,
      highlights: [],
      status: 'draft',
      createdBy: new mongoose.Types.ObjectId(userId),
      slug: 'test-place',
    });
    expect(dest.slug).toBe('test-place');
  });

  it('should return 400 for invalid ID in getDestinationById', async () => {
    await expect(destinationService.getDestinationById('invalid-id')).rejects.toThrow('Invalid destination ID');
  });

  it('should return 404 for non-existent destination', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(destinationService.getDestinationById(fakeId)).rejects.toThrow('Destination not found');
  });

  it('should return 400 for invalid ID in updateDestination', async () => {
    await expect(destinationService.updateDestination('invalid', { title: 'Test' })).rejects.toThrow('Invalid destination ID');
  });

  it('should return 400 for invalid ID in deleteDestination', async () => {
    await expect(destinationService.deleteDestination('invalid')).rejects.toThrow('Invalid destination ID');
  });

  it('should regenerate slug on title change', async () => {
    const dest = await createTestDestination(userId, { title: 'Original', slug: 'original' });
    const updated = await destinationService.updateDestination(dest._id.toString(), { title: 'Updated Title' });
    expect(updated.slug).toBe('updated-title');
  });
});
