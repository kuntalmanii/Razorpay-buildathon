import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index';

describe('Health Endpoints', () => {
  it('GET /health returns process health in standard envelope', async () => {
    const res = await request(app).get('/health');
    assert.ok(res.status === 200 || res.status === 207);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.service, 'recoveriq-backend');
    assert.ok(res.body.data.timestamp);
    assert.ok(res.body.data.database);
    assert.ok(res.headers['x-request-id']);
  });

  it('GET /api/health returns health in standard envelope with request ID', async () => {
    const res = await request(app).get('/api/health');
    assert.ok(res.status === 200 || res.status === 207);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.service, 'recoveriq-backend');
    assert.ok(res.body.data.environment);
    assert.ok(res.headers['x-request-id']);
  });

  it('GET /health/db returns database health report', async () => {
    const res = await request(app).get('/health/db');
    assert.ok(res.status === 200 || res.status === 503);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.status === 'ok' || res.body.data.status === 'error');
  });
});
