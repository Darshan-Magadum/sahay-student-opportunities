import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Attempt loading .env from server directory first, then fallback to cwd
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const uri = process.env.MONGODB_URI;

let client;
let db;

export const connectDB = async () => {
  if (!uri || uri === 'your_mongodb_connection_string_here') {
    console.warn('⚠️  MONGODB_URI is not properly configured in .env file.');
    console.warn('⚠️  Continuing without MongoDB connection. Demo data will be used.');
    return null;
  }

  try {
    const parsedUri = new URL(uri);
    if (parsedUri.protocol !== 'mongodb:' && parsedUri.protocol !== 'mongodb+srv:') {
      console.error('❌ Invalid URI scheme. Must start with "mongodb://" or "mongodb+srv://"');
      process.exit(1);
    }
  } catch {
    console.error('❌ Failed to parse MONGODB_URI. Ensure special characters in your password (like "@") are URL-encoded (e.g., use "%40" for "@").');
    process.exit(1);
  }

  try {
    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
      db = client.db('sahay');
      console.log('✅ Successfully connected to MongoDB Atlas (sahay database).');
    }
    return db;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB Atlas:');
    console.error(error.message);
    process.exit(1); // Exit process with failure
  }
};

export const getDB = () => {
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return db;
};
