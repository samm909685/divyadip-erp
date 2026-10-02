import {
  Menu,
  Bell,
  ChevronDown,
  UserCircle,
} from "lucide-react";

function Header({ onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-gray-200 bg-white px-5 sm:px-6 lg:px-7">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-gray-500 transition hover:bg-orange-50 hover:text-[#F26B00] lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={21} />
        </button>

        <div>
          <h1 className="text-[17px] font-semibold leading-tight text-gray-900">
            Divyadip ERP
          </h1>

          <p className="mt-0.5 text-[11px] text-gray-400">
            Enterprise Management System
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="relative rounded-lg p-2.5 text-gray-500 transition hover:bg-orange-50 hover:text-[#F26B00]"
          aria-label="Notifications"
        >
          <Bell size={19} strokeWidth={1.9} />

          <span className="absolute right-[7px] top-[7px] h-1.5 w-1.5 rounded-full bg-[#F26B00]" />
        </button>

        <div className="h-7 w-px bg-gray-200" />

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-gray-50"
        >
          <UserCircle
            size={30}
            strokeWidth={1.6}
            className="text-gray-500"
          />

          <div className="hidden text-left sm:block">
            <p className="text-[13px] font-semibold leading-tight text-gray-800">
              Administrator
            </p>

            <p className="mt-0.5 text-[10px] text-gray-400">
              Admin
            </p>
          </div>

          <ChevronDown
            size={15}
            className="hidden text-gray-400 sm:block"
          />
        </button>
      </div>
    </header>
  );
}

export default Header;