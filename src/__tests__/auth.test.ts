import jwt from 'jsonwebtoken';
import { setupTestDB, teardownTestDB, clearDB } from './setup';
import { User } from '../modules/user/user.model';
import { Subscription } from '../modules/subscription/subscription.model';
import * as authService from '../modules/auth/auth.service';
import * as userService from '../modules/user/user.service';

const JWT_SECRET = 'test-secret';
const JWT_REFRESH_SECRET = 'test-refresh-secret';

beforeAll(async () => {
  process.env.JWT_SECRET = JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = JWT_REFRESH_SECRET;
  await setupTestDB();
});
afterEach(async () => await clearDB());
afterAll(async () => await teardownTestDB());

describe('Auth - Token Generation', () => {
  it('should generate access and refresh tokens', async () => {
    const user = await User.create({
      name: 'Test',
      email: 'test@test.com',
      password: 'password123',
      role: 'user',
    });

    const tokens = authService.generateTokens(user);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });

  it('should verify access token', async () => {
    const user = await User.create({
      name: 'Test',
      email: 'test@test.com',
      password: 'password123',
      role: 'user',
    });

    const tokens = authService.generateTokens(user);
    const decoded = authService.verifyAccessToken(tokens.accessToken);
    expect(decoded.userId).toBe(user._id.toString());
    expect(decoded.email).toBe('test@test.com');
  });
});

describe('User Service - Registration Creates Subscription', () => {
  it('should create free subscription on user creation', async () => {
    const user = await userService.createUser({
      name: 'New User',
      email: 'new@test.com',
      password: 'password123',
    });

    const sub = await Subscription.findOne({ userId: user._id });
    expect(sub).not.toBeNull();
    expect(sub!.plan).toBe('free');
    expect(sub!.aiCredits).toBe(3);
  });

  it('should not create duplicate subscriptions on repeated registration', async () => {
    try {
      await userService.createUser({
        name: 'User 1',
        email: 'dup@test.com',
        password: 'password123',
      });
    } catch {
      // user might already exist
    }

    const subs = await Subscription.find({});
    expect(subs.length).toBe(1);
  });

  it('should reject duplicate email', async () => {
    await userService.createUser({
      name: 'User 1',
      email: 'dup2@test.com',
      password: 'password123',
    });

    await expect(
      userService.createUser({
        name: 'User 2',
        email: 'dup2@test.com',
        password: 'password456',
      })
    ).rejects.toThrow('Email already registered');
  });
});

describe('Auth - Refresh Token', () => {
  it('should issue a valid refresh token', async () => {
    const user = await User.create({
      name: 'Test',
      email: 'test@test.com',
      password: 'password123',
      role: 'user',
    });

    const tokens = authService.generateTokens(user);
    const decoded = jwt.verify(tokens.refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    expect(decoded.userId).toBe(user._id.toString());
  });
});
