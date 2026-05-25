const Database = require("better-sqlite3");

const mockDb = new Database(":memory:");
mockDb.pragma("journal_mode = WAL");
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

const { getExchangeRate, convertCurrency, setExchangeRate } = require("../../utils/currency");

afterAll(() => {
  mockDb.close();
});

describe("currency utilities", () => {
  describe("getExchangeRate", () => {
    it("should return 1 for same currency", () => {
      expect(getExchangeRate("USD", "USD")).toBe(1);
    });

    it("should return 1 for INR to INR", () => {
      expect(getExchangeRate("INR", "INR")).toBe(1);
    });

    it("should return the rate for USD to INR", () => {
      expect(getExchangeRate("USD", "INR")).toBe(83.5);
    });

    it("should return the rate for INR to USD", () => {
      expect(getExchangeRate("INR", "USD")).toBe(0.012);
    });

    it("should return null for unknown currency pair", () => {
      expect(getExchangeRate("EUR", "GBP")).toBeNull();
    });
  });

  describe("convertCurrency", () => {
    it("should convert USD to INR", () => {
      expect(convertCurrency(100, "USD", "INR")).toBe(8350);
    });

    it("should convert INR to USD", () => {
      expect(convertCurrency(1000, "INR", "USD")).toBe(12);
    });

    it("should return same amount for same currency", () => {
      expect(convertCurrency(500, "USD", "USD")).toBe(500);
    });

    it("should throw error for unknown currency pair", () => {
      expect(() => convertCurrency(100, "EUR", "GBP")).toThrow(
        "No exchange rate found for EUR -> GBP"
      );
    });

    it("should handle zero amount", () => {
      expect(convertCurrency(0, "USD", "INR")).toBe(0);
    });

    it("should handle negative amount", () => {
      expect(convertCurrency(-100, "USD", "INR")).toBe(-8350);
    });
  });

  describe("setExchangeRate", () => {
    it("should insert a new exchange rate", () => {
      setExchangeRate("EUR", "USD", 1.1);
      const row = mockDb
        .prepare(
          "SELECT rate FROM exchange_rates WHERE from_currency = ? AND to_currency = ? ORDER BY date DESC LIMIT 1"
        )
        .get("EUR", "USD");
      expect(row.rate).toBe(1.1);
    });

    it("should update an existing exchange rate for same date", () => {
      setExchangeRate("EUR", "USD", 1.2);
      const row = mockDb
        .prepare(
          "SELECT rate FROM exchange_rates WHERE from_currency = ? AND to_currency = ? ORDER BY date DESC LIMIT 1"
        )
        .get("EUR", "USD");
      expect(row.rate).toBe(1.2);
    });
  });
});
