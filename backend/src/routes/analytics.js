const express = require("express");
const suitecrmService = require("../services/suitecrmService");
const syncService = require("../services/syncService");
const mysqlService = require("../services/mysqlService");

const router = express.Router();

// Get dashboard statistics
router.get("/dashboard", async (req, res) => {
  try {
    const stats = await suitecrmService.getDashboardStats();
    const recentSync = await mysqlService.getLatestSync();

    res.json({
      crm: stats,
      recentSync,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

// Sync CRM data to ChromaDB
router.post("/sync", async (req, res) => {
  try {
    const { modules } = req.body;
    const result = await syncService.syncAll(modules);
    res.json(result);
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: "Failed to sync data" });
  }
});

// Sync a specific module
router.post("/sync/:module", async (req, res) => {
  try {
    const result = await syncService.syncModule(req.params.module);
    res.json(result);
  } catch (error) {
    console.error("Module sync error:", error);
    res.status(500).json({ error: `Failed to sync ${req.params.module}` });
  }
});

// Get records from a module
router.get("/modules/:module", async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const records = await suitecrmService.getModuleRecords(
      req.params.module,
      parseInt(page),
      parseInt(pageSize),
    );
    res.json(records);
  } catch (error) {
    console.error("Module records error:", error);
    res.status(500).json({ error: "Failed to get module records" });
  }
});

// Get a specific record
router.get("/modules/:module/:id", async (req, res) => {
  try {
    const record = await suitecrmService.getRecord(
      req.params.module,
      req.params.id,
    );
    res.json(record);
  } catch (error) {
    console.error("Record error:", error);
    res.status(500).json({ error: "Failed to get record" });
  }
});

// Training data endpoints
router.get("/training", async (req, res) => {
  try {
    const data = await mysqlService.getTrainingData();
    res.json(data.map((d) => ({ ...d, is_active: !!d.is_active })));
  } catch (error) {
    console.error("Get training data error:", error);
    res.status(500).json({ error: "Failed to get training data" });
  }
});

router.post("/training", async (req, res) => {
  try {
    const { category, title, content } = req.body;
    if (!category || !title || !content) {
      return res
        .status(400)
        .json({ error: "category, title, and content are required" });
    }
    const id = await mysqlService.addTrainingData(category, title, content);
    res.json({ id, message: "Training data added" });
  } catch (error) {
    console.error("Add training data error:", error);
    res.status(500).json({ error: "Failed to add training data" });
  }
});

router.put("/training/:id", async (req, res) => {
  try {
    await mysqlService.updateTrainingData(req.params.id, req.body);
    res.json({ message: "Training data updated" });
  } catch (error) {
    console.error("Update training data error:", error);
    res.status(500).json({ error: "Failed to update training data" });
  }
});

router.delete("/training/:id", async (req, res) => {
  try {
    await mysqlService.deleteTrainingData(req.params.id);
    res.json({ message: "Training data deleted" });
  } catch (error) {
    console.error("Delete training data error:", error);
    res.status(500).json({ error: "Failed to delete training data" });
  }
});

module.exports = router;
