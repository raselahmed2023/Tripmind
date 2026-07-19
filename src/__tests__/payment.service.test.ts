import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, clearDB } from './setup';
import { User } from '../modules/user/user.model';
import { Trip } from '../modules/trip/trip.model';
import { Destination } from '../modules/destination/destination.model';
import { Payment } from '../modules/payment/payment.model';
import * as paymentService from '../modules/payment/payment.service';

beforeAll(async () => await setupTestDB());
afterEach(async () => await clearDB());
afterAll(async () => await teardownTestDB());

const createUser = async (email = 'test@test.com') => {
  return User.create({
    name: 'Test User',
    email,
    password: 'password123',
    role: 'user',
  });
};

const createDestination = async (userId: string) => {
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

const createTrip = async (userId: string, destinationId: string) => {
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

describe('Payment Service - Checkout', () => {
  it('should reject invalid trip ID', async () => {
    const user = await createUser();
    await expect(
      paymentService.createTripPlanCheckout(user._id.toString(), user.email, 'invalid')
    ).rejects.toThrow('Invalid trip ID');
  });

  it('should reject non-existent trip', async () => {
    const user = await createUser();
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(
      paymentService.createTripPlanCheckout(user._id.toString(), user.email, fakeId)
    ).rejects.toThrow('Trip not found');
  });

  it('should reject another user trip', async () => {
    const user1 = await createUser('user1@test.com');
    const user2 = await createUser('user2@test.com');
    const dest = await createDestination(user1._id.toString());
    const trip = await createTrip(user1._id.toString(), dest._id.toString());

    await expect(
      paymentService.createTripPlanCheckout(user2._id.toString(), user2.email, trip._id.toString())
    ).rejects.toThrow('You can only purchase plans for your own trips');
  });

  it('should reject already purchased trip', async () => {
    const user = await createUser();
    const dest = await createDestination(user._id.toString());
    const trip = await createTrip(user._id.toString(), dest._id.toString());

    await Trip.findByIdAndUpdate(trip._id, { isPlanPurchased: true, paymentStatus: 'paid' });

    await expect(
      paymentService.createTripPlanCheckout(user._id.toString(), user.email, trip._id.toString())
    ).rejects.toThrow('already been purchased');
  });
});

describe('Payment Service - Trip Payment Status', () => {
  it('should return payment status for trip owner', async () => {
    const user = await createUser();
    const dest = await createDestination(user._id.toString());
    const trip = await createTrip(user._id.toString(), dest._id.toString());

    const status = await paymentService.getTripPaymentStatus(
      trip._id.toString(),
      user._id.toString(),
      false,
    );

    expect(status.tripId.toString()).toBe(trip._id.toString());
    expect(status.isPlanPurchased).toBe(false);
    expect(status.paymentStatus).toBe('unpaid');
  });

  it('should reject access for non-owner', async () => {
    const user1 = await createUser('user1@test.com');
    const user2 = await createUser('user2@test.com');
    const dest = await createDestination(user1._id.toString());
    const trip = await createTrip(user1._id.toString(), dest._id.toString());

    await expect(
      paymentService.getTripPaymentStatus(trip._id.toString(), user2._id.toString(), false)
    ).rejects.toThrow('Access denied');
  });

  it('should allow admin access', async () => {
    const user = await createUser();
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
    });
    const dest = await createDestination(user._id.toString());
    const trip = await createTrip(user._id.toString(), dest._id.toString());

    const status = await paymentService.getTripPaymentStatus(
      trip._id.toString(),
      admin._id.toString(),
      true,
    );

    expect(status.tripId.toString()).toBe(trip._id.toString());
  });
});

describe('Payment Service - User Payments', () => {
  it('should get paginated payments for user', async () => {
    const user = await createUser();
    const dest = await createDestination(user._id.toString());

    for (let i = 0; i < 5; i++) {
      const trip = await createTrip(user._id.toString(), dest._id.toString());
      await Payment.create({
        userId: user._id,
        tripId: trip._id,
        stripeCheckoutSessionId: `session_${i}`,
        productType: 'trip_plan',
        amount: 500,
        currency: 'usd',
        status: 'paid',
      });
    }

    const result = await paymentService.getPaymentsByUser(user._id.toString(), { page: 1, limit: 3 });
    expect(result.payments).toHaveLength(3);
    expect(result.pagination.total).toBe(5);
    expect(result.pagination.totalPages).toBe(2);
  });
});
