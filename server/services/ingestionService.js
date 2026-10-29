import { getDB } from '../db.js';
import { AicteInternshipAdapter } from './adapters/aicteAdapter.js';
import { NspScholarshipAdapter } from './adapters/nspAdapter.js';

class IngestionService {
  constructor() {
    this.adapters = [
      new NspScholarshipAdapter(),
      new AicteInternshipAdapter()
    ];
    this.isSyncing = false;
    this.lastSyncResult = null;
    this.lastSyncTime = null;
    this.cooldownMs = 60 * 1000; // 1-minute minimum cooldown between manual syncs
  }

  /**
   * Returns current ingestion service status and metadata.
   */
  async getStatus() {
    try {
      const db = getDB();
      const oppsCollection = db.collection('opportunities');
      const syncCollection = db.collection('sync_logs');

      const totalCount = await oppsCollection.countDocuments();
      const liveCount = await oppsCollection.countDocuments({ isDemo: false });
      const demoCount = await oppsCollection.countDocuments({ isDemo: true });
      const scholarshipsCount = await oppsCollection.countDocuments({ type: { $regex: /^scholarship$/i } });
      const internshipsCount = await oppsCollection.countDocuments({ type: { $regex: /^internship$/i } });
      const activeCount = await oppsCollection.countDocuments({ status: 'active' });
      const expiredCount = await oppsCollection.countDocuments({ status: 'expired' });

      // Breakdown by source
      const bySource = await oppsCollection.aggregate([
        { $group: { _id: '$source', count: { $sum: 1 }, lastFetched: { $max: '$lastFetchedAt' } } }
      ]).toArray();

      const latestLog = await syncCollection.find().sort({ timestamp: -1 }).limit(1).toArray();

      return {
        isSyncing: this.isSyncing,
        lastSyncTime: this.lastSyncTime || (latestLog[0] ? latestLog[0].timestamp : null),
        lastSyncResult: this.lastSyncResult || (latestLog[0] ? latestLog[0] : null),
        counts: {
          total: totalCount,
          live: liveCount,
          demo: demoCount,
          scholarships: scholarshipsCount,
          internships: internshipsCount,
          active: activeCount,
          expired: expiredCount
        },
        sources: this.adapters.map(a => {
          const info = a.getSourceInfo();
          const match = bySource.find(s => s._id === info.name);
          return {
            ...info,
            count: match ? match.count : 0,
            lastFetched: match ? match.lastFetched : null
          };
        })
      };
    } catch (err) {
      return {
        isSyncing: this.isSyncing,
        error: err.message,
        adapters: this.adapters.map(a => a.getSourceInfo())
      };
    }
  }

  /**
   * Main sync orchestrator.
   * Runs adapters, normalizes, deduplicates, upserts to MongoDB, and logs summary.
   */
  async syncAll({ triggeredBy = 'manual', force = false } = {}) {
    if (this.isSyncing) {
      throw new Error('Sync is already in progress. Please wait for current sync to finish.');
    }

    if (!force && this.lastSyncTime && (Date.now() - new Date(this.lastSyncTime).getTime()) < this.cooldownMs) {
      const waitSec = Math.ceil((this.cooldownMs - (Date.now() - new Date(this.lastSyncTime).getTime())) / 1000);
      throw new Error(`Rate limit: Please wait ${waitSec} seconds before triggering another sync.`);
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const logEntry = {
      timestamp: new Date(),
      triggeredBy,
      results: {},
      totalInserted: 0,
      totalUpdated: 0,
      totalFailed: 0,
      errors: []
    };

    try {
      const db = getDB();
      const collection = db.collection('opportunities');

      for (const adapter of this.adapters) {
        const sourceInfo = adapter.getSourceInfo();
        const sourceName = sourceInfo.name;
        console.log(`[Ingestion] Starting sync for source: ${sourceName}...`);

        let fetchedItems = [];
        let sourceInserted = 0;
        let sourceUpdated = 0;

        try {
          fetchedItems = await adapter.fetchOpportunities();
          console.log(`[Ingestion] Fetched ${fetchedItems.length} records from ${sourceName}.`);
        } catch (fetchErr) {
          const errMsg = `Failed to fetch from ${sourceName}: ${fetchErr.message}`;
          console.error(`[Ingestion Error] ${errMsg}`);
          logEntry.errors.push({ source: sourceName, message: fetchErr.message });
          logEntry.results[sourceName] = { status: 'failed', error: fetchErr.message };
          // IMPORTANT: A source outage does NOT erase previously stored records from this source.
          continue;
        }

        const currentSourceIds = new Set();

        for (const item of fetchedItems) {
          if (!item.sourceId) continue;
          currentSourceIds.add(item.sourceId);

          try {
            // Deduplication strategy:
            // Match primarily on (source, sourceId), or canonical applicationUrl, or exact (title, org).
            const filter = {
              $or: [
                { source: item.source, sourceId: item.sourceId },
                { id: item.id },
                { applicationUrl: item.applicationUrl }
              ]
            };

            const existing = await collection.findOne(filter);

            if (existing) {
              // Update existing document while keeping its original _id and stable numeric/string id
              const updateDoc = {
                ...item,
                id: existing.id || item.id, // preserve existing id so user bookmarks stay intact
                _id: existing._id,
                createdAt: existing.createdAt || new Date(),
                lastFetchedAt: new Date(),
                lastVerifiedAt: new Date()
              };

              await collection.replaceOne({ _id: existing._id }, updateDoc);
              sourceUpdated++;
            } else {
              // Insert new document
              const insertDoc = {
                ...item,
                createdAt: new Date(),
                lastFetchedAt: new Date(),
                lastVerifiedAt: new Date()
              };

              await collection.insertOne(insertDoc);
              sourceInserted++;
            }
          } catch (itemErr) {
            console.error(`[Ingestion] Error processing item "${item.title}":`, itemErr.message);
            logEntry.totalFailed++;
          }
        }

        // Clean up or mark expired records for this source:
        // Any records in DB whose deadline has passed should be marked as 'expired'.
        const now = new Date();
        await collection.updateMany(
          {
            source: sourceName,
            status: { $ne: 'expired' },
            deadlineDate: { $ne: null, $lt: now }
          },
          {
            $set: { status: 'expired', lastVerifiedAt: now }
          }
        );

        logEntry.results[sourceName] = {
          status: 'success',
          fetched: fetchedItems.length,
          inserted: sourceInserted,
          updated: sourceUpdated
        };

        logEntry.totalInserted += sourceInserted;
        logEntry.totalUpdated += sourceUpdated;
      }

      logEntry.durationMs = Date.now() - startTime;
      logEntry.status = logEntry.errors.length > 0 ? (logEntry.totalInserted + logEntry.totalUpdated > 0 ? 'partial' : 'failed') : 'success';

      this.lastSyncTime = new Date();
      this.lastSyncResult = logEntry;

      // Save sync log to DB
      try {
        await db.collection('sync_logs').insertOne(logEntry);
      } catch (logErr) {
        console.warn('[Ingestion] Could not write to sync_logs collection:', logErr.message);
      }

      console.log(`[Ingestion] Completed sync in ${logEntry.durationMs}ms. Inserted: ${logEntry.totalInserted}, Updated: ${logEntry.totalUpdated}, Errors: ${logEntry.errors.length}`);
      return logEntry;
    } finally {
      this.isSyncing = false;
    }
  }
}

export const ingestionService = new IngestionService();

