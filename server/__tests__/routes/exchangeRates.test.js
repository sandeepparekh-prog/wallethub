const Database = require("better-sqlite3");

const mockDb = new Database(":memory:");
mockDb.pragma("journal_mode = WAL");
mockDb.pragma("foreign_keys = ON");
mockDb.exec(`
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

jest.mock("../../models/database", () => mockDb);

const request = require("supertest");
const express = require("express");
const exchangeRatesRouter = require("../../routes/exchangeRates");

const app = express();
app.use(express.json());
app.use("/api/exchange-rates", exchangeRatesRouter);

afterAll(() => {
  mockDb.close();
});

describe("Exchange Rates API", () => {
  describe("GET /api/exchange-rates", () => {
    it("should return all exchange rates", async () => {
      const res = await request(app).get("/api/exchange-rates");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      const rate = res.body[0];
      expect(rate).toHaveProperty("from_currency");
      expect(rate).toHaveProperty("to_currency");
      expect(rate).toHaveProperty("rate");
      expect(rate).toHaveProperty("date");
    });
  });

  describe("PUT /api/exchange-rates", () => {
    it("should update exchange rate and set inverse", async () => {
      const res = await request(app).put("/api/exchange-rates").send({
        from_currency: "USD",
        to_currency: "INR",
        rate: 84.0,
      });

      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(true);

      const ratesRes = await request(app).get("/api/exchange-rates");
      const usdToInr = ratesRes.body.find(
        (r) => r.from_currency === "USD" && r.to_currency === "INR"
      );
      expect(usdToInr.rate).toBe(84.0);
    });

    it("should return 400 if from_currency is missing", async () => {
      const res = await request(app).put("/api/exchange-rates").send({
        to_currency: "INR",
        rate: 84.0,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("required");
    });

    it("should return 400 if to_currency is missing", async () => {
      const res = await request(app).put("/api/exchange-rates").send({
        from_currency: "USD",
        rate: 84.0,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("required");
    });

    it("should return 400 if rate is missing", async () => {
      const res = await request(app).put("/api/exchange-rates").send({
        from_currency: "USD",
        to_currency: "INR",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("required");
    });
  });
});
