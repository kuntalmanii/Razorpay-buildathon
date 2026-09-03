/**
 * modules/admin/admin.controller.ts
 *
 * Controller handling all /api/admin/* endpoints.
 * Provides structured JSON responses for administrative monitoring.
 */

import { Request, Response } from 'express';
import { AdminService } from './admin.service';

export class AdminController {
  /**
   * GET /api/admin/overview
   */
  static async getOverview(_req: Request, res: Response): Promise<void> {
    const overview = await AdminService.getOverview();
    res.status(200).json(overview);
  }

  /**
   * GET /api/admin/users
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    const role = req.query.role as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const data = await AdminService.getUsers({ role, page, limit });
    res.status(200).json(data);
  }

  /**
   * GET /api/admin/recovery
   */
  static async getRecovery(_req: Request, res: Response): Promise<void> {
    const data = await AdminService.getRecoveryMonitoring();
    res.status(200).json(data);
  }

  /**
   * GET /api/admin/ai-decisions
   */
  static async getAiDecisions(req: Request, res: Response): Promise<void> {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const data = await AdminService.getAiDecisions({ page, limit });
    res.status(200).json(data);
  }

  /**
   * GET /api/admin/policies
   */
  static async getPolicies(_req: Request, res: Response): Promise<void> {
    const data = await AdminService.getPolicies();
    res.status(200).json(data);
  }

  /**
   * GET /api/admin/audit
   */
  static async getAudit(req: Request, res: Response): Promise<void> {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const entityType = req.query.entity_type as string | undefined;
    const actorType = req.query.actor_type as string | undefined;
    const action = req.query.action as string | undefined;

    const data = await AdminService.getAuditLogs({
      page,
      limit,
      entityType,
      actorType,
      action,
    });
    res.status(200).json(data);
  }
}
