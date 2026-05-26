const express = require("express");
const router = express.Router();
const db = require("../models/database");
const { convertCurrency } = require("../utils/currency");

function addDateFilter(sql, params, from, to) {
  if (from) {
    sql += " AND date >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND date <= ?";
    params.push(to);
  }
  return sql;
}

router.get("/summary", (req, res) => {
  const { display_currency = "USD", from, to } = req.query;

  let incomeSql = "SELECT currency, SUM(amount) as total FROM transactions WHERE type = 'income'";
  let expenseSql = "SELECT currency, SUM(amount) as total FROM transactions WHERE type = 'expense'";
  let investmentSql = "SELECT currency, SUM(amount) as total FROM transactions WHERE type = 'investment'";
  const incomeParams = [];
  const expenseParams = [];
  const investmentParams = [];

  incomeSql = addDateFilter(incomeSql, incomeParams, from, to);
  expenseSql = addDateFilter(expenseSql, expenseParams, from, to);
  investmentSql = addDateFilter(investmentSql, investmentParams, from, to);

  incomeSql += " GROUP BY currency";
  expenseSql += " GROUP BY currency";
  investmentSql += " GROUP BY currency";

  const income = db.prepare(incomeSql).all(...incomeParams);
  const expenses = db.prepare(expenseSql).all(...expenseParams);
  const investments = db.prepare(investmentSql).all(...investmentParams);
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
    totalInvestments += convertCurrency(row.total, row.currency, display_currency);
  }
  for (const acc of accounts) {
    totalAccountBalance += convertCurrency(acc.balance, acc.currency, display_currency);
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
  const { display_currency = "USD", year, from, to } = req.query;
  let sql = `
    SELECT
      strftime('%Y-%m', date) as month,
      type,
      currency,
      SUM(amount) as total
    FROM transactions
    WHERE 1=1
  `;
  const params = [];
  if (year) {
    sql += " AND strftime('%Y', date) = ?";
    params.push(year);
  }
  if (from) {
    sql += " AND date >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND date <= ?";
    params.push(to);
  }
  sql += " GROUP BY month, type, currency ORDER BY month";

  const rows = db.prepare(sql).all(...params);
  const monthly = {};

  for (const row of rows) {
    if (!monthly[row.month]) {
      monthly[row.month] = { month: row.month, income: 0, expense: 0, investment: 0 };
    }
    const converted = convertCurrency(row.total, row.currency, display_currency);
    monthly[row.month][row.type] += Math.round(converted * 100) / 100;
  }

  res.json(Object.values(monthly));
});

router.get("/by-category", (req, res) => {
  const { type = "expense", display_currency = "USD", from, to } = req.query;

  let sql = `SELECT category, currency, SUM(amount) as total
     FROM transactions WHERE type = ?`;
  const params = [type];

  if (from) {
    sql += " AND date >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND date <= ?";
    params.push(to);
  }

  sql += " GROUP BY category, currency ORDER BY total DESC";

  const rows = db.prepare(sql).all(...params);

  const categories = {};
  for (const row of rows) {
    const converted = convertCurrency(row.total, row.currency, display_currency);
    categories[row.category] =
      (categories[row.category] || 0) + Math.round(converted * 100) / 100;
  }

  const result = Object.entries(categories)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  res.json(result);
});

router.get("/by-vendor", (req, res) => {
  const { type, display_currency = "USD", from, to, category } = req.query;

  let sql = `SELECT vendor, category, type, currency, SUM(amount) as total, COUNT(*) as count
     FROM transactions WHERE vendor IS NOT NULL AND vendor != ''`;
  const params = [];

  if (type) {
    sql += " AND type = ?";
    params.push(type);
  }
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  if (from) {
    sql += " AND date >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND date <= ?";
    params.push(to);
  }

  sql += " GROUP BY vendor, category, type, currency ORDER BY total DESC";

  const rows = db.prepare(sql).all(...params);
  const vendors = {};
  for (const row of rows) {
    const key = row.vendor;
    if (!vendors[key]) {
      vendors[key] = { vendor: row.vendor, category: row.category, type: row.type, total: 0, count: 0 };
    }
    vendors[key].total += Math.round(convertCurrency(row.total, row.currency, display_currency) * 100) / 100;
    vendors[key].count += row.count;
  }

  res.json(Object.values(vendors).sort((a, b) => b.total - a.total));
});

router.get("/trend", (req, res) => {
  const { display_currency = "USD", from, to, granularity = "monthly" } = req.query;

  let groupFormat;
  switch (granularity) {
    case "weekly":
      groupFormat = "strftime('%Y-W%W', date)";
      break;
    case "quarterly":
      groupFormat = "strftime('%Y', date) || '-Q' || ((CAST(strftime('%m', date) AS INTEGER) - 1) / 3 + 1)";
      break;
    case "yearly":
      groupFormat = "strftime('%Y', date)";
      break;
    default:
      groupFormat = "strftime('%Y-%m', date)";
  }

  let sql = `
    SELECT
      ${groupFormat} as period,
      type,
      currency,
      SUM(amount) as total
    FROM transactions
    WHERE 1=1
  `;
  const params = [];
  if (from) {
    sql += " AND date >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND date <= ?";
    params.push(to);
  }
  sql += ` GROUP BY period, type, currency ORDER BY period`;

  const rows = db.prepare(sql).all(...params);
  const periods = {};

  for (const row of rows) {
    if (!periods[row.period]) {
      periods[row.period] = { period: row.period, income: 0, expense: 0, investment: 0 };
    }
    const converted = convertCurrency(row.total, row.currency, display_currency);
    periods[row.period][row.type] += Math.round(converted * 100) / 100;
  }

  res.json(Object.values(periods));
});

router.get("/by-country", (req, res) => {
  const { display_currency = "USD" } = req.query;

  const indiaTotal = db
    .prepare("SELECT SUM(balance) as total FROM accounts WHERE country = 'India'")
    .get();
  const usaTotal = db
    .prepare("SELECT SUM(balance) as total FROM accounts WHERE country = 'USA'")
    .get();

  const indiaINR = db
    .prepare("SELECT SUM(amount) as total FROM transactions WHERE currency = 'INR' AND type = 'investment'")
    .get();
  const usaUSD = db
    .prepare("SELECT SUM(amount) as total FROM transactions WHERE currency = 'USD' AND type = 'investment'")
    .get();

  res.json({
    india: {
      account_balance: convertCurrency(indiaTotal.total || 0, "INR", display_currency),
      investments: convertCurrency(indiaINR.total || 0, "INR", display_currency),
    },
    usa: {
      account_balance: convertCurrency(usaTotal.total || 0, "USD", display_currency),
      investments: convertCurrency(usaUSD.total || 0, "USD", display_currency),
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
         type,
         SUM(amount) as total
       FROM transactions
       GROUP BY month, currency, type
       ORDER BY month`
    )
    .all();

  const monthly = {};
  for (const row of rows) {
    if (!monthly[row.month]) {
      monthly[row.month] = { month: row.month, income: 0, expense: 0, investment: 0 };
    }
    const converted = convertCurrency(row.total, row.currency, display_currency);
    monthly[row.month][row.type] += converted;
  }

  let runningNetWorth = 0;
  const result = Object.values(monthly).map((m) => {
    runningNetWorth += m.income - m.expense;
    return {
      month: m.month,
      net_worth: Math.round(runningNetWorth * 100) / 100,
    };
  });

  res.json(result);
});

module.exports = router;
