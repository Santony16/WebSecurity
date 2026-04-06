const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');
const { checkInactivity } = require('../middlewares/activity.middleware');

//crea una ruta protegida normal
router.get('/profile', authMiddleware, checkInactivity, (req, res) => {
  return res.status(200).json({
    message: 'Ruta protegida funcionando',
    user: req.user
  });
});

//crea una ruta solo para SuperAdmin
router.get(
  '/admin-only',
  authMiddleware,
  checkInactivity,
  authorizeRoles('SuperAdmin'),
  (req, res) => {
    return res.status(200).json({
      message: 'Solo SuperAdmin puede acceder a esta ruta'
    });
  }
);

module.exports = router;