import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import StockDetails from "./pages/StockDetails";
import Settings from "./pages/Settings";
import Purchases from "./pages/Purchases";
import Challan from "./pages/Challan";
import GstBilling from "./pages/GstBilling";
import InvoiceForm from "./pages/InvoiceForm";
import InvoicePrint from "./pages/InvoicePrint";
import ReceivedBills from "./pages/ReceivedBills";
import GstSummary from "./pages/GstSummary";
import Help from "./pages/Help";
import Reports from "./pages/Reports";

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
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Everything inside here needs a login */}
      <Route element={<ProtectedRoute />}>
        {/* The printable invoice has no sidebar, so it sits outside MainLayout */}
        <Route path="/invoice/:id" element={<InvoicePrint />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stock" element={<StockDetails />} />
          <Route path="/challan" element={<Challan />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/gst-billing" element={<GstBilling />} />
          <Route path="/gst-billing/new" element={<InvoiceForm />} />
          <Route path="/gst-billing/received" element={<ReceivedBills />} />
          <Route path="/gst-billing/summary" element={<GstSummary />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
          <Route path="*" element={<ComingSoon title="Page not found" />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;