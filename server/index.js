const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
fs.mkdirSync(path.join(__dirname, "uploads"), { recursive: true });

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// API routes
app.use("/api/transactions", require("./routes/transactions"));
app.use("/api/accounts", require("./routes/accounts"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/exchange-rates", require("./routes/exchangeRates"));
app.use("/api/vendor-rules", require("./routes/vendorRules"));

// Serve static frontend in production
const clientBuild = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Finance Tracker API running on http://localhost:${PORT}`);
});
