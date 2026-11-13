const express = require('express');
const cors = require('cors');
const { createLogger } = require('../../shared/logger');
const { requireAuth, requireRole } = require('../../shared/auth-guard');
const authController = require('./auth.controller');
const { seedUsers } = require('./seed');

const logger = createLogger('AuthService');
const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());

// Correlation ID logger middleware
app.use((req, res, next) => {
  const cid = req.headers['x-correlation-id'] || '-';
  logger.info(`${req.method} ${req.originalUrl}`, { correlationId: cid });
  next();
});

// Health check
app.get('/health', authController.health);

// Auth routes
app.post('/register', authController.register);
app.post('/login', authController.login);
app.get('/profile', authController.getProfile);
app.get('/users', authController.listUsers);

// Seed on startup
seedUsers().catch(err => logger.error('Seed error:', { error: err.message }));

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Auth Service corriendo en puerto ${PORT}`);
  });
}

module.exports = app;
