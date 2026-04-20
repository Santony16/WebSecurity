const pool = require('../config/db');

const getAllUsers = async () => {
  const result = await pool.query(
    `
    SELECT
      u.id,
      u.username,
      u.email,
      u.role_id,
      u.is_active,
      u.last_login_at,
      u.created_at,
      u.updated_at,
      r.name AS role_name
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    ORDER BY u.created_at DESC
    `
  );

  return result.rows;
};

const getUserById = async (id) => {
  const result = await pool.query(
    `
    SELECT
      u.id,
      u.username,
      u.email,
      u.role_id,
      u.is_active,
      u.last_login_at,
      u.created_at,
      u.updated_at,
      r.name AS role_name
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.id = $1
    LIMIT 1
    `,
    [id]
  );

  return result.rows[0];
};

const getUserPermissions = async (userId) => {
  const result = await pool.query(
    `
    SELECT p.code, p.name
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    JOIN public.role_permissions rp ON rp.role_id = r.id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE u.id = $1
    ORDER BY p.code ASC
    `,
    [userId]
  );

  return result.rows;
};

const getRoleById = async (roleId) => {
  const result = await pool.query(
    `
    SELECT id, name
    FROM public.roles
    WHERE id = $1
    LIMIT 1
    `,
    [roleId]
  );

  return result.rows[0];
};

const createUser = async ({
  username,
  email,
  passwordHash,
  roleId
}) => {
  const result = await pool.query(
    `
    INSERT INTO public.users
    (username, email, password_hash, role_id, is_active)
    VALUES ($1, $2, $3, $4, true)
    RETURNING id, username, email, role_id, is_active, last_login_at, created_at, updated_at
    `,
    [username, email, passwordHash, roleId]
  );

  return result.rows[0];
};

const updateUser = async (id, {
  username,
  email,
  roleId,
  isActive,
  passwordHash
}) => {
  const result = await pool.query(
    `
    UPDATE public.users
    SET
      username = $1,
      email = $2,
      role_id = $3,
      is_active = $4,
      password_hash = COALESCE($5, password_hash)
    WHERE id = $6
    RETURNING id, username, email, role_id, is_active, last_login_at, created_at, updated_at
    `,
    [username, email, roleId, isActive, passwordHash, id]
  );

  return result.rows[0];
};

const softDeleteUser = async (id) => {
  const result = await pool.query(
    `
    UPDATE public.users
    SET is_active = false
    WHERE id = $1
    RETURNING id, username, email, role_id, is_active, last_login_at, created_at, updated_at
    `,
    [id]
  );

  return result.rows[0];
};

const findUserByUsernameOrEmail = async (username, email) => {
  const result = await pool.query(
    `
    SELECT id, username, email
    FROM public.users
    WHERE username = $1 OR email = $2
    LIMIT 1
    `,
    [username, email]
  );

  return result.rows[0];
};

module.exports = {
  getAllUsers,
  getUserById,
  getUserPermissions,
  getRoleById,
  createUser,
  updateUser,
  softDeleteUser,
  findUserByUsernameOrEmail
};
