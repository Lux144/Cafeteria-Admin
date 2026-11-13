const crypto = require('crypto');
const db = require('./db');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('CatalogService:Controller');

function getProducts(req, res) {
  try {
    const { category_id, available_only, search } = req.query;
    const products = db.listProducts({
      category_id,
      available_only: available_only === 'true' || available_only === '1',
      search
    });
    return res.json(products);
  } catch (error) {
    logger.error('Error al listar productos:', { error: error.message });
    return res.status(500).json({ error: 'Error al consultar catálogo de productos' });
  }
}

function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = db.getProduct(id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    return res.json(product);
  } catch (error) {
    logger.error('Error al obtener producto:', { error: error.message });
    return res.status(500).json({ error: 'Error al consultar producto' });
  }
}

function createProduct(req, res) {
  try {
    const { category_id, name, description, price, image_url, is_available = 1, preparation_time = 5, stock = 100 } = req.body;

    if (!category_id || !name || price === undefined) {
      return res.status(400).json({ error: 'Categoría, nombre y precio son requeridos' });
    }

    if (isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ error: 'El precio debe ser un número positivo' });
    }

    const id = crypto.randomUUID();
    const newProduct = db.createProduct({
      id,
      category_id,
      name: name.trim(),
      description: description ? description.trim() : '',
      price: Number(price),
      image_url: image_url || '',
      is_available: is_available ? 1 : 0,
      preparation_time: Number(preparation_time) || 5,
      stock: Number(stock) || 100
    });

    logger.info(`Producto creado: ${newProduct.name} ($${newProduct.price})`);
    return res.status(201).json(newProduct);
  } catch (error) {
    logger.error('Error al crear producto:', { error: error.message });
    return res.status(500).json({ error: 'Error al registrar nuevo producto' });
  }
}

function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const existing = db.getProduct(id);
    if (!existing) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const {
      category_id = existing.category_id,
      name = existing.name,
      description = existing.description,
      price = existing.price,
      image_url = existing.image_url,
      is_available = existing.is_available,
      preparation_time = existing.preparation_time,
      stock = existing.stock
    } = req.body;

    const updated = db.updateProduct(id, {
      category_id,
      name: name.trim(),
      description: description ? description.trim() : '',
      price: Number(price),
      image_url,
      is_available: is_available ? 1 : 0,
      preparation_time: Number(preparation_time),
      stock: Number(stock)
    });

    logger.info(`Producto actualizado: ${id}`);
    return res.json(updated);
  } catch (error) {
    logger.error('Error al actualizar producto:', { error: error.message });
    return res.status(500).json({ error: 'Error al actualizar producto' });
  }
}

function setAvailability(req, res) {
  try {
    const { id } = req.params;
    const { is_available } = req.body;

    if (is_available === undefined) {
      return res.status(400).json({ error: 'El campo is_available es requerido' });
    }

    const existing = db.getProduct(id);
    if (!existing) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const updated = db.setAvailability(id, Boolean(is_available));
    logger.info(`Disponibilidad cambiada: ${id} -> ${Boolean(is_available)}`);
    return res.json(updated);
  } catch (error) {
    logger.error('Error al cambiar disponibilidad:', { error: error.message });
    return res.status(500).json({ error: 'Error al actualizar disponibilidad' });
  }
}

function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const existing = db.getProduct(id);
    if (!existing) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    db.deleteProduct(id);
    logger.info(`Producto eliminado: ${id}`);
    return res.json({ message: 'Producto eliminado correctamente', id });
  } catch (error) {
    logger.error('Error al eliminar producto:', { error: error.message });
    return res.status(500).json({ error: 'Error al eliminar producto' });
  }
}

function getCategories(req, res) {
  try {
    const categories = db.listCategories();
    return res.json(categories);
  } catch (error) {
    logger.error('Error al obtener categorías:', { error: error.message });
    return res.status(500).json({ error: 'Error al consultar categorías' });
  }
}

function createCategory(req, res) {
  try {
    const { name, description, icon } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }

    const id = 'cat-' + name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const newCat = db.createCategory({ id, name: name.trim(), description, icon: icon || 'Coffee' });
    logger.info(`Categoría creada: ${name}`);
    return res.status(201).json(newCat);
  } catch (error) {
    logger.error('Error al crear categoría:', { error: error.message });
    return res.status(500).json({ error: 'Error al registrar categoría' });
  }
}

function health(req, res) {
  return res.json({
    status: 'ok',
    service: 'catalog-service',
    timestamp: new Date().toISOString(),
    database: 'connected (sqlite database-per-service)'
  });
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  setAvailability,
  deleteProduct,
  getCategories,
  createCategory,
  health
};
