// All backend calls live here. Change VITE_API_URL in frontend/.env when you deploy.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const { skipAuthEvent, ...fetchOptions } = options;
  const isForm = fetchOptions.body instanceof FormData;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...fetchOptions,
      credentials: "include", // sends the secure login cookie
      headers: isForm ? {} : { "Content-Type": "application/json", ...fetchOptions.headers },
    });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }
  const data = await res.json().catch(() => null);

  // Logged out or session expired -> tell the app to show the login page
  if (res.status === 401 && !skipAuthEvent && !path.startsWith("/auth/login")) {
    window.dispatchEvent(new Event("auth:unauthorized"));
  }
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  // auth
  login: (username, password) => request("/auth/login", json("POST", { username, password })),
  logout: () => request("/auth/logout", { method: "POST", skipAuthEvent: true }),
  me: () => request("/auth/me", { skipAuthEvent: true }),
  changePassword: (currentPassword, newPassword) =>
    request("/auth/change-password", json("POST", { currentPassword, newPassword })),

  // jobs
  getJobs: () => request("/jobs"),
  getJob: (id) => request(`/jobs/${id}`),
  createJob: (body) => request("/jobs", json("POST", body)),
  updateJob: (id, body) => request(`/jobs/${id}`, json("PUT", body)),
  deleteJob: (id) => request(`/jobs/${id}`, { method: "DELETE" }),

  // challan copy (PDF / image)
  uploadChallan: (jobId, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return request(`/jobs/${jobId}/challan`, { method: "POST", body: fd });
  },
  fileUrl: (name) => `${BASE.replace(/\/api$/, "")}/uploads/${name}`,

  // completion entries (quantity marked as done)
  addCompletion: (jobId, body) => request(`/jobs/${jobId}/completions`, json("POST", body)),
  updateCompletion: (id, body) => request(`/completions/${id}`, json("PUT", body)),
  deleteCompletion: (id) => request(`/completions/${id}`, { method: "DELETE" }),

  // purchases (raw materials bought from shops)
  getPurchases: (month) => request(`/purchases${month ? `?month=${month}` : ""}`),
  getPurchase: (id) => request(`/purchases/${id}`),
  getShopNames: () => request("/purchases/shop-names"),
  createPurchase: (body) => request("/purchases", json("POST", body)),
  updatePurchase: (id, body) => request(`/purchases/${id}`, json("PUT", body)),
  deletePurchase: (id) => request(`/purchases/${id}`, { method: "DELETE" }),
  addPurchasePayment: (purchaseId, body) => request(`/purchases/${purchaseId}/payments`, json("POST", body)),
  updatePurchasePayment: (id, body) => request(`/purchases/payments/${id}`, json("PUT", body)),
  deletePurchasePayment: (id) => request(`/purchases/payments/${id}`, { method: "DELETE" }),

  // challans (photo archive)
  getChallans: (month) => request(`/challans${month ? `?month=${month}` : ""}`),
  createChallan: (formData) => request("/challans", { method: "POST", body: formData }),
  updateChallan: (id, formData) => request(`/challans/${id}`, { method: "PUT", body: formData }),
  deleteChallan: (id) => request(`/challans/${id}`, { method: "DELETE" }),

  // dashboard
  getSummary: () => request("/dashboard/summary"),
  getMonthly: () => request("/dashboard/monthly"),
};