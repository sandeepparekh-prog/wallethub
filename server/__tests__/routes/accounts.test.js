const Database = require("better-sqlite3");

const mockDb = new Database(":memory:");
mockDb.pragma("journal_mode = WAL");
mockDb.pragma("foreign_keys = ON");
mockDb.exec(`
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

jest.mock("../../models/database", () => mockDb);

const request = require("supertest");
const express = require("express");
const accountsRouter = require("../../routes/accounts");

const app = express();
app.use(express.json());
app.use("/api/accounts", accountsRouter);

afterAll(() => {
  mockDb.close();
});

describe("Accounts API", () => {
  describe("POST /api/accounts", () => {
    it("should create an account with all fields", async () => {
      const res = await request(app).post("/api/accounts").send({
        name: "Chase Checking",
        type: "bank",
        balance: 10000,
        currency: "USD",
        country: "USA",
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
    });

    it("should create an account with defaults", async () => {
      const res = await request(app).post("/api/accounts").send({
        name: "SBI Savings",
        type: "bank",
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
    });

    it("should return 400 if name is missing", async () => {
      const res = await request(app).post("/api/accounts").send({
        type: "bank",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("name and type are required");
    });

    it("should return 400 if type is missing", async () => {
      const res = await request(app).post("/api/accounts").send({
        name: "Test Account",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("name and type are required");
    });
  });

  describe("GET /api/accounts", () => {
    it("should return all accounts", async () => {
      const res = await request(app).get("/api/accounts");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it("should include account properties", async () => {
      const res = await request(app).get("/api/accounts");

      const account = res.body[0];
      expect(account).toHaveProperty("id");
      expect(account).toHaveProperty("name");
      expect(account).toHaveProperty("type");
      expect(account).toHaveProperty("balance");
      expect(account).toHaveProperty("currency");
      expect(account).toHaveProperty("country");
    });
  });

  describe("PUT /api/accounts/:id", () => {
    it("should update an account", async () => {
      const createRes = await request(app).post("/api/accounts").send({
        name: "Update Test",
        type: "bank",
        balance: 100,
      });

      const res = await request(app)
        .put(`/api/accounts/${createRes.body.id}`)
        .send({
          balance: 5000,
          name: "Updated Name",
        });

      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(true);
    });

    it("should return 404 for non-existent account", async () => {
      const res = await request(app).put("/api/accounts/99999").send({
        balance: 5000,
      });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Account not found");
    });
  });

  describe("DELETE /api/accounts/:id", () => {
    it("should delete an existing account", async () => {
      const createRes = await request(app).post("/api/accounts").send({
        name: "Delete Test",
        type: "bank",
      });

      const res = await request(app).delete(
        `/api/accounts/${createRes.body.id}`
      );
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });

    it("should return 404 for non-existent account", async () => {
      const res = await request(app).delete("/api/accounts/99999");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Account not found");
    });
  });
});
