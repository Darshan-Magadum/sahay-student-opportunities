import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.js';
import { connectDB } from './db.js';
import { ingestionService } from './services/ingestionService.js';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174'
];

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// 404 Handler for unknown routes
app.use((req, res, _next) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.originalUrl} not found.` });
});

// Global Error Handler
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: 'Something went wrong on the server.' });
});

// Start Server and Initialize Ingestion Services
connectDB().then(async (db) => {
  if (db) {
    try {
      // Ensure existing demo records are clearly labeled as isDemo: true
      await db.collection('opportunities').updateMany(
        { id: { $in: [1, 2, 3, 4, 5, 6] }, isDemo: { $exists: false } },
        { $set: { isDemo: true, status: 'active' } }
      );

      // Check if any live listings exist; if not, trigger an initial sync
      const liveCount = await db.collection('opportunities').countDocuments({ isDemo: false });
      if (liveCount === 0) {
        console.log('🚀 No live opportunities found in database. Initiating background initial ingestion...');
        ingestionService.syncAll({ triggeredBy: 'server_startup', force: true }).catch(err => {
          console.warn('[Ingestion Startup Warning] Initial sync failed:', err.message);
        });
      } else {
        console.log(`📊 Found ${liveCount} live opportunities in database.`);
      }

      // Schedule recurring daily sync
      const syncIntervalHours = parseInt(process.env.SYNC_INTERVAL_HOURS, 10) || 24;
      const intervalMs = syncIntervalHours * 60 * 60 * 1000;
      setInterval(() => {
        console.log(`⏰ Triggering scheduled ingestion sync (interval: ${syncIntervalHours}h)...`);
        ingestionService.syncAll({ triggeredBy: 'scheduled_timer' }).catch(err => {
          console.warn('[Scheduled Sync Warning]:', err.message);
        });
      }, intervalMs);

    } catch (initErr) {
      console.warn('Database initialization warning:', initErr.message);
    }
  }

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});
