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
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('user', 'admin') DEFAULT 'user'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id INT`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id INT NULL`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS analytics_data JSON`,
    `CREATE INDEX IF NOT EXISTS idx_role ON users(role)`,
    `CREATE INDEX IF NOT EXISTS idx_is_approved ON users(is_approved)`,
    `CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)`,
  ];

  for (const sql of migrations) {
    try {
      await conn.execute(sql);
      console.log("OK:", sql.slice(0, 80).replace(/\s+/g, " ").trim());
    } catch (err) {
      if (err.code === "ER_DUP_KEYNAME" || err.code === "ER_DUP_FIELDNAME" || err.message.includes("already exists")) {
        console.log("Skipped:", sql.slice(0, 60).replace(/\s+/g, " ").trim());
      } else {
        console.error("Error:", err.message);
      }
    }
  }

  // Auto-promote first user to admin if no admin exists
  const [[{ adminCount }]] = await conn.execute("SELECT COUNT(*) AS adminCount FROM users WHERE role = 'admin'");
  if (Number(adminCount) === 0) {
    const [rows] = await conn.execute("SELECT id, email FROM users ORDER BY created_at ASC LIMIT 1");
    if (rows.length > 0) {
      await conn.execute("UPDATE users SET role = 'admin', is_approved = TRUE WHERE id = ?", [rows[0].id]);
      console.log("Promoted first user to admin + approved:", rows[0].email);
    }
  } else {
    const [result] = await conn.execute("UPDATE users SET is_approved = TRUE WHERE role = 'admin' AND is_approved = FALSE");
    if (result.affectedRows > 0) {
      console.log("Auto-approved", result.affectedRows, "admin user(s)");
    } else {
      console.log("All admin users already approved");
    }
  }

  await conn.end();
  console.log("Migration complete.");
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
