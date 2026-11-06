const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

module.exports = {
  // Call after express.json() so the body is parsed before it is sanitized.
  setupSecurity: (app) => {
    // Helmet for security headers
    app.use(helmet());

    // MongoDB query sanitization. The package's middleware reassigns
    // req.query, which is a getter in Express 5 and throws, so strip
    // operator keys from the body in place instead. Express 5's default
    // query parser never builds nested objects.
    app.use((req, res, next) => {
      if (req.body) mongoSanitize.sanitize(req.body);
      next();
    });

    // Rate limiting: 100 requests per 15 minutes per IP, and 5 failed
    // auth attempts per 15 minutes per IP.
    app.use('/api/', rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP',
    }));
    app.use('/api/auth/', rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      skipSuccessfulRequests: true,
    }));
  },
};
