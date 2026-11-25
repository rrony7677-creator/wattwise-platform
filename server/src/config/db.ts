import mongoose from 'mongoose';
import { env } from './env.js';

interface MongooseGlobalCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _wattwiseMongooseCache: MongooseGlobalCache | undefined;
}

const cached: MongooseGlobalCache = globalThis._wattwiseMongooseCache ?? {
  conn: null,
  promise: null,
};

globalThis._wattwiseMongooseCache = cached;

/**
 * Serverless-safe MongoDB connection manager (Vercel compatible).
 * Reuses existing connection across warm serverless invocations.
 */
export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose
      .connect(env.MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
      })
      .then((m) => {
        console.log(`✅ MongoDB Connected: ${m.connection.host}/${m.connection.name}`);
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}
