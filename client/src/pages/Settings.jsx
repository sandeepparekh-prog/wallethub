import { useState, useEffect } from "react";
import { fetchExchangeRates, updateExchangeRate } from "../utils/api";
import { Save, RefreshCw } from "lucide-react";

export default function Settings() {
  const [rates, setRates] = useState([]);
  const [usdToInr, setUsdToInr] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchExchangeRates()
      .then((data) => {
        if (cancelled) return;
        setRates(data);
        const usdRate = data.find(
          (r) => r.from_currency === "USD" && r.to_currency === "INR"
        );
        if (usdRate) setUsdToInr(String(usdRate.rate));
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await updateExchangeRate({
        from_currency: "USD",
        to_currency: "INR",
        rate: parseFloat(usdToInr),
      });
      setMessage("Exchange rate updated successfully!");
    } catch (err) {
      setMessage("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Configure exchange rates and preferences
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">
          Exchange Rates
        </h3>
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                USD to INR Rate
              </label>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm text-slate-500">1 USD =</span>
                  <input
                    type="number"
                    step="0.01"
                    value={usdToInr}
                    onChange={(e) => setUsdToInr(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    placeholder="83.50"
                    required
                  />
                  <span className="text-sm text-slate-500">INR</span>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  Save
                </button>
              </div>
            </div>
            {message && (
              <p
                className={`text-sm ${
                  message.includes("Error")
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {message}
              </p>
            )}
          </form>
        )}
      </div>

      {rates.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Current Rates</h3>
          <div className="space-y-2">
            {rates.map((r) => (
              <div
                key={r.id}
                className="flex justify-between p-3 bg-slate-50 rounded-lg text-sm"
              >
                <span className="text-slate-600">
                  {r.from_currency} → {r.to_currency}
                </span>
                <span className="font-medium text-slate-900">{r.rate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">About</h3>
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            <strong>FinTrack</strong> — Personal Finance Tracking Application
          </p>
          <p>
            Track your income, expenses, and investments across India and USA.
            Upload bank statements and financial documents to automatically
            import data.
          </p>
          <p className="text-xs text-slate-400 mt-4">
            All data is stored locally on your machine. No data is sent to
            external servers.
          </p>
        </div>
      </div>
    </div>
  );
}
