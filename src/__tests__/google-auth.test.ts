import { setupTestDB, teardownTestDB, clearDB } from './setup';
import { User } from '../modules/user/user.model';
import { ExchangeCode } from '../modules/auth/exchange-code.model';
import * as googleService from '../modules/auth/google.service';

beforeAll(async () => await setupTestDB());
afterEach(async () => await clearDB());
afterAll(async () => await teardownTestDB());

describe('Google OAuth - Exchange Code', () => {
  it('should create an exchange code', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@test.com',
      authProvider: 'google',
      googleSubjectId: 'google-123',
    });

    const code = await googleService.createExchangeCode(user._id.toString());
    expect(code).toBeDefined();
    expect(code.length).toBe(64);

    const stored = await ExchangeCode.findOne({ userId: user._id });
    expect(stored).not.toBeNull();
    expect(stored!.used).toBe(false);
  });

  it('should exchange code for tokens', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@test.com',
      authProvider: 'google',
      googleSubjectId: 'google-123',
    });

    const code = await googleService.createExchangeCode(user._id.toString());
    const result = await googleService.exchangeCodeForTokens(code);

    expect(result.user._id.toString()).toBe(user._id.toString());
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
  });

  it('should reject expired exchange code', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@test.com',
      authProvider: 'google',
      googleSubjectId: 'google-123',
    });

    const code = await googleService.createExchangeCode(user._id.toString());

    await ExchangeCode.updateOne(
      { userId: user._id },
      { expiresAt: new Date(Date.now() - 1000) },
    );

    await expect(googleService.exchangeCodeForTokens(code)).rejects.toThrow('Invalid or expired');
  });

  it('should prevent exchange-code replay', async () => {
    const user = await User.create({
      name: 'Test User',
      email: 'test@test.com',
      authProvider: 'google',
      googleSubjectId: 'google-123',
    });

    const code = await googleService.createExchangeCode(user._id.toString());
    await googleService.exchangeCodeForTokens(code);

    await expect(googleService.exchangeCodeForTokens(code)).rejects.toThrow('Invalid or expired');
  });

  it('should reject invalid exchange code', async () => {
    await expect(googleService.exchangeCodeForTokens('invalid-code')).rejects.toThrow('Invalid or expired');
  });
});

describe('Google OAuth - User Creation', () => {
  it('should create a new Google user', async () => {
    const user = await googleService.findOrCreateGoogleUser({
      googleSubjectId: 'google-new-123',
      email: 'newuser@test.com',
      name: 'New User',
      avatar: 'https://example.com/avatar.jpg',
    });

    expect(user.authProvider).toBe('google');
    expect(user.googleSubjectId).toBe('google-new-123');
    expect(user.email).toBe('newuser@test.com');
    expect(user.password).toBeUndefined();
  });

  it('should link Google to existing local account', async () => {
    const localUser = await User.create({
      name: 'Local User',
      email: 'local@test.com',
      password: 'password123',
      authProvider: 'local',
    });

    const linkedUser = await googleService.findOrCreateGoogleUser({
      googleSubjectId: 'google-link-123',
      email: 'local@test.com',
      name: 'Local User',
      avatar: 'https://example.com/new-avatar.jpg',
    });

    expect(linkedUser._id.toString()).toBe(localUser._id.toString());
    expect(linkedUser.googleSubjectId).toBe('google-link-123');
    expect(linkedUser.avatar).toBe('https://example.com/new-avatar.jpg');
  });

  it('should return existing Google user on re-login', async () => {
    const user1 = await googleService.findOrCreateGoogleUser({
      googleSubjectId: 'google-relogin-123',
      email: 'relogin@test.com',
      name: 'Relogin User',
      avatar: '',
    });

    const user2 = await googleService.findOrCreateGoogleUser({
      googleSubjectId: 'google-relogin-123',
      email: 'relogin@test.com',
      name: 'Relogin User',
      avatar: '',
    });

    expect(user1._id.toString()).toBe(user2._id.toString());
  });
});

describe('Google OAuth - Email Normalization', () => {
  it('should normalize email to lowercase', async () => {
    const user = await googleService.findOrCreateGoogleUser({
      googleSubjectId: 'google-case-123',
      email: 'UPPER@TEST.COM',
      name: 'Case User',
      avatar: '',
    });

    expect(user.email).toBe('upper@test.com');
  });
});
