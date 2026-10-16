const express = require("express");
const multer = require("multer");
const db = require("../config/db");
const wrap = require("../utils/asyncHandler");
const { requireRole } = require("../middleware/auth");
const { makeStore } = require("../utils/fileStore");
const { GST_RATES, isStateCode, validateGstin, calcInvoice } = require("../utils/gst");

const router = express.Router();
router.use(requireRole("admin")); // GST records are admin-only

const store = makeStore("bills");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } });

const BAD_FILE = "Only JPG, PNG, WebP or PDF files are allowed.";
const str = (v, max) => String(v ?? "").trim().slice(0, max);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && !Number.isNaN(Date.parse(v));
const isMoney = (v) => {
  const n = Number(v);
  return v !== "" && v !== null && v !== undefined && Number.isFinite(n) && n > 0 && n <= 9999999999 && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
};

// Checks everything the browser sent. Returns { error } or { v } (clean values).
function check(b, ownState) {
  const supplierName = str(b.supplierName, 150);
  if (!supplierName) return { error: "Supplier name is required." };

  const gstin = str(b.supplierGstin, 15).toUpperCase();
  let stateCode = str(b.supplierStateCode, 2);
  if (gstin) {
    const problem = validateGstin(gstin);
    if (problem) return { error: problem };
    stateCode = gstin.slice(0, 2); // the state comes from the GSTIN itself
  }
  if (!isStateCode(stateCode)) return { error: "Choose the supplier's state." };

  const invoiceNo = str(b.invoiceNo, 50);
  if (!invoiceNo) return { error: "Enter the supplier's invoice number." };
  if (!isDate(b.invoiceDate)) return { error: "Invoice date is required." };

  const placeOfSupply = str(b.placeOfSupply, 2) || ownState;
  if (!isStateCode(placeOfSupply)) return { error: "Choose a valid place of supply." };

  if (!isMoney(b.billTotal)) return { error: "Enter the bill total as printed on the bill." };

  let lines;
  try {
    lines = typeof b.lines === "string" ? JSON.parse(b.lines || "[]") : b.lines;
  } catch {
    return { error: "The tax lines are not valid." };
  }
  if (!Array.isArray(lines) || !lines.length) return { error: "Add at least one tax line." };
  if (lines.length > 20) return { error: "A bill can have at most 20 tax lines." };

  const items = [];
  for (let i = 0; i < lines.length; i++) {
    const taxable = Number(lines[i].taxable);
    const gstRate = Number(lines[i].gstRate);
    if (!isMoney(lines[i].taxable)) return { error: `Line ${i + 1}: enter the taxable amount.` };
    if (!GST_RATES.includes(gstRate)) return { error: `Line ${i + 1}: choose a valid GST rate.` };
    items.push({ qty: 1, rate: taxable, gstRate }); // qty 1 x taxable amount, so the same GST maths applies
  }

  // Credit can only be claimed on a bill from a registered supplier
  const wantsItc = b.itcEligible === true || b.itcEligible === "1" || b.itcEligible === "true";

  return {
    v: {
      supplierName,
      gstin,
      stateCode,
      invoiceNo,
      invoiceDate: b.invoiceDate,
      placeOfSupply,
      description: str(b.description, 255),
      notes: str(b.notes, 255),
      billTotal: Number(b.billTotal),
      itcEligible: Boolean(gstin) && wantsItc,
      items,
      interstate: stateCode !== placeOfSupply,
    },
  };
}

// The same supplier bill must not be entered twice (it would claim the credit twice)
async function isDuplicate(v, excludeId = 0) {
  const [rows] = await db.query(
    `SELECT id FROM received_bills
     WHERE id <> ? AND LOWER(invoice_no) = LOWER(?)
       AND ${v.gstin ? "supplier_gstin = ?" : "supplier_gstin IS NULL AND LOWER(supplier_name) = LOWER(?)"}
     LIMIT 1`,
    [excludeId, v.invoiceNo, v.gstin || v.supplierName]
  );
  return rows.length > 0;
}

const toBill = (r, lines = []) => ({
  id: r.id,
  supplierName: r.supplier_name,
  supplierGstin: r.supplier_gstin || "",
  supplierStateCode: r.supplier_state_code,
  invoiceNo: r.invoice_no,
  invoiceDate: r.invoice_date,
  placeOfSupply: r.place_of_supply,
  description: r.description || "",
  notes: r.notes || "",
  interstate: Boolean(r.is_interstate),
  taxable: Number(r.taxable_total),
  cgst: Number(r.cgst_total),
  sgst: Number(r.sgst_total),
  igst: Number(r.igst_total),
  billTotal: Number(r.bill_total),
  itcEligible: Boolean(r.itc_eligible),
  filePath: r.file_name ? `${store.subdir}/${r.file_name}` : "",
  fileType: r.file_type || "",
  originalName: r.original_name || "",
  lines: lines.map((l) => ({ taxable: Number(l.taxable), gstRate: Number(l.gst_rate), cgst: Number(l.cgst), sgst: Number(l.sgst), igst: Number(l.igst) })),
});

