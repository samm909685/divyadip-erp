import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  Package,
  FileText,
  ReceiptText,
  ShoppingCart,
  ChartNoAxesColumn,
  Settings,
  Headphones,
  LogOut,
  User,
  ChevronRight,
} from "lucide-react";
import divyadipLogo from "../../assets/images/divyadip-logo.jpeg";

const mainMenu = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/stock", label: "Stock Details", icon: Package },
  { to: "/challan", label: "Challan", icon: FileText },
  { to: "/gst-billing", label: "GST Billing", icon: ReceiptText, adminOnly: true },
  { to: "/purchases", label: "Purchase Details", icon: ShoppingCart, adminOnly: true },
  { to: "/reports", label: "Reports", icon: ChartNoAxesColumn, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings },
];

/*
  NOTE: spacing classes use the "!" (important) prefix so they still apply
  even if your project has a global reset like `* { margin:0; padding:0 }`.
*/
const itemBase =
  "flex w-full items-center gap-4 !rounded-2xl !px-3.5 !py-3 text-left text-[17px] transition-all duration-200";

const Sidebar = ({ onLogout, isAdmin = false, userName = "Administrator", userRole = "System Admin" }) => {
  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-slate-200/70 bg-white">
      {/* Logo */}
      <div className="flex flex-col items-center !px-6 !pb-5 !pt-8">
        <div className="w-44 overflow-hidden">
          <img
            src={divyadipLogo}
            alt="Divyadip Enterprises"
            className="block h-auto w-full scale-[1.08] object-contain"
          />
        </div>
        <div className="!mt-4 flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-orange-500" />
          <span className="text-[13px] font-semibold tracking-[0.35em] text-slate-500">
            ERP SYSTEM
          </span>
          <span className="h-2 w-2 rounded-full bg-orange-500" />
        </div>
      </div>

      <div className="border-t border-slate-200/70" />

      {/* Nav */}
      <nav className="flex flex-1 flex-col overflow-y-auto !px-2.5 !pt-5">
        <p className="!mb-3 !px-4 text-xs font-semibold tracking-[0.25em] text-slate-500">
          MAIN MENU
        </p>

        <ul className="flex flex-col gap-1.5">
          {mainMenu
            .filter((item) => !item.adminOnly || isAdmin)
            .map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `${itemBase} ${
                    isActive
                      ? "bg-orange-600 font-medium text-white shadow-lg shadow-orange-500/30"
                      : "text-slate-700 hover:bg-slate-50"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-6 w-6 shrink-0 ${
                        isActive ? "text-white" : "text-slate-800"
                      }`}
                      strokeWidth={1.8}
                    />
                    <span className="flex-1">{label}</span>
                    {isActive && (
                      <ChevronRight className="h-5 w-5 text-white" strokeWidth={2.2} />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="!mx-2.5 !my-6 border-t border-slate-200" />

        <p className="!mb-3 !px-4 text-xs font-semibold tracking-[0.25em] text-slate-500">
          SYSTEM
        </p>

        <ul className="flex flex-col gap-1.5">
          <li>
            <NavLink
              to="/help"
              className={({ isActive }) =>
                `${itemBase} ${
                  isActive
                    ? "bg-orange-600 font-medium text-white shadow-lg shadow-orange-500/30"
                    : "text-slate-700 hover:bg-slate-50"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Headphones
                    className={`h-6 w-6 shrink-0 ${isActive ? "text-white" : "text-slate-800"}`}
                    strokeWidth={1.8}
                  />
                  <span className="flex-1">Help & Support</span>
                </>
              )}
            </NavLink>
          </li>
          <li>
            <button
              type="button"
              onClick={onLogout}
              className={`${itemBase} text-slate-700 hover:bg-slate-50`}
            >
              <LogOut className="h-6 w-6 shrink-0 text-slate-800" strokeWidth={1.8} />
              <span className="flex-1">Logout</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* User card */}
      <div className="border-t border-slate-200/70 !p-4 !pt-5">
        <button
          type="button"
          className="flex w-full items-center gap-3.5 !rounded-2xl border border-slate-200 bg-white !p-3 text-left shadow-sm transition-colors hover:bg-slate-50"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center !rounded-xl bg-orange-50">
            <User className="h-6 w-6 text-orange-600" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-slate-900">{userName}</p>
            <p className="truncate text-sm text-slate-500">{userRole}</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;