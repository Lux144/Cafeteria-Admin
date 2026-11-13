const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('AuthService:Seed');

async function seedUsers() {
  const defaultUsers = [
    {
      name: 'Cliente Demo',
      email: 'cliente@cafeteria.com',
      password: 'cliente123',
      role: 'cliente'
    },
    {
      name: 'Chef Cocinero',
      email: 'cocina@cafeteria.com',
      password: 'cocina123',
      role: 'cocina'
    },
    {
      name: 'Cajero Principal',
      email: 'cajero@cafeteria.com',
      password: 'cajero123',
      role: 'cajero'
    },
    {
      name: 'Administrador General',
      email: 'admin@cafeteria.com',
      password: 'admin123',
      role: 'admin'
    }
  ];

  for (const user of defaultUsers) {
    const existing = db.findUserByEmail(user.email);
    if (!existing) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      const id = crypto.randomUUID();
      db.createUser({
        id,
        name: user.name,
        email: user.email,
        password_hash: passwordHash,
        role: user.role
      });
      logger.info(`Usuario creado: ${user.email} (${user.role})`);
    }
  }
}

module.exports = { seedUsers };

if (require.main === module) {
  seedUsers().then(() => {
    console.log('Auth seed complete.');
    process.exit(0);
  });
}
