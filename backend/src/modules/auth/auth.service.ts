/**
 * modules/auth/auth.service.ts
 *
 * Core authentication service:
 *  - Password hashing and verification using bcryptjs
 *  - JWT signing and verification
 *  - User lookup from database
 *
 * Never exposes password_hash in return values.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../../database/connection';
import { config } from '../../config';
import { UnauthorizedError, ConflictError, NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export type UserRole = 'user' | 'admin';

export interface AuthUser {
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

const BCRYPT_ROUNDS = 12;

export class AuthService {
  /**
   * Hash a plain-text password.
   */
  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, BCRYPT_ROUNDS);
  }

  /**
   * Verify a plain-text password against a bcrypt hash.
   */
  static async verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /**
   * Sign a JWT with the configured secret.
   */
  static signToken(payload: JwtPayload): string {
    const secret = config.auth.jwtSecret;
    const expiresIn = config.auth.jwtExpiresIn;
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  /**
   * Verify and decode a JWT.
   * Throws UnauthorizedError on any failure.
   */
  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, config.auth.jwtSecret) as JwtPayload;
    } catch (err) {
      const msg = (err as Error).message || 'Invalid token';
      throw new UnauthorizedError(`Token verification failed: ${msg}`);
    }
  }

  /**
   * Look up a user by email (returns null if not found).
   * Includes password_hash for internal credential verification only.
   */
  static async findByEmailWithHash(
    email: string
  ): Promise<(AuthUser & { password_hash: string }) | null> {
    const pool = getPool();
    const res = await pool.query<AuthUser & { password_hash: string }>(
      `SELECT user_id, name, email, password_hash, role, is_active, created_at
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    return res.rows[0] || null;
  }

  /**
   * Look up a user by ID (safe — no password_hash).
   */
  static async findById(userId: string): Promise<AuthUser | null> {
    const pool = getPool();
    const res = await pool.query<AuthUser>(
      `SELECT user_id, name, email, role, is_active, created_at
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );
    return res.rows[0] || null;
  }

  /**
   * Register a new user.
   * Throws ConflictError if email is already taken.
   */
  static async register(
    name: string,
    email: string,
    password: string,
    role: UserRole = 'user'
  ): Promise<AuthUser> {
    const pool = getPool();
    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing email
    const existing = await AuthService.findByEmailWithHash(normalizedEmail);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await AuthService.hashPassword(password);

    const res = await pool.query<AuthUser>(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, name, email, role, is_active, created_at`,
      [name.trim(), normalizedEmail, passwordHash, role]
    );

    logger.info(`New user registered: ${normalizedEmail} (role: ${role})`);
    return res.rows[0];
  }

  /**
   * Authenticate a user with email + password.
   * Returns the AuthUser if credentials are valid.
   * Throws UnauthorizedError on any failure (timing-safe — no user enumeration).
   */
  static async login(email: string, password: string): Promise<AuthUser> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await AuthService.findByEmailWithHash(normalizedEmail);

    // Always run bcrypt.compare to prevent timing attacks even when user not found
    const dummyHash = '$2b$12$invalidhashfortimingprotection000000000000000000000000000';
    const hashToCheck = user ? user.password_hash : dummyHash;
    const isValid = await bcrypt.compare(password, hashToCheck);

    if (!user || !isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('Account is deactivated. Please contact support.');
    }

    logger.info(`User logged in: ${normalizedEmail}`);
    const { password_hash: _, ...safeUser } = user;
    return safeUser as AuthUser;
  }
}
