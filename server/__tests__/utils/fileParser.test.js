const {
  classifyTransaction,
  parseAmount,
  detectCurrency,
} = require("../../utils/fileParser");

describe("fileParser utilities", () => {
  describe("classifyTransaction", () => {
    it("should classify salary as income", () => {
      const result = classifyTransaction("Monthly salary payment", 5000);
      expect(result).toEqual({ type: "income", category: "salary" });
    });

    it("should classify dividend as income", () => {
      const result = classifyTransaction("Dividend from AAPL", 200);
      expect(result).toEqual({ type: "income", category: "dividend" });
    });

    it("should classify mutual fund as investment", () => {
      const result = classifyTransaction("Mutual fund SIP", 1000);
      expect(result).toEqual({ type: "investment", category: "mutual fund" });
    });

    it("should classify stock as investment", () => {
      const result = classifyTransaction("Stock purchase TSLA", 500);
      expect(result).toEqual({ type: "investment", category: "stock" });
    });

    it("should classify 401k as investment", () => {
      const result = classifyTransaction("401k contribution", 300);
      expect(result).toEqual({ type: "investment", category: "401k" });
    });

    it("should classify grocery as expense", () => {
      const result = classifyTransaction("Grocery store purchase", -50);
      expect(result).toEqual({ type: "expense", category: "grocery" });
    });

    it("should classify rent as expense", () => {
      const result = classifyTransaction("Rent payment for apartment", -2000);
      expect(result).toEqual({ type: "expense", category: "rent" });
    });

    it("should classify subscription as expense", () => {
      const result = classifyTransaction("Hulu subscription renewal", -15);
      expect(result).toEqual({ type: "expense", category: "subscription" });
    });

    it("should classify unknown positive amount as other income", () => {
      const result = classifyTransaction("Unknown transfer", 100);
      expect(result).toEqual({ type: "income", category: "other income" });
    });

    it("should classify unknown negative amount as other expense", () => {
      const result = classifyTransaction("Unknown transfer", -100);
      expect(result).toEqual({ type: "expense", category: "other expense" });
    });

    it("should classify unknown zero amount as other expense", () => {
      const result = classifyTransaction("Unknown item", 0);
      expect(result).toEqual({ type: "expense", category: "other expense" });
    });

    it("should handle null description", () => {
      const result = classifyTransaction(null, 100);
      expect(result).toEqual({ type: "income", category: "other income" });
    });

    it("should handle empty description", () => {
      const result = classifyTransaction("", -50);
      expect(result).toEqual({ type: "expense", category: "other expense" });
    });

    it("should be case insensitive", () => {
      const result = classifyTransaction("SALARY CREDIT", 5000);
      expect(result).toEqual({ type: "income", category: "salary" });
    });
  });

  describe("parseAmount", () => {
    it("should return a number if input is a number", () => {
      expect(parseAmount(100)).toBe(100);
    });

    it("should return a negative number", () => {
      expect(parseAmount(-50.5)).toBe(-50.5);
    });

    it("should parse a string amount", () => {
      expect(parseAmount("1000")).toBe(1000);
    });

    it("should remove dollar sign", () => {
      expect(parseAmount("$1,500.50")).toBe(1500.5);
    });

    it("should remove rupee sign", () => {
      expect(parseAmount("₹10,000")).toBe(10000);
    });

    it("should handle parentheses as negative", () => {
      expect(parseAmount("(500)")).toBe(-500);
    });

    it("should handle spaces", () => {
      expect(parseAmount(" 250 ")).toBe(250);
    });

    it("should return NaN for non-string non-number", () => {
      expect(parseAmount(undefined)).toBeNaN();
      expect(parseAmount(null)).toBeNaN();
      expect(parseAmount({})).toBeNaN();
    });

    it("should return NaN for empty string", () => {
      expect(parseAmount("")).toBeNaN();
    });
  });

  describe("detectCurrency", () => {
    it("should detect INR from rupee symbol", () => {
      expect(detectCurrency("Amount: ₹5000")).toBe("INR");
    });

    it("should detect INR from INR text", () => {
      expect(detectCurrency("Amount: INR 5000")).toBe("INR");
    });

    it("should detect INR from Rs.", () => {
      expect(detectCurrency("Amount: Rs. 5000")).toBe("INR");
    });

    it("should detect INR from Rs without dot", () => {
      expect(detectCurrency("Amount: Rs 5000")).toBe("INR");
    });

    it("should detect USD from dollar sign", () => {
      expect(detectCurrency("Amount: $500")).toBe("USD");
    });

    it("should detect USD from USD text", () => {
      expect(detectCurrency("Amount: USD 500")).toBe("USD");
    });

    it("should return null when no currency detected", () => {
      expect(detectCurrency("Amount: 500")).toBeNull();
    });

    it("should prioritize INR over USD", () => {
      expect(detectCurrency("₹5000 = $60")).toBe("INR");
    });
  });
});
