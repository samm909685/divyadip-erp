
import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-[#F6F7F9]">
      {/* Sidebar — same layout structure as Parasmani */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main application area */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:ml-72">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;