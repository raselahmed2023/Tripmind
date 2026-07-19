import mongoose from 'mongoose';
import app from './app';
import { config } from './config';

const startServer = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');

    app.listen(config.PORT, () => {
      console.log(`🚀 Server running on port ${config.PORT} [${config.NODE_ENV}]`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
