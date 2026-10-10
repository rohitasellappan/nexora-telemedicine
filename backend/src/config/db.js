
import mongoose from 'mongoose';
import { seedDatabase } from './seed.js';

export const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const connectDB = async () => {
  const uri = process.env.MONGODB_URL?.trim();

  if (!uri) {
    console.error(
      '[MongoDB Error] MONGODB_URL is missing from the backend environment.'
    );
    return false;
  }

  if (!uri.startsWith('mongodb+srv://') &&
      !uri.startsWith('mongodb://')) {
    console.error(
      '[MongoDB Error] Invalid connection string scheme.'
    );
    return false;
  }

  try {
    console.log('[MongoDB] Attempting to connect to Atlas...');

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });

    console.log(
      `[MongoDB] Connected successfully to database: ${mongoose.connection.name}`
    );

    await seedDatabase();
    return true;
  } catch (error) {
    console.error(
      '[MongoDB Error]',
      error.name,
      error.message
    );
    return false;
  }
};

export default { connectDB, isDbConnected };
