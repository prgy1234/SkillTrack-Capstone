# Learning Progress Tracker

## Run locally (Windows PowerShell)

Open two VS Code terminals.

### 1. Backend
```powershell
cd backend
npm.cmd ci
npm.cmd run dev
```
Backend health check: http://localhost:3001/api/v1/health

### 2. Frontend
```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```
Open: http://localhost:5173

The frontend uses Vite's `/api` proxy in development, so local sign-in requests reach the local backend.

## Demo accounts
The backend seed script defines these demo accounts:
- Coordinator: `coordinator@tracker.local` / `Coord!n@t0r1`
- Learner: `jordan.lee@example.com` / `Candidate1!`
- Learner: `morgan.chen@example.com` / `Candidate2!`
- Learner: `casey.rivera@example.com` / `Candidate3!`

If the database has not been seeded, run this once from `backend`:
```powershell
npm.cmd run seed
```

## Notes
- The landing page is public. After sign-in, Coordinators go to their dashboard and Learners go to their training dashboard.
- The original role-based routes and application pages are retained.
- Local session cookies use HTTP-compatible settings. Production uses secure cookies.
- `backend/.env` is a local-development file only. Replace its session secret and coordinator password before any deployment.
- For production frontend builds, the Render API URL is configured in `frontend/.env.production`. Change it if your backend URL changes.
- This package does not include `node_modules`; run `npm.cmd ci` in both folders.

## Recent dashboard and access improvements

- The coordinator dashboard now reports learner totals, activity totals, completed and pending assignments, overall completion, and per-learner progress.
- Coordinator reporting supports filters by learner and activity. Coordinators can view all learners in this version; coordinator-to-learner assignment scoping is not modelled in the current database.
- Learners can self-register from **Sign up** with their name, email, cohort/programme, and password. Their name and cohort are saved against their candidate account and shown after sign-in.
- Learners see their assigned activities, current status, and completion percentage. They can change their own password while signed in.
- Coordinators can reset a candidate password or delete a candidate. Deleting a candidate also deletes their assignments and account.
- Passwords are stored as password hashes, never as readable text. A coordinator-issued temporary password is displayed once after reset and expires after 24 hours; share it securely with the candidate.
- Backend authorization remains enforced: learner-management/reporting endpoints require a coordinator session, while candidate assignment reads and updates are restricted to the signed-in candidate's own learner record.
