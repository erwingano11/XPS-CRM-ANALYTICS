const express = require("express");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const config = require("../config");
const mysqlService = require("../services/mysqlService");

const router = express.Router();
const googleClient = new OAuth2Client(config.google.clientId);

// Google Sign-In: verify ID token and issue JWT
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    const user = await mysqlService.findOrCreateUser(
      googleId,
      email,
      name,
      picture,
    );

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      config.jwtSecret,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        is_approved: user.is_approved,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error.message);
    res.status(401).json({ error: "Invalid Google credential" });
  }
});

// Verify current token
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await mysqlService.getUserById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role,
        is_approved: user.is_approved,
      },
    });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

module.exports = router;
