import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import { getDashboardStats, syncData } from "../services/api";

const MODULE_ICONS = {
  contacts: { icon: "bi-people-fill", color: "#8fa3b3" },
  accounts: { icon: "bi-building", color: "#5a5a7d" },
  leads: { icon: "bi-bullseye", color: "#f59e0b" },
  opportunities: { icon: "bi-graph-up-arrow", color: "#22c55e" },
  cases: { icon: "bi-ticket-detailed", color: "#d67676" },
};

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    fetchStats();
  }, []);

  // GSAP entrance animation
  useEffect(() => {
    if (stats && cardsRef.current) {
      gsap.fromTo(
        cardsRef.current.querySelectorAll(".stat-card"),
        { opacity: 0, y: 20, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.08,
          ease: "back.out(1.4)",
        },
      );
      gsap.fromTo(
        ".sync-section",
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.4, ease: "power2.out" },
      );
    }
  }, [stats]);

  const fetchStats = async () => {
    try {
      const res = await getDashboardStats();
      setStats(res.data);
      setError(null);
    } catch (err) {
      setError(
        "Failed to load dashboard. Make sure the backend and SuiteCRM are accessible.",
      );
      console.error("Dashboard error:", err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncData();
      setSyncResult(res.data);
      // Refresh stats after sync
      await fetchStats();
      // Animate the success feedback
      gsap.fromTo(
        ".sync-result",
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
      );
    } catch (err) {
      setSyncResult({ status: "failed", error: err.message });
    } finally {
      setSyncing(false);
    }
  };

  if (error) {
    return (
      <div className="dashboard d-flex align-items-center justify-content-center">
        <div className="text-center">
          <i
            className="bi bi-exclamation-triangle"
            style={{ fontSize: "3rem", color: "var(--warning)" }}
          ></i>
          <p className="mt-3 text-secondary">{error}</p>
          <button className="sync-btn mt-3" onClick={fetchStats}>
            <i className="bi bi-arrow-clockwise me-2"></i>Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dashboard d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3 text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Dashboard</h4>
          <p className="text-secondary mb-0" style={{ fontSize: "0.85rem" }}>
            SuiteCRM data overview & sync status
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="row g-3 mb-4" ref={cardsRef}>
        {Object.entries(MODULE_ICONS).map(([key, { icon, color }]) => (
          <div key={key} className="col-6 col-md-4 col-xl">
            <div className="stat-card">
              <div
                className="stat-icon"
                style={{ background: `${color}20`, color }}
              >
                <i className={`bi ${icon}`}></i>
              </div>
              <div className="stat-value">{stats.crm?.[key] ?? "—"}</div>
              <div className="stat-label">{key}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats Row */}
      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="stat-card" style={{ opacity: 1, transform: "none" }}>
            <div
              className="stat-icon"
              style={{ background: "#22c55e20", color: "#22c55e" }}
            >
              <i className="bi bi-currency-dollar"></i>
            </div>
            <div className="stat-value">
              ${(stats.crm?.open_opportunities_value ?? 0).toLocaleString()}
            </div>
            <div className="stat-label">Open Pipeline Value</div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="stat-card" style={{ opacity: 1, transform: "none" }}>
            <div
              className="stat-icon"
              style={{ background: "#8b5cf620", color: "#8b5cf6" }}
            >
              <i className="bi bi-cpu"></i>
            </div>
            <div className="stat-value">AI</div>
            <div className="stat-label">Function Calling</div>
          </div>
        </div>
      </div>

      {/* Sync Section */}
      <div className="sync-section">
        <div
          className="stat-card p-4"
          style={{ opacity: 1, transform: "none" }}
        >
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <h5 className="fw-bold mb-1">
                <i
                  className="bi bi-arrow-repeat me-2"
                  style={{ color: "var(--primary-light)" }}
                ></i>
                Data Sync
              </h5>
              <p
                className="text-secondary mb-0"
                style={{ fontSize: "0.85rem" }}
              >
                Sync SuiteCRM data into ChromaDB for AI-powered analytics. This
                fetches Contacts, Accounts, Leads, Opportunities, and Cases.
              </p>
            </div>
            <button
              className="sync-btn"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  ></span>
                  Syncing...
                </>
              ) : (
                <>
                  <i className="bi bi-cloud-download me-2"></i>
                  Sync Now
                </>
              )}
            </button>
          </div>

          {syncResult && (
            <div className="sync-result mt-3">
              {syncResult.status === "completed" ? (
                <div
                  className="alert alert-success py-2 mb-0"
                  style={{
                    background: "#22c55e15",
                    border: "1px solid #22c55e30",
                    color: "#22c55e",
                  }}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  Synced <strong>{syncResult.totalSynced}</strong> records
                  successfully.
                  {syncResult.details && (
                    <div className="mt-2" style={{ fontSize: "0.8rem" }}>
                      {syncResult.details.map((d, i) => (
                        <span key={i} className="me-3">
                          {d.module}: {d.synced}
                          {d.error && ` (error)`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="alert alert-danger py-2 mb-0"
                  style={{
                    background: "#ef444415",
                    border: "1px solid #ef444430",
                    color: "#ef4444",
                  }}
                >
                  <i className="bi bi-x-circle me-2"></i>
                  Sync failed. Check backend logs.
                </div>
              )}
            </div>
          )}

          {/* Recent Sync Log */}
          {stats.recentSync && stats.recentSync.length > 0 && (
            <div className="mt-3">
              <h6
                className="text-secondary mb-2"
                style={{ fontSize: "0.8rem" }}
              >
                Recent Sync Activity
              </h6>
              <div className="table-responsive">
                <table
                  className="table table-sm mb-0"
                  style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}
                >
                  <thead>
                    <tr style={{ borderColor: "var(--border-color)" }}>
                      <th>Module</th>
                      <th>Records</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentSync.map((log, i) => (
                      <tr
                        key={i}
                        style={{ borderColor: "var(--border-color)" }}
                      >
                        <td>{log.module}</td>
                        <td>{log.records_synced}</td>
                        <td>
                          <span
                            style={{
                              color:
                                log.status === "completed"
                                  ? "var(--success)"
                                  : log.status === "failed"
                                    ? "var(--danger)"
                                    : "var(--warning)",
                            }}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td>
                          {log.started_at
                            ? new Date(log.started_at).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
