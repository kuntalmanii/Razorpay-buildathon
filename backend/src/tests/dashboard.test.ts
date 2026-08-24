import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../index';
import { setPool } from '../database/connection';
import { Pool } from 'pg';

describe('Dashboard Summary API', () => {
  let mockPool: unknown;

  beforeEach(() => {
    mockPool = {
      query: async (sql: string) => {
        if (sql.includes('GROUP BY status')) {
          return {
            rows: [
              { status: 'open', count: 5 },
              { status: 'in_progress', count: 2 },
              { status: 'recovered', count: 8 },
              { status: 'unrecoverable', count: 1 },
            ],
          };
        }
        if (sql.includes('SUM(amount_at_risk)')) {
          return {
            rows: [
              { total_at_risk: '1500000', total_recovered: '800000' },
            ],
          };
        }
        return { rows: [] };
      },
      connect: async () => ({
        query: async () => ({ rows: [{ '?column?': 1 }] }),
        release: () => {},
      }),
      totalCount: 1,
      idleCount: 1,
      waitingCount: 0,
      on: () => {},
    };

    setPool(mockPool as Pool);
  });

  afterEach(() => {
    setPool(null);
  });

  it('GET /api/dashboard/summary returns aggregated metrics in standard envelope', async () => {
    const res = await request(app).get('/api/dashboard/summary');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const data = res.body.data;
    assert.equal(data.cases.total, 16);
    assert.equal(data.cases.open, 5);
    assert.equal(data.cases.in_progress, 2);
    assert.equal(data.cases.recovered, 8);
    assert.equal(data.cases.unrecoverable, 1);
    assert.equal(data.revenue.total_at_risk_paise, '1500000');
    assert.equal(data.revenue.total_recovered_paise, '800000');
    assert.ok(data.revenue.recovery_rate_pct > 0);
  });
});
