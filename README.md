# financial-tracker-fullstack

Full-stack personal finance app. React 19 + Material UI frontend, Node.js + Express 5 + MongoDB backend, JWT auth, Docker Compose for one-command bring-up.

Live demo: https://financial-tracker-web.onrender.com (Render free tier, sleeps after 15 minutes of idle, first hit takes ~30 seconds to wake)

API: https://financial-tracker-api.onrender.com

## Deploy

`render.yaml` defines a Render Blueprint with two services: the Node API and the static React build. One-click deploy:

1. Fork or clone this repo.
2. In Render, click New, Blueprint, point at the fork.
3. Render reads `render.yaml`, creates both services. `JWT_SECRET` auto-generates.
4. Provision a free MongoDB cluster on MongoDB Atlas (M0 tier). Paste the SRV connection string into the Render API service as `MONGODB_URI`.
5. Set `REACT_APP_API_URL` on the web service to the API URL Render assigned.

The GitHub Actions workflow at `.github/workflows/render-deploy.yml` triggers Render deploy hooks on push to main, if you set the `RENDER_API_DEPLOY_HOOK` and `RENDER_WEB_DEPLOY_HOOK` repo secrets. Without those secrets the workflow runs and exits cleanly.

## Hero numbers

| Metric | Value |
|---|---|
| Stack layers | 3 (React 19 frontend, Express 5 API, MongoDB) |
| Backend models | 5 (User, Account, Transaction, Borrowing, WorkSchedule) |
| API route groups | 5 matching the models above |
| Frontend pages | 7 React components (Dashboard, Accounts, Transactions, Borrowings, WorkSchedule, Login, Navigation) |
| Auth | JWT with bcrypt password hashing |
| Container | Dockerfile per service plus a docker-compose orchestrator |

## What ships

| Module | Backend route | Frontend page |
|---|---|---|
| Accounts | `routes/accounts.js` | `components/Accounts.jsx` |
| Transactions | `routes/transactions.js` | `components/Transactions.jsx` |
| Borrowings | `routes/borrowings.js` | `components/Borrowings.jsx` |
| Work schedule | `routes/workSchedule.js` | `components/WorkSchedule.jsx` |
| Auth | `routes/auth.js` plus `middleware/` | `components/Login.jsx` |
| Dashboard | aggregated across routes | `components/Dashboard.jsx` with Recharts |

The borrowings model handles money you owe and money owed to you. The work schedule model captures shift income so the dashboard predicts cash inflow alongside actuals.

## Stack

Frontend: React 19, JSX, Material UI v7, Recharts, React Router v7, axios.

Backend: Node.js 18+, Express 5, Mongoose, MongoDB, jsonwebtoken, bcryptjs.

Infrastructure: Docker Compose (mongo, backend, frontend), Dockerfile per service, nginx in front of the build for production.

## Run with Docker Compose

```
docker-compose up
```

The compose file brings up MongoDB, the API on port 5000, and the React dev server on port 3000.

## Run locally

Backend:

```
cd backend
npm install
cp .env.example .env       # set MONGODB_URI and JWT_SECRET
npm start
```

Frontend:

```
cd frontend
npm install
npm start
```

App at http://localhost:3000.

## Repository layout

```
financial-tracker-fullstack/
  backend/
    server.js              Express app, route mount, JWT middleware
    models/                User, Account, Transaction, Borrowing, WorkSchedule
    routes/                One file per resource
    middleware/            Auth check, error handler
    utils/                 Helpers
    Dockerfile
  frontend/
    src/
      App.jsx              Router and protected-route wrapper
      components/          Dashboard, Accounts, Transactions, Borrowings, WorkSchedule, Login, Navigation
      services/api.js      axios client with token injection
    setupTests.js, App.test.js  CRA test scaffolding
  docker-compose.yml
  scripts/                 Dev and seed helpers
```

## Auth flow

1. Frontend posts credentials to `POST /api/auth/login`.
2. Backend verifies the bcrypt hash and returns a signed JWT.
3. The axios client in `services/api.js` injects `Authorization: Bearer <jwt>` on every request.
4. The Express middleware in `backend/middleware/` rejects unauthenticated requests.

## License

MIT, see `LICENSE`.
