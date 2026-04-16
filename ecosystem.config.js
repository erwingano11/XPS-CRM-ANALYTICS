require("dotenv").config({
  path: "/home/Erwin/XPS-CRM-ANALYTICS/backend/.env",
});

module.exports = {
  apps: [
    {
      name: "crm-analytics-backend",
      script: "src/server.js",
      cwd: "/home/Erwin/XPS-CRM-ANALYTICS/backend",
      instances: "max",
      exec_mode: "cluster",
      watch: false,
      ignore_watch: ["node_modules", "logs"],
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        SUITECRM_URL: process.env.SUITECRM_URL,
        SUITECRM_USERNAME: process.env.SUITECRM_USERNAME,
        SUITECRM_PASSWORD: process.env.SUITECRM_PASSWORD,
        CLIENT_ID: process.env.CLIENT_ID,
        CLIENT_SECRET: process.env.CLIENT_SECRET,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        MYSQL_HOST: process.env.MYSQL_HOST,
        MYSQL_PORT: process.env.MYSQL_PORT,
        MYSQL_USER: process.env.MYSQL_USER,
        MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
        MYSQL_DATABASE: process.env.MYSQL_DATABASE,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        JWT_SECRET: process.env.JWT_SECRET,
      },
      error_file: "/var/log/pm2/crm-analytics-error.log",
      out_file: "/var/log/pm2/crm-analytics-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      max_memory_restart: "1G",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
