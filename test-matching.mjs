import { evaluateMatch, getOpportunityApplyAction, MATCH_LABELS, MATCH_TIERS } from './src/utils/matching.js';

const studentProfile = {
  degree: 'B.Tech',
  course: 'Computer Science',
  skills: ['React', 'JavaScript', 'Node.js', 'CSS'],
  languages: ['JavaScript', 'Python'],
  frameworks: ['React', 'Express'],
  internshipRoles: ['Full Stack Developer', 'Frontend Engineer'],
  workMode: 'hybrid',
  location: 'Bangalore, Karnataka',
  cgpa: '8.8',
  incomeRange: '<2.5L',
  domicileState: 'Karnataka',
  category: 'General'
};

const tests = [
  {
    name: 'Internship: Strong match with matching skills & role',
    opp: {
      type: 'Internship',
      title: 'Full Stack Developer Intern',
      skills: ['React', 'JavaScript', 'Node.js'],
      eligibility: 'B.Tech in Computer Science or IT',
      location: 'Bangalore, Karnataka',
      workMode: 'hybrid'
    },
    expectedTier: MATCH_TIERS.STRONG
  },
  {
    name: 'Internship: Potential match with partial skills',
    opp: {
      type: 'Internship',
      title: 'Data Analytics Intern',
      skills: ['Python', 'SQL', 'Excel', 'Tableau'],
      eligibility: 'B.Tech in Any Field',
      location: 'Remote',
      workMode: 'remote'
    },
    expectedTier: (tier) => [MATCH_TIERS.GOOD, MATCH_TIERS.POTENTIAL].includes(tier)
  },
  {
    name: 'Internship: Mismatched mandatory qualification (Postgrad/M.Tech required)',
    opp: {
      type: 'Internship',
      title: 'AI Research Fellowship Intern',
      skills: ['PyTorch'],
      eligibility: 'Enrolled in M.Tech or PhD Computer Science'
    },
    expectedTier: MATCH_TIERS.INELIGIBLE
  },
  {
    name: 'Scholarship: Strong / Good match (Technical Degree, Pan India, Merit)',
    opp: {
      type: 'Scholarship',
      title: 'AICTE - Swanath Scholarship Scheme ( Technical Degree)',
      academicRequirements: 'Technical Degree (B.Tech/B.E.)',
      location: 'Pan India',
      eligibility: 'Enrolled in full time technical degree'
    },
    expectedTier: (tier) => [MATCH_TIERS.STRONG, MATCH_TIERS.GOOD].includes(tier)
  },
  {
    name: 'Scholarship: Domicile mismatch (NER scheme when user is Karnataka)',
    opp: {
      type: 'Scholarship',
      title: 'Ishan Uday Special Scholarship Scheme For NER',
      location: 'North Eastern Region (NER)',
      eligibility: 'Students having domicile of NER'
    },
    expectedTier: MATCH_TIERS.INELIGIBLE
  },
  {
    name: 'Scholarship: Category mismatch (SC scheme when user is General)',
    opp: {
      type: 'Scholarship',
      title: 'Central Sector Scholarship Of Top Class Education For SC Students',
      eligibility: 'SC category candidates only'
    },
    expectedTier: MATCH_TIERS.INELIGIBLE
  },
  {
    name: 'Scholarship: Educational level mismatch (School scheme for college student)',
    opp: {
      type: 'Scholarship',
      title: 'PM YASASVI Scheme Of Top Class Education In Schools',
      eligibility: 'Secondary school students'
    },
    expectedTier: MATCH_TIERS.INELIGIBLE
  }
];

let failed = 0;
console.log('--- 1. PROFILE MATCHING & EVALUATION TESTS ---');

tests.forEach((t, i) => {
  const res = evaluateMatch(t.opp, studentProfile);
  const isMatch = typeof t.expectedTier === 'function'
    ? t.expectedTier(res.labelTier)
    : res.labelTier === t.expectedTier;

  if (isMatch) {
    console.log(`✅ [${i + 1}] ${t.name}: Score=${res.score}, Label="${res.label}"`);
    console.log(`    Reason: ${res.reason}`);
  } else {
    console.error(`❌ [${i + 1}] ${t.name}: Expected tier ${t.expectedTier}, got ${res.labelTier} (Score: ${res.score}, Label: "${res.label}")`);
    failed++;
  }
});

console.log('\n--- 2. APPLICATION URL RESOLUTION & PDF SHIELD TESTS ---');

