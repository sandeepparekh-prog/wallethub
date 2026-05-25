import { useState, useEffect, useRef } from "react";
import { uploadFile, fetchUploadHistory } from "../utils/api";
import { formatDate, capitalize } from "../utils/format";
import { Upload as UploadIcon, FileText, CheckCircle, AlertCircle, Loader } from "lucide-react";

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchUploadHistory()
      .then((data) => { if (!cancelled) setHistory(data); })
      .catch(console.error);
    return () => { cancelled = true; };
  }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    setError(null);

    try {
      const data = await uploadFile(file);
      setResult(data);
      fetchUploadHistory().then(setHistory);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upload Documents</h1>
        <p className="text-slate-500 mt-1">
          Import financial data from Excel, PDF, or Word files
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileRef.current?.click()}
        className={`bg-white rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-indigo-400 bg-indigo-50"
            : "border-slate-300 hover:border-indigo-300"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv,.pdf,.docx,.doc"
          onChange={handleFileChange}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader size={40} className="text-indigo-500 animate-spin" />
            <p className="text-sm text-slate-600">Processing file...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <UploadIcon size={40} className="text-slate-400" />
            <div>
              <p className="text-sm font-medium text-slate-700">
                Drag & drop a file here, or click to browse
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supported: .xlsx, .xls, .csv, .pdf, .docx, .doc (max 50MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={20} className="text-emerald-600" />
            <h3 className="font-semibold text-emerald-800">Upload Successful</h3>
          </div>
          <p className="text-sm text-emerald-700">
            <strong>{result.filename}</strong> — {result.recordsImported}{" "}
            records imported
          </p>
          {result.preview && result.preview.length > 0 && (
            <div className="mt-4 overflow-auto">
              <p className="text-xs font-medium text-emerald-600 mb-2">
                Preview (first {result.preview.length} records):
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-emerald-200">
                    <th className="px-2 py-1 text-left">Date</th>
                    <th className="px-2 py-1 text-left">Description</th>
                    <th className="px-2 py-1 text-left">Category</th>
                    <th className="px-2 py-1 text-left">Type</th>
                    <th className="px-2 py-1 text-right">Amount</th>
                    <th className="px-2 py-1 text-left">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {result.preview.map((r, i) => (
                    <tr key={i} className="border-b border-emerald-100">
                      <td className="px-2 py-1">{r.date}</td>
                      <td className="px-2 py-1">{r.description || "—"}</td>
                      <td className="px-2 py-1">{r.category}</td>
                      <td className="px-2 py-1">{capitalize(r.type)}</td>
                      <td className="px-2 py-1 text-right">{r.amount}</td>
                      <td className="px-2 py-1">{r.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Upload History</h3>
          <div className="space-y-3">
            {history.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {f.original_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(f.uploaded_at)} ·{" "}
                      {f.file_type.toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      f.processed
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {f.processed
                      ? `${f.records_imported} records`
                      : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
