import { Routes, Route } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import StockDetails from "./pages/StockDetails";

// Temporary page for sections that are not built yet.
const ComingSoon = ({ title }) => (
  <main className="!p-8">
    <h2 className="text-4xl font-bold tracking-tight text-slate-900">{title}</h2>
    <p className="!mt-2 text-base text-slate-500">This section is coming soon.</p>
  </main>
);

const App = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/stock" element={<StockDetails />} />
        <Route path="/challan" element={<ComingSoon title="Challan" />} />
        <Route path="/gst-billing" element={<ComingSoon title="GST Billing" />} />
        <Route path="/reports" element={<ComingSoon title="Reports" />} />
        <Route path="/settings" element={<ComingSoon title="Settings" />} />
        <Route path="/help" element={<ComingSoon title="Help & Support" />} />
        <Route path="*" element={<ComingSoon title="Page not found" />} />
      </Route>
    </Routes>
  );
};

export default App;