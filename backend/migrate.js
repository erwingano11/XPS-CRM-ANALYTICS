require("dotenv").config();
const mysql = require("mysql2/promise");

const config = {
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.MYSQL_PORT || "3306", 10),
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "crm_analytics",
};

async function runMigrations() {
  const conn = await mysql.createConnection(config);
  console.log("Connected to MySQL:", config.database);

  const migrations = [
    // Users table: add role, is_approved, updated_at
    `ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,

    // Conversations table: add user_id column
    `ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS user_id INT`,

    // Add foreign key on conversations.user_id if not exists (ignore error if already exists)
    `ALTER TABLE conversations
      ADD CONSTRAINT fk_conversations_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`,

    // Messages table: update user_id to allow NULL (for assistant messages)
    `ALTER TABLE messages
      MODIFY COLUMN IF EXISTS user_id INT NULL`,

    // Add index on users.role
    `CREATE INDEX IF NOT EXISTS idx_role ON users(role)`,

    // Add index on users.is_approved
    `CREATE INDEX IF NOT EXISTS idx_is_approved ON users(is_approved)`,

    // Add index on conversations.user_id
    `CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)`,
  ];

  for (const sql of migrations) {
    try {
      await conn.execute(sql);
      console.log("✓ OK:", sql.slice(0, 80).replace(/\s+/g, " ").trim());
    } catch (err) {
      if (
        err.code === "ER_DUP_KEYNAME" ||
        err.code === "ER_FK_DUP_NAME" ||
        err.code === "ER_DUP_FIELDNAME" ||
        err.message.includes("Duplicate key name") ||
        err.message.includes("already exists")
      ) {
        console.log(
          "~ Skipped (already exists):",
          sql.slice(0, 60).replace(/\s+/g, " ").trim(),
        );
      } else {
        console.error("✗ Error:", err.message);
        console.error("  SQL:", sql.slice(0, 80).replace(/\s+/g, " ").trim());
      }
    }
  }

  await conn.end();
  console.log("\nMigration complete.");
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
