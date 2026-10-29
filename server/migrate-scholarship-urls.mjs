import { connectDB, getDB } from './db.js';

function toAbsoluteUrl(url) {
  if (!url || typeof url !== 'string') return null;
  let clean = url.trim();
  if (clean === 'https://scholarships.gov.in/' || clean === 'https://scholarships.gov.in' || clean === '/') {
    return null;
  }
  if (clean.startsWith('//')) {
    return `https:${clean}`;
  }
  if (clean.startsWith('/')) {
    return `https://scholarships.gov.in${clean}`;
  }
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    return `https://scholarships.gov.in/${clean}`;
  }
  return clean;
}

function resolveOfficialUrls(title) {
  const titleLower = title.toLowerCase();

  // 1. Dedicated scheme portals
  if (titleLower.includes('jammu') || titleLower.includes('kashmir') || titleLower.includes('pm-usp special') || titleLower.includes('pmsss')) {
    return {
      applicationUrl: 'https://www.aicte-jk-scholarship-gov.in/',
      officialSchemeUrl: 'https://www.aicte-jk-scholarship-gov.in/',
      hasDirectApply: true
    };
  }

  if (titleLower.includes('tribal fellowship') || (titleLower.includes('fellowship') && titleLower.includes('st students'))) {
    return {
      applicationUrl: 'https://fellowship.tribal.gov.in/',
      officialSchemeUrl: 'https://tribal.nic.in/',
      hasDirectApply: true
    };
  }

  if (titleLower.includes('free coaching') && titleLower.includes('pm cares')) {
    return {
      applicationUrl: 'https://coaching.dosje.gov.in/',
      officialSchemeUrl: 'https://socialjustice.gov.in/',
      hasDirectApply: true
    };
  }

  // 2. Schemes with no direct NSP online application portal (institutional nomination)
  if (titleLower.includes('renewable energy') || titleLower.includes('mnre')) {
    return {
      applicationUrl: null,
      officialSchemeUrl: 'https://mnre.gov.in/',
      hasDirectApply: false
    };
  }

  // 3. Scheme-specific official informational portals
  let officialSchemeUrl = 'https://scholarships.gov.in/';
  if (titleLower.includes('pragati')) {
    officialSchemeUrl = 'https://www.aicte-india.org/schemes/students-development-schemes/Pragati-Scholarship-Scheme';
  } else if (titleLower.includes('saksham')) {
    officialSchemeUrl = 'https://www.aicte-india.org/schemes/students-development-schemes/Saksham-Scholarship-Scheme';
  } else if (titleLower.includes('swanath')) {
    officialSchemeUrl = 'https://www.aicte-india.org/schemes/students-development-schemes/Swanath-Scholarship-Scheme';
  } else if (titleLower.includes('ishan uday') || titleLower.includes('post graduate studies')) {
    officialSchemeUrl = 'https://www.ugc.gov.in/';
  } else if (titleLower.includes('disabilities')) {
    officialSchemeUrl = 'https://depwd.gov.in/';
  } else if (titleLower.includes('nmmss')) {
    officialSchemeUrl = 'https://dsel.education.gov.in/scheme/nmmss';
  } else if (titleLower.includes('csss') || titleLower.includes('college and university students')) {
    officialSchemeUrl = 'https://www.education.gov.in/scholarships-education-loan-0';
  } else if (titleLower.includes('nec') || titleLower.includes('ner')) {
    officialSchemeUrl = 'https://necouncil.gov.in/';
  } else if (titleLower.includes('railways')) {
    officialSchemeUrl = 'https://indianrailways.gov.in/';
  } else if (titleLower.includes('icar')) {
    officialSchemeUrl = 'https://icar.org.in/';
  } else if (titleLower.includes('labour') || titleLower.includes('beedi')) {
    officialSchemeUrl = 'https://labour.gov.in/';
  } else if (titleLower.includes('statistical')) {
    officialSchemeUrl = 'https://www.isical.ac.in/';
  } else if (titleLower.includes('yasasvi') || titleLower.includes('top class education for sc')) {
    officialSchemeUrl = 'https://socialjustice.gov.in/';
  } else if (titleLower.includes('central armed police') || titleLower.includes('assam rifles')) {
    officialSchemeUrl = 'https://www.warb-mha.gov.in/';
  }

  // Central NSP OTR student application portal
  const applicationUrl = 'https://scholarships.gov.in/otrapplication/#/login-page';

  return {
    applicationUrl,
    officialSchemeUrl,
    hasDirectApply: true
  };
}

async function runMigration() {
  await connectDB();
  const db = getDB();
  const collection = db.collection('opportunities');

  const scholarships = await collection.find({ type: 'Scholarship', isDemo: false }).toArray();
  console.log(`Found ${scholarships.length} live scholarship records to audit and correct.`);

  let updatedCount = 0;
  const report = [];

  for (const s of scholarships) {
    const oldAppUrl = s.applicationUrl;
    const oldGuidelinesUrl = s.guidelinesUrl;

    const cleanGuidelines = toAbsoluteUrl(oldGuidelinesUrl || (oldAppUrl && oldAppUrl.endsWith('.pdf') ? oldAppUrl : null));
    const urls = resolveOfficialUrls(s.title);

    await collection.updateOne(
      { _id: s._id },
      {
        $set: {
          applicationUrl: urls.applicationUrl,
          officialSchemeUrl: urls.officialSchemeUrl,
          hasDirectApply: urls.hasDirectApply,
          guidelinesUrl: cleanGuidelines,
          lastVerifiedAt: new Date()
        }
      }
    );

    updatedCount++;
    report.push({
      id: s.id,
      title: s.title,
      oldAppUrl,
      newAppUrl: urls.applicationUrl,
      officialSchemeUrl: urls.officialSchemeUrl,
      hasDirectApply: urls.hasDirectApply,
      guidelinesUrl: cleanGuidelines
    });
  }

  console.log(`Successfully migrated ${updatedCount} scholarship records.`);

  // Validation
  const pdfAppCount = await collection.countDocuments({
    type: 'Scholarship',
    applicationUrl: { $regex: /\.pdf$/i }
  });
  console.log(`Scholarships with .pdf applicationUrl remaining: ${pdfAppCount}`);

  if (pdfAppCount > 0) {
    throw new Error(`Migration error: Found ${pdfAppCount} records still pointing to PDF files!`);
  }

  console.log('\n--- MIGRATION REPORT ---');
  report.forEach((r, idx) => {
    console.log(`\n[${idx + 1}] ${r.title}`);
    console.log(`    Old App URL: ${r.oldAppUrl}`);
    console.log(`    New App URL: ${r.newAppUrl || 'None (Direct application unavailable)'}`);
    console.log(`    Official Scheme Page: ${r.officialSchemeUrl}`);
    console.log(`    Guidelines Doc (PDF): ${r.guidelinesUrl || 'None'}`);
    console.log(`    Direct Apply Supported: ${r.hasDirectApply}`);
  });

  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

