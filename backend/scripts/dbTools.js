// Helpers for running MySQL's own backup and restore programs (mysqldump and mysql).
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const WIN = process.platform === "win32";

// Finds mysqldump / mysql. Set MYSQL_BIN in .env to the MySQL "bin" folder if it is not found.
function findTool(name) {
  const exe = WIN ? `${name}.exe` : name;
  const candidates = [];
  if (process.env.MYSQL_BIN) candidates.push(path.join(process.env.MYSQL_BIN, exe));
  if (WIN) {
    for (const base of ["C:\\Program Files\\MySQL", "C:\\Program Files (x86)\\MySQL"]) {
      try {
        for (const d of fs.readdirSync(base)) candidates.push(path.join(base, d, "bin", exe));
      } catch {
        /* that folder does not exist */
      }
    }
    candidates.push(path.join("C:\\xampp\\mysql\\bin", exe), path.join("C:\\wamp64\\bin\\mysql", exe));
  }
  return candidates.find((c) => fs.existsSync(c)) || name; // otherwise rely on PATH
}

function connArgs() {
  const args = [`--host=${process.env.DB_HOST || "localhost"}`, `--user=${process.env.DB_USER}`];
  if (process.env.DB_PORT) args.push(`--port=${process.env.DB_PORT}`);
  return args;
}

// Runs a program without a shell. The password goes in an environment variable, not on the command line.
// input = path of a file to feed into the program.
function run(tool, args, { input } = {}) {
  return new Promise((resolve) => {
    let stderr = "";
    const child = spawn(tool, args, {
      env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || "" },
      stdio: [input ? "pipe" : "ignore", "ignore", "pipe"],
      windowsHide: true,
    });
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (e) =>
      resolve({ code: -1, stderr: e.code === "ENOENT" ? `Could not find "${path.basename(tool)}". Add MYSQL_BIN to .env (the MySQL "bin" folder).` : e.message })
    );
    child.on("close", (code) => resolve({ code, stderr }));
    if (input) {
      child.stdin.on("error", () => {});
      fs.createReadStream(input).pipe(child.stdin);
    }
  });
}

module.exports = { findTool, connArgs, run };