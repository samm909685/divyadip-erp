require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./config/db");

const jobsRoutes = require("./routes/jobs");
const completionsRoutes = require("./routes/completions");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", database: err.message });
  }
});

app.use("/api/jobs", jobsRoutes);
app.use("/api", completionsRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Unknown API route
app.use("/api", (req, res) => res.status(404).json({ message: "Route not found" }));

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));