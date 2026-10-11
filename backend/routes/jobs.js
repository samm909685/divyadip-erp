const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../config/db");
const wrap = require("../utils/asyncHandler");
const { JOB_SELECT, toJob, getJobById, isPosInt } = require("../utils/jobHelpers");

const router = express.Router();

// ---- Challan copy upload (PDF / JPG / PNG, max 10 MB) ----
const uploadDir = path.join(__dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["application/pdf", "image/jpeg", "image/png"].includes(file.mimetype);
    cb(ok ? null : new Error("Only PDF, JPG or PNG files are allowed."), ok);
  },
});

// GET /api/jobs?tab=unprocessed|completed&search=&company=
router.get(
  "/",
  wrap(async (req, res) => {
    const { tab, search, company } = req.query;
    const where = [];
    const params = [];

    if (search) {
      where.push("(j.job_name LIKE ? OR j.company LIKE ? OR j.challan_no LIKE ? OR j.vehicle_no LIKE ?)");
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (company && company !== "all") {
      where.push("j.company = ?");
      params.push(company);
    }

    let having = "";
    if (tab === "unprocessed") having = "HAVING j.total_qty - COALESCE(SUM(c.qty), 0) > 0";
    if (tab === "completed") having = "HAVING COALESCE(SUM(c.qty), 0) > 0";

    const sql = `${JOB_SELECT}
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      GROUP BY j.id
      ${having}
      ORDER BY j.inward_date DESC, j.id DESC`;

    const [rows] = await db.query(sql, params);
    res.json(rows.map(toJob));
  })
);

// GET /api/jobs/companies  (for the company filter dropdown)
router.get(
  "/companies",
  wrap(async (req, res) => {
    const [rows] = await db.query("SELECT DISTINCT company FROM jobs ORDER BY company");
    res.json(rows.map((r) => r.company));
  })
);

// GET /api/jobs/:id  (job + its completion history)
router.get(
  "/:id",
  wrap(async (req, res) => {
    const job = await getJobById(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  })
);

// POST /api/jobs  (challan inward creates the job)
router.post(
  "/",
  wrap(async (req, res) => {
    const b = req.body;
    if (!b.name || !b.company || !b.inwardDate) {
      return res.status(400).json({ message: "Job name, company and inward date are required." });
    }
    if (!isPosInt(b.total)) {
      return res.status(400).json({ message: "Total quantity must be a number greater than 0." });
    }

    const [result] = await db.query(
      `INSERT INTO jobs
        (challan_no, job_name, description, company, inward_date, inward_time, vehicle_no, unit, total_qty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        b.challanNo ? b.challanNo.trim() : null,
        b.name.trim(),
        b.description || null,
        b.company.trim(),
        b.inwardDate,
        b.time || null,
        b.vehicle || null,
        b.unit || "pcs",
        Number(b.total),
      ]
    );
    res.status(201).json(await getJobById(result.insertId));
  })
);

// PUT /api/jobs/:id  (edit job details)
router.put(
  "/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await getJobById(id);
    if (!existing) return res.status(404).json({ message: "Job not found" });

    const b = req.body;
    if (!b.name || !b.company || !b.inwardDate) {
      return res.status(400).json({ message: "Job name, company and inward date are required." });
    }
    if (!isPosInt(b.total)) {
      return res.status(400).json({ message: "Total quantity must be a number greater than 0." });
    }
    if (Number(b.total) < existing.completed) {
      return res
        .status(400)
        .json({ message: `Total cannot be less than the ${existing.completed} already completed.` });
    }

    await db.query(
      `UPDATE jobs SET challan_no=?, job_name=?, description=?, company=?, inward_date=?,
         inward_time=?, vehicle_no=?, unit=?, total_qty=? WHERE id=?`,
      [
        existing.challanNo,
        b.name.trim(),
        b.description || null,
        b.company.trim(),
        b.inwardDate,
        b.time || null,
        b.vehicle || null,
        b.unit || "pcs",
        Number(b.total),
        id,
      ]
    );
    res.json(await getJobById(id));
  })
);

// POST /api/jobs/:id/challan  (attach / replace the challan copy)
router.post(
  "/:id/challan",
  upload.single("file"),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    if (!req.file) return res.status(400).json({ message: "Choose a file to upload." });

    const existing = await getJobById(id);
    if (!existing) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: "Job not found" });
    }
    if (existing.challanFile) fs.unlink(path.join(uploadDir, existing.challanFile), () => {});

    await db.query("UPDATE jobs SET challan_file = ? WHERE id = ?", [req.file.filename, id]);
    res.json(await getJobById(id));
  })
);

// DELETE /api/jobs/:id
router.delete(
  "/:id",
  wrap(async (req, res) => {
    const [result] = await db.query("DELETE FROM jobs WHERE id = ?", [Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ message: "Job not found" });
    res.json({ message: "Job deleted" });
  })
);

module.exports = router;