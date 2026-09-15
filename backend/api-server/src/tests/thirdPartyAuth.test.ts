import test from 'node:test';
import assert from 'node:assert/strict';
import express, { Response } from 'express';
import thirdPartyRoutes from '../routes/thirdPartyRoutes';
import { authorizeRoles } from '../middlewares/rbac';
import { AuthenticatedRequest } from '../middlewares/auth';

// Create test app with mounted third-party router
const app = express();
app.use(express.json());
app.use('/api/third-party-providers', thirdPartyRoutes);

test('Third-Party Provider API Security - Unauthenticated requests are rejected with 401', async (t) => {
  const routesToTest = [
    { method: 'GET', path: '/api/third-party-providers' },
    { method: 'GET', path: '/api/third-party-providers/stats' },
    { method: 'GET', path: '/api/third-party-providers/12345678-1234-1234-1234-123456789012' },
    { method: 'POST', path: '/api/third-party-providers' },
    { method: 'POST', path: '/api/third-party-providers/import' },
    { method: 'PUT', path: '/api/third-party-providers/12345678-1234-1234-1234-123456789012' },
    { method: 'DELETE', path: '/api/third-party-providers/12345678-1234-1234-1234-123456789012' },
  ];

  for (const route of routesToTest) {
    await t.test(`${route.method} ${route.path} returns 401 without auth header`, async () => {
      const server = app.listen(0);
      const address = server.address() as any;
      const url = `http://127.0.0.1:${address.port}${route.path}`;

      try {
        const res = await fetch(url, { method: route.method });
        assert.equal(res.status, 401);
        const data = (await res.json()) as any;
        assert.equal(data.success, false);
        assert.equal(data.error.code, 'UNAUTHORIZED');
      } finally {
        server.close();
      }
    });
  }
});

test('Third-Party Provider API Security - Invalid JWT returns 401', async () => {
  const server = app.listen(0);
  const address = server.address() as any;
  const url = `http://127.0.0.1:${address.port}/api/third-party-providers`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    assert.equal(res.status, 401);
    const data = (await res.json()) as any;
    assert.equal(data.success, false);
    assert.equal(data.error.code, 'TOKEN_EXPIRED');
  } finally {
    server.close();
  }
});

test('Third-Party Provider API Security - Role authorization logic', async (t) => {
  const rbacMiddleware = authorizeRoles('Admin', 'Operator');

  await t.test('Driver role is rejected with 403 FORBIDDEN', () => {
    const req = { user: { role: 'Driver' } } as AuthenticatedRequest;
    let status = 0;
    let jsonResult: any = null;
    let nextCalled = false;
    const res = {
      status: (code: number) => {
        status = code;
        return {
          json: (data: any) => {
            jsonResult = data;
          },
        };
      },
    } as unknown as Response;

    rbacMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(status, 403);
    assert.equal(jsonResult.success, false);
    assert.equal(jsonResult.error.code, 'FORBIDDEN');
  });

  await t.test('Operator role is allowed (calls next)', () => {
    const req = { user: { role: 'Operator' } } as AuthenticatedRequest;
    let nextCalled = false;
    const res = {} as Response;

    rbacMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  await t.test('Admin role is allowed (calls next)', () => {
    const req = { user: { role: 'Admin' } } as AuthenticatedRequest;
    let nextCalled = false;
    const res = {} as Response;

    rbacMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });

  await t.test('SuperAdmin role is allowed via Admin inheritance (calls next)', () => {
    const req = { user: { role: 'SuperAdmin' } } as AuthenticatedRequest;
    let nextCalled = false;
    const res = {} as Response;

    rbacMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
  });
});
