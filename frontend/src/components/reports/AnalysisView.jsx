import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api } from "../../services/api";
import { BarChart, LineChart } from "./Charts";
import { rs0, rs2, todayStr, shortDay, longDay } from "../../utils/costCalc";

/*
  The analysis: pick a period (1 week to 1 year, or your own dates) and see what the jobs cost,
  what the scrap brought back, what the workers were paid, and the profit. The figures are
  compared with the same number of days just before.
  Spacing classes use the "!" prefix so they work with a global CSS reset.
*/

const PRESETS = [
  { id: "7", label: "1 week", days: 7 },
  { id: "14", label: "2 weeks", days: 14 },
  { id: "30", label: "1 month", days: 30 },
  { id: "182", label: "6 months", days: 182 },
  { id: "365", label: "1 year", days: 365 },
  { id: "custom", label: "Custom dates" },
];

const shiftDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
};

const bucketLabel = (key, group) =>
  group === "month"
    ? new Date(`${key}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
    : shortDay(key);

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const Delta = ({ cur, prev, goodWhenUp = true }) => {
  if (!prev) return <span className="text-xs text-slate-400">Nothing earlier to compare with</span>;
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium ${up === goodWhenUp ? "text-green-600" : "text-red-600"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% compared with before
    </span>
  );
};

const Card = ({ label, value, tone = "text-slate-900", children }) => (
  <div className="rounded-3xl border border-slate-200/70 bg-white !p-5 shadow-sm">
    <p className="text-sm font-semibold text-slate-600">{label}</p>
    <p className={`!mt-2 text-3xl font-bold ${tone}`}>{value}</p>
    <div className="!mt-1 text-sm text-slate-400">{children}</div>
  </div>
);

const Panel = ({ title, subtitle, children }) => (
  <section className="!mt-6 rounded-3xl border border-slate-200/70 bg-white !p-6 shadow-sm">
    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    {subtitle && <p className="!mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    <div className="!mt-4">{children}</div>
  </section>
);

const AnalysisView = () => {
  const [preset, setPreset] = useState("30");
  const [custom, setCustom] = useState({ from: shiftDays(todayStr(), -29), to: todayStr() });
  const [group, setGroup] = useState("auto");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // The dates being looked at
  const range = (() => {
    if (preset === "custom") return custom;
    const days = PRESETS.find((p) => p.id === preset).days;
    return { from: shiftDays(todayStr(), -(days - 1)), to: todayStr() };
  })();

  useEffect(() => {
    if (!range.from || !range.to || range.from > range.to) return undefined;
    let stale = false;
    setLoading(true);
    api
      .getAnalysis({ from: range.from, to: range.to, group: group === "auto" ? "" : group })
      .then((d) => {
        if (stale) return;
        setData(d);
        setError("");
      })
      .catch((e) => !stale && setError(e.message))
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to, group]);

  const t = data?.totals;
  const prev = data?.previous;
  const grossCost = t ? t.toolsCost + t.workers : 0;

  const exportCsv = () => {
    const lines = [
      ["Business analysis", `${data.from} to ${data.to}`],
      [],
      ["Job", "Batches", "Jobs", "Revenue", "Tools", "Scrap value", "Scrap kg", "Workers", "Net cost", "Cost per job", "Profit", "Profit per job"],
      ...data.byJob.map((j) => [j.name, j.records, j.jobs, j.revenue.toFixed(2), j.toolsCost.toFixed(2), j.scrapValue.toFixed(2), j.scrapKg.toFixed(2), j.workers.toFixed(2), j.netCost.toFixed(2), j.costPerJob.toFixed(2), j.profit.toFixed(2), j.profitPerJob.toFixed(2)]),
      ["All jobs", t.records, t.jobs, t.revenue.toFixed(2), t.toolsCost.toFixed(2), t.scrapValue.toFixed(2), t.scrapKg.toFixed(2), t.workers.toFixed(2), t.netCost.toFixed(2), t.costPerJob.toFixed(2), t.profit.toFixed(2), t.profitPerJob.toFixed(2)],
      [],
      ["Tool", "Times used", "Amount"],
      ...data.byTool.map((x) => [x.name, x.qty, x.amount.toFixed(2)]),
    ];
    const blob = new Blob(["\uFEFF" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `business-analysis-${data.from}-to-${data.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      {/* Period */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPreset(p.id)}
            className={`rounded-xl !px-4 !py-2 text-sm font-medium transition-colors ${
              preset === p.id ? "bg-orange-600 text-white shadow-md shadow-orange-500/30" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="!mt-3 flex flex-wrap items-center gap-3 text-sm">
        {preset === "custom" && (
          <>
            <label className="flex items-center gap-2 text-slate-600">
              From
              <input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="rounded-xl border border-slate-200 bg-white !px-3 !py-2 text-sm outline-none focus:border-orange-500" />
            </label>
            <label className="flex items-center gap-2 text-slate-600">
              To
              <input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="rounded-xl border border-slate-200 bg-white !px-3 !py-2 text-sm outline-none focus:border-orange-500" />
            </label>
          </>
        )}
        <label className="flex items-center gap-2 text-slate-600">
          Chart by
          <select value={group} onChange={(e) => setGroup(e.target.value)} className="rounded-xl border border-slate-200 bg-white !px-3 !py-2 text-sm outline-none focus:border-orange-500">
            <option value="auto">Automatic</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </label>
        {data && (
          <>
            <span className="text-slate-500">
              {longDay(data.from)} to {longDay(data.to)} ({data.days} days)
            </span>
            <button type="button" onClick={exportCsv} disabled={!t?.records} className="ml-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white !px-4 !py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Download className="h-4 w-4" /> Export (Excel)
            </button>
          </>
        )}
      </div>

      {error && <p className="!mt-5 rounded-xl bg-red-50 !px-4 !py-3 text-sm font-medium text-red-600">{error}</p>}
      {loading && !data && <p className="!py-16 text-center text-sm text-slate-500">Working it out…</p>}

      {data && t && t.records === 0 && (
        <div className="!mt-6 rounded-3xl border border-slate-200/70 bg-white !px-6 !py-14 text-center">
          <h4 className="text-lg font-semibold text-slate-900">No cost sheets in this period</h4>
          <p className="!mt-1 text-sm text-slate-500">Enter the batches in the “Cost sheets” tab, or choose a longer period.</p>
        </div>
      )}

      {data && t && t.records > 0 && (
        <div className={loading ? "opacity-60 transition-opacity" : ""}>
          {t.noRateCount > 0 && (
            <p className="!mt-5 rounded-xl bg-amber-50 !px-4 !py-3 text-sm text-amber-800">
              {t.noRateCount} {t.noRateCount === 1 ? "sheet has" : "sheets have"} no rate per job, so what was earned is counted as ₹0 and the profit is shown as a loss. Add the rate in the Cost sheets tab to fix this.
            </p>
          )}

          {/* Numbers */}
          <section className="grid grid-cols-1 gap-5 !mt-5 sm:grid-cols-2 xl:grid-cols-4">
            <Card label="Earned" value={rs0(t.revenue)}>
              <Delta cur={t.revenue} prev={prev.revenue} />
            </Card>
            <Card label="Net cost" value={rs0(t.netCost)}>
              <Delta cur={t.netCost} prev={prev.netCost} goodWhenUp={false} />
            </Card>
            <Card label="Profit" value={rs0(t.profit)} tone={t.profit >= 0 ? "text-green-600" : "text-red-600"}>
              <Delta cur={t.profit} prev={prev.profit} />
            </Card>
            <Card label="Profit margin" value={t.margin === null ? "-" : `${t.margin.toFixed(1)}%`}>
              Profit as a share of what was earned
            </Card>
            <Card label="Jobs done" value={t.jobs.toLocaleString("en-IN")}>
              In {t.records} {t.records === 1 ? "batch" : "batches"}
            </Card>
            <Card label="Cost per job" value={rs2(t.costPerJob)}>
              <Delta cur={t.costPerJob} prev={prev.costPerJob} goodWhenUp={false} />
            </Card>
            <Card label="Profit per job" value={rs2(t.profitPerJob)} tone={t.profitPerJob >= 0 ? "text-slate-900" : "text-red-600"}>
              <Delta cur={t.profitPerJob} prev={prev.profitPerJob} />
            </Card>
            <Card label="Scrap recovered" value={`${t.scrapKg.toLocaleString("en-IN", { maximumFractionDigits: 1 })} kg`}>
              {rs0(t.scrapValue)} at {t.avgScrapRate === null ? "-" : rs2(t.avgScrapRate)} per kg on average
            </Card>
          </section>

          {/* Where the money goes */}
          <Panel title="Where the cost goes" subtitle="Tools and workers cost money. Scrap brings some of it back.">
            {[
              ["Tools", t.toolsCost, "bg-amber-500", ""],
              ["Workers' fees", t.workers, "bg-orange-400", ""],
              ["Scrap recovered", t.scrapValue, "bg-green-500", "- "],
            ].map(([label, value, color, sign]) => (
              <div key={label} className="!mb-3 grid grid-cols-[130px_1fr_110px] items-center gap-3 text-sm last:!mb-0">
                <span className="text-slate-600">{label}</span>
                <div className="h-3 rounded-full bg-slate-100">
                  <div className={`h-3 rounded-full ${color}`} style={{ width: `${grossCost > 0 ? Math.min(100, (value / grossCost) * 100) : 0}%` }} />
                </div>
                <span className="text-right font-semibold text-slate-900">
                  {sign}
                  {rs0(value)}
                </span>
              </div>
            ))}
            <div className="!mt-4 flex justify-between border-t border-slate-100 !pt-3 text-sm font-bold text-slate-900">
              <span>Net cost</span>
              <span>{rs0(t.netCost)}</span>
            </div>
          </Panel>

          {/* Over time */}
          <Panel title="Earned and cost over time" subtitle={`By ${data.group}${data.group === "week" ? " (weeks start on Monday)" : ""}. Hover a bar to see the numbers.`}>
            <BarChart
              data={data.series.map((s) => ({ key: s.key, label: bucketLabel(s.key, data.group), a: s.revenue, b: s.netCost }))}
              aLabel="Earned"
              bLabel="Net cost"
            />
          </Panel>

          <Panel title="Scrap rate" subtitle="The rate changes daily. This is the average rate we got for the scrap in each period.">
            <LineChart
              points={data.series.map((s) => ({ key: s.key, label: bucketLabel(s.key, data.group), value: s.avgScrapRate }))}
              empty="No scrap was recorded in this period."
            />
          </Panel>

          {/* By job */}
          <Panel title="Job by job" subtitle="Which jobs make money and which do not. The most profitable is at the top.">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500">
                    <th className="!py-2 !pr-4">Job</th>
                    <th className="!py-2 !pr-4 text-right">Batches</th>
                    <th className="!py-2 !pr-4 text-right">Jobs</th>
                    <th className="!py-2 !pr-4 text-right">Cost per job</th>
                    <th className="!py-2 !pr-4 text-right">Scrap (kg)</th>
                    <th className="!py-2 !pr-4 text-right">Earned</th>
                    <th className="!py-2 !pr-4 text-right">Net cost</th>
                    <th className="!py-2 !pr-4 text-right">Profit</th>
                    <th className="!py-2 text-right">Profit per job</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byJob.map((j) => (
                    <tr key={j.name} className="border-b border-slate-100 last:border-0">
                      <td className="!py-3 !pr-4 font-semibold text-slate-900">{j.name}</td>
                      <td className="!py-3 !pr-4 text-right text-slate-700">{j.records}</td>
                      <td className="!py-3 !pr-4 text-right text-slate-700">{j.jobs}</td>
                      <td className="whitespace-nowrap !py-3 !pr-4 text-right text-slate-700">{rs2(j.costPerJob)}</td>
                      <td className="!py-3 !pr-4 text-right text-slate-700">{j.scrapKg.toLocaleString("en-IN", { maximumFractionDigits: 1 })}</td>
                      <td className="whitespace-nowrap !py-3 !pr-4 text-right text-slate-700">{rs0(j.revenue)}</td>
                      <td className="whitespace-nowrap !py-3 !pr-4 text-right text-slate-700">{rs0(j.netCost)}</td>
                      <td className={`whitespace-nowrap !py-3 !pr-4 text-right font-semibold ${j.profit >= 0 ? "text-green-700" : "text-red-600"}`}>{rs0(j.profit)}</td>
                      <td className="whitespace-nowrap !py-3 text-right text-slate-700">{rs2(j.profitPerJob)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* By tool */}
          {data.byTool.length > 0 && (
            <Panel title="Tools" subtitle="Where the tooling money went in this period.">
              {data.byTool.map((x) => (
                <div key={x.name} className="!mb-3 grid grid-cols-[1fr_90px_110px_120px] items-center gap-3 text-sm last:!mb-0">
                  <span className="truncate text-slate-800">{x.name}</span>
                  <span className="text-right text-slate-500">{x.qty.toLocaleString("en-IN", { maximumFractionDigits: 1 })} times</span>
                  <span className="text-right font-semibold text-slate-900">{rs0(x.amount)}</span>
                  <div className="h-2.5 rounded-full bg-slate-100">
                    <div className="h-2.5 rounded-full bg-amber-500" style={{ width: `${t.toolsCost > 0 ? Math.min(100, (x.amount / t.toolsCost) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </Panel>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisView;