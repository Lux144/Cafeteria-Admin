const test = require('node:test');
const assert = require('node:assert/strict');
const gatewayApp = require('../services/api-gateway/src/index');
const { generateToken } = require('../services/shared/auth-guard');

test('API Gateway - Suite de Pruebas', async (t) => {
  const server = gatewayApp.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  t.after(() => {
    server.close();
  });

  await t.test('Gateway health check responde estructura esperada', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = await res.json();
    assert.ok(body.gateway);
    assert.ok(body.services);
  });

  await t.test('Gateway genera x-correlation-id si no viene en cabecera', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const cid = res.headers.get('x-correlation-id');
    assert.ok(cid);
  });

  await t.test('Gateway propaga x-correlation-id personalizado', async () => {
    const customCid = 'test-trace-uuid-12345';
    const res = await fetch(`${baseUrl}/health`, {
      headers: { 'x-correlation-id': customCid }
    });
    const cid = res.headers.get('x-correlation-id');
    assert.equal(cid, customCid);
  });

  await t.test('Gateway bloquea ruta protegida sin autenticación con 401', async () => {
    const res = await fetch(`${baseUrl}/api/orders/test-id/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'preparando' })
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Autenticación requerida/);
  });

  await t.test('Gateway bloquea ruta protegida con rol insuficiente con 403', async () => {
    const clientToken = generateToken({
      id: 'usr-client',
      name: 'Cliente Juan',
      email: 'juan@test.com',
      role: 'cliente'
    });

    const res = await fetch(`${baseUrl}/api/orders/test-id/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clientToken}`
      },
      body: JSON.stringify({ status: 'preparando' })
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Acceso restringido/);
  });
});
