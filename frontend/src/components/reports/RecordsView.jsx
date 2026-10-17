import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, ClipboardList } from "lucide-react";
import { api } from "../../services/api";
import RecordModal from "./RecordModal";
import { rs0, rs2, dmy, todayStr, monthLabel } from "../../utils/costCalc";

/* The list of cost sheets (one per batch of a job). Spacing classes use the "!" prefix. */

const thisMonth = () => todayStr().slice(0, 7);
const monthRange = (m) => {
  const [y, mo] = m.split("-").map(Number);
  const last = new Date(y, mo, 0).getDate();
  return { from: `${m}-01`, to: `${m}-${String(last).padStart(2, "0")}` };
};

const RecordsView = () => {
  const [month, setMonth] = useState(thisMonth()); // "" = all months
  const [records, setRecords] = useState([]);
  const [jobNames, setJobNames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null); // {} = new, { record } = edit

  const load = useCallback(async () => {
    try {
      const [list, names] = await Promise.all([api.getCostRecords(month ? monthRange(month) : {}), api.getJobNames()]);
      setRecords(list);
      setJobNames(names);
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
    if (!term) return records;
    return records.filter((r) => r.jobName.toLowerCase().includes(term) || r.tools.some((t) => t.name.toLowerCase().includes(term)));
  }, [records, query]);

  const totals = useMemo(
    () => ({
      jobs: rows.reduce((s, r) => s + r.jobsCount, 0),
      tools: rows.reduce((s, r) => s + r.toolsTotal, 0),
      scrap: rows.reduce((s, r) => s + r.scrapValue, 0),
      workers: rows.reduce((s, r) => s + r.workersTotal, 0),
      net: rows.reduce((s, r) => s + r.netCost, 0),
      revenue: rows.reduce((s, r) => s + r.revenue, 0),
      profit: rows.reduce((s, r) => s + r.profit, 0),
    }),
    [rows]
  );

  const remove = async (r) => {
    if (!window.confirm(`Delete the cost sheet of job ${r.jobName} (${dmy(r.date)})? This cannot be undone.`)) return;
    try {
      await api.deleteCostRecord(r.id);
      load();
    } catch (e) {
      window.alert(e.message);
    }
  };

  const periodLabel = month ? monthLabel(month) : "All months";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
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
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search job or tool…"
            className="w-full rounded-xl border border-slate-200 bg-white !py-2.5 !pl-10 !pr-3.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        <span className="text-sm text-slate-500">
          {periodLabel} · {rows.length} {rows.length === 1 ? "sheet" : "sheets"}
        </span>
        <button
          type="button"
          onClick={() => setModal({})}
          className="ml-auto flex items-center gap-2 rounded-xl bg-orange-600 !px-5 !py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 hover:bg-orange-700"
        >
          <Plus className="h-4 w-4" /> New cost sheet
        </button>
      </div>

      <section className="!mt-5 rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        {loading ? (
          <p className="!px-6 !py-16 text-center text-sm text-slate-500">Loading cost sheets…</p>
        ) : error ? (
          <div className="!px-6 !py-16 text-center">
            <p className="text-sm font-medium text-red-600">{error}</p>
            <button type="button" onClick={load} className="!mt-3 rounded-xl border border-slate-200 !px-4 !py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center !px-6 !py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
              <ClipboardList className="h-8 w-8 text-orange-600" strokeWidth={1.6} />
            </div>
            <h4 className="!mt-4 text-lg font-semibold text-slate-900">{records.length === 0 ? `No cost sheets for ${periodLabel}` : "No sheets match your search"}</h4>
            <p className="!mt-1 text-sm text-slate-500">{records.length === 0 ? "Click “New cost sheet” to enter a batch." : "Try different words."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="!px-4 !py-3">Date</th>
                  <th className="!px-4 !py-3">Job</th>
                  <th className="!px-4 !py-3 text-right">Jobs</th>
                  <th className="!px-4 !py-3 text-right">Tools</th>
                  <th className="!px-4 !py-3 text-right">Scrap</th>
                  <th className="!px-4 !py-3 text-right">Workers</th>
                  <th className="!px-4 !py-3 text-right">Net cost</th>
                  <th className="!px-4 !py-3 text-right">Per job</th>
                  <th className="!px-4 !py-3 text-right">Earned</th>
                  <th className="!px-4 !py-3 text-right">Profit</th>
                  <th className="!px-4 !py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} onClick={() => setModal({ record: r })} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50/70">
                    <td className="whitespace-nowrap !px-4 !py-3.5 text-slate-700">{dmy(r.date)}</td>
                    <td className="!px-4 !py-3.5 font-semibold text-slate-900">{r.jobName}</td>
                    <td className="!px-4 !py-3.5 text-right text-slate-700">{r.jobsCount}</td>
                    <td className="whitespace-nowrap !px-4 !py-3.5 text-right text-slate-700">{rs0(r.toolsTotal)}</td>
                    <td className="whitespace-nowrap !px-4 !py-3.5 text-right text-slate-700" title={`${r.scrapKg} kg at ${rs2(r.scrapRate)} per kg`}>
                      - {rs0(r.scrapValue)}
                    </td>
                    <td className="whitespace-nowrap !px-4 !py-3.5 text-right text-slate-700">{rs0(r.workersTotal)}</td>
                    <td className="whitespace-nowrap !px-4 !py-3.5 text-right font-semibold text-slate-900">{rs0(r.netCost)}</td>
                    <td className="whitespace-nowrap !px-4 !py-3.5 text-right text-slate-700">{rs2(r.costPerJob)}</td>
                    <td className="whitespace-nowrap !px-4 !py-3.5 text-right text-slate-700">
                      {r.revenue > 0 ? rs0(r.revenue) : <span className="text-xs text-amber-600">no rate</span>}
                    </td>
                    <td className={`whitespace-nowrap !px-4 !py-3.5 text-right font-semibold ${r.revenue === 0 ? "text-slate-400" : r.profit >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {r.revenue > 0 ? rs0(r.profit) : "-"}
                    </td>
                    <td className="!px-4 !py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={(e) => { e.stopPropagation(); setModal({ record: r }); }} aria-label="Edit cost sheet" className="rounded-lg !p-2 text-slate-500 hover:bg-slate-100">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); remove(r); }} aria-label="Delete cost sheet" className="rounded-lg !p-2 text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/70 text-sm font-bold text-slate-900">
                  <td className="!px-4 !py-3" colSpan={2}>Total</td>
                  <td className="!px-4 !py-3 text-right">{totals.jobs}</td>
                  <td className="whitespace-nowrap !px-4 !py-3 text-right">{rs0(totals.tools)}</td>
                  <td className="whitespace-nowrap !px-4 !py-3 text-right">- {rs0(totals.scrap)}</td>
                  <td className="whitespace-nowrap !px-4 !py-3 text-right">{rs0(totals.workers)}</td>
                  <td className="whitespace-nowrap !px-4 !py-3 text-right">{rs0(totals.net)}</td>
                  <td className="!px-4 !py-3" />
                  <td className="whitespace-nowrap !px-4 !py-3 text-right">{rs0(totals.revenue)}</td>
                  <td className="whitespace-nowrap !px-4 !py-3 text-right">{rs0(totals.profit)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {modal && (
        <RecordModal
          record={modal.record}
          jobNames={jobNames}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
};

export default RecordsView;