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

const menu = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Stock Details",
    icon: Package,
  },
  {
    title: "Challan",
    icon: FileText,
  },
  {
    title: "GST Billing",
    icon: ReceiptText,
  },
  {
    title: "Reports",
    icon: BarChart3,
  },
  {
    title: "Settings",
    icon: Settings,
  },
];

function Sidebar({ sidebarOpen, setSidebarOpen }) {
  return (
    <>
      {/* =====================================================
          MOBILE OVERLAY
      ====================================================== */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="
            fixed
            inset-0
            z-40
            bg-black/40
            lg:hidden
          "
        />
      )}

      {/* =====================================================
          SIDEBAR
      ====================================================== */}
      <aside
        className={`
          fixed
          top-0
          left-0
          z-50
          h-screen
          w-72
          bg-white
          text-[#252A31]
          border-r
          border-[#E8E9EB]
          shadow-[2px_0_12px_rgba(15,23,42,0.03)]
          transform
          transition-transform
          duration-300

          ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }

          lg:translate-x-0
          lg:z-30
        `}
      >

        {/* ===================================================
            BRAND HEADER
        ==================================================== */}
        <div
          className="
            flex
            items-center
            justify-between
            px-8
            py-8
            border-b
            border-[#ECEDEF]
          "
        >
          <div className="w-full">

            {/* Logo */}
            <div className="flex items-center justify-center">
              <img
                src={divyadipLogo}
                alt="Divyadip Enterprises"
                className="
                  h-[76px]
                  w-[180px]
                  object-contain
                "
              />
            </div>

            {/* ERP label */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F26B00]" />

              <p
                className="
                  text-[10px]
                  uppercase
                  tracking-[0.3em]
                  font-semibold
                  text-[#7D838B]
                "
              >
                ERP System
              </p>

              <span className="h-1.5 w-1.5 rounded-full bg-[#F26B00]" />
            </div>

          </div>

          {/* Mobile close */}
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="
              absolute
              right-4
              top-4
              text-[#737982]
              hover:text-[#F26B00]
              lg:hidden
            "
            aria-label="Close sidebar"
          >
            <X size={22} />
          </button>
        </div>

        {/* ===================================================
            NAVIGATION
        ==================================================== */}
        <nav
          className="
            mt-8
            px-4
            space-y-2
          "
        >

          {/* MAIN MENU LABEL */}
          <div className="px-5 pb-2">
            <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.16em]
                text-[#969BA3]
              "
            >
              Main Menu
            </p>
          </div>

          {/* MENU */}
          {menu.map((item) => {
            const Icon = item.icon;

            const active =
              item.title === "Dashboard";

            return (
              <button
                key={item.title}
                type="button"
                className={`
                  flex
                  items-center
                  gap-4
                  w-full
                  rounded-xl
                  px-5
                  py-4
                  text-left
                  transition-all
                  duration-200

                  ${
                    active
                      ? `
                        bg-[#F26B00]
                        text-white
                        font-semibold
                        shadow-[0_6px_16px_rgba(242,107,0,0.18)]
                      `
                      : `
                        text-[#343941]
                        hover:bg-[#FFF5EC]
                        hover:text-[#F26B00]
                      `
                  }
                `}
              >

                {/* Icon */}
                <Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.9}
                  className="shrink-0"
                />

                {/* Text */}
                <span className="flex-1 text-[14px]">
                  {item.title}
                </span>

                {/* Active arrow */}
                {active && (
                  <span className="text-white/80 text-sm">
                    ›
                  </span>
                )}
              </button>
            );
          })}

          {/* =================================================
              SYSTEM DIVIDER
          ================================================= */}
          <div className="py-3">
            <div className="h-px bg-[#ECEDEF]" />
          </div>

          {/* SYSTEM LABEL */}
          <div className="px-5 pb-2">
            <p
              className="
                text-[10px]
                font-bold
                uppercase
                tracking-[0.16em]
                text-[#969BA3]
              "
            >
              System
            </p>
          </div>

          {/* HELP */}
          <button
            type="button"
            className="
              group
              flex
              items-center
              gap-4
              w-full
              rounded-xl
              px-5
              py-4
              text-left
              text-[#343941]
              transition-all
              duration-200
              hover:bg-[#FFF5EC]
              hover:text-[#F26B00]
            "
          >
            <Headphones
              size={20}
              strokeWidth={1.9}
              className="shrink-0"
            />

            <span className="flex-1 text-[14px] font-medium">
              Help & Support
            </span>

            <span
              className="
                text-[#A4A9B0]
                transition-transform
                group-hover:translate-x-0.5
                group-hover:text-[#F26B00]
              "
            >
              ›
            </span>
          </button>

          {/* LOGOUT */}
          <button
            type="button"
            className="
              group
              flex
              items-center
              gap-4
              w-full
              rounded-xl
              px-5
              py-4
              text-left
              text-[#343941]
              transition-all
              duration-200
              hover:bg-[#FFF2F1]
              hover:text-[#D94B45]
            "
          >
            <LogOut
              size={20}
              strokeWidth={1.9}
              className="shrink-0"
            />

            <span className="flex-1 text-[14px] font-medium">
              Logout
            </span>

            <span
              className="
                text-[#A4A9B0]
                transition-transform
                group-hover:translate-x-0.5
                group-hover:text-[#D94B45]
              "
            >
              ›
            </span>
          </button>
        </nav>

        {/* ===================================================
            ADMIN PROFILE
        ==================================================== */}
        <div
          className="
            absolute
            bottom-0
            left-0
            w-full
            p-5
            border-t
            border-[#ECEDEF]
            bg-[#FCFCFC]
          "
        >
          <button
            type="button"
            className="
              w-full
              flex
              items-center
              gap-3
              rounded-xl
              border
              border-[#E5E7EA]
              bg-white
              px-3
              py-3
              text-left
              transition-all
              duration-200
              hover:border-[#FFD1AE]
              hover:shadow-[0_4px_14px_rgba(242,107,0,0.06)]
            "
          >

            {/* Avatar */}
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-[#FFF0E3]
                text-[#F26B00]
              "
            >
              <UserRound
                size={20}
                strokeWidth={1.9}
              />
            </div>

            {/* User */}
            <div className="min-w-0 flex-1">
              <p
                className="
                  truncate
                  text-[13px]
                  font-semibold
                  text-[#252A31]
                "
              >
                Administrator
              </p>

              <p
                className="
                  mt-0.5
                  text-[11px]
                  text-[#8B9199]
                "
              >
                System Admin
              </p>
            </div>

            <span className="text-[#A4A9B0]">
              ›
            </span>

          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;