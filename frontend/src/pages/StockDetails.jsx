import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  X,
  Pencil,
  Trash2,
  Plus,
  CheckCircle2,
  PackageSearch,
  Building2,
  CalendarDays,
  Truck,
} from "lucide-react";
import { api } from "../services/api";

/*
  Stock Details (2 stages): Unprocessed = remaining quantity, Completed = done quantity.
  A job can be in both tabs when it is partly done (e.g. 50 done, 50 left).
  Spacing classes use the "!" prefix so they work with a global CSS reset.
*/

const TABS = [
  { id: "unprocessed", label: "Unprocessed" },
  { id: "completed", label: "Completed" },
];

const fmtDate = (d) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
const fmtQty = (n, unit) => `${Number(n).toLocaleString("en-IN")} ${unit}`;
const todayStr = () => new Date().toISOString().slice(0, 10);

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";
const labelCls = "!mb-1.5 block text-sm font-medium text-slate-700";

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

/* ---------- Progress bar ---------- */
const ProgressBar = ({ job }) => (
  <div className="flex h-2 w-full min-w-[120px] overflow-hidden rounded-full bg-slate-100">
    <div className="bg-green-500" style={{ width: `${(job.completed / job.total) * 100}%` }} />
  </div>
);

/* ---------- Add / edit a completion entry ---------- */
const CompletionModal = ({ job, entry, onClose, onSaved }) => {
  const isEdit = Boolean(entry);
  const max = isEdit ? job.remaining + entry.qty : job.remaining;
  const [qty, setQty] = useState(String(isEdit ? entry.qty : job.remaining));
  const [date, setDate] = useState(isEdit ? entry.date : todayStr());
  const [note, setNote] = useState(isEdit ? entry.note : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const n = Number(qty);
    if (!Number.isInteger(n) || n <= 0) return setError("Enter a quantity greater than 0.");
    if (n > max) return setError(`Only ${fmtQty(max, job.unit)} available.`);
    setSaving(true);
    try {
      const body = { qty: n, completedDate: date, note: note.trim() };
      if (isEdit) await api.updateCompletion(entry.id, body);
      else await api.addCompletion(job.id, body);
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={isEdit ? "Edit completed entry" : "Mark as completed"}
      subtitle={`${job.name} · ${job.jobNo}`}
      onClose={onClose}
    >
      <div className="!mt-4 rounded-xl bg-slate-50 !px-3.5 !py-2.5 text-sm text-slate-600">
        Available to mark: <span className="font-semibold">{fmtQty(max, job.unit)}</span>
      </div>

      <div className="!mt-4 flex flex-col gap-4">
        <div>
          <label className={labelCls}>Quantity done</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max={max}
              value={qty}
              onChange={(e) => {
                setQty(e.target.value);
                setError("");
              }}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => setQty(String(max))}
              className="shrink-0 rounded-xl border border-slate-200 !px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              All
            </button>
          </div>
        </div>
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. first batch"
            className={inputCls}
          />
        </div>
      </div>

      {error && <p className="!mt-3 text-sm font-medium text-red-600">{error}</p>}
      <ModalActions onClose={onClose} onSubmit={submit} saving={saving} label="Save" />
    </ModalShell>
  );
};

