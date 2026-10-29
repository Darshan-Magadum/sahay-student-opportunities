import { getDB, connectDB } from './db.js';
import { ingestionService } from './services/ingestionService.js';
import express from 'express';
import apiRoutes from './routes/api.js';

async function runVerification() {
  console.log('====================================================');
  console.log('   SAHAY LIVE OPPORTUNITY INGESTION VERIFICATION   ');
  console.log('====================================================\n');

  await connectDB();
  const db = getDB();
  const collection = db.collection('opportunities');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
    }
  }

  // ── TEST 1: Live Listings Imported ──────────────────────────────────
  const liveCount = await collection.countDocuments({ isDemo: false });
  const nspCount = await collection.countDocuments({ source: 'National Scholarship Portal (NSP)', isDemo: false });
  const aicteCount = await collection.countDocuments({ source: 'AICTE Internship Portal', isDemo: false });

  assert(liveCount > 0, `Live opportunities imported (${liveCount} found in database)`);
  assert(nspCount > 0, `NSP Scholarships imported (${nspCount} found)`);
  assert(aicteCount > 0, `AICTE Internships imported (${aicteCount} found)`);

  // ── TEST 2: Deduplication on repeated sync ───────────────────────────
  const preCount = await collection.countDocuments();
  console.log(`\nTesting deduplication (pre-sync total: ${preCount})...`);
  const dedupResult = await ingestionService.syncAll({ triggeredBy: 'verification_suite', force: true });
  const postCount = await collection.countDocuments();

  assert(dedupResult.totalInserted === 0, `Deduplication: 0 duplicates inserted (inserted: ${dedupResult.totalInserted}, updated: ${dedupResult.totalUpdated})`);
  assert(preCount === postCount, `Collection document count remained constant (${preCount} -> ${postCount})`);

  // ── TEST 3: Deadlines & Canonical URLs preserved ─────────────────────
  const sampleNsp = await collection.findOne({ source: 'National Scholarship Portal (NSP)', isDemo: false });
  const sampleAicte = await collection.findOne({ source: 'AICTE Internship Portal', isDemo: false });

  assert(Boolean(sampleNsp.deadline && sampleNsp.applicationUrl), `NSP listing has deadline (${sampleNsp.deadline}) and applicationUrl (${sampleNsp.applicationUrl})`);
  assert(sampleNsp.applicationUrl.startsWith('https://scholarships.gov.in'), 'NSP applicationUrl points to official gov portal');
  assert(Boolean(sampleAicte.deadline && sampleAicte.applicationUrl), `AICTE listing has deadline (${sampleAicte.deadline}) and applicationUrl (${sampleAicte.applicationUrl})`);
  assert(sampleAicte.applicationUrl.startsWith('https://internship.aicte-india.org'), 'AICTE applicationUrl points to official internship portal');

  // ── TEST 4: Expired vs Active Status Handling ────────────────────────
  const activeCount = await collection.countDocuments({ status: 'active' });
  const expiredCount = await collection.countDocuments({ status: 'expired' });
  assert(activeCount > 0, `Active listings marked correctly (${activeCount} active)`);
  console.log(`   (Status distribution: ${activeCount} active, ${expiredCount} expired)`);

  // ── TEST 5: Source Outage Resilience ────────────────────────────────
  console.log('\nTesting source outage resilience (simulating mock network failure)...');
  const mockFailingAdapter = {
    getSourceInfo: () => ({ name: 'Mock Failing Source', url: 'https://failure.test' }),
    fetchOpportunities: async () => { throw new Error('Simulated upstream DNS timeout 504 Gateway'); }
  };
  const originalAdapters = ingestionService.adapters;
  ingestionService.adapters = [...originalAdapters, mockFailingAdapter];

  const beforeOutageLiveCount = await collection.countDocuments({ isDemo: false });
  const outageSyncResult = await ingestionService.syncAll({ triggeredBy: 'outage_test', force: true });
  const afterOutageLiveCount = await collection.countDocuments({ isDemo: false });

  assert(afterOutageLiveCount === beforeOutageLiveCount, `Outage resilience: previous live records preserved untouched (${beforeOutageLiveCount} records)`);
  assert(outageSyncResult.errors.some(e => e.source === 'Mock Failing Source'), 'Outage resilience: error logged safely without crashing pipeline');
  ingestionService.adapters = originalAdapters; // restore

  // ── TEST 6: Express API Endpoints & Demo Record Isolation ────────────
  console.log('\nTesting Express API endpoints...');
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);
  const server = app.listen(5098);

  try {
    const oppsRes = await fetch('http://localhost:5098/api/opportunities').then(r => r.json());
    assert(Array.isArray(oppsRes) && oppsRes.length > 0, `GET /api/opportunities returns live array (${oppsRes.length} items)`);
    assert(oppsRes.every(o => o.isDemo !== true), 'Demo isolation: 100% of default listings are genuine live listings');

    const scholarshipsRes = await fetch('http://localhost:5098/api/opportunities?type=scholarship').then(r => r.json());
    assert(scholarshipsRes.every(o => o.type.toLowerCase() === 'scholarship'), 'GET /api/opportunities?type=scholarship strictly returns scholarships');

    const internshipsRes = await fetch('http://localhost:5098/api/opportunities?type=internship').then(r => r.json());
    assert(internshipsRes.every(o => o.type.toLowerCase() === 'internship'), 'GET /api/opportunities?type=internship strictly returns internships');

    const singleOpp = await fetch(`http://localhost:5098/api/opportunities/${oppsRes[0].id}`).then(r => r.json());
    assert(singleOpp.title === oppsRes[0].title, `GET /api/opportunities/:id successfully retrieves item [${singleOpp.id}]`);

    const statusRes = await fetch('http://localhost:5098/api/ingest/status').then(r => r.json());
    assert(statusRes.sources.length === 2 && statusRes.counts.live > 0, `GET /api/ingest/status reports ${statusRes.sources.length} sources and ${statusRes.counts.live} live listings`);

    const unauthSyncRes = await fetch('http://localhost:5098/api/ingest/sync', { method: 'POST' });
    assert(unauthSyncRes.status === 401, 'POST /api/ingest/sync security: blocks unauthorized sync requests (HTTP 401)');

    const authSyncRes = await fetch('http://localhost:5098/api/ingest/sync?key=sahay-admin-sync-secret&force=true', { method: 'POST' });
    assert(authSyncRes.status === 200, 'POST /api/ingest/sync security: permits authorized admin sync with valid key (HTTP 200)');
  } finally {
    server.close();
  }

  // ── TEST 7: Credential & PII Protection ──────────────────────────────
  const sampleJson = JSON.stringify(await collection.findOne());
  assert(!sampleJson.includes('mongodb+srv://') && !sampleJson.includes('password'), 'Database records contain no connection strings or credentials');

  console.log('\n====================================================');
  console.log(`  VERIFICATION RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('====================================================\n');

  process.exit(passedTests === totalTests ? 0 : 1);
}

runVerification().catch(err => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});

