# How to install this project on a new Windows PC

You do **not** need to copy `node_modules` from someone else’s computer. Those folders are large and machine-specific. She downloads this repo, then either:

- double-clicks **`setup.bat`**, or
- follows the manual steps below.

`setup.bat` installs Node.js (if missing), downloads all project packages, creates `backend/.env`, and sets up the database.

---

## What she needs

| Software | Why | Download if the installer cannot add it |
|---|---|---|
| **Windows 10 or 11** | This guide is for Windows | — |
| **Internet** | To download Node packages | — |
| **Node.js 18 or newer** (LTS) | Runs the API and the website | https://nodejs.org/en/download |
| **PostgreSQL 14+** | The database | https://www.postgresql.org/download/windows/ |

During the PostgreSQL installer, it will ask for a **postgres password**. Write that password down. `setup.bat` will ask for it.

Optional: **Git** — only if she prefers `git clone` instead of downloading a ZIP.  
https://git-scm.com/download/win

---

## Fast path (recommended)

### 1. Get the project onto her PC

On GitHub: **Code → Download ZIP**, then unzip the folder.  
Or clone:

```powershell
git clone https://github.com/punkkid0/payment-verification-clearance-system.git
```

### 2. Double-click `setup.bat`

It will:

1. Install **Node.js LTS** with Windows Package Manager if Node is not already there  
2. Run `npm install` in `backend` and `frontend` (this is how she gets all dependencies)  
3. Create `backend/.env`  
4. Ask for the **PostgreSQL password**  
5. Create the database and demo accounts  

If Node was just installed, close the window and **double-click `setup.bat` one more time** so Windows picks up the new PATH.

If PostgreSQL is not installed, the script opens the download page. Install it, remember the password, then run `setup.bat` again.

### 3. Double-click `start.bat`

Two windows open:

- Backend API — http://localhost:5000  
- Website — http://localhost:3000  
- Swagger (try the API) — http://localhost:5000/api-docs  

Leave both windows open. In the browser go to **http://localhost:3000**.

### 4. Log in

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Student | `student1` | `student123` |

Student demo RRR: `RRR-STUDENT1-001234567890` · amount `75600`

Change these passwords after first login.

---

## What `setup.bat` is installing

These come from the internet via `npm` (listed in `backend/package.json` and `frontend/package.json`):

- **Backend:** Express, PostgreSQL driver, JWT, Joi, Multer, Nodemailer, PDFKit, Swagger  
- **Frontend:** React, React Router, Axios  

They land in:

- `backend/node_modules/`
- `frontend/node_modules/`

Do not commit those folders. Anyone else runs `setup.bat` (or `npm install`) on their own PC.

---

## Manual install (if she does not want the `.bat`)

1. Install Node.js LTS from https://nodejs.org  
2. Install PostgreSQL and set a postgres user password  
3. Open PowerShell in the project folder:

```powershell
cd backend
copy .env.example .env
notepad .env
```

Set `DB_PASSWORD` to the PostgreSQL password and put a long random string in `JWT_SECRET`. Save.

```powershell
npm install
cd ..\frontend
npm install
cd ..
node setup-database.js
```

Then start the app:

```powershell
cd backend
npm run dev
```

In a second window:

```powershell
cd frontend
npm start
```

---

## If something fails

| Message | What to do |
|---|---|
| `node` is not recognized | Install Node.js LTS, then close the window and run `setup.bat` again |
| `npm install` errors | Check internet. Delete `backend\node_modules` and `frontend\node_modules`, then run `setup.bat` again |
| Database password error | The password in `backend/.env` must match the postgres password from the PostgreSQL installer |
| `ECONNREFUSED` | PostgreSQL is not running. Open Services and start `postgresql-x64-18` (name may vary) |
| Port 3000 or 5000 in use | Close the other program using that port, or change `PORT` in `backend/.env` |

---

## After install — useful links on her PC

| What | URL |
|---|---|
| App | http://localhost:3000 |
| API | http://localhost:5000/api |
| Health check | http://localhost:5000/api/health |
| Swagger | http://localhost:5000/api-docs |

To stop the app, close the two black windows that `start.bat` opened.
