import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api } from "../services/api";
import GstTabs from "../components/gst/GstTabs";
import { inr } from "../utils/gstCalc";

/*
  Monthly summary: GST charged on sales invoices, against credit (ITC) from received bills.
  It is an ESTIMATE to help the CA. The CA decides how credits are used and files the return.
  Spacing classes use the "!" prefix so they work with a global CSS reset.
*/

const todayStr = () => new Date().toLocaleDateString("en-CA");
const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

const GstSummary = () => {
  const [month, setMonth] = useState(todayStr().slice(0, 7));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!month) return;
    api
      .getGstSummary(month)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [month]);

  const rows = data
    ? [
        ["CGST", data.sales.cgst, data.purchases.itcCgst],
        ["SGST", data.sales.sgst, data.purchases.itcSgst],
        ["IGST", data.sales.igst, data.purchases.itcIgst],
      ]
    : [];
  const totalSales = rows.reduce((s, r) => s + r[1], 0);
  const totalItc = rows.reduce((s, r) => s + r[2], 0);

  const exportCsv = () => {
    const lines = [
      ["GST summary", monthLabel(month)],
      [],
      ["Tax", "Charged on sales", "Credit from received bills", "Difference (estimate)"],
      ...rows.map(([name, a, b]) => [name, a.toFixed(2), b.toFixed(2), (a - b).toFixed(2)]),
      ["Total", totalSales.toFixed(2), totalItc.toFixed(2), (totalSales - totalItc).toFixed(2)],
      [],
      ["Sales invoices", data.sales.count, "Taxable value", data.sales.taxable.toFixed(2)],
      ["Received bills", data.purchases.count, "Taxable value", data.purchases.taxable.toFixed(2)],
    ];
    const blob = new Blob(["\uFEFF" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gst-summary-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <main className="min-h-full flex-1 bg-slate-50 !p-8">
      <div>
        <p className="text-sm font-semibold text-orange-600">Accounts</p>
        <h2 className="!mt-1 text-4xl font-bold tracking-tight text-slate-900">GST Billing</h2>
        <p className="!mt-1 text-base text-slate-500">GST charged on sales, against credit from received bills.</p>
      </div>

      <GstTabs />

      <div className="!mt-5 flex flex-wrap items-center gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white !px-3.5 !py-2.5 text-sm text-slate-800 outline-none focus:border-orange-500"
        />
        <button
          type="button"
          onClick={exportCsv}
          disabled={!data}
          className="ml-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white !px-4 !py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export summary (Excel)
        </button>
      </div>

      {error && <p className="!mt-5 rounded-xl bg-red-50 !px-4 !py-3 text-sm font-medium text-red-600">{error}</p>}

      {data && (
        <>
          <section className="grid grid-cols-1 gap-5 !mt-5 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200/70 bg-white !p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-600">Sales invoices · {monthLabel(month)}</p>
              <p className="!mt-2 text-3xl font-bold text-slate-900">{data.sales.count}</p>
              <p className="!mt-1 text-sm text-slate-400">Taxable value ₹{inr(data.sales.taxable)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200/70 bg-white !p-5 shadow-sm">
              <p className="text-sm font-semibold text-slate-600">Received bills · {monthLabel(month)}</p>
              <p className="!mt-2 text-3xl font-bold text-slate-900">{data.purchases.count}</p>
              <p className="!mt-1 text-sm text-slate-400">
                Taxable value ₹{inr(data.purchases.taxable)}
                {data.purchases.noItcCount ? ` · ${data.purchases.noItcCount} without credit` : ""}
              </p>
            </div>
          </section>

          <section className="!mt-5 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="!px-6 !py-3">Tax</th>
                  <th className="!px-6 !py-3 text-right">Charged on sales</th>
                  <th className="!px-6 !py-3 text-right">Credit from received bills</th>
                  <th className="!px-6 !py-3 text-right">Difference (estimate)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([name, a, b]) => (
                  <tr key={name} className="border-b border-slate-100">
                    <td className="!px-6 !py-4 font-semibold text-slate-900">{name}</td>
                    <td className="!px-6 !py-4 text-right text-slate-700">₹{inr(a)}</td>
                    <td className="!px-6 !py-4 text-right text-green-700">₹{inr(b)}</td>
                    <td className="!px-6 !py-4 text-right font-semibold text-slate-900">₹{inr(a - b)}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50/70 font-bold text-slate-900">
                  <td className="!px-6 !py-4">Total</td>
                  <td className="!px-6 !py-4 text-right">₹{inr(totalSales)}</td>
                  <td className="!px-6 !py-4 text-right text-green-700">₹{inr(totalItc)}</td>
                  <td className="!px-6 !py-4 text-right">₹{inr(totalSales - totalItc)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <p className="!mt-4 max-w-3xl rounded-xl bg-amber-50 !px-4 !py-3 text-sm text-amber-800">
            This is only an estimate to help your CA. A negative difference means credit is left over. How credits of CGST, SGST and IGST are used
            against each other, and the final amount to pay, is decided by your CA when filing the return. Cancelled invoices are left out, and bills
            marked as not eligible for credit are not counted.
          </p>
        </>
      )}
    </main>
  );
};

export default GstSummary;