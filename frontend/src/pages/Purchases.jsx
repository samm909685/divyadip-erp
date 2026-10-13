import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, X, Pencil, Trash2, IndianRupee, ShoppingCart } from "lucide-react";
import { api } from "../services/api";

/*
  Purchase Details: raw materials bought from shops, what was paid and what is pending.
  - Each BILL has a total. Payments are added against the bill (part payments are fine).
  - Paid and Pending are calculated from the payments, so they can never go out of sync.
  - "Shops" tab = shop-wise total / paid / pending, with Pending or Paid status.
  Spacing classes use the "!" prefix so they work with a global CSS reset.
*/

const MODES = [
  ["cash", "Cash"],
  ["upi", "UPI"],
  ["bank", "Bank transfer"],
  ["cheque", "Cheque"],
  ["other", "Other"],
];
const modeLabel = (m) => MODES.find(([v]) => v === m)?.[1] ?? m;

const fmtMoney = (n) =>
  `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const fmtDate = (d) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "-";
const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
const thisMonth = () => todayStr().slice(0, 7);
const monthLabel = (m) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";
const labelCls = "!mb-1.5 block text-sm font-medium text-slate-700";

const StatusBadge = ({ pending }) =>
  pending > 0 ? (
    <span className="inline-block rounded-full bg-amber-50 !px-2.5 !py-0.5 text-xs font-semibold text-amber-700">
      Pending
    </span>
  ) : (
    <span className="inline-block rounded-full bg-green-50 !px-2.5 !py-0.5 text-xs font-semibold text-green-700">
      Paid
    </span>
  );

const ModalShell = ({ title, subtitle, onClose, children, wide }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 !p-4">
    <div
      className={`max-h-[90vh] w-full overflow-y-auto rounded-3xl bg-white !p-6 shadow-2xl ${
        wide ? "max-w-xl" : "max-w-md"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="!mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg !p-1.5 text-slate-400 hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const ModalActions = ({ onClose, onSubmit, saving, label }) => (
  <div className="!mt-6 flex justify-end gap-3">
    <button
      type="button"
      onClick={onClose}
      className="rounded-xl border border-slate-200 !px-4 !py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      Cancel
    </button>
    <button
      type="button"
      onClick={onSubmit}
      disabled={saving}
      className="rounded-xl bg-orange-600 !px-5 !py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700 disabled:opacity-60"
    >
      {saving ? "Saving…" : label}
    </button>
  </div>
);

