const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { createLogger } = require('../../shared/logger');
const { verifyToken } = require('../../shared/auth-guard');
const { createReverseProxy } = require('./proxy');

const logger = createLogger('ApiGateway');
const app = express();
const PORT = process.env.PORT || 4000;

// Microservice URLs
const SERVICES = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4001',
  catalog: process.env.CATALOG_SERVICE_URL || 'http://localhost:4002',
  orders: process.env.ORDERS_SERVICE_URL || 'http://localhost:4003',
  notifications: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:4004'
};

app.use(cors());
app.use(express.json());

// 1. Centralized Correlation ID & Request Tracing Middleware
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} [${res.statusCode}] - ${duration}ms`, {
      correlationId,
      status: res.statusCode,
      duration
    });
  });

  next();
});

// 2. Centralized Authentication Middleware
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }
  next();
});

// 3. Centralized Health Check Aggregator
app.get('/health', async (req, res) => {
  const healthResults = {};
  let overallHealthy = true;

  const checks = Object.entries(SERVICES).map(async ([name, baseUrl]) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(`${baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        healthResults[name] = { status: 'healthy', ...data };
      } else {
        healthResults[name] = { status: 'degraded', statusCode: resp.status };
        overallHealthy = false;
      }
    } catch (err) {
      healthResults[name] = { status: 'unreachable', error: err.message };
      overallHealthy = false;
    }
  });

  await Promise.all(checks);

  res.status(overallHealthy ? 200 : 207).json({
    gateway: 'healthy',
    status: overallHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: healthResults
  });
});

// 4. Role Guards Helper
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticación requerida para acceder a esta ruta' });
    }
    if (!allowedRoles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        error: `Acceso restringido. Se requiere rol: ${allowedRoles.join(' o ')}`
      });
    }
    next();
  };
}

// 5. Protected Routes Guards at Gateway level
// Modifying products requires admin or cashier/cocina
app.post('/api/catalog/products', requireRole('admin', 'cajero'));
app.put('/api/catalog/products/:id', requireRole('admin', 'cajero'));
app.delete('/api/catalog/products/:id', requireRole('admin'));
app.patch('/api/catalog/products/:id/availability', requireRole('admin', 'cocina', 'cajero'));

// Order status changes require cocina, cajero or admin
app.patch('/api/orders/:id/status', requireRole('cocina', 'cajero', 'admin'));

// Order payment requires cajero or admin
app.post('/api/orders/:id/pay', requireRole('cajero', 'admin'));

// Sales reports require cajero or admin
app.get('/api/orders/reports/*', requireRole('cajero', 'admin'));

// 6. Reverse Proxy Enrutamiento Síncrono a Microservicios
app.use('/api/auth', createReverseProxy(SERVICES.auth));
app.use('/api/catalog', createReverseProxy(SERVICES.catalog));
app.use('/api/orders', createReverseProxy(SERVICES.orders));
app.use('/api/notifications', createReverseProxy(SERVICES.notifications));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada en el API Gateway', path: req.originalUrl });
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`===============================================`);
    logger.info(`API Gateway centralizado corriendo en puerto ${PORT}`);
    logger.info(`Enrutamiento a microservicios:`);
    logger.info(` - Auth:          ${SERVICES.auth}`);
    logger.info(` - Catalog:       ${SERVICES.catalog}`);
    logger.info(` - Orders:        ${SERVICES.orders}`);
    logger.info(` - Notifications: ${SERVICES.notifications}`);
    logger.info(`===============================================`);
  });
}

module.exports = app;
