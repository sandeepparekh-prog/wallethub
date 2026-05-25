const express = require("express");
const router = express.Router();
const db = require("../models/database");

router.get("/", (req, res) => {
  const { type, category, currency, from, to, limit = 500 } = req.query;
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

router.post("/", (req, res) => {
  const { date, description, amount, currency, category, type, source } =
    req.body;

  if (!date || !amount || !category || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const result = db
    .prepare(
      `INSERT INTO transactions (date, description, amount, currency, category, type, source)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      date,
      description || "",
      amount,
      currency || "USD",
      category,
      type,
      source || "manual"
    );

  res.status(201).json({ id: result.lastInsertRowid });
});

router.post("/bulk", (req, res) => {
  const { transactions } = req.body;
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: "transactions must be an array" });
  }

  const insert = db.prepare(
    `INSERT INTO transactions (date, description, amount, currency, category, type, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
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
        t.source || "bulk"
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