/* ---------- Add / edit a bill ---------- */
const PurchaseFormModal = ({ purchase, shopNames, onClose, onSaved }) => {
  const isNew = !purchase;
  const [form, setForm] = useState(() =>
    purchase
      ? {
          shop: purchase.shop,
          billNo: purchase.billNo,
          date: purchase.date,
          material: purchase.material,
          total: String(purchase.total),
          notes: purchase.notes,
          paidNow: "",
          mode: "cash",
        }
      : { shop: "", billNo: "", date: todayStr(), material: "", total: "", notes: "", paidNow: "", mode: "cash" }
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError("");
  };

  const submit = async () => {
    const total = Number(form.total);
    const paidNow = form.paidNow === "" ? 0 : Number(form.paidNow);
    if (!form.shop.trim()) return setError("Shop name is required.");
    if (!form.material.trim()) return setError("Enter what was purchased.");
    if (!Number.isFinite(total) || total <= 0) return setError("Enter a total amount greater than 0.");
    if (isNew && (!Number.isFinite(paidNow) || paidNow < 0)) return setError("Paid amount is not valid.");
    if (isNew && paidNow > total) return setError("Paid amount cannot be more than the total.");

    setSaving(true);
    try {
      const body = {
        shop: form.shop,
        billNo: form.billNo,
        date: form.date,
        material: form.material,
        total,
        notes: form.notes,
      };
      if (isNew) {
        const created = await api.createPurchase(body);
        if (paidNow > 0) {
          try {
            await api.addPurchasePayment(created.id, { amount: paidNow, date: form.date, mode: form.mode, note: "" });
          } catch (e) {
            window.alert(`The bill was saved, but the payment could not be added: ${e.message}`);
          }
        }
      } else {
        await api.updatePurchase(purchase.id, body);
      }
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={isNew ? "Add purchase" : "Edit purchase"}
      subtitle={isNew ? "Record materials bought from a shop." : `${purchase.shop} · ${fmtDate(purchase.date)}`}
      onClose={onClose}
      wide
    >
      <div className="!mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Shop / supplier name *</label>
          <input className={inputCls} list="shop-list" value={form.shop} onChange={set("shop")} />
          <datalist id="shop-list">
            {shopNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelCls}>Bill number</label>
          <input className={inputCls} value={form.billNo} onChange={set("billNo")} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>What was purchased *</label>
          <textarea
            rows={3}
            className={inputCls}
            value={form.material}
            onChange={set("material")}
            placeholder="e.g. 200 kg M.S. rod, 50 cutting inserts, lubricant oil"
          />
        </div>
        <div>
          <label className={labelCls}>Purchase date *</label>
          <input type="date" className={inputCls} value={form.date} onChange={set("date")} />
        </div>
        <div>
          <label className={labelCls}>Total amount (₹) *</label>
          <input type="number" min="0" step="0.01" className={inputCls} value={form.total} onChange={set("total")} />
        </div>
        {isNew && (
          <>
            <div>
              <label className={labelCls}>Paid now (₹), if any</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputCls}
                value={form.paidNow}
                onChange={set("paidNow")}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelCls}>Payment mode</label>
              <select className={inputCls} value={form.mode} onChange={set("mode")}>
                {MODES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <label className={labelCls}>Notes (optional)</label>
          <input className={inputCls} value={form.notes} onChange={set("notes")} />
        </div>
      </div>
      {!isNew && (
        <p className="!mt-3 text-xs text-slate-500">
          Already paid: {fmtMoney(purchase.paid)}. Total can't go below this.
        </p>
      )}
      {error && <p className="!mt-3 text-sm font-medium text-red-600">{error}</p>}
      <ModalActions onClose={onClose} onSubmit={submit} saving={saving} label={isNew ? "Add purchase" : "Save changes"} />
    </ModalShell>
  );
};

/* ---------- Add / edit a payment ---------- */
const PaymentModal = ({ purchase, payment, onClose, onSaved }) => {
  const isEdit = Boolean(payment);
  const max = isEdit ? Math.round((purchase.pending + payment.amount) * 100) / 100 : purchase.pending;
  const [amount, setAmount] = useState(String(isEdit ? payment.amount : purchase.pending));
  const [date, setDate] = useState(isEdit ? payment.date : todayStr());
  const [mode, setMode] = useState(isEdit ? payment.mode : "cash");
  const [note, setNote] = useState(isEdit ? payment.note : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setError("Enter an amount greater than 0.");
    if (Math.round(n * 100) > Math.round(max * 100)) return setError(`Only ${fmtMoney(max)} can be paid on this bill.`);
    setSaving(true);
    try {
      const body = { amount: n, date, mode, note: note.trim() };
      if (isEdit) await api.updatePurchasePayment(payment.id, body);
      else await api.addPurchasePayment(purchase.id, body);
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={isEdit ? "Edit payment" : "Add payment"}
      subtitle={`${purchase.shop} · Bill ${purchase.billNo || fmtDate(purchase.date)}`}
      onClose={onClose}
    >
      <div className="!mt-4 rounded-xl bg-slate-50 !px-3.5 !py-2.5 text-sm text-slate-600">
        Pending on this bill: <span className="font-semibold">{fmtMoney(max)}</span>
      </div>
      <div className="!mt-4 flex flex-col gap-4">
        <div>
          <label className={labelCls}>Amount paid (₹)</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              className={inputCls}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError("");
              }}
            />
            <button
              type="button"
              onClick={() => setAmount(String(max))}
              className="shrink-0 rounded-xl border border-slate-200 !px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Full
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Mode</label>
            <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value)}>
              {MODES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Note (optional)</label>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. cheque no." />
        </div>
      </div>
      {error && <p className="!mt-3 text-sm font-medium text-red-600">{error}</p>}
      <ModalActions onClose={onClose} onSubmit={submit} saving={saving} label="Save payment" />
    </ModalShell>
  );
};

