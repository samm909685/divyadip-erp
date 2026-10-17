const express = require("express");
const fs = require("fs");
const path = require("path");
const wrap = require("../utils/asyncHandler");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/system/backup-status  (admin only): when was the last backup, and did it work?
router.get(
  "/backup-status",
  requireRole("admin"),
  wrap(async (req, res) => {
    const dir = path.resolve(path.join(__dirname, ".."), process.env.BACKUP_DIR || "backups");
    try {
      const status = JSON.parse(await fs.promises.readFile(path.join(dir, "last-backup.json"), "utf8"));
      res.json({ configured: true, ...status });
    } catch {
      res.json({ configured: false }); // no backup has been made yet
    }
  })
);

module.exports = router;