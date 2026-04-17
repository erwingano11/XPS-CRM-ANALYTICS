const express = require("express");
const mysqlService = require("../services/mysqlService");

const router = express.Router();

// Test update endpoint: update a user's name by id
router.put("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });
    await mysqlService.updateUserName(id, name);
    const user = await mysqlService.getUserById(id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
