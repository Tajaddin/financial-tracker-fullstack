const express = require('express');
const cors = require('cors');
const { setupSecurity } = require('./middleware/security');

function createApp() {
  const app = express();

  // Behind a reverse proxy (Render), set TRUST_PROXY to the number of proxy
  // hops so req.ip is the client's address; otherwise every client shares
  // one rate-limit bucket.
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

  // Middleware -- CORS is explicit-allowlist via CORS_ALLOWED_ORIGINS
  // (comma-separated). Defaults to localhost:3000 for dev so `npm run dev`
  // works without extra setup. Never leave this as the default in production
  // -- list the real frontend origin(s) in the env instead.
  const corsOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json());
  setupSecurity(app);

  // Routes
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/accounts', require('./routes/accounts'));
  app.use('/api/transactions', require('./routes/transactions'));
  app.use('/api/borrowings', require('./routes/borrowings'));
  app.use('/api/work-schedule', require('./routes/workSchedule'));

  return app;
}

module.exports = { createApp };
