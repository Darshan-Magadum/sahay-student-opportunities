/**
 * seed.js — One-shot script to populate the sahay.opportunities collection.
 * Safe to run multiple times; uses upsert on the stable `id` field.
 * Run with: npm run seed (from the server/ directory)
 */
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri || uri === 'your_mongodb_connection_string_here') {
  console.error('❌ MONGODB_URI is not set in .env. Aborting seed.');
  process.exit(1);
}

const demoOpportunities = [
  {
    id: 1,
    title: 'Demo: Women in Tech Scholarship',
    type: 'Scholarship',
    org: 'TechFoundation India',
    description: 'This scholarship aims to support female students pursuing degrees in Computer Science or related fields.',
    deadline: 'Oct 30, 2026',
    location: 'Remote',
    eligibility: 'Female students in 2nd or 3rd year of B.Tech.',
    applicationUrl: 'https://example.com/apply/1',
    amount: '₹50,000',
    isDemo: true,
    status: 'active'
  },
  {
    id: 2,
    title: 'Demo: Merit-cum-Means Grant',
    type: 'Scholarship',
    org: 'EduCare Trust',
    description: 'A financial grant for students showing exceptional merit and financial need.',
    deadline: 'Nov 05, 2026',
    location: 'Pan India',
    eligibility: 'GPA > 8.0, Family income < ₹4LPA',
    applicationUrl: 'https://example.com/apply/2',
    amount: '₹25,000',
    isDemo: true,
    status: 'active'
  },
  {
    id: 3,
    title: 'Demo: Future Leaders Scholarship',
    type: 'Scholarship',
    org: 'GlobalEd',
    description: 'Supporting students who demonstrate excellent leadership and community service.',
    deadline: 'Dec 15, 2026',
    location: 'Remote',
    eligibility: 'Any undergraduate student with leadership experience.',
    applicationUrl: 'https://example.com/apply/3',
    amount: '₹40,000',
    isDemo: true,
    status: 'active'
  },
  {
    id: 4,
    title: 'Demo: Frontend Engineering Intern',
    type: 'Internship',
    org: 'InnovateSpace',
    description: 'Join our fast-paced startup to build responsive web applications using React and Vite.',
    deadline: 'Nov 15, 2026',
    location: 'Bangalore, India',
    eligibility: 'Proficiency in HTML, CSS, JavaScript, and React.',
    applicationUrl: 'https://example.com/apply/4',
    stipend: '₹20,000/mo',
    isDemo: true,
    status: 'active'
  },
  {
    id: 5,
    title: 'Demo: Data Science Intern',
    type: 'Internship',
    org: 'Analytics Hub',
    description: 'Work with real-world datasets and assist in building predictive models.',
    deadline: 'Dec 01, 2026',
    location: 'Remote',
    eligibility: 'Knowledge of Python, Pandas, and basic Machine Learning.',
    applicationUrl: 'https://example.com/apply/5',
    stipend: '₹25,000/mo',
    isDemo: true,
    status: 'active'
  },
  {
    id: 6,
    title: 'Demo: Product Design Intern',
    type: 'Internship',
    org: 'Creative Minds',
    description: 'Help design user-centric interfaces and conduct user research.',
    deadline: 'Jan 10, 2027',
    location: 'Mumbai, India',
    eligibility: 'Familiarity with Figma and UI/UX principles.',
    applicationUrl: 'https://example.com/apply/6',
    stipend: '₹15,000/mo',
    isDemo: true,
    status: 'active'
  }
];

let client;

try {
  client = new MongoClient(uri);
  await client.connect();
  console.log('✅ Connected to MongoDB Atlas.');

  const db = client.db('sahay');
  const collection = db.collection('opportunities');

  let upserted = 0;
  let matched = 0;

  for (const opp of demoOpportunities) {
    const result = await collection.updateOne(
      { id: opp.id },          // filter: match by stable numeric id
      { $set: opp },           // ensure all fields including isDemo: true are saved
      { upsert: true }
    );
    if (result.upsertedCount > 0) {
      upserted++;
      console.log(`  ➕ Inserted: [id=${opp.id}] ${opp.title}`);
    } else {
      matched++;
      console.log(`  ✓  Already exists, skipped: [id=${opp.id}] ${opp.title}`);
    }
  }

  console.log(`\nSeeding complete. Inserted: ${upserted}, Already existed: ${matched}.`);
} catch (err) {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
} finally {
  if (client) await client.close();
  console.log('Connection closed.');
}
