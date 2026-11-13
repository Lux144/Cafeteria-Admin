const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cafeteria-super-secret-key-2026';

function generateToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

// Express middleware to verify token (used at gateway or internal services)
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  req.user = decoded;
  next();
}

// Optional auth (populates req.user if token present)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    req.user = verifyToken(token);
  }
  next();
}

// Role authorization guard
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // If upstream gateway already validated and injected header:
    const userRole = (req.user && req.user.role) || req.headers['x-user-role'];

    if (!userRole) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!allowedRoles.includes(userRole) && userRole !== 'admin') {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

module.exports = {
  JWT_SECRET,
  generateToken,
  verifyToken,
  requireAuth,
  optionalAuth,
  requireRole
};
