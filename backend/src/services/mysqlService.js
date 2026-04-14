const mysql = require("mysql2/promise");
const config = require("../config");

class MySQLService {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    // Create database if it doesn't exist
    const tempConn = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
    });
    await tempConn.execute(
      `CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\``,
    );
    await tempConn.end();

    this.pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
    });

    await this.createTables();
    console.log("MySQL connected successfully");
  }

  async createTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        picture VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(255) DEFAULT 'New Chat',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        conversation_id VARCHAR(36) NOT NULL,
        role ENUM('user', 'assistant', 'system') NOT NULL,
        content TEXT NOT NULL,
        sources JSON,
        analytics_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS sync_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        module VARCHAR(50) NOT NULL,
        records_synced INT DEFAULT 0,
        status ENUM('running', 'completed', 'failed') DEFAULT 'running',
        error_message TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL
      )`,
      `CREATE TABLE IF NOT EXISTS training_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category ENUM('instruction', 'knowledge', 'example', 'correction') NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
    ];

    for (const query of queries) {
      await this.pool.execute(query);
    }
  }

  // Conversation methods
  async createConversation(id, title = "New Chat") {
    await this.pool.execute(
      "INSERT INTO conversations (id, title) VALUES (?, ?)",
      [id, title],
    );
    return { id, title };
  }

  // User methods
  async findOrCreateUser(googleId, email, name, picture) {
    const [existing] = await this.pool.execute(
      "SELECT * FROM users WHERE google_id = ?",
      [googleId],
    );
    if (existing.length > 0) {
      await this.pool.execute(
        "UPDATE users SET name = ?, picture = ?, last_login = CURRENT_TIMESTAMP WHERE google_id = ?",
        [name, picture, googleId],
      );
      return existing[0];
    }
    const [result] = await this.pool.execute(
      "INSERT INTO users (google_id, email, name, picture) VALUES (?, ?, ?, ?)",
      [googleId, email, name, picture],
    );
    return { id: result.insertId, google_id: googleId, email, name, picture };
  }

  async getUserById(id) {
    const [rows] = await this.pool.execute("SELECT * FROM users WHERE id = ?", [
      id,
    ]);
    return rows[0] || null;
  }

  async getConversations() {
    const [rows] = await this.pool.execute(
      "SELECT * FROM conversations ORDER BY updated_at DESC",
    );
    return rows;
  }

  async getConversation(id) {
    const [rows] = await this.pool.execute(
      "SELECT * FROM conversations WHERE id = ?",
      [id],
    );
    return rows[0] || null;
  }

  async updateConversationTitle(id, title) {
    await this.pool.execute("UPDATE conversations SET title = ? WHERE id = ?", [
      title,
      id,
    ]);
  }

  async deleteConversation(id) {
    await this.pool.execute("DELETE FROM conversations WHERE id = ?", [id]);
  }

  // Message methods
  async addMessage(
    conversationId,
    role,
    content,
    sources = null,
    analyticsData = null,
  ) {
    const [result] = await this.pool.execute(
      "INSERT INTO messages (conversation_id, role, content, sources, analytics_data) VALUES (?, ?, ?, ?, ?)",
      [
        conversationId,
        role,
        content,
        sources ? JSON.stringify(sources) : null,
        analyticsData ? JSON.stringify(analyticsData) : null,
      ],
    );
    return result.insertId;
  }

  async getMessages(conversationId, limit = 50) {
    const [rows] = await this.pool.execute(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT ?",
      [conversationId, limit],
    );
    return rows.map((row) => ({
      ...row,
      sources: row.sources ? JSON.parse(row.sources) : [],
      analytics_data: row.analytics_data
        ? JSON.parse(row.analytics_data)
        : null,
    }));
  }

  // Sync log methods
  async createSyncLog(module) {
    const [result] = await this.pool.execute(
      "INSERT INTO sync_log (module) VALUES (?)",
      [module],
    );
    return result.insertId;
  }

  async updateSyncLog(id, status, recordsSynced, errorMessage = null) {
    await this.pool.execute(
      `UPDATE sync_log SET status = ?, records_synced = ?, error_message = ?,
       completed_at = ${status !== "running" ? "CURRENT_TIMESTAMP" : "NULL"}
       WHERE id = ?`,
      [status, recordsSynced, errorMessage, id],
    );
  }

  async getLatestSync() {
    const [rows] = await this.pool.execute(
      "SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 10",
    );
    return rows;
  }

  // Training data methods
  async addTrainingData(category, title, content) {
    const [result] = await this.pool.execute(
      "INSERT INTO training_data (category, title, content) VALUES (?, ?, ?)",
      [category, title, content],
    );
    return result.insertId;
  }

  async getTrainingData() {
    const [rows] = await this.pool.execute(
      "SELECT * FROM training_data ORDER BY category, created_at DESC",
    );
    return rows;
  }

  async getActiveTrainingData() {
    const [rows] = await this.pool.execute(
      "SELECT * FROM training_data WHERE is_active = TRUE ORDER BY category, created_at DESC",
    );
    return rows;
  }

  async updateTrainingData(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      if (["category", "title", "content", "is_active"].includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (fields.length === 0) return;
    values.push(id);
    await this.pool.execute(
      `UPDATE training_data SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );
  }

  async deleteTrainingData(id) {
    await this.pool.execute("DELETE FROM training_data WHERE id = ?", [id]);
  }
}

module.exports = new MySQLService();
