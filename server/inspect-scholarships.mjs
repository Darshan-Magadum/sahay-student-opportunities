import { connectDB, getDB } from './db.js';

async function checkScholarships() {
  await connectDB();
  const db = getDB();
  const scholarships = await db.collection('opportunities').find({ type: 'Scholarship', isDemo: false }).toArray();
  console.log('Total live scholarships:', scholarships.length);
  scholarships.forEach((s, idx) => {
    console.log(`\n[${idx + 1}] Title: ${s.title}`);
    console.log(`    Org: ${s.org}`);
    console.log(`    applicationUrl: ${s.applicationUrl}`);
    console.log(`    guidelinesUrl: ${s.guidelinesUrl}`);
    console.log(`    sourceUrl: ${s.sourceUrl}`);
    console.log(`    sourceId: ${s.sourceId}`);
  });
  process.exit(0);
}

checkScholarships().catch(console.error);

