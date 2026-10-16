const express = require("express");
const db = require("../config/db");
const wrap = require("../utils/asyncHandler");
const { requireRole } = require("../middleware/auth");
const { GST_RATES, isStateCode, validateGstin, financialYear, calcInvoice } = require("../utils/gst");

const router = express.Router();

// GST billing is admin-only.
router.use(requireRole("admin"));

const str = (v, max) => String(v ?? "").trim().slice(0, max);
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) && !Number.isNaN(Date.parse(v));
const money = (v) => Number(v);
const invoiceNo = (r) => `${r.seq}/${r.fy}`;

// A GSTIN is optional (unregistered customers), but if given it must be valid and match the state.
function checkGstin(gstin, stateCode) {
  if (!gstin) return null;
  const problem = validateGstin(gstin);
  if (problem) return problem;
  if (gstin.slice(0, 2) !== stateCode) return "The GSTIN does not belong to the state you selected.";
  return null;
}

/* ------------------------------ Business settings ------------------------------ */

const toSettings = (r) => ({
  name: r.name,
  address: r.address,
  stateCode: r.state_code,
  gstin: r.gstin,
  phone: r.phone || "",
  email: r.email || "",
  bankDetails: r.bank_details || "",
  terms: r.terms || "",
  defaultGstRate: Number(r.default_gst_rate),
  invoiceStartNo: r.invoice_start_no,
});

const getSettings = async (conn = db) => {
  const [rows] = await conn.query("SELECT * FROM company_settings WHERE id = 1");
  return rows[0] ? toSettings(rows[0]) : null;
};

router.get(
  "/settings",
  wrap(async (req, res) => {
    const s = await getSettings();
    if (!s) return res.status(404).json({ message: "Business details are not set up yet. Run gst.sql." });
    res.json(s);
  })
);

router.put(
  "/settings",
  wrap(async (req, res) => {
    const b = req.body || {};
    const name = str(b.name, 150);
    const address = str(b.address, 300);
    const stateCode = str(b.stateCode, 2);
    const gstin = str(b.gstin, 15).toUpperCase();
    const defaultGstRate = Number(b.defaultGstRate);
    const startNo = Number(b.invoiceStartNo);

    if (!name || !address) return res.status(400).json({ message: "Business name and address are required." });
    if (!isStateCode(stateCode)) return res.status(400).json({ message: "Choose a state." });
    const problem = validateGstin(gstin) || (gstin.slice(0, 2) !== stateCode ? "The GSTIN does not belong to the state you selected." : null);
    if (problem) return res.status(400).json({ message: problem });
    if (!GST_RATES.includes(defaultGstRate)) return res.status(400).json({ message: "Choose a valid default GST rate." });
    if (!Number.isInteger(startNo) || startNo < 1 || startNo > 99999999) {
      return res.status(400).json({ message: "Starting invoice number must be a whole number, 1 or more." });
    }

    await db.query(
      `UPDATE company_settings SET name=?, address=?, state_code=?, gstin=?, phone=?, email=?,
         bank_details=?, terms=?, default_gst_rate=?, invoice_start_no=? WHERE id=1`,
      [name, address, stateCode, gstin, str(b.phone, 50) || null, str(b.email, 100) || null,
       str(b.bankDetails, 500) || null, str(b.terms, 1000) || null, defaultGstRate, startNo]
    );
    res.json(await getSettings());
  })
);

/* ------------------------------ Customers ------------------------------ */

const toCustomer = (r) => ({
  id: r.id,
  name: r.name,
  address: r.address,
  stateCode: r.state_code,
  gstin: r.gstin || "",
  phone: r.phone || "",
});

function checkCustomer(b) {
  const name = str(b.name, 150);
  const address = str(b.address, 300);
  const stateCode = str(b.stateCode, 2);
  const gstin = str(b.gstin, 15).toUpperCase();
  if (!name) return { error: "Customer name is required." };
  if (!address) return { error: "Customer address is required." };
  if (!isStateCode(stateCode)) return { error: "Choose the customer's state." };
  const problem = checkGstin(gstin, stateCode);
  if (problem) return { error: problem };
  return { values: [name, address, stateCode, gstin || null, str(b.phone, 50) || null] };
}

