import {
  Menu,
  Bell,
  ChevronDown,
  UserRound,
} from "lucide-react";

function Header({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex h-[74px] shrink-0 items-center justify-between border-b border-[#E8EAED] bg-white px-5 sm:px-7 lg:px-8">
      {/* ==================================================
          LEFT SIDE
      ================================================== */}
      <div className="flex min-w-0 items-center">
        {/* Mobile / Tablet Menu */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="
            mr-3
            flex h-9 w-9
            items-center justify-center
            rounded-lg
            text-[#5F6670]
            transition-all duration-200
            hover:bg-[#FFF4EA]
            hover:text-[#F26B00]
            lg:hidden
          "
        >
          <Menu size={21} strokeWidth={1.9} />
        </button>

        {/* Page Context */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="hidden h-2 w-2 rounded-full bg-[#F26B00] sm:block" />

            <h1 className="truncate text-[16px] font-semibold tracking-[-0.01em] text-[#20252C] sm:text-[17px]">
              Divyadip ERP
            </h1>
          </div>

          <p className="mt-0.5 truncate text-[11px] font-medium text-[#9298A0] sm:text-[12px]">
            Enterprise Management System
          </p>
        </div>
      </div>

      {/* ==================================================
          RIGHT SIDE
      ================================================== */}
      <div className="flex shrink-0 items-center">

        {/* Notification */}
        <button
          type="button"
          aria-label="Notifications"
          className="
            relative
            flex h-10 w-10
            items-center justify-center
            rounded-lg
            text-[#68707A]
            transition-all duration-200
            hover:bg-[#FFF4EA]
            hover:text-[#F26B00]
          "
        >
          <Bell
            size={19}
            strokeWidth={1.9}
          />

          {/* Notification dot */}
          <span
            className="
              absolute
              right-[9px]
              top-[8px]
              h-[6px]
              w-[6px]
              rounded-full
              border-[1.5px]
              border-white
              bg-[#F26B00]
            "
          />
        </button>

        {/* Vertical divider */}
        <div className="mx-3 h-8 w-px bg-[#E8EAED] sm:mx-4" />

        {/* ==================================================
            ADMIN PROFILE
        ================================================== */}
        <button
          type="button"
          className="
            group
            flex items-center
            rounded-xl
            px-2 py-1.5
            text-left
            transition-all duration-200
            hover:bg-[#FAFAFA]
          "
        >
          {/* Avatar */}
          <span
            className="
              flex h-9 w-9
              shrink-0
              items-center justify-center
              rounded-[10px]
              border border-[#FFE0C6]
              bg-[#FFF3E8]
              text-[#F26B00]
            "
          >
            <UserRound
              size={19}
              strokeWidth={1.8}
            />
          </span>

          {/* User Information */}
          <span className="ml-2.5 hidden min-w-0 sm:block">
            <span className="block truncate text-[13px] font-semibold leading-tight text-[#252A31]">
              Administrator
            </span>

            <span className="mt-0.5 block text-[10px] font-medium text-[#9298A0]">
              System Admin
            </span>
          </span>

          {/* Dropdown */}
          <ChevronDown
            size={15}
            strokeWidth={1.8}
            className="
              ml-2
              text-[#9298A0]
              transition-transform duration-200
              group-hover:text-[#F26B00]
            "
          />
        </button>
      </div>
    </header>
  );
}

export default Header;