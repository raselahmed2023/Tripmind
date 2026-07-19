import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { config } from './config';
import healthRoutes from './routes/health.routes';
import authRoutes from './modules/auth/auth.route';
import userRoutes from './modules/user/user.route';
import destinationRoutes from './modules/destination/destination.route';
import tripRoutes from './modules/trip/trip.route';
import itineraryRoutes from './modules/itinerary/itinerary.route';
import aiRoutes from './modules/ai/ai.route';
import notificationRoutes from './modules/notification/notification.route';
import paymentRoutes from './modules/payment/payment.route';
import assistantRoutes from './modules/ai-assistant/assistant.route';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Trust proxy for Render/load balancers
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// CORS
const allowedOrigins = config.ALLOWED_ORIGINS
  ? config.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [config.CLIENT_URL];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Cookie parser
app.use(cookieParser());

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});
app.use(generalLimiter);

// Strict rate limiter for auth endpoints (register, login, refresh, google/exchange only)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later' },
});

// Strict rate limiter for AI generation
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'AI generation rate limit exceeded, please wait before trying again' },
});

// Strict rate limiter for payment checkout/verify only
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many payment attempts, please try again later' },
});

// Routes
app.use('/api/v1', healthRoutes);

// Auth: strict limiter only on specific mutation endpoints
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/refresh', authLimiter);
app.use('/api/v1/auth/google/exchange', authLimiter);
app.use('/api/v1/auth', authRoutes);

app.use('/api/v1/user', userRoutes);
app.use('/api/v1/destinations', destinationRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/itineraries', itineraryRoutes);
app.use('/api/v1/ai', aiLimiter, aiRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Payments: strict limiter only on checkout and verify
app.use('/api/v1/payments/trip-plan/checkout', paymentLimiter);
app.use('/api/v1/payments/trip-plan/verify', paymentLimiter);
app.use('/api/v1/payments', paymentRoutes);

app.use('/api/v1/ai-assistant', assistantRoutes);

// 404 handler (must be after all routes)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
