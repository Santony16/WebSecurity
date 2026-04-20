const {
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
} = require('../services/roles.service');

const { registerAuditEvent } = require('../utils/audit');

const normalizeRoleName = (name) => (
  typeof name === 'string' ? name.trim() : name
);

const validatePermissionIds = (permissionIds) => {
  if (!Array.isArray(permissionIds)) {
    return 'permissionIds debe ser un arreglo';
  }

  const hasInvalidIds = permissionIds.some((permissionId) => !Number.isInteger(permissionId));

  if (hasInvalidIds) {
    return 'Todos los permissionIds deben ser enteros';
  }

  const uniqueIds = new Set(permissionIds);

  if (uniqueIds.size !== permissionIds.length) {
    return 'permissionIds no debe contener duplicados';
  }

  return null;
};

const getRolesController = async (req, res) => {
  try {
    const roles = await getAllRoles();

    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const permissions = await getPermissionsByRoleId(role.id);
        return {
          ...role,
          permissions
        };
      })
    );

    return res.status(200).json(rolesWithPermissions);
  } catch (error) {
    console.error('Error listando roles:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const createRoleController = async (req, res) => {
  try {
    const name = normalizeRoleName(req.body.name);
    const { description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre del rol es obligatorio' });
    }

    const existingRole = await getRoleByName(name);

    if (existingRole) {
      return res.status(409).json({
        message: 'Ya existe un rol con ese nombre'
      });
    }

    const role = await createRole({ name, description: description || null });

    await registerAuditEvent({
      userId: req.user.id,
      eventType: 'ROLE_CHANGED',
      entityType: 'roles',
      entityId: String(role.id),
      route: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: 201,
      details: {
        action: 'create_role',
        role_name: role.name
      }
    });

    return res.status(201).json(role);
  } catch (error) {
    console.error('Error creando rol:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const updateRoleController = async (req, res) => {
  try {
    const existing = await getRoleById(req.params.id);

    if (!existing) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }

    const name = normalizeRoleName(req.body.name);
    const { description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'El nombre del rol es obligatorio' });
    }

    const roleWithSameName = await getRoleByName(name);

    if (roleWithSameName && Number(roleWithSameName.id) !== Number(req.params.id)) {
      return res.status(409).json({
        message: 'Ya existe un rol con ese nombre'
      });
    }

    const role = await updateRole(req.params.id, {
      name,
      description: description || null
    });

    await registerAuditEvent({
      userId: req.user.id,
      eventType: 'ROLE_CHANGED',
      entityType: 'roles',
      entityId: String(role.id),
      route: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      details: {
        action: 'update_role',
        role_name: role.name
      }
    });

    return res.status(200).json(role);
  } catch (error) {
    console.error('Error actualizando rol:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const deleteRoleController = async (req, res) => {
  try {
    const existing = await getRoleById(req.params.id);

    if (!existing) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }

    const protectedRoles = ['SuperAdmin', 'Auditor', 'Registrador'];

    if (protectedRoles.includes(existing.name)) {
      return res.status(400).json({
        message: 'No se pueden eliminar los roles base del sistema'
      });
    }

    const usersWithRole = await countUsersByRoleId(req.params.id);

    if (usersWithRole > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar un rol que está asignado a usuarios'
      });
    }

    const role = await deleteRole(req.params.id);

    await registerAuditEvent({
      userId: req.user.id,
      eventType: 'ROLE_CHANGED',
      entityType: 'roles',
      entityId: String(role.id),
      route: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      details: {
        action: 'delete_role',
        role_name: role.name
      }
    });

    return res.status(200).json({ message: 'Rol eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando rol:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const getPermissionsController = async (req, res) => {
  try {
    const permissions = await getAllPermissions();
    return res.status(200).json(permissions);
  } catch (error) {
    console.error('Error listando permisos:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

const assignPermissionsToRoleController = async (req, res) => {
  try {
    const role = await getRoleById(req.params.id);

    if (!role) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }

    const { permissionIds } = req.body;

    const permissionIdsError = validatePermissionIds(permissionIds);

    if (permissionIdsError) {
      return res.status(400).json({
        message: permissionIdsError
      });
    }

    const existingPermissions = await getPermissionsByIds(permissionIds);

    if (existingPermissions.length !== permissionIds.length) {
      return res.status(404).json({
        message: 'Uno o más permisos no existen'
      });
    }

    await replaceRolePermissions(req.params.id, permissionIds);

    await registerAuditEvent({
      userId: req.user.id,
      eventType: 'PERMISSION_CHANGED',
      entityType: 'roles',
      entityId: String(role.id),
      route: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      details: {
        action: 'assign_permissions',
        role_name: role.name,
        permission_ids: permissionIds
      }
    });

    const updatedPermissions = await getPermissionsByRoleId(req.params.id);

    return res.status(200).json({
      message: 'Permisos asignados correctamente',
      role: {
        ...role,
        permissions: updatedPermissions
      }
    });
  } catch (error) {
    console.error('Error asignando permisos al rol:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};

module.exports = {
  getRolesController,
  createRoleController,
  updateRoleController,
  deleteRoleController,
  getPermissionsController,
  assignPermissionsToRoleController
};