router.get(
  "/customers",
  wrap(async (req, res) => {
    const [rows] = await db.query("SELECT * FROM customers WHERE is_active = 1 ORDER BY name");
    res.json(rows.map(toCustomer));
  })
);

router.post(
  "/customers",
  wrap(async (req, res) => {
    const { error, values } = checkCustomer(req.body || {});
    if (error) return res.status(400).json({ message: error });
    const [r] = await db.query("INSERT INTO customers (name, address, state_code, gstin, phone) VALUES (?, ?, ?, ?, ?)", values);
    const [rows] = await db.query("SELECT * FROM customers WHERE id = ?", [r.insertId]);
    res.status(201).json(toCustomer(rows[0]));
  })
);

router.put(
  "/customers/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const { error, values } = checkCustomer(req.body || {});
    if (error) return res.status(400).json({ message: error });
    const [r] = await db.query("UPDATE customers SET name=?, address=?, state_code=?, gstin=?, phone=? WHERE id=? AND is_active=1", [...values, id]);
    if (!r.affectedRows) return res.status(404).json({ message: "Customer not found" });
    const [rows] = await db.query("SELECT * FROM customers WHERE id = ?", [id]);
    res.json(toCustomer(rows[0]));
  })
);

// "Delete" only hides the customer from the list; old invoices keep their own copy of the details.
router.delete(
  "/customers/:id",
  wrap(async (req, res) => {
    const [r] = await db.query("UPDATE customers SET is_active = 0 WHERE id = ?", [Number(req.params.id)]);
    if (!r.affectedRows) return res.status(404).json({ message: "Customer not found" });
    res.json({ message: "Customer removed" });
  })
);

/* ------------------------------ Invoices ------------------------------ */

const toSummary = (r) => {
  const cancelled = r.status === "cancelled";
  return {
    id: r.id,
    invoiceNo: invoiceNo(r),
    date: r.invoice_date,
    billName: r.bill_name,
    billGstin: r.bill_gstin || "",
    placeOfSupply: r.place_of_supply,
    taxable: money(r.taxable_total),
    cgst: money(r.cgst_total),
    sgst: money(r.sgst_total),
    igst: money(r.igst_total),
    roundOff: money(r.round_off),
    grand: money(r.grand_total),
    status: r.status,
    cancelReason: cancelled ? r.cancel_reason || "" : "",
  };
};

async function getInvoice(id, conn = db) {
  const [rows] = await conn.query("SELECT * FROM invoices WHERE id = ?", [id]);
  if (!rows.length) return null;
  const r = rows[0];
  const [items] = await conn.query("SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order", [id]);
  return {
    ...toSummary(r),
    fy: r.fy,
    interstate: Boolean(r.is_interstate),
    reverseCharge: r.reverse_charge,
    bill: { name: r.bill_name, address: r.bill_address, gstin: r.bill_gstin || "", stateCode: r.bill_state_code },
    ship: { name: r.ship_name, address: r.ship_address, gstin: r.ship_gstin || "", stateCode: r.ship_state_code },
    transport: r.transport || "",
    vehicleNo: r.vehicle_no || "",
    grRrNo: r.gr_rr_no || "",
    station: r.station || "",
    groups: JSON.parse(r.groups_json),
    seller: JSON.parse(r.seller_json),
    cancelledAt: r.cancelled_at,
    items: items.map((i) => ({
      description: i.description,
      hsn: i.hsn_sac || "",
      qty: Number(i.qty),
      unit: i.unit,
      rate: money(i.rate),
      gstRate: Number(i.gst_rate),
      amount: money(i.amount),
    })),
  };
}

// The number the next invoice will get (only a preview; the real number is given when saving)
async function nextSeq(conn, fy, startNo, lock = false) {
  const [[row]] = await conn.query(`SELECT MAX(seq) AS m FROM invoices WHERE fy = ?${lock ? " FOR UPDATE" : ""}`, [fy]);
  return row.m ? row.m + 1 : startNo;
}

router.get(
  "/invoices/next-number",
  wrap(async (req, res) => {
    const date = isDate(req.query.date) ? req.query.date : new Date().toISOString().slice(0, 10);
    const settings = await getSettings();
    const fy = financialYear(date);
    res.json({ invoiceNo: `${await nextSeq(db, fy, settings?.invoiceStartNo || 1)}/${fy}` });
  })
);

