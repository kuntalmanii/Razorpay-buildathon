/**
 * tests/run-admin-verify.ts
 *
 * Standalone verification script for the Admin Backend Architecture.
 * Tests strict role-based access control, system overview, user management,
 * recovery monitoring, AI telemetry, policy inspection, bounded audit pagination,
 * and absence of secret leakages.
 */

import request from 'supertest';
import app from '../index';
import { setPool } from '../database/connection';
import { devMemoryStore } from '../database/devMemoryStore';
import { Pool } from 'pg';

async function runAdminVerification() {
  console.log('==============================================');
  console.log('STARTING RECOVERIQ ADMIN BACKEND VERIFICATION');
  console.log('==============================================');

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

  // ─── Test 1: Unauthenticated request to /api/admin/overview ───
  console.log('\nTest 1: Unauthenticated access to /api/admin/overview');
  const res1 = await request(app).get('/api/admin/overview');
  if (res1.status !== 401) {
    throw new Error(`Expected 401 Unauthorized, received ${res1.status}: ${JSON.stringify(res1.body)}`);
  }
  console.log('✓ Test 1 passed: 401 returned for unauthenticated request');

  // ─── Test 2: Operator login ────────────────────────────────────
  console.log('\nTest 2: Logging in as standard merchant operator (user@recoveriq.dev)');
  const opLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'user@recoveriq.dev', password: 'User@123' });
  if (opLogin.status !== 200) {
    throw new Error(`Operator login failed with status ${opLogin.status}`);
  }
  const opCookie = opLogin.headers['set-cookie'];
  console.log('✓ Test 2 passed: Operator logged in');

  // ─── Test 3-8: Operator RBAC isolation (must receive 403 Forbidden) ───
  const adminEndpoints = [
    '/api/admin/overview',
    '/api/admin/users',
    '/api/admin/recovery',
    '/api/admin/ai-decisions',
    '/api/admin/policies',
    '/api/admin/audit',
  ];

  for (let i = 0; i < adminEndpoints.length; i++) {
    const endpoint = adminEndpoints[i];
    console.log(`\nTest ${3 + i}: Operator attempts access to ${endpoint}`);
    const res = await request(app)
      .get(endpoint)
      .set('Cookie', opCookie);

    if (res.status !== 403) {
      throw new Error(`Expected 403 Forbidden for operator on ${endpoint}, received ${res.status}`);
    }
    console.log(`✓ Test ${3 + i} passed: 403 Forbidden enforced on ${endpoint}`);
  }

  // ─── Test 9: Admin login ───────────────────────────────────────
  console.log('\nTest 9: Logging in as System Administrator (admin@recoveriq.dev)');
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@recoveriq.dev', password: 'Admin@123' });
  if (adminLogin.status !== 200) {
    throw new Error(`Admin login failed with status ${adminLogin.status}`);
  }
  const adminCookie = adminLogin.headers['set-cookie'];
  console.log('✓ Test 9 passed: Admin logged in');

  // ─── Test 10: Admin access /api/admin/overview ─────────────────
  console.log('\nTest 10: Admin accesses /api/admin/overview');
  const resOverview = await request(app)
    .get('/api/admin/overview')
    .set('Cookie', adminCookie);

  if (resOverview.status !== 200) {
    throw new Error(`Expected 200 OK for admin on overview, got ${resOverview.status}: ${JSON.stringify(resOverview.body)}`);
  }
  const ov = resOverview.body;
  if (
    typeof ov.totalUsers !== 'number' ||
    typeof ov.totalRecoveryCases !== 'number' ||
    typeof ov.activeRecoveryCases !== 'number' ||
    typeof ov.blockedActions !== 'number' ||
    typeof ov.failedActions !== 'number'
  ) {
    throw new Error(`Invalid overview structure: ${JSON.stringify(ov)}`);
  }
  console.log(`✓ Test 10 passed: System overview returned (${ov.totalUsers} users, ${ov.totalRecoveryCases} cases, ${ov.activeRecoveryCases} active)`);

  // ─── Test 11: Admin user management (No password hashes) ───────
  console.log('\nTest 11: Admin accesses /api/admin/users');
  const resUsers = await request(app)
    .get('/api/admin/users')
    .set('Cookie', adminCookie);

  if (resUsers.status !== 200) {
    throw new Error(`Expected 200 OK on /api/admin/users, got ${resUsers.status}`);
  }
  const usersList = resUsers.body.users;
  if (!Array.isArray(usersList) || usersList.length === 0) {
    throw new Error(`Expected non-empty users array: ${JSON.stringify(resUsers.body)}`);
  }
  for (const u of usersList) {
    if ('password_hash' in u || 'password' in u) {
      throw new Error(`SECURITY VIOLATION: password_hash exposed in user list: ${JSON.stringify(u)}`);
    }
  }
  console.log(`✓ Test 11 passed: ${usersList.length} users returned safely without password hashes`);

  // ─── Test 12: Admin recovery monitoring ────────────────────────
  console.log('\nTest 12: Admin accesses /api/admin/recovery');
  const resRecovery = await request(app)
    .get('/api/admin/recovery')
    .set('Cookie', adminCookie);

  if (resRecovery.status !== 200) {
    throw new Error(`Expected 200 OK on /api/admin/recovery, got ${resRecovery.status}`);
  }
  const recData = resRecovery.body;
  if (!recData.statusDistribution || !recData.categoryDistribution) {
    throw new Error(`Invalid recovery monitoring structure: ${JSON.stringify(recData)}`);
  }
  console.log(`✓ Test 12 passed: Recovery monitoring returned status distribution: ${JSON.stringify(recData.statusDistribution)}`);

  // ─── Test 13: Admin AI decisions telemetry ─────────────────────
  console.log('\nTest 13: Admin accesses /api/admin/ai-decisions');
  const resAi = await request(app)
    .get('/api/admin/ai-decisions')
    .set('Cookie', adminCookie);

  if (resAi.status !== 200) {
    throw new Error(`Expected 200 OK on /api/admin/ai-decisions, got ${resAi.status}`);
  }
  const aiList = resAi.body.decisions;
  if (!Array.isArray(aiList)) {
    throw new Error(`Expected decisions array: ${JSON.stringify(resAi.body)}`);
  }
  // Verify no API keys or secrets in structured outputs
  for (const dec of aiList) {
    const serialized = JSON.stringify(dec).toLowerCase();
    if (serialized.includes('api_key') || serialized.includes('secret_key')) {
      throw new Error(`SECURITY VIOLATION: internal credentials leaked in AI decisions: ${serialized}`);
    }
  }
  console.log(`✓ Test 13 passed: AI decision telemetry verified safely (${aiList.length} decisions returned)`);

  // ─── Test 14: Admin policy monitoring ──────────────────────────
  console.log('\nTest 14: Admin accesses /api/admin/policies');
  const resPolicies = await request(app)
    .get('/api/admin/policies')
    .set('Cookie', adminCookie);

  if (resPolicies.status !== 200) {
    throw new Error(`Expected 200 OK on /api/admin/policies, got ${resPolicies.status}`);
  }
  const polData = resPolicies.body;
  if (!Array.isArray(polData.rules) || typeof polData.metrics?.approvalRatePercent !== 'number') {
    throw new Error(`Invalid policy monitoring structure: ${JSON.stringify(polData)}`);
  }
  console.log(`✓ Test 14 passed: Policy monitoring returned ${polData.rules.length} rules, approval rate: ${polData.metrics.approvalRatePercent}%`);

  // ─── Test 15: Safe bounded audit pagination ────────────────────
  console.log('\nTest 15: Admin accesses /api/admin/audit with safe pagination');
  const resAudit = await request(app)
    .get('/api/admin/audit?limit=20')
    .set('Cookie', adminCookie);

  if (resAudit.status !== 200) {
    throw new Error(`Expected 200 OK on /api/admin/audit, got ${resAudit.status}`);
  }
  if (!Array.isArray(resAudit.body.logs) || !resAudit.body.pagination) {
    throw new Error(`Invalid audit monitoring structure: ${JSON.stringify(resAudit.body)}`);
  }

  // Verify pagination clamping: limit=1000 should be clamped to <= 100
  const resAuditClamped = await request(app)
    .get('/api/admin/audit?limit=1000')
    .set('Cookie', adminCookie);

  if (resAuditClamped.body.pagination.limit > 100) {
    throw new Error(`PAGINATION SECURITY VIOLATION: limit was not clamped to <= 100, got ${resAuditClamped.body.pagination.limit}`);
  }
  console.log(`✓ Test 15 passed: Audit logs bounded safely (limit clamped to ${resAuditClamped.body.pagination.limit})`);

  // ─── Test 16: Regression check - Operator access to standard APIs ───
  console.log('\nTest 16: Operator accesses standard APIs (/api/recovery-cases, /api/auth/me)');
  const resCases = await request(app)
    .get('/api/recovery-cases')
    .set('Cookie', opCookie);

  if (resCases.status !== 200) {
    throw new Error(`Regression: Operator cannot access standard recovery cases: ${resCases.status}`);
  }
  console.log('✓ Test 16 passed: Standard recovery case APIs unaffected and fully operational');

  console.log('\n=============================================');
  console.log('ALL 16 ADMIN BACKEND VERIFICATION TESTS PASSED!');
  console.log('=============================================');
}

runAdminVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n❌ Admin verification failed:', err);
    process.exit(1);
  });
