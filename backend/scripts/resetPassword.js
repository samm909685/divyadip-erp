// Run:  node scripts/resetPassword.js
// For a forgotten password. Also unlocks the account and logs out all its devices.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { ask } = require("./prompt");
const { validatePassword } = require("../utils/password");

(async () => {
  try {
    const username = (await ask("Username to reset: ")).trim().toLowerCase();
    const [rows] = await db.query("SELECT id FROM users WHERE username = ?", [username]);
    if (!rows.length) throw new Error("No such user.");

    const password = await ask("New password: ", true);
    const problem = validatePassword(password, username);
    if (problem) throw new Error(problem);
    const again = await ask("Repeat new password: ", true);
    if (again !== password) throw new Error("Passwords do not match.");

    const hash = await bcrypt.hash(password, 12);
    await db.query(
      "UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL, token_version = token_version + 1 WHERE id = ?",
      [hash, rows[0].id]
    );
    console.log(`\nPassword reset for "${username}".`);
  } catch (err) {
    console.error(`\nNot reset: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
})();