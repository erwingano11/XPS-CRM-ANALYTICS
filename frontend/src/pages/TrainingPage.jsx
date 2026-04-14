import { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import {
  getTrainingData,
  addTrainingData,
  updateTrainingData,
  deleteTrainingData,
} from "../services/api";

const CATEGORIES = [
  {
    value: "instruction",
    label: "Instruction",
    icon: "bi-compass",
    color: "#4f46e5",
    description: "Tell the AI how to behave or respond",
  },
  {
    value: "knowledge",
    label: "Knowledge",
    icon: "bi-book",
    color: "#06b6d4",
    description: "Teach the AI domain-specific facts",
  },
  {
    value: "correction",
    label: "Correction",
    icon: "bi-pencil-square",
    color: "#f59e0b",
    description: "Fix how the AI handles specific cases",
  },
  {
    value: "example",
    label: "Example",
    icon: "bi-chat-quote",
    color: "#22c55e",
    description: "Provide example Q&A pairs",
  },
];

export default function TrainingPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    category: "instruction",
    title: "",
    content: "",
  });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const cardsRef = useRef(null);
  const pageRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && pageRef.current) {
      const allCards = pageRef.current.querySelectorAll(".stat-card");
      if (allCards.length > 0) {
        gsap.fromTo(
          allCards,
          { opacity: 0, y: 15, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.4,
            stagger: 0.06,
            ease: "back.out(1.2)",
            delay: 0.05,
          },
        );
      }
    }
  }, [loading, entries, filter, showForm]);

  const fetchData = async () => {
    try {
      const res = await getTrainingData();
      setEntries(res.data);
    } catch (err) {
      console.error("Failed to load training data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateTrainingData(editingId, form);
      } else {
        await addTrainingData(form.category, form.title, form.content);
      }
      setForm({ category: "instruction", title: "", content: "" });
      setShowForm(false);
      setEditingId(null);
      await fetchData();
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setForm({
      category: entry.category,
      title: entry.title,
      content: entry.content,
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteTrainingData(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleToggle = async (entry) => {
    try {
      await updateTrainingData(entry.id, { is_active: !entry.is_active });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, is_active: !e.is_active } : e,
        ),
      );
    } catch (err) {
      console.error("Failed to toggle:", err);
    }
  };

  const getCategoryInfo = (cat) =>
    CATEGORIES.find((c) => c.value === cat) || CATEGORIES[0];

  const filtered =
    filter === "all" ? entries : entries.filter((e) => e.category === filter);

  if (loading) {
    return (
      <div className="dashboard d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3 text-secondary">Loading training data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard" ref={pageRef}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">
            <i className="bi bi-mortarboard me-2"></i>AI Training
          </h4>
          <p className="text-secondary mb-0" style={{ fontSize: "0.85rem" }}>
            Teach the AI with custom instructions, knowledge, corrections, and
            examples
          </p>
        </div>
        <button
          className="sync-btn"
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setForm({ category: "instruction", title: "", content: "" });
          }}
        >
          <i className={`bi ${showForm ? "bi-x-lg" : "bi-plus-lg"} me-2`}></i>
          {showForm ? "Cancel" : "Add Training"}
        </button>
      </div>

      {/* Category overview */}
      <div className="row g-3 mb-4">
        {CATEGORIES.map((cat) => {
          const count = entries.filter((e) => e.category === cat.value).length;
          const active = entries.filter(
            (e) => e.category === cat.value && e.is_active,
          ).length;
          return (
            <div className="col-md-3 col-6" key={cat.value}>
              <div
                className="stat-card"
                style={{
                  cursor: "pointer",
                  borderColor: filter === cat.value ? cat.color : undefined,
                }}
                onClick={() =>
                  setFilter(filter === cat.value ? "all" : cat.value)
                }
              >
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="stat-icon"
                    style={{ background: `${cat.color}20`, color: cat.color }}
                  >
                    <i className={`bi ${cat.icon}`}></i>
                  </div>
                  <div>
                    <div className="stat-value">{count}</div>
                    <div className="stat-label">{cat.label}s</div>
                  </div>
                </div>
                <div
                  className="text-secondary mt-2"
                  style={{ fontSize: "0.75rem" }}
                >
                  {active} active
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div
          className="stat-card mb-4"
          style={{ borderColor: "var(--primary)" }}
        >
          <h6 className="mb-3">
            <i className="bi bi-pencil me-2"></i>
            {editingId ? "Edit Training Entry" : "New Training Entry"}
          </h6>
          <form onSubmit={handleSubmit}>
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <label
                  className="form-label text-secondary"
                  style={{ fontSize: "0.8rem" }}
                >
                  Category
                </label>
                <select
                  className="form-select"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  style={{
                    background: "var(--bg-dark)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label} — {c.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-8">
                <label
                  className="form-label text-secondary"
                  style={{ fontSize: "0.8rem" }}
                >
                  Title
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Sales terminology, Response format..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{
                    background: "var(--bg-dark)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-color)",
                  }}
                />
              </div>
            </div>
            <div className="mb-3">
              <label
                className="form-label text-secondary"
                style={{ fontSize: "0.8rem" }}
              >
                Content
              </label>
              <textarea
                className="form-control"
                rows={4}
                placeholder={
                  form.category === "instruction"
                    ? "e.g. Always format currency values in PHP (₱). When showing leads, include their source."
                    : form.category === "knowledge"
                      ? "e.g. Our fiscal year starts in April. The hot lead threshold is ₱500,000."
                      : form.category === "correction"
                        ? 'e.g. When I say "pipeline", I mean Opportunities by sales_stage, not by lead_source.'
                        : "e.g. Q: Show me the top deals\nA: Use search_crm_records on Opportunities, sort by amount desc, show top 10 with amounts and stages."
                }
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                style={{
                  background: "var(--bg-dark)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-color)",
                  resize: "vertical",
                }}
              />
            </div>
            <button className="sync-btn" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Saving...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg me-2"></i>
                  {editingId ? "Update" : "Save"}
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Entries List */}
      <div ref={cardsRef}>
        {filtered.length === 0 ? (
          <div className="text-center py-5">
            <i
              className="bi bi-mortarboard"
              style={{ fontSize: "3rem", color: "var(--text-secondary)" }}
            ></i>
            <p className="text-secondary mt-3">
              {filter === "all"
                ? 'No training data yet. Click "Add Training" to teach the AI.'
                : `No ${filter} entries yet.`}
            </p>
          </div>
        ) : (
          filtered.map((entry) => {
            const cat = getCategoryInfo(entry.category);
            return (
              <div
                key={entry.id}
                className="training-card stat-card mb-3"
                style={{ opacity: entry.is_active ? 1 : 0.5 }}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div className="d-flex align-items-center gap-3 flex-grow-1">
                    <div
                      className="stat-icon"
                      style={{
                        background: `${cat.color}20`,
                        color: cat.color,
                        flexShrink: 0,
                      }}
                    >
                      <i className={`bi ${cat.icon}`}></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <strong>{entry.title}</strong>
                        <span
                          className="badge"
                          style={{
                            background: `${cat.color}30`,
                            color: cat.color,
                            fontSize: "0.7rem",
                          }}
                        >
                          {cat.label}
                        </span>
                        {!entry.is_active && (
                          <span
                            className="badge bg-secondary"
                            style={{ fontSize: "0.7rem" }}
                          >
                            Disabled
                          </span>
                        )}
                      </div>
                      <div
                        className="text-secondary"
                        style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}
                      >
                        {entry.content}
                      </div>
                    </div>
                  </div>
                  <div className="d-flex gap-1" style={{ flexShrink: 0 }}>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleToggle(entry)}
                      title={entry.is_active ? "Disable" : "Enable"}
                      style={{
                        color: entry.is_active
                          ? "var(--success)"
                          : "var(--text-secondary)",
                      }}
                    >
                      <i
                        className={`bi ${entry.is_active ? "bi-toggle-on" : "bi-toggle-off"}`}
                        style={{ fontSize: "1.2rem" }}
                      ></i>
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleEdit(entry)}
                      title="Edit"
                      style={{ color: "var(--info)" }}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => handleDelete(entry.id)}
                      title="Delete"
                      style={{ color: "var(--danger)" }}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
