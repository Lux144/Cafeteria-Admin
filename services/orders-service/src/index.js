const express = require('express');
const cors = require('cors');
const { createLogger } = require('../../shared/logger');
const ordersController = require('./orders.controller');

const logger = createLogger('OrdersService');
const app = express();
const PORT = process.env.PORT || 4003;

app.use(cors());
app.use(express.json());

// Correlation ID logger middleware
app.use((req, res, next) => {
  const cid = req.headers['x-correlation-id'] || '-';
  logger.info(`${req.method} ${req.originalUrl}`, { correlationId: cid });
  next();
});

// Health check
app.get('/health', ordersController.health);

// Reports
app.get('/reports/daily', ordersController.getDailyReport);

// Customer history
app.get('/customer/:customerId', ordersController.getCustomerOrders);

// Order CRUD & Lifecycle
app.post('/', ordersController.createOrder);
app.get('/', ordersController.getOrders);
app.get('/:id', ordersController.getOrderById);
app.patch('/:id/status', ordersController.updateStatus);
app.post('/:id/pay', ordersController.processPayment);
app.post('/:id/items', ordersController.addItem);
app.delete('/:id/items/:itemId', ordersController.removeItem);

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`Orders Service corriendo en puerto ${PORT}`);
  });
}

module.exports = app;
