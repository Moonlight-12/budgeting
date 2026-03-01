# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
cd backend
node server.js          # production
npx nodemon server.js   # development with hot-reload
```

### Frontend
```bash
cd frontend
npm run dev             # development server (port 3000)
npm run build           # production build
npm run lint            # ESLint
```

No test suite exists in either project yet.

## Architecture

### Overview
A personal budgeting app connected to the **Up Bank API** (Australian neobank). The backend is a Node.js/Express REST API; the frontend is a Next.js App Router app. They run as separate processes.

### Backend (`/backend`)
- **Express v5** server, all routes mounted at `/api/v1`
- **MongoDB/Mongoose** for persistence
- **JWT auth** stored in httpOnly cookies: `accessToken` (short-lived) and `refreshToken` (long-lived)
- Auth middleware (`middleware/auth.js`) reads `req.cookies.accessToken` → attaches `req.user.userId`
- Returns `401` for missing token, `403` for invalid/expired

Route modules registered in `config/routes.js`:
- `/api/v1/auth` — signin, signout, refresh
- `/api/v1/transactions` — sync from Up API, query by period
- `/api/v1/categories` — user-defined categories with budgets
- `/api/v1/budget` — monthly spending target
- `/api/v1/users` — user management

### Frontend (`/frontend`)
- **Next.js 15 App Router**, TypeScript
- **Tailwind CSS v4** (no `tailwind.config.ts` — configured in `globals.css` via `@theme`)
- **HeroUI** for component primitives (`@heroui/*`)
- **Recharts** installed for data visualization
- **Shadcn/ui** pattern for form components (in `src/components/ui/`)
- Path alias: `@/` maps to repo root (e.g. `@/src/components/...`)

### Frontend Proxy Pattern (Critical)
The frontend **never calls the backend directly from the browser**. All backend calls go through Next.js API route handlers in `src/app/api/`. These proxy routes:
1. Forward the request to `process.env.BACKEND_URL`
2. Pass cookies manually (`Cookie: accessToken=...`)
3. On `403`, auto-refresh via `POST /api/v1/auth/refresh` with `refreshToken`
4. Retry the original request with the new token and forward the new `set-cookie` headers back to the browser

Every new backend endpoint needs a corresponding Next.js API route using this pattern.

### Data Model Notes
- **Transaction**: pulled from Up Bank API. `transactionDate` (Up's `createdAt`) can be `null` for some transfers — always use `$or: [{ transactionDate: ... }, { transactionDate: null, settleDate: ... }]` when querying by date.
- **Category**: has `categoryId` (string slug), `upCategories` (array of Up Bank category strings that map to this category), and a per-category `budget`.
- Mongoose aggregation `$match` does **not** auto-cast strings to ObjectId — always use `new mongoose.Types.ObjectId(req.user.userId)` in aggregation pipelines.

### Budget Period
The app uses a **15th-to-14th billing cycle** (not calendar month). The `getBudgetPeriod(utcOffset)` helper in `backend/routes/transaction.js` handles this. The browser passes `new Date().getTimezoneOffset()` as `utcOffset` to all date-sensitive endpoints.

### Up Bank Sync
`POST /api/v1/transactions/sync` fetches from `https://api.up.com.au/api/v1/transactions` using `UP_API_KEY`. It is incremental (uses `filter[since]` based on the newest stored transaction) and paginates via `data.links.next`.

### Environment Variables
- **Backend** (`.env`): `MONGODB_URI`, `JWT_SECRET`, `UP_API_KEY`, `FRONTEND_URL`, `PORT`
- **Frontend** (`.env.local`): `BACKEND_URL`
