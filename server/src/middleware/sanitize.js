/**
 * NoSQL Injection Sanitizer
 * OWASP A03 — Injection
 *
 * MongoDB is vulnerable to operator injection — an attacker can send
 * { "teamSlug": { "$gt": "" } } to bypass authentication.
 * This middleware strips any keys starting with $ from request bodies.
 */

const sanitizeValue = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value !== null && typeof value === 'object') return sanitizeObject(value);
  return value;
};

const sanitizeObject = (obj) => {
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$')) continue; // strip MongoDB operators
    clean[key] = sanitizeValue(obj[key]);
  }
  return clean;
};

const sanitize = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

module.exports = sanitize;
