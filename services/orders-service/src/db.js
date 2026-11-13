const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'orders.db');
const db = new DatabaseSync(dbPath);

// Initialize schema for Orders (Database-per-service pattern)
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number INTEGER NOT NULL,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    order_type TEXT NOT NULL CHECK(order_type IN ('en_local', 'para_llevar')),
    table_number TEXT,
    status TEXT NOT NULL CHECK(status IN ('recibido', 'preparando', 'listo', 'entregado', 'cancelado')),
    payment_status TEXT NOT NULL DEFAULT 'pendiente' CHECK(payment_status IN ('pendiente', 'pagado')),
    payment_method TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    unit_price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS order_status_history (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    status TEXT NOT NULL,
    changed_by TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('efectivo', 'tarjeta', 'transferencia')),
    amount_received REAL,
    change_returned REAL,
    transaction_ref TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`);

const queries = {
  getNextOrderNumber: db.prepare('SELECT COALESCE(MAX(order_number), 100) + 1 as next_num FROM orders'),
  
  insertOrder: db.prepare(`
    INSERT INTO orders (id, order_number, customer_id, customer_name, order_type, table_number, status, payment_status, payment_method, subtotal, tax, total, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  insertItem: db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, product_name, unit_price, quantity, subtotal, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  insertStatusHistory: db.prepare(`
    INSERT INTO order_status_history (id, order_id, status, changed_by, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `),

  insertPayment: db.prepare(`
    INSERT INTO payments (id, order_id, amount, payment_method, amount_received, change_returned, transaction_ref, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getOrderById: db.prepare('SELECT * FROM orders WHERE id = ?'),
  getItemsByOrderId: db.prepare('SELECT * FROM order_items WHERE order_id = ?'),
  getHistoryByOrderId: db.prepare('SELECT * FROM order_status_history WHERE order_id = ? ORDER BY timestamp ASC'),
  getPaymentByOrderId: db.prepare('SELECT * FROM payments WHERE order_id = ?'),

  getAllOrders: db.prepare('SELECT * FROM orders ORDER BY created_at DESC'),
  getOrdersByCustomer: db.prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC'),

  updateOrderStatus: db.prepare(`
    UPDATE orders
    SET status = ?, updated_at = ?
    WHERE id = ?
  `),

  updateOrderPayment: db.prepare(`
    UPDATE orders
    SET payment_status = 'pagado', payment_method = ?, updated_at = ?
    WHERE id = ?
  `),

  updateOrderTotals: db.prepare(`
    UPDATE orders
    SET subtotal = ?, tax = ?, total = ?, updated_at = ?
    WHERE id = ?
  `),

  deleteOrderItem: db.prepare('DELETE FROM order_items WHERE id = ? AND order_id = ?')
};

module.exports = {
  db,
  getNextOrderNumber() {
    const row = queries.getNextOrderNumber.get();
    return row.next_num;
  },
  createOrder(orderData, items) {
    const nextNum = orderData.order_number || this.getNextOrderNumber();
    const now = new Date().toISOString();

    queries.insertOrder.run(
      orderData.id,
      nextNum,
      orderData.customer_id || null,
      orderData.customer_name,
      orderData.order_type,
      orderData.table_number || null,
      orderData.status || 'recibido',
      orderData.payment_status || 'pendiente',
      orderData.payment_method || null,
      orderData.subtotal,
      orderData.tax,
      orderData.total,
      orderData.notes || '',
      now,
      now
    );

    // Insert items
    for (const item of items) {
      queries.insertItem.run(
        item.id,
        orderData.id,
        item.product_id,
        item.product_name,
        item.unit_price,
        item.quantity,
        item.subtotal,
        item.notes || ''
      );
    }

    // Insert initial status history
    queries.insertStatusHistory.run(
      orderData.id + '-st-0',
      orderData.id,
      orderData.status || 'recibido',
      orderData.customer_name,
      now
    );

    return this.getOrderWithDetails(orderData.id);
  },
  getOrderWithDetails(orderId) {
    const order = queries.getOrderById.get(orderId);
    if (!order) return null;

    const items = queries.getItemsByOrderId.all(orderId);
    const history = queries.getHistoryByOrderId.all(orderId);
    const payment = queries.getPaymentByOrderId.get(orderId);

    return {
      ...order,
      items,
      history,
      payment: payment || null
    };
  },
  listOrders({ status, payment_status, order_type, date, customer_id } = {}) {
    let orders = queries.getAllOrders.all();

    if (customer_id) {
      orders = orders.filter(o => o.customer_id === customer_id);
    }
    if (status) {
      orders = orders.filter(o => o.status === status);
    }
    if (payment_status) {
      orders = orders.filter(o => o.payment_status === payment_status);
    }
    if (order_type) {
      orders = orders.filter(o => o.order_type === order_type);
    }
    if (date) {
      orders = orders.filter(o => o.created_at.startsWith(date));
    }

    // Attach items summary to each order
    return orders.map(o => ({
      ...o,
      items: queries.getItemsByOrderId.all(o.id)
    }));
  },
  updateStatus(orderId, newStatus, changedBy = 'sistema') {
    const now = new Date().toISOString();
    queries.updateOrderStatus.run(newStatus, now, orderId);
    queries.insertStatusHistory.run(
      orderId + '-st-' + Date.now(),
      orderId,
      newStatus,
      changedBy,
      now
    );
    return this.getOrderWithDetails(orderId);
  },
  recordPayment(orderId, paymentData) {
    const now = new Date().toISOString();
    queries.insertPayment.run(
      paymentData.id,
      orderId,
      paymentData.amount,
      paymentData.payment_method,
      paymentData.amount_received || paymentData.amount,
      paymentData.change_returned || 0,
      paymentData.transaction_ref || null,
      now
    );
    queries.updateOrderPayment.run(paymentData.payment_method, now, orderId);
    return this.getOrderWithDetails(orderId);
  },
  addItem(orderId, item) {
    queries.insertItem.run(
      item.id,
      orderId,
      item.product_id,
      item.product_name,
      item.unit_price,
      item.quantity,
      item.subtotal,
      item.notes || ''
    );
    this.recalculateTotals(orderId);
    return this.getOrderWithDetails(orderId);
  },
  removeItem(orderId, itemId) {
    queries.deleteOrderItem.run(itemId, orderId);
    this.recalculateTotals(orderId);
    return this.getOrderWithDetails(orderId);
  },
  recalculateTotals(orderId) {
    const items = queries.getItemsByOrderId.all(orderId);
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = Math.round(subtotal * 0.16 * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const now = new Date().toISOString();
    queries.updateOrderTotals.run(subtotal, tax, total, now, orderId);
  }
};
