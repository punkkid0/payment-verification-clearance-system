# UNICROSS Payment Verification & Clearance System

School-fee clearance for the **University of Cross River State (UNICROSS)**.

Students upload a payment receipt and Remita RRR. The system checks that RRR against the official bursary ledger and the correct indigene / non-indigene fee. An admin reviews the request, then the student gets a PDF clearance certificate.

---

## Live demo (open these)

| What | URL |
|---|---|
| **App (student + admin UI)** | https://antidote-enhance-overlook.ngrok-free.dev |
| **API base URL** (Postman / tests) | https://antidote-enhance-overlook.ngrok-free.dev/api |
| **API health check** | https://antidote-enhance-overlook.ngrok-free.dev/api/health |
| **Swagger — try the API in the browser** | https://antidote-enhance-overlook.ngrok-free.dev/api-docs |

The first visit on ngrok may show a “Visit Site” warning. Click through once.

**Demo logins**

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Student | `student1` | `student123` |

Student demo RRR: `RRR-STUDENT1-001234567890` · amount `75600`

**Try Swagger**

1. Open https://antidote-enhance-overlook.ngrok-free.dev/api-docs
2. Run `POST /api/auth/login` with `{ "username": "admin", "password": "admin123" }`
3. Copy `token` from the response
4. Click **Authorize** and paste `Bearer <token>` (include the word `Bearer`)
5. Call the other endpoints

This live URL is a temporary demo tunnel. If it is down, run the project locally — the same paths work at `http://localhost:5000` (API + Swagger) and `http://localhost:3000` (app).

---

## What it does

| Who | What they can do |
|---|---|
| **Student** | Register, set profile photo, submit a receipt + RRR, track status, download the certificate |
| **Admin / bursary** | Record official school-fee payments (RRR, student, amount), review requests, approve or reject, set indigene status |

### Fees (admin-set indigene status)

- Indigene of the state: **₦75,600**
- Non-indigene: **₦81,500**

The amount on the receipt must match the student's category. The RRR must already exist on the official ledger for that student.

---

## Demo accounts (after you run the seed)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Student | `student1` | `student123` |

`student1` is seeded as an indigene. Demo RRR for that student: `RRR-STUDENT1-001234567890`.

Change these passwords after first login.

---

## How a clearance works

1. **Bursary** records the payment on **Admin → Official Ledger** (RRR, student, exact fee).
2. **Student** opens **Request Clearance**, uploads a receipt image, enters the same RRR and amount.
3. The server scores the receipt (ledger match + duplicate-image check).
4. **Admin** opens the request, sees the score, and approves or rejects (reason required).
5. On approve, a PDF certificate is generated. The student can download it in the app. Approval email includes the PDF and a 7-day download link.

---

## Project layout

```
backend/                 Express API, JWT auth, Swagger, tests
frontend/                React app (student + admin UI)
database-schema.sql      Fresh-install schema
migration-00*.sql        Incremental upgrades for existing databases
seed-admin-user.sql      Demo admin + student + sample ledger row
setup-database.js        Creates the database and applies schema + seed
render.yaml              Optional one-service Render deploy
```

---

## Run it locally

You need **Node.js 18+** and **PostgreSQL**.

### 1. Database

Easiest path (uses `backend/.env` for the Postgres password):

```powershell
cd C:\Users\HP\Desktop\payment-verification-clearance-system
copy backend\.env.example backend\.env
# Edit backend\.env — set DB_PASSWORD and a long JWT_SECRET
node setup-database.js
```

Or with `psql`:

```powershell
psql -U postgres -c "CREATE DATABASE payment_verification_db;"
psql -U postgres -d payment_verification_db -f database-schema.sql
psql -U postgres -d payment_verification_db -f seed-admin-user.sql
```

If the database already existed from an older version, also run the numbered `migration-00*.sql` files in order, then `seed-admin-user.sql`.

### 2. Backend (API)

```powershell
cd backend
npm install
npm run dev
```

- API: http://localhost:5000  
- Health: http://localhost:5000/api/health  
- **Swagger (try the API in the browser):** http://localhost:5000/api-docs  

