import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, X, Pencil, Trash2, Upload, FileText, ExternalLink, Download, ReceiptText } from "lucide-react";
import { api } from "../services/api";
import GstTabs from "../components/gst/GstTabs";
import { STATES, GST_RATES, stateName, validateGstin, calcInvoice, inr, dmy } from "../utils/gstCalc";

/*
  Received bills: the GST bills Divyadip gets from its suppliers (like the S B Tools invoice).
  They are the record used to claim input tax credit. A bill from the same supplier with the
  same invoice number can only be entered once.
  Spacing classes use the "!" prefix so they work with a global CSS reset.
*/

const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const todayStr = () => new Date().toLocaleDateString("en-CA");
const thisMonth = () => todayStr().slice(0, 7);
const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white !px-3 !py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";
const labelCls = "!mb-1.5 block text-sm font-medium text-slate-700";

/* ---------- Add / edit a received bill ---------- */
const BillModal = ({ bill, suppliers, ownState, onClose, onSaved }) => {
  const isEdit = Boolean(bill);
  const [supplierName, setSupplierName] = useState(bill?.supplierName ?? "");
  const [gstin, setGstin] = useState(bill?.supplierGstin ?? "");
  const [manualState, setManualState] = useState(bill?.supplierStateCode ?? ownState);
  const [invoiceNo, setInvoiceNo] = useState(bill?.invoiceNo ?? "");
  const [invoiceDate, setInvoiceDate] = useState(bill?.invoiceDate ?? todayStr());
  const [placeOfSupply, setPlaceOfSupply] = useState(bill?.placeOfSupply ?? ownState);
  const [description, setDescription] = useState(bill?.description ?? "");
  const [lines, setLines] = useState(
    bill ? bill.lines.map((l, i) => ({ key: i + 1, taxable: String(l.taxable), gstRate: l.gstRate })) : [{ key: 1, taxable: "", gstRate: 18 }]
  );
  const [billTotal, setBillTotal] = useState(bill ? String(bill.billTotal) : "");
  const [itc, setItc] = useState(bill ? bill.itcEligible : true);
  const [notes, setNotes] = useState(bill?.notes ?? "");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const gstinClean = gstin.trim().toUpperCase();
  const derivedState = gstinClean.length >= 2 && STATES.some(([c]) => c === gstinClean.slice(0, 2)) ? gstinClean.slice(0, 2) : null;
  const supplierState = derivedState || manualState;
  const interstate = supplierState !== placeOfSupply;
  const hasGstin = gstinClean.length > 0;

  const countable = lines.filter((l) => Number(l.taxable) > 0);
  const calc = useMemo(
    () => calcInvoice(countable.map((l) => ({ qty: 1, rate: l.taxable, gstRate: Number(l.gstRate) })), interstate),
    [countable, interstate]
  );
  const computedTotal = calc.totalPaise / 100;
  const typedTotal = Number(billTotal);
  const mismatch = countable.length > 0 && typedTotal > 0 && Math.abs(computedTotal - typedTotal) > 1;

  // Choosing a supplier used before fills in its GSTIN
  const onSupplierName = (value) => {
    setSupplierName(value);
    setError("");
    const known = suppliers.find((s) => s.name.toLowerCase() === value.trim().toLowerCase());
    if (known && !gstin) {
      setGstin(known.gstin);
      setManualState(known.stateCode);
    }
  };

  const updateLine = (key, field, value) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  const lineTax = (l) => {
    if (!(Number(l.taxable) > 0)) return "";
    const c = calcInvoice([{ qty: 1, rate: l.taxable, gstRate: Number(l.gstRate) }], interstate);
    return interstate ? `IGST ${inr(c.igstPaise / 100)}` : `CGST ${inr(c.cgstPaise / 100)} · SGST ${inr(c.sgstPaise / 100)}`;
  };

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) return setError("Only JPG, PNG, WebP or PDF files are allowed.");
    if (f.size > 10 * 1024 * 1024) return setError("File is too large (max 10 MB).");
    setError("");
    setFile(f);
  };

  const submit = async () => {
    if (!supplierName.trim()) return setError("Supplier name is required.");
    if (hasGstin) {
      const problem = validateGstin(gstinClean);
      if (problem) return setError(problem);
    }
    if (!invoiceNo.trim()) return setError("Enter the supplier's invoice number.");
    if (!invoiceDate) return setError("Invoice date is required.");
    if (countable.length === 0) return setError("Enter the taxable amount of the bill.");
    if (!(typedTotal > 0)) return setError("Enter the bill total as printed on the bill.");

    const fd = new FormData();
    fd.append("supplierName", supplierName);
    fd.append("supplierGstin", gstinClean);
    fd.append("supplierStateCode", supplierState);
    fd.append("invoiceNo", invoiceNo);
    fd.append("invoiceDate", invoiceDate);
    fd.append("placeOfSupply", placeOfSupply);
    fd.append("description", description);
    fd.append("notes", notes);
    fd.append("billTotal", billTotal);
    fd.append("itcEligible", hasGstin && itc ? "1" : "0");
    fd.append("lines", JSON.stringify(countable.map((l) => ({ taxable: Number(l.taxable), gstRate: Number(l.gstRate) }))));
    if (file) fd.append("file", file);

    setSaving(true);
    try {
      if (isEdit) await api.updateReceivedBill(bill.id, fd);
      else await api.createReceivedBill(fd);
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 !p-4">
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white !p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{isEdit ? "Edit received bill" : "Add received bill"}</h3>
            <p className="!mt-0.5 text-sm text-slate-500">Copy the details from the supplier's tax invoice.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg !p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="!mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Supplier name *</label>
            <input className={inputCls} list="supplier-list" value={supplierName} onChange={(e) => onSupplierName(e.target.value)} />
            <datalist id="supplier-list">
              {suppliers.map((s) => (
                <option key={s.name} value={s.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Supplier GSTIN</label>
            <input
              className={`${inputCls} uppercase`}
              maxLength={15}
              value={gstin}
              onChange={(e) => {
                setGstin(e.target.value);
                setError("");
              }}
              placeholder="27ABCDE1234F1Z5"
            />
          </div>
          <div>
            <label className={labelCls}>Supplier state</label>
            <select className={inputCls} value={supplierState} disabled={Boolean(derivedState)} onChange={(e) => setManualState(e.target.value)}>
              {STATES.map(([code, name]) => (
                <option key={code} value={code}>
                  {code} - {name}
                </option>
              ))}
            </select>
            {derivedState && <p className="!mt-1 text-xs text-slate-400">Taken from the GSTIN.</p>}
          </div>
          <div>
            <label className={labelCls}>Place of supply</label>
            <select className={inputCls} value={placeOfSupply} onChange={(e) => setPlaceOfSupply(e.target.value)}>
              {STATES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name} ({code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Supplier's invoice number *</label>
            <input className={inputCls} value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="e.g. 1841/2026-27" />
          </div>
          <div>
            <label className={labelCls}>Invoice date *</label>
            <input type="date" className={inputCls} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>What was bought (short note)</label>
            <input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. carbide inserts" />
          </div>
        </div>

        {/* Tax lines */}
        <div className="!mt-5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Taxable amount and GST rate *</label>
            <span className="text-xs text-slate-500">{interstate ? "IGST (supplier is in another state)" : "CGST + SGST (same state)"}</span>
          </div>
          <div className="!mt-2 flex flex-col gap-2">
            {lines.map((l) => (
              <div key={l.key} className="grid grid-cols-12 items-center gap-2">
                <input
                  className={`${inputCls} col-span-5`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Taxable amount (₹)"
                  value={l.taxable}
                  onChange={(e) => updateLine(l.key, "taxable", e.target.value)}
                />
                <select className={`${inputCls} col-span-3`} value={l.gstRate} onChange={(e) => updateLine(l.key, "gstRate", Number(e.target.value))}>
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}% GST
                    </option>
                  ))}
                </select>
                <span className="col-span-3 text-xs text-slate-500">{lineTax(l)}</span>
                <button
                  type="button"
                  onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))}
                  disabled={lines.length === 1}
                  aria-label="Remove line"
                  className="col-span-1 rounded-lg !p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setLines((ls) => (ls.length >= 20 ? ls : [...ls, { key: Math.max(...ls.map((x) => x.key)) + 1, taxable: "", gstRate: 18 }]))}
            className="!mt-2 flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:underline"
          >
            <Plus className="h-4 w-4" /> Add another rate
          </button>
        </div>

        <div className="!mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Bill total as printed (₹) *</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={billTotal} onChange={(e) => setBillTotal(e.target.value)} />
          </div>
          <div className="rounded-xl bg-slate-50 !p-3 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Taxable</span>
              <span>₹{inr(calc.taxablePaise / 100)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST</span>
              <span>₹{inr((calc.cgstPaise + calc.sgstPaise + calc.igstPaise) / 100)}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900">
              <span>Total from these lines</span>
              <span>₹{inr(computedTotal)}</span>
            </div>
          </div>
        </div>
        {mismatch && (
          <p className="!mt-2 rounded-xl bg-amber-50 !px-3 !py-2 text-sm text-amber-800">
            The bill total you typed (₹{inr(typedTotal)}) is different from the lines (₹{inr(computedTotal)}). Please check the amounts. Freight or other
            charges that are not in the lines can cause this. You can still save.
          </p>
        )}

        <label className={`!mt-4 flex items-start gap-2 text-sm ${hasGstin ? "cursor-pointer text-slate-700" : "text-slate-400"}`}>
          <input type="checkbox" checked={hasGstin && itc} disabled={!hasGstin} onChange={(e) => setItc(e.target.checked)} className="!mt-0.5 h-4 w-4 accent-orange-600" />
          <span>
            Counts for input tax credit (ITC)
            {!hasGstin && <span className="block text-xs">No credit can be claimed without the supplier's GSTIN.</span>}
          </span>
        </label>

        <div className="!mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Notes (optional)</label>
            <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Photo or PDF of the bill</label>
            {file ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 !px-3 !py-2">
                <FileText className="h-4 w-4 text-orange-600" />
                <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                <button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="text-slate-500 hover:text-slate-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 !px-3 !py-2.5 text-sm text-slate-500 hover:border-orange-400">
                <Upload className="h-4 w-4 text-orange-600" />
                {isEdit && bill.filePath ? "Replace the file" : "Choose a file"}
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={pickFile} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {error && <p className="!mt-4 text-sm font-medium text-red-600">{error}</p>}

        <div className="!mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 !px-4 !py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="rounded-xl bg-orange-600 !px-5 !py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : isEdit ? "Save changes" : "Add bill"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Page ---------- */
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const ReceivedBills = () => {
  const [month, setMonth] = useState(thisMonth()); // "" = all months
  const [bills, setBills] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ownState, setOwnState] = useState("27");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null); // {} = new, { bill } = edit

  const load = useCallback(async () => {
    try {
      const [list, sup] = await Promise.all([api.getReceivedBills(month), api.getSuppliers()]);
      setBills(list);
      setSuppliers(sup);
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
    api.getGstSettings().then((s) => setOwnState(s.stateCode)).catch(() => {});
  }, []);

  const summary = useMemo(() => {
    const gst = (b) => b.cgst + b.sgst + b.igst;
    return {
      count: bills.length,
      taxable: bills.reduce((s, b) => s + b.taxable, 0),
      gst: bills.reduce((s, b) => s + gst(b), 0),
      itc: bills.filter((b) => b.itcEligible).reduce((s, b) => s + gst(b), 0),
    };
  }, [bills]);

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return bills;
    return bills.filter((b) => [b.supplierName, b.supplierGstin, b.invoiceNo, b.description].some((v) => (v || "").toLowerCase().includes(term)));
  }, [bills, query]);

  const remove = async (b) => {
    if (!window.confirm(`Delete the bill ${b.invoiceNo} from ${b.supplierName}? This cannot be undone.`)) return;
    try {
      await api.deleteReceivedBill(b.id);
      load();
    } catch (e) {
      window.alert(e.message);
    }
  };

  const exportCsv = () => {
    const head = ["Supplier", "Supplier GSTIN", "Invoice No", "Invoice date", "Place of supply", "Taxable value", "CGST", "SGST", "IGST", "Bill total", "ITC eligible"];
    const lines = bills.map((b) =>
      [b.supplierName, b.supplierGstin, b.invoiceNo, dmy(b.invoiceDate), stateName(b.placeOfSupply), b.taxable.toFixed(2), b.cgst.toFixed(2), b.sgst.toFixed(2), b.igst.toFixed(2), b.billTotal.toFixed(2), b.itcEligible ? "Yes" : "No"]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob(["\uFEFF" + [head.map(csvCell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gst-received-${month || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const periodLabel = month ? monthLabel(month) : "All months";

  return (
    <main className="min-h-full flex-1 bg-slate-50 !p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-orange-600">Accounts</p>
          <h2 className="!mt-1 text-4xl font-bold tracking-tight text-slate-900">GST Billing</h2>
          <p className="!mt-1 text-base text-slate-500">Bills received from suppliers, for input tax credit.</p>
        </div>
        <button
          type="button"
          onClick={() => setModal({})}
          className="flex items-center gap-2 rounded-xl bg-orange-600 !px-5 !py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" /> Add received bill
        </button>
      </div>

      <GstTabs />

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
        <span className="text-sm text-slate-500">Showing: {periodLabel} (by the supplier's invoice date)</span>
        <button
          type="button"
          onClick={exportCsv}
          disabled={bills.length === 0}
          className="ml-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white !px-4 !py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export for CA (Excel)
        </button>
      </div>

      <section className="grid grid-cols-1 gap-5 !mt-5 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Bills", String(summary.count), "Received", "text-slate-900"],
          ["Taxable value", `₹${inr(summary.taxable)}`, "Before GST", "text-slate-900"],
          ["GST paid", `₹${inr(summary.gst)}`, "On all bills", "text-amber-600"],
          ["Credit (ITC)", `₹${inr(summary.itc)}`, "On bills that count", "text-green-600"],
        ].map(([label, value, caption, tone]) => (
          <div key={label} className="rounded-3xl border border-slate-200/70 bg-white !p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">{label}</p>
            <p className={`!mt-2 text-3xl font-bold ${tone}`}>{value}</p>
            <p className="!mt-1 text-sm text-slate-400">{caption}</p>
          </div>
        ))}
      </section>

      <section className="!mt-6 rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <div className="border-b border-slate-100 !p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search supplier, GSTIN or invoice number…"
              className="w-full rounded-xl border border-slate-200 bg-white !py-2.5 !pl-10 !pr-3.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>

        {loading ? (
          <p className="!px-6 !py-16 text-center text-sm text-slate-500">Loading bills…</p>
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
            <h4 className="!mt-4 text-lg font-semibold text-slate-900">{bills.length === 0 ? `No bills for ${periodLabel}` : "No bills match your search"}</h4>
            <p className="!mt-1 text-sm text-slate-500">{bills.length === 0 ? "Click “Add received bill” to enter one." : "Try different words."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="!px-5 !py-3">Date</th>
                  <th className="!px-5 !py-3">Supplier</th>
                  <th className="!px-5 !py-3">Invoice no</th>
                  <th className="!px-5 !py-3 text-right">Taxable</th>
                  <th className="!px-5 !py-3 text-right">GST</th>
                  <th className="!px-5 !py-3 text-right">Bill total</th>
                  <th className="!px-5 !py-3">ITC</th>
                  <th className="!px-5 !py-3">Copy</th>
                  <th className="!px-5 !py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 last:border-0">
                    <td className="whitespace-nowrap !px-5 !py-4 text-slate-700">{dmy(b.invoiceDate)}</td>
                    <td className="!px-5 !py-4">
                      <p className="font-semibold text-slate-900">{b.supplierName}</p>
                      <p className="text-xs text-slate-500">{b.supplierGstin || "Unregistered"}</p>
                    </td>
                    <td className="whitespace-nowrap !px-5 !py-4 text-slate-700">{b.invoiceNo}</td>
                    <td className="whitespace-nowrap !px-5 !py-4 text-right text-slate-700">{inr(b.taxable)}</td>
                    <td className="whitespace-nowrap !px-5 !py-4 text-right text-amber-700">{inr(b.cgst + b.sgst + b.igst)}</td>
                    <td className="whitespace-nowrap !px-5 !py-4 text-right font-semibold text-slate-900">{inr(b.billTotal)}</td>
                    <td className="!px-5 !py-4">
                      {b.itcEligible ? (
                        <span className="inline-block rounded-full bg-green-50 !px-2.5 !py-0.5 text-xs font-semibold text-green-700">Yes</span>
                      ) : (
                        <span className="inline-block rounded-full bg-slate-100 !px-2.5 !py-0.5 text-xs font-semibold text-slate-600">No</span>
                      )}
                    </td>
                    <td className="!px-5 !py-4">
                      {b.filePath ? (
                        <a href={api.fileUrl(b.filePath)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-orange-600 hover:underline">
                          View <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="!px-5 !py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => setModal({ bill: b })} aria-label="Edit bill" className="rounded-lg !p-2 text-slate-500 hover:bg-slate-100">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => remove(b)} aria-label="Delete bill" className="rounded-lg !p-2 text-red-500 hover:bg-red-50">
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

      {modal && (
        <BillModal
          bill={modal.bill}
          suppliers={suppliers}
          ownState={ownState}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </main>
  );
};

export default ReceivedBills;