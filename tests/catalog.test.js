const test = require('node:test');
const assert = require('node:assert/strict');
const catalogApp = require('../services/catalog-service/src/index');

test('Catalog Service - Suite de Pruebas', async (t) => {
  const server = catalogApp.listen(0);
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
    assert.equal(body.service, 'catalog-service');
  });

  await t.test('Listado de categorías retorna al menos 4 categorías', async () => {
    const res = await fetch(`${baseUrl}/categories`);
    assert.equal(res.status, 200);
    const categories = await res.json();
    assert.ok(Array.isArray(categories));
    assert.ok(categories.length >= 4);
  });

  await t.test('Listado de productos retorna productos del catálogo', async () => {
    const res = await fetch(`${baseUrl}/products`);
    assert.equal(res.status, 200);
    const products = await res.json();
    assert.ok(Array.isArray(products));
    assert.ok(products.length >= 5);
  });

  let createdProductId;
  await t.test('Creación de un nuevo producto', async () => {
    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category_id: 'cat-cafe',
        name: 'Mocaccino Especial Navideño',
        description: 'Deliciosa mezcla con canela y chocolate belga',
        price: 69.5,
        image_url: 'https://images.unsplash.com/photo-test',
        preparation_time: 4,
        is_available: 1
      })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.id);
    assert.equal(body.name, 'Mocaccino Especial Navideño');
    assert.equal(body.price, 69.5);
    createdProductId = body.id;
  });

  await t.test('Cambio de disponibilidad (toggle) del producto', async () => {
    const res = await fetch(`${baseUrl}/products/${createdProductId}/availability`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_available: 0 })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.is_available, 0);
  });

  await t.test('Eliminación de producto creado', async () => {
    const res = await fetch(`${baseUrl}/products/${createdProductId}`, {
      method: 'DELETE'
    });
    assert.equal(res.status, 200);

    const checkRes = await fetch(`${baseUrl}/products/${createdProductId}`);
    assert.equal(checkRes.status, 404);
  });
});
