import {
  PackageSearch,
  Clock3,
  CheckCircle2,
  FileText,
  ArrowUpRight,
} from "lucide-react";

function Dashboard() {
  const summaryCards = [
    {
      title: "Unprocessed Jobs",
      value: "0",
      subtitle: "Jobs waiting to start",
      icon: PackageSearch,
      iconBg: "bg-orange-50",
      iconColor: "text-[#F26B00]",
    },
    {
      title: "Under Process",
      value: "0",
      subtitle: "Jobs currently in process",
      icon: Clock3,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Completed Jobs",
      value: "0",
      subtitle: "Jobs completed",
      icon: CheckCircle2,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Total Challans",
      value: "0",
      subtitle: "Challans received",
      icon: FileText,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div>
        <p className="text-sm font-medium text-[#F26B00]">
          Overview
        </p>

        <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Dashboard
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Welcome to the Divyadip Enterprises ERP system.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.title}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconBg}`}
                >
                  <Icon
                    size={21}
                    className={card.iconColor}
                  />
                </div>

                <ArrowUpRight
                  size={18}
                  className="text-gray-300 transition group-hover:text-[#F26B00]"
                />
              </div>

              <div className="mt-5">
                <p className="text-sm font-medium text-gray-500">
                  {card.title}
                </p>

                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {card.value}
                </p>

                <p className="mt-1 text-xs text-gray-400">
                  {card.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Monthly Analysis Placeholder */}
      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Monthly Analysis
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Job activity will appear here.
            </p>
          </div>

          <button
            type="button"
            className="w-fit rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-[#F26B00] hover:text-[#F26B00]"
          >
            View Stock Details
          </button>
        </div>

        <div className="flex min-h-64 items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
              <PackageSearch
                size={27}
                className="text-[#F26B00]"
              />
            </div>

            <h4 className="mt-4 font-semibold text-gray-800">
              No job data yet
            </h4>

            <p className="mt-1 max-w-sm text-sm text-gray-500">
              Once jobs are added to the system, their monthly
              status and quantity analysis will appear here.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;