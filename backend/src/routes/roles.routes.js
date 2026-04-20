const express = require('express');
const router = express.Router();

const {
  getRolesController,
  createRoleController,
  updateRoleController,
  deleteRoleController,
  getPermissionsController,
  assignPermissionsToRoleController
} = require('../controllers/roles.controller');

const { validateOrigin } = require('../middlewares/origin.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { checkInactivity } = require('../middlewares/activity.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');

router.get(
  '/',
  authMiddleware,
  checkInactivity,
  authorizeRoles('SuperAdmin'),
  getRolesController
);

router.post(
  '/',
  validateOrigin,
  authMiddleware,
  checkInactivity,
  authorizeRoles('SuperAdmin'),
  createRoleController
);

router.put(
  '/:id',
  validateOrigin,
  authMiddleware,
  checkInactivity,
  authorizeRoles('SuperAdmin'),
  updateRoleController
);

router.delete(
  '/:id',
  validateOrigin,
  authMiddleware,
  checkInactivity,
  authorizeRoles('SuperAdmin'),
  deleteRoleController
);

router.get(
  '/permissions/all',
  authMiddleware,
  checkInactivity,
  authorizeRoles('SuperAdmin'),
  getPermissionsController
);

router.put(
  '/:id/permissions',
  validateOrigin,
  authMiddleware,
  checkInactivity,
  authorizeRoles('SuperAdmin'),
  assignPermissionsToRoleController
);

module.exports = router;