/* ---------- Add / edit job ---------- */
const JobFormModal = ({ job, onClose, onSaved }) => {
  const isNew = !job;
  const [form, setForm] = useState(() =>
    job
      ? {
          name: job.name,
          company: job.company,
          description: job.description,
          inwardDate: job.inwardDate,
          time: job.time,
          vehicle: job.vehicle,
          unit: job.unit,
          total: String(job.total),
        }
      : {
          name: "",
          company: "",
          description: "",
          inwardDate: todayStr(),
          time: new Date().toTimeString().slice(0, 5),
          vehicle: "",
          unit: "pcs",
          total: "",
        }
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setError("");
  };

  const submit = async () => {
    if (!form.name.trim() || !form.company.trim()) return setError("Job name and company are required.");
    const total = Number(form.total);
    if (!Number.isInteger(total) || total <= 0) return setError("Enter a quantity greater than 0.");

    setSaving(true);
    try {
      const body = { ...form, total };
      if (isNew) await api.createJob(body);
      else await api.updateJob(job.id, body);
      onSaved();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={isNew ? "Add job" : "Edit job"}
      subtitle={isNew ? "Enter the details of the material received." : `${job.name} · ${job.jobNo}`}
      onClose={onClose}
      wide
    >
      <div className="!mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Job name *</label>
          <input className={inputCls} value={form.name} onChange={set("name")} placeholder="e.g. Gear Shaft Machining" />
        </div>
        <div>
          <label className={labelCls}>Company name *</label>
          <input className={inputCls} value={form.company} onChange={set("company")} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Detailed description</label>
          <textarea
            rows={3}
            className={inputCls}
            value={form.description}
            onChange={set("description")}
            placeholder="Size, material, process required, special instructions…"
          />
        </div>
        <div>
          <label className={labelCls}>Inward date *</label>
          <input type="date" className={inputCls} value={form.inwardDate} onChange={set("inwardDate")} />
        </div>
        <div>
          <label className={labelCls}>Inward time</label>
          <input type="time" className={inputCls} value={form.time} onChange={set("time")} />
        </div>
        <div>
          <label className={labelCls}>Transport vehicle number</label>
          <input className={inputCls} value={form.vehicle} onChange={set("vehicle")} placeholder="e.g. MH 09 AB 4521" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Quantity *</label>
            <input type="number" min="1" className={inputCls} value={form.total} onChange={set("total")} />
          </div>
          <div>
            <label className={labelCls}>Unit</label>
            <select className={inputCls} value={form.unit} onChange={set("unit")}>
              {["pcs", "nos", "kg", "mtr", "set"].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {!isNew && (
        <p className="!mt-3 text-xs text-slate-500">
          Already completed: {fmtQty(job.completed, job.unit)}. Total can't go below this.
        </p>
      )}
      {error && <p className="!mt-3 text-sm font-medium text-red-600">{error}</p>}
      <ModalActions onClose={onClose} onSubmit={submit} saving={saving} label={isNew ? "Add job" : "Save changes"} />
    </ModalShell>
  );
};

/* ---------- Job drawer (details + history + edit) ---------- */
const JobDrawer = ({ jobId, onClose, onChanged }) => {
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const [completion, setCompletion] = useState(null); // { entry } | {}
  const [editingJob, setEditingJob] = useState(false);

  const load = useCallback(async () => {
    try {
      setJob(await api.getJob(jobId));
    } catch (e) {
      setError(e.message);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const afterChange = async () => {
    setCompletion(null);
    setEditingJob(false);
    await load();
    onChanged();
  };

  const removeEntry = async (entry) => {
    if (!window.confirm(`Delete this entry of ${entry.qty} ${job.unit}?`)) return;
    try {
      await api.deleteCompletion(entry.id);
      await afterChange();
    } catch (e) {
      setError(e.message);
    }
  };

  const removeJob = async () => {
    if (!window.confirm(`Delete "${job.name}" and all its history? This cannot be undone.`)) return;
    try {
      await api.deleteJob(job.id);
      onChanged();
      onClose();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white !p-6 shadow-2xl">
        {!job ? (
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
                <p className="text-xs font-semibold text-orange-600">{job.jobNo}</p>
                <h3 className="!mt-0.5 text-xl font-semibold text-slate-900">{job.name}</h3>
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

            {job.description && <p className="!mt-3 text-sm text-slate-600">{job.description}</p>}

            <div className="!mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-slate-50 !p-3 text-slate-700">
                <p className="text-xs font-medium">Remaining</p>
                <p className="!mt-1 text-xl font-bold">{job.remaining.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-2xl bg-green-50 !p-3 text-green-700">
                <p className="text-xs font-medium">Completed</p>
                <p className="!mt-1 text-xl font-bold">{job.completed.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-2xl bg-orange-50 !p-3 text-orange-700">
                <p className="text-xs font-medium">Total</p>
                <p className="!mt-1 text-xl font-bold">{job.total.toLocaleString("en-IN")}</p>
              </div>
            </div>
            <p className="!mt-2 text-xs text-slate-500">Unit: {job.unit}</p>

            <div className="!mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 !p-4 text-sm text-slate-700">
              <p className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-slate-400" /> {job.company}
              </p>
              <p className="flex items-center gap-2.5">
                <CalendarDays className="h-4 w-4 text-slate-400" /> Inward {fmtDate(job.inwardDate)}
                {job.time ? `, ${job.time}` : ""}
              </p>
              <p className="flex items-center gap-2.5">
                <Truck className="h-4 w-4 text-slate-400" /> {job.vehicle || "-"}
              </p>
            </div>

            <div className="!mt-5 flex gap-3">
              <button
                type="button"
                disabled={job.remaining === 0}
                onClick={() => setCompletion({})}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-600 !px-4 !py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark completed
              </button>
              <button
                type="button"
                onClick={() => setEditingJob(true)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 !px-4 !py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            </div>

            {error && <p className="!mt-3 text-sm font-medium text-red-600">{error}</p>}

            <h4 className="!mb-3 !mt-6 text-base font-semibold text-slate-900">Completed history</h4>
            {job.completions.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing completed yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {job.completions.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 !px-3.5 !py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{fmtQty(c.qty, job.unit)}</p>
                      <p className="truncate text-xs text-slate-500">
                        {fmtDate(c.date)}
                        {c.note ? ` · ${c.note}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCompletion({ entry: c })}
                      aria-label="Edit entry"
                      className="rounded-lg !p-1.5 text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEntry(c)}
                      aria-label="Delete entry"
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
              onClick={removeJob}
              className="!mt-8 flex items-center gap-2 text-sm font-medium text-red-600 hover:underline"
            >
              <Trash2 className="h-4 w-4" /> Delete this job
            </button>

            {completion && (
              <CompletionModal
                job={job}
                entry={completion.entry}
                onClose={() => setCompletion(null)}
                onSaved={afterChange}
              />
            )}
            {editingJob && (
              <JobFormModal job={job} onClose={() => setEditingJob(false)} onSaved={afterChange} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ---------- Page ---------- */
const StockDetails = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("unprocessed");
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [completing, setCompleting] = useState(null); // job for quick "Mark done"
  const [editing, setEditing] = useState(null); // job for quick edit
  const [adding, setAdding] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      setJobs(await api.getJobs());
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const companies = useMemo(() => [...new Set(jobs.map((j) => j.company))].sort(), [jobs]);

  const counts = useMemo(
    () => ({
      unprocessed: jobs.filter((j) => j.remaining > 0).length,
      completed: jobs.filter((j) => j.completed > 0).length,
    }),
    [jobs]
  );

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (tab === "unprocessed" ? j.remaining <= 0 : j.completed <= 0) return false;
      if (company !== "all" && j.company !== company) return false;
      if (!term) return true;
      return [j.name, j.company, j.jobNo, j.vehicle].some((v) => (v || "").toLowerCase().includes(term));
    });
  }, [jobs, tab, query, company]);

  const afterQuickChange = () => {
    setCompleting(null);
    setEditing(null);
    setAdding(false);
    loadJobs();
  };

  return (
    <main className="min-h-full flex-1 bg-slate-50 !p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-orange-600">Inventory</p>
          <h2 className="!mt-1 text-4xl font-bold tracking-tight text-slate-900">Stock Details</h2>
          <p className="!mt-1 text-base text-slate-500">Track every job from inward to completion.</p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-xl bg-orange-600 !px-5 !py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" /> Add job
        </button>
      </div>

      <section className="!mt-6 rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 !p-4">
          {TABS.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-xl !px-4 !py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-orange-600 text-white shadow-md shadow-orange-500/30"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full !px-2 text-xs font-semibold ${
                    isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {counts[t.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 !p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search job, company, job no or vehicle…"
              className="w-full rounded-xl border border-slate-200 bg-white !py-2.5 !pl-10 !pr-3.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm text-slate-700 outline-none focus:border-orange-500"
          >
            <option value="all">All companies</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="!px-6 !py-16 text-center text-sm text-slate-500">Loading jobs…</p>
        ) : error ? (
          <div className="!px-6 !py-16 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={loadJobs}
              className="!mt-3 rounded-xl border border-slate-200 !px-4 !py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center !px-6 !py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
              <PackageSearch className="h-8 w-8 text-orange-600" strokeWidth={1.6} />
            </div>
            <h4 className="!mt-4 text-lg font-semibold text-slate-900">
              No {tab === "unprocessed" ? "unprocessed" : "completed"} jobs
            </h4>
            <p className="!mt-1 text-sm text-slate-500">
              {query || company !== "all"
                ? "Try changing your search or filter."
                : "Click “Add job” to enter material received."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="!px-5 !py-3">Job</th>
                  <th className="!px-5 !py-3">Company</th>
                  <th className="!px-5 !py-3">Inward date</th>
                  <th className="!px-5 !py-3">Quantity</th>
                  <th className="!px-5 !py-3">Progress</th>
                  <th className="!px-5 !py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => setSelectedId(job.id)}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="!px-5 !py-4">
                      <p className="font-semibold text-slate-900">{job.name}</p>
                      <p className="text-xs text-slate-500">{job.jobNo}</p>
                    </td>
                    <td className="!px-5 !py-4 text-slate-700">{job.company}</td>
                    <td className="whitespace-nowrap !px-5 !py-4 text-slate-700">{fmtDate(job.inwardDate)}</td>
                    <td className="whitespace-nowrap !px-5 !py-4">
                      <p className="font-semibold text-slate-900">
                        {fmtQty(tab === "unprocessed" ? job.remaining : job.completed, job.unit)}
                      </p>
                      <p className="text-xs text-slate-500">of {fmtQty(job.total, job.unit)}</p>
                    </td>
                    <td className="!px-5 !py-4">
                      <ProgressBar job={job} />
                    </td>
                    <td className="!px-5 !py-4">
                      <div className="flex items-center justify-end gap-2">
                        {tab === "unprocessed" && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCompleting(job);
                            }}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-orange-200 bg-orange-50 !px-3.5 !py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark done
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(job);
                          }}
                          aria-label="Edit job"
                          className="rounded-xl border border-slate-200 !p-2 text-slate-600 hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-5 border-t border-slate-100 !px-5 !py-3.5 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Completed
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-200" /> Remaining
          </span>
        </div>
      </section>

      {selectedId && (
        <JobDrawer jobId={selectedId} onClose={() => setSelectedId(null)} onChanged={loadJobs} />
      )}
      {completing && (
        <CompletionModal job={completing} onClose={() => setCompleting(null)} onSaved={afterQuickChange} />
      )}
      {editing && <JobFormModal job={editing} onClose={() => setEditing(null)} onSaved={afterQuickChange} />}
      {adding && <JobFormModal job={null} onClose={() => setAdding(false)} onSaved={afterQuickChange} />}
    </main>
  );
};

export default StockDetails;