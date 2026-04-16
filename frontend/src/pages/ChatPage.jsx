import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import gsap from "gsap";
import ReactMarkdown from "react-markdown";
import { sendMessage, getConversationMessages } from "../services/api";

const SUGGESTIONS = [
  {
    icon: "bi-people",
    text: "Show me a summary of all contacts",
  },
  {
    icon: "bi-graph-up",
    text: "What's the current sales pipeline status?",
  },
  {
    icon: "bi-bullseye",
    text: "Analyze lead conversion rates",
  },
  {
    icon: "bi-building",
    text: "List top accounts by opportunity value",
  },
];

export default function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { loadConversations } = useOutletContext();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeConvId, setActiveConvId] = useState(conversationId || null);

  const chatEndRef = useRef(null);
  const welcomeRef = useRef(null);
  const textareaRef = useRef(null);

  // Load conversation messages
  useEffect(() => {
    if (conversationId) {
      setActiveConvId(conversationId);
      loadMessages(conversationId);
    } else {
      setMessages([]);
      setActiveConvId(null);
    }
  }, [conversationId]);

  // GSAP welcome animation
  useEffect(() => {
    if (!conversationId && messages.length === 0 && welcomeRef.current) {
      const tl = gsap.timeline();
      tl.fromTo(
        welcomeRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
      );
      tl.fromTo(
        ".suggestion-card",
        { opacity: 0, y: 20, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.4,
          stagger: 0.1,
          ease: "back.out(1.5)",
        },
        "-=0.2",
      );
    }
  }, [conversationId, messages.length]);

  // Animate new messages
  useEffect(() => {
    const newMsgs = document.querySelectorAll(".message");
    if (newMsgs.length > 0) {
      gsap.fromTo(
        newMsgs[newMsgs.length - 1],
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
      );
    }
    scrollToBottom();
  }, [messages]);

  const loadMessages = async (convId) => {
    try {
      const res = await getConversationMessages(convId);
      // Limit to last 10 messages and make existing messages visible immediately
      const limitedMessages = res.data.messages
        .slice(-10)
        .map((m) => ({ ...m, _animated: true }));
      setMessages(limitedMessages);
      setTimeout(() => {
        document.querySelectorAll(".message").forEach((el) => {
          gsap.set(el, { opacity: 1, y: 0 });
        });
      }, 50);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const limitMessages = (msgs) => {
    return msgs.slice(-10);
  };

  const handleSend = async (text = null) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput("");
    resetTextarea();

    // Add user message
    setMessages((prev) =>
      limitMessages([...prev, { role: "user", content: msg }]),
    );
    setLoading(true);

    try {
      const res = await sendMessage(msg, activeConvId);
      const data = res.data;

      // If new conversation, update URL and sidebar
      if (!activeConvId) {
        setActiveConvId(data.conversation_id);
        navigate(`/chat/${data.conversation_id}`, { replace: true });
        loadConversations();
      }

      // Add assistant message
      setMessages((prev) =>
        limitMessages([
          ...prev,
          {
            role: "assistant",
            content: data.reply,
            sources: data.sources,
            analytics_data: data.analytics_data,
          },
        ]),
      );
    } catch (err) {
      console.error("Send error:", err);
      setMessages((prev) =>
        limitMessages([
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I encountered an error. Please make sure the backend is running and CRM data is synced.",
          },
        ]),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const resetTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleTextareaInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
  };

  // Welcome screen
  if (!conversationId && messages.length === 0) {
    return (
      <>
        <div className="chat-area">
          <div className="chat-welcome" ref={welcomeRef}>
            <h2>CRM Analytics AI</h2>
            <p>
              Ask questions about your SuiteCRM data — contacts, leads,
              opportunities, and more. Get instant insights powered by AI.
            </p>
            <div className="suggestion-cards">
              {SUGGESTIONS.map((s, i) => (
                <div
                  key={i}
                  className="suggestion-card"
                  onClick={() => handleSend(s.text)}
                >
                  <i className={`bi ${s.icon}`}></i>
                  {s.text}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="input-area">
          <div className="input-container">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Ask about your CRM data..."
              value={input}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
            />
            <button
              className="send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
            >
              <i className="bi bi-send-fill"></i>
            </button>
          </div>
        </div>
      </>
    );
  }

  // Chat view
  return (
    <>
      <div className="chat-area">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">
              <i
                className={`bi ${
                  msg.role === "user" ? "bi-person-fill" : "bi-robot"
                }`}
              ></i>
            </div>
            <div className="message-content">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
              {msg.sources && msg.sources.length > 0 && (
                <div className="message-sources">
                  {msg.sources.map((s, j) => (
                    <span key={j} className="source-tag">
                      <i className="bi bi-database me-1"></i>
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <div className="message-avatar">
              <i className="bi bi-robot"></i>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <div className="input-container">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask about your CRM data..."
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
          />
          <button
            className="send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            <i className="bi bi-send-fill"></i>
          </button>
        </div>
      </div>
    </>
  );
}
