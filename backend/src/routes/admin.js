const express = require("express");
const mysqlService = require("../services/mysqlService");

const router = express.Router();

// Middleware to check if user is admin
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

// Get all users
router.get("/users", adminOnly, async (req, res) => {
  try {
    const users = await mysqlService.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
});

// Approve a user (make them able to access the app)
router.put("/users/:id/approve", adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await mysqlService.approveUser(id);
    const user = await mysqlService.getUserById(id);
    res.json(user);
  } catch (error) {
    console.error("Approve user error:", error);
    res.status(500).json({ error: "Failed to approve user" });
  }
});

// Update user role
router.put("/users/:id/role", adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    await mysqlService.updateUserRole(id, role);
    const user = await mysqlService.getUserById(id);
    res.json(user);
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// Delete a user
router.delete("/users/:id", adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await mysqlService.deleteUser(id);
    res.json({ status: "deleted" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

module.exports = router;
