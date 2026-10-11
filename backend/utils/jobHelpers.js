const db = require("../config/db");

// Every job query also calculates how much is completed.
// "Remaining" is never stored: remaining = total - completed.
const JOB_SELECT = `
  SELECT j.*, COALESCE(SUM(c.qty), 0) AS completed_qty
  FROM jobs j
  LEFT JOIN job_completions c ON c.job_id = j.id`;

const toJob = (r) => {
  const completed = Number(r.completed_qty);
  return {
    id: r.id,
    jobNo: `JOB-${String(r.id).padStart(4, "0")}`,
    challanNo: r.challan_no,
    name: r.job_name,
    description: r.description || "",
    company: r.company,
    inwardDate: r.inward_date,
    time: r.inward_time ? r.inward_time.slice(0, 5) : "",
    vehicle: r.vehicle_no || "",
    unit: r.unit,
    total: r.total_qty,
    completed,
    remaining: r.total_qty - completed,
    challanFile: r.challan_file,
  };
};

const getJobById = async (id) => {
  const [rows] = await db.query(`${JOB_SELECT} WHERE j.id = ? GROUP BY j.id`, [id]);
  if (!rows.length) return null;

  const [comps] = await db.query(
    "SELECT id, qty, completed_date, note FROM job_completions WHERE job_id = ? ORDER BY completed_date, id",
    [id]
  );

  return {
    ...toJob(rows[0]),
    completions: comps.map((c) => ({
      id: c.id,
      qty: c.qty,
      date: c.completed_date,
      note: c.note || "",
    })),
  };
};

const isPosInt = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

module.exports = { JOB_SELECT, toJob, getJobById, isPosInt };