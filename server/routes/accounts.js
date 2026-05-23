const express = require("express");
const router = express.Router();
const db = require("../models/database");

router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM accounts ORDER BY country, type, name")
    .all();
  res.json(rows);
});

router.post("/", (req, res) => {
  const { name, type, balance, currency, country } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: "name and type are required" });
  }

  const result = db
    .prepare(
      `INSERT INTO accounts (name, type, balance, currency, country)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(name, type, balance || 0, currency || "USD", country || "USA");

  res.status(201).json({ id: result.lastInsertRowid });
});

router.put("/:id", (req, res) => {
  const { name, type, balance, currency, country } = req.body;
  const result = db
    .prepare(
      `UPDATE accounts SET name = COALESCE(?, name), type = COALESCE(?, type),
       balance = COALESCE(?, balance), currency = COALESCE(?, currency),
       country = COALESCE(?, country), updated_at = datetime('now')
       WHERE id = ?`
    )
    .run(name, type, balance, currency, country, req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: "Account not found" });
  }
  res.json({ updated: true });
});

router.delete("/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM accounts WHERE id = ?")
    .run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Account not found" });
  }
  res.json({ deleted: true });
});

module.exports = router;
