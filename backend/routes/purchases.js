const express = require("express");
const db = require("../config/db");
const wrap = require("../utils/asyncHandler");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// Money records are admin-only.
router.use(requireRole("admin"));

const MAX_AMOUNT = 9999999999;
const MODES = ["cash", "upi", "bank", "cheque", "other"];

const round2 = (n) => Math.round(n * 100) / 100;
const toPaise = (n) => Math.round(Number(n) * 100); // compare money as whole paise, never as floats
const isMoney = (v) => {
  if (v === "" || v === null || v === undefined) return false;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT && Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
};
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
const rupees = (n) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Paid is always CALCULATED from the payments, never stored, so it can't go out of sync.
const PURCHASE_SELECT = `
  SELECT p.*, COALESCE(SUM(pp.amount), 0) AS paid
  FROM purchases p
  LEFT JOIN purchase_payments pp ON pp.purchase_id = p.id`;

const toPurchase = (r) => {
  const total = Number(r.total_amount);
  const paid = Number(r.paid);
  return {
    id: r.id,
    shop: r.shop_name,
    billNo: r.bill_no || "",
    date: r.purchase_date,
    material: r.material,
    notes: r.notes || "",
    total,
    paid,
    pending: round2(total - paid),
  };
};

const getPurchaseById = async (id) => {
  const [rows] = await db.query(`${PURCHASE_SELECT} WHERE p.id = ? GROUP BY p.id`, [id]);
  if (!rows.length) return null;
  const [pays] = await db.query(
    "SELECT id, amount, paid_date, mode, note FROM purchase_payments WHERE purchase_id = ? ORDER BY paid_date, id",
    [id]
  );
  return {
    ...toPurchase(rows[0]),
    payments: pays.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      date: p.paid_date,
      mode: p.mode,
      note: p.note || "",
    })),
  };
};

// Checks the bill fields; returns an error message or null.
const checkBill = (b) => {
  if (!String(b.shop || "").trim()) return "Shop name is required.";
  if (String(b.shop).trim().length > 150) return "Shop name is too long.";
  if (!String(b.material || "").trim()) return "Enter what was purchased.";
  if (!isDate(b.date)) return "Purchase date is required.";
  if (!isMoney(b.total)) return "Enter a total amount greater than 0 (max 2 decimals).";
  return null;
};

// GET /api/purchases?month=YYYY-MM   (no month = all bills)
router.get(
  "/",
  wrap(async (req, res) => {
    const month = /^\d{4}-\d{2}$/.test(String(req.query.month || "")) ? req.query.month : null;
    const sql = `${PURCHASE_SELECT}
      ${month ? "WHERE DATE_FORMAT(p.purchase_date, '%Y-%m') = ?" : ""}
      GROUP BY p.id
      ORDER BY p.purchase_date DESC, p.id DESC`;
    const [rows] = await db.query(sql, month ? [month] : []);
    res.json(rows.map(toPurchase));
  })
);

// GET /api/purchases/shop-names  (for the suggestion list)
router.get(
  "/shop-names",
  wrap(async (req, res) => {
    const [rows] = await db.query("SELECT DISTINCT shop_name FROM purchases ORDER BY shop_name");
    res.json(rows.map((r) => r.shop_name));
  })
);

// GET /api/purchases/:id  (bill + payment history)
router.get(
  "/:id",
  wrap(async (req, res) => {
    const p = await getPurchaseById(Number(req.params.id));
    if (!p) return res.status(404).json({ message: "Purchase not found" });
    res.json(p);
  })
);

// POST /api/purchases
router.post(
  "/",
  wrap(async (req, res) => {
    const b = req.body || {};
    const problem = checkBill(b);
    if (problem) return res.status(400).json({ message: problem });

    const [result] = await db.query(
      "INSERT INTO purchases (shop_name, bill_no, purchase_date, material, total_amount, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [
        String(b.shop).trim(),
        b.billNo ? String(b.billNo).trim().slice(0, 50) : null,
        b.date,
        String(b.material).trim(),
        round2(Number(b.total)),
        b.notes ? String(b.notes).trim().slice(0, 255) : null,
      ]
    );
    res.status(201).json(await getPurchaseById(result.insertId));
  })
);

