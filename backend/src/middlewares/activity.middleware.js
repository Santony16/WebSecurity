const checkInactivity = (req, res, next) => {
  // Lee la cookie que guarda la fecha de la ultima actividad del usuario.
  const lastActivity = req.cookies?.lastActivity;

  // Si no existe, se asume que la sesion ya expiro por inactividad.
  if (!lastActivity) {
    return res.status(401).json({
      message: 'Sesión expirada por inactividad'
    });
  }

  // Obtiene el tiempo actual y calcula cuanto tiempo ha pasado desde la ultima actividad.
  const now = Date.now();
  const diff = now - Number(lastActivity);

  // Si pasaron mas de 5 minutos, elimina las cookies de sesion y bloquea el acceso.
  if (diff > 5 * 60 * 1000) {
    res.clearCookie('token');
    res.clearCookie('lastActivity');

    return res.status(401).json({
      message: 'Sesión expirada por inactividad'
    });
  }

  // Si la sesion sigue activa, actualiza la cookie para reiniciar el contador de inactividad.
  res.cookie('lastActivity', Date.now().toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000
  });

  // Permite que la peticion continúe hacia el siguiente middleware o controlador.
  next();
};

module.exports = {
  checkInactivity
};
