const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // maxAge is checked against iat, so tokens issued before they carried
    // exp expire too, without rotating JWT_SECRET.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], maxAge: '12h' });
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};