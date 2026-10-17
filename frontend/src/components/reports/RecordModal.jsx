import { useMemo, useRef, useState } from "react";
import { X, Plus, Trash2, Copy } from "lucide-react";
import { api } from "../../services/api";
import { calcRecord, rs2, todayStr } from "../../utils/costCalc";

/*
  A cost sheet for one batch of a job, laid out like the notebook page:
  tools used (times and cost), scrap taken off, workers added, then the net cost and profit.
  Spacing classes use the "!" prefix so they work with a global CSS reset.
*/

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white !px-3 !py-2.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";
const labelCls = "!mb-1.5 block text-sm font-medium text-slate-700";

const RecordModal = ({ record, jobNames, onClose, onSaved }) => {
  const isEdit = Boolean(record);
  const keyRef = useRef(1);
  const nextKey = () => keyRef.current++;
  const toolRow = (t) => ({ key: nextKey(), name: t?.name ?? "", qty: t ? String(t.qty) : "", amount: t ? String(t.amount) : "" });
  const workerRow = (w) => ({ key: nextKey(), name: w?.name ?? "", amount: w ? String(w.amount) : "" });

  const [date, setDate] = useState(record?.date ?? todayStr());
  const [jobName, setJobName] = useState(record?.jobName ?? "");
  const [jobsCount, setJobsCount] = useState(record ? String(record.jobsCount) : "");
  const [ratePerJob, setRatePerJob] = useState(record && record.ratePerJob ? String(record.ratePerJob) : "");
  const [tools, setTools] = useState(() => (record?.tools.length ? record.tools.map(toolRow) : [toolRow()]));
  const [workers, setWorkers] = useState(() => (record?.workers.length ? record.workers.map(workerRow) : [workerRow()]));
  const [scrapKg, setScrapKg] = useState(record && record.scrapKg ? String(record.scrapKg) : "");
  const [scrapRate, setScrapRate] = useState(record && record.scrapRate ? String(record.scrapRate) : "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const clearError = () => setError("");

  // Live preview of the totals
  const calc = useMemo(
    () =>
      calcRecord({
        jobsCount: Number(jobsCount) || 0,
        ratePerJob: Number(ratePerJob) || 0,
        scrapKg: Number(scrapKg) || 0,
        scrapRate: Number(scrapRate) || 0,
        tools: tools.filter((t) => Number(t.amount) > 0),
        workers: workers.filter((w) => Number(w.amount) > 0),
      }),
    [jobsCount, ratePerJob, scrapKg, scrapRate, tools, workers]
  );
  const jobs = Number(jobsCount) || 0;
  const net = calc.netPaise / 100;
  const profit = calc.profitPaise / 100;
  const revenue = calc.revenuePaise / 100;

  const updateTool = (key, field, value) => {
    setTools((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    clearError();
  };
  const updateWorker = (key, field, value) => {
    setWorkers((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    clearError();
  };

  // Same job again? Copy the tools and workers from its last sheet.
  const copyLast = async () => {
    setHint("");
    setError("");
    try {
      const last = await api.getLastCostRecord(jobName.trim());
      setJobsCount(String(last.jobsCount));
      setRatePerJob(last.ratePerJob ? String(last.ratePerJob) : "");
      setTools(last.tools.length ? last.tools.map(toolRow) : [toolRow()]);
      setWorkers(last.workers.length ? last.workers.map(workerRow) : [workerRow()]);
      setScrapKg(last.scrapKg ? String(last.scrapKg) : "");
      setScrapRate(last.scrapRate ? String(last.scrapRate) : "");
      setHint("Copied from the last sheet. Please check today's scrap weight and scrap rate, because they change.");
    } catch (e) {
      setHint(e.message);
    }
  };

  const submit = async () => {
    if (!jobName.trim()) return setError("Enter the job name.");
    const count = Number(jobsCount);
    if (!Number.isInteger(count) || count < 1) return setError("Enter the number of jobs in this batch, for example 50.");

    const used = tools.filter((t) => t.name.trim() || t.qty !== "" || t.amount !== "");
    for (let i = 0; i < used.length; i++) {
      if (!used[i].name.trim()) return setError(`Tool ${i + 1}: enter the tool name.`);
      if (!(Number(used[i].qty) > 0)) return setError(`Tool ${i + 1}: enter how many times it was used.`);
      if (!(Number(used[i].amount) > 0)) return setError(`Tool ${i + 1}: enter the amount.`);
    }
    const paid = workers.filter((w) => w.name.trim() || w.amount !== "");
    for (let i = 0; i < paid.length; i++) {
      if (!(Number(paid[i].amount) > 0)) return setError(`Worker ${i + 1}: enter the fee.`);
    }
    if (!used.length && !paid.length) return setError("Add at least one tool or worker fee.");

    setSaving(true);
    try {
      const body = {
        date,
        jobName,
        jobsCount: count,
        ratePerJob,
        scrapKg,
        scrapRate,
        tools: used.map((t) => ({ name: t.name, qty: Number(t.qty), amount: Number(t.amount) })),
        workers: paid.map((w) => ({ name: w.name, amount: Number(w.amount) })),
        notes,
      };
      if (isEdit) await api.updateCostRecord(record.id, body);
      else await api.createCostRecord(body);
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
            <h3 className="text-lg font-semibold text-slate-900">{isEdit ? "Edit cost sheet" : "New cost sheet"}</h3>
            <p className="!mt-0.5 text-sm text-slate-500">The cost of one batch of a job, like the notebook page.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg !p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Job */}
        <div className="!mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className={labelCls}>Date *</label>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="sm:col-span-1">
            <label className={labelCls}>Job name *</label>
            <input
              className={inputCls}
              list="job-name-list"
              value={jobName}
              onChange={(e) => {
                setJobName(e.target.value);
                setHint("");
                clearError();
              }}
              placeholder="e.g. 620"
            />
            <datalist id="job-name-list">
              {jobNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Jobs in this batch *</label>
            <input type="number" min="1" step="1" className={inputCls} value={jobsCount} onChange={(e) => { setJobsCount(e.target.value); clearError(); }} placeholder="e.g. 50" />
          </div>
          <div>
            <label className={labelCls}>Rate per job (₹)</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={ratePerJob} onChange={(e) => setRatePerJob(e.target.value)} placeholder="what the customer pays" />
          </div>
        </div>

        {!isEdit && jobName.trim() && (
          <button type="button" onClick={copyLast} className="!mt-3 flex items-center gap-2 text-sm font-medium text-orange-600 hover:underline">
            <Copy className="h-4 w-4" /> Copy the last sheet of “{jobName.trim()}”
          </button>
        )}
        {hint && <p className="!mt-2 rounded-xl bg-amber-50 !px-3 !py-2 text-sm text-amber-800">{hint}</p>}

        {/* Tools */}
        <h4 className="!mt-6 text-sm font-semibold text-slate-900">Tools used</h4>
        <div className="!mt-2 flex flex-col gap-2">
          {tools.map((t) => (
            <div key={t.key} className="grid grid-cols-12 items-center gap-2">
              <input className={`${inputCls} col-span-6`} placeholder="Tool (e.g. Milling cutter)" value={t.name} onChange={(e) => updateTool(t.key, "name", e.target.value)} />
              <input className={`${inputCls} col-span-2`} type="number" min="0" step="any" placeholder="Times" value={t.qty} onChange={(e) => updateTool(t.key, "qty", e.target.value)} />
              <input className={`${inputCls} col-span-3`} type="number" min="0" step="0.01" placeholder="Amount ₹" value={t.amount} onChange={(e) => updateTool(t.key, "amount", e.target.value)} />
              <button
                type="button"
                onClick={() => setTools((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== t.key) : rows))}
                disabled={tools.length === 1}
                aria-label="Remove tool"
                className="col-span-1 rounded-lg !p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="!mt-2 flex items-center justify-between">
          <button type="button" onClick={() => setTools((rows) => (rows.length >= 40 ? rows : [...rows, toolRow()]))} className="flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:underline">
            <Plus className="h-4 w-4" /> Add tool
          </button>
          <span className="text-sm text-slate-600">
            Tools total: <b className="text-slate-900">{rs2(calc.toolsPaise / 100)}</b>
          </span>
        </div>

        {/* Scrap */}
        <h4 className="!mt-6 text-sm font-semibold text-slate-900">Scrap (we get this money back)</h4>
        <div className="!mt-2 grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Scrap weight (kg)</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={scrapKg} onChange={(e) => setScrapKg(e.target.value)} placeholder="e.g. 200" />
          </div>
          <div>
            <label className={labelCls}>Scrap rate today (₹ per kg)</label>
            <input type="number" min="0" step="0.01" className={inputCls} value={scrapRate} onChange={(e) => setScrapRate(e.target.value)} placeholder="e.g. 29" />
          </div>
          <p className="text-sm text-slate-600 sm:!pb-2.5">
            Scrap value: <b className="text-slate-900">{rs2(calc.scrapPaise / 100)}</b>
          </p>
        </div>

        {/* Workers */}
        <h4 className="!mt-6 text-sm font-semibold text-slate-900">Workers' fees</h4>
        <div className="!mt-2 flex flex-col gap-2">
          {workers.map((w) => (
            <div key={w.key} className="grid grid-cols-12 items-center gap-2">
              <input className={`${inputCls} col-span-8`} placeholder="Worker name (optional)" value={w.name} onChange={(e) => updateWorker(w.key, "name", e.target.value)} />
              <input className={`${inputCls} col-span-3`} type="number" min="0" step="0.01" placeholder="Fee ₹" value={w.amount} onChange={(e) => updateWorker(w.key, "amount", e.target.value)} />
              <button
                type="button"
                onClick={() => setWorkers((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== w.key) : rows))}
                disabled={workers.length === 1}
                aria-label="Remove worker"
                className="col-span-1 rounded-lg !p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="!mt-2 flex items-center justify-between">
          <button type="button" onClick={() => setWorkers((rows) => (rows.length >= 30 ? rows : [...rows, workerRow()]))} className="flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:underline">
            <Plus className="h-4 w-4" /> Add worker
          </button>
          <span className="text-sm text-slate-600">
            Workers total: <b className="text-slate-900">{rs2(calc.workersPaise / 100)}</b>
          </span>
        </div>

        {/* Result */}
        <div className="!mt-6 rounded-2xl bg-slate-50 !p-4 text-sm">
          <div className="flex justify-between !py-1 text-slate-700">
            <span>Tools</span>
            <span>{rs2(calc.toolsPaise / 100)}</span>
          </div>
          <div className="flex justify-between !py-1 text-slate-700">
            <span>Less: scrap value</span>
            <span>- {rs2(calc.scrapPaise / 100)}</span>
          </div>
          <div className="flex justify-between !py-1 text-slate-700">
            <span>Add: workers' fees</span>
            <span>{rs2(calc.workersPaise / 100)}</span>
          </div>
          <div className="!mt-1 flex justify-between border-t border-slate-200 !pt-2 text-base font-bold text-slate-900">
            <span>Net cost of this batch</span>
            <span>{rs2(net)}</span>
          </div>
          {jobs > 0 && (
            <div className="flex justify-between !pt-1 text-slate-600">
              <span>Cost per job ({jobs} jobs)</span>
              <span>{rs2(net / jobs)}</span>
            </div>
          )}
          {revenue > 0 ? (
            <>
              <div className="flex justify-between !pt-3 text-slate-700">
                <span>Earned ({jobs} × {rs2(Number(ratePerJob))})</span>
                <span>{rs2(revenue)}</span>
              </div>
              <div className={`flex justify-between !pt-1 text-base font-bold ${profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                <span>Profit{revenue > 0 ? ` (${((profit / revenue) * 100).toFixed(1)}%)` : ""}</span>
                <span>{rs2(profit)}</span>
              </div>
            </>
          ) : (
            <p className="!mt-3 text-xs text-slate-500">Enter the rate per job to see the profit.</p>
          )}
        </div>

        <div className="!mt-4">
          <label className={labelCls}>Notes (optional)</label>
          <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
            {saving ? "Saving…" : isEdit ? "Save changes" : "Save cost sheet"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordModal;