const express = require("express");
const { v4: uuidv4 } = require("uuid");
const aiService = require("../services/aiService");
const mysqlService = require("../services/mysqlService");

const router = express.Router();

// Send a chat message
router.post("/message", async (req, res) => {
  try {
    const { message, conversation_id } = req.body;
    const userId = req.user.userId;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      convId = uuidv4();
      const title = await aiService.generateTitle(message);
      await mysqlService.createConversation(convId, title, userId);
    }

    // Get conversation history
    const history = await mysqlService.getMessages(convId);

    // Save user message
    await mysqlService.addMessage(convId, "user", message, null, null, userId);

    // Get AI response with RAG context
    const aiResponse = await aiService.chat(message, history);

    // Save assistant message
    await mysqlService.addMessage(
      convId,
      "assistant",
      aiResponse.reply,
      aiResponse.sources,
      aiResponse.analyticsData,
      userId,
    );

    res.json({
      reply: aiResponse.reply,
      conversation_id: convId,
      sources: aiResponse.sources,
      analytics_data: aiResponse.analyticsData,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to process message" });
  }
});

// Get all conversations
router.get("/conversations", async (req, res) => {
  try {
    const userId = req.user.userId;
    const conversations = await mysqlService.getConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ error: "Failed to get conversations" });
  }
});

// Get messages for a conversation
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const messages = await mysqlService.getMessages(req.params.id);
    const conversation = await mysqlService.getConversation(req.params.id);
    res.json({ conversation, messages });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Failed to get messages" });
  }
});

// Delete a conversation
router.delete("/conversations/:id", async (req, res) => {
  try {
    await mysqlService.deleteConversation(req.params.id);
    res.json({ status: "deleted" });
  } catch (error) {
    console.error("Delete conversation error:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

module.exports = router;
