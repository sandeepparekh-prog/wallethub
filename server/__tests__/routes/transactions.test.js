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
const transactionsRouter = require("../../routes/transactions");

const app = express();
app.use(express.json());
app.use("/api/transactions", transactionsRouter);

afterAll(() => {
  mockDb.close();
});

describe("Transactions API", () => {
  describe("POST /api/transactions", () => {
    it("should create a transaction with all fields", async () => {
      const res = await request(app).post("/api/transactions").send({
        date: "2024-01-15",
        description: "Monthly salary",
        amount: 5000,
        currency: "USD",
        category: "salary",
        type: "income",
        source: "manual",
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(typeof res.body.id).toBe("number");
    });

    it("should create a transaction with defaults", async () => {
      const res = await request(app).post("/api/transactions").send({
        date: "2024-01-16",
        amount: 100,
        category: "food",
        type: "expense",
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
    });

    it("should return 400 if required fields are missing", async () => {
      const res = await request(app).post("/api/transactions").send({
        description: "No date or amount",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing required fields");
    });

    it("should return 400 if date is missing", async () => {
      const res = await request(app).post("/api/transactions").send({
        amount: 100,
        category: "food",
        type: "expense",
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 if type is missing", async () => {
      const res = await request(app).post("/api/transactions").send({
        date: "2024-01-15",
        amount: 100,
        category: "food",
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/transactions", () => {
    it("should return all transactions", async () => {
      const res = await request(app).get("/api/transactions");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it("should filter by type", async () => {
      const res = await request(app).get("/api/transactions?type=income");

      expect(res.status).toBe(200);
      for (const t of res.body) {
        expect(t.type).toBe("income");
      }
    });

    it("should filter by currency", async () => {
      const res = await request(app).get("/api/transactions?currency=USD");

      expect(res.status).toBe(200);
      for (const t of res.body) {
        expect(t.currency).toBe("USD");
      }
    });

    it("should filter by date range", async () => {
      const res = await request(app).get(
        "/api/transactions?from=2024-01-15&to=2024-01-15"
      );

      expect(res.status).toBe(200);
      for (const t of res.body) {
        expect(t.date).toBe("2024-01-15");
      }
    });

    it("should respect limit parameter", async () => {
      const res = await request(app).get("/api/transactions?limit=1");

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
    });
  });

  describe("POST /api/transactions/bulk", () => {
    it("should bulk import transactions", async () => {
      const res = await request(app)
        .post("/api/transactions/bulk")
        .send({
          transactions: [
            {
              date: "2024-02-01",
              description: "Bulk item 1",
              amount: 100,
              category: "food",
              type: "expense",
            },
            {
              date: "2024-02-02",
              description: "Bulk item 2",
              amount: 200,
              category: "salary",
              type: "income",
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.imported).toBe(2);
    });

    it("should return 400 if transactions is not an array", async () => {
      const res = await request(app)
        .post("/api/transactions/bulk")
        .send({ transactions: "not an array" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("transactions must be an array");
    });
  });

  describe("DELETE /api/transactions/:id", () => {
    it("should delete an existing transaction", async () => {
      const createRes = await request(app).post("/api/transactions").send({
        date: "2024-03-01",
        amount: 50,
        category: "test",
        type: "expense",
      });

      const res = await request(app).delete(
        `/api/transactions/${createRes.body.id}`
      );
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it("should return 404 for non-existent transaction", async () => {
      const res = await request(app).delete("/api/transactions/99999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Transaction not found");
    });
  });
});
