const XLSX = require("xlsx");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");
const db = require("../models/database");

function getVendorRules() {
  return db.prepare("SELECT * FROM vendor_rules ORDER BY LENGTH(vendor_pattern) DESC").all();
}

function classifyByVendorRules(description) {
  const desc = (description || "").toLowerCase();
  const rules = getVendorRules();
  for (const rule of rules) {
    try {
      const regex = new RegExp(rule.vendor_pattern, "i");
      if (regex.test(desc)) {
        return {
          type: rule.type,
          category: rule.category,
          vendor: rule.vendor_name,
        };
      }
    } catch (_) {
      if (desc.includes(rule.vendor_pattern.toLowerCase())) {
        return {
          type: rule.type,
          category: rule.category,
          vendor: rule.vendor_name,
        };
      }
    }
  }
  return null;
}

function classifyTransaction(description, rawAmount, hasDebitCredit) {
  const vendorMatch = classifyByVendorRules(description);
  if (vendorMatch) return vendorMatch;

  // If we have separate debit/credit columns or negative amount, use that as primary signal
  if (hasDebitCredit !== undefined) {
    // hasDebitCredit: 'debit' means expense, 'credit' means income
    const baseType = hasDebitCredit === "debit" ? "expense" : "income";
    const category = guessCategory(description, baseType);
    return { type: baseType, category, vendor: extractVendor(description) };
  }

  // Use amount sign: negative = expense, positive = income
  if (rawAmount < 0) {
    const category = guessCategory(description, "expense");
    return { type: "expense", category, vendor: extractVendor(description) };
  }
  if (rawAmount > 0) {
    const category = guessCategory(description, "income");
    return { type: "income", category, vendor: extractVendor(description) };
  }

  return { type: "expense", category: "uncategorized", vendor: extractVendor(description) };
}

function guessCategory(description, defaultType) {
  const desc = (description || "").toLowerCase();

  const expenseKeywords = {
    groceries: ["grocery", "supermarket", "mart", "food store"],
    dining: ["restaurant", "cafe", "coffee", "pizza", "burger", "food", "eat", "dine"],
    transport: ["uber", "lyft", "ola", "cab", "taxi", "metro", "transit", "parking"],
    fuel: ["gas station", "fuel", "petrol", "diesel", "shell", "chevron", "bp"],
    utilities: ["electric", "water", "gas bill", "internet", "broadband", "phone", "mobile"],
    rent: ["rent", "lease"],
    housing: ["mortgage", "home loan", "property"],
    insurance: ["insurance", "premium", "geico", "lic"],
    medical: ["hospital", "doctor", "pharmacy", "medical", "health", "clinic"],
    shopping: ["amazon", "flipkart", "ebay", "shop", "store", "mall", "purchase"],
    subscriptions: ["netflix", "spotify", "subscription", "membership", "premium"],
    education: ["tuition", "school", "university", "course", "training"],
    emi: ["emi", "installment", "loan payment"],
    tax: ["tax", "irs", "gst"],
    entertainment: ["movie", "theatre", "game", "entertainment", "concert"],
    travel: ["hotel", "flight", "airline", "booking", "airbnb", "travel"],
  };

  const incomeKeywords = {
    salary: ["salary", "payroll", "wage", "direct dep", "employer"],
    freelance: ["freelance", "consulting", "contract", "gig"],
    interest: ["interest", "earned interest", "interest paid"],
    dividend: ["dividend"],
    rental: ["rental income", "rent received"],
    refund: ["refund", "return", "cashback", "reimbursement"],
    bonus: ["bonus", "incentive", "reward"],
  };

  const investmentKeywords = {
    "mutual fund": ["mutual fund", "sip", "groww", "kuvera"],
    stocks: ["stock", "share", "zerodha", "robinhood", "fidelity", "schwab", "vanguard", "etf"],
    retirement: ["401k", "ira", "ppf", "nps", "pension", "epf"],
    fd: ["fixed deposit", "fd", "term deposit"],
    crypto: ["crypto", "bitcoin", "coinbase", "binance"],
    gold: ["gold", "sovereign gold"],
    "real estate": ["real estate", "property invest"],
  };

  const keywordMap = defaultType === "income" ? incomeKeywords :
    defaultType === "investment" ? investmentKeywords : expenseKeywords;

  for (const [category, keywords] of Object.entries(keywordMap)) {
    for (const kw of keywords) {
      if (desc.includes(kw)) return category;
    }
  }

  // Cross-check: even if amount says income, the description might clearly be an expense vendor
  if (defaultType === "income") {
    for (const [category, keywords] of Object.entries(expenseKeywords)) {
      for (const kw of keywords) {
        if (desc.includes(kw)) return category;
      }
    }
  }

  return defaultType === "income" ? "other income" : defaultType === "investment" ? "other investment" : "uncategorized";
}

