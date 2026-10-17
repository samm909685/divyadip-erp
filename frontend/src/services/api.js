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

  // GST billing
  getGstSettings: () => request("/gst/settings"),
  saveGstSettings: (body) => request("/gst/settings", json("PUT", body)),
  getCustomers: () => request("/gst/customers"),
  createCustomer: (body) => request("/gst/customers", json("POST", body)),
  updateCustomer: (id, body) => request(`/gst/customers/${id}`, json("PUT", body)),
  deleteCustomer: (id) => request(`/gst/customers/${id}`, { method: "DELETE" }),
  getInvoices: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/gst/invoices${q ? `?${q}` : ""}`);
  },
  getInvoice: (id) => request(`/gst/invoices/${id}`),
  nextInvoiceNo: (date) => request(`/gst/invoices/next-number?date=${date}`),
  createInvoice: (body) => request("/gst/invoices", json("POST", body)),
  cancelInvoice: (id, reason) => request(`/gst/invoices/${id}/cancel`, json("POST", { reason })),

  // GST: bills received from suppliers, and the monthly summary
  getReceivedBills: (month) => request(`/gst/received${month ? `?month=${month}` : ""}`),
  getSuppliers: () => request("/gst/received/suppliers"),
  createReceivedBill: (formData) => request("/gst/received", { method: "POST", body: formData }),
  updateReceivedBill: (id, formData) => request(`/gst/received/${id}`, { method: "PUT", body: formData }),
  deleteReceivedBill: (id) => request(`/gst/received/${id}`, { method: "DELETE" }),
  getGstSummary: (month) => request(`/gst/summary?month=${month}`),

  // is the server and database working? (public, no login needed)
  health: () => request("/health", { skipAuthEvent: true }),
  backupStatus: () => request("/system/backup-status"),

  // reports: cost sheets and business analysis
  getCostRecords: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/costs/records${q ? `?${q}` : ""}`);
  },
  getLastCostRecord: (job) => request(`/costs/records/last?job=${encodeURIComponent(job)}`),
  getJobNames: () => request("/costs/job-names"),
  createCostRecord: (body) => request("/costs/records", json("POST", body)),
  updateCostRecord: (id, body) => request(`/costs/records/${id}`, json("PUT", body)),
  deleteCostRecord: (id) => request(`/costs/records/${id}`, { method: "DELETE" }),
  getAnalysis: (params = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/costs/analysis${q ? `?${q}` : ""}`);
  },

  // dashboard
  getSummary: () => request("/dashboard/summary"),
  getMonthly: () => request("/dashboard/monthly"),
};