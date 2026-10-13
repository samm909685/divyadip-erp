import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "../../context/AuthContext";

// Shared shell: sidebar + top bar stay fixed, only the page area scrolls.
const MainLayout = () => {
  const { user, logout } = useAuth();
  const roleLabel = user.role === "admin" ? "Administrator" : "Staff";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isAdmin={user.role === "admin"} onLogout={logout} userName={user.fullName} userRole={roleLabel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName={user.fullName} userRole={roleLabel} />
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;