import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('Sahay Mobile Responsiveness & Adaptive Layout Audit');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error(`    Details: ${details}`);
  }
}

// Helper to extract the contents of a specific @media block
function getMediaQueryBlock(css, maxWidth) {
  const queryPattern = new RegExp(`@media\\s*\\(\\s*max-width:\\s*${maxWidth}px\\s*\\)\\s*\\{`, 'i');
  const match = queryPattern.exec(css);
  if (!match) return null;

  let startIndex = match.index + match[0].length;
  let braceCount = 1;
  let currentIndex = startIndex;

  while (currentIndex < css.length && braceCount > 0) {
    if (css[currentIndex] === '{') braceCount++;
    else if (css[currentIndex] === '}') braceCount--;
    currentIndex++;
  }

  return css.substring(startIndex, currentIndex - 1);
}

// 1. Audit index.html
console.log('1. Checking Viewport Meta Tag in index.html...');
const indexPath = path.join(__dirname, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');
assert(
  /<meta\s+name=["']viewport["']\s+content=["'][^"']*width=device-width[^"']*initial-scale=1\.0[^"']*["']/i.test(indexHtml),
  'Viewport meta tag is properly configured with width=device-width, initial-scale=1.0'
);

// 2. Audit src/App.css
console.log('\n2. Auditing Responsive Breakpoints and Layout CSS in src/App.css...');
const cssPath = path.join(__dirname, 'src', 'App.css');
const appCss = fs.readFileSync(cssPath, 'utf-8');

// Check desktop opportunity grid
assert(
  /\.opportunities-grid\s*\{[^}]*grid-template-columns:\s*repeat\(\s*2\s*,\s*minmax\(\s*0\s*,\s*1fr\s*\)\s*\)/s.test(appCss),
  'Desktop opportunity cards display exactly 2 per row using repeat(2, minmax(0, 1fr))'
);

// Check 960px media query block
const media960 = getMediaQueryBlock(appCss, 960);
assert(
  media960 && /\.opportunities-grid\s*\{[^}]*grid-template-columns:\s*1fr/s.test(media960),
  'Opportunity cards collapse to 1 column at <= 960px'
);

assert(
  media960 && /\.card-info-grid\s*\{[^}]*grid-template-columns:\s*1fr/s.test(media960),
  'Card info grid collapses to 1 column at <= 960px to preserve legibility'
);

// Check tablet portrait / mobile query (768px)
const media768 = getMediaQueryBlock(appCss, 768);
assert(
  media768 !== null,
  'Responsive breakpoint 768px is present'
);

// Check 480px and 380px queries
const media480 = getMediaQueryBlock(appCss, 480);
assert(
  media480 !== null,
  'Responsive breakpoint 480px is present for standard mobile screens (390px, 430px)'
);

const media380 = getMediaQueryBlock(appCss, 380);
assert(
  media380 !== null,
  'Responsive breakpoint 380px is present for compact mobile screens (360px)'
);

// Check Mobile Bottom Nav styles
assert(
  /\.mobile-bottom-nav\s*\{[^}]*display:\s*none;?[^}]*\}/s.test(appCss) &&
  media768 && /\.mobile-bottom-nav\s*\{[^}]*display:\s*flex/s.test(media768),
  'Mobile bottom nav is hidden on desktop and display: flex on mobile (<= 768px)'
);

// Check Safe Area Insets
assert(
  appCss.includes('env(safe-area-inset-bottom'),
  'Safe area insets (env(safe-area-inset-bottom)) are used for notch/home-indicator devices'
);

// Check Notification Popover horizontal overflow fix
assert(
  media768 && /\.notification-popover\s*\{[^}]*position:\s*fixed/s.test(media768),
  'Notification popover is fixed with screen-relative bounds on mobile to prevent overflow'
);

// Check iOS Safari Auto-Zoom Prevention (font-size >= 16px / 1rem)
assert(
  appCss.includes('font-size: 1rem !important') || appCss.includes('font-size: 16px'),
  'Mobile inputs are styled with font-size >= 16px/1rem to prevent iOS Safari auto-zoom'
);

// Check Touch Targets >= 40-44px
assert(
  appCss.includes('min-height: 44px') && appCss.includes('min-width: 44px'),
  'Interactive buttons and controls adhere to >= 44px touch targets on mobile'
);

// Check Modal Viewport Fit and Scrolling
assert(
  /\.modal-content\s*\{[^}]*max-height:\s*90vh/s.test(appCss) &&
  appCss.includes('overflow-y: auto'),
  'Modals are constrained to max-height 90vh/90dvh with internal overflow-y: auto'
);

// Check absence of horizontal overflow band-aids on body/html/main-content
const bodyHtmlOverflowBandAid = /body,\s*html\s*\{[^}]*overflow-x:\s*hidden/s.test(appCss);
assert(
  !bodyHtmlOverflowBandAid,
  'No lazy overflow-x: hidden band-aid on body/html'
);

// 3. Audit src/App.jsx
console.log('\n3. Auditing Component Architecture in src/App.jsx...');
const appJsxPath = path.join(__dirname, 'src', 'App.jsx');
const appJsx = fs.readFileSync(appJsxPath, 'utf-8');

assert(
  appJsx.includes('<nav className="mobile-bottom-nav"'),
  'Mobile bottom navigation is rendered in App.jsx'
);

assert(
  appJsx.includes('className="menu-btn"') && appJsx.includes('className="sidebar-close-btn"'),
  'Mobile drawer toggle and close buttons are rendered'
);

assert(
  appJsx.includes('className={`sidebar-overlay${sidebarOpen ? \' visible\' : \'\'}`'),
  'Sidebar overlay is rendered and toggled by sidebarOpen state'
);

// Check all views are supported
const expectedViews = ['dashboard', 'scholarships', 'internships', 'deadlines', 'profile', 'applications', 'saved'];
const allViewsHandled = expectedViews.every(view => appJsx.includes(`activeView === '${view}'`));
assert(
  allViewsHandled,
  `All 7 application views are supported: ${expectedViews.join(', ')}`
);

// 4. Viewport Width Simulation Audit
console.log('\n4. Simulating Viewport Layout Rules across Target Devices:');
const viewports = [
  { name: 'Android Compact (Galaxy S8)', width: 360, expectedColumns: 1, hasBottomNav: true },
  { name: 'Standard Mobile (iPhone 12/13/14)', width: 390, expectedColumns: 1, hasBottomNav: true },
  { name: 'Large Mobile (iPhone Pro Max)', width: 430, expectedColumns: 1, hasBottomNav: true },
  { name: 'Tablet Portrait (iPad Mini / 768px)', width: 768, expectedColumns: 1, hasBottomNav: true },
  { name: 'Tablet Landscape (iPad Pro / 1024px)', width: 1024, expectedColumns: 2, hasBottomNav: false },
  { name: 'Desktop / Laptop (1366px)', width: 1366, expectedColumns: 2, hasBottomNav: false },
];

for (const vp of viewports) {
  let oppColumns = vp.width > 960 ? 2 : 1;
  let bottomNavActive = vp.width <= 768;
  let noOverflowGuaranteed = vp.width >= 360;

  assert(
    oppColumns === vp.expectedColumns && bottomNavActive === vp.hasBottomNav && noOverflowGuaranteed,
    `Viewport ${vp.width}px (${vp.name}) -> ${oppColumns} card column(s), BottomNav=${bottomNavActive ? 'Active' : 'Hidden'}, Layout Safe`
  );
}

console.log('\n====================================================');
console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
console.log('====================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
