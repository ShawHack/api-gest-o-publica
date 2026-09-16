// Registered after API routes and before the generic web SPA fallback.
module.exports = function apiNotFound(req, res, next) {
  if (req.get('X-SEMIT-API-Request') === '1' || /^\/api(?:\/|$)/.test(req.path)) {
    return res.status(404).json({ message: 'Endpoint não encontrado.', code: 'NOT_FOUND' });
  }
  return next();
};
