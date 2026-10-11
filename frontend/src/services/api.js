// All backend calls live here. Change VITE_API_URL in frontend/.env when you deploy.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  // jobs
  getJobs: () => request("/jobs"),
  getJob: (id) => request(`/jobs/${id}`),
  createJob: (body) => request("/jobs", json("POST", body)),
  updateJob: (id, body) => request(`/jobs/${id}`, json("PUT", body)),
  deleteJob: (id) => request(`/jobs/${id}`, { method: "DELETE" }),

  // completion entries (quantity marked as done)
  addCompletion: (jobId, body) => request(`/jobs/${jobId}/completions`, json("POST", body)),
  updateCompletion: (id, body) => request(`/completions/${id}`, json("PUT", body)),
  deleteCompletion: (id) => request(`/completions/${id}`, { method: "DELETE" }),

  // dashboard
  getSummary: () => request("/dashboard/summary"),
  getMonthly: () => request("/dashboard/monthly"),
};