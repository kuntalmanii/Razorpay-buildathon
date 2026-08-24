import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index';
import { parsePagination } from '../validators/pagination';
import { parseCasesFilter, parseActionsFilter } from '../validators/cases';
import { ValidationError } from '../utils/errors';

describe('Validation Logic and Error Responses', () => {
  describe('Pagination Validator Unit Tests', () => {
    it('parses default pagination when no params provided', () => {
      const result = parsePagination({});
      assert.equal('error' in result, false);
      if (!('error' in result)) {
        assert.equal(result.page, 1);
        assert.equal(result.limit, 20);
        assert.equal(result.offset, 0);
      }
    });

    it('parses valid page and limit', () => {
      const result = parsePagination({ page: '3', limit: '50' });
      assert.equal('error' in result, false);
      if (!('error' in result)) {
        assert.equal(result.page, 3);
        assert.equal(result.limit, 50);
        assert.equal(result.offset, 100);
      }
    });

    it('rejects invalid page number', () => {
      const result = parsePagination({ page: '-5' });
      assert.ok('error' in result);
      if ('error' in result && result.error) {
        assert.ok(result.error instanceof ValidationError);
        assert.ok(result.error.fields?.page);
      }
    });

    it('rejects limit out of range (> 100)', () => {
      const result = parsePagination({ limit: '500' });
      assert.ok('error' in result);
      if ('error' in result && result.error) {
        assert.ok(result.error instanceof ValidationError);
        assert.ok(result.error.fields?.limit);
      }
    });
  });

  describe('Cases and Actions Filter Validator Unit Tests', () => {
    it('parses valid case status and failure category', () => {
      const result = parseCasesFilter({ status: 'open', failure_category: 'bank_decline' });
      assert.ok(!(result instanceof ValidationError));
      if (!(result instanceof ValidationError)) {
        assert.equal(result.status, 'open');
        assert.equal(result.failure_category, 'bank_decline');
      }
    });

    it('rejects invalid case status', () => {
      const result = parseCasesFilter({ status: 'unknown_status' });
      assert.ok(result instanceof ValidationError);
      assert.ok(result.fields?.status);
    });

    it('rejects invalid failure category', () => {
      const result = parseCasesFilter({ failure_category: 'invalid_cat' });
      assert.ok(result instanceof ValidationError);
      assert.ok(result.fields?.failure_category);
    });

    it('parses valid action execution status', () => {
      const result = parseActionsFilter({ execution_status: 'completed', case_id: 'case-123' });
      assert.ok(!(result instanceof ValidationError));
      if (!(result instanceof ValidationError)) {
        assert.equal(result.execution_status, 'completed');
        assert.equal(result.case_id, 'case-123');
      }
    });

    it('rejects invalid action execution status', () => {
      const result = parseActionsFilter({ execution_status: 'invalid_exec' });
      assert.ok(result instanceof ValidationError);
      assert.ok(result.fields?.execution_status);
    });
  });

  describe('HTTP Validation Middleware Endpoints', () => {
    it('GET /api/recovery-cases with invalid page returns 400 with fields', async () => {
      const res = await request(app).get('/api/recovery-cases?page=invalid');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'ValidationError');
      assert.ok(res.body.error.requestId);
      assert.ok(res.body.error.fields?.page);
    });

    it('GET /api/recovery-cases with invalid status returns 400 with fields', async () => {
      const res = await request(app).get('/api/recovery-cases?status=non_existent');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'ValidationError');
      assert.ok(res.body.error.requestId);
      assert.ok(res.body.error.fields?.status);
    });

    it('GET /api/metrics with invalid days parameter returns 400', async () => {
      const res = await request(app).get('/api/metrics?days=9999');
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.error.code, 'ValidationError');
      assert.ok(res.body.error.fields?.days);
    });
  });
});
