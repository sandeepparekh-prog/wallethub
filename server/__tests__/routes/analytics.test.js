const Database = require("better-sqlite3");

const mockDb = new Database(":memory:");
mockDb.pragma("journal_mode = WAL");
mockDb.pragma("foreign_keys = ON");
mockDb.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'investment')),
    source TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('bank', 'investment', 'credit', 'loan', 'other')),
    balance REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    country TEXT NOT NULL DEFAULT 'USA',
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS exchange_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate REAL NOT NULL,
    date TEXT NOT NULL,
    UNIQUE(from_currency, to_currency, date)
  );
`);
mockDb.prepare(
  "INSERT INTO exchange_rates (from_currency, to_currency, rate, date) VALUES (?, ?, ?, date('now'))"
).run("USD", "INR", 83.5);
mockDb.prepare(
  "INSERT INTO exchange_rates (from_currency, to_currency, rate, date) VALUES (?, ?, ?, date('now'))"
).run("INR", "USD", 0.012);

// Seed test data
const insertTransaction = mockDb.prepare(
  `INSERT INTO transactions (date, description, amount, currency, category, type, source)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);
insertTransaction.run("2024-01-15", "Salary", 5000, "USD", "salary", "income", "manual");
insertTransaction.run("2024-01-20", "Grocery", 200, "USD", "grocery", "expense", "manual");
insertTransaction.run("2024-02-15", "Salary", 5000, "USD", "salary", "income", "manual");
insertTransaction.run("2024-02-10", "Rent", 1500, "USD", "rent", "expense", "manual");
insertTransaction.run("2024-01-05", "SIP", 1000, "INR", "mutual fund", "investment", "manual");
insertTransaction.run("2024-01-10", "Freelance INR", 50000, "INR", "freelance", "income", "manual");

const insertAccount = mockDb.prepare(
  `INSERT INTO accounts (name, type, balance, currency, country) VALUES (?, ?, ?, ?, ?)`
);
insertAccount.run("Chase Checking", "bank", 10000, "USD", "USA");
insertAccount.run("SBI Savings", "bank", 500000, "INR", "India");
insertAccount.run("Vanguard 401k", "investment", 50000, "USD", "USA");

jest.mock("../../models/database", () => mockDb);

const request = require("supertest");
const express = require("express");
const analyticsRouter = require("../../routes/analytics");

const app = express();
app.use(express.json());
app.use("/api/analytics", analyticsRouter);

afterAll(() => {
  mockDb.close();
});

describe("Analytics API", () => {
  describe("GET /api/analytics/summary", () => {
    it("should return financial summary in USD", async () => {
      const res = await request(app).get("/api/analytics/summary");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("display_currency", "USD");
      expect(res.body).toHaveProperty("total_income");
      expect(res.body).toHaveProperty("total_expenses");
      expect(res.body).toHaveProperty("total_investments");
      expect(res.body).toHaveProperty("net_worth");
      expect(res.body).toHaveProperty("savings");
      expect(res.body.total_income).toBeGreaterThan(0);
      expect(res.body.total_expenses).toBeGreaterThan(0);
    });

    it("should accept display_currency parameter", async () => {
      const res = await request(app).get(
        "/api/analytics/summary?display_currency=INR"
      );

      expect(res.status).toBe(200);
      expect(res.body.display_currency).toBe("INR");
    });
  });

  describe("GET /api/analytics/monthly", () => {
    it("should return monthly breakdown", async () => {
      const res = await request(app).get("/api/analytics/monthly");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const entry = res.body[0];
      expect(entry).toHaveProperty("month");
      expect(entry).toHaveProperty("income");
      expect(entry).toHaveProperty("expense");
      expect(entry).toHaveProperty("investment");
    });

    it("should filter by year", async () => {
      const res = await request(app).get("/api/analytics/monthly?year=2024");

      expect(res.status).toBe(200);
      for (const entry of res.body) {
        expect(entry.month).toMatch(/^2024-/);
      }
    });

    it("should return empty for non-existent year", async () => {
      const res = await request(app).get("/api/analytics/monthly?year=2000");

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("GET /api/analytics/by-category", () => {
    it("should return expense categories by default", async () => {
      const res = await request(app).get("/api/analytics/by-category");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const entry = res.body[0];
      expect(entry).toHaveProperty("name");
      expect(entry).toHaveProperty("value");
      expect(entry.value).toBeGreaterThan(0);
    });

    it("should filter by income type", async () => {
      const res = await request(app).get(
        "/api/analytics/by-category?type=income"
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("should sort results by value descending", async () => {
      const res = await request(app).get("/api/analytics/by-category");

      for (let i = 1; i < res.body.length; i++) {
        expect(res.body[i - 1].value).toBeGreaterThanOrEqual(res.body[i].value);
      }
    });
  });

  describe("GET /api/analytics/by-country", () => {
    it("should return country split", async () => {
      const res = await request(app).get("/api/analytics/by-country");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("india");
      expect(res.body).toHaveProperty("usa");
      expect(res.body.india).toHaveProperty("account_balance");
      expect(res.body.india).toHaveProperty("investments");
      expect(res.body.usa).toHaveProperty("account_balance");
      expect(res.body.usa).toHaveProperty("investments");
    });
  });

  describe("GET /api/analytics/net-worth-trend", () => {
    it("should return net worth trend data", async () => {
      const res = await request(app).get("/api/analytics/net-worth-trend");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
