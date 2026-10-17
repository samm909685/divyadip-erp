// Cost sheet maths and the period analysis. Money is added up in whole paise (integers), so totals are exact.

const paise = (n) => Math.round(Number(n) * 100);

// One cost sheet -> every money figure, in paise
function calcRecord({ jobsCount, ratePerJob, scrapKg, scrapRate, tools, workers }) {
  const toolsPaise = tools.reduce((s, t) => s + paise(t.amount), 0);
  const workersPaise = workers.reduce((s, w) => s + paise(w.amount), 0);
  const scrapPaise = Math.round((Math.round(Number(scrapKg) * 100) * paise(scrapRate)) / 100); // kg x Rs per kg
  const revenuePaise = Number(jobsCount) * paise(ratePerJob);
  const netPaise = toolsPaise - scrapPaise + workersPaise; // tools, minus scrap we get back, plus workers
  return { toolsPaise, workersPaise, scrapPaise, revenuePaise, netPaise, profitPaise: revenuePaise - netPaise };
}

/* ---------- dates (all in UTC so the server's time zone never matters) ---------- */
const toDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fmt = (dt) => dt.toISOString().slice(0, 10);
const addDays = (s, n) => {
  const dt = toDate(s);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fmt(dt);
};
const diffDays = (a, b) => Math.round((toDate(b) - toDate(a)) / 86400000);

// The bucket a date belongs to: the day, the week (starting Monday), or the month
function bucketKey(dateStr, group) {
  if (group === "month") return dateStr.slice(0, 7);
  if (group === "week") {
    const dt = toDate(dateStr);
    dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
    return fmt(dt);
  }
  return dateStr;
}

// Every bucket from `from` to `to`, so the chart has no gaps
function bucketKeys(from, to, group) {
  const keys = [];
  if (group === "month") {
    let [y, m] = from.slice(0, 7).split("-").map(Number);
    const last = to.slice(0, 7);
    for (;;) {
      const k = `${y}-${String(m).padStart(2, "0")}`;
      keys.push(k);
      if (k >= last) break;
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
    return keys;
  }
  const step = group === "week" ? 7 : 1;
  let cur = bucketKey(from, group);
  while (cur <= to) {
    keys.push(cur);
    cur = addDays(cur, step);
  }
  return keys;
}

// Keep the number of bars sensible
function chooseGroup(from, to, wanted) {
  const days = diffDays(from, to) + 1;
  let g = ["day", "week", "month"].includes(wanted) ? wanted : days <= 31 ? "day" : days <= 200 ? "week" : "month";
  if (g === "day" && days > 100) g = "week";
  if (g === "week" && days > 800) g = "month";
  return g;
}

const money = (p) => p / 100;
const emptyAcc = () => ({ records: 0, jobs: 0, revenue: 0, tools: 0, scrapKg: 0, scrapValue: 0, workers: 0, net: 0, profit: 0, noRate: 0 });

function addRecord(acc, r) {
  acc.records += 1;
  acc.jobs += Number(r.jobs_count);
  acc.revenue += paise(r.revenue);
  acc.tools += paise(r.tools_total);
  acc.scrapKg += Math.round(Number(r.scrap_kg) * 100);
  acc.scrapValue += paise(r.scrap_value);
  acc.workers += paise(r.workers_total);
  acc.net += paise(r.net_cost);
  acc.profit += paise(r.profit);
  if (paise(r.revenue) === 0) acc.noRate += 1;
  return acc;
}

// Accumulator -> numbers for the screen, with the per-job averages
function finish(a) {
  const jobs = a.jobs;
  const scrapKg = a.scrapKg / 100;
  return {
    records: a.records,
    jobs,
    revenue: money(a.revenue),
    toolsCost: money(a.tools),
    scrapKg,
    scrapValue: money(a.scrapValue),
    workers: money(a.workers),
    netCost: money(a.net),
    profit: money(a.profit),
    margin: a.revenue > 0 ? (a.profit / a.revenue) * 100 : null,
    costPerJob: jobs ? money(a.net) / jobs : 0,
    profitPerJob: jobs ? money(a.profit) / jobs : 0,
    scrapKgPerJob: jobs ? scrapKg / jobs : 0,
    avgScrapRate: scrapKg > 0 ? money(a.scrapValue) / scrapKg : null, // weighted: total value / total kg
    noRateCount: a.noRate,
  };
}

function totalsOf(records) {
  return finish(records.reduce(addRecord, emptyAcc()));
}

// records: rows from job_costs (numbers or strings); tools: rows from job_cost_tools
function buildAnalysis(records, tools, { from, to, group }) {
  const g = chooseGroup(from, to, group);

  // by period (bar chart)
  const buckets = new Map(bucketKeys(from, to, g).map((k) => [k, emptyAcc()]));
  records.forEach((r) => {
    const k = bucketKey(r.record_date, g);
    if (!buckets.has(k)) buckets.set(k, emptyAcc());
    addRecord(buckets.get(k), r);
  });
  const series = [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, acc]) => ({ key, ...finish(acc) }));

  // by job name
  const jobMap = new Map();
  records.forEach((r) => {
    const k = r.job_name.trim().toLowerCase();
    if (!jobMap.has(k)) jobMap.set(k, { name: r.job_name, acc: emptyAcc() });
    addRecord(jobMap.get(k).acc, r);
  });
  const byJob = [...jobMap.values()].map((j) => ({ name: j.name, ...finish(j.acc) })).sort((a, b) => b.profit - a.profit);

  // by tool (where the tooling money goes)
  const inRange = new Set(records.map((r) => r.id));
  const toolMap = new Map();
  tools.filter((t) => inRange.has(t.cost_id)).forEach((t) => {
    const k = t.tool_name.trim().toLowerCase();
    if (!toolMap.has(k)) toolMap.set(k, { name: t.tool_name, qty: 0, amount: 0 });
    const row = toolMap.get(k);
    row.qty += Math.round(Number(t.qty) * 100);
    row.amount += paise(t.amount);
  });
  const byTool = [...toolMap.values()]
    .map((t) => ({ name: t.name, qty: t.qty / 100, amount: money(t.amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 20);

  return { group: g, totals: totalsOf(records), series, byJob, byTool };
}

module.exports = { calcRecord, buildAnalysis, totalsOf, chooseGroup, addDays, diffDays, bucketKey };