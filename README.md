# Budgeting App

A personal budgeting app for tracking spending, managing categories, and setting budgets. Supports automatic sync via the **Up Bank API**, CSV import from your bank, or fully manual transaction entry.

**Live app:** https://budgeting-up.vercel.app

---

## Screenshots

### Dashboard
DESKTOP
<img width="2560" height="354" alt="Screenshot 2026-04-20 at 10 18 57 pm" src="https://github.com/user-attachments/assets/aecdeca0-fe79-458b-89fd-a686e943b6bc" />

MOBILE
<img width="329" height="527" alt="Screenshot 2026-04-20 at 10 19 05 pm" src="https://github.com/user-attachments/assets/3cc13dc7-580f-49fe-a952-1afabcda842f" />

### Categories & Budget Tracking
DESKTOP
<img width="2084" height="1100" alt="Screenshot 2026-04-20 at 10 19 34 pm" src="https://github.com/user-attachments/assets/ae8feb37-db33-4204-bd0d-87b71e1a262b" />

MOBILE
<img width="325" height="648" alt="Screenshot 2026-04-20 at 10 19 27 pm" src="https://github.com/user-attachments/assets/f4569143-a272-4e02-b668-68230ef1175d" />

### Transaction Management
DESKTOP
<img width="469" height="444" alt="Screenshot 2026-04-20 at 10 19 59 pm" src="https://github.com/user-attachments/assets/4db72e18-e339-4c0b-b2df-d8e9ef272f66" />

MOBILE
<img width="434" height="930" alt="Screenshot 2026-04-20 at 10 20 17 pm" src="https://github.com/user-attachments/assets/df453e08-2a48-46e6-8551-5c6244bc8a7f" />

### Sign In
DESKTOP
<img width="2097" height="1328" alt="Screenshot 2026-04-20 at 10 20 38 pm" src="https://github.com/user-attachments/assets/839591d2-b027-4a2f-b4a7-6aeda1bf28d6" />

MOBILE
<img width="430" height="934" alt="Screenshot 2026-04-20 at 10 20 33 pm" src="https://github.com/user-attachments/assets/37df9f80-f1e1-4d19-8e00-aa2fb7a3ec3b" />

---

## Features

- **Up Bank Sync** *(optional)* — Automatically sync transactions from your Up Bank spending account on every login; requires a Personal Access Token saved in Profile
- **CSV Import** — Import transactions from any bank CSV export (CommBank, Westpac, ANZ, NAB); auto-detects columns and date formats; duplicates are automatically skipped
- **Category Tracking** — Spending breakdown by category with budget vs actual comparison across billing periods
- **Manual Transactions** — Add transactions manually (income or expense) with IDR or AUD currency support
- **Budget Management** — Set a monthly spending target, track progress with a visual gauge
- **Savings Allocation** — Save remaining budget and allocate it to specific categories
- **Multi-currency** — IDR and AUD supported; IDR input uses thousands (type `50` → `Rp50.000`); toggle display currency in Profile settings (1 AUD = 11,000 IDR); all amounts — budget wheel, categories, transactions, summary cards — convert automatically
- **Transaction History** — Search and filter transactions by month
- **Delete Transactions** — Remove any transaction from the detail view
- **Google OAuth** — Sign in with Google or link your Google account
- **Password Reset** — OTP-based password reset via email
- **Profile Management** — Change username, link email, manage your Up Bank token, toggle display currency

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
- Google OAuth credentials (optional)
- Gmail App Password (optional, for password reset emails)
- [Up Bank](https://up.com.au) Personal Access Token (optional — required only for auto-sync)

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
ENCRYPTION_KEY=<random-32-byte-hex>   # generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
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

> **Note:** `ENCRYPTION_KEY` is used to encrypt each user's Up Bank API token at rest in MongoDB. Keep it separate from `JWT_SECRET`. If you lose this key, stored tokens cannot be decrypted and users will need to re-enter their Up Bank token.

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
| POST | `/api/v1/auth/signup` | Register |
| POST | `/api/v1/auth/signin` | Sign in |
| POST | `/api/v1/auth/google` | Google OAuth |
| POST | `/api/v1/auth/forgot-password` | Send reset OTP |
| POST | `/api/v1/auth/reset-password` | Reset password |
| POST | `/api/v1/transactions/sync` | Sync from Up Bank (auto-runs on login) |
| POST | `/api/v1/transactions/manual` | Add manual transaction (IDR or AUD) |
| POST | `/api/v1/transactions/import-csv` | Import CommBank CSV export |
| DELETE | `/api/v1/transactions/:id` | Delete a transaction |
| GET | `/api/v1/transactions/all` | Get all transactions |
| GET | `/api/v1/transactions/categories-summary` | Spending by category |
| GET | `/api/v1/categories` | Get categories |
| PUT | `/api/v1/categories/:id` | Update category/budget |
| GET | `/api/v1/budget` | Get monthly budget target |
| PUT | `/api/v1/budget` | Set monthly budget target |
| GET | `/api/v1/users/profile` | Get user profile |
| PUT | `/api/v1/users/up-token` | Save Up Bank token (stored AES-256-GCM encrypted) |
| PUT | `/api/v1/users/preference` | Update display currency (AUD/IDR) |

---

## Deployment

Both frontend and backend are deployed separately on Vercel.

1. Push to `main` — Vercel auto-deploys
2. Set environment variables in each Vercel project's **Settings → Environment Variables**
3. Set **MongoDB Atlas Network Access** to allow `0.0.0.0/0` for Vercel's dynamic IPs
4. Add your Vercel frontend URL to **Google Cloud Console → Authorized JavaScript origins**
5. Users who want Up Bank auto-sync must save their Personal Access Token via **Profile → Up Bank Token**; all other features (manual entry, CSV import) work without it

### Security notes

- Up Bank API tokens are encrypted at rest using AES-256-GCM with `ENCRYPTION_KEY` — never stored in plaintext
- Passwords are hashed with bcrypt (10 rounds)
- OTPs use `crypto.randomInt()` (CSPRNG)
- JWT access tokens expire in 15 minutes; refresh tokens in 7 days
- All auth tokens stored in `httpOnly`, `sameSite: strict` cookies
