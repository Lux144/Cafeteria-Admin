const test = require('node:test');
const assert = require('node:assert/strict');
const ordersApp = require('../services/orders-service/src/index');

test('Orders Service - Suite de Pruebas', async (t) => {
  const server = ordersApp.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  t.after(() => {
    server.close();
  });

  await t.test('Health check retorna 200 y status ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ok');
  });

  let testOrderId;
  await t.test('Crear pedido calcula subtotal, IVA y total correctamente', async () => {
    const payload = {
      customer_name: 'Ana Sofia',
      order_type: 'en_local',
      table_number: 'Mesa 3',
      items: [
        {
          product_id: 'p-1',
          product_name: 'Cappuccino Clásico',
          unit_price: 55.0,
          quantity: 2,
          notes: 'Con leche deslactosada'
        },
        {
          product_id: 'p-2',
          product_name: 'Croissant de Mantequilla',
          unit_price: 42.0,
          quantity: 1
        }
      ],
      notes: 'Sin azúcar adicional'
    };

    const res = await fetch(`${baseUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 201);
    const order = await res.json();
    testOrderId = order.id;

    assert.ok(order.order_number >= 100);
    assert.equal(order.status, 'recibido');
    assert.equal(order.payment_status, 'pendiente');
    // Subtotal = 55*2 + 42 = 152
    assert.equal(order.subtotal, 152.0);
    // Tax = 152 * 0.16 = 24.32
    assert.equal(order.tax, 24.32);
    // Total = 176.32
    assert.equal(order.total, 176.32);
    assert.equal(order.items.length, 2);
  });

  await t.test('Transición de estado: recibido -> preparando', async () => {
    const res = await fetch(`${baseUrl}/${testOrderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'preparando' })
    });

    assert.equal(res.status, 200);
    const order = await res.json();
    assert.equal(order.status, 'preparando');
  });

  await t.test('Transición inválida: no permite saltar de preparando a entregado sin estar listo', async () => {
    const res = await fetch(`${baseUrl}/${testOrderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'entregado' })
    });

    assert.equal(res.status, 400);
    const err = await res.json();
    assert.match(err.error, /Transición inválida/);
  });

  await t.test('Transición a listo', async () => {
    const res = await fetch(`${baseUrl}/${testOrderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'listo' })
    });

    assert.equal(res.status, 200);
    const order = await res.json();
    assert.equal(order.status, 'listo');
  });

  await t.test('Cobro simulado registra pago en efectivo con cambio', async () => {
    const res = await fetch(`${baseUrl}/${testOrderId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_method: 'efectivo',
        amount_received: 200.0
      })
    });

    assert.equal(res.status, 200);
    const order = await res.json();
    assert.equal(order.payment_status, 'pagado');
    assert.equal(order.payment_method, 'efectivo');
    assert.ok(order.payment);
    assert.equal(order.payment.amount, 176.32);
    assert.equal(order.payment.amount_received, 200.0);
    assert.equal(order.payment.change_returned, 23.68);
  });

  await t.test('Transición final a entregado', async () => {
    const res = await fetch(`${baseUrl}/${testOrderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'entregado' })
    });

    assert.equal(res.status, 200);
    const order = await res.json();
    assert.equal(order.status, 'entregado');
  });

  await t.test('Reporte diario de ventas refleja el pedido cobrado', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await fetch(`${baseUrl}/reports/daily?date=${today}`);

    assert.equal(res.status, 200);
    const report = await res.json();
    assert.equal(report.date, today);
    assert.ok(report.summary.totalRevenue >= 176.32);
    assert.ok(report.summary.completedOrders >= 1);
    assert.ok(report.topProducts.length >= 1);
  });
});
