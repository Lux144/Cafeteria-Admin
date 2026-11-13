const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const { getEventBus } = require('../../shared/event-bus');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('NotificationsService');
const eventBus = getEventBus('NotificationsService');

const app = express();
const PORT = process.env.PORT || 4004;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Recent notifications buffer for polling fallback / audit
const recentNotifications = [];
function addNotification(type, data) {
  const item = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
    type,
    data,
    timestamp: new Date().toISOString()
  };
  recentNotifications.unshift(item);
  if (recentNotifications.length > 100) recentNotifications.pop();
  return item;
}

// Socket connection handling
io.on('connection', (socket) => {
  logger.info(`Cliente conectado a WebSocket: ${socket.id}`);

  // Client requests to join rooms based on role or customerId
  socket.on('join', ({ role, customerId, orderId }) => {
    if (role === 'cocina' || role === 'admin') {
      socket.join('kitchen');
      logger.info(`Socket ${socket.id} se unió a la sala 'kitchen'`);
    }
    if (role === 'cajero' || role === 'admin') {
      socket.join('cashier');
      logger.info(`Socket ${socket.id} se unió a la sala 'cashier'`);
    }
    if (customerId) {
      socket.join(`customer:${customerId}`);
      logger.info(`Socket ${socket.id} se unió a la sala 'customer:${customerId}'`);
    }
    if (orderId) {
      socket.join(`order:${orderId}`);
      logger.info(`Socket ${socket.id} se unió a la sala 'order:${orderId}'`);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Cliente desconectado de WebSocket: ${socket.id}`);
  });
});

// Subscribe to asynchronous events from the message bus
eventBus.subscribe('order:created', (data) => {
  logger.info(`[MessageBus -> WebSocket] Notificando nuevo pedido #${data.orderNumber}`);
  const notif = addNotification('order:created', data);

  // Broadcast to kitchen and cashier
  io.to('kitchen').emit('kitchen:new_order', data);
  io.to('cashier').emit('cashier:new_order', data);
  io.emit('order:created', data); // broadcast generic
});

eventBus.subscribe('order:status_updated', (data) => {
  logger.info(`[MessageBus -> WebSocket] Notificando actualización de pedido #${data.orderNumber} -> ${data.newStatus}`);
  addNotification('order:status_updated', data);

  // Notify kitchen & cashier boards
  io.to('kitchen').emit('order:status_updated', data);
  io.to('cashier').emit('order:status_updated', data);
  io.emit('order:status_updated', data);

  // Notify specific customer & order room
  if (data.customerId) {
    io.to(`customer:${data.customerId}`).emit('customer:order_updated', data);
  }
  if (data.orderId) {
    io.to(`order:${data.orderId}`).emit('customer:order_updated', data);
  }
});

eventBus.subscribe('order:ready', (data) => {
  logger.info(`[MessageBus -> WebSocket] ¡Alerta de pedido listo #${data.orderNumber}!`);
  addNotification('order:ready', data);

  io.emit('order:ready', data);
  if (data.customerId) {
    io.to(`customer:${data.customerId}`).emit('customer:order_ready', data);
  }
  if (data.orderId) {
    io.to(`order:${data.orderId}`).emit('customer:order_ready', data);
  }
});

eventBus.subscribe('order:paid', (data) => {
  logger.info(`[MessageBus -> WebSocket] Notificando pago de pedido #${data.orderNumber}`);
  addNotification('order:paid', data);

  io.to('cashier').emit('cashier:order_paid', data);
  io.emit('order:paid', data);
});

// HTTP REST endpoints for fallback / polling
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'notifications-service',
    timestamp: new Date().toISOString(),
    websocket: {
      connectedClients: io.engine.clientsCount
    }
  });
});

app.get('/recent', (req, res) => {
  const { limit = 20 } = req.query;
  res.json(recentNotifications.slice(0, parseInt(limit)));
});

// Server-Sent Events (SSE) fallback endpoint
app.get('/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date() })}\n\n`);

  const unsubscribe = eventBus.subscribe('order:status_updated', (data) => {
    res.write(`data: ${JSON.stringify({ type: 'order:status_updated', data })}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    logger.info(`Notifications Service (WebSocket) corriendo en puerto ${PORT}`);
  });
}

module.exports = { app, server, io };
