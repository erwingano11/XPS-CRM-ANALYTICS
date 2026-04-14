require("dotenv").config();

const config = {
  port: process.env.PORT || 3001,

  suitecrm: {
    url: process.env.SUITECRM_URL,
    username: process.env.SUITECRM_USERNAME,
    password: process.env.SUITECRM_PASSWORD,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },

  mysql: {
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT || "3306", 10),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "crm_analytics",
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },

  jwtSecret: process.env.JWT_SECRET || "crm-analytics-default-secret",
};

module.exports = config;
