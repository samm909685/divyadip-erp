import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F7F9]">

      {/* ==================================================
          SIDEBAR
      ================================================== */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* ==================================================
          MAIN APPLICATION
      ================================================== */}
      <div className="flex min-h-screen flex-col lg:ml-72">

        {/* HEADER */}
        <Header
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* CONTENT */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="w-full">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}

export default Layout;