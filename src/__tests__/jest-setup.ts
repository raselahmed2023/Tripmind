// Set safe test environment variables before any application imports.
// This file runs via jest.config.js setupFiles, before test modules are loaded.
// It prevents config/index.ts from calling process.exit(1) due to missing env vars.

process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.SERVER_URL = 'http://localhost:5000';
process.env.GEMINI_API_KEY = 'test-gemini-key';
process.env.GEMINI_MODEL = 'gemini-2.0-flash';
process.env.GROQ_API_KEY = '';
process.env.GROQ_MODEL = 'llama-3.3-70b-versatile';
process.env.AI_PROVIDER_ORDER = 'gemini,groq';
process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
process.env.TRIP_PLAN_PRICE_CENTS = '999';
process.env.TRIP_PLAN_CURRENCY = 'usd';
process.env.GOOGLE_CLIENT_ID = '';
process.env.GOOGLE_CLIENT_SECRET = '';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:5000/api/v1/auth/google/callback';

// MongoMemoryServer configuration
process.env.MONGOMS_MD5_CHECK = '0';
process.env.MONGOMS_DISTRO = 'win64';
