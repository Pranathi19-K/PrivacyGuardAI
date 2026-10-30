import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cors from 'cors';

import { connectDatabase } from './config/db.ts';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(
  __dirname,
  path.basename(__dirname) === 'dist' ? '../../.env' : '../.env'
);
dotenv.config({ path: envPath });

const [
  { default: authRoutes },
  { default: maskRoutes },
  { default: historyRoutes },
  { default: rulesRoutes },
  { default: aiRoutes },
  { default: systemRoutes },
] = await Promise.all([
  import('./routes/auth.routes.ts'),
  import('./routes/mask.routes.ts'),
  import('./routes/history.routes.ts'),
  import('./routes/rules.routes.ts'),
  import('./routes/ai.routes.ts'),
  import('./routes/system.routes.ts'),
]);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '5000', 10);

  connectDatabase().catch((err) => {
    console.warn('[PrivyShield AI DB] Initial connection warning:', err.message);
  });

 // CORS Configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/mask', maskRoutes);
  app.use('/api/history', historyRoutes);
  app.use('/api/rules', rulesRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/system', systemRoutes);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PrivyShield AI API] Running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[PrivyShield AI Server Startup Failure]', err);
  process.exit(1);
});

