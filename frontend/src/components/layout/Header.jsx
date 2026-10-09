import { Bell, ChevronDown, User } from "lucide-react";

/*
  NOTE: spacing classes use the "!" (important) prefix so they still apply
  even if the project has a global reset like `* { margin:0; padding:0 }`.
*/
const TopBar = ({
  title = "Divyadip ERP",
  subtitle = "Enterprise Management System",
  userName = "Administrator",
  userRole = "System Admin",
  hasNotifications = true,
  onBellClick,
  onProfileClick,
}) => {
  return (
    <header className="sticky top-0 z-20 flex h-20 w-full shrink-0 items-center justify-between gap-4 border-b border-slate-200/70 bg-white !px-8">
      {/* Left: brand */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500" />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold leading-tight text-slate-900">
            {title}
          </h1>
          <p className="truncate text-sm leading-tight text-slate-500">{subtitle}</p>
        </div>
      </div>

      {/* Right: bell + profile */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onBellClick}
          aria-label="Notifications"
          className="relative flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
        >
          <Bell className="h-6 w-6" strokeWidth={1.8} />
          {hasNotifications && (
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-orange-500 ring-2 ring-white" />
          )}
        </button>

        <button
          type="button"
          onClick={onProfileClick}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white !py-1.5 !pl-1.5 !pr-3 text-left transition-colors hover:bg-slate-50"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
            <User className="h-5 w-5 text-orange-600" strokeWidth={1.8} />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-semibold leading-tight text-slate-900">
              {userName}
            </span>
            <span className="block truncate text-xs leading-tight text-slate-500">
              {userRole}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </div>
    </header>
  );
};

export default TopBar;