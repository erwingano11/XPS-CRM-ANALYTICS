import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { googleLogin } from "../services/api";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID =
  "892564459472-teqr9hp03qel22321e90qunfuo9j2a6m.apps.googleusercontent.com";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      navigate("/");
      return;
    }

    const initGoogle = () => {
      if (window.google?.accounts) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "filled_blue",
          size: "large",
          width: 280,
          text: "signin_with",
          shape: "rectangular",
        });
      } else {
        setTimeout(initGoogle, 100);
      }
    };

    initGoogle();
  }, [user]);

  const handleGoogleResponse = async (response) => {
    try {
      setError(null);
      const res = await googleLogin(response.credential);
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err) {
      console.error("Login failed:", err);
      setError("Login failed. Please try again.");
    }
  };

  return (
    <div style={styles.page}>
      {/* Background pattern overlay */}
      <div style={styles.bgOverlay} />

      <div style={styles.wrapper}>
        {/* Top SuiteCRM-style header bar */}
        <div style={styles.header}>
          <div style={styles.headerInner}>
            <div style={styles.logoRow}>
              <svg
                width="36"
                height="36"
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
        </div>

        {/* Login card */}
        <div style={styles.cardWrapper}>
          <div style={styles.card}>
            {/* Card header */}
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Sign In</h2>
              <p style={styles.cardSubtitle}>
                AI-powered CRM insights & analytics
              </p>
            </div>

            {/* Divider */}
            <div style={styles.divider} />

            {/* Google sign-in section */}
            <div style={styles.cardBody}>
              <p style={styles.signInLabel}>Sign in with your Google account</p>

              <div style={styles.googleBtnWrapper}>
                <div ref={googleBtnRef} />
              </div>

              {error && (
                <div style={styles.errorBox}>
                  <i
                    className="bi bi-exclamation-triangle-fill"
                    style={{ marginRight: 6 }}
                  />
                  {error}
                </div>
              )}
            </div>

            {/* Card footer */}
            <div style={styles.cardFooter}>
              <i
                className="bi bi-shield-lock-fill"
                style={{ marginRight: 6, color: "#e84d4d" }}
              />
              Access is restricted to approved users only.
            </div>
          </div>

          {/* Bottom branding */}
          <p style={styles.copyright}>
            Powered by SuiteCRM &amp; OpenAI &nbsp;|&nbsp; &copy;{" "}
            {new Date().getFullYear()} Xilium Online
          </p>
        </div>
      </div>
    </div>
  );
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
  wrapper: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
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
  headerInner: {
    maxWidth: 1200,
    width: "100%",
    margin: "0 auto",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoText: {
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "1.15rem",
    letterSpacing: "-0.01em",
  },
  cardWrapper: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
  },
  card: {
    background: "#ffffff",
    borderRadius: 4,
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
    overflow: "hidden",
  },
  cardHeader: {
    background: "#f5f5f5",
    borderBottom: "3px solid #e84d4d",
    padding: "1.5rem 2rem",
  },
  cardTitle: {
    color: "#333333",
    fontWeight: 700,
    fontSize: "1.4rem",
    margin: 0,
    marginBottom: 4,
  },
  cardSubtitle: {
    color: "#777777",
    fontSize: "0.85rem",
    margin: 0,
  },
  divider: {
    height: 1,
    background: "#eeeeee",
  },
  cardBody: {
    padding: "2rem",
    textAlign: "center",
  },
  signInLabel: {
    color: "#555555",
    fontSize: "0.875rem",
    marginBottom: "1.25rem",
    fontWeight: 500,
  },
  googleBtnWrapper: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "1rem",
  },
  errorBox: {
    marginTop: "1rem",
    background: "#fff0f0",
    border: "1px solid #f5c6c6",
    color: "#c0392b",
    borderRadius: 4,
    padding: "0.6rem 1rem",
    fontSize: "0.85rem",
    textAlign: "left",
  },
  cardFooter: {
    background: "#f9f9f9",
    borderTop: "1px solid #eeeeee",
    padding: "0.85rem 2rem",
    fontSize: "0.78rem",
    color: "#888888",
    textAlign: "center",
  },
  copyright: {
    color: "rgba(255,255,255,0.35)",
    fontSize: "0.75rem",
    marginTop: "1.5rem",
    textAlign: "center",
  },
};
