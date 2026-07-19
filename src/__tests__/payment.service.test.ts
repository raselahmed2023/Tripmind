import mongoose from 'mongoose';
import { setupTestDB, teardownTestDB, clearDB } from './setup';
import { User } from '../modules/user/user.model';
import { Payment } from '../modules/payment/payment.model';
import { Subscription } from '../modules/subscription/subscription.model';
import * as paymentService from '../modules/payment/payment.service';
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

describe('Payment Service - User Payments', () => {
  it('should get paginated payments for user', async () => {
    const user = await createUser();
    for (let i = 0; i < 5; i++) {
      await Payment.create({
        userId: user._id,
        stripeCheckoutSessionId: `session_${i}`,
        stripeCustomerId: 'cus_test',
        productType: 'subscription',
        plan: 'pro_monthly',
        amount: 1999,
        currency: 'usd',
        status: 'paid',
        metadata: {},
      });
    }

    const result = await paymentService.getPaymentsByUser(user._id.toString(), { page: 1, limit: 3 });
    expect(result.payments).toHaveLength(3);
    expect(result.pagination.total).toBe(5);
    expect(result.pagination.totalPages).toBe(2);
  });

  it('should return 400 for invalid payment ID', async () => {
    const user = await createUser();
    await expect(
      paymentService.getPaymentById('invalid', user._id.toString())
    ).rejects.toThrow('Invalid payment ID');
  });

  it('should return 404 for non-existent payment', async () => {
    const user = await createUser();
    const fakeId = new mongoose.Types.ObjectId().toString();
    await expect(
      paymentService.getPaymentById(fakeId, user._id.toString())
    ).rejects.toThrow('Payment not found');
  });

  it('should return 403 for wrong user', async () => {
    const user1 = await createUser('user1@test.com');
    const user2 = await createUser('user2@test.com');
    const payment = await Payment.create({
      userId: user1._id,
      stripeCheckoutSessionId: 'session_1',
      stripeCustomerId: 'cus_test',
      productType: 'subscription',
      plan: 'pro_monthly',
      amount: 1999,
      currency: 'usd',
      status: 'paid',
      metadata: {},
    });

    await expect(
      paymentService.getPaymentById(payment._id.toString(), user2._id.toString())
    ).rejects.toThrow('You can only access your own payments');
  });
});

describe('Payment Service - Checkout Session Completed', () => {
  it('should mark payment as paid and use Stripe amounts', async () => {
    const user = await createUser();
    const payment = await Payment.create({
      userId: user._id,
      stripeCheckoutSessionId: 'sess_completed_1',
      stripeCustomerId: 'cus_test',
      productType: 'subscription',
      plan: 'pro_monthly',
      amount: 1999,
      currency: 'usd',
      status: 'pending',
      metadata: {},
    });

    const session = {
      id: 'sess_completed_1',
      metadata: { userId: user._id.toString(), productType: 'subscription' },
      payment_intent: 'pi_test',
      subscription: 'sub_test',
      amount_total: 2499,
      currency: 'eur',
    } as any;

    await paymentService.handleCheckoutSessionCompleted(session);

    const updated = await Payment.findById(payment._id);
    expect(updated!.status).toBe('paid');
    expect(updated!.amount).toBe(2499);
    expect(updated!.currency).toBe('eur');
  });

  it('should be idempotent for completed sessions', async () => {
    const user = await createUser();
    await Payment.create({
      userId: user._id,
      stripeCheckoutSessionId: 'sess_idempotent',
      stripeCustomerId: 'cus_test',
      productType: 'credit_pack',
      plan: 'ai_credits_10',
      amount: 999,
      currency: 'usd',
      status: 'paid',
      metadata: {},
    });

    const session = {
      id: 'sess_idempotent',
      metadata: { userId: user._id.toString(), productType: 'credit_pack' },
      payment_intent: 'pi_test',
      subscription: null,
      amount_total: 999,
      currency: 'usd',
    } as any;

    await paymentService.handleCheckoutSessionCompleted(session);
    // Should not throw or duplicate
  });
});

describe('Credit Pack - Idempotent Fulfillment', () => {
  it('should not add credits twice for same payment', async () => {
    const user = await createUser();
    const payment = await Payment.create({
      userId: user._id,
      stripeCheckoutSessionId: 'sess_credit_pack',
      stripeCustomerId: 'cus_test',
      productType: 'credit_pack',
      plan: 'ai_credits_10',
      amount: 999,
      currency: 'usd',
      status: 'paid',
      metadata: {},
    });

    await Subscription.create({
      userId: user._id,
      plan: 'free',
      status: 'active',
      aiCredits: 3,
    });

    // First fulfillment
    await subscriptionService.handleCreditPackPurchase(payment as any);
    const sub1 = await Subscription.findOne({ userId: user._id });
    expect(sub1!.aiCredits).toBe(13);

    // Second fulfillment (idempotent - should skip)
    await subscriptionService.handleCreditPackPurchase(payment as any);
    const sub2 = await Subscription.findOne({ userId: user._id });
    expect(sub2!.aiCredits).toBe(13);
  });
});
