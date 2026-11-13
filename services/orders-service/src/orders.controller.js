const crypto = require('crypto');
const db = require('./db');
const { getDailySalesReport } = require('./reports.service');
const { getEventBus } = require('../../shared/event-bus');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('OrdersService:Controller');
const eventBus = getEventBus('OrdersService');

// State transition machine
const VALID_TRANSITIONS = {
  recibido: ['preparando', 'cancelado'],
  preparando: ['listo', 'cancelado'],
  listo: ['entregado'],
  entregado: [],
  cancelado: []
};

async function createOrder(req, res) {
  try {
    const {
      customer_id,
      customer_name,
      order_type = 'en_local',
      table_number,
      items,
      notes = ''
    } = req.body;

    if (!customer_name || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Nombre del cliente y al menos un producto son requeridos' });
    }

    if (!['en_local', 'para_llevar'].includes(order_type)) {
      return res.status(400).json({ error: "El tipo de pedido debe ser 'en_local' o 'para_llevar'" });
    }

    const orderId = crypto.randomUUID();
    let subtotal = 0;

    const formattedItems = items.map(item => {
      const unitPrice = Number(item.unit_price) || 0;
      const quantity = Math.max(1, parseInt(item.quantity) || 1);
      const itemSubtotal = Math.round(unitPrice * quantity * 100) / 100;
      subtotal += itemSubtotal;

      return {
        id: crypto.randomUUID(),
        product_id: item.product_id || item.id,
        product_name: item.product_name || item.name,
        unit_price: unitPrice,
        quantity,
        subtotal: itemSubtotal,
        notes: item.notes || ''
      };
    });

    const tax = Math.round(subtotal * 0.16 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    const newOrder = db.createOrder(
      {
        id: orderId,
        customer_id: customer_id || req.headers['x-user-id'] || null,
        customer_name: customer_name.trim(),
        order_type,
        table_number: order_type === 'en_local' ? (table_number || 'Barra') : null,
        status: 'recibido',
        payment_status: 'pendiente',
        subtotal,
        tax,
        total,
        notes
      },
      formattedItems
    );

    logger.info(`Pedido #${newOrder.order_number} creado por ${newOrder.customer_name} ($${newOrder.total})`);

    // Asynchronous event publication via Message Bus
    await eventBus.publish('order:created', {
      orderId: newOrder.id,
      orderNumber: newOrder.order_number,
      customerName: newOrder.customer_name,
      orderType: newOrder.order_type,
      tableNumber: newOrder.table_number,
      items: newOrder.items,
      total: newOrder.total,
      status: newOrder.status,
      createdAt: newOrder.created_at
    });

    return res.status(201).json(newOrder);
  } catch (error) {
    logger.error('Error al crear pedido:', { error: error.message });
    return res.status(500).json({ error: 'Error al procesar el pedido' });
  }
}

function getOrders(req, res) {
  try {
    const { status, payment_status, order_type, date, customer_id } = req.query;
    const orders = db.listOrders({ status, payment_status, order_type, date, customer_id });
    return res.json(orders);
  } catch (error) {
    logger.error('Error al listar pedidos:', { error: error.message });
    return res.status(500).json({ error: 'Error al consultar pedidos' });
  }
}

function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const order = db.getOrderWithDetails(id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    return res.json(order);
  } catch (error) {
    logger.error('Error al obtener pedido:', { error: error.message });
    return res.status(500).json({ error: 'Error al consultar pedido' });
  }
}

async function updateStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = req.headers['x-user-role'] || 'cocina';

    const order = db.getOrderWithDetails(id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const currentStatus = order.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Transición inválida: no se puede pasar de '${currentStatus}' a '${status}'. Estados permitidos: ${allowed.join(', ') || 'ninguno'}`
      });
    }

    const updated = db.updateStatus(id, status, userRole);
    logger.info(`Pedido #${updated.order_number} cambió de '${currentStatus}' a '${status}'`);

    // Asynchronous event publication via Message Bus
    await eventBus.publish('order:status_updated', {
      orderId: updated.id,
      orderNumber: updated.order_number,
      customerName: updated.customer_name,
      customerId: updated.customer_id,
      previousStatus: currentStatus,
      newStatus: status,
      updatedAt: updated.updated_at
    });

    if (status === 'listo') {
      await eventBus.publish('order:ready', {
        orderId: updated.id,
        orderNumber: updated.order_number,
        customerName: updated.customer_name,
        customerId: updated.customer_id,
        message: `¡Pedido #${updated.order_number} para ${updated.customer_name} está LISTO!`
      });
    }

    return res.json(updated);
  } catch (error) {
    logger.error('Error al actualizar estado:', { error: error.message });
    return res.status(500).json({ error: 'Error al cambiar estado del pedido' });
  }
}

