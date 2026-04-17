-- Run this script in phpMyAdmin or your MySQL client to update the users table schema

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add indexes if not present
CREATE INDEX IF NOT EXISTS idx_role ON users(role);
