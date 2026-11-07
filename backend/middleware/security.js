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

    // Rate limiting: 1000 requests per 15 minutes per IP, enough for the
    // SPA's refetch after every change, and 5 failed auth attempts per 15
    // minutes per IP. Errors are JSON so the UI can show them.
    app.use('/api/', rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      message: { error: 'Too many requests from this IP, try again later' },
    }));
    app.use('/api/auth/', rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      skipSuccessfulRequests: true,
      message: { error: 'Too many failed attempts, try again later' },
    }));
  },
};
