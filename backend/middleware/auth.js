const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { COOKIE_NAME } = require("../utils/token");

const EXPIRED = { message: "Session expired. Please log in again." };

// Every protected request is checked against the database, so a disabled user
// or a changed password logs that user out immediately.
async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ message: "Please log in." });

    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    const [rows] = await db.query(
      "SELECT id, username, full_name, role, is_active, token_version FROM users WHERE id = ?",
      [Number(payload.sub)]
    );
    const user = rows[0];
    if (!user || !user.is_active || user.token_version !== payload.tv) {
      return res.status(401).json(EXPIRED);
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json(EXPIRED);
  }
}

// Use later for admin-only actions: router.delete("/:id", requireRole("admin"), ...)
const requireRole =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user?.role) ? next() : res.status(403).json({ message: "You do not have permission to do this." });

module.exports = { requireAuth, requireRole };