# Budgeting App

A personal budgeting app connected to the **Up Bank API** (Australian neobank). Sync your transactions automatically, track spending by category, set budgets, and manage your finances — all in one place.

**Live app:** https://budgeting-up.vercel.app

---

## Screenshots

### Dashboard
<!-- Replace with actual GIF -->
![Dashboard](docs/dashboard.gif)

### Categories & Budget Tracking
<!-- Replace with actual GIF -->
![Categories](docs/categories.gif)

### Transaction Management
<!-- Replace with actual GIF -->
![Transactions](docs/transactions.gif)

### Sign In
<!-- Replace with actual GIF -->
![Sign In](docs/signin.gif)

---

## Features

- **Up Bank Sync** — Automatically sync transactions from your Up Bank spending account on every login
- **Category Tracking** — Spending breakdown by category with budget vs actual comparison across billing periods
- **Manual Transactions** — Add transactions manually (income or expense)
- **Budget Management** — Set a monthly spending target, track progress with a visual gauge
- **Savings Allocation** — Save remaining budget and allocate it to specific categories
- **Transaction History** — Search and filter transactions by month
- **Google OAuth** — Sign in with Google or link your Google account
- **Password Reset** — OTP-based password reset via email
- **Profile Management** — Change username, link email, manage your Up Bank token

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| UI Components | HeroUI, Shadcn/ui |
| Charts | Recharts |
| Backend | Node.js + Express v5 |
| Database | MongoDB + Mongoose |
| Auth | JWT (httpOnly cookies) + Google OAuth |
| Email | Nodemailer (Gmail SMTP) |
| Deployment | Vercel (frontend + backend) |

---

## Architecture

The frontend **never calls the backend directly from the browser**. All requests go through Next.js API route handlers which:
1. Forward the request to the backend with cookies
2. Auto-refresh expired access tokens on 403
3. Retry the original request with new tokens

```
Browser → Next.js API Routes (/api/*) → Express Backend → MongoDB
```

The app uses a **15th-to-14th billing cycle** to match Up Bank's billing period.

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://cloud.mongodb.com))
- [Up Bank](https://up.com.au) account + Personal Access Token
- Google OAuth credentials (optional)
- Gmail App Password (optional, for password reset emails)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your values
node server.js          # or: npx nodemon server.js
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

### Backend (`backend/.env`)

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/budgeting
JWT_SECRET=<random-secret>
REFRESH_SECRET=<random-secret>
FRONTEND_URL=http://localhost:3000
PORT=5001
GOOGLE_CLIENT_ID=<google-oauth-client-id>

# SMTP — for OTP password reset emails (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=you@gmail.com
SMTP_PASS=<gmail-app-password>
SMTP_FROM=you@gmail.com
```

### Frontend (`frontend/.env.local`)

```env
BACKEND_URL=http://localhost:5001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google-oauth-client-id>
```

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/signup` | Register |
| POST | `/api/v1/auth/signin` | Sign in |
| POST | `/api/v1/auth/google` | Google OAuth |
| POST | `/api/v1/auth/forgot-password` | Send reset OTP |
| POST | `/api/v1/auth/reset-password` | Reset password |
| POST | `/api/v1/transactions/sync` | Sync from Up Bank |
| POST | `/api/v1/transactions/manual` | Add manual transaction |
| GET | `/api/v1/transactions/all` | Get all transactions |
| GET | `/api/v1/transactions/categories-summary` | Spending by category |
| GET | `/api/v1/categories` | Get categories |
| PUT | `/api/v1/categories/:id` | Update category/budget |
| GET | `/api/v1/budget` | Get monthly budget target |
| PUT | `/api/v1/budget` | Set monthly budget target |
| GET | `/api/v1/users/profile` | Get user profile |
| PUT | `/api/v1/users/up-token` | Save Up Bank token |

---

## Deployment

Both frontend and backend are deployed separately on Vercel.

1. Push to `main` — Vercel auto-deploys
2. Set environment variables in each Vercel project's **Settings → Environment Variables**
3. Set **MongoDB Atlas Network Access** to allow `0.0.0.0/0` for Vercel's dynamic IPs
4. Add your Vercel frontend URL to **Google Cloud Console → Authorized JavaScript origins**