async function getBill(id, conn = db) {
  const [rows] = await conn.query("SELECT * FROM received_bills WHERE id = ?", [id]);
  if (!rows.length) return null;
  const [lines] = await conn.query("SELECT * FROM received_bill_lines WHERE bill_id = ? ORDER BY sort_order", [id]);
  return toBill(rows[0], lines);
}

async function writeLines(conn, billId, groups) {
  const rows = groups.map((g, i) => [billId, i + 1, g.taxablePaise / 100, g.rate, g.cgstPaise / 100, g.sgstPaise / 100, g.igstPaise / 100]);
  await conn.query("INSERT INTO received_bill_lines (bill_id, sort_order, taxable, gst_rate, cgst, sgst, igst) VALUES ?", [rows]);
}

const ownStateCode = async () => {
  const [rows] = await db.query("SELECT state_code FROM company_settings WHERE id = 1");
  return rows[0]?.state_code || "27";
};

// GET /api/gst/received?month=YYYY-MM
router.get(
  "/received",
  wrap(async (req, res) => {
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month || "")) ? req.query.month : null;
    const [rows] = await db.query(
      `SELECT * FROM received_bills ${month ? "WHERE DATE_FORMAT(invoice_date, '%Y-%m') = ?" : ""} ORDER BY invoice_date DESC, id DESC`,
      month ? [month] : []
    );
    let lines = [];
    if (rows.length) {
      [lines] = await db.query("SELECT * FROM received_bill_lines WHERE bill_id IN (?) ORDER BY bill_id, sort_order", [rows.map((r) => r.id)]);
    }
    res.json(rows.map((r) => toBill(r, lines.filter((l) => l.bill_id === r.id))));
  })
);

// GET /api/gst/received/suppliers   (names you used before, so the form can fill in the GSTIN)
router.get(
  "/received/suppliers",
  wrap(async (req, res) => {
    const [rows] = await db.query("SELECT supplier_name, supplier_gstin, supplier_state_code FROM received_bills ORDER BY id DESC");
    const seen = new Map();
    rows.forEach((r) => {
      const key = r.supplier_name.toLowerCase();
      if (!seen.has(key)) seen.set(key, { name: r.supplier_name, gstin: r.supplier_gstin || "", stateCode: r.supplier_state_code });
    });
    res.json([...seen.values()].sort((a, b) => a.name.localeCompare(b.name)));
  })
);

// POST /api/gst/received   (multipart form: fields + lines as JSON text + optional file)
router.post(
  "/received",
  upload.single("file"),
  wrap(async (req, res) => {
    const { error, v } = check(req.body || {}, await ownStateCode());
    if (error) return res.status(400).json({ message: error });
    if (await isDuplicate(v)) return res.status(409).json({ message: "This supplier's invoice number is already recorded." });

    let saved = null;
    if (req.file) {
      saved = await store.save(req.file.buffer);
      if (!saved) return res.status(400).json({ message: BAD_FILE });
    }

    const calc = calcInvoice(v.items, v.interstate);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.query(
        `INSERT INTO received_bills
          (supplier_name, supplier_gstin, supplier_state_code, invoice_no, invoice_date, place_of_supply, description,
           is_interstate, taxable_total, cgst_total, sgst_total, igst_total, bill_total, itc_eligible, notes,
           file_name, original_name, file_type, created_by)
         VALUES (?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?, ?,?,?,?)`,
        [
          v.supplierName, v.gstin || null, v.stateCode, v.invoiceNo, v.invoiceDate, v.placeOfSupply, v.description || null,
          v.interstate ? 1 : 0, calc.taxablePaise / 100, calc.cgstPaise / 100, calc.sgstPaise / 100, calc.igstPaise / 100,
          v.billTotal, v.itcEligible ? 1 : 0, v.notes || null,
          saved?.fileName || null, saved ? str(req.file.originalname, 255) || null : null, saved?.fileType || null, req.user.id,
        ]
      );
      await writeLines(conn, ins.insertId, calc.groups);
      await conn.commit();
      res.status(201).json(await getBill(ins.insertId));
    } catch (err) {
      await conn.rollback();
      if (saved) await store.remove(saved.fileName);
      throw err;
    } finally {
      conn.release();
    }
  })
);

