const express = require("express");
const db = require("../config/db");
const wrap = require("../utils/asyncHandler");
const { requireRole } = require("../middleware/auth");
const { calcRecord, buildAnalysis, totalsOf, addDays, diffDays } = require("../utils/analysis");

const router = express.Router();
router.use(requireRole("admin")); // cost and profit figures are admin-only

const str = (v, max) => String(v ?? "").trim().slice(0, max);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && !Number.isNaN(Date.parse(v));
const twoDecimals = (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
// A number within limits, with at most 2 decimals
const num = (v, { min = 0, max, allowZero = true }) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || (!allowZero && n === 0) || n > max || !twoDecimals(n)) return null;
  return n;
};

// An empty box counts as 0 (for rate and scrap, which can be left empty)
const numOrZero = (v, opts) => (v === "" || v === null || v === undefined ? 0 : num(v, opts));

// Checks everything the browser sent. Returns { error } or { v } (clean values).
function check(b) {
  if (!isDate(b.date)) return { error: "Date is required." };
  const jobName = str(b.jobName, 150);
  if (!jobName) return { error: "Enter the job name." };

  const jobsCount = Number(b.jobsCount);
  if (!Number.isInteger(jobsCount) || jobsCount < 1 || jobsCount > 100000) return { error: "Number of jobs must be a whole number from 1 to 100000." };

  const ratePerJob = numOrZero(b.ratePerJob, { max: 9999999.99 });
  if (ratePerJob === null) return { error: "Rate per job is not valid." };

  const scrapKg = numOrZero(b.scrapKg, { max: 1000000 });
  if (scrapKg === null) return { error: "Scrap weight is not valid." };
  const scrapRate = numOrZero(b.scrapRate, { max: 100000 });
  if (scrapRate === null) return { error: "Scrap rate is not valid." };

  const toolsIn = Array.isArray(b.tools) ? b.tools : [];
  const workersIn = Array.isArray(b.workers) ? b.workers : [];
  if (toolsIn.length > 40) return { error: "At most 40 tool lines." };
  if (workersIn.length > 30) return { error: "At most 30 worker lines." };
  if (!toolsIn.length && !workersIn.length) return { error: "Add at least one tool or worker fee." };

  const tools = [];
  for (let i = 0; i < toolsIn.length; i++) {
    const name = str(toolsIn[i].name, 150);
    const qty = num(toolsIn[i].qty, { max: 1000000, allowZero: false });
    const amount = num(toolsIn[i].amount, { max: 999999999, allowZero: false });
    if (!name) return { error: `Tool ${i + 1}: enter the tool name.` };
    if (qty === null) return { error: `Tool ${i + 1}: enter how many times it was used.` };
    if (amount === null) return { error: `Tool ${i + 1}: enter the amount.` };
    tools.push({ name, qty, amount });
  }

  const workers = [];
  for (let i = 0; i < workersIn.length; i++) {
    const amount = num(workersIn[i].amount, { max: 999999999, allowZero: false });
    if (amount === null) return { error: `Worker ${i + 1}: enter the fee.` };
    workers.push({ name: str(workersIn[i].name, 100), amount });
  }

  return { v: { date: b.date, jobName, jobsCount, ratePerJob, scrapKg, scrapRate, tools, workers, notes: str(b.notes, 500) } };
}

const toRecord = (r, tools = [], workers = []) => ({
  id: r.id,
  date: r.record_date,
  jobName: r.job_name,
  jobsCount: r.jobs_count,
  ratePerJob: Number(r.rate_per_job),
  revenue: Number(r.revenue),
  scrapKg: Number(r.scrap_kg),
  scrapRate: Number(r.scrap_rate),
  scrapValue: Number(r.scrap_value),
  toolsTotal: Number(r.tools_total),
  workersTotal: Number(r.workers_total),
  netCost: Number(r.net_cost),
  profit: Number(r.profit),
  costPerJob: r.jobs_count ? Number(r.net_cost) / r.jobs_count : 0,
  notes: r.notes || "",
  tools: tools.map((t) => ({ name: t.tool_name, qty: Number(t.qty), amount: Number(t.amount) })),
  workers: workers.map((w) => ({ name: w.worker_name || "", amount: Number(w.amount) })),
});

async function getRecord(id, conn = db) {
  const [rows] = await conn.query("SELECT * FROM job_costs WHERE id = ?", [id]);
  if (!rows.length) return null;
  const [tools] = await conn.query("SELECT * FROM job_cost_tools WHERE cost_id = ? ORDER BY sort_order", [id]);
  const [workers] = await conn.query("SELECT * FROM job_cost_workers WHERE cost_id = ? ORDER BY sort_order", [id]);
  return toRecord(rows[0], tools, workers);
}

async function writeLines(conn, id, v) {
  if (v.tools.length) {
    await conn.query("INSERT INTO job_cost_tools (cost_id, sort_order, tool_name, qty, amount) VALUES ?", [
      v.tools.map((t, i) => [id, i + 1, t.name, t.qty, t.amount]),
    ]);
  }
  if (v.workers.length) {
    await conn.query("INSERT INTO job_cost_workers (cost_id, sort_order, worker_name, amount) VALUES ?", [
      v.workers.map((w, i) => [id, i + 1, w.name || null, w.amount]),
    ]);
  }
}

// The server does the maths; numbers sent by the browser are ignored.
const figures = (v) => {
  const c = calcRecord({ jobsCount: v.jobsCount, ratePerJob: v.ratePerJob, scrapKg: v.scrapKg, scrapRate: v.scrapRate, tools: v.tools, workers: v.workers });
  return { ...c, values: [c.revenuePaise / 100, c.scrapPaise / 100, c.toolsPaise / 100, c.workersPaise / 100, c.netPaise / 100, c.profitPaise / 100] };
};

