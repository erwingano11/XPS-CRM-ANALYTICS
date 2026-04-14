import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import { googleLogin } from "../services/api";
import { useAuth } from "../context/AuthContext";

const GOOGLE_CLIENT_ID =
  "892564459472-teqr9hp03qel22321e90qunfuo9j2a6m.apps.googleusercontent.com";

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (user) {
      navigate("/");
      return;
    }

    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.4)" },
      );
    }

    // Initialize Google Sign-In
    const initGoogle = () => {
      if (window.google?.accounts) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "filled_blue",
          size: "large",
          width: 300,
          text: "signin_with",
          shape: "pill",
        });
      } else {
        setTimeout(initGoogle, 100);
      }
    };

    initGoogle();
  }, [user]);

  const handleGoogleResponse = async (response) => {
    try {
      const res = await googleLogin(response.credential);
      login(res.data.token, res.data.user);
      navigate("/");
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-dark)",
      }}
    >
      <div
        ref={containerRef}
        style={{
          background: "var(--bg-sidebar)",
          border: "1px solid var(--border-color)",
          borderRadius: "16px",
          padding: "3rem",
          textAlign: "center",
          maxWidth: "420px",
          width: "90%",
          opacity: 0,
        }}
      >
        <i
          className="bi bi-graph-up-arrow"
          style={{
            fontSize: "3rem",
            color: "var(--primary)",
            marginBottom: "1rem",
            display: "block",
          }}
        ></i>
        <h3
          style={{
            fontWeight: 700,
            marginBottom: "0.5rem",
            color: "var(--text-primary)",
          }}
        >
          CRM Analytics
        </h3>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            marginBottom: "2rem",
          }}
        >
          AI-powered SuiteCRM insights
        </p>

        <div
          ref={googleBtnRef}
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1.5rem",
          }}
        ></div>

        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.75rem",
            marginTop: "1rem",
          }}
        >
          Sign in with your Google account to continue
        </p>
      </div>
    </div>
  );
}
