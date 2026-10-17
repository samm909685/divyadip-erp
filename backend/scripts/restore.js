// Run:  node scripts/restore.js [backup folder]
// Puts the data from a backup back. Without a folder name it uses the newest backup.
// WARNING: this replaces the current data with the data in the backup.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { ask } = require("./prompt");
const { findTool, connArgs, run } = require("./dbTools");

const ROOT = path.join(__dirname, "..");
const BACKUP_DIR = path.resolve(ROOT, process.env.BACKUP_DIR || "backups");
const NAME_FORMAT = /^\d{4}-\d{2}-\d{2}_\d{4}$/;

async function main() {
  const db = process.env.DB_NAME || "";
  if (!/^[A-Za-z0-9_]+$/.test(db) || !process.env.DB_USER) throw new Error("DB_NAME or DB_USER in .env is missing or not valid.");

  let folder = process.argv[2] ? path.resolve(process.argv[2]) : "";
  if (!folder) {
    const names = fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR).filter((n) => NAME_FORMAT.test(n)).sort().reverse() : [];
    if (!names.length) throw new Error(`No backups found in ${BACKUP_DIR}`);
    folder = path.join(BACKUP_DIR, names[0]);
  }
  const sqlFile = path.join(folder, "database.sql");
  if (!fs.existsSync(sqlFile)) throw new Error(`There is no database.sql in ${folder}`);

  console.log(`\nBackup to restore: ${folder}`);
  console.log(`This REPLACES the current data in "${db}" with the data from that backup.`);
  console.log("Anything entered after that backup was made will be gone (a safety copy of the current data is saved first).\n");
  if ((await ask('Type RESTORE and press Enter to continue: ')).trim() !== "RESTORE") {
    console.log("Cancelled. Nothing was changed.");
    return;
  }

  console.log("\nSaving a safety copy of the current data first...");
  const safety = spawnSync(process.execPath, [path.join(__dirname, "backup.js")], { env: { ...process.env, BACKUP_PREFIX: "before-restore_" }, stdio: "inherit" });
  if (safety.status !== 0 && (await ask("The safety copy failed. Type YES to restore anyway: ")).trim() !== "YES") {
    console.log("Cancelled. Nothing was changed.");
    return;
  }

  const mysql = findTool("mysql");
  const created = await run(mysql, [...connArgs(), `--execute=CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4`]);
  if (created.code !== 0) throw new Error(`Could not prepare the database. ${created.stderr.trim().slice(0, 300)}`);

  console.log("Restoring the database...");
  const res = await run(mysql, [...connArgs(), "--default-character-set=utf8mb4", db], { input: sqlFile });
  if (res.code !== 0) throw new Error(`The restore failed. ${res.stderr.trim().slice(0, 300)}`);

  const uploads = path.join(folder, "uploads");
  if (fs.existsSync(uploads)) {
    console.log("Restoring the uploaded files...");
    fs.cpSync(uploads, path.join(ROOT, "uploads"), { recursive: true, force: true });
  }
  console.log("\nDone. Restart the ERP program and check the data.");
}

main().catch((e) => {
  console.error(`\nNot restored: ${e.message}`);
  process.exitCode = 1;
});