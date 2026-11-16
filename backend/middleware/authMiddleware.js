const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Read token from cookie
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required. No token provided.' });
    }

    // Verify token (using 'secretkey' as requested)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    req.user = decoded; // Attach user info to request
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

module.exports = authMiddleware;
