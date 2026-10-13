// Run:  node scripts/createUser.js
// There is NO public sign-up page. Accounts are created only from here, by you.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { ask } = require("./prompt");
const { validatePassword } = require("../utils/password");

(async () => {
  try {
    const username = (await ask("Username: ")).trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
      throw new Error("Username must be 3-50 characters: letters, numbers, dot, dash or underscore.");
    }
    const fullName = (await ask("Full name: ")).trim();
    if (!fullName) throw new Error("Full name is required.");

    const roleInput = (await ask("Role (admin/staff) [admin]: ")).trim().toLowerCase() || "admin";
    if (!["admin", "staff"].includes(roleInput)) throw new Error("Role must be admin or staff.");

    const password = await ask("Password: ", true);
    const problem = validatePassword(password, username);
    if (problem) throw new Error(problem);
    const again = await ask("Repeat password: ", true);
    if (again !== password) throw new Error("Passwords do not match.");

    const hash = await bcrypt.hash(password, 12);
    await db.query("INSERT INTO users (username, full_name, password_hash, role) VALUES (?, ?, ?, ?)", [
      username,
      fullName,
      hash,
      roleInput,
    ]);
    console.log(`\nUser "${username}" created as ${roleInput}.`);
  } catch (err) {
    console.error(`\nNot created: ${err.code === "ER_DUP_ENTRY" ? "that username already exists." : err.message}`);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();