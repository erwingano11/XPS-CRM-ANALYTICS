import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.bgOverlay} />
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="20" cy="20" r="20" fill="#e84d4d" />
              <path
                d="M12 20 Q20 10 28 20 Q20 30 12 20Z"
                fill="white"
                opacity="0.9"
              />
              <circle cx="20" cy="20" r="4" fill="white" />
            </svg>
            <span style={styles.logoText}>SuiteCRM Analytics</span>
          </div>
        </div>
        <div style={styles.centered}>
          <div style={styles.spinner} />
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              marginTop: 16,
              fontSize: "0.9rem",
            }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.is_approved) {
    return (
      <div style={styles.page}>
        <div style={styles.bgOverlay} />

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="20" cy="20" r="20" fill="#e84d4d" />
              <path
                d="M12 20 Q20 10 28 20 Q20 30 12 20Z"
                fill="white"
                opacity="0.9"
              />
              <circle cx="20" cy="20" r="4" fill="white" />
            </svg>
            <span style={styles.logoText}>SuiteCRM Analytics</span>
          </div>
        </div>

        {/* Card */}
        <div style={styles.centered}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.iconCircle}>
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="11"
                    stroke="#e84d4d"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 7v5l3 3"
                    stroke="#e84d4d"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h2 style={styles.cardTitle}>Account Pending Approval</h2>
              <p style={styles.cardSubtitle}>Your request is under review</p>
            </div>

            <div style={styles.divider} />

            <div style={styles.cardBody}>
              <div style={styles.infoBox}>
                <i
                  className="bi bi-info-circle-fill"
                  style={{ color: "#5a7fbf", marginRight: 8, flexShrink: 0 }}
                />
                <span>
                  Your account has been registered but is awaiting administrator
                  approval. You will be able to access the application once an
                  admin approves your account.
                </span>
              </div>

              <div style={styles.userRow}>
                <div style={styles.userAvatar}>
                  <i
                    className="bi bi-person-fill"
                    style={{ fontSize: "1.2rem", color: "#ffffff" }}
                  />
                </div>
                <div>
                  <div style={styles.userName}>{user.name}</div>
                  <div style={styles.userEmail}>{user.email}</div>
                </div>
              </div>
            </div>

            <div style={styles.cardFooter}>
              <button
                style={styles.signOutBtn}
                onClick={() => {
                  logout();
                  window.location.href = "/login";
                }}
              >
                <i
                  className="bi bi-box-arrow-left"
                  style={{ marginRight: 6 }}
                />
                Sign Out
              </button>
            </div>
          </div>

          <p style={styles.copyright}>
            Powered by SuiteCRM &amp; OpenAI &nbsp;|&nbsp; &copy;{" "}
            {new Date().getFullYear()} Xilium Online
          </p>
        </div>
      </div>
    );
  }

  return children;
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    overflow: "hidden",
  },
  bgOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "radial-gradient(circle at 20% 80%, rgba(232,77,77,0.08) 0%, transparent 50%), " +
      "radial-gradient(circle at 80% 20%, rgba(90,90,125,0.12) 0%, transparent 50%)",
    pointerEvents: "none",
  },
  header: {
    background: "rgba(0,0,0,0.35)",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(8px)",
    padding: "0 2rem",
    height: 60,
    display: "flex",
    alignItems: "center",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoText: {
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "1.1rem",
    letterSpacing: "-0.01em",
  },
  centered: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "3px solid rgba(255,255,255,0.15)",
    borderTop: "3px solid #e84d4d",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  card: {
    background: "#ffffff",
    borderRadius: 4,
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
    overflow: "hidden",
  },
  cardHeader: {
    background: "#f5f5f5",
    borderBottom: "3px solid #e84d4d",
    padding: "1.75rem 2rem",
    textAlign: "center",
  },
  iconCircle: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "0.75rem",
  },
  cardTitle: {
    color: "#333333",
    fontWeight: 700,
    fontSize: "1.25rem",
    margin: 0,
    marginBottom: 4,
  },
  cardSubtitle: {
    color: "#888888",
    fontSize: "0.85rem",
    margin: 0,
  },
  divider: {
    height: 1,
    background: "#eeeeee",
  },
  cardBody: {
    padding: "1.75rem 2rem",
  },
  infoBox: {
    background: "#eef3fb",
    border: "1px solid #c5d6f0",
    borderRadius: 4,
    padding: "0.85rem 1rem",
    fontSize: "0.85rem",
    color: "#3a5a8a",
    display: "flex",
    alignItems: "flex-start",
    lineHeight: 1.6,
    marginBottom: "1.25rem",
  },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fafafa",
    border: "1px solid #eeeeee",
    borderRadius: 4,
    padding: "0.85rem 1rem",
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#5a5a7d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  userName: {
    fontWeight: 600,
    fontSize: "0.9rem",
    color: "#333333",
  },
  userEmail: {
    fontSize: "0.8rem",
    color: "#888888",
  },
  cardFooter: {
    background: "#f9f9f9",
    borderTop: "1px solid #eeeeee",
    padding: "1rem 2rem",
    display: "flex",
    justifyContent: "center",
  },
  signOutBtn: {
    background: "transparent",
    border: "1px solid #cccccc",
    color: "#555555",
    padding: "0.5rem 1.25rem",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 500,
    transition: "all 0.15s",
  },
  copyright: {
    color: "rgba(255,255,255,0.35)",
    fontSize: "0.75rem",
    marginTop: "1.5rem",
    textAlign: "center",
  },
};
