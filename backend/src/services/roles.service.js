const pool = require('../config/db');

const getAllRoles = async () => {
  const result = await pool.query(
    `
    SELECT id, name, description, created_at, updated_at
    FROM public.roles
    ORDER BY id ASC
    `
  );

  return result.rows;
};

const getRoleById = async (id) => {
  const result = await pool.query(
    `
    SELECT id, name, description, created_at, updated_at
    FROM public.roles
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  return result.rows[0];
};

const countUsersByRoleId = async (roleId) => {
  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS total
    FROM public.users
    WHERE role_id = $1
    `,
    [roleId]
  );

  return result.rows[0].total;
};

const getRoleByName = async (name) => {
  const result = await pool.query(
    `
    SELECT id, name, description, created_at, updated_at
    FROM public.roles
    WHERE LOWER(name) = LOWER($1)
    LIMIT 1
    `,
    [name]
  );

  return result.rows[0];
};

const createRole = async ({ name, description }) => {
  const result = await pool.query(
    `
    INSERT INTO public.roles (name, description)
    VALUES ($1, $2)
    RETURNING *
    `,
    [name, description]
  );

  return result.rows[0];
};

const updateRole = async (id, { name, description }) => {
  const result = await pool.query(
    `
    UPDATE public.roles
    SET name = $1,
        description = $2
    WHERE id = $3
    RETURNING *
    `,
    [name, description, id]
  );

  return result.rows[0];
};

const deleteRole = async (id) => {
  const result = await pool.query(
    `
    DELETE FROM public.roles
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );

  return result.rows[0];
};

const getAllPermissions = async () => {
  const result = await pool.query(
    `
    SELECT id, code, name, description, created_at
    FROM public.permissions
    ORDER BY code ASC
    `
  );

  return result.rows;
};

const getPermissionsByIds = async (permissionIds = []) => {
  if (permissionIds.length === 0) {
    return [];
  }

  const result = await pool.query(
    `
    SELECT id, code, name, description
    FROM public.permissions
    WHERE id = ANY($1::int[])
    ORDER BY code ASC
    `,
    [permissionIds]
  );

  return result.rows;
};

const getPermissionsByRoleId = async (roleId) => {
  const result = await pool.query(
    `
    SELECT p.id, p.code, p.name, p.description
    FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = $1
    ORDER BY p.code ASC
    `,
    [roleId]
  );

  return result.rows;
};

const replaceRolePermissions = async (roleId, permissionIds = []) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      `
      DELETE FROM public.role_permissions
      WHERE role_id = $1
      `,
      [roleId]
    );

    for (const permissionId of permissionIds) {
      await client.query(
        `
        INSERT INTO public.role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        `,
        [roleId, permissionId]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  countUsersByRoleId,
  getRoleByName,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
  getPermissionsByIds,
  getPermissionsByRoleId,
  replaceRolePermissions
};
