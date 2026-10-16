import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, X, Pencil, Trash2, Printer, Ban, Settings as SettingsIcon, Download, ReceiptText } from "lucide-react";
import { api } from "../services/api";
import CustomerModal from "../components/gst/CustomerModal";
import GstTabs from "../components/gst/GstTabs";
import { STATES, GST_RATES, stateName, validateGstin, inr, dmy } from "../utils/gstCalc";

/*
  GST Billing: sales tax invoices (A). Received supplier bills (B) come next.
  An issued invoice is never edited, only cancelled, and totals leave out cancelled ones.
  Spacing classes use the "!" prefix so they work with a global CSS reset.
*/

const todayStr = () => new Date().toLocaleDateString("en-CA");
const thisMonth = () => todayStr().slice(0, 7);
const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";
const labelCls = "!mb-1.5 block text-sm font-medium text-slate-700";

const ModalShell = ({ title, subtitle, onClose, children, wide }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 !p-4">
    <div className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white !p-6 shadow-2xl ${wide ? "max-w-2xl" : "max-w-md"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="!mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg !p-1.5 text-slate-400 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const ModalButtons = ({ onClose, onSubmit, saving, label, danger }) => (
  <div className="!mt-6 flex justify-end gap-3">
    <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 !px-4 !py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
      Close
    </button>
    <button
      type="button"
      onClick={onSubmit}
      disabled={saving}
      className={`rounded-xl !px-5 !py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60 ${
        danger ? "bg-red-600 shadow-red-500/30 hover:bg-red-700" : "bg-orange-600 shadow-orange-500/30 hover:bg-orange-700"
      }`}
    >
      {saving ? "Saving…" : label}
    </button>
  </div>
);

/* ---------- Business details (printed on every invoice) ---------- */
const SettingsModal = ({ settings, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: settings?.name ?? "",
    address: settings?.address ?? "",
    stateCode: settings?.stateCode ?? "27",
    gstin: settings?.gstin ?? "",
    phone: settings?.phone ?? "",
    email: settings?.email ?? "",
    bankDetails: settings?.bankDetails ?? "",
    terms: settings?.terms ?? "",
    defaultGstRate: settings?.defaultGstRate ?? 18,
    invoiceStartNo: settings?.invoiceStartNo ?? 1,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError("");
  };

  const submit = async () => {
    if (!form.name.trim() || !form.address.trim()) return setError("Business name and address are required.");
    const gstin = form.gstin.trim().toUpperCase();
    const problem = validateGstin(gstin);
    if (problem) return setError(problem);
    if (gstin.slice(0, 2) !== form.stateCode) return setError("The GSTIN does not belong to the state you selected.");
    setSaving(true);
    try {
      const saved = await api.saveGstSettings({
        ...form,
        gstin,
        defaultGstRate: Number(form.defaultGstRate),
        invoiceStartNo: Number(form.invoiceStartNo),
      });
      onSaved(saved);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Invoice settings" subtitle="Your own details, printed at the top of every invoice." onClose={onClose} wide>
      <div className="!mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Business name *</label>
          <input className={inputCls} value={form.name} onChange={set("name")} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Address *</label>
          <textarea rows={2} className={inputCls} value={form.address} onChange={set("address")} />
        </div>
        <div>
          <label className={labelCls}>State *</label>
          <select className={inputCls} value={form.stateCode} onChange={set("stateCode")}>
            {STATES.map(([code, name]) => (
              <option key={code} value={code}>
                {code} - {name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>GSTIN *</label>
          <input className={`${inputCls} uppercase`} maxLength={15} value={form.gstin} onChange={set("gstin")} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={form.phone} onChange={set("phone")} />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input className={inputCls} value={form.email} onChange={set("email")} />
        </div>
        <div>
          <label className={labelCls}>Usual GST rate</label>
          <select className={inputCls} value={form.defaultGstRate} onChange={set("defaultGstRate")}>
            {GST_RATES.map((r) => (
              <option key={r} value={r}>
                {r}%
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Next invoice number starts at</label>
          <input type="number" min="1" className={inputCls} value={form.invoiceStartNo} onChange={set("invoiceStartNo")} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Bank details (printed on invoices)</label>
          <textarea rows={2} className={inputCls} value={form.bankDetails} onChange={set("bankDetails")} placeholder="Bank name, A/C no., IFSC code, branch" />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Terms and conditions</label>
          <textarea rows={3} className={inputCls} value={form.terms} onChange={set("terms")} />
        </div>
      </div>
      <p className="!mt-3 text-xs text-slate-500">
        The starting number is used only for the first invoice of a financial year (April to March). Later invoices continue in order.
        Changing these details does not change invoices already made.
      </p>
      {error && <p className="!mt-3 text-sm font-medium text-red-600">{error}</p>}
      <ModalButtons onClose={onClose} onSubmit={submit} saving={saving} label="Save details" />
    </ModalShell>
  );
};

/* ---------- Cancel an invoice ---------- */
const CancelModal = ({ invoice, onClose, onDone }) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (reason.trim().length < 3) return setError("Enter a reason for cancelling.");
    setSaving(true);
    try {
      await api.cancelInvoice(invoice.id, reason.trim());
      onDone();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`Cancel invoice ${invoice.invoiceNo}`} subtitle={`${invoice.billName} · ₹${inr(invoice.grand)}`} onClose={onClose}>
      <p className="!mt-4 text-sm text-slate-600">
        The invoice number stays used and the invoice is marked cancelled. It is left out of the totals. This cannot be undone. To
        correct a mistake, cancel it and make a new invoice.
      </p>
      <div className="!mt-4">
        <label className={labelCls}>Reason *</label>
        <input className={inputCls} value={reason} onChange={(e) => { setReason(e.target.value); setError(""); }} placeholder="e.g. wrong quantity" />
      </div>
      {error && <p className="!mt-3 text-sm font-medium text-red-600">{error}</p>}
      <ModalButtons onClose={onClose} onSubmit={submit} saving={saving} label="Cancel invoice" danger />
    </ModalShell>
  );
};

/* ---------- Page ---------- */
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const GstBilling = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("invoices");
  const [month, setMonth] = useState(thisMonth()); // "" = all months
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState(undefined); // undefined = loading, false = not set up
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [customerModal, setCustomerModal] = useState(null); // {} = new, { customer } = edit
  const [cancelTarget, setCancelTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const [inv, cust] = await Promise.all([api.getInvoices({ month }), api.getCustomers()]);
      setInvoices(inv);
      setCustomers(cust);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.getGstSettings().then(setSettings).catch(() => setSettings(false));
  }, []);

  const summary = useMemo(() => {
    const live = invoices.filter((i) => i.status === "issued");
    const sum = (f) => live.reduce((s, i) => s + f(i), 0);
    return {
      count: live.length,
      cancelled: invoices.length - live.length,
      taxable: sum((i) => i.taxable),
      gst: sum((i) => i.cgst + i.sgst + i.igst),
      grand: sum((i) => i.grand),
    };
  }, [invoices]);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return invoices.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (!term) return true;
      return [i.invoiceNo, i.billName, i.billGstin].some((v) => (v || "").toLowerCase().includes(term));
    });
  }, [invoices, query, statusFilter]);

  // Monthly record for the CA (opens in Excel)
  const exportCsv = () => {
    const head = ["Invoice No", "Date", "Customer", "Customer GSTIN", "Place of supply", "Taxable value", "CGST", "SGST", "IGST", "Round off", "Invoice total", "Status"];
    const lines = invoices.map((i) => {
      const live = i.status === "issued";
      const n = (v) => (live ? v.toFixed(2) : "0.00");
      return [i.invoiceNo, dmy(i.date), i.billName, i.billGstin, stateName(i.placeOfSupply), n(i.taxable), n(i.cgst), n(i.sgst), n(i.igst), n(i.roundOff), n(i.grand), live ? "Issued" : `Cancelled (${i.cancelReason})`]
        .map(csvCell)
        .join(",");
    });
    const blob = new Blob(["\uFEFF" + [head.map(csvCell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gst-sales-${month || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const removeCustomer = async (c) => {
    if (!window.confirm(`Remove "${c.name}" from the customer list? Old invoices keep their details.`)) return;
    try {
      await api.deleteCustomer(c.id);
      load();
    } catch (e) {
      window.alert(e.message);
    }
  };

  const periodLabel = month ? monthLabel(month) : "All months";

  return (
    <main className="min-h-full flex-1 bg-slate-50 !p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-orange-600">Accounts</p>
          <h2 className="!mt-1 text-4xl font-bold tracking-tight text-slate-900">GST Billing</h2>
          <p className="!mt-1 text-base text-slate-500">Make tax invoices and keep a monthly record.</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white !px-4 !py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <SettingsIcon className="h-4 w-4" /> Invoice settings
          </button>
          <button
            type="button"
            onClick={() => navigate("/gst-billing/new")}
            className="flex items-center gap-2 rounded-xl bg-orange-600 !px-5 !py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700"
          >
            <Plus className="h-4 w-4" /> New invoice
          </button>
        </div>
      </div>

      <GstTabs />

      {settings === false && (
        <p className="!mt-5 rounded-xl bg-amber-50 !px-4 !py-3 text-sm font-medium text-amber-800">
          Your business details are not set up yet. Click "Invoice settings" and fill them in before making an invoice.
        </p>
      )}
      {settings && !settings.bankDetails && (
        <p className="!mt-5 rounded-xl bg-amber-50 !px-4 !py-3 text-sm text-amber-800">
          Tip: add your bank details in "Invoice settings" so they print on every invoice.
        </p>
      )}

      <div className="!mt-6 flex flex-wrap gap-2">
        {[
          ["invoices", "Invoices"],
          ["customers", `Customers (${customers.length})`],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl !px-4 !py-2 text-sm font-medium transition-colors ${
              tab === id ? "bg-orange-600 text-white shadow-md shadow-orange-500/30" : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "invoices" && (
        <>
          <div className="!mt-5 flex flex-wrap items-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm text-slate-800 outline-none focus:border-orange-500"
            />
            <button type="button" onClick={() => setMonth(thisMonth())} className="rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              This month
            </button>
            <button
              type="button"
              onClick={() => setMonth("")}
              className={`rounded-xl border !px-3.5 !py-2.5 text-sm font-medium ${
                month === "" ? "border-orange-600 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              All months
            </button>
            <span className="text-sm text-slate-500">Showing: {periodLabel}</span>
            <button
              type="button"
              onClick={exportCsv}
              disabled={invoices.length === 0}
              className="ml-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white !px-4 !py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Export for CA (Excel)
            </button>
          </div>

          <section className="grid grid-cols-1 gap-5 !mt-5 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Invoices", String(summary.count), summary.cancelled ? `${summary.cancelled} cancelled` : "Issued", "text-slate-900"],
              ["Taxable value", `₹${inr(summary.taxable)}`, "Before GST", "text-slate-900"],
              ["GST charged", `₹${inr(summary.gst)}`, "CGST + SGST + IGST", "text-amber-600"],
              ["Invoice total", `₹${inr(summary.grand)}`, "With GST", "text-green-600"],
            ].map(([label, value, caption, tone]) => (
              <div key={label} className="rounded-3xl border border-slate-200/70 bg-white !p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-600">{label}</p>
                <p className={`!mt-2 text-3xl font-bold ${tone}`}>{value}</p>
                <p className="!mt-1 text-sm text-slate-400">{caption}</p>
              </div>
            ))}
          </section>

          <section className="!mt-6 rounded-3xl border border-slate-200/70 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 !p-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search invoice number, customer or GSTIN…"
                  className="w-full rounded-xl border border-slate-200 bg-white !py-2.5 !pl-10 !pr-3.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm text-slate-700 outline-none focus:border-orange-500"
              >
                <option value="all">All invoices</option>
                <option value="issued">Issued only</option>
                <option value="cancelled">Cancelled only</option>
              </select>
            </div>

            {loading ? (
              <p className="!px-6 !py-16 text-center text-sm text-slate-500">Loading invoices…</p>
            ) : error ? (
              <div className="!px-6 !py-16 text-center">
                <p className="text-sm font-medium text-red-600">{error}</p>
                <button type="button" onClick={load} className="!mt-3 rounded-xl border border-slate-200 !px-4 !py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Try again
                </button>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center !px-6 !py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
                  <ReceiptText className="h-8 w-8 text-orange-600" strokeWidth={1.6} />
                </div>
                <h4 className="!mt-4 text-lg font-semibold text-slate-900">
                  {invoices.length === 0 ? `No invoices for ${periodLabel}` : "No invoices match your search"}
                </h4>
                <p className="!mt-1 text-sm text-slate-500">
                  {invoices.length === 0 ? "Click “New invoice” to make the first one." : "Try different words."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500">
                      <th className="!px-5 !py-3">Invoice no</th>
                      <th className="!px-5 !py-3">Date</th>
                      <th className="!px-5 !py-3">Customer</th>
                      <th className="!px-5 !py-3 text-right">Taxable</th>
                      <th className="!px-5 !py-3 text-right">GST</th>
                      <th className="!px-5 !py-3 text-right">Total</th>
                      <th className="!px-5 !py-3">Status</th>
                      <th className="!px-5 !py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((i) => {
                      const live = i.status === "issued";
                      return (
                        <tr key={i.id} onClick={() => navigate(`/invoice/${i.id}`)} className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                          <td className="whitespace-nowrap !px-5 !py-4 font-semibold text-slate-900">{i.invoiceNo}</td>
                          <td className="whitespace-nowrap !px-5 !py-4 text-slate-700">{dmy(i.date)}</td>
                          <td className="!px-5 !py-4">
                            <p className="text-slate-900">{i.billName}</p>
                            <p className="text-xs text-slate-500">{i.billGstin || "Unregistered"}</p>
                          </td>
                          <td className={`whitespace-nowrap !px-5 !py-4 text-right ${live ? "text-slate-700" : "text-slate-400 line-through"}`}>{inr(i.taxable)}</td>
                          <td className={`whitespace-nowrap !px-5 !py-4 text-right ${live ? "text-amber-700" : "text-slate-400 line-through"}`}>{inr(i.cgst + i.sgst + i.igst)}</td>
                          <td className={`whitespace-nowrap !px-5 !py-4 text-right font-semibold ${live ? "text-slate-900" : "text-slate-400 line-through"}`}>{inr(i.grand)}</td>
                          <td className="!px-5 !py-4">
                            {live ? (
                              <span className="inline-block rounded-full bg-green-50 !px-2.5 !py-0.5 text-xs font-semibold text-green-700">Issued</span>
                            ) : (
                              <span title={i.cancelReason} className="inline-block rounded-full bg-red-50 !px-2.5 !py-0.5 text-xs font-semibold text-red-700">
                                Cancelled
                              </span>
                            )}
                          </td>
                          <td className="!px-5 !py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/invoice/${i.id}`); }} aria-label="View and print" className="rounded-lg !p-2 text-slate-500 hover:bg-slate-100">
                                <Printer className="h-4 w-4" />
                              </button>
                              {live && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); setCancelTarget(i); }} aria-label="Cancel invoice" className="rounded-lg !p-2 text-red-500 hover:bg-red-50">
                                  <Ban className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {tab === "customers" && (
        <section className="!mt-5 rounded-3xl border border-slate-200/70 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 !p-4">
            <p className="text-sm text-slate-500">People and companies you make invoices for.</p>
            <button
              type="button"
              onClick={() => setCustomerModal({})}
              className="flex items-center gap-2 rounded-xl bg-orange-600 !px-4 !py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700"
            >
              <Plus className="h-4 w-4" /> Add customer
            </button>
          </div>
          {customers.length === 0 ? (
            <p className="!px-6 !py-14 text-center text-sm text-slate-500">No customers yet. Add one, or add it while making an invoice.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500">
                    <th className="!px-5 !py-3">Name</th>
                    <th className="!px-5 !py-3">GSTIN</th>
                    <th className="!px-5 !py-3">State</th>
                    <th className="!px-5 !py-3">Phone</th>
                    <th className="!px-5 !py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 last:border-0">
                      <td className="!px-5 !py-4">
                        <p className="font-semibold text-slate-900">{c.name}</p>
                        <p className="max-w-xs truncate text-xs text-slate-500">{c.address}</p>
                      </td>
                      <td className="whitespace-nowrap !px-5 !py-4 text-slate-700">{c.gstin || "Unregistered"}</td>
                      <td className="!px-5 !py-4 text-slate-700">{stateName(c.stateCode)}</td>
                      <td className="!px-5 !py-4 text-slate-700">{c.phone || "-"}</td>
                      <td className="!px-5 !py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => setCustomerModal({ customer: c })} aria-label="Edit customer" className="rounded-lg !p-2 text-slate-500 hover:bg-slate-100">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => removeCustomer(c)} aria-label="Remove customer" className="rounded-lg !p-2 text-red-500 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {showSettings && (
        <SettingsModal
          settings={settings || null}
          onClose={() => setShowSettings(false)}
          onSaved={(s) => {
            setSettings(s);
            setShowSettings(false);
          }}
        />
      )}
      {customerModal && (
        <CustomerModal
          customer={customerModal.customer}
          onClose={() => setCustomerModal(null)}
          onSaved={() => {
            setCustomerModal(null);
            load();
          }}
        />
      )}
      {cancelTarget && (
        <CancelModal
          invoice={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onDone={() => {
            setCancelTarget(null);
            load();
          }}
        />
      )}
    </main>
  );
};

export default GstBilling;