-- User Service Schema
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  user_type TEXT NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  email_verified INTEGER DEFAULT 0,
  company_name TEXT,
  business_license TEXT,
  tax_id TEXT,
  last_login_at INTEGER,
  failed_login_attempts INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);
