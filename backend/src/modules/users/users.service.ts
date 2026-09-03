/**
 * modules/users/users.service.ts
 *
 * User management service for system administrators.
 * Returns safe user objects (password_hash is excluded).
 */

import { getPool } from '../../database/connection';
import { User } from '../../types/domain';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export class UsersService {
  /**
   * List all users for admin view. Excludes password_hash.
   */
  static async listUsers(): Promise<UserSummary[]> {
    const pool = getPool();
    const res = await pool.query<User>(
      `SELECT user_id, name, email, role, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    return res.rows.map((row) => ({
      id: row.user_id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString(),
      updatedAt: typeof row.updated_at === 'string' ? row.updated_at : row.updated_at.toISOString(),
    }));
  }

  /**
   * Find a user by id.
   */
  static async getUserById(userId: string): Promise<UserSummary | null> {
    const pool = getPool();
    const res = await pool.query<User>(
      `SELECT user_id, name, email, role, created_at, updated_at
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    return {
      id: row.user_id,
      name: row.name,
      email: row.email,
      role: row.role,
      createdAt: typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString(),
      updatedAt: typeof row.updated_at === 'string' ? row.updated_at : row.updated_at.toISOString(),
    };
  }
}
