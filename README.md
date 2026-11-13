# Smart City – Civic OS & Tender Checker (MERN)

A production-ready full-stack MERN platform for civic infrastructure tracking, automated defect diagnosis, municipal tender cost auditing, and public works accountability.

Powered by **MongoDB Atlas**, **Express.js**, **React (Vite + Tailwind CSS)**, **Node.js**, **Cloudinary**, and **Google Gemini AI (gemini-2.5-flash)**.

---

## Architecture & Project Structure

The project follows a clean, decoupled 2-tier architecture with separate frontend and backend directories:

```text
smart-city-mern/
├── client/          # Frontend Web Application (React, Vite, Tailwind CSS, Leaflet)
├── server/          # Backend REST API (Express, Mongoose, Gemini AI, Cloudinary)
├── .gitignore       # Git exclusion rules
└── README.md        # Documentation and deployment guide
```

---

## Key Features

1. **AI-Powered Civic Issue Diagnosis**:
   - Citizens snap a photo of an issue (e.g. pothole, broken streetlight, water leakage).
   - Gemini AI (`gemini-2.5-flash`) verifies authenticity, assigns priority (1–10), classifies severity, and auto-routes the issue to the designated municipal agency.
   - Citizen category dropdown remains interactive and selectable.

2. **Public Remediation Action Plans**:
   - Every incident features an engineering action plan formatted as a numbered checklist with **bold emphasized key actions** (e.g. **Traffic Diversion**, **Cavity Cleaning**, **Bitumen Compaction**).
   - Fully public to all stakeholders, residents, and authorities via the **"View in Details"** button on live cards.

3. **On-Demand RTI Grievance Letters**:
   - The resident who filed the report can click **"Draft Formal Letter"** to generate an official RTI-style complaint addressed to the responsible department with GPS coordinates and priority score.
   - **Privacy Protected**: Drafting and viewing the grievance letter is strictly reserved for the original author.

4. **Public Works Tender Monitor**:
   - Search and inspect municipal tenders with contract values, completion deadlines, and defect liability periods.
   - AI cost audits analyze line-item expense feasibility and rate benchmarks.
   - Citizens can file defect observations directly against active public works contracts.

5. **Live Incident Map & City Health Index**:
   - Interactive GIS map powered by Leaflet with clustering and multi-layer map views.
   - Real-time Area Health Index (0–100) computed from active vs. resolved hazards.

6. **Role-Based Access Control**:
   - `citizen`: Report issues, peer-verify community defects, vote on priority, dispute tenders.
   - `authority`: Review departmental complaints and publish new public works tenders.
   - `admin`: Moderate citizen claims, update incident statuses, and manage records.

---

## Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v20 or higher
- [MongoDB Atlas](https://www.mongodb.com/atlas) connection URI (or local MongoDB)
- [Cloudinary](https://cloudinary.com/) account (Cloud Name, API Key, API Secret)
- [Google AI Studio](https://aistudio.google.com/) Gemini API Key

---

### Step 1: Configure & Start the Backend

1. Open a terminal and navigate to `server`:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `server/.env` file (you can copy from `server/.env.example`):
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/smartcity?retryWrites=true&w=majority
   JWT_SECRET=your-secure-random-jwt-secret-at-least-32-characters
   CLIENT_ORIGIN=http://localhost:5173
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   COOKIE_SECURE=false
   TRUST_PROXY=false
   ```

4. *(Optional)* Seed sample data and test accounts:
   ```bash
   npm run seed
   ```
   *Demo accounts created:*
   - `admin@smartcity.test` (password: `Passw0rd!demo`)
   - `authority@smartcity.test` (password: `Passw0rd!demo`)
   - `citizen@smartcity.test` (password: `Passw0rd!demo`)

5. Start the backend API:
   ```bash
   npm run dev
   ```
   *The server starts listening on `http://localhost:5000`.*

---

### Step 2: Configure & Start the Frontend

1. Open a second terminal and navigate to `client`:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. *(Optional in local dev)* For local development, `client/.env` is not required because Vite automatically proxies `/api` calls to `http://localhost:5000`.

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The web app opens on `http://localhost:5173`.*

---

## Running Automated Tests

Run backend unit tests (covers issue sanitization, image verification, rate scaling, and security):
```bash
cd server
npm test
```

Test production frontend compilation:
```bash
cd client
npm run build
```

---

## Production Deployment Guide (Vercel + Render)

### Recommended Architecture:
- **Backend API ➔ Render (Web Service)**: Render keeps a persistent Node.js process alive, maintains MongoDB connection pooling, and handles direct Cloudinary file uploads without serverless cold starts or timeout limits.
- **Frontend App ➔ Vercel**: Vercel serves the static React Vite build globally over edge CDN networks with rapid response times and instant SSL.

---

### Part A: Deploy Backend on Render

1. Log in to [Render](https://dashboard.render.com/) and click **New ➔ Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name**: `smart-city-api` (or your preferred name)
   - **Region**: Choose the region closest to your MongoDB Atlas cluster (e.g. Frankfurt, Singapore, Oregon)
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. Add the following **Environment Variables** in Render's dashboard:
   | Key | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimisations |
   | `PORT` | `10000` | Render's default web port |
   | `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas connection string |
   | `JWT_SECRET` | `32+ character random string` | Secret used to sign authentication cookies |
   | `CLIENT_ORIGIN` | `https://your-app.vercel.app` | Your Vercel frontend URL (update after Part B) |
   | `CLOUDINARY_CLOUD_NAME` | `your_cloud_name` | Cloudinary Product Environment Name |
   | `CLOUDINARY_API_KEY` | `your_api_key` | Cloudinary API Key |
   | `CLOUDINARY_API_SECRET` | `your_api_secret` | Cloudinary API Secret |
   | `GEMINI_API_KEY` | `your_gemini_key` | Google Gemini API Key |
   | `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model version |
   | `COOKIE_SECURE` | `true` | Enforces HTTPS-only cookies |
   | `TRUST_PROXY` | `true` | Required behind Render's reverse proxy |

5. Click **Create Web Service**. Once deployed, Render will provide your backend URL:
   `https://smart-city-api.onrender.com`

---

### Part B: Deploy Frontend on Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New ➔ Project**.
2. Import the same GitHub repository.
3. Configure the project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Under **Environment Variables**, add:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_URL` | `https://smart-city-api.onrender.com` | Your Render backend URL (no trailing slash) |

5. Click **Deploy**. Vercel will build and launch your application at a domain like:
   `https://smart-city-mern.vercel.app`

---

### Part C: Link CORS & Cookies

1. Return to your **Render** dashboard ➔ **Environment**.
2. Update `CLIENT_ORIGIN` with your actual Vercel URL:
   ```env
   CLIENT_ORIGIN=https://smart-city-mern.vercel.app
   ```
3. Click **Save Changes**. Render will automatically redeploy with the updated CORS origin.

Your MERN application is now fully live in production!

---

## Role Promotion & CLI Helpers

To promote a registered user to `authority` or `admin`, run from the `server` directory:

```bash
cd server
npm run set-role -- user@example.com admin
```

Available roles:
- `citizen`
- `authority`
- `admin`
