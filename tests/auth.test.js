const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const authApp = require('../services/auth-service/src/index');

test('Auth Service - Suite de Pruebas', async (t) => {
  const server = authApp.listen(0);
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
    assert.equal(body.service, 'auth-service');
  });

  await t.test('Login con usuario predeterminado retorna token y perfil', async () => {
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cliente@cafeteria.com',
        password: 'cliente123'
      })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.token);
    assert.equal(body.user.role, 'cliente');
    assert.equal(body.user.email, 'cliente@cafeteria.com');
  });

  await t.test('Login con contraseña incorrecta retorna 401', async () => {
    const res = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'cliente@cafeteria.com',
        password: 'password_erronea'
      })
    });
    assert.equal(res.status, 401);
  });

  await t.test('Registro de nuevo usuario crea cuenta exitosamente', async () => {
    const randomEmail = `test_${Date.now()}@cafeteria.com`;
    const res = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Carlos Gomez',
        email: randomEmail,
        password: 'password123',
        role: 'cliente'
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.token);
    assert.equal(body.user.email, randomEmail);
    assert.equal(body.user.name, 'Carlos Gomez');
  });
});
