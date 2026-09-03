import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index';
import { setPool } from '../database/connection';
import { devMemoryStore } from '../database/devMemoryStore';
import { Pool } from 'pg';

async function run() {
  console.log('--- Setting up dev fallback pool ---');
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

  console.log('Test 1: Unauthenticated request to protected route /api/recovery-cases');
  const t1 = await request(app).get('/api/recovery-cases');
  assert.equal(t1.status, 401, 'Should return 401');
  assert.equal(t1.body.success, false);
  console.log('✓ Test 1 passed: 401 returned for unauthenticated request');

  console.log('Test 2: Invalid login credentials');
  const t2 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'user@recoveriq.dev', password: 'WrongPassword' });
  assert.equal(t2.status, 401);
  assert.equal(t2.body.success, false);
  console.log('✓ Test 2 passed: 401 returned for invalid password');

  console.log('Test 3: Valid operator login');
  const t3 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'user@recoveriq.dev', password: 'User@123' });
  assert.equal(t3.status, 200);
  assert.equal(t3.body.success, true);
  assert.equal(t3.body.data.user.role, 'user');
  assert.equal(t3.body.data.user.password_hash, undefined);
  const rawCookie = t3.headers['set-cookie'];
  const userCookie = (Array.isArray(rawCookie) ? rawCookie.join(';') : rawCookie).split(';')[0];
  console.log('✓ Test 3 passed: 200 returned, cookie received, role is user');

  console.log('Test 4: /api/auth/me with user cookie');
  const t4 = await request(app).get('/api/auth/me').set('Cookie', userCookie);
  assert.equal(t4.status, 200);
  assert.equal(t4.body.data.user.email, 'user@recoveriq.dev');
  console.log('✓ Test 4 passed: /api/auth/me returns operator user profile');

  console.log('Test 5: Access protected recovery-cases with operator cookie');
  const t5 = await request(app).get('/api/recovery-cases').set('Cookie', userCookie);
  assert.equal(t5.status, 200);
  assert.equal(t5.body.success, true);
  assert.ok(Array.isArray(t5.body.data));
  console.log('✓ Test 5 passed: Operator can access recovery cases (' + t5.body.data.length + ' cases returned)');

  console.log('Test 6: Operator attempts to access admin route /api/users (RBAC check)');
  const t6 = await request(app).get('/api/users').set('Cookie', userCookie);
  assert.equal(t6.status, 403, 'Operator must be blocked from /api/users with 403');
  assert.equal(t6.body.success, false);
  console.log('✓ Test 6 passed: RBAC successfully blocked operator with 403 Forbidden');

  console.log('Test 7: Valid admin login');
  const t7 = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@recoveriq.dev', password: 'Admin@123' });
  assert.equal(t7.status, 200);
  assert.equal(t7.body.data.user.role, 'admin');
  const adminRawCookie = t7.headers['set-cookie'];
  const adminCookie = (Array.isArray(adminRawCookie) ? adminRawCookie.join(';') : adminRawCookie).split(';')[0];
  console.log('✓ Test 7 passed: Admin logged in, role is admin');

  console.log('Test 8: Admin accesses /api/users');
  const t8 = await request(app).get('/api/users').set('Cookie', adminCookie);
  assert.equal(t8.status, 200);
  assert.equal(t8.body.success, true);
  assert.ok(Array.isArray(t8.body.data.users));
  assert.ok(t8.body.data.users.length >= 2);
  console.log('✓ Test 8 passed: Admin successfully accessed /api/users (' + t8.body.data.users.length + ' users returned)');

  console.log('Test 9: User registration');
  const uniqueEmail = `op_${Date.now()}@merchant.test`;
  const t9 = await request(app)
    .post('/api/auth/register')
    .send({ name: 'New Merchant', email: uniqueEmail, password: 'StrongPassword123' });
  assert.equal(t9.status, 201);
  assert.equal(t9.body.data.user.email, uniqueEmail);
  assert.equal(t9.body.data.user.role, 'user');
  console.log('✓ Test 9 passed: User registered with 201 Created');

  console.log('Test 10: Logout');
  const t10 = await request(app).post('/api/auth/logout');
  assert.equal(t10.status, 200);
  const logoutCookie = t10.headers['set-cookie'];
  assert.ok(logoutCookie, 'Should set-cookie to clear');
  console.log('✓ Test 10 passed: Logout cleared cookie');

  console.log('Test 11: Webhook HMAC exemption');
  const t11 = await request(app).post('/api/webhooks/razorpay').send({ event: 'payment.failed' });
  // Missing signature causes 401 Unauthorized from HMAC validator, NOT missing JWT
  assert.equal(t11.status, 401);
  assert.ok(t11.body.error.message.includes('signature') || t11.body.error.message.includes('HMAC'));
  console.log('✓ Test 11 passed: Webhook route preserved with HMAC validation');

  console.log('\n=============================================');
  console.log('ALL 11 AUTH & RBAC VERIFICATION TESTS PASSED!');
  console.log('=============================================\n');

  process.exit(0);
}

run().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
