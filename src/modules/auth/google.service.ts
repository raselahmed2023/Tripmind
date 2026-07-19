import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../../config';
import { User } from '../user/user.model';
import { ExchangeCode } from './exchange-code.model';
import { getOrCreateFreeSubscription } from '../subscription/subscription.service';
import { generateTokens } from './auth.service';
import { ApiError } from '../../utils/ApiError';

const googleClient = new OAuth2Client(
  config.GOOGLE_CLIENT_ID,
  config.GOOGLE_CLIENT_SECRET,
  config.GOOGLE_CALLBACK_URL,
);

export const getGoogleAuthUrl = (state: string): string => {
  return googleClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'consent',
  });
};

export const exchangeCodeForIdToken = async (authorizationCode: string): Promise<string> => {
  const { tokens } = await googleClient.getToken(authorizationCode);
  if (!tokens.id_token) {
    throw ApiError.unauthorized('Failed to obtain ID token from Google');
  }
  return tokens.id_token;
};

export const verifyGoogleIdToken = async (idToken: string) => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: config.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    throw ApiError.unauthorized('Invalid Google token');
  }

  if (!payload.email_verified) {
    throw ApiError.unauthorized('Google email not verified');
  }

  return {
    googleSubjectId: payload.sub,
    email: payload.email!.toLowerCase(),
    name: payload.name || '',
    avatar: payload.picture || '',
  };
};

export const findOrCreateGoogleUser = async (googleData: {
  googleSubjectId: string;
  email: string;
  name: string;
  avatar: string;
}) => {
  // Check if a user with this Google subject ID exists
  let user = await User.findOne({ googleSubjectId: googleData.googleSubjectId });

  if (user) {
    return user;
  }

  // Check if a user with this email exists (link Google to existing account)
  user = await User.findOne({ email: googleData.email });

  if (user) {
    // Link Google to existing local account
    user.googleSubjectId = googleData.googleSubjectId;
    if (!user.avatar && googleData.avatar) {
      user.avatar = googleData.avatar;
    }
    await user.save();
    return user;
  }

  // Create new Google-only user (no password needed)
  user = await User.create({
    name: googleData.name,
    email: googleData.email,
    avatar: googleData.avatar,
    authProvider: 'google',
    googleSubjectId: googleData.googleSubjectId,
    password: undefined as unknown as string,
  });

  // Create free subscription idempotently
  await getOrCreateFreeSubscription(user._id.toString());

  return user;
};

export const createExchangeCode = async (userId: string): Promise<string> => {
  // Clean up expired codes for this user
  await ExchangeCode.deleteMany({
    userId,
    $or: [{ used: true }, { expiresAt: { $lt: new Date() } }],
  });

  // Generate cryptographically random code
  const rawCode = crypto.randomBytes(32).toString('hex');
  const codeHash = await bcrypt.hash(rawCode, 10);

  await ExchangeCode.create({
    userId,
    codeHash,
    used: false,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
  });

  return rawCode;
};

export const exchangeCodeForTokens = async (code: string) => {
  // Find all unused, non-expired codes
  const candidates = await ExchangeCode.find({
    used: false,
    expiresAt: { $gt: new Date() },
  });

  let matchedCode = null;
  for (const candidate of candidates) {
    const isMatch = await bcrypt.compare(code, candidate.codeHash);
    if (isMatch) {
      matchedCode = candidate;
      break;
    }
  }

  if (!matchedCode) {
    throw ApiError.unauthorized('Invalid or expired exchange code');
  }

  // Mark as used atomically
  const updated = await ExchangeCode.findOneAndUpdate(
    { _id: matchedCode._id, used: false },
    { used: true },
    { new: true },
  );

  if (!updated) {
    throw ApiError.unauthorized('Exchange code already used');
  }

  // Get user and generate tokens
  const user = await User.findById(updated.userId);
  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  const tokens = generateTokens(user);

  return { user, tokens };
};
