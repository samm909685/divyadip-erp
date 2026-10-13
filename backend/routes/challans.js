const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const db = require("../config/db");
const wrap = require("../utils/asyncHandler");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// Challan photos / PDFs are saved here (served only to logged-in users, see server.js)
const uploadDir = path.join(__dirname, "..", "uploads", "challans");
fs.mkdirSync(uploadDir, { recursive: true });

// The file is held in memory first, checked, and only then written to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10 MB
});

// We trust the file's real content (its first bytes), not its name or what the browser claims.
function detectType(buf) {
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", kind: "image" };
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: "png", kind: "image" };
  }
  if (buf.length > 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") {
    return { ext: "webp", kind: "image" };
  }
  if (buf.length > 4 && buf.subarray(0, 4).toString("latin1") === "%PDF") return { ext: "pdf", kind: "pdf" };
  return null;
}

// Saves the file under a random name (never the user's file name). Returns null if the type is not allowed.
async function saveFile(buffer) {
  const type = detectType(buffer);
  if (!type) return null;
  const fileName = `${crypto.randomUUID()}.${type.ext}`;
  await fs.promises.writeFile(path.join(uploadDir, fileName), buffer, { flag: "wx" });
  return { fileName, fileType: type.kind };
}

const removeFile = (name) => fs.promises.unlink(path.join(uploadDir, path.basename(name))).catch(() => {});

const BAD_FILE = "Only JPG, PNG, WebP or PDF files are allowed.";

// Cleans and checks the text fields. Returns { error } or { values }.
function clean(b) {
  const date = String(b.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { error: "Date is required." };
  const time = String(b.time || "");
  if (time && !/^\d{2}:\d{2}$/.test(time)) return { error: "Time is not valid." };
  return {
    values: {
      date,
      time: time || null,
      challanNo: String(b.challanNo || "").trim().slice(0, 50) || null,
      party: String(b.party || "").trim().slice(0, 150) || null,
      notes: String(b.notes || "").trim().slice(0, 500) || null,
    },
  };
}

const toChallan = (r) => ({
  id: r.id,
  challanNo: r.challan_no || "",
  party: r.party || "",
  date: r.challan_date,
  time: r.challan_time ? r.challan_time.slice(0, 5) : "",
  notes: r.notes || "",
  filePath: `challans/${r.file_name}`,
  fileType: r.file_type,
  originalName: r.original_name || "",
});

// GET /api/challans?month=YYYY-MM   (no month = all)
router.get(
  "/",
  wrap(async (req, res) => {
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month || "")) ? req.query.month : null;
    const [rows] = await db.query(
      `SELECT * FROM challans
       ${month ? "WHERE DATE_FORMAT(challan_date, '%Y-%m') = ?" : ""}
       ORDER BY challan_date DESC, challan_time DESC, id DESC`,
      month ? [month] : []
    );
    res.json(rows.map(toChallan));
  })
);

// POST /api/challans   (multipart form: date, time, challanNo, party, notes, file)
router.post(
  "/",
  upload.single("file"),
  wrap(async (req, res) => {
    const { error, values } = clean(req.body || {});
    if (error) return res.status(400).json({ message: error });
    if (!req.file) return res.status(400).json({ message: "Choose the challan photo or PDF." });

    const saved = await saveFile(req.file.buffer);
    if (!saved) return res.status(400).json({ message: BAD_FILE });

    const [result] = await db.query(
      `INSERT INTO challans
        (challan_no, party, challan_date, challan_time, notes, file_name, original_name, file_type, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        values.challanNo,
        values.party,
        values.date,
        values.time,
        values.notes,
        saved.fileName,
        String(req.file.originalname || "").slice(0, 255) || null,
        saved.fileType,
        req.user.id,
      ]
    );
    const [rows] = await db.query("SELECT * FROM challans WHERE id = ?", [result.insertId]);
    res.status(201).json(toChallan(rows[0]));
  })
);

// PUT /api/challans/:id   (a new file is optional; without it the old photo stays)
router.put(
  "/:id",
  upload.single("file"),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const [existing] = await db.query("SELECT * FROM challans WHERE id = ?", [id]);
    if (!existing.length) return res.status(404).json({ message: "Challan not found" });

    const { error, values } = clean(req.body || {});
    if (error) return res.status(400).json({ message: error });

    let fileName = existing[0].file_name;
    let fileType = existing[0].file_type;
    let originalName = existing[0].original_name;
    let replaced = false;

    if (req.file) {
      const saved = await saveFile(req.file.buffer);
      if (!saved) return res.status(400).json({ message: BAD_FILE });
      fileName = saved.fileName;
      fileType = saved.fileType;
      originalName = String(req.file.originalname || "").slice(0, 255) || null;
      replaced = true;
    }

    await db.query(
      `UPDATE challans SET challan_no=?, party=?, challan_date=?, challan_time=?, notes=?,
         file_name=?, original_name=?, file_type=? WHERE id=?`,
      [values.challanNo, values.party, values.date, values.time, values.notes, fileName, originalName, fileType, id]
    );
    if (replaced) await removeFile(existing[0].file_name);

    const [rows] = await db.query("SELECT * FROM challans WHERE id = ?", [id]);
    res.json(toChallan(rows[0]));
  })
);

// DELETE /api/challans/:id   (admin only; also deletes the stored file)
router.delete(
  "/:id",
  requireRole("admin"),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const [rows] = await db.query("SELECT file_name FROM challans WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Challan not found" });

    await db.query("DELETE FROM challans WHERE id = ?", [id]);
    await removeFile(rows[0].file_name);
    res.json({ message: "Challan deleted" });
  })
);

module.exports = router;