function extractVendor(description) {
  if (!description) return null;
  // Clean up common prefixes in bank statements
  let cleaned = description
    .replace(/^(pos|ach|debit|credit|check|wire|eft|atm|card)\s*/i, "")
    .replace(/\s*(debit|credit|payment|purchase|pos|transaction|txn)\s*/gi, " ")
    .replace(/\d{4,}/g, "") // remove long numbers
    .replace(/\s{2,}/g, " ")
    .trim();
  // Take first meaningful chunk as vendor
  const parts = cleaned.split(/[\/\-\*#]/);
  return parts[0].trim().substring(0, 50) || null;
}

function detectCurrency(text) {
  if (/₹|INR|Rs\.?/i.test(text)) return "INR";
  if (/\$|USD/i.test(text)) return "USD";
  return null;
}

function parseAmount(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  const cleaned = value.replace(/[₹$,\s]/g, "").replace(/\((.+)\)/, "-$1");
  return parseFloat(cleaned);
}

function parseDate(value) {
  if (!value) return new Date().toISOString().split("T")[0];
  if (typeof value === "number") {
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + value * 86400000);
    return date.toISOString().split("T")[0];
  }
  // Handle DD/MM/YYYY and MM/DD/YYYY
  if (typeof value === "string") {
    const parts = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (parts) {
      let [, a, b, y] = parts;
      if (y.length === 2) y = (parseInt(y) > 50 ? "19" : "20") + y;
      // If first number > 12, it's DD/MM/YYYY
      if (parseInt(a) > 12) {
        const d = new Date(`${y}-${b.padStart(2, "0")}-${a.padStart(2, "0")}`);
        if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
      }
      // Try MM/DD/YYYY
      const d = new Date(`${y}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`);
      if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    }
  }
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return new Date().toISOString().split("T")[0];
}

async function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const records = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (rows.length === 0) continue;

    const keys = Object.keys(rows[0]);
    const lowerKeys = keys.map((k) => k.toLowerCase());

    // Detect column mapping
    const dateKey = keys.find((k, i) => /date|time|period|trans.*date|posting/i.test(k)) || null;
    const descKey = keys.find((k) => /desc|narr|particular|detail|memo|note|remark/i.test(k)) || null;
    const debitKey = keys.find((k) => /debit|withdrawal|^dr$|amount.*debit/i.test(k)) || null;
    const creditKey = keys.find((k) => /^credit$|deposit|^cr$|amount.*credit/i.test(k)) || null;
    const amountKey = keys.find((k) => /^amount$|^value$|^total$|^sum$/i.test(k)) || null;
    const balanceKey = keys.find((k) => /balance|closing|running/i.test(k)) || null;
    const categoryKey = keys.find((k) => /category|cat|class|label/i.test(k)) || null;

    const hasSeparateDebitCredit = debitKey && creditKey;

    for (const row of rows) {
      let rawAmount = 0;
      let debitCreditHint;

      if (hasSeparateDebitCredit) {
        const debit = parseAmount(String(row[debitKey] || "0"));
        const credit = parseAmount(String(row[creditKey] || "0"));
        if (!isNaN(debit) && debit > 0) {
          rawAmount = -debit;
          debitCreditHint = "debit";
        } else if (!isNaN(credit) && credit > 0) {
          rawAmount = credit;
          debitCreditHint = "credit";
        } else {
          continue;
        }
      } else if (amountKey) {
        rawAmount = parseAmount(String(row[amountKey]));
        if (isNaN(rawAmount) || rawAmount === 0) continue;
      } else {
        // Try to find any numeric column that's not balance
        let found = false;
        for (const k of keys) {
          if (k === balanceKey || k === dateKey) continue;
          const val = parseAmount(String(row[k]));
          if (!isNaN(val) && val !== 0) {
            rawAmount = val;
            found = true;
            break;
          }
        }
        if (!found) continue;
      }

      const description = String(
        row[descKey] || row[keys.find((k) => typeof row[k] === "string" && row[k].length > 3)] || ""
      ).trim();
      if (!description && !categoryKey) continue;

      const currencyFromText = detectCurrency(JSON.stringify(row));
      const classification = classifyTransaction(description, rawAmount, debitCreditHint);

      records.push({
        date: parseDate(row[dateKey] || row[keys[0]]),
        description,
        vendor: classification.vendor,
        amount: Math.abs(rawAmount),
        currency: currencyFromText || "USD",
        category: row[categoryKey] || classification.category,
        type: row[categoryKey] ? classification.type : classification.type,
        source: `Excel: ${sheetName}`,
      });
    }
  }
  return records;
}

