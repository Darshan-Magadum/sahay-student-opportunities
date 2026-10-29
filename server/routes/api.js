import express from 'express';
import { ObjectId } from 'mongodb';
import { getDB } from '../db.js';
import { ingestionService } from '../services/ingestionService.js';

const router = express.Router();

// GET /api/health
router.get('/health', async (req, res) => {
  try {
    const db = getDB();
    const liveCount = await db.collection('opportunities').countDocuments({ isDemo: false });
    res.status(200).json({
      status: 'healthy',
      message: 'Sahay API is operational with live MongoDB Atlas connection.',
      timestamp: new Date().toISOString(),
      liveOpportunitiesCount: liveCount
    });
  } catch (err) {
    res.status(200).json({
      status: 'degraded',
      message: 'Sahay API is operational (database check pending).',
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
});

// GET /api/opportunities
// Supports query params:
// - type: 'scholarship' | 'internship'
// - includeDemo: 'true' | 'false' (default: false if live records exist)
// - status: 'active' | 'expired' | 'all' (default: 'all')
// - search: text string
router.get('/opportunities', async (req, res) => {
  try {
    const { type, includeDemo, status, search } = req.query;
    const db = getDB();
    const collection = db.collection('opportunities');

    const filter = {};

    // Filter by type (case-insensitive)
    if (type !== undefined && type.trim() !== '') {
      const typeLower = type.toLowerCase().trim();
      if (typeLower !== 'scholarship' && typeLower !== 'internship') {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid type parameter. Supported values are "scholarship" or "internship".'
        });
      }
      filter.type = { $regex: new RegExp(`^${typeLower}$`, 'i') };
    }

    // Determine whether to include demo records:
    // Exclude demo records by default if genuine live records exist in the database.
    const liveCount = await collection.countDocuments({ isDemo: false });
    if (includeDemo === 'true') {
      // User explicitly requested demo records
    } else if (liveCount > 0) {
      // Live records exist -> filter out demo records
      filter.isDemo = { $ne: true };
    }

    // Filter by status if specified
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Text search if specified
    if (search && search.trim() !== '') {
      const term = search.trim();
      filter.$or = [
        { title: { $regex: term, $options: 'i' } },
        { org: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { eligibility: { $regex: term, $options: 'i' } },
        { location: { $regex: term, $options: 'i' } },
        { skills: { $in: [new RegExp(term, 'i')] } }
      ];
    }

    // Sort: verified/live active first, then nearest deadline
    const results = await collection
      .find(filter)
      .sort({ status: 1, deadlineDate: 1, _id: -1 })
      .toArray();

    // Map _id to string for clean serialization
    const sanitized = results.map(doc => ({
      ...doc,
      _id: doc._id.toString()
    }));

    res.status(200).json(sanitized);
  } catch (error) {
    console.error('Error fetching opportunities from MongoDB:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while fetching opportunities.'
    });
  }
});

// GET /api/opportunities/:id
// Retrieves a single opportunity by its ID (supports string sourceId, numeric id, or Mongo _id)
router.get('/opportunities/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const db = getDB();
    const collection = db.collection('opportunities');

    // Build flexible query to match any representation of the ID
    const conditions = [
      { id: rawId },
      { sourceId: rawId }
    ];

    const numericId = parseInt(rawId, 10);
    if (!isNaN(numericId)) {
      conditions.push({ id: numericId });
    }

    if (ObjectId.isValid(rawId)) {
      conditions.push({ _id: new ObjectId(rawId) });
    }

    const item = await collection.findOne({ $or: conditions });
    if (!item) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Opportunity with identifier "${rawId}" was not found.`
      });
    }

    res.status(200).json({
      ...item,
      _id: item._id.toString()
    });
  } catch (error) {
    console.error('Error fetching single opportunity:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve opportunity details.'
    });
  }
});

// GET /api/ingest/status
// Returns ingestion status, source health, counts, and last sync metadata
router.get('/ingest/status', async (req, res) => {
  try {
    const status = await ingestionService.getStatus();
    res.status(200).json(status);
  } catch (error) {
    console.error('Failed to retrieve ingestion status:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve ingestion status.'
    });
  }
});

// POST /api/ingest/sync
// Admin-triggered synchronization endpoint
// Requires valid admin authorization (x-admin-key header or ?key=)
router.post('/ingest/sync', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'] || req.query.key;
    const configuredKey = process.env.ADMIN_SYNC_KEY || 'sahay-admin-sync-secret';

    if (!adminKey || adminKey !== configuredKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid admin authentication key is required to trigger ingestion sync.'
      });
    }

    const force = req.query.force === 'true';
    const result = await ingestionService.syncAll({ triggeredBy: 'admin_api', force });

    res.status(200).json({
      status: 'success',
      message: 'Opportunity data ingestion completed successfully.',
      summary: result
    });
  } catch (error) {
    const statusCode = error.message.includes('already in progress') ? 409 :
                       error.message.includes('Rate limit') ? 429 : 500;
    res.status(statusCode).json({
      error: 'Sync Failed',
      message: error.message
    });
  }
});

export default router;
