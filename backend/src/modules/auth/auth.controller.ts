/**
 * modules/auth/auth.controller.ts
 *
 * Handles all /api/auth/* HTTP endpoints.
 * Follows the existing pattern: static class, asyncHandler wraps, sendSuccess responds.
 *
 * Cookie strategy: httpOnly, sameSite=lax, secure in production.
 * The frontend never reads the token directly — it calls GET /api/auth/me instead.
 */

import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';
import { config } from '../../config';

const COOKIE_NAME = 'recoveriq_token';
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.server.isProduction,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
    path: '/',
  });
}

function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: config.server.isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

export class AuthController {
  /**
   * POST /api/auth/register
   * Body: { name, email, password }
   * Creates a new user account (default role: 'user').
   */
  static async register(req: Request, res: Response): Promise<void> {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || name.trim().length < 2) {
      throw new ValidationError('Name must be at least 2 characters', { name: 'Name is required (min 2 characters)' });
    }
    if (!email || !email.includes('@')) {
      throw new ValidationError('A valid email address is required', { email: 'Valid email is required' });
    }
    if (!password || password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters', { password: 'Password must be at least 8 characters' });
    }

    const user = await AuthService.register(name, email, password, 'user');
    const token = AuthService.signToken({
      userId: user.user_id,
      email: user.email,
      role: user.role,
    });

    setAuthCookie(res, token);
    sendSuccess(res, { user }, 201);
  }

  /**
   * POST /api/auth/login
   * Body: { email, password }
   * Returns authenticated user and sets httpOnly cookie.
   */
  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await AuthService.login(email, password);
    const token = AuthService.signToken({
      userId: user.user_id,
      email: user.email,
      role: user.role,
    });

    setAuthCookie(res, token);
    sendSuccess(res, { user }, 200);
  }

  /**
   * POST /api/auth/logout
   * Clears the auth cookie. No body required.
   */
  static async logout(req: Request, res: Response): Promise<void> {
    clearAuthCookie(res);
    sendSuccess(res, { message: 'Logged out successfully' }, 200);
  }

  /**
   * GET /api/auth/me
   * Returns the currently authenticated user (requires valid JWT).
   * The jwtAuth middleware populates req.user before this handler runs.
   */
  static async me(req: Request, res: Response): Promise<void> {
    const { userId } = req.user!;
    const user = await AuthService.findById(userId);
    sendSuccess(res, { user }, 200);
  }
}
