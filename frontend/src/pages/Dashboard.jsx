import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PackageSearch, CircleCheck, FileText, ArrowUpRight } from "lucide-react";
import { api } from "../services/api";

/* Spacing classes use the "!" prefix so they work with a global CSS reset. */

const StatCard = ({ icon: Icon, iconBg, iconColor, label, value, caption, onClick }) => (
  <div
    onClick={onClick}
    className={`group relative flex flex-col rounded-3xl border border-slate-200/70 bg-white !p-5 shadow-sm transition-shadow hover:shadow-md ${
      onClick ? "cursor-pointer" : ""
    }`}
  >
    <ArrowUpRight className="absolute right-4 top-4 h-4 w-4 text-slate-300 transition-colors group-hover:text-orange-500" />
    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg}`}>
      <Icon className={`h-7 w-7 ${iconColor}`} strokeWidth={1.8} />
    </div>
    <p className="!mt-4 text-base font-semibold text-slate-700">{label}</p>
    <p className="!mt-1 text-4xl font-bold leading-tight text-slate-900">{value}</p>
    <p className="!mt-1 text-sm text-slate-400">{caption}</p>
  </div>
);

const monthLabel = (m) =>
  new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });

const Dashboard = ({ userName = "Administrator" }) => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.getSummary(), api.getMonthly()])
      .then(([s, m]) => {
        setSummary(s);
        setMonthly(m);
      })
      .catch((e) => setError(e.message));
  }, []);

  const s = summary || { unprocessed: 0, completed: 0, challans: 0 };
  const max = Math.max(1, ...monthly.flatMap((m) => [m.received, m.completed]));

  const cards = [
    {
      label: "Unprocessed Jobs",
      value: s.unprocessed,
      caption: "Jobs with quantity remaining",
      icon: PackageSearch,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      onClick: () => navigate("/stock"),
    },
    {
      label: "Completed Jobs",
      value: s.completed,
      caption: "Jobs with completed quantity",
      icon: CircleCheck,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      onClick: () => navigate("/stock"),
    },
    {
      label: "Total Challans",
      value: s.challans,
      caption: "Challans received",
      icon: FileText,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      onClick: () => navigate("/challan"),
    },
  ];

  return (
    <main className="min-h-full flex-1 bg-slate-50 !p-8">
      <div>
        <p className="text-sm font-semibold text-orange-600">Overview</p>
        <h2 className="!mt-1 text-4xl font-bold tracking-tight text-slate-900">Dashboard</h2>
        <p className="!mt-1 text-base text-slate-500">
          Welcome to the Divyadip Enterprises ERP system, {userName}.
        </p>
      </div>

      {error && (
        <p className="!mt-4 rounded-xl bg-red-50 !px-4 !py-3 text-sm font-medium text-red-600">{error}</p>
      )}

      <section className="grid grid-cols-1 gap-5 !mt-6 sm:grid-cols-3">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </section>

      <section className="!mt-6 rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 !px-6 !py-5">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Monthly Analysis</h3>
            <p className="!mt-0.5 text-sm text-slate-500">Quantity received vs completed each month.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/stock")}
            className="shrink-0 rounded-xl border border-slate-200 bg-white !px-4 !py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            View Stock Details
          </button>
        </div>

        {monthly.length === 0 ? (
          <div className="flex min-h-[380px] flex-col items-center justify-center !px-6 !py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50">
              <PackageSearch className="h-9 w-9 text-orange-600" strokeWidth={1.6} />
            </div>
            <h4 className="!mt-6 text-xl font-semibold text-slate-900">No job data yet</h4>
            <p className="!mt-2 max-w-md text-base text-slate-500">
              Once jobs are added to the system, their monthly status and quantity analysis will appear here.
            </p>
          </div>
        ) : (
          <div className="!p-6">
            <div className="flex flex-col gap-5">
              {monthly.map((m) => (
                <div key={m.month} className="grid grid-cols-[90px_1fr] items-center gap-4">
                  <p className="text-sm font-medium text-slate-600">{monthLabel(m.month)}</p>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 rounded-full bg-slate-300"
                        style={{ width: `${(m.received / max) * 100}%`, minWidth: m.received ? 6 : 0 }}
                      />
                      <span className="text-xs text-slate-500">{m.received.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 rounded-full bg-green-500"
                        style={{ width: `${(m.completed / max) * 100}%`, minWidth: m.completed ? 6 : 0 }}
                      />
                      <span className="text-xs text-slate-500">{m.completed.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="!mt-6 flex gap-5 border-t border-slate-100 !pt-4 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Received
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Completed
              </span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default Dashboard;