const XLSX = require("xlsx");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const fs = require("fs");
const path = require("path");

const CATEGORY_KEYWORDS = {
  income: [
    "salary",
    "wage",
    "bonus",
    "dividend",
    "interest",
    "rental",
    "freelance",
    "consulting",
    "refund",
    "reimbursement",
  ],
  investment: [
    "mutual fund",
    "sip",
    "stock",
    "etf",
    "fd",
    "fixed deposit",
    "ppf",
    "nps",
    "401k",
    "ira",
    "bond",
    "crypto",
    "gold",
    "real estate",
  ],
  expense: [
    "rent",
    "grocery",
    "food",
    "utility",
    "electric",
    "water",
    "gas",
    "internet",
    "phone",
    "insurance",
    "medical",
    "transport",
    "fuel",
    "shopping",
    "entertainment",
    "subscription",
    "emi",
    "loan",
    "tax",
    "education",
  ],
};

function classifyTransaction(description, amount) {
  const desc = (description || "").toLowerCase();
  for (const [type, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (desc.includes(kw)) {
        return { type, category: kw };
      }
    }
  }
  if (amount > 0) return { type: "income", category: "other income" };
  return { type: "expense", category: "other expense" };
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
    // Excel serial date
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + value * 86400000);
    return date.toISOString().split("T")[0];
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

    for (const row of rows) {
      const keys = Object.keys(row);
      const dateKey = keys.find((k) =>
        /date|time|period/i.test(k)
      );
      const descKey = keys.find((k) =>
        /desc|narr|particular|detail|memo|note/i.test(k)
      );
      const amountKey = keys.find((k) =>
        /amount|value|total|sum|credit|debit/i.test(k)
      );
      const categoryKey = keys.find((k) =>
        /category|cat|type|class/i.test(k)
      );

      const rawAmount = row[amountKey] || row[keys[1]] || 0;
      const amount = parseAmount(String(rawAmount));
      if (isNaN(amount)) continue;

      const description = String(
        row[descKey] || row[categoryKey] || row[keys[0]] || ""
      );
      const currencyFromText = detectCurrency(
        JSON.stringify(row)
      );
      const { type, category } = classifyTransaction(description, amount);

      records.push({
        date: parseDate(row[dateKey] || row[keys[0]]),
        description,
        amount: Math.abs(amount),
        currency: currencyFromText || "USD",
        category: row[categoryKey] || category,
        type,
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

    const { type, category } = classifyTransaction(description, amount);

    records.push({
      date: dateMatch ? parseDate(dateMatch[0]) : parseDate(null),
      description,
      amount: Math.abs(amount),
      currency: detectCurrency(line) || currencyFromDoc || "USD",
      category,
      type,
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

    const { type, category } = classifyTransaction(description, amount);

    records.push({
      date: dateMatch ? parseDate(dateMatch[0]) : parseDate(null),
      description,
      amount: Math.abs(amount),
      currency: detectCurrency(line) || currencyFromDoc || "USD",
      category,
      type,
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

module.exports = { parseFile, classifyTransaction, parseAmount, detectCurrency };
