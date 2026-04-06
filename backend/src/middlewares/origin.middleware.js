const allowedOrigin = process.env.FRONTEND_URL;

const validateOrigin = (req, res, next) => {
  // Toma el valor del header Origin para saber desde qué sitio viene la petición.
  const origin = req.get('origin');

  // Si no existe Origin, permite continuar.
  // Esto puede pasar en herramientas como Postman o en algunas peticiones del servidor.
  if (!origin) {
    return next();
  }

  // Si el origen no coincide con el frontend permitido, bloquea el acceso.
  if (origin !== allowedOrigin) {
    return res.status(403).json({
      message: 'Origen no permitido'
    });
  }

  // Si el origen es válido, la petición sigue hacia la siguiente función o ruta.
  next();
};

module.exports = {
  validateOrigin
};
