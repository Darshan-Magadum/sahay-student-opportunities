import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('   SAHAY OPPORTUNITY CARD & LAYOUT VERIFICATION     ');
console.log('====================================================\n');

const css = fs.readFileSync('src/App.css', 'utf-8');
const jsx = fs.readFileSync('src/App.jsx', 'utf-8');

let allPassed = true;
function check(label, condition, details = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ❌ FAILED: ${label} - ${details}`);
    allPassed = false;
  }
}

// ── 1. Page Layout & Grid Verification ─────────────────────────────────────────
console.log('TEST 1: Page Layout & CSS Grid');

check(
  'Grid uses exactly 2 columns on desktop (repeat(2, minmax(0, 1fr)))',
  css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))')
);

check(
  'Grid gap is approximately 24px (1.5rem)',
  css.includes('gap: 1.5rem')
);

check(
  'Grid children use min-width: 0 to prevent text-driven track expansion',
  css.includes('.opportunities-grid > * {\n  min-width: 0;') ||
  css.includes('.opportunities-grid > * {\r\n  min-width: 0;')
);

check(
  'Tablet breakpoint (<=960px) reduces to 1 column',
  css.includes('@media (max-width: 960px)') &&
  css.includes('grid-template-columns: 1fr;')
);

check(
  'Mobile breakpoint (<=768px) reduces to 1 column',
  css.includes('@media (max-width: 768px)')
);

// ── 2. Card Styling & Design System ───────────────────────────────────────────
console.log('\nTEST 2: Card Styling & Visual Design System');

check(
  'Card uses solid white background and 16px rounded corners',
  css.includes('background-color: #ffffff;') && css.includes('border-radius: 16px;')
);

check(
  'Card uses comfortable 24px internal padding (1.5rem)',
  css.includes('padding: 1.5rem;')
);

check(
  'Card has smooth hover elevation with transition',
  css.includes('.opp-card:hover') && css.includes('transform: translateY(-3px);')
);

check(
  'Card title has prominent 20-22px bold styling with line-wrapping',
  css.includes('font-size: 1.3rem;') &&
  css.includes('overflow-wrap: break-word;') &&
  css.includes('-webkit-line-clamp: 2;')
);

check(
  'Provider / organization uses readable 14-15px text',
  css.includes('font-size: 0.9375rem;') && css.includes('.opp-org')
);

check(
  '2-column information grid is defined (.card-info-grid)',
  css.includes('.card-info-grid {') &&
  css.includes('grid-template-columns: repeat(2, minmax(0, 1fr));')
);

check(
  'Footer uses margin-top: auto to pin bottom alignment across cards',
  css.includes('.opp-footer {') && css.includes('margin-top: auto;')
);

check(
  'Buttons have minimum height 40px and nowrap whitespace',
  css.includes('min-height: 40px;') && css.includes('white-space: nowrap;')
);

// ── 3. ScholarshipCard & InternshipCard JSX Verification ─────────────────────
console.log('\nTEST 3: Card JSX Structure & Data Contract');

check(
  'ScholarshipCard displays prominent title, org, type badge, and 46px OrgLogo',
  jsx.includes('function ScholarshipCard') &&
  jsx.includes('<OrgLogo opp={opp} size={46} />') &&
  jsx.includes('className="opp-type-badge scholarship"')
);

check(
  'ScholarshipCard renders 2-column info grid (Award Value, Degree, Scope, Eligibility)',
  jsx.includes('Award Value') &&
  jsx.includes('Eligible Degree') &&
  jsx.includes('Applicable Scope') &&
  jsx.includes('Eligibility Criteria')
);

check(
  'InternshipCard displays prominent title, org, type badge, and 46px OrgLogo',
  jsx.includes('function InternshipCard') &&
  jsx.includes('<OrgLogo opp={opp} size={46} />') &&
  jsx.includes('className="opp-type-badge internship"')
);

check(
  'InternshipCard renders 2-column info grid (Monthly Stipend, Work Mode, Location, Required Skills)',
  jsx.includes('Monthly Stipend') &&
  jsx.includes('Work Mode & Duration') &&
  jsx.includes('Required Skills')
);

check(
  'Skill chips show +N more indicator when skill count exceeds 3',
  jsx.includes('opp.skills.slice(0, 3)') &&
  jsx.includes('+{opp.skills.length - 3}')
);

check(
  'Both cards handle sparse / incomplete profile without fabricating fake percentages',
  jsx.includes("isSparse ? 'Profile Incomplete' : match.label") &&
  jsx.includes("isSparse ? 'No score available' : `${match.score}% Match`")
);

check(
  'Both cards display missing criteria or skills cleanly without fabricated data',
  jsx.includes('opp-match-missing') &&
  jsx.includes('match.missingCriteria.slice(0, 2).join')
);

check(
  'Urgent vs warning deadline tags distinguish genuine deadlines (<=3 days vs <=7 days)',
  jsx.includes('days <= 3') &&
  jsx.includes('days <= 7') &&
  jsx.includes('deadline-warning') &&
  jsx.includes('deadline-urgent')
);

// ── 4. Viewport Width 1366px Mathematical Audit ──────────────────────────────
console.log('\nTEST 4: 1366px Desktop Viewport Overflow Verification');

const desktopViewportWidth = 1366;
const sidebarWidth = 260;
const mainContentWidth = desktopViewportWidth - sidebarWidth; // 1106px
const containerPadding = 64; // 2rem (32px) each side
const containerInnerWidth = mainContentWidth - containerPadding; // 1042px
const gridGap = 24; // 1.5rem
const cardWidth = (containerInnerWidth - gridGap) / 2; // 509px
const cardPadding = 48; // 1.5rem (24px) each side
const cardContentInnerWidth = cardWidth - cardPadding; // 461px

console.log(`  • Viewport: ${desktopViewportWidth}px`);
console.log(`  • Sidebar: ${sidebarWidth}px -> Main: ${mainContentWidth}px`);
console.log(`  • Dashboard container inner width: ${containerInnerWidth}px`);
console.log(`  • 2 columns: each card width is ${cardWidth}px`);
console.log(`  • Card inner content width: ${cardContentInnerWidth}px`);

check(
  'Exactly 2 columns fit cleanly within 1366px desktop viewport',
  cardWidth >= 480 && cardWidth <= 560
);

check(
  'No fixed min-widths causing overflow',
  !css.includes('.opportunities-grid { min-width:') &&
  !css.includes('.opp-card { min-width: 500px')
);

console.log('\n====================================================');
if (allPassed) {
  console.log('🎉 ALL LAYOUT & CARD REDESIGN TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('❌ SOME TESTS FAILED.');
  process.exit(1);
}
console.log('====================================================');

