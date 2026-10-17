import { useState } from "react";
import AnalysisView from "../components/reports/AnalysisView";
import RecordsView from "../components/reports/RecordsView";

/* Reports: the business analysis, and the cost sheets it is made from. Spacing classes use the "!" prefix. */

const TABS = [
  { id: "analysis", label: "Analysis" },
  { id: "sheets", label: "Cost sheets" },
];

const Reports = () => {
  const [tab, setTab] = useState("analysis");

  return (
    <main className="min-h-full flex-1 bg-slate-50 !p-8">
      <div>
        <p className="text-sm font-semibold text-orange-600">Business</p>
        <h2 className="!mt-1 text-4xl font-bold tracking-tight text-slate-900">Reports</h2>
        <p className="!mt-1 text-base text-slate-500">What each job costs, what the scrap brings back, and the profit.</p>
      </div>

      <div className="!mt-6 inline-flex gap-1 rounded-2xl border border-slate-200 bg-white !p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl !px-5 !py-2 text-sm font-semibold transition-colors ${tab === t.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="!mt-5">{tab === "analysis" ? <AnalysisView /> : <RecordsView />}</div>
    </main>
  );
};

export default Reports;