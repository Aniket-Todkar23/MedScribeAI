const jwt = require('jsonwebtoken');

const SECRET  = process.env.JWT_SECRET;
const EXPIRES = process.env.JWT_EXPIRES_IN || '24h';

if (!SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}

/**
 * Sign a JWT.
 * @param {object} payload
 * @param {string} [expiresIn] – override default expiry (e.g. '15m')
 * @returns {string} signed token
 */
const signToken = (payload, expiresIn) =>
  jwt.sign(payload, SECRET, { expiresIn: expiresIn || EXPIRES });

/**
 * Verify and decode a JWT.
 * Throws if invalid or expired.
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyToken = (token) => jwt.verify(token, SECRET);

module.exports = { signToken, verifyToken };
