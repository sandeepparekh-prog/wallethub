const express = require("express");
const router = express.Router();
const db = require("../models/database");
const { setExchangeRate } = require("../utils/currency");

router.get("/", (req, res) => {
  const rows = db
    .prepare(
      "SELECT * FROM exchange_rates ORDER BY date DESC, from_currency"
    )
    .all();
  res.json(rows);
});

router.put("/", (req, res) => {
  const { from_currency, to_currency, rate } = req.body;

  if (!from_currency || !to_currency || !rate) {
    return res
      .status(400)
      .json({ error: "from_currency, to_currency, and rate are required" });
  }

  setExchangeRate(from_currency, to_currency, rate);
  setExchangeRate(to_currency, from_currency, 1 / rate);

  res.json({ updated: true });
});

module.exports = router;
