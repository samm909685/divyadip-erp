const express = require("express");
const bcrypt = require("bcryptjs");
const rl = require("express-rate-limit");
const db = require("../config/db");
const wrap = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const { setAuthCookie, clearAuthCookie } = require("../utils/token");
const { validatePassword } = require("../utils/password");

const rateLimit = rl.rateLimit || rl;
const router = express.Router();

const MAX_FAILED = 5; // wrong passwords before the account locks
const LOCK_MINUTES = 15;
const BCRYPT_ROUNDS = 12;
const GENERIC = "Invalid username or password.";

// Used when the username does not exist, so the response takes the same time
// either way (stops attackers discovering which usernames are real).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-only-for-timing", BCRYPT_ROUNDS);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // 20 attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts from this device. Please wait 15 minutes." },
});

const publicUser = (u) => ({ id: u.id, username: u.username, fullName: u.full_name, role: u.role });

// POST /api/auth/login
router.post(
  "/login",
  authLimiter,
  wrap(async (req, res) => {
    const username = String(req.body?.username ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!username || !password) return res.status(400).json({ message: "Enter your username and password." });
    if (username.length > 50 || password.length > 128) return res.status(401).json({ message: GENERIC });

    const [rows] = await db.query(
      "SELECT *, (locked_until IS NOT NULL AND locked_until > NOW()) AS is_locked FROM users WHERE username = ?",
      [username]
    );
    const user = rows[0];

    const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

    if (!user || !user.is_active) return res.status(401).json({ message: GENERIC });

    if (user.is_locked) {
      return res
        .status(429)
        .json({ message: `Too many failed attempts. This account is locked for ${LOCK_MINUTES} minutes.` });
    }

    if (!passwordOk) {
      const attempts = user.failed_attempts + 1;
      if (attempts >= MAX_FAILED) {
        await db.query(
          "UPDATE users SET failed_attempts = 0, locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?",
          [LOCK_MINUTES, user.id]
        );
      } else {
        await db.query("UPDATE users SET failed_attempts = ? WHERE id = ?", [attempts, user.id]);
      }
      return res.status(401).json({ message: GENERIC });
    }

    await db.query("UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?", [
      user.id,
    ]);
    setAuthCookie(res, user);
    res.json({ user: publicUser(user) });
  })
);

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
});

// GET /api/auth/me  (is the browser still logged in?)
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

// POST /api/auth/change-password
router.post(
  "/change-password",
  authLimiter,
  requireAuth,
  wrap(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [req.user.id]);
    const user = rows[0];

    const ok = await bcrypt.compare(String(currentPassword ?? ""), user.password_hash);
    if (!ok) return res.status(400).json({ message: "Current password is incorrect." });

    const problem = validatePassword(newPassword, user.username);
    if (problem) return res.status(400).json({ message: problem });
    if (newPassword === currentPassword) {
      return res.status(400).json({ message: "New password must be different from the current one." });
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    // token_version + 1 logs out every other device that was using the old password
    await db.query("UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?", [
      hash,
      user.id,
    ]);
    const [[fresh]] = await db.query("SELECT id, token_version FROM users WHERE id = ?", [user.id]);
    setAuthCookie(res, fresh);

    res.json({ message: "Password changed. Other devices have been logged out." });
  })
);

module.exports = router;