// PUT /api/gst/received/:id   (a new file is optional; without it the old one stays)
router.put(
  "/received/:id",
  upload.single("file"),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const [existing] = await db.query("SELECT * FROM received_bills WHERE id = ?", [id]);
    if (!existing.length) return res.status(404).json({ message: "Bill not found" });

    const { error, v } = check(req.body || {}, await ownStateCode());
    if (error) return res.status(400).json({ message: error });
    if (await isDuplicate(v, id)) return res.status(409).json({ message: "This supplier's invoice number is already recorded." });

    let saved = null;
    if (req.file) {
      saved = await store.save(req.file.buffer);
      if (!saved) return res.status(400).json({ message: BAD_FILE });
    }

    const old = existing[0];
    const calc = calcInvoice(v.items, v.interstate);
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `UPDATE received_bills SET supplier_name=?, supplier_gstin=?, supplier_state_code=?, invoice_no=?, invoice_date=?,
           place_of_supply=?, description=?, is_interstate=?, taxable_total=?, cgst_total=?, sgst_total=?, igst_total=?,
           bill_total=?, itc_eligible=?, notes=?, file_name=?, original_name=?, file_type=? WHERE id=?`,
        [
          v.supplierName, v.gstin || null, v.stateCode, v.invoiceNo, v.invoiceDate, v.placeOfSupply, v.description || null,
          v.interstate ? 1 : 0, calc.taxablePaise / 100, calc.cgstPaise / 100, calc.sgstPaise / 100, calc.igstPaise / 100,
          v.billTotal, v.itcEligible ? 1 : 0, v.notes || null,
          saved ? saved.fileName : old.file_name,
          saved ? str(req.file.originalname, 255) || null : old.original_name,
          saved ? saved.fileType : old.file_type,
          id,
        ]
      );
      await conn.query("DELETE FROM received_bill_lines WHERE bill_id = ?", [id]);
      await writeLines(conn, id, calc.groups);
      await conn.commit();
      if (saved) await store.remove(old.file_name);
      res.json(await getBill(id));
    } catch (err) {
      await conn.rollback();
      if (saved) await store.remove(saved.fileName);
      throw err;
    } finally {
      conn.release();
    }
  })
);

// DELETE /api/gst/received/:id
router.delete(
  "/received/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const [rows] = await db.query("SELECT file_name FROM received_bills WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Bill not found" });
    await db.query("DELETE FROM received_bills WHERE id = ?", [id]);
    await store.remove(rows[0].file_name);
    res.json({ message: "Bill deleted" });
  })
);

// GET /api/gst/summary?month=YYYY-MM  -> GST charged on sales vs GST paid on received bills
router.get(
  "/summary",
  wrap(async (req, res) => {
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month || "")) ? req.query.month : new Date().toISOString().slice(0, 7);

    const [[s]] = await db.query(
      `SELECT COUNT(*) AS n, COALESCE(SUM(taxable_total),0) AS taxable, COALESCE(SUM(cgst_total),0) AS cgst,
              COALESCE(SUM(sgst_total),0) AS sgst, COALESCE(SUM(igst_total),0) AS igst
       FROM invoices WHERE status = 'issued' AND DATE_FORMAT(invoice_date, '%Y-%m') = ?`,
      [month]
    );
    const [[p]] = await db.query(
      `SELECT COUNT(*) AS n, COALESCE(SUM(taxable_total),0) AS taxable, COALESCE(SUM(cgst_total),0) AS cgst,
              COALESCE(SUM(sgst_total),0) AS sgst, COALESCE(SUM(igst_total),0) AS igst,
              COALESCE(SUM(CASE WHEN itc_eligible = 1 THEN cgst_total ELSE 0 END),0) AS itc_cgst,
              COALESCE(SUM(CASE WHEN itc_eligible = 1 THEN sgst_total ELSE 0 END),0) AS itc_sgst,
              COALESCE(SUM(CASE WHEN itc_eligible = 1 THEN igst_total ELSE 0 END),0) AS itc_igst,
              COALESCE(SUM(itc_eligible = 0),0) AS no_itc
       FROM received_bills WHERE DATE_FORMAT(invoice_date, '%Y-%m') = ?`,
      [month]
    );

    const n = Number;
    res.json({
      month,
      sales: { count: n(s.n), taxable: n(s.taxable), cgst: n(s.cgst), sgst: n(s.sgst), igst: n(s.igst) },
      purchases: {
        count: n(p.n), taxable: n(p.taxable), cgst: n(p.cgst), sgst: n(p.sgst), igst: n(p.igst),
        itcCgst: n(p.itc_cgst), itcSgst: n(p.itc_sgst), itcIgst: n(p.itc_igst), noItcCount: n(p.no_itc),
      },
    });
  })
);

module.exports = router;