async function processPayment(req, res) {
  try {
    const { id } = req.params;
    const { payment_method = 'efectivo', amount_received } = req.body;

    const order = db.getOrderWithDetails(id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (order.payment_status === 'pagado') {
      return res.status(400).json({ error: 'El pedido ya ha sido pagado previamente' });
    }

    if (!['efectivo', 'tarjeta', 'transferencia'].includes(payment_method)) {
      return res.status(400).json({ error: "Método de pago inválido ('efectivo', 'tarjeta', 'transferencia')" });
    }

    const amount = order.total;
    const received = Number(amount_received) || amount;

    if (payment_method === 'efectivo' && received < amount) {
      return res.status(400).json({ error: `Monto recibido ($${received}) insuficiente. Total: $${amount}` });
    }

    const change = payment_method === 'efectivo' ? Math.round((received - amount) * 100) / 100 : 0;
    const transactionRef = 'TXN-' + Math.random().toString(36).substring(2, 9).toUpperCase();

    const updated = db.recordPayment(id, {
      id: crypto.randomUUID(),
      amount,
      payment_method,
      amount_received: received,
      change_returned: change,
      transaction_ref: transactionRef
    });

    logger.info(`Pago registrado para Pedido #${updated.order_number} (${payment_method}): $${amount}`);

    // Asynchronous event publication via Message Bus
    await eventBus.publish('order:paid', {
      orderId: updated.id,
      orderNumber: updated.order_number,
      paymentMethod: payment_method,
      amount,
      transactionRef
    });

    return res.json(updated);
  } catch (error) {
    logger.error('Error al procesar pago:', { error: error.message });
    return res.status(500).json({ error: 'Error al registrar el cobro del pedido' });
  }
}

function addItem(req, res) {
  try {
    const { id } = req.params;
    const { product_id, product_name, unit_price, quantity = 1, notes = '' } = req.body;

    const order = db.getOrderWithDetails(id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (order.status !== 'recibido') {
      return res.status(400).json({ error: 'No se pueden agregar productos a un pedido en preparación o listo' });
    }

    const unitPrice = Number(unit_price) || 0;
    const qty = Math.max(1, parseInt(quantity) || 1);
    const subtotal = Math.round(unitPrice * qty * 100) / 100;

    const updated = db.addItem(id, {
      id: crypto.randomUUID(),
      product_id,
      product_name,
      unit_price: unitPrice,
      quantity: qty,
      subtotal,
      notes
    });

    return res.json(updated);
  } catch (error) {
    logger.error('Error al agregar ítem:', { error: error.message });
    return res.status(500).json({ error: 'Error al agregar ítem al pedido' });
  }
}

function removeItem(req, res) {
  try {
    const { id, itemId } = req.params;

    const order = db.getOrderWithDetails(id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    if (order.status !== 'recibido') {
      return res.status(400).json({ error: 'No se pueden remover productos de un pedido en preparación o listo' });
    }

    const updated = db.removeItem(id, itemId);
    return res.json(updated);
  } catch (error) {
    logger.error('Error al remover ítem:', { error: error.message });
    return res.status(500).json({ error: 'Error al quitar ítem del pedido' });
  }
}

function getDailyReport(req, res) {
  try {
    const { date } = req.query;
    const report = getDailySalesReport(date);
    return res.json(report);
  } catch (error) {
    logger.error('Error al generar reporte:', { error: error.message });
    return res.status(500).json({ error: 'Error al generar reporte diario de ventas' });
  }
}

function getCustomerOrders(req, res) {
  try {
    const { customerId } = req.params;
    const orders = db.listOrders({ customer_id: customerId });
    return res.json(orders);
  } catch (error) {
    logger.error('Error al consultar historial del cliente:', { error: error.message });
    return res.status(500).json({ error: 'Error al consultar historial de pedidos' });
  }
}

function health(req, res) {
  return res.json({
    status: 'ok',
    service: 'orders-service',
    timestamp: new Date().toISOString(),
    database: 'connected (sqlite database-per-service)'
  });
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateStatus,
  processPayment,
  addItem,
  removeItem,
  getDailyReport,
  getCustomerOrders,
  health
};