// GET /api/gst/invoices?month=YYYY-MM&status=issued|cancelled&search=
router.get(
  "/invoices",
  wrap(async (req, res) => {
    const where = [];
    const params = [];
    if (/^\d{4}-\d{2}$/.test(String(req.query.month || ""))) {
      where.push("DATE_FORMAT(invoice_date, '%Y-%m') = ?");
      params.push(req.query.month);
    }
    if (["issued", "cancelled"].includes(req.query.status)) {
      where.push("status = ?");
      params.push(req.query.status);
    }
    if (req.query.search) {
      where.push("(bill_name LIKE ? OR bill_gstin LIKE ? OR CONCAT(seq, '/', fy) LIKE ?)");
      const like = `%${String(req.query.search).slice(0, 50)}%`;
      params.push(like, like, like);
    }
    const [rows] = await db.query(
      `SELECT * FROM invoices ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY invoice_date DESC, id DESC`,
      params
    );
    res.json(rows.map(toSummary));
  })
);

router.get(
  "/invoices/:id",
  wrap(async (req, res) => {
    const inv = await getInvoice(Number(req.params.id));
    if (!inv) return res.status(404).json({ message: "Invoice not found" });
    res.json(inv);
  })
);

// POST /api/gst/invoices
router.post(
  "/invoices",
  wrap(async (req, res) => {
    const b = req.body || {};
    const settings = await getSettings();
    if (!settings || !settings.gstin || !settings.name) {
      return res.status(400).json({ message: "Fill in your business details first (GST Billing > Invoice settings)." });
    }

    if (!isDate(b.date)) return res.status(400).json({ message: "Invoice date is required." });

    const [custRows] = await db.query("SELECT * FROM customers WHERE id = ? AND is_active = 1", [Number(b.customerId)]);
    if (!custRows.length) return res.status(400).json({ message: "Choose a customer." });
    const cust = custRows[0];

    // Ship-to: same as bill-to unless a different one is given
    let ship = { name: cust.name, address: cust.address, gstin: cust.gstin || "", stateCode: cust.state_code };
    if (b.ship && b.ship.different) {
      ship = {
        name: str(b.ship.name, 150),
        address: str(b.ship.address, 300),
        gstin: str(b.ship.gstin, 15).toUpperCase(),
        stateCode: str(b.ship.stateCode, 2),
      };
      if (!ship.name || !ship.address) return res.status(400).json({ message: "Enter the ship-to name and address." });
      if (!isStateCode(ship.stateCode)) return res.status(400).json({ message: "Choose the ship-to state." });
      const gp = checkGstin(ship.gstin, ship.stateCode);
      if (gp) return res.status(400).json({ message: `Ship-to: ${gp}` });
    }

    const placeOfSupply = str(b.placeOfSupply, 2) || cust.state_code;
    if (!isStateCode(placeOfSupply)) return res.status(400).json({ message: "Choose a valid place of supply." });
    const reverseCharge = b.reverseCharge === "Y" ? "Y" : "N";

    // Items
    const rawItems = Array.isArray(b.items) ? b.items : [];
    if (!rawItems.length) return res.status(400).json({ message: "Add at least one item." });
    if (rawItems.length > 30) return res.status(400).json({ message: "An invoice can have at most 30 items." });

    const items = [];
    for (let i = 0; i < rawItems.length; i++) {
      const it = rawItems[i];
      const n = i + 1;
      const description = str(it.description, 255);
      const hsn = str(it.hsn, 8);
      const unit = str(it.unit, 20) || "Pcs";
      const qty = Number(it.qty);
      const rate = Number(it.rate);
      const gstRate = Number(it.gstRate);
      if (!description) return res.status(400).json({ message: `Item ${n}: enter a description.` });
      if (hsn && !/^\d{4,8}$/.test(hsn)) return res.status(400).json({ message: `Item ${n}: HSN/SAC must be 4 to 8 digits.` });
      if (!Number.isFinite(qty) || qty <= 0 || qty > 9999999 || Math.abs(qty * 1000 - Math.round(qty * 1000)) > 1e-6) {
        return res.status(400).json({ message: `Item ${n}: quantity must be more than 0 (up to 3 decimals).` });
      }
      if (!Number.isFinite(rate) || rate <= 0 || rate > 99999999 || Math.abs(rate * 100 - Math.round(rate * 100)) > 1e-6) {
        return res.status(400).json({ message: `Item ${n}: rate must be more than 0 (up to 2 decimals).` });
      }
      if (!GST_RATES.includes(gstRate)) return res.status(400).json({ message: `Item ${n}: choose a valid GST rate.` });
      items.push({ description, hsn, unit, qty, rate, gstRate });
    }

    // The server does the maths; numbers sent by the browser are ignored.
    const interstate = placeOfSupply !== settings.stateCode;
    const calc = calcInvoice(items, interstate);
    if (calc.grandPaise > 99999999999) return res.status(400).json({ message: "Invoice total is too large." });

    const fy = financialYear(b.date);
    const sellerSnapshot = JSON.stringify({
      name: settings.name,
      address: settings.address,
      stateCode: settings.stateCode,
      gstin: settings.gstin,
      phone: settings.phone,
      email: settings.email,
      bankDetails: settings.bankDetails,
      terms: settings.terms,
    });
    const groupsJson = JSON.stringify(
      calc.groups.map((g) => ({
        rate: g.rate,
        taxable: g.taxablePaise / 100,
        cgst: g.cgstPaise / 100,
        sgst: g.sgstPaise / 100,
        igst: g.igstPaise / 100,
      }))
    );

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const seq = await nextSeq(conn, fy, settings.invoiceStartNo, true);
      const [ins] = await conn.query(
        `INSERT INTO invoices
          (fy, seq, invoice_date, customer_id, bill_name, bill_address, bill_gstin, bill_state_code,
           ship_name, ship_address, ship_gstin, ship_state_code, place_of_supply, reverse_charge,
           transport, vehicle_no, gr_rr_no, station, is_interstate,
           taxable_total, cgst_total, sgst_total, igst_total, round_off, grand_total,
           groups_json, seller_json, created_by)
         VALUES (?,?,?,?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?,?, ?,?,?,?,?,?, ?,?,?)`,
        [
          fy, seq, b.date, cust.id, cust.name, cust.address, cust.gstin || null, cust.state_code,
          ship.name, ship.address, ship.gstin || null, ship.stateCode, placeOfSupply, reverseCharge,
          str(b.transport, 100) || null, str(b.vehicleNo, 30) || null, str(b.grRrNo, 50) || null, str(b.station, 100) || null,
          interstate ? 1 : 0,
          calc.taxablePaise / 100, calc.cgstPaise / 100, calc.sgstPaise / 100, calc.igstPaise / 100,
          calc.roundOffPaise / 100, calc.grandPaise / 100,
          groupsJson, sellerSnapshot, req.user.id,
        ]
      );
      const rows = items.map((it, i) => [ins.insertId, i + 1, it.description, it.hsn || null, it.qty, it.unit, it.rate, it.gstRate, calc.lines[i].amountPaise / 100]);
      await conn.query("INSERT INTO invoice_items (invoice_id, sort_order, description, hsn_sac, qty, unit, rate, gst_rate, amount) VALUES ?", [rows]);
      await conn.commit();
      res.status(201).json(await getInvoice(ins.insertId));
    } catch (err) {
      await conn.rollback();
      if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Another invoice was saved at the same moment. Please try again." });
      throw err;
    } finally {
      conn.release();
    }
  })
);

// POST /api/gst/invoices/:id/cancel   { reason }
router.post(
  "/invoices/:id/cancel",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const reason = str(req.body?.reason, 255);
    if (reason.length < 3) return res.status(400).json({ message: "Enter a reason for cancelling." });

    const [rows] = await db.query("SELECT status FROM invoices WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ message: "Invoice not found" });
    if (rows[0].status === "cancelled") return res.status(400).json({ message: "This invoice is already cancelled." });

    await db.query("UPDATE invoices SET status='cancelled', cancel_reason=?, cancelled_at=NOW() WHERE id=?", [reason, id]);
    res.json(await getInvoice(id));
  })
);

module.exports = router;