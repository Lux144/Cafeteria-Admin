const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'catalog.db');
const db = new DatabaseSync(dbPath);

// Initialize schema for Catalog (Database-per-service pattern)
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    is_available INTEGER NOT NULL DEFAULT 1,
    preparation_time INTEGER NOT NULL DEFAULT 5,
    stock INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );

  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
`);

const queries = {
  // Categories
  getAllCategories: db.prepare('SELECT * FROM categories ORDER BY name ASC'),
  getCategoryById: db.prepare('SELECT * FROM categories WHERE id = ?'),
  insertCategory: db.prepare('INSERT INTO categories (id, name, description, icon) VALUES (?, ?, ?, ?)'),

  // Products
  getAllProducts: db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.name ASC
  `),
  getProductsByCategory: db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.category_id = ?
    ORDER BY p.name ASC
  `),
  getProductById: db.prepare(`
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `),
  insertProduct: db.prepare(`
    INSERT INTO products (id, category_id, name, description, price, image_url, is_available, preparation_time, stock, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateProduct: db.prepare(`
    UPDATE products
    SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, is_available = ?, preparation_time = ?, stock = ?
    WHERE id = ?
  `),
  updateAvailability: db.prepare(`
    UPDATE products
    SET is_available = ?
    WHERE id = ?
  `),
  deleteProduct: db.prepare('DELETE FROM products WHERE id = ?')
};

module.exports = {
  db,
  listCategories() {
    return queries.getAllCategories.all();
  },
  getCategory(id) {
    return queries.getCategoryById.get(id);
  },
  createCategory({ id, name, description, icon }) {
    queries.insertCategory.run(id, name, description, icon);
    return { id, name, description, icon };
  },
  listProducts({ category_id, available_only, search } = {}) {
    let items;
    if (category_id) {
      items = queries.getProductsByCategory.all(category_id);
    } else {
      items = queries.getAllProducts.all();
    }

    if (available_only) {
      items = items.filter(p => p.is_available === 1);
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    return items;
  },
  getProduct(id) {
    return queries.getProductById.get(id);
  },
  createProduct({ id, category_id, name, description, price, image_url, is_available = 1, preparation_time = 5, stock = 100 }) {
    const createdAt = new Date().toISOString();
    queries.insertProduct.run(id, category_id, name, description, Number(price), image_url, is_available ? 1 : 0, Number(preparation_time), Number(stock), createdAt);
    return queries.getProductById.get(id);
  },
  updateProduct(id, { category_id, name, description, price, image_url, is_available, preparation_time, stock }) {
    queries.updateProduct.run(category_id, name, description, Number(price), image_url, is_available ? 1 : 0, Number(preparation_time), Number(stock), id);
    return queries.getProductById.get(id);
  },
  setAvailability(id, is_available) {
    queries.updateAvailability.run(is_available ? 1 : 0, id);
    return queries.getProductById.get(id);
  },
  deleteProduct(id) {
    return queries.deleteProduct.run(id);
  }
};
