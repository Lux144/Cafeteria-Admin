const crypto = require('crypto');
const db = require('./db');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('CatalogService:Seed');

async function seedCatalog() {
  const existingCategories = db.listCategories();
  if (existingCategories.length > 0) {
    logger.info('Catálogo ya contiene datos, omitiendo seed.');
    return;
  }

  const categories = [
    {
      id: 'cat-cafe',
      name: 'Café & Espresso',
      description: 'Cafés calientes de especialidad tostados artesanalmente',
      icon: 'Coffee'
    },
    {
      id: 'cat-frias',
      name: 'Bebidas Frías & Frappés',
      description: 'Refrescantes cold brews, frappés y tés helados',
      icon: 'CupSoda'
    },
    {
      id: 'cat-panaderia',
      name: 'Repostería & Panadería',
      description: 'Pan dulce recién horneado y postres de la casa',
      icon: 'Cake'
    },
    {
      id: 'cat-salados',
      name: 'Especialidades Saladas',
      description: 'Sandwiches, bagels y desayunos para acompañar tu café',
      icon: 'Sandwich'
    }
  ];

  for (const cat of categories) {
    db.createCategory(cat);
  }

  const products = [
    // Café & Espresso
    {
      category_id: 'cat-cafe',
      name: 'Espresso Doble',
      description: 'Doble shot de espresso intenso con notas a chocolate y avellana.',
      price: 45.0,
      image_url: 'https://images.unsplash.com/photo-1510707577719-eaef21005169?w=500&auto=format&fit=crop&q=80',
      preparation_time: 3,
      is_available: 1
    },
    {
      category_id: 'cat-cafe',
      name: 'Cappuccino Clásico',
      description: 'Espresso balanceado con leche texturizada y abundante espuma sedosa.',
      price: 55.0,
      image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=500&auto=format&fit=crop&q=80',
      preparation_time: 4,
      is_available: 1
    },
    {
      category_id: 'cat-cafe',
      name: 'Caramel Macchiato',
      description: 'Vainilla suave con leche al vapor, manchada de espresso y jarabe de caramelo artesanal.',
      price: 65.0,
      image_url: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=500&auto=format&fit=crop&q=80',
      preparation_time: 5,
      is_available: 1
    },
    {
      category_id: 'cat-cafe',
      name: 'Café Americano Especial',
      description: 'Doble extracción de espresso rebajado con agua caliente a 92°C.',
      price: 40.0,
      image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80',
      preparation_time: 3,
      is_available: 1
    },
    {
      category_id: 'cat-cafe',
      name: 'Flat White',
      description: 'Microespuma fina sobre doble ristretto para un sabor profundo y aterciopelado.',
      price: 58.0,
      image_url: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=500&auto=format&fit=crop&q=80',
      preparation_time: 4,
      is_available: 1
    },

    // Bebidas Frías
    {
      category_id: 'cat-frias',
      name: 'Cold Brew Vainilla Cream',
      description: 'Café infusionado en frío durante 18 horas servido con crema dulce de vainilla.',
      price: 62.0,
      image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80',
      preparation_time: 3,
      is_available: 1
    },
    {
      category_id: 'cat-frias',
      name: 'Frappé Moka con Crema',
      description: 'Frappé helado de café con chocolate semi-amargo, leche y crema batida.',
      price: 70.0,
      image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80',
      preparation_time: 6,
      is_available: 1
    },
    {
      category_id: 'cat-frias',
      name: 'Iced Matcha Latte',
      description: 'Té verde ceremonial japonés con leche de almendra y hielo.',
      price: 68.0,
      image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=80',
      preparation_time: 4,
      is_available: 1
    },

    // Repostería
    {
      category_id: 'cat-panaderia',
      name: 'Croissant Francés de Mantequilla',
      description: 'Hojaldre tradicional crujiente por fuera y tierno por dentro con mantequilla pura.',
      price: 42.0,
      image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=80',
      preparation_time: 2,
      is_available: 1
    },
    {
      category_id: 'cat-panaderia',
      name: 'Cheesecake de Frutos Rojos',
      description: 'Pastel de queso crema horneado con coulis de fresa, zarzamora y frambuesa.',
      price: 68.0,
      image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500&auto=format&fit=crop&q=80',
      preparation_time: 2,
      is_available: 1
    },
    {
      category_id: 'cat-panaderia',
      name: 'Muffin de Moras Silvestres',
      description: 'Muffin esponjoso relleno de moras naturales con topping crujiente de azúcar morena.',
      price: 38.0,
      image_url: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=500&auto=format&fit=crop&q=80',
      preparation_time: 2,
      is_available: 1
    },

    // Especialidades Saladas
    {
      category_id: 'cat-salados',
      name: 'Bagel de Pavo y Queso Gouda',
      description: 'Bagel tostado con pechuga de pavo ahumada, queso gouda gratinado y aderezo dijon.',
      price: 85.0,
      image_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80',
      preparation_time: 7,
      is_available: 1
    },
    {
      category_id: 'cat-salados',
      name: 'Panini Caprese',
      description: 'Pan ciabatta con mozzarella fresca, jitomate deshidratado, pesto de albahaca y reducción balsámica.',
      price: 78.0,
      image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
      preparation_time: 6,
      is_available: 1
    }
  ];

  for (const prod of products) {
    db.createProduct({
      id: crypto.randomUUID(),
      ...prod
    });
  }

  logger.info(`Catálogo inicializado con ${categories.length} categorías y ${products.length} productos.`);
}

module.exports = { seedCatalog };

if (require.main === module) {
  seedCatalog().then(() => {
    console.log('Catalog seed complete.');
    process.exit(0);
  });
}
