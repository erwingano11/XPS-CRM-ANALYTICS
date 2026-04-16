import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config.url.includes("/auth/")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// Auth
export const googleLogin = (credential) =>
  api.post("/auth/google", { credential });
export const getMe = () => api.get("/auth/me");

// Chat
export const sendMessage = (message, conversationId = null) =>
  api.post("/chat/message", { message, conversation_id: conversationId });

export const getConversations = () => api.get("/chat/conversations");

export const getConversationMessages = (id) =>
  api.get(`/chat/conversations/${id}/messages`);

export const deleteConversation = (id) =>
  api.delete(`/chat/conversations/${id}`);

// Analytics
export const getDashboardStats = () => api.get("/analytics/dashboard");

export const syncData = (modules = null) =>
  api.post("/analytics/sync", modules ? { modules } : {});

export const syncModule = (moduleName) =>
  api.post(`/analytics/sync/${moduleName}`);

export const getModuleRecords = (module, page = 1, pageSize = 20) =>
  api.get(`/analytics/modules/${module}`, { params: { page, pageSize } });

// Health
export const getHealth = () => api.get("/health");

// Training
export const getTrainingData = () => api.get("/analytics/training");
export const addTrainingData = (category, title, content) =>
  api.post("/analytics/training", { category, title, content });
export const updateTrainingData = (id, updates) =>
  api.put(`/analytics/training/${id}`, updates);
export const deleteTrainingData = (id) =>
  api.delete(`/analytics/training/${id}`);

export default api;
