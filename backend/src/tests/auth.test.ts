import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index';
import { setPool } from '../database/connection';
import { devMemoryStore } from '../database/devMemoryStore';
import { Pool } from 'pg';

describe('RecoverIQ Authentication & RBAC Architecture', () => {
  let userCookie: string;
  let adminCookie: string;

  before(() => {
    setPool({
      query: async (sql: string, params: unknown[] = []) => devMemoryStore.query(sql, params),
      connect: async () => ({
        query: async (sql: string, params: unknown[] = []) => devMemoryStore.query(sql, params),
        release: () => {},
      }),
      totalCount: 1,
      idleCount: 1,
      waitingCount: 0,
      on: () => {},
      end: async () => {},
    } as unknown as Pool);
  });

  after(() => {
    setPool(null);
  });

  it('1. GET /api/recovery-cases without auth returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/recovery-cases');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('2. POST /api/auth/login with invalid credentials returns 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@recoveriq.dev', password: 'WrongPassword!' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  it('3. POST /api/auth/login with valid user credentials returns 200 and sets httpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@recoveriq.dev', password: 'User@123' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, 'user@recoveriq.dev');
    assert.equal(res.body.data.user.role, 'user');
    assert.equal(res.body.data.user.password_hash, undefined); // Never leak hash

    // Check cookie
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies, 'Should set-cookie header');
    const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies;
    assert.ok(cookieStr.includes('recoveriq_token='), 'Cookie name should be recoveriq_token');
    assert.ok(cookieStr.includes('HttpOnly'), 'Cookie must be HttpOnly');

    userCookie = cookieStr.split(';')[0];
  });

  it('4. GET /api/auth/me with user cookie returns user identity', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', userCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, 'user@recoveriq.dev');
    assert.equal(res.body.data.user.role, 'user');
  });

  it('5. GET /api/recovery-cases with valid user cookie returns 200 and existing recovery data', async () => {
    const res = await request(app)
      .get('/api/recovery-cases')
      .set('Cookie', userCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.cases));
  });

  it('6. GET /api/users with standard user cookie returns 403 Forbidden (RBAC)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', userCookie);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.message.includes('Access denied'));
  });

  it('7. POST /api/auth/login with admin credentials succeeds and sets admin cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@recoveriq.dev', password: 'Admin@123' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.role, 'admin');

    const cookies = res.headers['set-cookie'];
    const cookieStr = Array.isArray(cookies) ? cookies.join(';') : cookies;
    adminCookie = cookieStr.split(';')[0];
  });

  it('8. GET /api/users with admin cookie returns 200 and list of registered users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Cookie', adminCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.users));
    assert.ok(res.body.data.users.length >= 2);
  });

  it('9. POST /api/auth/register registers a new operator and returns 201', async () => {
    const uniqueEmail = `test.operator.${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'New Operator',
        email: uniqueEmail,
        password: 'Password@999',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.user.email, uniqueEmail);
    assert.equal(res.body.data.user.role, 'user');
  });

  it('10. POST /api/auth/logout clears auth cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const cookies = res.headers['set-cookie'];
    const cookieStr = Array.isArray(cookies) ? cookies.join(';') : (cookies || '');
    assert.ok(cookieStr.includes('recoveriq_token=;') || cookieStr.includes('Max-Age=0') || cookieStr.includes('expires='));
  });

  it('11. Webhooks route is exempt from token check (delegates to HMAC validation)', async () => {
    // Sending empty body/missing HMAC to webhook will fail with 401 Unauthorized DUE TO HMAC, NOT because of missing JWT
    const res = await request(app)
      .post('/api/webhooks/razorpay')
      .send({ event: 'payment.failed' });

    assert.equal(res.status, 401);
    assert.ok(res.body.error.message.includes('signature') || res.body.error.message.includes('HMAC'));
  });
});
