import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index';

describe('Error Handling and Safety', () => {
  it('GET /api/non-existent returns standard 404 error envelope', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NotFoundError');
    assert.ok(res.body.error.message.includes('Route GET /api/this-route-does-not-exist'));
    assert.ok(res.body.error.requestId);
    assert.equal(res.headers['x-request-id'], res.body.error.requestId);
    // Ensure no stack traces or secrets are leaked
    assert.equal(res.body.error.stack, undefined);
    assert.equal(res.body.error.password, undefined);
  });

  it('honours and echoes incoming X-Request-ID header', async () => {
    const customId = 'req-trace-custom-999';
    const res = await request(app)
      .get('/api/this-route-does-not-exist')
      .set('X-Request-ID', customId);

    assert.equal(res.status, 404);
    assert.equal(res.headers['x-request-id'], customId);
    assert.equal(res.body.error.requestId, customId);
  });

  it('handles malformed JSON request bodies safely', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{ "invalid_json": ');

    assert.ok(res.status >= 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error.requestId);
    assert.equal(res.body.error.stack, undefined);
  });
});
