//lee la cookie token, valida JWT,guarda usuario autenticado/valida si no hay token o está malo, responde 401
const { verifyToken } = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        message: 'No autenticado'
      });
    }

    const decoded = verifyToken(token);

    req.user = {
      id: decoded.sub,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Token inválido o expirado'
    });
  }
};

module.exports = {
  authMiddleware
};