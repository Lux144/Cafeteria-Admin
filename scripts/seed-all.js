const { seedUsers } = require('../services/auth-service/src/seed');
const { seedCatalog } = require('../services/catalog-service/src/seed');

async function seedAll() {
  console.log('--- Iniciando siembra de datos iniciales para la Cafetería ---');
  await seedUsers();
  await seedCatalog();
  console.log('--- Siembra de datos completada exitosamente ---');
}

seedAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error durante la siembra de datos:', err);
    process.exit(1);
  });
