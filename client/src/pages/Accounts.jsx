import { useState, useEffect } from "react";
import {
  fetchAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "../utils/api";
import { formatCurrency } from "../utils/format";
import { Plus, Trash2, Edit2, X, Save } from "lucide-react";

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: "",
    type: "bank",
    balance: "",
    currency: "USD",
    country: "USA",
  });

  const loadAccounts = () => {
    setLoading(true);
    fetchAccounts()
      .then(setAccounts)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAccounts()
      .then((data) => { if (!cancelled) setAccounts(data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAccount(editingId, {
          ...form,
          balance: parseFloat(form.balance),
        });
        setEditingId(null);
      } else {
        await createAccount({ ...form, balance: parseFloat(form.balance) });
      }
      setForm({
        name: "",
        type: "bank",
        balance: "",
        currency: "USD",
        country: "USA",
      });
      setShowForm(false);
      loadAccounts();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleEdit = (acc) => {
    setForm({
      name: acc.name,
      type: acc.type,
      balance: String(acc.balance),
      currency: acc.currency,
      country: acc.country,
    });
    setEditingId(acc.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this account?")) return;
    try {
      await deleteAccount(id);
      loadAccounts();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const typeIcons = {
    bank: "🏦",
    investment: "📈",
    credit: "💳",
    loan: "🏠",
    other: "📁",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts</h1>
          <p className="text-slate-500 mt-1">
            Manage your bank accounts, investments, and credit lines
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setForm({
              name: "",
              type: "bank",
              balance: "",
              currency: "USD",
              country: "USA",
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add Account"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Account Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="e.g., Chase Checking"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="bank">Bank Account</option>
                <option value="investment">Investment</option>
                <option value="credit">Credit Card</option>
                <option value="loan">Loan</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Balance
              </label>
              <input
                type="number"
                step="0.01"
                value={form.balance}
                onChange={(e) =>
                  setForm({ ...form, balance: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Currency
              </label>
              <select
                value={form.currency}
                onChange={(e) =>
                  setForm({ ...form, currency: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Country
              </label>
              <select
                value={form.country}
                onChange={(e) =>
                  setForm({ ...form, country: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="USA">USA</option>
                <option value="India">India</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            <Save size={16} />
            {editingId ? "Update Account" : "Save Account"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200">
          No accounts added yet. Click &quot;Add Account&quot; to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{typeIcons[acc.type] || "📁"}</span>
                <div>
                  <h3 className="font-semibold text-slate-900">{acc.name}</h3>
                  <p className="text-xs text-slate-500">
                    {acc.type.toUpperCase()} · {acc.country} · {acc.currency}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold text-slate-900">
                  {formatCurrency(acc.balance, acc.currency)}
                </span>
                <button
                  onClick={() => handleEdit(acc)}
                  className="text-slate-400 hover:text-indigo-500 transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(acc.id)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
