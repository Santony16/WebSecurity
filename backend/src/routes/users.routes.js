const express = require('express');
const router = express.Router();

const {
  getUsersController,
  getUserController,
  createUserController,
  updateUserController,
  deleteUserController
} = require('../controllers/users.controller');

const { validateOrigin } = require('../middlewares/origin.middleware');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { checkInactivity } = require('../middlewares/activity.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');

router.get(
  '/',
  authMiddleware,
  checkInactivity,
  authorizeRoles('SuperAdmin', 'Auditor', 'Registrador'),
  getUsersController
);

router.get(
  '/:id',
  authMiddleware,
  checkInactivity,
  authorizeRoles('SuperAdmin', 'Auditor', 'Registrador'),
  getUserController
);

router.post(
  '/',
  validateOrigin,
  authMiddleware,
  checkInactivity,
  authorizeRoles('SuperAdmin'),
  createUserController
);

router.put(
  '/:id',
  validateOrigin,
  authMiddleware,
  checkInactivity,
  authorizeRoles('SuperAdmin'),
  updateUserController
);

router.delete(
  '/:id',
  validateOrigin,
  authMiddleware,
  checkInactivity,
  authorizeRoles('SuperAdmin'),
  deleteUserController
);

module.exports = router;
