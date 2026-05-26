const express = require("express");
const router = express.Router();
const db = require("../models/database");

router.get("/", (req, res) => {
  const { type, category, currency, from, to, vendor, limit = 500 } = req.query;
  let sql = "SELECT * FROM transactions WHERE 1=1";
  const params = [];

  if (type) {
    sql += " AND type = ?";
    params.push(type);
  }
  if (category) {
    sql += " AND category LIKE ?";
    params.push(`%${category}%`);
  }
  if (currency) {
    sql += " AND currency = ?";
    params.push(currency);
  }
  if (vendor) {
    sql += " AND vendor LIKE ?";
    params.push(`%${vendor}%`);
  }
  if (from) {
    sql += " AND date >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND date <= ?";
    params.push(to);
  }

  sql += " ORDER BY date DESC LIMIT ?";
  params.push(Number(limit));

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

router.get("/categories", (req, res) => {
  const categories = db
    .prepare("SELECT DISTINCT category FROM transactions ORDER BY category")
    .all()
    .map((r) => r.category);
  res.json(categories);
});

router.get("/vendors", (req, res) => {
  const vendors = db
    .prepare("SELECT DISTINCT vendor FROM transactions WHERE vendor IS NOT NULL AND vendor != '' ORDER BY vendor")
    .all()
    .map((r) => r.vendor);
  res.json(vendors);
});

router.post("/", (req, res) => {
  const { date, description, amount, currency, category, type, source, vendor } =
    req.body;

  if (!date || !amount || !category || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const result = db
    .prepare(
      `INSERT INTO transactions (date, description, amount, currency, category, type, source, vendor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      date,
      description || "",
      amount,
      currency || "USD",
      category,
      type,
      source || "manual",
      vendor || null
    );

  res.status(201).json({ id: result.lastInsertRowid });
});

router.put("/:id", (req, res) => {
  const { description, amount, currency, category, type, vendor, date } = req.body;
  const existing = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  const result = db
    .prepare(
      `UPDATE transactions
       SET description = ?, amount = ?, currency = ?, category = ?, type = ?, vendor = ?, date = ?
       WHERE id = ?`
    )
    .run(
      description !== undefined ? description : existing.description,
      amount !== undefined ? amount : existing.amount,
      currency !== undefined ? currency : existing.currency,
      category !== undefined ? category : existing.category,
      type !== undefined ? type : existing.type,
      vendor !== undefined ? vendor : existing.vendor,
      date !== undefined ? date : existing.date,
      req.params.id
    );

  if (result.changes === 0) {
    return res.status(404).json({ error: "Transaction not found" });
  }
  res.json({ updated: true });
});

router.put("/:id/apply-vendor-rule", (req, res) => {
  const { applyToAll } = req.body;
  const txn = db.prepare("SELECT * FROM transactions WHERE id = ?").get(req.params.id);
  if (!txn) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  if (applyToAll && txn.vendor) {
    // Create or update vendor rule
    db.prepare(
      `INSERT INTO vendor_rules (vendor_pattern, vendor_name, category, type)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(vendor_pattern) DO UPDATE SET category = excluded.category, type = excluded.type`
    ).run(txn.vendor.toLowerCase(), txn.vendor, txn.category, txn.type);

    // Apply to all matching transactions
    const updated = db
      .prepare(
        "UPDATE transactions SET category = ?, type = ? WHERE vendor = ? AND id != ?"
      )
      .run(txn.category, txn.type, txn.vendor, txn.id);

    return res.json({ updated: true, matchesUpdated: updated.changes });
  }

  res.json({ updated: true, matchesUpdated: 0 });
});

router.post("/bulk", (req, res) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: "transactions must be an array" });
  }

  const insert = db.prepare(
    `INSERT INTO transactions (date, description, amount, currency, category, type, source, vendor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertMany = db.transaction((txns) => {
    let count = 0;
    for (const t of txns) {
      insert.run(
        t.date,
        t.description || "",
        t.amount,
        t.currency || "USD",
        t.category,
        t.type,
        t.source || "bulk",
        t.vendor || null
      );
      count++;
    }
    return count;
  });

  const count = insertMany(transactions);
  res.status(201).json({ imported: count });
});

router.delete("/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM transactions WHERE id = ?")
    .run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Transaction not found" });
  }
  res.json({ deleted: true });
});

module.exports = router;
