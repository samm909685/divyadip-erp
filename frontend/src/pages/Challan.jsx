import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, X, Pencil, Trash2, FileText, Upload, ExternalLink, ImageOff } from "lucide-react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

/*
  Challan = a simple archive. You upload the photo (or PDF) of each challan with its
  date and time, and can edit or delete it later. It is NOT connected to jobs or GST billing.
  Spacing classes use the "!" prefix so they work with a global CSS reset.
*/

const MAX_MB = 10;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const todayStr = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
const nowTime = () => new Date().toTimeString().slice(0, 5); // HH:MM
const thisMonth = () => todayStr().slice(0, 7);
const monthLabel = (m) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const fmtDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";
const labelCls = "!mb-1.5 block text-sm font-medium text-slate-700";

/* Small picture of the challan (or a PDF tile) */
const Thumb = ({ challan, className = "" }) => {
  const [broken, setBroken] = useState(false);
  if (challan.fileType === "pdf") {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-red-50 text-red-600 ${className}`}>
        <FileText className="h-10 w-10" strokeWidth={1.5} />
        <span className="text-xs font-semibold">PDF</span>
      </div>
    );
  }
  if (broken) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}>
        <ImageOff className="h-8 w-8" strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img
      src={api.fileUrl(challan.filePath)}
      alt={`Challan ${challan.challanNo || ""}`}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`bg-slate-100 object-contain ${className}`}
    />
  );
};

const ModalShell = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 !p-4">
    <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white !p-6 shadow-2xl">
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

/* ---------- Add / edit a challan ---------- */
const ChallanFormModal = ({ challan, onClose, onSaved }) => {
  const isEdit = Boolean(challan);
  const [date, setDate] = useState(isEdit ? challan.date : todayStr());
  const [time, setTime] = useState(isEdit ? challan.time : nowTime());
  const [challanNo, setChallanNo] = useState(isEdit ? challan.challanNo : "");
  const [party, setParty] = useState(isEdit ? challan.party : "");
  const [notes, setNotes] = useState(isEdit ? challan.notes : "");
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Show a preview of a newly chosen photo, and free the memory afterwards
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!OK_TYPES.includes(f.type)) return setError("Only JPG, PNG, WebP or PDF files are allowed.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`File is too large (max ${MAX_MB} MB).`);
    setError("");
    setFile(f);
  };

  const submit = async () => {
    if (!date) return setError("Date is required.");
    if (!isEdit && !file) return setError("Choose the challan photo or PDF.");

    const fd = new FormData();
    fd.append("date", date);
    fd.append("time", time);
    fd.append("challanNo", challanNo);
    fd.append("party", party);
    fd.append("notes", notes);
    if (file) fd.append("file", file);

    setSaving(true);
    try {
      if (isEdit) await api.updateChallan(challan.id, fd);
      else await api.createChallan(fd);
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={isEdit ? "Edit challan" : "Add challan"}
      subtitle={isEdit ? "Change the details or replace the photo." : "Upload the photo of the challan."}
      onClose={onClose}
    >
      <div className="!mt-4 flex flex-col gap-4">
        {/* Photo */}
        <div>
          <label className={labelCls}>Challan photo or PDF {isEdit ? "" : "*"}</label>
          {file ? (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 !p-3">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-16 w-16 rounded-lg bg-white object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <FileText className="h-7 w-7" />
                </div>
              )}
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{file.name}</p>
              <button
                type="button"
                onClick={() => setFile(null)}
                aria-label="Remove file"
                className="rounded-lg !p-1.5 text-slate-500 hover:bg-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              {isEdit && (
                <div className="!mb-2 flex items-center gap-3 rounded-xl border border-slate-200 !p-3">
                  <Thumb challan={challan} className="h-16 w-16 rounded-lg" />
                  <p className="text-sm text-slate-600">Current file. Choose a new one below to replace it.</p>
                </div>
              )}
              <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 !px-4 !py-6 text-sm text-slate-500 hover:border-orange-400 hover:bg-orange-50/40">
                <Upload className="h-5 w-5 text-orange-600" />
                {isEdit ? "Choose a new photo or PDF" : "Click to choose a photo or PDF"}
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={pickFile} className="hidden" />
              </label>
              <p className="!mt-1.5 text-xs text-slate-400">JPG, PNG, WebP or PDF, up to {MAX_MB} MB.</p>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Date *</label>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Time</label>
            <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Challan number</label>
            <input className={inputCls} value={challanNo} onChange={(e) => setChallanNo(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Company / party</label>
            <input className={inputCls} value={party} onChange={(e) => setParty(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Notes (optional)</label>
          <textarea rows={2} className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {error && <p className="!mt-3 text-sm font-medium text-red-600">{error}</p>}

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
          onClick={submit}
          disabled={saving}
          className="rounded-xl bg-orange-600 !px-5 !py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700 disabled:opacity-60"
        >
          {saving ? "Uploading…" : isEdit ? "Save changes" : "Add challan"}
        </button>
      </div>
    </ModalShell>
  );
};

/* ---------- Big view of one challan ---------- */
const ChallanViewer = ({ challan, isAdmin, onClose, onEdit, onDelete }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 !p-4">
    <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 !px-6 !py-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            {fmtDate(challan.date)}
            {challan.time ? ` · ${fmtTime(challan.time)}` : ""}
          </p>
          <p className="truncate text-sm text-slate-500">
            {challan.challanNo ? `Challan ${challan.challanNo}` : "No challan number"}
            {challan.party ? ` · ${challan.party}` : ""}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg !p-1.5 text-slate-400 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-[240px] flex-1 items-center justify-center overflow-auto bg-slate-100">
        {challan.fileType === "pdf" ? (
          <div className="flex flex-col items-center gap-3 !p-10 text-center">
            <FileText className="h-14 w-14 text-red-500" strokeWidth={1.4} />
            <p className="text-sm text-slate-600">This challan is a PDF. Open it in a new tab to read it.</p>
          </div>
        ) : (
          <img src={api.fileUrl(challan.filePath)} alt="Challan" className="max-h-[62vh] w-auto max-w-full object-contain" />
        )}
      </div>

      {challan.notes && <p className="border-t border-slate-100 !px-6 !py-3 text-sm text-slate-600">{challan.notes}</p>}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 !px-6 !py-4">
        <a
          href={api.fileUrl(challan.filePath)}
          target="_blank"
          rel="noreferrer"
          className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:underline"
        >
          Open in new tab <ExternalLink className="h-3.5 w-3.5" />
        </a>
        {isAdmin && (
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-2 rounded-xl border border-red-200 !px-4 !py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-2 rounded-xl border border-slate-200 !px-4 !py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Pencil className="h-4 w-4" /> Edit
        </button>
      </div>
    </div>
  </div>
);

/* ---------- Page ---------- */
const Challan = () => {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";

  const [month, setMonth] = useState(thisMonth()); // "" = all months
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingId, setViewingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setItems(await api.getChallans(month));
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

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((c) => [c.challanNo, c.party, c.notes, c.originalName].some((v) => (v || "").toLowerCase().includes(term)));
  }, [items, query]);

  const viewing = viewingId ? items.find((c) => c.id === viewingId) : null;

  const afterSave = () => {
    setAdding(false);
    setEditing(null);
    load();
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete this challan${c.challanNo ? ` (${c.challanNo})` : ""} and its photo? This cannot be undone.`)) return;
    try {
      await api.deleteChallan(c.id);
      setViewingId(null);
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
          <p className="text-sm font-semibold text-orange-600">Records</p>
          <h2 className="!mt-1 text-4xl font-bold tracking-tight text-slate-900">Challan</h2>
          <p className="!mt-1 text-base text-slate-500">Keep a photo of every challan, saved by date and time.</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-xl bg-orange-600 !px-5 !py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" /> Add challan
        </button>
      </div>

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
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search number, company or notes…"
            className="w-full rounded-xl border border-slate-200 bg-white !py-2.5 !pl-10 !pr-3.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        <span className="text-sm text-slate-500">
          {periodLabel} · {rows.length} {rows.length === 1 ? "challan" : "challans"}
        </span>
      </div>

      <section className="!mt-5">
        {loading ? (
          <p className="!py-16 text-center text-sm text-slate-500">Loading challans…</p>
        ) : error ? (
          <div className="!py-16 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={load}
              className="!mt-3 rounded-xl border border-slate-200 bg-white !px-4 !py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-200/70 bg-white !px-6 !py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
              <FileText className="h-8 w-8 text-orange-600" strokeWidth={1.6} />
            </div>
            <h4 className="!mt-4 text-lg font-semibold text-slate-900">
              {items.length === 0 ? `No challans for ${periodLabel}` : "No challans match your search"}
            </h4>
            <p className="!mt-1 text-sm text-slate-500">
              {items.length === 0 ? "Click “Add challan” to upload the first one." : "Try different words."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {rows.map((c) => (
              <div
                key={c.id}
                className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <button type="button" onClick={() => setViewingId(c.id)} className="block w-full text-left">
                  <Thumb challan={c} className="h-44 w-full" />
                  <div className="!p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      {fmtDate(c.date)}
                      {c.time ? ` · ${fmtTime(c.time)}` : ""}
                    </p>
                    <p className="!mt-0.5 truncate text-sm text-slate-700">
                      {c.challanNo ? `Challan ${c.challanNo}` : "No challan number"}
                    </p>
                    {c.party && <p className="truncate text-xs text-slate-500">{c.party}</p>}
                    {c.notes && <p className="!mt-1 line-clamp-2 text-xs text-slate-500">{c.notes}</p>}
                  </div>
                </button>
                <div className="flex items-center justify-end gap-1 border-t border-slate-100 !px-3 !py-2">
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    aria-label="Edit challan"
                    className="rounded-lg !p-2 text-slate-500 hover:bg-slate-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      aria-label="Delete challan"
                      className="rounded-lg !p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {viewing && (
        <ChallanViewer
          challan={viewing}
          isAdmin={isAdmin}
          onClose={() => setViewingId(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewingId(null);
          }}
          onDelete={() => remove(viewing)}
        />
      )}
      {adding && <ChallanFormModal challan={null} onClose={() => setAdding(false)} onSaved={afterSave} />}
      {editing && <ChallanFormModal challan={editing} onClose={() => setEditing(null)} onSaved={afterSave} />}
    </main>
  );
};

export default Challan;