// PUT /api/purchases/:id
router.put(
  "/:id",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await getPurchaseById(id);
    if (!existing) return res.status(404).json({ message: "Purchase not found" });

    const b = req.body || {};
    const problem = checkBill(b);
    if (problem) return res.status(400).json({ message: problem });
    if (toPaise(b.total) < toPaise(existing.paid)) {
      return res.status(400).json({ message: `Total cannot be less than the ${rupees(existing.paid)} already paid.` });
    }

    await db.query(
      "UPDATE purchases SET shop_name=?, bill_no=?, purchase_date=?, material=?, total_amount=?, notes=? WHERE id=?",
      [
        String(b.shop).trim(),
        b.billNo ? String(b.billNo).trim().slice(0, 50) : null,
        b.date,
        String(b.material).trim(),
        round2(Number(b.total)),
        b.notes ? String(b.notes).trim().slice(0, 255) : null,
        id,
      ]
    );
    res.json(await getPurchaseById(id));
  })
);

// DELETE /api/purchases/:id  (its payments are deleted too)
router.delete(
  "/:id",
  wrap(async (req, res) => {
    const [result] = await db.query("DELETE FROM purchases WHERE id = ?", [Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ message: "Purchase not found" });
    res.json({ message: "Purchase deleted" });
  })
);

// Checks the payment fields; returns an error message or null.
const checkPayment = (b, available) => {
  if (!isMoney(b.amount)) return "Enter an amount greater than 0 (max 2 decimals).";
  if (toPaise(b.amount) > toPaise(available)) return `Only ${rupees(available)} can be paid on this bill.`;
  if (!isDate(b.date)) return "Payment date is required.";
  if (b.mode && !MODES.includes(b.mode)) return "Choose a valid payment mode.";
  return null;
};

// POST /api/purchases/:id/payments
router.post(
  "/:id/payments",
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const p = await getPurchaseById(id);
    if (!p) return res.status(404).json({ message: "Purchase not found" });

    const b = req.body || {};
    const problem = checkPayment(b, p.pending);
    if (problem) return res.status(400).json({ message: problem });

    await db.query("INSERT INTO purchase_payments (purchase_id, amount, paid_date, mode, note) VALUES (?, ?, ?, ?, ?)", [
      id,
      round2(Number(b.amount)),
      b.date,
      b.mode || "cash",
      b.note ? String(b.note).trim().slice(0, 255) : null,
    ]);
    res.status(201).json(await getPurchaseById(id));
  })
);

// PUT /api/purchases/payments/:paymentId  (fix a wrong payment)
router.put(
  "/payments/:paymentId",
  wrap(async (req, res) => {
    const paymentId = Number(req.params.paymentId);
    const [rows] = await db.query("SELECT * FROM purchase_payments WHERE id = ?", [paymentId]);
    if (!rows.length) return res.status(404).json({ message: "Payment not found" });

    const old = rows[0];
    const p = await getPurchaseById(old.purchase_id);
    const b = req.body || {};
    const problem = checkPayment(b, round2(p.pending + Number(old.amount))); // the old amount is freed up
    if (problem) return res.status(400).json({ message: problem });

    await db.query("UPDATE purchase_payments SET amount=?, paid_date=?, mode=?, note=? WHERE id=?", [
      round2(Number(b.amount)),
      b.date,
      b.mode || "cash",
      b.note ? String(b.note).trim().slice(0, 255) : null,
      paymentId,
    ]);
    res.json(await getPurchaseById(old.purchase_id));
  })
);

// DELETE /api/purchases/payments/:paymentId
router.delete(
  "/payments/:paymentId",
  wrap(async (req, res) => {
    const paymentId = Number(req.params.paymentId);
    const [rows] = await db.query("SELECT purchase_id FROM purchase_payments WHERE id = ?", [paymentId]);
    if (!rows.length) return res.status(404).json({ message: "Payment not found" });

    await db.query("DELETE FROM purchase_payments WHERE id = ?", [paymentId]);
    res.json(await getPurchaseById(rows[0].purchase_id));
  })
);

module.exports = router;