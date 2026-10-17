export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  // Never leak internal details (database errors, stack traces) to the client.
  if (status === 500) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  res.status(status).json({ error: err.message });
}