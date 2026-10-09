import {
  PackageSearch,
  Clock,
  CircleCheck,
  FileText,
  ArrowUpRight,
} from "lucide-react";

/*
  NOTE: spacing classes use the "!" (important) prefix so they still apply
  even if the project has a global reset like `* { margin:0; padding:0 }`.
*/

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

const Dashboard = ({
  userName = "Administrator",
  stats = { unprocessed: 0, underProcess: 0, completed: 0, challans: 0 },
  monthlyData = [], // fill later with real job data
  onViewStock,
}) => {
  const cards = [
    {
      label: "Unprocessed Jobs",
      value: stats.unprocessed,
      caption: "Jobs waiting to start",
      icon: PackageSearch,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
    },
    {
      label: "Under Process",
      value: stats.underProcess,
      caption: "Jobs currently in process",
      icon: Clock,
      iconBg: "bg-amber-50",
      iconColor: "text-orange-600",
    },
    {
      label: "Completed Jobs",
      value: stats.completed,
      caption: "Jobs completed",
      icon: CircleCheck,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      label: "Total Challans",
      value: stats.challans,
      caption: "Challans received",
      icon: FileText,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
  ];

  return (
    <main className="min-h-full flex-1 bg-slate-50 !p-8">
      {/* Page heading */}
      <div>
        <p className="text-sm font-semibold text-orange-600">Overview</p>
        <h2 className="!mt-1 text-4xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h2>
        <p className="!mt-1 text-base text-slate-500">
          Welcome to the Divyadip Enterprises ERP system, {userName}.
        </p>
      </div>

      {/* Stat cards */}
      <section className="grid grid-cols-1 gap-5 !mt-6 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      {/* Monthly analysis */}
      <section className="!mt-6 rounded-3xl border border-slate-200/70 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 !px-6 !py-5">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Monthly Analysis</h3>
            <p className="!mt-0.5 text-sm text-slate-500">
              Job activity will appear here.
            </p>
          </div>
          <button
            type="button"
            onClick={onViewStock}
            className="shrink-0 rounded-xl border border-slate-200 bg-white !px-4 !py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            View Stock Details
          </button>
        </div>

        {monthlyData.length === 0 ? (
          <div className="flex min-h-[380px] flex-col items-center justify-center !px-6 !py-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50">
              <PackageSearch className="h-9 w-9 text-orange-600" strokeWidth={1.6} />
            </div>
            <h4 className="!mt-6 text-xl font-semibold text-slate-900">No job data yet</h4>
            <p className="!mt-2 max-w-md text-base text-slate-500">
              Once jobs are added to the system, their monthly status and quantity
              analysis will appear here.
            </p>
          </div>
        ) : (
          <div className="!p-6">{/* Render your monthly chart/table here */}</div>
        )}
      </section>
    </main>
  );
};

export default Dashboard;