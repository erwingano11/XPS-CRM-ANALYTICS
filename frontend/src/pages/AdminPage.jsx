import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getAllUsers,
  approveUser,
  updateUserRole,
  deleteUser,
} from "../services/api";

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await getAllUsers();
      setUsers(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      loadUsers();
    }
  }, [user]);

  const handleApproveUser = async (userId) => {
    try {
      setActionLoading(userId);
      await approveUser(userId);
      await loadUsers();
    } catch (err) {
      console.error("Failed to approve user:", err);
      setError("Failed to approve user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      setActionLoading(userId);
      await updateUserRole(userId, newRole);
      await loadUsers();
    } catch (err) {
      console.error("Failed to update user role:", err);
      setError("Failed to update user role");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }
    try {
      setActionLoading(userId);
      await deleteUser(userId);
      await loadUsers();
    } catch (err) {
      console.error("Failed to delete user:", err);
      setError("Failed to delete user");
    } finally {
      setActionLoading(null);
    }
  };

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="admin-container p-4">
      <div className="container-lg">
        <h1 className="mb-4">
          <i className="bi bi-shield-lock me-2"></i>Admin Panel - User
          Management
        </h1>

        {error && (
          <div className="alert alert-danger alert-dismissible fade show">
            {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError(null)}
            ></button>
          </div>
        )}

        {loading ? (
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            backgroundColor: "#e9ecef",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <i className="bi bi-person"></i>
                        </div>
                        {u.name || "N/A"}
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      {u.is_approved ? (
                        <span className="badge bg-success">Approved</span>
                      ) : (
                        <span className="badge bg-warning">Pending</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        disabled={actionLoading === u.id}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      {!u.is_approved && (
                        <button
                          className="btn btn-sm btn-success me-2"
                          onClick={() => handleApproveUser(u.id)}
                          disabled={actionLoading === u.id}
                        >
                          {actionLoading === u.id ? (
                            <>
                              <span
                                className="spinner-border spinner-border-sm me-1"
                                role="status"
                                aria-hidden="true"
                              ></span>
                              Approving...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check-circle me-1"></i>
                              Approve
                            </>
                          )}
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={actionLoading === u.id}
                      >
                        {actionLoading === u.id ? (
                          <>
                            <span
                              className="spinner-border spinner-border-sm me-1"
                              role="status"
                              aria-hidden="true"
                            ></span>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-trash me-1"></i>
                            Delete
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            No users found.
          </div>
        )}
      </div>
    </div>
  );
}
