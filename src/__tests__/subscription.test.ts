import { setupTestDB, teardownTestDB, clearDB } from './setup';
import { User } from '../modules/user/user.model';
import { Subscription } from '../modules/subscription/subscription.model';
import * as subscriptionService from '../modules/subscription/subscription.service';

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

describe('Subscription - Free Subscription Creation', () => {
  it('should create free subscription on getOrCreateFreeSubscription', async () => {
    const user = await createUser();
    const sub = await subscriptionService.getOrCreateFreeSubscription(user._id.toString());
    expect(sub.plan).toBe('free');
    expect(sub.status).toBe('active');
    expect(sub.aiCredits).toBe(3);
  });

  it('should not create duplicate subscriptions', async () => {
    const user = await createUser();
    const sub1 = await subscriptionService.getOrCreateFreeSubscription(user._id.toString());
    const sub2 = await subscriptionService.getOrCreateFreeSubscription(user._id.toString());
    expect(sub1._id.toString()).toBe(sub2._id.toString());
  });

  it('should get or create subscription via getSubscriptionByUser', async () => {
    const user = await createUser();
    const sub = await subscriptionService.getSubscriptionByUser(user._id.toString());
    expect(sub.plan).toBe('free');
    expect(sub.aiCredits).toBe(3);
  });
});

describe('Subscription - Credit Reserve and Rollback', () => {
  it('should reserve one credit', async () => {
    const user = await createUser();
    await subscriptionService.getOrCreateFreeSubscription(user._id.toString());

    const result = await subscriptionService.reserveCredit(user._id.toString());
    expect(result).toBe(true);

    const sub = await Subscription.findOne({ userId: user._id });
    expect(sub!.aiCredits).toBe(2);
  });

  it('should reject when no credits remaining', async () => {
    const user = await createUser();
    await Subscription.create({
      userId: user._id,
      plan: 'free',
      status: 'active',
      aiCredits: 0,
    });

    const result = await subscriptionService.reserveCredit(user._id.toString());
    expect(result).toBe(false);
  });

  it('should rollback credit after failed generation', async () => {
    const user = await createUser();
    await subscriptionService.getOrCreateFreeSubscription(user._id.toString());

    await subscriptionService.reserveCredit(user._id.toString());
    const sub1 = await Subscription.findOne({ userId: user._id });
    expect(sub1!.aiCredits).toBe(2);

    await subscriptionService.rollbackCredit(user._id.toString());
    const sub2 = await Subscription.findOne({ userId: user._id });
    expect(sub2!.aiCredits).toBe(3);
  });

  it('should create free subscription if missing when reserving credit', async () => {
    const user = await createUser();
    const result = await subscriptionService.reserveCredit(user._id.toString());
    expect(result).toBe(true);

    const sub = await Subscription.findOne({ userId: user._id });
    expect(sub).not.toBeNull();
    expect(sub!.aiCredits).toBe(2);
  });

  it('should prevent negative credit balance', async () => {
    const user = await createUser();
    await Subscription.create({
      userId: user._id,
      plan: 'free',
      status: 'active',
      aiCredits: 1,
    });

    const r1 = await subscriptionService.reserveCredit(user._id.toString());
    expect(r1).toBe(true);

    const r2 = await subscriptionService.reserveCredit(user._id.toString());
    expect(r2).toBe(false);

    const sub = await Subscription.findOne({ userId: user._id });
    expect(sub!.aiCredits).toBe(0);
  });
});
