import {
  LayoutDashboard,
  Package,
  FileText,
  ReceiptText,
  BarChart3,
  Settings,
  Headphones,
  LogOut,
  ChevronRight,
  UserRound,
  X,
} from "lucide-react";

import divyadipLogo from "../../assets/images/divyadip-logo.jpeg";

function Sidebar({ isOpen, onClose }) {
  const mainMenu = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Stock Details",
      icon: Package,
    },
    {
      label: "Challan",
      icon: FileText,
    },
    {
      label: "GST Billing",
      icon: ReceiptText,
    },
    {
      label: "Reports",
      icon: BarChart3,
    },
    {
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#162033]/55 backdrop-blur-[3px] lg:hidden"
          onClick={onClose}
        />
      )}

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`
          fixed left-0 top-0 z-50
          flex h-screen w-[408px] flex-col
          bg-white
          transition-transform duration-300 ease-out
          lg:static lg:z-auto lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* ================= LOGO ================= */}
        <div className="relative flex h-[184px] shrink-0 items-center justify-center">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="
              absolute right-5 top-5
              flex h-9 w-9 items-center justify-center
              rounded-full
              text-[#64748B]
              hover:bg-[#FFF4EA]
              hover:text-[#F26B00]
              lg:hidden
            "
          >
            <X size={22} />
          </button>

          <div className="flex flex-col items-center">
            {/* Logo image */}
            <div className="relative h-[108px] w-[220px] overflow-hidden">
              <img
                src={divyadipLogo}
                alt="Divyadip Enterprises"
                className="
                  absolute
                  left-1/2
                  top-1/2
                  h-[175px]
                  w-[235px]
                  max-w-none
                  -translate-x-1/2
                  -translate-y-1/2
                  object-contain
                "
              />
            </div>

            <span className="mt-[-2px] text-[13px] font-medium tracking-[0.22em] text-[#64748B]">
              ERP SYSTEM
            </span>
          </div>
        </div>

        {/* ================= NAVIGATION ================= */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {/* Main Menu */}
          <div className="px-12">
            <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.13em] text-[#64748B]">
              Main Menu
            </p>

            <nav className="space-y-[6px]">
              {mainMenu.map((item) => {
                const Icon = item.icon;
                const active = item.label === "Dashboard";

                return (
                  <button
                    key={item.label}
                    type="button"
                    className={`
                      group flex h-[62px] w-full
                      items-center
                      rounded-[16px]
                      px-[18px]
                      text-left
                      transition-all duration-200
                      ${
                        active
                          ? `
                            bg-gradient-to-r
                            from-[#FF6900]
                            to-[#FF7910]
                            text-white
                            shadow-[0_9px_22px_rgba(255,105,0,0.18)]
                          `
                          : `
                            text-[#172033]
                            hover:bg-[#FFF7F0]
                            hover:text-[#F26B00]
                          `
                      }
                    `}
                  >
                    {/* Icon */}
                    <span
                      className={`
                        flex h-[38px] w-[38px]
                        shrink-0 items-center justify-center
                        ${
                          active
                            ? "text-white"
                            : "text-[#172033] group-hover:text-[#F26B00]"
                        }
                      `}
                    >
                      <Icon
                        size={25}
                        strokeWidth={active ? 2.1 : 1.8}
                      />
                    </span>

                    {/* Text */}
                    <span className="ml-[18px] flex-1 text-[17px] font-medium">
                      {item.label}
                    </span>

                    {/* Chevron */}
                    <ChevronRight
                      size={19}
                      strokeWidth={1.9}
                      className={`
                        shrink-0
                        ${
                          active
                            ? "text-white/75"
                            : "text-[#8794A7] group-hover:text-[#F26B00]"
                        }
                      `}
                    />
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Divider */}
          <div className="mx-12 my-[30px] h-px bg-[#E7EAF0]" />

          {/* ================= SYSTEM ================= */}
          <div className="px-12">
            <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.13em] text-[#64748B]">
              System
            </p>

            <div className="space-y-[6px]">
              {/* Help */}
              <button
                type="button"
                className="
                  group flex h-[62px] w-full
                  items-center
                  rounded-[16px]
                  px-[18px]
                  text-left
                  text-[#172033]
                  transition-all duration-200
                  hover:bg-[#FFF7F0]
                  hover:text-[#F26B00]
                "
              >
                <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center">
                  <Headphones
                    size={25}
                    strokeWidth={1.8}
                  />
                </span>

                <span className="ml-[18px] flex-1 text-[17px] font-medium">
                  Help & Support
                </span>

                <ChevronRight
                  size={19}
                  strokeWidth={1.9}
                  className="text-[#8794A7] group-hover:text-[#F26B00]"
                />
              </button>

              {/* Logout */}
              <button
                type="button"
                className="
                  group flex h-[62px] w-full
                  items-center
                  rounded-[16px]
                  px-[18px]
                  text-left
                  text-[#172033]
                  transition-all duration-200
                  hover:bg-red-50
                  hover:text-red-600
                "
              >
                <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center">
                  <LogOut
                    size={25}
                    strokeWidth={1.8}
                  />
                </span>

                <span className="ml-[18px] flex-1 text-[17px] font-medium">
                  Logout
                </span>

                <ChevronRight
                  size={19}
                  strokeWidth={1.9}
                  className="text-[#8794A7] group-hover:text-red-500"
                />
              </button>
            </div>
          </div>
        </div>

        {/* ================= ADMIN CARD ================= */}
        <div className="shrink-0 px-12 pb-6 pt-4">
          <button
            type="button"
            className="
              flex h-[88px] w-full
              items-center
              rounded-[17px]
              border border-[#E6EAF0]
              bg-white
              px-4
              text-left
              shadow-[0_2px_8px_rgba(15,23,42,0.025)]
              transition-all duration-200
              hover:border-[#FFD5B5]
              hover:bg-[#FFFBF8]
            "
          >
            {/* Avatar */}
            <span
              className="
                flex h-[52px] w-[52px]
                shrink-0 items-center justify-center
                rounded-full
                bg-[#FFF0DE]
                text-[#F26B00]
              "
            >
              <UserRound
                size={27}
                strokeWidth={1.8}
              />
            </span>

            {/* User details */}
            <span className="ml-4 min-w-0 flex-1">
              <span className="block truncate text-[16px] font-semibold text-[#172033]">
                Administrator
              </span>

              <span className="mt-1 block text-[13px] text-[#64748B]">
                Admin
              </span>
            </span>

            <ChevronRight
              size={20}
              strokeWidth={1.8}
              className="text-[#8794A7]"
            />
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;