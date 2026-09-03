/**
 * simulation/simulation-manager.ts
 *
 * DEVELOPMENT ONLY — Centralized fault injector and scenario orchestrator.
 * Proves system resiliency against external API downtime, AI hallucinations,
 * duplicate webhooks, worker crashes, and concurrent state race conditions.
 */

import { SimulationType, ActiveFaultConfig } from './simulation.types';
import { getPool } from '../database/connection';
import { logger } from '../utils/logger';
import { config } from '../config';

export class SimulationManager {
  private static activeFaults: Map<SimulationType, ActiveFaultConfig> = new Map();

  /**
   * Ensure simulations are never active in production.
   */
  private static assertDevEnvironment(): void {
    if (config.server.nodeEnv === 'production') {
      throw new Error('DEVELOPMENT ONLY: Simulations and fault injections are strictly prohibited in production');
    }
  }

  /**
   * Enable a simulated fault.
   */
  public static async injectFault(
    type: SimulationType,
    options?: { delayMs?: number; remainingTriggers?: number; metadata?: Record<string, unknown> }
  ): Promise<ActiveFaultConfig> {
    this.assertDevEnvironment();

    const fault: ActiveFaultConfig = {
      type,
      enabled: true,
      delayMs: options?.delayMs,
      remainingTriggers: options?.remainingTriggers ?? 1,
      metadata: options?.metadata,
      injectedAt: new Date().toISOString(),
    };

    this.activeFaults.set(type, fault);
    logger.warn(`[SIMULATION DEV ONLY] Injected fault: ${type}`, {
      type,
      delayMs: fault.delayMs,
      remainingTriggers: fault.remainingTriggers,
    });

    // Record fault injection in audit ledger
    await this.recordSimulationAudit('fault_injected', type, {
      options,
      status: 'active',
    });

    return fault;
  }

  /**
   * Check whether a specific fault is active and consume a trigger count.
   */
  public static async consumeFault(type: SimulationType): Promise<ActiveFaultConfig | null> {
    if (config.server.nodeEnv === 'production') {
      return null;
    }

    const fault = this.activeFaults.get(type);
    if (!fault || !fault.enabled) {
      return null;
    }

    if (fault.remainingTriggers !== undefined) {
      fault.remainingTriggers -= 1;
      if (fault.remainingTriggers <= 0) {
        this.activeFaults.delete(type);
      }
    }

    logger.warn(`[SIMULATION DEV ONLY] Triggered active fault: ${type}`);

    // Log the fault encounter in audit logs
    await this.recordSimulationAudit('fault_triggered', type, {
      delayMs: fault.delayMs,
      remainingTriggers: fault.remainingTriggers,
    });

    return fault;
  }

  /**
   * Check if fault is currently active without consuming.
   */
  public static isFaultActive(type: SimulationType): boolean {
    if (config.server.nodeEnv === 'production') return false;
    const fault = this.activeFaults.get(type);
    return !!fault && fault.enabled;
  }

  /**
   * Reset all active faults.
   */
  public static resetAll(): void {
    this.activeFaults.clear();
    logger.info('[SIMULATION DEV ONLY] Cleared all active simulated faults');
  }

  /**
   * List all currently active faults.
   */
  public static getActiveFaults(): ActiveFaultConfig[] {
    return Array.from(this.activeFaults.values());
  }

  /**
   * Record simulation event into the persistent audit_logs table.
   */
  public static async recordSimulationAudit(
    action: string,
    simulationType: SimulationType,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    try {
      const pool = getPool();
      const query = `
        INSERT INTO audit_logs (
          log_id, entity_type, entity_id, action, actor_type, actor_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING log_id;
      `;
      const logId = `sim_log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const res = await pool.query<{ log_id: string }>(query, [
        logId,
        'simulation',
        simulationType,
        `simulation_${action}`,
        'simulation_engine',
        'fault_injector',
        JSON.stringify({
          simulationType,
          timestamp: new Date().toISOString(),
          devOnly: true,
          ...metadata,
        }),
      ]);
      return res.rows[0]?.log_id ?? logId;
    } catch (err) {
      logger.error('Failed to record simulation audit log', { error: (err as Error).message });
      return `fallback_${Date.now()}`;
    }
  }
}
