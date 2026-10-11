const express = require("express");
const db = require("../config/db");
const wrap = require("../utils/asyncHandler");
const { getJobById, isPosInt } = require("../utils/jobHelpers");

const router = express.Router();

// POST /api/jobs/:id/completions  -> mark some quantity as done
router.post(
  "/jobs/:id/completions",
  wrap(async (req, res) => {
    const jobId = Number(req.params.id);
    const job = await getJobById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });

    const { qty, completedDate, note } = req.body;
    if (!isPosInt(qty)) return res.status(400).json({ message: "Enter a quantity greater than 0." });
    if (!completedDate) return res.status(400).json({ message: "Completion date is required." });
    if (Number(qty) > job.remaining) {
      return res.status(400).json({ message: `Only ${job.remaining} ${job.unit} remaining.` });
    }

    await db.query(
      "INSERT INTO job_completions (job_id, qty, completed_date, note) VALUES (?, ?, ?, ?)",
      [jobId, Number(qty), completedDate, note || null]
    );
    res.status(201).json(await getJobById(jobId));
  })
);

// PUT /api/completions/:id  -> fix a wrong entry
router.put(
  "/completions/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const [rows] = await db.query("SELECT * FROM job_completions WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Entry not found" });

    const old = rows[0];
    const job = await getJobById(old.job_id);
    const { qty, completedDate, note } = req.body;

    if (!isPosInt(qty)) return res.status(400).json({ message: "Enter a quantity greater than 0." });
    if (!completedDate) return res.status(400).json({ message: "Completion date is required." });

    const available = job.remaining + old.qty; // this entry's old quantity is freed up
    if (Number(qty) > available) {
      return res.status(400).json({ message: `Only ${available} ${job.unit} can be assigned to this entry.` });
    }

    await db.query("UPDATE job_completions SET qty=?, completed_date=?, note=? WHERE id=?", [
      Number(qty),
      completedDate,
      note || null,
      id,
    ]);
    res.json(await getJobById(old.job_id));
  })
);

// DELETE /api/completions/:id
router.delete(
  "/completions/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const [rows] = await db.query("SELECT job_id FROM job_completions WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Entry not found" });

    await db.query("DELETE FROM job_completions WHERE id = ?", [id]);
    res.json(await getJobById(rows[0].job_id));
  })
);

module.exports = router;