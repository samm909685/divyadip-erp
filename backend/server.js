require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rl = require("express-rate-limit");
const path = require("path");
const db = require("./config/db");
const { requireAuth } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const jobsRoutes = require("./routes/jobs");
const completionsRoutes = require("./routes/completions");
const dashboardRoutes = require("./routes/dashboard");
const purchasesRoutes = require("./routes/purchases");
const challansRoutes = require("./routes/challans");
const gstRoutes = require("./routes/gst");
const gstReceivedRoutes = require("./routes/gstReceived");
const jobCostsRoutes = require("./routes/jobCosts");
const systemRoutes = require("./routes/system");

// Refuse to start without a strong secret: a weak one lets attackers forge logins.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("JWT_SECRET is missing or too short (need 32+ characters). Check backend/.env");
  process.exit(1);
}

const rateLimit = rl.rateLimit || rl;
const app = express();

// Set TRUST_PROXY=1 in .env when the app runs behind a hosting proxy (Render, Nginx...)
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY));

// Security headers. "same-site" lets the React page (port 5173) show photos served by the backend (port 5000).
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: "same-site" } }));
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// General limit for every API call
app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests. Please slow down." },
  })
);

// ---- Public routes (no login needed) ----
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    console.error("Health check failed:", err.message);
    res.status(500).json({ status: "error" });
  }
});
app.use("/api/auth", authRoutes);

// ---- Everything below needs a valid login ----
app.use("/api", requireAuth);
app.use("/api/jobs", jobsRoutes);
app.use("/api", completionsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/purchases", purchasesRoutes);
app.use("/api/challans", challansRoutes);
app.use("/api/gst", gstRoutes);
app.use("/api/gst", gstReceivedRoutes);
app.use("/api/costs", jobCostsRoutes);
app.use("/api/system", systemRoutes);

// Uploaded files are private too
app.use("/uploads", requireAuth, express.static(path.join(__dirname, "uploads")));

app.use("/api", (req, res) => res.status(404).json({ message: "Route not found" }));

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Invalid request." });
  if (err.name === "MulterError" || err.message?.startsWith("Only PDF")) {
    const msg = err.code === "LIMIT_FILE_SIZE" ? "File is too large (max 10 MB)." : err.message;
    return res.status(400).json({ message: msg });
  }
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));