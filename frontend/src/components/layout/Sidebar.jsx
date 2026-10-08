import { useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  FileText,
  ReceiptText,
  BarChart3,
  Settings,
  Headphones,
  LogOut,
  UserRound,
  X,
} from "lucide-react";

import divyadipLogo from "../../assets/images/divyadip-logo.jpeg";

/* ------------------------------------------------------------------
   Navigation config (kept outside the component so it isn't
   re-created on every render)
------------------------------------------------------------------ */
const MAIN_MENU = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "stock", label: "Stock details", icon: Package },
  { id: "challan", label: "Challan", icon: FileText },
  { id: "gst-billing", label: "GST billing", icon: ReceiptText },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const SYSTEM_MENU = [
  { id: "help", label: "Help & support", icon: Headphones },
];

/* ------------------------------------------------------------------
   Single navigation row
------------------------------------------------------------------ */
function NavItem({ item, active, onSelect }) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-current={active ? "page" : undefined}
      className={`
        group relative flex h-11 w-full items-center gap-3
        rounded-xl px-3 text-left text-[14px]
        outline-none transition-colors duration-150
        focus-visible:ring-2 focus-visible:ring-[#F26B00]/40
        ${
          active
            ? "bg-[#FFF1E5] font-semibold text-[#C95500]"
            : "font-medium text-[#3A414B] hover:bg-[#F5F6F8] hover:text-[#15191F]"
        }
      `}
    >
      {/* Active indicator bar */}
      <span
        aria-hidden="true"
        className={`
          absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2
          rounded-r-full bg-[#F26B00]
          transition-opacity duration-150
          ${active ? "opacity-100" : "opacity-0"}
        `}
      />

      <Icon
        size={19}
        strokeWidth={active ? 2.2 : 1.8}
        className={`
          shrink-0 transition-colors duration-150
          ${active ? "text-[#F26B00]" : "text-[#6B7480] group-hover:text-[#3A414B]"}
        `}
      />

      <span className="truncate">{item.label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------
   Section heading
------------------------------------------------------------------ */
function SectionLabel({ children }) {
  return (
    <p className="mb-2 px-3 text-[12px] font-semibold text-[#8A919B]">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------
   Sidebar
------------------------------------------------------------------ */
function Sidebar({
  isOpen = false,
  onClose = () => {},
  activeItem = "dashboard",
  onNavigate = () => {},
  onLogout = () => {},
  user = { name: "Administrator", role: "System admin" },
}) {
  // Close on Escape + lock page scroll while the mobile drawer is open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Navigate, then close the drawer on mobile
  const handleSelect = (id) => {
    onNavigate(id);
    onClose();
  };

  return (
    <>
      {/* ---------- Mobile backdrop ---------- */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`
          fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]
          transition-opacity duration-300 lg:hidden
          ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}
        `}
      />

      {/* ---------- Sidebar ---------- */}
      <aside
        aria-label="Main navigation"
        className={`
          fixed inset-y-0 left-0 z-50
          flex h-screen w-[272px] shrink-0 flex-col
          border-r border-[#E8EAED] bg-white
          transition-[transform,visibility] duration-300 ease-in-out

          lg:sticky lg:top-0 lg:z-30 lg:translate-x-0 lg:visible

          ${isOpen ? "visible translate-x-0 shadow-2xl lg:shadow-none" : "invisible -translate-x-full"}
        `}
      >
        {/* ===== Brand ===== */}
        <header className="relative flex shrink-0 flex-col items-center border-b border-[#EEF0F2] px-6 pb-5 pt-7">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="
              absolute right-3 top-3 flex h-9 w-9 items-center justify-center
              rounded-lg text-[#6B7480] outline-none transition-colors
              hover:bg-[#F5F6F8] hover:text-[#15191F]
              focus-visible:ring-2 focus-visible:ring-[#F26B00]/40
              lg:hidden
            "
          >
            <X size={19} />
          </button>

          <div className="flex h-[64px] w-[168px] items-center justify-center">
            <img
              src={divyadipLogo}
              alt="Divyadip Enterprises"
              className="h-full w-full object-contain"
            />
          </div>

          <span className="mt-3 rounded-full bg-[#FFF1E5] px-3 py-1 text-[11px] font-semibold text-[#C95500]">
            ERP system
          </span>
        </header>

        {/* ===== Navigation (scrolls independently) ===== */}
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-5 [scrollbar-width:thin]">
          <nav aria-label="Main menu">
            <SectionLabel>Main menu</SectionLabel>
            <ul className="space-y-1">
              {MAIN_MENU.map((item) => (
                <li key={item.id}>
                  <NavItem
                    item={item}
                    active={item.id === activeItem}
                    onSelect={handleSelect}
                  />
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="System" className="mt-auto border-t border-[#EEF0F2] pt-5">
            <SectionLabel>System</SectionLabel>
            <ul className="space-y-1">
              {SYSTEM_MENU.map((item) => (
                <li key={item.id}>
                  <NavItem
                    item={item}
                    active={item.id === activeItem}
                    onSelect={handleSelect}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* ===== User + logout ===== */}
        <footer className="shrink-0 border-t border-[#EEF0F2] p-3">
          <div className="flex items-center gap-3 rounded-xl bg-[#F7F8FA] p-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFE6D2] text-[#C95500]">
              <UserRound size={19} strokeWidth={1.9} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-[#1E232A]">
                {user.name}
              </span>
              <span className="block truncate text-[12px] text-[#7A818B]">
                {user.role}
              </span>
            </span>

            <button
              type="button"
              onClick={onLogout}
              aria-label="Log out"
              title="Log out"
              className="
                flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                text-[#6B7480] outline-none transition-colors
                hover:bg-[#FDECEA] hover:text-[#D13B34]
                focus-visible:ring-2 focus-visible:ring-[#D13B34]/40
              "
            >
              <LogOut size={18} strokeWidth={1.9} />
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}

export default Sidebar;