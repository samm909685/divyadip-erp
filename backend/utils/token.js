const jwt = require("jsonwebtoken");

const COOKIE_NAME = "erp_token";
const MAX_AGE_MS = 8 * 60 * 60 * 1000; // a login lasts at most 8 hours

// httpOnly  -> JavaScript in the browser can never read the token (blocks XSS theft)
// secure    -> only sent over HTTPS in production
// sameSite  -> not sent on cross-site requests (blocks CSRF)
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.COOKIE_SAMESITE || "lax",
  path: "/",
});

function signToken(user) {
  return jwt.sign({ sub: String(user.id), tv: user.token_version }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: Math.floor(MAX_AGE_MS / 1000),
  });
}

function setAuthCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), { ...cookieOptions(), maxAge: MAX_AGE_MS });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}

module.exports = { COOKIE_NAME, signToken, setAuthCookie, clearAuthCookie };