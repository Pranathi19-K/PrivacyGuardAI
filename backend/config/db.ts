import mongoose from 'mongoose';

export interface DatabaseStatus {
  connected: boolean;
  state: 'connected' | 'connecting' | 'disconnected' | 'unconfigured';
  host?: string;
  databaseName?: string;
  message: string;
  usingInMemoryFallback: boolean;
}

let isInitialized = false;
let dbStatus: DatabaseStatus = {
  connected: false,
  state: 'unconfigured',
  message: 'MongoDB URI is not configured in environment variables.',
  usingInMemoryFallback: true,
};

export const connectDatabase = async (): Promise<DatabaseStatus> => {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '') {
    dbStatus = {
      connected: false,
      state: 'unconfigured',
      message: 'MONGODB_URI is not set. Running in local session persistence mode.',
      usingInMemoryFallback: true,
    };
    return dbStatus;
  }

  try {
    dbStatus.state = 'connecting';
    dbStatus.message = 'Connecting to MongoDB Atlas...';

    // Disconnect existing if reconnecting
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    dbStatus = {
      connected: true,
      state: 'connected',
      host: conn.connection.host,
      databaseName: conn.connection.name,
      message: `Connected successfully to MongoDB Atlas (${conn.connection.name})`,
      usingInMemoryFallback: false,
    };

    console.log(`[PrivyShield AI DB] MongoDB Connected: ${conn.connection.host}`);
    return dbStatus;
  } catch (error: any) {
    console.warn(`[PrivyShield AI DB] MongoDB connection failed: ${error.message}`);
    dbStatus = {
      connected: false,
      state: 'disconnected',
      message: `Failed to connect to MongoDB: ${error.message}. Running in local session mode.`,
      usingInMemoryFallback: true,
    };
    return dbStatus;
  }
};

export const getDatabaseStatus = (): DatabaseStatus => {
  if (!isInitialized) {
    isInitialized = true;
    connectDatabase();
  }
  return dbStatus;
};

// Listen to mongoose events if connected
mongoose.connection.on('disconnected', () => {
  if (process.env.MONGODB_URI) {
    dbStatus = {
      connected: false,
      state: 'disconnected',
      message: 'MongoDB disconnected.',
      usingInMemoryFallback: true,
    };
  }
});

mongoose.connection.on('error', (err: any) => {
  console.error('[PrivyShield AI DB] Mongoose error:', err);
});