/* ---------- Bill drawer: details + payment history ---------- */
const PurchaseDrawer = ({ purchaseId, onClose, onChanged }) => {
  const [p, setP] = useState(null);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(null); // {} for new, { entry } for edit
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      setP(await api.getPurchase(purchaseId));
    } catch (e) {
      setError(e.message);
    }
  }, [purchaseId]);

  useEffect(() => {
    load();
  }, [load]);

  const afterChange = async () => {
    setPaying(null);
    setEditing(false);
    await load();
    onChanged();
  };

  const removePayment = async (entry) => {
    if (!window.confirm(`Delete this payment of ${fmtMoney(entry.amount)}?`)) return;
    try {
      await api.deletePurchasePayment(entry.id);
      await afterChange();
    } catch (e) {
      setError(e.message);
    }
  };

  const removeBill = async () => {
    if (!window.confirm(`Delete this bill from ${p.shop} and all its payments? This cannot be undone.`)) return;
    try {
      await api.deletePurchase(p.id);
      onChanged();
      onClose();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white !p-6 shadow-2xl">
        {!p ? (
          <div className="flex items-start justify-between">
            <p className="text-sm text-slate-500">{error || "Loading…"}</p>
            <button type="button" onClick={onClose} className="rounded-lg !p-1.5 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-orange-600">
                  {p.billNo ? `Bill ${p.billNo}` : "Purchase"} · {fmtDate(p.date)}
                </p>
                <h3 className="!mt-0.5 text-xl font-semibold text-slate-900">{p.shop}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-lg !p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="!mt-3 whitespace-pre-line text-sm text-slate-600">{p.material}</p>
            {p.notes && <p className="!mt-2 text-xs text-slate-500">Note: {p.notes}</p>}

            <div className="!mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-50 !p-3 text-slate-700">
                <p className="text-xs font-medium">Total</p>
                <p className="!mt-1 text-lg font-bold">{fmtMoney(p.total)}</p>
              </div>
              <div className="rounded-2xl bg-green-50 !p-3 text-green-700">
                <p className="text-xs font-medium">Paid</p>
                <p className="!mt-1 text-lg font-bold">{fmtMoney(p.paid)}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 !p-3 text-amber-700">
                <p className="text-xs font-medium">Pending</p>
                <p className="!mt-1 text-lg font-bold">{fmtMoney(p.pending)}</p>
              </div>
            </div>

            <div className="!mt-5 flex gap-3">
              <button
                type="button"
                disabled={p.pending <= 0}
                onClick={() => setPaying({})}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 !px-4 !py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IndianRupee className="h-4 w-4" /> Add payment
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 !px-4 !py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            </div>

            {error && <p className="!mt-3 text-sm font-medium text-red-600">{error}</p>}

            <h4 className="!mb-3 !mt-6 text-base font-semibold text-slate-900">Payment history</h4>
            {p.payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payment made yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {p.payments.map((pay) => (
                  <li
                    key={pay.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 !px-3.5 !py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{fmtMoney(pay.amount)}</p>
                      <p className="truncate text-xs text-slate-500">
                        {fmtDate(pay.date)} · {modeLabel(pay.mode)}
                        {pay.note ? ` · ${pay.note}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaying({ entry: pay })}
                      aria-label="Edit payment"
                      className="rounded-lg !p-1.5 text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePayment(pay)}
                      aria-label="Delete payment"
                      className="rounded-lg !p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={removeBill}
              className="!mt-8 flex items-center gap-2 text-sm font-medium text-red-600 hover:underline"
            >
              <Trash2 className="h-4 w-4" /> Delete this bill
            </button>

            {paying && (
              <PaymentModal purchase={p} payment={paying.entry} onClose={() => setPaying(null)} onSaved={afterChange} />
            )}
            {editing && (
              <PurchaseFormModal purchase={p} shopNames={[]} onClose={() => setEditing(false)} onSaved={afterChange} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ---------- Summary card ---------- */
const SummaryCard = ({ label, value, caption, tone }) => (
  <div className="rounded-3xl border border-slate-200/70 bg-white !p-5 shadow-sm">
    <p className="text-sm font-semibold text-slate-600">{label}</p>
    <p className={`!mt-2 text-3xl font-bold ${tone}`}>{value}</p>
    <p className="!mt-1 text-sm text-slate-400">{caption}</p>
  </div>
);

/* ---------- Page ---------- */
const Purchases = () => {
  const [month, setMonth] = useState(thisMonth()); // "" = all months
  const [purchases, setPurchases] = useState([]);
  const [shopNames, setShopNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("bills");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [shopFilter, setShopFilter] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState(null);

  const load = useCallback(async () => {
    try {
      const [list, names] = await Promise.all([api.getPurchases(month), api.getShopNames()]);
      setPurchases(list);
      setShopNames(names);
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

  const summary = useMemo(() => {
    const total = purchases.reduce((s, p) => s + p.total, 0);
    const paid = purchases.reduce((s, p) => s + p.paid, 0);
    return {
      total,
      paid,
      pending: Math.round((total - paid) * 100) / 100,
      bills: purchases.length,
      pendingBills: purchases.filter((p) => p.pending > 0).length,
    };
  }, [purchases]);

  const shops = useMemo(() => {
    const map = new Map();
    purchases.forEach((p) => {
      const key = p.shop.trim().toLowerCase();
      const row = map.get(key) || { key, name: p.shop, bills: 0, total: 0, paid: 0 };
      row.bills += 1;
      row.total += p.total;
      row.paid += p.paid;
      map.set(key, row);
    });
    return [...map.values()]
      .map((r) => ({ ...r, pending: Math.round((r.total - r.paid) * 100) / 100 }))
      .sort((a, b) => b.pending - a.pending || a.name.localeCompare(b.name));
  }, [purchases]);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return purchases.filter((p) => {
      if (shopFilter && p.shop.trim().toLowerCase() !== shopFilter) return false;
      if (status === "pending" && p.pending <= 0) return false;
      if (status === "completed" && p.pending > 0) return false;
      if (!term) return true;
      return [p.shop, p.billNo, p.material].some((v) => (v || "").toLowerCase().includes(term));
    });
  }, [purchases, query, status, shopFilter]);

  const afterChange = () => {
    setAdding(false);
    setPaying(null);
    load();
  };

  const periodLabel = month ? monthLabel(month) : "All months";

  return (
    <main className="min-h-full flex-1 bg-slate-50 !p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-orange-600">Accounts</p>
          <h2 className="!mt-1 text-4xl font-bold tracking-tight text-slate-900">Purchase Details</h2>
          <p className="!mt-1 text-base text-slate-500">Raw materials bought from shops, payments made and pending.</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-xl bg-orange-600 !px-5 !py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" /> Add purchase
        </button>
      </div>

      {/* Month selector */}
      <div className="!mt-6 flex flex-wrap items-center gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm text-slate-800 outline-none focus:border-orange-500"
        />
        <button
          type="button"
          onClick={() => setMonth(thisMonth())}
          className="rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
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
      </div>

      {/* Summary */}
      <section className="grid grid-cols-1 gap-5 !mt-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total purchased" value={fmtMoney(summary.total)} caption={`${summary.bills} bills`} tone="text-slate-900" />
        <SummaryCard label="Paid" value={fmtMoney(summary.paid)} caption="Given so far" tone="text-green-600" />
        <SummaryCard label="Pending" value={fmtMoney(summary.pending)} caption="Still to be paid" tone="text-amber-600" />
        <SummaryCard
          label="Bills pending"
          value={summary.pendingBills}
          caption={`of ${summary.bills} bills`}
          tone="text-slate-900"
        />
      </section>

      <section className="!mt-6 rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-100 !p-4">
          {[
            ["bills", "Bills"],
            ["shops", "Shop-wise"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-xl !px-4 !py-2 text-sm font-medium transition-colors ${
                tab === id ? "bg-orange-600 text-white shadow-md shadow-orange-500/30" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "bills" && (
          <div className="flex flex-col gap-3 !p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shop, bill number or material…"
                className="w-full rounded-xl border border-slate-200 bg-white !py-2.5 !pl-10 !pr-3.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm text-slate-700 outline-none focus:border-orange-500"
            >
              <option value="all">All bills</option>
              <option value="pending">Pending only</option>
              <option value="completed">Fully paid only</option>
            </select>
          </div>
        )}

        {tab === "bills" && shopFilter && (
          <div className="!px-4 !pb-3">
            <button
              type="button"
              onClick={() => setShopFilter("")}
              className="inline-flex items-center gap-2 rounded-full bg-orange-50 !px-3 !py-1 text-xs font-semibold text-orange-700"
            >
              Shop: {shops.find((s) => s.key === shopFilter)?.name ?? shopFilter} <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {loading ? (
          <p className="!px-6 !py-16 text-center text-sm text-slate-500">Loading purchases…</p>
        ) : error ? (
          <div className="!px-6 !py-16 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={load}
              className="!mt-3 rounded-xl border border-slate-200 !px-4 !py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Try again
            </button>
          </div>
        ) : purchases.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center !px-6 !py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
              <ShoppingCart className="h-8 w-8 text-orange-600" strokeWidth={1.6} />
            </div>
            <h4 className="!mt-4 text-lg font-semibold text-slate-900">No purchases for {periodLabel}</h4>
            <p className="!mt-1 text-sm text-slate-500">Click “Add purchase” to record materials bought from a shop.</p>
          </div>
        ) : tab === "shops" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="!px-5 !py-3">Shop</th>
                  <th className="!px-5 !py-3">Bills</th>
                  <th className="!px-5 !py-3">Total</th>
                  <th className="!px-5 !py-3">Paid</th>
                  <th className="!px-5 !py-3">Pending</th>
                  <th className="!px-5 !py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {shops.map((s) => (
                  <tr
                    key={s.key}
                    onClick={() => {
                      setShopFilter(s.key);
                      setTab("bills");
                    }}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="!px-5 !py-4 font-semibold text-slate-900">{s.name}</td>
                    <td className="!px-5 !py-4 text-slate-700">{s.bills}</td>
                    <td className="whitespace-nowrap !px-5 !py-4 text-slate-700">{fmtMoney(s.total)}</td>
                    <td className="whitespace-nowrap !px-5 !py-4 text-green-700">{fmtMoney(s.paid)}</td>
                    <td className="whitespace-nowrap !px-5 !py-4 font-semibold text-amber-700">{fmtMoney(s.pending)}</td>
                    <td className="!px-5 !py-4">
                      <StatusBadge pending={s.pending} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : rows.length === 0 ? (
          <p className="!px-6 !py-12 text-center text-sm text-slate-500">No bills match your search or filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="!px-5 !py-3">Date</th>
                  <th className="!px-5 !py-3">Shop</th>
                  <th className="!px-5 !py-3">Material</th>
                  <th className="!px-5 !py-3">Total</th>
                  <th className="!px-5 !py-3">Paid</th>
                  <th className="!px-5 !py-3">Pending</th>
                  <th className="!px-5 !py-3">Status</th>
                  <th className="!px-5 !py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap !px-5 !py-4 text-slate-700">{fmtDate(p.date)}</td>
                    <td className="!px-5 !py-4">
                      <p className="font-semibold text-slate-900">{p.shop}</p>
                      {p.billNo && <p className="text-xs text-slate-500">Bill {p.billNo}</p>}
                    </td>
                    <td className="max-w-[220px] truncate !px-5 !py-4 text-slate-700">{p.material}</td>
                    <td className="whitespace-nowrap !px-5 !py-4 text-slate-700">{fmtMoney(p.total)}</td>
                    <td className="whitespace-nowrap !px-5 !py-4 text-green-700">{fmtMoney(p.paid)}</td>
                    <td className="whitespace-nowrap !px-5 !py-4 font-semibold text-amber-700">{fmtMoney(p.pending)}</td>
                    <td className="!px-5 !py-4">
                      <StatusBadge pending={p.pending} />
                    </td>
                    <td className="!px-5 !py-4 text-right">
                      {p.pending > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPaying(p);
                          }}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-orange-200 bg-orange-50 !px-3.5 !py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                        >
                          <IndianRupee className="h-3.5 w-3.5" /> Pay
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Done</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedId && <PurchaseDrawer purchaseId={selectedId} onClose={() => setSelectedId(null)} onChanged={load} />}
      {adding && <PurchaseFormModal purchase={null} shopNames={shopNames} onClose={() => setAdding(false)} onSaved={afterChange} />}
      {paying && <PaymentModal purchase={paying} onClose={() => setPaying(null)} onSaved={afterChange} />}
    </main>
  );
};

export default Purchases;