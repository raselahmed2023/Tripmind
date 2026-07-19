import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer | null = null;
let usingExternalUri = false;

export const setupTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Support external MongoDB via TEST_MONGODB_URI
  const externalUri = process.env.TEST_MONGODB_URI;
  if (externalUri) {
    usingExternalUri = true;
    await mongoose.connect(externalUri);
    return;
  }

  if (!mongoServer) {
    try {
      mongoServer = await MongoMemoryServer.create();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(
        `[test setup] MongoMemoryServer failed to start: ${message}\n` +
        'Set TEST_MONGODB_URI to an external MongoDB instance if the in-memory server is unavailable.',
      );
    }
  }

  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

export const teardownTestDB = async () => {
  await mongoose.disconnect();
  // Only stop the in-memory server if we started it
  if (mongoServer && !usingExternalUri) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

export const clearDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};
