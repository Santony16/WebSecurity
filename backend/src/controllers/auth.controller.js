const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { login } = require('../services/auth.service');
const { buildAuthCookieOptions } = require('../utils/cookies');

const seedSuperAdmin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'username, email y password son obligatorios'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    const roleResult = await pool.query(
      'SELECT id FROM public.roles WHERE name = $1 LIMIT 1',
      ['SuperAdmin']
    );

    if (roleResult.rows.length === 0) {
      return res.status(404).json({
        message: 'No existe el rol SuperAdmin en la base de datos'
      });
    }

    const roleId = roleResult.rows[0].id;

    const existingUser = await pool.query(
      'SELECT id FROM public.users WHERE email = $1 OR username = $2 LIMIT 1',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: 'Ya existe un usuario con ese email o username'
      });
    }

    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, rounds);

    const result = await pool.query(
      `INSERT INTO public.users
       (username, email, password_hash, role_id, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, username, email, role_id, created_at`,
      [username, email, passwordHash, roleId]
    );

    return res.status(201).json({
      message: 'SuperAdmin creado correctamente',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error creando SuperAdmin:', error);
    return res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
};

const loginController = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: 'identifier y password son obligatorios'
      });
    }

    const result = await login({ identifier, password, req });

    res.cookie('token', result.token, buildAuthCookieOptions());

    res.cookie('lastActivity', Date.now().toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000
    });
    return res.status(200).json({
      message: 'Login exitoso',
      user: result.user
    });
  } catch (error) {
    return res.status(401).json({
      message: error.message
    });
  }
};

const logoutController = async (req, res) => {
  res.clearCookie('token');
  res.clearCookie('lastActivity');

  return res.status(200).json({
    message: 'Sesión cerrada'
  });
};

module.exports = {
  seedSuperAdmin,
  loginController,
  logoutController
};