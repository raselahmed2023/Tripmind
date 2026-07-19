import mongoose from 'mongoose';
import app from './app';
import { config } from './config';

let server: ReturnType<typeof app.listen>;

const startServer = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');

    server = app.listen(config.PORT, () => {
      console.log(`🚀 Server running on port ${config.PORT} [${config.NODE_ENV}]`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed');
      await mongoose.disconnect();
      console.log('MongoDB disconnected');
      process.exit(0);
    });
  } else {
    mongoose.disconnect().then(() => process.exit(0));
  }

  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
