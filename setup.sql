-- CRM Analytics MySQL Setup Script
-- Run this after creating the database: mysql -u root -p crm_analytics < setup.sql

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  google_id VARCHAR(255),
  token_hash VARCHAR(255),
  role ENUM('user', 'admin') DEFAULT 'user',
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_google_id (google_id),
  INDEX idx_role (role)
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) DEFAULT 'New Chat',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(50) NOT NULL,
  content LONGTEXT NOT NULL,
  sources JSON,
  analytics_hints JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_conversation_id (conversation_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Create training data table
CREATE TABLE IF NOT EXISTS training_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(100) NOT NULL,
  title VARCHAR(255),
  content LONGTEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_active (active)
);

-- Create chat history table for analytics
CREATE TABLE IF NOT EXISTS chat_analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  conversation_id INT,
  query_type VARCHAR(100),
  module_accessed VARCHAR(100),
  response_time_ms INT,
  tokens_used INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Sample training data
INSERT INTO training_data (category, title, content, active) VALUES
  ('instruction', NULL, 'Always provide actionable insights, not just data dumps', TRUE),
  ('instruction', NULL, 'Format large result sets as summaries with key highlights', TRUE),
  ('knowledge', 'Company Fiscal Year', 'Our fiscal year runs from January to December', TRUE),
  ('knowledge', 'Sales Process', 'Standard sales process: Lead → Prospect → Opportunity → Deal → Customer', TRUE),
  ('correction', NULL, 'When users ask for "top leads", include lead score and expected value', TRUE),
  ('correction', NULL, 'Always mention data confidence and any assumptions made', TRUE)
ON DUPLICATE KEY UPDATE active = VALUES(active);

-- Set proper permissions
GRANT ALL PRIVILEGES ON crm_analytics.* TO 'root'@'localhost';
FLUSH PRIVILEGES;

-- Verify tables created
SHOW TABLES;
