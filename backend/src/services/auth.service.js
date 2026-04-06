const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { generateToken } = require('../utils/jwt');
const { registerAuditEvent } = require('../utils/audit');

const login = async ({ identifier, password, req }) => {
  const userResult = await pool.query(
    `
    SELECT
      u.id,
      u.username,
      u.email,
      u.password_hash,
      u.role_id,
      u.is_active,
      u.failed_login_count,
      u.locked_until,
      r.name AS role_name
    FROM public.users u
    JOIN public.roles r ON r.id = u.role_id
    WHERE u.email = $1 OR u.username = $1
    LIMIT 1
    `,
    [identifier]
  );

  if (userResult.rows.length === 0) {
    await registerAuditEvent({
      eventType: 'LOGIN_FAILED',
      route: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: 401,
      details: { reason: 'user_not_found', identifier }
    });

    throw new Error('Credenciales inválidas');
  }

  const user = userResult.rows[0];

  if (!user.is_active) {
    throw new Error('Usuario inactivo');
  }

if (user.locked_until && new Date(user.locked_until) > new Date()) {
  await registerAuditEvent({
    userId: user.id,
    eventType: 'RATE_LIMIT_TRIGGERED',
    route: req.originalUrl,
    method: req.method,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    statusCode: 429,
    details: { reason: 'user_locked', locked_until: user.locked_until }
  });

  throw new Error('Usuario bloqueado temporalmente por múltiples intentos fallidos');
}

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    const newFailedCount = Number(user.failed_login_count) + 1;
    let lockedUntil = null;

    if (newFailedCount >= 5) {
      lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
    }

    await pool.query(
      `
      UPDATE public.users
      SET failed_login_count = $1,
          locked_until = $2
      WHERE id = $3
      `,
      [newFailedCount, lockedUntil, user.id]
    );

    await pool.query(
      `
      INSERT INTO public.login_attempts (username, email, ip_address, was_successful, user_agent)
      VALUES ($1,$2,$3,false,$4)
      `,
      [user.username, user.email, req.ip, req.get('user-agent')]
    );

    await registerAuditEvent({
      userId: user.id,
      eventType: newFailedCount >= 5 ? 'RATE_LIMIT_TRIGGERED' : 'LOGIN_FAILED',
      route: req.originalUrl,
      method: req.method,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: 401,
      details: { failed_login_count: newFailedCount }
    });

    throw new Error('Credenciales inválidas');
  }

  await pool.query(
    `
    UPDATE public.users
    SET failed_login_count = 0,
        locked_until = null,
        last_login_at = now()
    WHERE id = $1
    `,
    [user.id]
  );

  await pool.query(
    `
    INSERT INTO public.login_attempts (username, email, ip_address, was_successful, user_agent)
    VALUES ($1,$2,$3,true,$4)
    `,
    [user.username, user.email, req.ip, req.get('user-agent')]
  );

  await registerAuditEvent({
    userId: user.id,
    eventType: 'LOGIN_SUCCESS',
    route: req.originalUrl,
    method: req.method,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    statusCode: 200,
    details: { role: user.role_name }
  });

  const token = generateToken({
    sub: user.id,
    username: user.username,
    email: user.email,
    role: user.role_name
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role_name
    }
  };
};

module.exports = {
  login
};