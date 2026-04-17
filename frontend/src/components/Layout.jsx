import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { getConversations, deleteConversation } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const loadConversations = async () => {
    try {
      const res = await getConversations();
      // Limit to last 10 conversations
      setConversations(res.data.slice(-10));
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  const handleNewChat = () => {
    navigate("/");
  };

  const handleSelectConversation = (id) => {
    navigate(`/chat/${id}`);
  };

  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (location.pathname.includes(id)) {
        navigate("/");
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const currentPath = location.pathname;

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="sidebar-header">
          <h5 className="mb-3">
            <i className="bi bi-graph-up-arrow me-2"></i>
            CRM Analytics
          </h5>
          <button className="new-chat-btn" onClick={handleNewChat}>
            <i className="bi bi-plus-lg me-2"></i>New Chat
          </button>
        </div>

        <div className="conversation-list">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                currentPath.includes(conv.id) ? "active" : ""
              }`}
              onClick={() => handleSelectConversation(conv.id)}
            >
              <span className="text-truncate">
                <i className="bi bi-chat-dots me-2"></i>
                {conv.title}
              </span>
              <button
                className="delete-btn"
                onClick={(e) => handleDeleteConversation(e, conv.id)}
                title="Delete"
              >
                <i className="bi bi-trash"></i>
              </button>
            </div>
          ))}
        </div>

        <nav className="sidebar-nav">
          <a
            className={`nav-link d-flex align-items-center mb-1 ${
              currentPath === "/" || currentPath.startsWith("/chat")
                ? "active"
                : ""
            }`}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            <i className="bi bi-chat-left-text me-2"></i> Chat
          </a>
          <a
            className={`nav-link d-flex align-items-center ${
              currentPath === "/dashboard" ? "active" : ""
            }`}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("/dashboard");
            }}
          >
            <i className="bi bi-speedometer2 me-2"></i> Dashboard
          </a>
          <a
            className={`nav-link d-flex align-items-center ${
              currentPath === "/training" ? "active" : ""
            }`}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("/training");
            }}
          >
            <i className="bi bi-mortarboard me-2"></i> Training
          </a>
          {user?.role === "admin" && (
            <a
              className={`nav-link d-flex align-items-center ${
                currentPath === "/admin" ? "active" : ""
              }`}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                navigate("/admin");
              }}
            >
              <i className="bi bi-shield-lock me-2"></i> Admin
            </a>
          )}
        </nav>

        {user && (
          <div className="sidebar-user">
            <div className="d-flex align-items-center gap-2 mb-2">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt=""
                  style={{ width: 32, height: 32, borderRadius: "50%" }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <i
                  className="bi bi-person-circle"
                  style={{ fontSize: "1.5rem" }}
                ></i>
              )}
              <div style={{ overflow: "hidden" }}>
                <div
                  className="text-truncate"
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#ffffff",
                  }}
                >
                  {user.name}
                </div>
                <div
                  className="text-truncate"
                  style={{ fontSize: "0.7rem", color: "#cccccc" }}
                >
                  {user.email}
                </div>
              </div>
            </div>
            <button
              className="btn btn-sm w-100"
              style={{
                color: "#ffffff",
                border: "1px solid #4a4a60",
                fontSize: "0.8rem",
              }}
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <i className="bi bi-box-arrow-left me-1"></i> Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="main-content">
        <div className="top-bar">
          <button
            className="toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <i className={`bi bi-${sidebarOpen ? "list" : "arrow-right"}`}></i>
          </button>
          <span className="text-secondary" style={{ fontSize: "0.85rem" }}>
            SuiteCRM AI Analytics
          </span>
        </div>

        <Outlet context={{ loadConversations }} />
      </main>
    </div>
  );
}
