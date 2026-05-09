const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

// Auth rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
});

module.exports = {
  setupSecurity: (app) => {
    // Helmet for security headers
    app.use(helmet());
    
    // MongoDB query sanitization
    app.use(mongoSanitize());
    
    // Apply rate limiting
    app.use('/api/', limiter);
    app.use('/api/auth/', authLimiter);
  },
};