/* ------------------------------ cost sheets ------------------------------ */

// GET /api/costs/records?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get(
  "/records",
  wrap(async (req, res) => {
    const where = [];
    const params = [];
    if (isDate(req.query.from)) { where.push("record_date >= ?"); params.push(req.query.from); }
    if (isDate(req.query.to)) { where.push("record_date <= ?"); params.push(req.query.to); }
    const [rows] = await db.query(
      `SELECT * FROM job_costs ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY record_date DESC, id DESC LIMIT 500`,
      params
    );
    let tools = [];
    let workers = [];
    if (rows.length) {
      const ids = rows.map((r) => r.id);
      [tools] = await db.query("SELECT * FROM job_cost_tools WHERE cost_id IN (?) ORDER BY cost_id, sort_order", [ids]);
      [workers] = await db.query("SELECT * FROM job_cost_workers WHERE cost_id IN (?) ORDER BY cost_id, sort_order", [ids]);
    }
    res.json(rows.map((r) => toRecord(r, tools.filter((t) => t.cost_id === r.id), workers.filter((w) => w.cost_id === r.id))));
  })
);

// GET /api/costs/records/last?job=620   (the newest sheet of a job, to copy from)
router.get(
  "/records/last",
  wrap(async (req, res) => {
    const [rows] = await db.query("SELECT id FROM job_costs WHERE LOWER(job_name) = LOWER(?) ORDER BY record_date DESC, id DESC LIMIT 1", [str(req.query.job, 150)]);
    if (!rows.length) return res.status(404).json({ message: "No earlier sheet for this job." });
    res.json(await getRecord(rows[0].id));
  })
);

// GET /api/costs/job-names
router.get(
  "/job-names",
  wrap(async (req, res) => {
    const [rows] = await db.query("SELECT job_name, MAX(record_date) AS last FROM job_costs GROUP BY job_name ORDER BY last DESC");
    res.json(rows.map((r) => r.job_name));
  })
);

router.post(
  "/records",
  wrap(async (req, res) => {
    const { error, v } = check(req.body || {});
    if (error) return res.status(400).json({ message: error });
    const f = figures(v);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.query(
        `INSERT INTO job_costs (record_date, job_name, jobs_count, rate_per_job, revenue, scrap_kg, scrap_rate,
           scrap_value, tools_total, workers_total, net_cost, profit, notes, created_by)
         VALUES (?,?,?,?,?,?,?, ?,?,?,?,?,?,?)`,
        [v.date, v.jobName, v.jobsCount, v.ratePerJob, f.values[0], v.scrapKg, v.scrapRate, f.values[1], f.values[2], f.values[3], f.values[4], f.values[5], v.notes || null, req.user.id]
      );
      await writeLines(conn, ins.insertId, v);
      await conn.commit();
      res.status(201).json(await getRecord(ins.insertId));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

router.put(
  "/records/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const [existing] = await db.query("SELECT id FROM job_costs WHERE id = ?", [id]);
    if (!existing.length) return res.status(404).json({ message: "Cost sheet not found" });

    const { error, v } = check(req.body || {});
    if (error) return res.status(400).json({ message: error });
    const f = figures(v);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `UPDATE job_costs SET record_date=?, job_name=?, jobs_count=?, rate_per_job=?, revenue=?, scrap_kg=?, scrap_rate=?,
           scrap_value=?, tools_total=?, workers_total=?, net_cost=?, profit=?, notes=? WHERE id=?`,
        [v.date, v.jobName, v.jobsCount, v.ratePerJob, f.values[0], v.scrapKg, v.scrapRate, f.values[1], f.values[2], f.values[3], f.values[4], f.values[5], v.notes || null, id]
      );
      await conn.query("DELETE FROM job_cost_tools WHERE cost_id = ?", [id]);
      await conn.query("DELETE FROM job_cost_workers WHERE cost_id = ?", [id]);
      await writeLines(conn, id, v);
      await conn.commit();
      res.json(await getRecord(id));
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

router.delete(
  "/records/:id",
  wrap(async (req, res) => {
    const [r] = await db.query("DELETE FROM job_costs WHERE id = ?", [Number(req.params.id)]);
    if (!r.affectedRows) return res.status(404).json({ message: "Cost sheet not found" });
    res.json({ message: "Cost sheet deleted" });
  })
);

/* ------------------------------ analysis ------------------------------ */

// GET /api/costs/analysis?from=&to=&group=day|week|month   (group is optional)
router.get(
  "/analysis",
  wrap(async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const to = isDate(req.query.to) ? req.query.to : today;
    const from = isDate(req.query.from) ? req.query.from : addDays(to, -29);
    if (from > to) return res.status(400).json({ message: "The start date must be before the end date." });
    const days = diffDays(from, to) + 1;
    if (days > 1100) return res.status(400).json({ message: "Choose a period of 3 years or less." });

    // the same number of days just before, to compare with
    const prevTo = addDays(from, -1);
    const prevFrom = addDays(from, -days);

    const [records] = await db.query("SELECT * FROM job_costs WHERE record_date BETWEEN ? AND ?", [from, to]);
    const [prevRecords] = await db.query("SELECT * FROM job_costs WHERE record_date BETWEEN ? AND ?", [prevFrom, prevTo]);
    let tools = [];
    if (records.length) [tools] = await db.query("SELECT * FROM job_cost_tools WHERE cost_id IN (?)", [records.map((r) => r.id)]);

    const a = buildAnalysis(records, tools, { from, to, group: String(req.query.group || "") });
    res.json({ from, to, days, prevFrom, prevTo, ...a, previous: totalsOf(prevRecords) });
  })
);

module.exports = router;