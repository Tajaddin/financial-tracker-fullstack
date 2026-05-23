const path = require('path');
const fs = require('fs');  // Added for file checks
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Debug: Current directory and .env path
const envPath = path.resolve(__dirname, '.env');
console.log('Current directory:', __dirname);
console.log('Looking for .env at:', envPath);

// Check if .env file exists
if (fs.existsSync(envPath)) {
  console.log('.env file FOUND');
  // Load environment variables
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env:', result.error);
  } else {
    console.log('.env loaded successfully');
  }
} else {
  console.error('ERROR: .env file NOT FOUND at', envPath);
}

// Debug: Show loaded environment variables
console.log('Environment Variables:');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '*** loaded ***' : '!! NOT FOUND !!');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '*** loaded ***' : '!! NOT FOUND !!');

// Production guard: refuse to start in production without a real JWT_SECRET.
// The dev fallback in docker-compose.yml is a known placeholder string.
const DEV_JWT_FALLBACK = 'dev-only-change-me-in-prod';
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_JWT_FALLBACK) {
    console.error(
      'FATAL: JWT_SECRET must be set to a real value when NODE_ENV=production. ' +
      'Generate one with `openssl rand -hex 32` and set it in your platform env.'
    );
    process.exit(1);
  }
}

const app = express();

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
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/borrowings', require('./routes/borrowings'));
app.use('/api/work-schedule', require('./routes/workSchedule'));

// MongoDB connection
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.error('Skipping MongoDB connection - MONGODB_URI missing');
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});