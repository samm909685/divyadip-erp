// Run:  node scripts/backup.js
// Saves a complete copy of the database and the uploaded files (challan photos, bill copies)
// in a new dated folder, optionally copies it to a second place (USB drive), and clears out old ones.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { findTool, connArgs, run } = require("./dbTools");

const ROOT = path.join(__dirname, "..");
const BACKUP_DIR = path.resolve(ROOT, process.env.BACKUP_DIR || "backups");
const COPY_DIR = process.env.BACKUP_COPY_DIR ? path.resolve(process.env.BACKUP_COPY_DIR) : "";
const KEEP_DAYS = Math.max(7, Number(process.env.BACKUP_KEEP_DAYS) || 30);
const PREFIX = process.env.BACKUP_PREFIX || ""; // used by restore.js for its safety copy
const UPLOADS = path.join(ROOT, "uploads");
const NAME_FORMAT = /^\d{4}-\d{2}-\d{2}_\d{4}$/;

const pad = (n) => String(n).padStart(2, "0");
const stamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;

function readTail(file, bytes) {
  const fd = fs.openSync(file, "r");
  try {
    const size = fs.fstatSync(fd).size;
    const len = Math.min(bytes, size);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    return buf.toString("utf8");
  } finally {
    fs.closeSync(fd);
  }
}

// Removes old backups. Always keeps the newest 5, and only touches folders named like 2026-10-18_1830.
function tidy(dir) {
  const names = fs.readdirSync(dir).filter((n) => NAME_FORMAT.test(n)).sort().reverse();
  const cutoff = Date.now() - KEEP_DAYS * 86400000;
  names.slice(5).forEach((n) => {
    const [y, m, d] = n.slice(0, 10).split("-").map(Number);
    if (new Date(y, m - 1, d).getTime() < cutoff) fs.rmSync(path.join(dir, n), { recursive: true, force: true });
  });
}

function readStatus() {
  try {
    return JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, "last-backup.json"), "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const name = `${PREFIX}${stamp()}`;
  const folder = path.join(BACKUP_DIR, name); // the finished backup
  const work = path.join(BACKUP_DIR, `_working_${name}`); // built here first, so a failure can never damage a good backup
  const result = { ok: false, time: new Date().toISOString(), folder: name, sizeBytes: 0, secondCopy: COPY_DIR ? "failed" : "not set", message: "" };

  try {
    for (const k of ["DB_USER", "DB_NAME"]) if (!process.env[k]) throw new Error(`${k} is missing in .env`);
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.readdirSync(BACKUP_DIR).filter((n) => n.startsWith("_working_")).forEach((n) => fs.rmSync(path.join(BACKUP_DIR, n), { recursive: true, force: true })); // leftovers of a run that was cut off
    fs.mkdirSync(work, { recursive: true });

    // 1. the database
    const sqlFile = path.join(work, "database.sql");
    const { code, stderr } = await run(findTool("mysqldump"), [
      ...connArgs(),
      "--single-transaction",
      "--routines",
      "--triggers",
      "--no-tablespaces",
      "--default-character-set=utf8mb4",
      `--result-file=${sqlFile}`,
      process.env.DB_NAME,
    ]);
    if (code !== 0) throw new Error(`The database copy failed. ${stderr.trim().slice(0, 300)}`);
    const size = fs.statSync(sqlFile).size;
    if (size < 500 || !readTail(sqlFile, 400).includes("Dump completed")) throw new Error("The database copy looks incomplete, so it was not kept.");
    result.sizeBytes = size;

    // 2. the uploaded files
    if (fs.existsSync(UPLOADS)) fs.cpSync(UPLOADS, path.join(work, "uploads"), { recursive: true });

    // the backup is complete: give it its real name
    fs.rmSync(folder, { recursive: true, force: true });
    fs.renameSync(work, folder);

    // 3. a second copy somewhere else (for example a USB drive)
    if (COPY_DIR) {
      try {
        if (!fs.existsSync(COPY_DIR)) throw new Error(`The second place (${COPY_DIR}) is not available. Is the USB drive plugged in?`);
        fs.cpSync(folder, path.join(COPY_DIR, name), { recursive: true });
        result.secondCopy = "done";
      } catch (e) {
        result.secondCopy = "failed";
        result.message = e.message;
      }
    }

    result.ok = true;
    tidy(BACKUP_DIR);
    if (result.secondCopy === "done") tidy(COPY_DIR);
  } catch (e) {
    result.message = e.message;
    fs.rmSync(work, { recursive: true, force: true }); // never leave half a backup lying around
  }

  if (!PREFIX) {
    const previous = readStatus();
    result.lastGoodTime = result.ok ? result.time : previous?.lastGoodTime || null;
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.writeFileSync(path.join(BACKUP_DIR, "last-backup.json"), JSON.stringify(result));
    fs.appendFileSync(path.join(BACKUP_DIR, "backup.log"), `${new Date().toLocaleString("en-IN")}  ${result.ok ? "OK" : "FAILED"}  ${name}  ${result.message}\n`);
  }

  if (result.ok) {
    console.log(`Backup saved: ${folder}  (database ${(result.sizeBytes / 1024).toFixed(0)} KB)`);
    if (COPY_DIR) console.log(result.secondCopy === "done" ? `Second copy saved in ${COPY_DIR}` : `WARNING: second copy not made. ${result.message}`);
  } else {
    console.error(`BACKUP FAILED: ${result.message}`);
    process.exitCode = 1;
  }
}

main();