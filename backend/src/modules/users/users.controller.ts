/**
 * modules/users/users.controller.ts
 *
 * Admin controller for user management endpoints.
 */

import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { sendSuccess } from '../../utils/response';
import { NotFoundError } from '../../utils/errors';

export class UsersController {
  /**
   * GET /api/users
   * Admin only: list all users in the system.
   */
  static async list(req: Request, res: Response): Promise<void> {
    const users = await UsersService.listUsers();
    sendSuccess(res, { users }, 200);
  }

  /**
   * GET /api/users/:id
   * Admin only: get user details by ID.
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const user = await UsersService.getUserById(id);
    if (!user) {
      throw new NotFoundError(`User ${id}`);
    }
    sendSuccess(res, { user }, 200);
  }
}
