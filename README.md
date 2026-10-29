# Sahay — Student Scholarship & Internship Platform

**Discover opportunities. Understand your eligibility. Take the next step.**

Sahay is a full-stack web application designed to help students discover scholarships and internships, explore eligibility information, and manage opportunities relevant to their academic and career goals.

<p align="center">
  <a href="https://sahay-student-opportunities.vercel.app/"><strong>🌐 Live Demo</strong></a>
  &nbsp;•&nbsp;
  <a href="https://github.com/Darshan-Magadum/sahay-student-opportunities"><strong>📂 GitHub Repository</strong></a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Opportunity Matching](#opportunity-matching)
- [Official Application Links](#official-application-links)
- [Technology Stack](#technology-stack)
- [Application Architecture](#application-architecture)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Running Locally](#running-locally)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Notes](#security-notes)
- [Future Improvements](#future-improvements)

## Overview

Students often need to search multiple websites to find scholarships and internships that fit their qualifications, skills, and career interests.

Sahay aims to simplify this process by bringing opportunities into one interface and helping students compare them against their profiles.

The project combines a React frontend, a Node.js and Express backend, and MongoDB Atlas for persistent data storage.

## Features

### Opportunity Discovery

- Browse scholarship and internship listings.
- Search and filter opportunities.
- View information such as deadlines, eligibility, location, organization, award amount, or stipend when available.
- Access application links and supporting information where available.

### Student Profiles

- Manage profile information.
- Save opportunities for later.
- Track applications through the application's available tracking features.
- Use profile information to help identify relevant opportunities.

### Opportunity Matching

Sahay is designed to help students evaluate opportunities against relevant profile information.

Depending on the data available for a listing and the student's profile, matching criteria may include:

- Academic qualifications and marks or CGPA.
- Skills and target roles.
- Preferred work mode and location.
- Degree or education level.
- Other eligibility requirements represented in the listing.

**Important:** A match score is an indication of alignment with the information available in the application. It does not guarantee eligibility, selection, or an award. Students should always check the official scheme or employer requirements before applying.

### Opportunity Presentation

The interface distinguishes scholarships from internships and presents relevant opportunity details, eligibility information, and available actions.

The application is intended to help students compare opportunities while keeping the broader catalog accessible.

## Official Application Links

Sahay is designed to direct students to relevant application destinations and supporting information.

Where the implementation provides verified official destinations, the intended behavior is to:

- Direct students to the applicable official application portal.
- Keep supporting notices and guidelines separate from application actions.
- Provide an official information page when a direct application route is unavailable.
- Avoid presenting a PDF notice as though it were an application form.

**Verification note:** Confirm that every listed destination is current and official before describing the entire catalog as verified. Review the implementation and scheme-by-scheme audit records, including [`docs/url-fix-report.md`](docs/url-fix-report.md), if that file exists in the repository.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development and production build |
| Node.js | Backend JavaScript runtime |
| Express.js | Backend API |
| MongoDB Atlas | Cloud database |
| Git and GitHub | Version control and source code hosting |
| Vercel | Frontend deployment |
| Render | Backend deployment |

## Application Architecture

The application uses a frontend, backend API, and database architecture.

```text
Student
   |
   v
React + Vite Frontend
   |
   | HTTP requests
   v
Node.js + Express Backend
   |
   | Database operations
   v
MongoDB Atlas
```

### Request Flow

1. A student interacts with the React frontend.
2. The frontend sends HTTP requests to the Express API.
3. The backend processes the request and performs the required database operations.
4. MongoDB Atlas stores or retrieves the relevant data.
5. The backend returns a response to the frontend.
6. The frontend displays the result.

The production frontend is deployed on Vercel, and the backend is deployed on Render.

## Getting Started

### Prerequisites

Install or prepare the following:

- [Node.js](https://nodejs.org/) (use a version supported by the project dependencies; Node.js 18 or later may be suitable).
- npm, included with Node.js.
- A [MongoDB Atlas](https://www.mongodb.com/atlas) account and database connection string.

### 1. Clone the Repository

```bash
git clone https://github.com/Darshan-Magadum/sahay-student-opportunities.git
cd sahay-student-opportunities
```

### 2. Install Frontend Dependencies

From the project root:

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd server
npm install
cd ..
```

## Environment Configuration

Create a `server/.env` file for backend configuration.

```env
MONGODB_URI=your_mongodb_connection_string
FRONTEND_URL=http://localhost:5173
```

Replace `your_mongodb_connection_string` with your own MongoDB Atlas connection string.

The `FRONTEND_URL` value must match the local frontend origin configured in the application. If Vite uses a different port, update it accordingly.

The frontend uses the `VITE_API_URL` environment variable to identify the backend API base URL.

For local development, create a `.env` file in the frontend project root:

```env
VITE_API_URL=http://localhost:5000
```

For production, configure `VITE_API_URL` in the frontend deployment environment to point to the deployed backend base URL.

**Never commit real credentials, database passwords, API keys, or private environment files to GitHub.**

## Running Locally

### Start the Backend

Open a terminal in the project root and run:

```bash
cd server
npm start
```

The backend is expected to run on port `5000`, according to the current project configuration.

### Start the Frontend

Open a second terminal in the project root and run:

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal, usually:

```text
http://localhost:5173
```

If the frontend or backend uses a different port, use the actual configured port.

## Testing

The following commands are useful if the corresponding scripts and test files are present in the repository.

### Production Build

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Matching Tests

If the matching test file exists:

```bash
node test-matching.mjs
```

### Backend Integration Tests

If the integration test file exists:

```bash
node server/verify-integration.mjs
```

Check the output of each command before describing the associated tests as passing. Remove any command whose file or script does not exist.

## Deployment

### Frontend — Vercel

The frontend is deployed on Vercel.

**Live website:** https://sahay-student-opportunities.vercel.app/

### Backend — Render

The Express backend is deployed on Render.

**API endpoint:** https://sahay-student-opportunities.onrender.com/api/opportunities

The endpoint returns opportunity data from the backend. Availability and response time may vary depending on the hosting service.

### Database — MongoDB Atlas

MongoDB Atlas provides cloud database storage for the application.

The database connection is configured through the backend environment variables.

## Security Notes

- Keep database credentials and environment variables private.
- Restrict database network access to the minimum required for deployment.
- Use appropriate database-user permissions.
- Validate incoming requests on the backend.
- Keep CORS configuration limited to the intended frontend origins.
- Review application links and eligibility information periodically.

## Future Improvements

Potential areas for future development include:

- More robust opportunity ingestion and source verification.
- Expanded automated tests for matching, APIs, and user workflows.
- Improved matching explanations and eligibility checks.
- Better accessibility and mobile responsiveness.
- Monitoring, error reporting, and performance improvements.

## Author

**Darshan Magadum**

- GitHub: [Darshan-Magadum](https://github.com/Darshan-Magadum)

---

*Built to make scholarship and internship discovery easier for students.*