const applyTests = [
  {
    name: 'Scholarship with central NSP OTR application portal',
    opp: {
      type: 'Scholarship',
      hasDirectApply: true,
      applicationUrl: 'https://scholarships.gov.in/otrapplication/#/login-page',
      officialSchemeUrl: 'https://www.aicte-india.org/schemes/students-development-schemes/Swanath-Scholarship-Scheme',
      guidelinesUrl: 'https://scholarships.gov.in/public/schemeGuidelines/AICTE/AICTE_3039_G.pdf'
    },
    assert: (act) => act.type === 'direct' && !act.url.endsWith('.pdf') && act.url.startsWith('https://')
  },
  {
    name: 'Scholarship with dedicated scheme portal (AICTE-JK PMSSS)',
    opp: {
      type: 'Scholarship',
      hasDirectApply: true,
      applicationUrl: 'https://www.aicte-jk-scholarship-gov.in/',
      officialSchemeUrl: 'https://www.aicte-jk-scholarship-gov.in/'
    },
    assert: (act) => act.type === 'direct' && act.url === 'https://www.aicte-jk-scholarship-gov.in/'
  },
  {
    name: 'Scholarship with institutional application (MNRE Fellowship - no direct portal)',
    opp: {
      type: 'Scholarship',
      hasDirectApply: false,
      applicationUrl: null,
      officialSchemeUrl: 'https://mnre.gov.in/'
    },
    assert: (act) => act.type === 'official_site' && act.url === 'https://mnre.gov.in/'
  },
  {
    name: 'Defensive check: PDF url is rejected and never treated as Apply destination',
    opp: {
      type: 'Scholarship',
      hasDirectApply: true,
      applicationUrl: 'https://scholarships.gov.in/public/schemeGuidelines/test.pdf',
      officialSchemeUrl: null
    },
    assert: (act) => act.type === 'unavailable' && act.url === null
  },
  {
    name: 'Internship Apply links intact and preserved',
    opp: {
      type: 'Internship',
      applicationUrl: 'https://internship.aicte-india.org/internships/INTERNSHIP_123',
      sourceUrl: 'https://internship.aicte-india.org/internships'
    },
    assert: (act) => act.type === 'direct' && act.url === 'https://internship.aicte-india.org/internships/INTERNSHIP_123'
  }
];

applyTests.forEach((t, i) => {
  const act = getOpportunityApplyAction(t.opp);
  if (t.assert(act)) {
    console.log(`✅ [${i + 1}] ${t.name}: Action=${act.type}, Label="${act.label}", URL=${act.url || 'None'}`);
  } else {
    console.error(`❌ [${i + 1}] ${t.name}: Failed assertion! Got ${JSON.stringify(act)}`);
    failed++;
  }
});

console.log('\n--- 3. CATALOG VISIBILITY & NON-HIDING SORTING TESTS ---');

const mixedOpps = [
  { id: 'low_1', title: 'NER Fellowship', type: 'Scholarship', location: 'NER' },
  { id: 'high_1', title: 'Swanath Technical Degree', type: 'Scholarship', location: 'Pan India', academicRequirements: 'B.Tech' },
  { id: 'mid_1', title: 'General College Scholarship', type: 'Scholarship', location: 'Pan India', academicRequirements: 'Undergraduate Degree' }
];

const evaluated = mixedOpps.map(opp => {
  const match = evaluateMatch(opp, studentProfile);
  return { ...opp, _matchScore: match.score };
});

evaluated.sort((a, b) => b._matchScore - a._matchScore);

if (evaluated.length === 3 && evaluated[0].id === 'high_1' && evaluated[2].id === 'low_1') {
  console.log(`✅ [PASS] Catalog intact: all 3 items preserved, best match ranked first (Scores: ${evaluated.map(e => e._matchScore).join(', ')})`);
} else {
  console.error(`❌ [FAIL] Sorting dropped items or ordered incorrectly: ${JSON.stringify(evaluated)}`);
  failed++;
}

console.log('\n--- 4. PROFILE UPDATE REACTIVITY TESTS ---');

const updatedProfile = {
  ...studentProfile,
  domicileState: 'Assam',
  category: 'SC'
};

const nerOpp = { type: 'Scholarship', title: 'Ishan Uday Special Scholarship Scheme For NER', location: 'North Eastern Region (NER)', eligibility: 'Students having domicile of NER' };
const initialMatch = evaluateMatch(nerOpp, studentProfile);
const reactiveMatch = evaluateMatch(nerOpp, updatedProfile);

if (initialMatch.labelTier === MATCH_TIERS.INELIGIBLE && reactiveMatch.labelTier !== MATCH_TIERS.INELIGIBLE && reactiveMatch.score > initialMatch.score) {
  console.log(`✅ [PASS] Profile change dynamically refreshed ranking: ${initialMatch.score} (${initialMatch.label}) -> ${reactiveMatch.score} (${reactiveMatch.label})`);
} else {
  console.error(`❌ [FAIL] Dynamic refresh failed: Initial=${initialMatch.score}, Updated=${reactiveMatch.score}`);
  failed++;
}

if (failed > 0) {
  console.error(`\nFAILED: ${failed} tests failed.`);
  process.exit(1);
} else {
  console.log(`\n🎉 ALL MATCHING, CATALOG VISIBILITY, AND URL RESOLUTION TESTS PASSED!`);
  process.exit(0);
}
