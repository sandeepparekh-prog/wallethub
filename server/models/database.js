const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "finance.db");

const fs = require("fs");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    description TEXT,
    vendor TEXT,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'investment', 'transfer')),
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

  CREATE TABLE IF NOT EXISTS uploaded_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    processed INTEGER DEFAULT 0,
    records_imported INTEGER DEFAULT 0,
    uploaded_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS vendor_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_pattern TEXT NOT NULL UNIQUE,
    vendor_name TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'investment', 'transfer')),
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Add vendor column if missing (migration for existing DBs)
try {
  db.exec("ALTER TABLE transactions ADD COLUMN vendor TEXT");
} catch (_) {
  // column already exists
}

// Insert default exchange rate if none exist
const rateCount = db.prepare("SELECT COUNT(*) as cnt FROM exchange_rates").get();
if (rateCount.cnt === 0) {
  db.prepare(
    "INSERT INTO exchange_rates (from_currency, to_currency, rate, date) VALUES (?, ?, ?, date('now'))"
  ).run("USD", "INR", 83.5);
  db.prepare(
    "INSERT INTO exchange_rates (from_currency, to_currency, rate, date) VALUES (?, ?, ?, date('now'))"
  ).run("INR", "USD", 0.012);
}

// Seed common vendor rules if empty
const ruleCount = db.prepare("SELECT COUNT(*) as cnt FROM vendor_rules").get();
if (ruleCount.cnt === 0) {
  const defaultRules = [
    // Income
    ["payroll", "Employer Payroll", "salary", "income"],
    ["direct dep", "Direct Deposit", "salary", "income"],
    ["interest paid", "Bank Interest", "interest", "income"],
    ["dividend", "Dividend", "dividend", "income"],
    ["refund", "Refund", "refund", "income"],
    ["cashback", "Cashback", "cashback", "income"],
    ["venmo.*from", "Venmo Received", "transfer in", "income"],
    ["zelle.*from", "Zelle Received", "transfer in", "income"],
    // Groceries
    ["walmart", "Walmart", "groceries", "expense"],
    ["target", "Target", "groceries", "expense"],
    ["costco", "Costco", "groceries", "expense"],
    ["whole foods", "Whole Foods", "groceries", "expense"],
    ["trader joe", "Trader Joe's", "groceries", "expense"],
    ["kroger", "Kroger", "groceries", "expense"],
    ["safeway", "Safeway", "groceries", "expense"],
    ["aldi", "Aldi", "groceries", "expense"],
    ["big bazaar", "Big Bazaar", "groceries", "expense"],
    ["dmart", "DMart", "groceries", "expense"],
    ["bigbasket", "BigBasket", "groceries", "expense"],
    ["zepto", "Zepto", "groceries", "expense"],
    ["blinkit", "Blinkit", "groceries", "expense"],
    // Food & Dining
    ["uber eats", "Uber Eats", "dining", "expense"],
    ["doordash", "DoorDash", "dining", "expense"],
    ["grubhub", "Grubhub", "dining", "expense"],
    ["swiggy", "Swiggy", "dining", "expense"],
    ["zomato", "Zomato", "dining", "expense"],
    ["starbucks", "Starbucks", "dining", "expense"],
    ["mcdonald", "McDonald's", "dining", "expense"],
    ["restaurant", "Restaurant", "dining", "expense"],
    // Transportation
    ["uber trip", "Uber", "transport", "expense"],
    ["lyft", "Lyft", "transport", "expense"],
    ["ola", "Ola", "transport", "expense"],
    ["rapido", "Rapido", "transport", "expense"],
    ["gas station", "Gas Station", "fuel", "expense"],
    ["shell oil", "Shell", "fuel", "expense"],
    ["chevron", "Chevron", "fuel", "expense"],
    ["bp ", "BP", "fuel", "expense"],
    ["exxon", "Exxon", "fuel", "expense"],
    ["indian oil", "Indian Oil", "fuel", "expense"],
    ["metro card", "Metro/Transit", "transport", "expense"],
    ["parking", "Parking", "transport", "expense"],
    // Utilities
    ["electric", "Electric", "utilities", "expense"],
    ["water bill", "Water", "utilities", "expense"],
    ["gas bill", "Gas", "utilities", "expense"],
    ["comcast", "Comcast", "utilities", "expense"],
    ["at&t", "AT&T", "utilities", "expense"],
    ["verizon", "Verizon", "utilities", "expense"],
    ["t-mobile", "T-Mobile", "utilities", "expense"],
    ["airtel", "Airtel", "utilities", "expense"],
    ["jio", "Jio", "utilities", "expense"],
    // Subscriptions
    ["netflix", "Netflix", "subscriptions", "expense"],
    ["spotify", "Spotify", "subscriptions", "expense"],
    ["amazon prime", "Amazon Prime", "subscriptions", "expense"],
    ["disney", "Disney+", "subscriptions", "expense"],
    ["youtube", "YouTube", "subscriptions", "expense"],
    ["apple.com/bill", "Apple", "subscriptions", "expense"],
    ["google storage", "Google Storage", "subscriptions", "expense"],
    ["hotstar", "Hotstar", "subscriptions", "expense"],
    // Shopping
    ["amazon", "Amazon", "shopping", "expense"],
    ["flipkart", "Flipkart", "shopping", "expense"],
    ["myntra", "Myntra", "shopping", "expense"],
    ["ebay", "eBay", "shopping", "expense"],
    ["ikea", "IKEA", "shopping", "expense"],
    // Insurance
    ["insurance", "Insurance", "insurance", "expense"],
    ["geico", "GEICO", "insurance", "expense"],
    ["lic", "LIC", "insurance", "expense"],
    // Medical
    ["pharmacy", "Pharmacy", "medical", "expense"],
    ["hospital", "Hospital", "medical", "expense"],
    ["doctor", "Doctor", "medical", "expense"],
    ["cvs", "CVS", "medical", "expense"],
    ["walgreens", "Walgreens", "medical", "expense"],
    ["apollo", "Apollo", "medical", "expense"],
    // Rent & Housing
    ["rent", "Rent", "rent", "expense"],
    ["mortgage", "Mortgage", "housing", "expense"],
    // Education
    ["tuition", "Tuition", "education", "expense"],
    ["university", "University", "education", "expense"],
    ["coursera", "Coursera", "education", "expense"],
    ["udemy", "Udemy", "education", "expense"],
    // Investment
    ["mutual fund", "Mutual Fund", "mutual fund", "investment"],
    ["sip", "SIP", "sip", "investment"],
    ["zerodha", "Zerodha", "stocks", "investment"],
    ["groww", "Groww", "mutual fund", "investment"],
    ["vanguard", "Vanguard", "stocks", "investment"],
    ["fidelity", "Fidelity", "stocks", "investment"],
    ["robinhood", "Robinhood", "stocks", "investment"],
    ["schwab", "Schwab", "stocks", "investment"],
    ["401k", "401(k)", "retirement", "investment"],
    ["ira", "IRA", "retirement", "investment"],
    ["ppf", "PPF", "ppf", "investment"],
    ["nps", "NPS", "nps", "investment"],
    ["fixed deposit", "Fixed Deposit", "fd", "investment"],
    ["fd ", "Fixed Deposit", "fd", "investment"],
    ["crypto", "Crypto", "crypto", "investment"],
    ["coinbase", "Coinbase", "crypto", "investment"],
    // Transfers
    ["transfer to", "Transfer Out", "transfer", "transfer"],
    ["transfer from", "Transfer In", "transfer", "transfer"],
    ["ach transfer", "ACH Transfer", "transfer", "transfer"],
    ["wire transfer", "Wire Transfer", "transfer", "transfer"],
    ["neft", "NEFT", "transfer", "transfer"],
    ["imps", "IMPS", "transfer", "transfer"],
    ["upi", "UPI Payment", "upi", "expense"],
    // Loans/EMI
    ["emi", "EMI", "emi", "expense"],
    ["loan payment", "Loan Payment", "loan", "expense"],
    // Tax
    ["tax payment", "Tax", "tax", "expense"],
    ["irs", "IRS", "tax", "expense"],
    ["income tax", "Income Tax", "tax", "expense"],
  ];

  const insertRule = db.prepare(
    "INSERT OR IGNORE INTO vendor_rules (vendor_pattern, vendor_name, category, type) VALUES (?, ?, ?, ?)"
  );
  const seedRules = db.transaction(() => {
    for (const [pattern, name, category, type] of defaultRules) {
      insertRule.run(pattern, name, category, type);
    }
  });
  seedRules();
}

module.exports = db;
