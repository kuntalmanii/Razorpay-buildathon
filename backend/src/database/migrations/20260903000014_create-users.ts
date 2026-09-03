/**
 * migrations/20260903000014_create-users.ts
 *
 * Creates the `users` table for RecoverIQ authentication.
 * Roles: 'user' (merchant operator) | 'admin' (system administrator)
 */

import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Add user_role enum if it doesn't exist
  pgm.createType('user_role', ['user', 'admin']);

  pgm.createTable('users', {
    user_id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
      notNull: true,
    },
    name: {
      type: 'text',
      notNull: true,
    },
    email: {
      type: 'text',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'text',
      notNull: true,
    },
    role: {
      type: 'user_role',
      notNull: true,
      default: 'user',
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Index for fast email lookup during login
  pgm.createIndex('users', 'email', { unique: true, name: 'idx_users_email' });
  pgm.createIndex('users', 'role', { name: 'idx_users_role' });

  // Auto-update updated_at on row change
  pgm.sql(`
    CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('users');
  pgm.dropType('user_role');
}
