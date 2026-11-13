const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { generateToken, verifyToken } = require('../../shared/auth-guard');
const { createLogger } = require('../../shared/logger');

const logger = createLogger('AuthService:Controller');

async function register(req, res) {
  try {
    const { name, email, password, role = 'cliente' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
    }

    const validRoles = ['cliente', 'cocina', 'cajero', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Rol inválido. Roles válidos: ${validRoles.join(', ')}` });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'El correo electrónico ya se encuentra registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();

    const newUser = db.createUser({
      id,
      name: name.trim(),
      email,
      password_hash: passwordHash,
      role
    });

    const token = generateToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    });

    logger.info(`Nuevo usuario registrado: ${newUser.email} [${newUser.role}]`);

    return res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        created_at: newUser.created_at
      },
      token
    });
  } catch (error) {
    logger.error('Error en registro:', { error: error.message });
    return res.status(500).json({ error: 'Error interno del servidor al registrar usuario' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    logger.info(`Inicio de sesión exitoso: ${user.email} [${user.role}]`);

    return res.json({
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at
      },
      token
    });
  } catch (error) {
    logger.error('Error en login:', { error: error.message });
    return res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
  }
}

function getProfile(req, res) {
  try {
    const userId = req.headers['x-user-id'] || (req.user && req.user.id);
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const decoded = verifyToken(authHeader.split(' ')[1]);
        if (decoded) {
          const user = db.findUserById(decoded.id);
          if (user) return res.json(user);
        }
      }
      return res.status(401).json({ error: 'No autenticado' });
    }

    const user = db.findUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(user);
  } catch (error) {
    logger.error('Error al obtener perfil:', { error: error.message });
    return res.status(500).json({ error: 'Error al consultar perfil de usuario' });
  }
}

function listUsers(req, res) {
  try {
    const { role } = req.query;
    const users = db.listUsers(role);
    return res.json(users);
  } catch (error) {
    logger.error('Error al listar usuarios:', { error: error.message });
    return res.status(500).json({ error: 'Error al listar usuarios' });
  }
}

function health(req, res) {
  return res.json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    database: 'connected (sqlite database-per-service)'
  });
}

module.exports = {
  register,
  login,
  getProfile,
  listUsers,
  health
};
