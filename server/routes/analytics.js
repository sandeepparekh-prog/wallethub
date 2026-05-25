const express = require("express");
const router = express.Router();
const db = require("../models/database");
const { convertCurrency } = require("../utils/currency");

router.get("/summary", (req, res) => {
  const { display_currency = "USD" } = req.query;

  const income = db
    .prepare(
      "SELECT currency, SUM(amount) as total FROM transactions WHERE type = 'income' GROUP BY currency"
    )
    .all();
  const expenses = db
    .prepare(
      "SELECT currency, SUM(amount) as total FROM transactions WHERE type = 'expense' GROUP BY currency"
    )
    .all();
  const investments = db
    .prepare(
      "SELECT currency, SUM(amount) as total FROM transactions WHERE type = 'investment' GROUP BY currency"
    )
    .all();
  const accounts = db.prepare("SELECT * FROM accounts").all();

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalInvestments = 0;
  let totalAccountBalance = 0;

  for (const row of income) {
    totalIncome += convertCurrency(row.total, row.currency, display_currency);
  }
  for (const row of expenses) {
    totalExpenses += convertCurrency(row.total, row.currency, display_currency);
  }
  for (const row of investments) {
    totalInvestments += convertCurrency(
      row.total,
      row.currency,
      display_currency
    );
  }
  for (const acc of accounts) {
    totalAccountBalance += convertCurrency(
      acc.balance,
      acc.currency,
      display_currency
    );
  }

  const netWorth = totalAccountBalance + totalInvestments;
  const savings = totalIncome - totalExpenses - totalInvestments;

  res.json({
    display_currency,
    total_income: Math.round(totalIncome * 100) / 100,
    total_expenses: Math.round(totalExpenses * 100) / 100,
    total_investments: Math.round(totalInvestments * 100) / 100,
    total_account_balance: Math.round(totalAccountBalance * 100) / 100,
    net_worth: Math.round(netWorth * 100) / 100,
    savings: Math.round(savings * 100) / 100,
  });
});

router.get("/monthly", (req, res) => {
  const { display_currency = "USD", year } = req.query;
  let sql = `
    SELECT
      strftime('%Y-%m', date) as month,
      type,
      currency,
      SUM(amount) as total
    FROM transactions
  `;
  const params = [];
  if (year) {
    sql += " WHERE strftime('%Y', date) = ?";
    params.push(year);
  }
  sql += " GROUP BY month, type, currency ORDER BY month";

  const rows = db.prepare(sql).all(...params);
  const monthly = {};

  for (const row of rows) {
    if (!monthly[row.month]) {
      monthly[row.month] = { month: row.month, income: 0, expense: 0, investment: 0 };
    }
    const converted = convertCurrency(
      row.total,
      row.currency,
      display_currency
    );
    monthly[row.month][row.type] += Math.round(converted * 100) / 100;
  }

  res.json(Object.values(monthly));
});

router.get("/by-category", (req, res) => {
  const { type = "expense", display_currency = "USD" } = req.query;

  const rows = db
    .prepare(
      `SELECT category, currency, SUM(amount) as total
       FROM transactions WHERE type = ?
       GROUP BY category, currency ORDER BY total DESC`
    )
    .all(type);

  const categories = {};
  for (const row of rows) {
    const converted = convertCurrency(
      row.total,
      row.currency,
      display_currency
    );
    categories[row.category] =
      (categories[row.category] || 0) + Math.round(converted * 100) / 100;
  }

  const result = Object.entries(categories)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  res.json(result);
});

router.get("/by-country", (req, res) => {
  const { display_currency = "USD" } = req.query;

  const indiaTotal = db
    .prepare(
      "SELECT SUM(balance) as total FROM accounts WHERE country = 'India'"
    )
    .get();
  const usaTotal = db
    .prepare(
      "SELECT SUM(balance) as total FROM accounts WHERE country = 'USA'"
    )
    .get();

  const indiaINR = db
    .prepare(
      "SELECT SUM(amount) as total FROM transactions WHERE currency = 'INR' AND type = 'investment'"
    )
    .get();
  const usaUSD = db
    .prepare(
      "SELECT SUM(amount) as total FROM transactions WHERE currency = 'USD' AND type = 'investment'"
    )
    .get();

  res.json({
    india: {
      account_balance: convertCurrency(
        indiaTotal.total || 0,
        "INR",
        display_currency
      ),
      investments: convertCurrency(
        indiaINR.total || 0,
        "INR",
        display_currency
      ),
    },
    usa: {
      account_balance: convertCurrency(
        usaTotal.total || 0,
        "USD",
        display_currency
      ),
      investments: convertCurrency(
        usaUSD.total || 0,
        "USD",
        display_currency
      ),
    },
  });
});

router.get("/net-worth-trend", (req, res) => {
  const { display_currency = "USD" } = req.query;

  const rows = db
    .prepare(
      `SELECT
         strftime('%Y-%m', date) as month,
         currency,
         SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
         SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
         SUM(CASE WHEN type = 'investment' THEN amount ELSE 0 END) as investment
       FROM transactions
       GROUP BY month, currency
       ORDER BY month`
    )
    .all();

  const trend = {};
  let runningTotal = 0;

  for (const row of rows) {
    if (!trend[row.month]) {
      trend[row.month] = { month: row.month, net_worth: 0 };
    }
    const net = convertCurrency(
      row.income - row.expense,
      row.currency,
      display_currency
    );
    runningTotal += net;
    trend[row.month].net_worth = Math.round(runningTotal * 100) / 100;
  }

  res.json(Object.values(trend));
});

module.exports = router;
