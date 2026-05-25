const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const db = require("../models/database");
const { parseFile } = require("../utils/fileParser");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".xlsx", ".xls", ".csv", ".pdf", ".docx", ".doc"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileRecord = db
      .prepare(
        `INSERT INTO uploaded_files (filename, original_name, file_type)
         VALUES (?, ?, ?)`
      )
      .run(
        req.file.filename,
        req.file.originalname,
        path.extname(req.file.originalname).toLowerCase()
      );

    const records = await parseFile(req.file.path, req.file.originalname);

    if (records.length > 0) {
      const insert = db.prepare(
        `INSERT INTO transactions (date, description, amount, currency, category, type, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      const insertMany = db.transaction((txns) => {
        for (const t of txns) {
          insert.run(
            t.date,
            t.description,
            t.amount,
            t.currency,
            t.category,
            t.type,
            t.source
          );
        }
      });

      insertMany(records);
    }

    db.prepare(
      "UPDATE uploaded_files SET processed = 1, records_imported = ? WHERE id = ?"
    ).run(records.length, fileRecord.lastInsertRowid);

    res.json({
      message: "File processed successfully",
      filename: req.file.originalname,
      recordsImported: records.length,
      preview: records.slice(0, 10),
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/history", (req, res) => {
  const files = db
    .prepare("SELECT * FROM uploaded_files ORDER BY uploaded_at DESC")
    .all();
  res.json(files);
});

module.exports = router;
