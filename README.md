# Sahay — Verified Opportunities & Profile Matching Portal

Sahay connects students across India with genuine, live-ingested scholarships and internships from official government authorities, including the **National Scholarship Portal (NSP)** and the **AICTE Internship Enterprise Portal**.

---

## Key Features & Architectural Enhancements

### 1. Verified Official Application Redirects
- **Zero PDF Redirects**: The application button strictly redirects to verified web portals or official scheme portals. It never treats a PDF notice as an application destination.
- **Dedicated vs. Central Portals**: Schemes with dedicated application websites (e.g. AICTE-JK PMSSS at `aicte-jk-scholarship-gov.in`, Ministry of Tribal Affairs Fellowship at `fellowship.tribal.gov.in`) route directly to their specific portals. Central schemes are routed to the NSP One-Time Registration (OTR) student portal (`scholarships.gov.in/otrapplication/#/login-page`).
- **Explicit Supporting Documents**: If official scheme guidelines or notices (PDF) are published, they are displayed as a dedicated supporting document action ("View Official Guidelines / Notice (PDF)") rather than hijacking the Apply flow.
- **Graceful Fallbacks**: Opportunities with no direct student application portal (e.g., institutional nomination schemes) provide a "Visit Official Scholarship Website" action with verified ministry URLs.
- **Audit Documentation**: Detailed scheme-by-scheme verification records are cataloged in [`docs/url-fix-report.md`](docs/url-fix-report.md).

### 2. Defensible Profile Matching & Ranking Engine
- **Transparent Formula**: Matches are calculated from student qualifications, skills, target roles, preferred work mode, domicile state, academic marks/CGPA, and social/welfare category against verified listing criteria.
- **Never Hides Unmatched Opportunities**: Every active opportunity remains accessible in the full catalog. Opportunities with the closest known criteria rank higher by default.
- **Standardized Match Labels**:
  - `Strong match` (80–100%)
  - `Good match` (68–79%)
  - `Potential match` (50–67%)
  - `Some requirements missing` (35–49%)
  - `Not enough information` (Insufficient data)
  - `Does not meet known mandatory criteria` (Degree, level, or mandatory category restriction mismatch)
- **Clear Explanations**: Every card and details modal provides a transparent one-sentence explanation of why the opportunity was ranked where it was, along with key alignment highlights and criteria to verify.
- **Sorting Flexibility**: Default sort is **Best Match (Recommended)** (`match-desc`), with instant sorting by **Deadline: Soonest first** (`deadline-asc`), **Deadline: Latest first** (`deadline-desc`), and **Title: A–Z** (`title-asc`).

### 3. Redesigned Opportunity Cards
- **Visual Distinction**: Coordinated visual accents for Scholarships (violet/purple theme with `GraduationCap`) and Internships (teal/emerald theme with `Briefcase`).
- **Clear Hierarchy**:
  - Header: Opportunity type, Source authority pill, Verification badge, Location/Mode pill, and Save/Bookmark button.
  - Organization row: Dedicated `OrgLogo` component with graceful authority icon fallbacks.
  - Prominent Match Banner: Displays match label, percentage, and transparent alignment rationale.
  - Structured Metadata Panel: Compact rows for Award/Stipend, Degree requirements, Work mode/duration, and Skill tags.
  - Footer: Clear deadline urgency tags (`Closing soon`, `Rolling admissions`) and dual action buttons (**Details** and **Apply**).

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas connection string in `server/.env`

### Installation
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Running the Application
```bash
# Start backend server (port 5000)
cd server
npm start

# Start frontend development server (port 5173) in a new terminal
npm run dev
```

### Testing & Verification
```bash
# Run unit matching tests
node test-matching.mjs

# Run backend ingestion & API integration test suite
node server/verify-integration.mjs

# Run code linter
npm run lint

# Run production build
npm run build
```
