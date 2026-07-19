import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().url({ message: 'MONGODB_URI must be a valid MongoDB connection string' }),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:3000'),
  SERVER_URL: z.string().default('http://localhost:5000'),
  ALLOWED_ORIGINS: z.string().optional(),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  GROQ_API_KEY: z.string().default(''),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  AI_PROVIDER_ORDER: z.string().default('gemini,groq'),
  STRIPE_SECRET_KEY: z.string().min(1, 'STRIPE_SECRET_KEY is required'),
  TRIP_PLAN_PRICE_CENTS: z.coerce.number().int().positive('TRIP_PLAN_PRICE_CENTS must be a positive integer'),
  TRIP_PLAN_CURRENCY: z.string().min(1).max(3).default('usd'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/api/v1/auth/google/callback'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
