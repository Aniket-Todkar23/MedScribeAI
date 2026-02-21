const { verifyToken } = require('../utils/jwt');

/**
 * Protects routes requiring authentication.
 * Decodes JWT and attaches { id, email, user_type } to req.user.
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization ?? '';

  if (!authHeader.startsWith('Bearer '))
    return res.status(401).json({ message: 'Authorization token required.' });

  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token); // { id, email, user_type }
    return next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token has expired.' : 'Invalid token.';
    return res.status(401).json({ message });
  }
};

module.exports = { requireAuth };
