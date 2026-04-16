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
      env_file: "/home/Erwin/XPS-CRM-ANALYTICS/backend/.env",
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
