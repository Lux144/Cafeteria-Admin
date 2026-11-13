const express = require('express');
const cors = require('cors');
const { createLogger } = require('../../shared/logger');
const catalogController = require('./catalog.controller');
const { seedCatalog } = require('./seed');

const logger = createLogger('CatalogService');
const app = express();
const PORT = process.env.PORT || 4002;

app.use(cors());
app.use(express.json());

// Correlation ID logger middleware
app.use((req, res, next) => {
  const cid = req.headers['x-correlation-id'] || '-';
  logger.info(`${req.method} ${req.originalUrl}`, { correlationId: cid });
  next();
});

// Health check
app.get('/health', catalogController.health);

// Product routes
app.get('/products', catalogController.getProducts);
app.get('/products/:id', catalogController.getProductById);
app.post('/products', catalogController.createProduct);
app.put('/products/:id', catalogController.updateProduct);
app.patch('/products/:id/availability', catalogController.setAvailability);
app.delete('/products/:id', catalogController.deleteProduct);

// Category routes
app.get('/categories', catalogController.getCategories);
app.post('/categories', catalogController.createCategory);

// Seed on startup
seedCatalog().catch(err => logger.error('Seed error:', { error: err.message }));

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Catalog Service corriendo en puerto ${PORT}`);
  });
}

module.exports = app;
