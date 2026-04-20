const bcrypt = require('bcrypt');

const {
  getAllUsers,
  getUserById,
  getUserPermissions,
  getRoleById,
  createUser,
  updateUser,
  softDeleteUser,
  findUserByUsernameOrEmail
} = require('../services/users.service');

const { registerAuditEvent } = require('../utils/audit');

const validateUserPayload = ({
  username,
  email,
  password,
  roleId
}, isCreate = true) => {
  if (!username) return 'El username es obligatorio';
  if (!email) return 'El email es obligatorio';
  if (isCreate && !password) return 'La contraseña es obligatoria';
  if (!roleId) return 'El rol es obligatorio';

  if (typeof username !== 'string') return 'El username debe ser texto';
  if (typeof email !== 'string') return 'El email debe ser texto';
  if (isCreate && typeof password !== 'string') return 'La contraseña debe ser texto';

  if (isCreate && password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }

  return null;
};

const validateIsActive = (isActive) => {
  if (isActive === undefined) {
    return null;
  }

  if (typeof isActive !== 'boolean') {
    return 'isActive debe ser booleano';
  }

  return null;
};

const validateRoleId = async (roleId) => {
  const role = await getRoleById(roleId);
  return role ? null : 'Rol no encontrado';
};

const hashPasswordIfProvided = async (password) => {
  if (password === undefined || password === null || password === '') {
    return {
      passwordHash: null
    };
  }

  if (typeof password !== 'string') {
    return {
      error: 'La contraseña debe ser texto'
    };
  }

  if (password.length < 8) {
    return {
      error: 'La contraseña debe tener al menos 8 caracteres'
    };
  }

  return {
    passwordHash: await bcrypt.hash(
      password,
      Number(process.env.BCRYPT_ROUNDS) || 12
    )
  };
};

const getUsersController = async (req, res) => {
  try {
    const users = await getAllUsers();

    const usersWithPermissions = await Promise.all(
      users.map(async (user) => {
        const permissions = await getUserPermissions(user.id);
        return {
          ...user,
          permissions
        };
      })
    );

    return res.status(200).json(usersWithPermissions);
  } catch (error) {
    console.error('Error listando usuarios:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getUserController = async (req, res) => {
  try {
    const user = await getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const permissions = await getUserPermissions(user.id);

    return res.status(200).json({
      ...user,
      permissions
    });
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const createUserController = async (req, res) => {
  try {
    const validationError = validateUserPayload(req.body, true);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const existing = await findUserByUsernameOrEmail(
      req.body.username,
      req.body.email
    );

    if (existing) {
      return res.status(409).json({
        message: 'Ya existe un usuario con ese username o email'
      });
    }

    const roleError = await validateRoleId(req.body.roleId);

    if (roleError) {
      return res.status(404).json({ message: roleError });
    }

    const { error: passwordError, passwordHash } = await hashPasswordIfProvided(req.body.password);

    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const user = await createUser({
      username: req.body.username,
      email: req.body.email,
      passwordHash,
      roleId: req.body.roleId
    });

    await registerAuditEvent({
      userId: req.user.id,
      eventType: 'USER_CREATED',
      entityType: 'users',
      entityId: String(user.id),
      route: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: 201,
      details: {
        username: user.username,
        email: user.email
      }
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error('Error creando usuario:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const updateUserController = async (req, res) => {
  try {
    const existingUser = await getUserById(req.params.id);

    if (!existingUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (!req.body.username || !req.body.email || !req.body.roleId) {
      return res.status(400).json({
        message: 'username, email y roleId son obligatorios'
      });
    }

    const isActiveError = validateIsActive(req.body.isActive);

    if (isActiveError) {
      return res.status(400).json({
        message: isActiveError
      });
    }

    const roleError = await validateRoleId(req.body.roleId);

    if (roleError) {
      return res.status(404).json({ message: roleError });
    }

    const { error: passwordError, passwordHash } = await hashPasswordIfProvided(req.body.password);

    if (passwordError) {
      return res.status(400).json({
        message: passwordError
      });
    }

    const user = await updateUser(req.params.id, {
      username: req.body.username,
      email: req.body.email,
      roleId: req.body.roleId,
      isActive: req.body.isActive ?? existingUser.is_active,
      passwordHash
    });

    await registerAuditEvent({
      userId: req.user.id,
      eventType: 'USER_UPDATED',
      entityType: 'users',
      entityId: String(user.id),
      route: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      details: {
        username: user.username,
        email: user.email
      }
    });

    return res.status(200).json(user);
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const deleteUserController = async (req, res) => {
  try {
    const existingUser = await getUserById(req.params.id);

    if (!existingUser) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = await softDeleteUser(req.params.id);

    await registerAuditEvent({
      userId: req.user.id,
      eventType: 'USER_DELETED',
      entityType: 'users',
      entityId: String(user.id),
      route: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      details: {
        username: user.username,
        email: user.email
      }
    });

    return res.status(200).json({ message: 'Usuario desactivado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  getUsersController,
  getUserController,
  createUserController,
  updateUserController,
  deleteUserController
};
