# Financial Tracker

A full-stack personal finance tracker built with React, Node.js/Express, and MongoDB. Track income and expenses, upload bank statements, and visualize spending with interactive charts.

## Tech Stack

- **Frontend:** React 19, TypeScript, MUI v7, Recharts, React Router v7
- **Backend:** Node.js, Express 5, MongoDB/Mongoose, JWT authentication
- **Infrastructure:** Docker Compose, Nginx (production)

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Docker)

### Run with Docker Compose
```bash
docker-compose up
```

### Run locally

**Backend:**
```bash
cd backend
npm install
# Edit .env: set MONGODB_URI and JWT_SECRET
npm start
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- JWT-based authentication
- Income and expense tracking with categories
- CSV and Excel bank statement import
- Interactive charts (Recharts)
- Responsive Material UI design

## License

MIT — see [LICENSE](LICENSE)
