// The same cost sheet maths as backend/utils/analysis.js, used here only to PREVIEW while typing.
// The server always recalculates, and its numbers are the ones saved.

export const paise = (n) => Math.round(Number(n) * 100);

export function calcRecord({ jobsCount, ratePerJob, scrapKg, scrapRate, tools, workers }) {
  const toolsPaise = tools.reduce((s, t) => s + paise(t.amount), 0);
  const workersPaise = workers.reduce((s, w) => s + paise(w.amount), 0);
  const scrapPaise = Math.round((Math.round(Number(scrapKg) * 100) * paise(scrapRate)) / 100);
  const revenuePaise = Number(jobsCount) * paise(ratePerJob);
  const netPaise = toolsPaise - scrapPaise + workersPaise; // tools, minus scrap we get back, plus workers
  return { toolsPaise, workersPaise, scrapPaise, revenuePaise, netPaise, profitPaise: revenuePaise - netPaise };
}

// ₹1,23,456 (whole rupees) and ₹1,234.50 (with paise); minus signs come before the rupee sign
export const rs0 = (n) => `${n < 0 ? "-" : ""}₹${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
export const rs2 = (n) =>
  `${n < 0 ? "-" : ""}₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const todayStr = () => new Date().toLocaleDateString("en-CA");
export const dmy = (d) => (d ? d.split("-").reverse().join("-") : "");
export const shortDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
export const longDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
export const monthLabel = (m) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });