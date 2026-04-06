const assert = require('node:assert/strict');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

const loadAuthMiddleware = (verifyTokenImpl) => {
  const jwtPath = path.join(projectRoot, 'utils', 'jwt.js');
  const middlewarePath = path.join(__dirname, 'auth.middleware.js');

  delete require.cache[jwtPath];
  delete require.cache[middlewarePath];

  require.cache[jwtPath] = {
    id: jwtPath,
    filename: jwtPath,
    loaded: true,
    exports: {
      verifyToken: verifyTokenImpl
    }
  };

  const moduleExports = require(middlewarePath);

  delete require.cache[middlewarePath];
  delete require.cache[jwtPath];

  return moduleExports.authMiddleware;
};

const loadAuthorizeRoles = (registerAuditEventImpl) => {
  const auditPath = path.join(projectRoot, 'utils', 'audit.js');
  const middlewarePath = path.join(__dirname, 'role.middleware.js');

  delete require.cache[auditPath];
  delete require.cache[middlewarePath];

  require.cache[auditPath] = {
    id: auditPath,
    filename: auditPath,
    loaded: true,
    exports: {
      registerAuditEvent: registerAuditEventImpl
    }
  };

  const moduleExports = require(middlewarePath);

  delete require.cache[middlewarePath];
  delete require.cache[auditPath];

  return moduleExports.authorizeRoles;
};

const createResponse = () => {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
};

const tests = [
  {
    name: 'authMiddleware responde 401 cuando no hay token',
    run: () => {
      const authMiddleware = loadAuthMiddleware(() => {
        throw new Error('No deberia validar sin token');
      });

      const req = { cookies: {} };
      const res = createResponse();
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.deepEqual(res.body, { message: 'No autenticado' });
    }
  },
  {
    name: 'authMiddleware agrega req.user cuando el token es valido',
    run: () => {
      const authMiddleware = loadAuthMiddleware(() => ({
        sub: 17,
        username: 'karen',
        email: 'karen@example.com',
        role: 'SuperAdmin'
      }));

      const req = { cookies: { token: 'token-valido' } };
      const res = createResponse();
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
      assert.deepEqual(req.user, {
        id: 17,
        username: 'karen',
        email: 'karen@example.com',
        role: 'SuperAdmin'
      });
    }
  },
  {
    name: 'authMiddleware responde 401 cuando el token es invalido',
    run: () => {
      const authMiddleware = loadAuthMiddleware(() => {
        throw new Error('Token invalido');
      });

      const req = { cookies: { token: 'token-invalido' } };
      const res = createResponse();
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.deepEqual(res.body, { message: 'Token inválido o expirado' });
    }
  },
  {
    name: 'authorizeRoles responde 401 cuando req.user no existe',
    run: async () => {
      const authorizeRoles = loadAuthorizeRoles(async () => {});
      const middleware = authorizeRoles('SuperAdmin');
      const req = {};
      const res = createResponse();
      let nextCalled = false;

      await middleware(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.deepEqual(res.body, { message: 'No autenticado' });
    }
  },
  {
    name: 'authorizeRoles permite continuar cuando el rol esta autorizado',
    run: async () => {
      const auditCalls = [];
      const authorizeRoles = loadAuthorizeRoles(async (payload) => {
        auditCalls.push(payload);
      });
      const middleware = authorizeRoles('SuperAdmin', 'Admin');
      const req = {
        user: {
          id: 22,
          role: 'Admin'
        }
      };
      const res = createResponse();
      let nextCalled = false;

      await middleware(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, true);
      assert.equal(auditCalls.length, 0);
    }
  },
  {
    name: 'authorizeRoles responde 403 y registra auditoria cuando el rol no esta permitido',
    run: async () => {
      const auditCalls = [];
      const authorizeRoles = loadAuthorizeRoles(async (payload) => {
        auditCalls.push(payload);
      });
      const middleware = authorizeRoles('SuperAdmin');
      const req = {
        user: {
          id: 9,
          role: 'Analyst'
        },
        originalUrl: '/api/protected/admin-only',
        method: 'GET',
        ip: '127.0.0.1',
        get(header) {
          return header === 'user-agent' ? 'node-test' : undefined;
        }
      };
      const res = createResponse();
      let nextCalled = false;

      await middleware(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.body, { message: 'Acceso denegado' });
      assert.equal(auditCalls.length, 1);
      assert.deepEqual(auditCalls[0], {
        userId: 9,
        eventType: 'ACCESS_DENIED',
        route: '/api/protected/admin-only',
        method: 'GET',
        ipAddress: '127.0.0.1',
        userAgent: 'node-test',
        statusCode: 403,
        details: {
          required_roles: ['SuperAdmin'],
          actual_role: 'Analyst'
        }
      });
    }
  }
];

const run = async () => {
  let failures = 0;

  for (const currentTest of tests) {
    try {
      await currentTest.run();
      console.log(`PASS ${currentTest.name}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${currentTest.name}`);
      console.error(error);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
    return;
  }

  console.log(`OK ${tests.length} pruebas pasaron`);
};

run();
