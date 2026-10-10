
import mongoose from 'mongoose';
import { seedDatabase } from './seed.js';

export const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const connectDB = async () => {
  const uri = process.env.MONGODB_URL?.trim();

  if (!uri) {
    console.error(
      '[MongoDB Error] MONGODB_URL is missing from backend/.env'
    );
    return false;
  }

  if (uri.startsWith('mongodb+srv://') && /:\d+(?:\/|\?|$)/.test(uri.split('@').pop() || '')) {
    console.error(
      '[MongoDB Error] Do not add a port number to an Atlas mongodb+srv hostname.'
    );
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });

    console.log(
      `[MongoDB] Connected successfully to database: ${mongoose.connection.name}`
    );

    await seedDatabase();
    return true;
  } catch (error) {
    console.error('[MongoDB Error]', error.message);
    return false;
  }
};

export default { connectDB, isDbConnected };