### 3. Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm start
```

App: http://localhost:3000

---

## Environment variables

Copy `backend/.env.example` to `backend/.env`.

| Variable | Required | Purpose |
|---|---|---|
| `JWT_SECRET` | Yes | Signs login tokens. Use a long random string. |
| `DB_PASSWORD` | Yes (local) | Postgres password |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` | Local | Defaults: localhost, 5432, `payment_verification_db`, `postgres` |
| `DATABASE_URL` | Hosted | Used instead of `DB_*` on Render / Railway / Neon |
| `BASE_URL` | Recommended | Public origin, used in certificate email links |
| `CORS_ORIGINS` | If UI is on another host | Comma-separated, e.g. `http://localhost:3000` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Optional | Real email. If omitted, the API uses Ethereal (dev preview URL in the console) |

Frontend (optional) — `frontend/.env`:

| Variable | Purpose |
|---|---|
| `REACT_APP_API_URL` | API root. Default `http://localhost:5000/api`. Use `/api` when Express also serves the built React app. |

---

## API documentation (Swagger)

- **Live:** https://antidote-enhance-overlook.ngrok-free.dev/api-docs  
- **Local:** http://localhost:5000/api-docs  

API base for tests:

- **Live:** `https://antidote-enhance-overlook.ngrok-free.dev/api`  
- **Local:** `http://localhost:5000/api`

1. `POST /api/auth/login` with `{ "username": "admin", "password": "admin123" }`.
2. Copy `token` from the response.
3. Click **Authorize**, enter `Bearer <token>` (include the word Bearer).
4. Call the other endpoints.

Main routes:

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Student sign-up |
| POST | `/api/auth/login` | Public | Login (username or email) |
| GET | `/api/auth/verify` | Auth | Restore session |
| GET | `/api/students/my-info` | Student | Profile + fee |
| POST | `/api/clearances/request` | Student | Submit receipt + RRR |
| GET | `/api/clearances/my-requests` | Student | Own history |
| GET | `/api/clearances/pending` | Admin | All requests |
| PATCH | `/api/clearances/requests/:id/approve` | Admin | Approve |
| PATCH | `/api/clearances/requests/:id/reject` | Admin | Reject (reason, 5+ characters) |
| POST | `/api/ledger` | Admin | Record official RRR payment |
| GET | `/api/files/:type/:filename` | Auth | Receipt / avatar / certificate |

---

## Tests

```powershell
cd backend
npm test
```

---

## Deploy (public URL for the owner)

The app is one Node service plus PostgreSQL. In production the API also serves the React build.

### Option A — Render (recommended)

1. Push this repo to GitHub (already done if you followed the project setup).
2. In [Render](https://render.com), **New → Blueprint** and point it at this repository (`render.yaml` is included).
3. After the first deploy, open a Render **Shell** on the web service and seed the database:

```bash
psql "$DATABASE_URL" -f database-schema.sql
psql "$DATABASE_URL" -f seed-admin-user.sql
```

4. Set `BASE_URL` to the Render URL (e.g. `https://unicross-clearance.onrender.com`).
5. Send the owner that HTTPS URL, plus the demo accounts above.

Free Render services sleep after idle time; the first request after a sleep can take ~30 seconds.

### Option B — Any Node host + managed Postgres

Build the UI, then start the API:

```powershell
npm run install:all
$env:REACT_APP_API_URL="/api"
npm run build
$env:NODE_ENV="production"
$env:DATABASE_URL="postgres://..."
$env:JWT_SECRET="a-long-random-secret"
$env:BASE_URL="https://your-domain"
node backend/src/server.js
```

---

## Security notes

- Admin accounts cannot self-register. Create them with `seed-admin-user.sql` or directly in the database.
- Receipts, avatars, and certificates are **not** public files. They require a login or a short-lived signed link.
- Auth and API routes are rate-limited. Write endpoints are validated with Joi.
- Never commit `backend/.env` or database passwords.

---

## Owner walkthrough (10 minutes)

1. Open the app URL (or `http://localhost:3000`).
2. Log in as **admin** / **admin123**.
3. Go to **Official Ledger** and confirm the demo RRR for `student1` (or record a new one).
4. Log out. Log in as **student1** / **student123**.
5. **Request Clearance** → upload any image → amount `75600` → RRR `RRR-STUDENT1-001234567890` → submit.
6. Log back in as admin, open the request, approve it.
7. As the student, download the certificate from the request history.
