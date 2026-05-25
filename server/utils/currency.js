const db = require("../models/database");

function getExchangeRate(from, to) {
  if (from === to) return 1;
  const row = db
    .prepare(
      "SELECT rate FROM exchange_rates WHERE from_currency = ? AND to_currency = ? ORDER BY date DESC LIMIT 1"
    )
    .get(from, to);
  return row ? row.rate : null;
}

function convertCurrency(amount, from, to) {
  const rate = getExchangeRate(from, to);
  if (rate === null) {
    throw new Error(`No exchange rate found for ${from} -> ${to}`);
  }
  return amount * rate;
}

function setExchangeRate(from, to, rate) {
  db.prepare(
    `INSERT OR REPLACE INTO exchange_rates (from_currency, to_currency, rate, date)
     VALUES (?, ?, ?, date('now'))`
  ).run(from, to, rate);
}

module.exports = { getExchangeRate, convertCurrency, setExchangeRate };
