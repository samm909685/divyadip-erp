// Returns an error message, or null if the password is acceptable.
const TOO_COMMON = ["password", "12345678", "qwerty", "admin123", "letmein", "divyadip", "welcome"];

function validatePassword(pw, username = "") {
  if (typeof pw !== "string" || !pw) return "Password is required.";
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (pw.length > 128) return "Password is too long (max 128 characters).";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Password must contain both letters and numbers.";
  const lower = pw.toLowerCase();
  if (username && lower.includes(username.toLowerCase())) return "Password must not contain your username.";
  if (TOO_COMMON.some((w) => lower.includes(w))) return "That password is too easy to guess. Choose something less predictable.";
  return null;
}

module.exports = { validatePassword };