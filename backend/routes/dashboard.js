const express = require("express");
const db = require("../config/db");
const wrap = require("../utils/asyncHandler");

const router = express.Router();

// GET /api/dashboard/summary  -> numbers for the top cards
router.get(
  "/summary",
  wrap(async (req, res) => {
    const [[row]] = await db.query(`
      SELECT
        COUNT(*)                                  AS total_challans,
        COALESCE(SUM(remaining > 0), 0)           AS unprocessed_jobs,
        COALESCE(SUM(completed > 0), 0)           AS completed_jobs,
        COALESCE(SUM(total), 0)                   AS received_qty,
        COALESCE(SUM(completed), 0)               AS completed_qty
      FROM (
        SELECT j.id,
               j.total_qty AS total,
               COALESCE(SUM(c.qty), 0) AS completed,
               j.total_qty - COALESCE(SUM(c.qty), 0) AS remaining
        FROM jobs j
        LEFT JOIN job_completions c ON c.job_id = j.id
        GROUP BY j.id
      ) t`);

    res.json({
      unprocessed: Number(row.unprocessed_jobs),
      completed: Number(row.completed_jobs),
      challans: Number(row.total_challans),
      receivedQty: Number(row.received_qty),
      completedQty: Number(row.completed_qty),
      remainingQty: Number(row.received_qty) - Number(row.completed_qty),
    });
  })
);

// GET /api/dashboard/monthly  -> received vs completed quantity per month
router.get(
  "/monthly",
  wrap(async (req, res) => {
    const [received] = await db.query(
      "SELECT DATE_FORMAT(inward_date, '%Y-%m') AS month, SUM(total_qty) AS qty FROM jobs GROUP BY month"
    );
    const [completed] = await db.query(
      "SELECT DATE_FORMAT(completed_date, '%Y-%m') AS month, SUM(qty) AS qty FROM job_completions GROUP BY month"
    );

    const map = {};
    received.forEach((r) => {
      map[r.month] = { month: r.month, received: Number(r.qty), completed: 0 };
    });
    completed.forEach((r) => {
      map[r.month] = map[r.month] || { month: r.month, received: 0, completed: 0 };
      map[r.month].completed = Number(r.qty);
    });

    res.json(Object.values(map).sort((a, b) => a.month.localeCompare(b.month)));
  })
);

module.exports = router;