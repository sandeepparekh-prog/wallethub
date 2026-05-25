# FinTrack — Personal Finance Tracker

A personal finance tracking web application for consolidated net worth analytics across India and USA. Similar to Intuit Credit Karma, it provides visibility into income, expenses, and investments with multi-currency support (INR/USD).

## Features

- **Dashboard** — Consolidated net worth view with charts for income vs expenses, expense breakdown, income sources, and net worth trends
- **Multi-Currency** — Support for both INR (₹) and USD ($) with configurable exchange rates and automatic conversion
- **Document Upload** — Import financial data from Excel (.xlsx/.xls/.csv), PDF, and Word (.docx) documents with automatic parsing and categorization
- **Transaction Management** — Add, filter, and delete transactions with automatic category classification
- **Account Tracking** — Manage bank accounts, investments, credit cards, and loans across India and USA
- **Country Split** — View holdings split by India and USA
- **Local-First** — All data stored locally in SQLite; no external APIs or cloud dependencies

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TailwindCSS + Recharts |
| Backend | Node.js + Express |
| Database | SQLite (via better-sqlite3) |
| File Parsing | xlsx, pdf-parse, mammoth |

## Quick Start

### Prerequisites

- Node.js 18+ (tested with Node 22)
- npm 9+

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd personal-finance-tracker

# Install all dependencies (root, server, client)
npm run install:all
```

### Running Locally

```bash
# Start both backend (port 3001) and frontend (port 5173) concurrently
npm run dev
```

Then open **http://localhost:5173** in your browser.

### Production Build

```bash
# Build the frontend
npm run build

# Start the server (serves the built frontend)
npm run server
```

Then open **http://localhost:3001**.

## Project Structure

```
personal-finance-tracker/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route pages (Dashboard, Transactions, etc.)
│   │   └── utils/           # API client, formatters
│   └── vite.config.js
├── server/                  # Express backend
│   ├── models/              # SQLite database schema
│   ├── routes/              # API route handlers
│   ├── utils/               # File parsing, currency conversion
│   └── index.js             # Server entry point
├── package.json             # Root package with dev scripts
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions (with filters) |
| POST | `/api/transactions` | Create a transaction |
| POST | `/api/transactions/bulk` | Bulk import transactions |
| DELETE | `/api/transactions/:id` | Delete a transaction |
| GET | `/api/accounts` | List all accounts |
| POST | `/api/accounts` | Create an account |
| PUT | `/api/accounts/:id` | Update an account |
| DELETE | `/api/accounts/:id` | Delete an account |
| POST | `/api/upload` | Upload and parse a document |
| GET | `/api/upload/history` | Upload history |
| GET | `/api/analytics/summary` | Financial summary |
| GET | `/api/analytics/monthly` | Monthly breakdown |
| GET | `/api/analytics/by-category` | Category breakdown |
| GET | `/api/analytics/by-country` | Country split |
| GET | `/api/analytics/net-worth-trend` | Net worth over time |
| GET | `/api/exchange-rates` | Current exchange rates |
| PUT | `/api/exchange-rates` | Update exchange rate |

## Document Upload

The application can parse and import financial data from:

- **Excel** (.xlsx, .xls, .csv) — Automatically detects columns for date, description, amount, and category
- **PDF** — Extracts text and identifies transaction lines with amounts and dates
- **Word** (.docx) — Extracts raw text and parses transaction data

Transactions are automatically classified as income, expense, or investment based on keyword matching in descriptions.

## License

Private — for personal use.
