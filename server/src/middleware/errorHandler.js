/**
 * 404 handler — must be placed after all routes.
 */
const notFound = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

/**
 * Global error handler — must have 4 params for Express to recognise it.
 * Never expose stack traces in production (OWASP A05).
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({ error: 'Validation failed', details: messages });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: `${field} already exists.` });
  }

  // JWT errors (handled in middleware but just in case)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token.' });
  }

  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    error: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
