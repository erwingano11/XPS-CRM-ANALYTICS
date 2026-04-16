require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const config = require("./config");
const mysqlService = require("./services/mysqlService");
const authMiddleware = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const analyticsRoutes = require("./routes/analytics");

const app = express();

// CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://ai.xiliumonline.net",
    "http://ai.xiliumonline.net",
    "https://openai.xiliumonline.net",
    "http://openai.xiliumonline.net",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", authMiddleware, chatRoutes);
app.use("/api/analytics", authMiddleware, analyticsRoutes);

// Serve frontend static files (production)
const frontendDistPath = path.join(__dirname, "../../frontend/dist");
app.use(express.static(frontendDistPath));

// Health check
app.get("/api/health", async (req, res) => {
  const status = {
    server: "ok",
    mysql: "unknown",
  };

  try {
    await mysqlService.pool.execute("SELECT 1");
    status.mysql = "ok";
  } catch {
    status.mysql = "error";
  }

  res.json(status);
});

// SPA fallback - serve index.html for all non-API routes
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(frontendDistPath, "index.html"));
  } else {
    res.status(404).json({ error: "API endpoint not found" });
  }
});

// Initialize and start
async function start() {
  try {
    console.log("Initializing MySQL...");
    await mysqlService.initialize();

    app.listen(config.port, () => {
      console.log(
        `\nCRM Analytics API running on http://localhost:${config.port}`,
      );
      console.log(`Health check: http://localhost:${config.port}/api/health\n`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
