//revisa si el usuario autenticado tiene el rol permitido si no lo tiene, responde 403
//registra auditoria de acceso denegado
const { registerAuditEvent } = require('../utils/audit');

const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'No autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      await registerAuditEvent({
        userId: req.user.id,
        eventType: 'ACCESS_DENIED',
        route: req.originalUrl,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        statusCode: 403,
        details: {
          required_roles: allowedRoles,
          actual_role: req.user.role
        }
      });

      return res.status(403).json({
        message: 'Acceso denegado'
      });
    }

    next();
  };
};

module.exports = {
  authorizeRoles
};