async function parsePDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  const text = data.text;
  const lines = text.split("\n").filter((l) => l.trim());
  const records = [];
  const currencyFromDoc = detectCurrency(text);

  const amountRegex = /[₹$]?\s*[\d,]+\.?\d*/g;
  const dateRegex =
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/;

  for (const line of lines) {
    const amounts = line.match(amountRegex);
    if (!amounts || amounts.length === 0) continue;

    const dateMatch = line.match(dateRegex);
    const amountStr = amounts[amounts.length - 1];
    const amount = parseAmount(amountStr);
    if (isNaN(amount) || amount === 0) continue;

    const description = line
      .replace(amountRegex, "")
      .replace(dateRegex, "")
      .trim();
    if (!description || description.length < 2) continue;

    const classification = classifyTransaction(description, amount);

    records.push({
      date: dateMatch ? parseDate(dateMatch[0]) : parseDate(null),
      description,
      vendor: classification.vendor,
      amount: Math.abs(amount),
      currency: detectCurrency(line) || currencyFromDoc || "USD",
      category: classification.category,
      type: classification.type,
      source: "PDF Upload",
    });
  }
  return records;
}

async function parseWord(filePath) {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;
  const lines = text.split("\n").filter((l) => l.trim());
  const records = [];
  const currencyFromDoc = detectCurrency(text);

  const amountRegex = /[₹$]?\s*[\d,]+\.?\d*/g;
  const dateRegex =
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/;

  for (const line of lines) {
    const amounts = line.match(amountRegex);
    if (!amounts || amounts.length === 0) continue;

    const dateMatch = line.match(dateRegex);
    const amountStr = amounts[amounts.length - 1];
    const amount = parseAmount(amountStr);
    if (isNaN(amount) || amount === 0) continue;

    const description = line
      .replace(amountRegex, "")
      .replace(dateRegex, "")
      .trim();
    if (!description || description.length < 2) continue;

    const classification = classifyTransaction(description, amount);

    records.push({
      date: dateMatch ? parseDate(dateMatch[0]) : parseDate(null),
      description,
      vendor: classification.vendor,
      amount: Math.abs(amount),
      currency: detectCurrency(line) || currencyFromDoc || "USD",
      category: classification.category,
      type: classification.type,
      source: "Word Upload",
    });
  }
  return records;
}

async function parseFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  switch (ext) {
    case ".xlsx":
    case ".xls":
    case ".csv":
      return parseExcel(filePath);
    case ".pdf":
      return parsePDF(filePath);
    case ".docx":
    case ".doc":
      return parseWord(filePath);
    default:
      throw new Error(`Unsupported file format: ${ext}`);
  }
}

module.exports = { parseFile, classifyTransaction, parseAmount, detectCurrency, classifyByVendorRules };
