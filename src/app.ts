import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes';
import authRoutes from './modules/auth/auth.route';
import userRoutes from './modules/user/user.route';
import destinationRoutes from './modules/destination/destination.route';
import tripRoutes from './modules/trip/trip.route';
import itineraryRoutes from './modules/itinerary/itinerary.route';
import aiRoutes from './modules/ai/ai.route';
import notificationRoutes from './modules/notification/notification.route';
import paymentRoutes from './modules/payment/payment.route';
import subscriptionRoutes from './modules/subscription/subscription.route';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Webhook raw body middleware — must come before the global JSON parser
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/destinations', destinationRoutes);
app.use('/api/v1/trips', tripRoutes);
app.use('/api/v1/itineraries', itineraryRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);

// 404 handler (must be after all routes)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
