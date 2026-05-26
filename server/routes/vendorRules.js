const express = require("express");
const router = express.Router();
const db = require("../models/database");

router.get("/", (req, res) => {
  const rules = db
    .prepare("SELECT * FROM vendor_rules ORDER BY vendor_name")
    .all();
  res.json(rules);
});

router.post("/", (req, res) => {
  const { vendor_pattern, vendor_name, category, type } = req.body;
  if (!vendor_pattern || !vendor_name || !category || !type) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO vendor_rules (vendor_pattern, vendor_name, category, type)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(vendor_pattern) DO UPDATE SET vendor_name = excluded.vendor_name, category = excluded.category, type = excluded.type`
      )
      .run(vendor_pattern.toLowerCase(), vendor_name, category, type);

    // Also update existing transactions matching this vendor
    db.prepare(
      "UPDATE transactions SET category = ?, type = ?, vendor = ? WHERE LOWER(description) LIKE ? OR LOWER(vendor) LIKE ?"
    ).run(category, type, vendor_name, `%${vendor_pattern.toLowerCase()}%`, `%${vendor_pattern.toLowerCase()}%`);

    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/:id", (req, res) => {
  const { vendor_pattern, vendor_name, category, type } = req.body;
  const result = db
    .prepare(
      `UPDATE vendor_rules SET vendor_pattern = ?, vendor_name = ?, category = ?, type = ?
       WHERE id = ?`
    )
    .run(
      vendor_pattern ? vendor_pattern.toLowerCase() : undefined,
      vendor_name,
      category,
      type,
      req.params.id
    );

  if (result.changes === 0) {
    return res.status(404).json({ error: "Rule not found" });
  }
  res.json({ updated: true });
});

router.delete("/:id", (req, res) => {
  const result = db
    .prepare("DELETE FROM vendor_rules WHERE id = ?")
    .run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Rule not found" });
  }
  res.json({ deleted: true });
});

module.exports = router;
