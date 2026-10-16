import { useLocation, useNavigate } from "react-router-dom";

/* The three parts of GST Billing. Spacing classes use the "!" prefix so they work with a global CSS reset. */

const TABS = [
  { to: "/gst-billing", label: "Sales invoices" },
  { to: "/gst-billing/received", label: "Received bills" },
  { to: "/gst-billing/summary", label: "Monthly summary" },
];

const GstTabs = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // "Sales invoices" also covers the New invoice page
  const isActive = (to) => (to === "/gst-billing" ? pathname === "/gst-billing" || pathname === "/gst-billing/new" : pathname.startsWith(to));

  return (
    <div className="!mt-6 inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white !p-1">
      {TABS.map((t) => (
        <button
          key={t.to}
          type="button"
          onClick={() => navigate(t.to)}
          className={`rounded-xl !px-4 !py-2 text-sm font-semibold transition-colors ${
            isActive(t.to) ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
};

export default GstTabs;