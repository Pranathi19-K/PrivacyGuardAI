import mongoose from "mongoose";

let connectionPromise: Promise<typeof mongoose> | undefined;

export async function connectMongo(): Promise<void> {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be configured to use PrivacyGuard AI.");
  }

  connectionPromise ??= mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 10,
    autoIndex: true,
  });

  try {
    await connectionPromise;
  } catch {
    connectionPromise = undefined;
    throw new Error("MongoDB connection failed. Check the configured Atlas URI and network access.");
  }
}
