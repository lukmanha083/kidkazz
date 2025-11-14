import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Users table
 * Stores user accounts for both retail and wholesale customers
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),

  // Authentication
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),

  // Profile
  fullName: text('full_name').notNull(),
  phoneNumber: text('phone_number'),

  // User type
  userType: text('user_type').notNull(), // 'retail' | 'wholesale' | 'admin'

  // Status
  status: text('status').default('active').notNull(), // 'active' | 'inactive' | 'suspended'
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),

  // Wholesale-specific fields
  companyName: text('company_name'),
  businessLicense: text('business_license'),
  taxId: text('tax_id'),

  // Security
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  failedLoginAttempts: integer('failed_login_attempts').default(0),

  // Audit fields
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Refresh tokens table
 * Stores JWT refresh tokens for secure authentication
 */
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  token: text('token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),

  isRevoked: integer('is_revoked', { mode: 'boolean' }).default(false),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * User addresses table
 * Stores shipping addresses for users
 */
export const userAddresses = sqliteTable('user_addresses', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  label: text('label').notNull(), // 'home' | 'office' | 'warehouse' etc.
  recipientName: text('recipient_name').notNull(),
  phoneNumber: text('phone_number').notNull(),

  addressLine1: text('address_line1').notNull(),
  addressLine2: text('address_line2'),
  city: text('city').notNull(),
  province: text('province').notNull(),
  postalCode: text('postal_code').notNull(),
  country: text('country').default('Indonesia').notNull(),

  isDefault: integer('is_default', { mode: 'boolean' }).default(false),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Types inferred from the schema
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = typeof refreshTokens.$inferInsert;

export type UserAddress = typeof userAddresses.$inferSelect;
export type InsertUserAddress = typeof userAddresses.$inferInsert;
