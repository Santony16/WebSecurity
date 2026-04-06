const rateLimit = require('express-rate-limit');

//limita por IP un max de 5 intentos en 5min, si lo excede presenta mensaje
const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: {
    message: 'Demasiados intentos. Intenta nuevamente en 5 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  loginRateLimiter
};