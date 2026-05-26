import { useState, useEffect, useCallback } from "react";
import {
  fetchTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  applyVendorRule,
} from "../utils/api";
import { formatCurrency, formatDate, capitalize } from "../utils/format";
import { Plus, Trash2, Filter, X, Pencil, Check, Tag, Search } from "lucide-react";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filter, setFilter] = useState({ type: "", category: "", from: "", to: "", vendor: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: "",
    currency: "USD",
    category: "",
    type: "expense",
    source: "manual",
    vendor: "",
  });

  const loadTransactions = useCallback(() => {
    setLoading(true);
    const params = {};
    if (filter.type) params.type = filter.type;
    if (filter.category) params.category = filter.category;
    if (filter.from) params.from = filter.from;
    if (filter.to) params.to = filter.to;
    if (filter.vendor) params.vendor = filter.vendor;
    fetchTransactions(params)
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createTransaction({ ...form, amount: parseFloat(form.amount) });
      setForm({
        date: new Date().toISOString().split("T")[0],
        description: "",
        amount: "",
        currency: "USD",
        category: "",
        type: "expense",
        source: "manual",
        vendor: "",
      });
      setShowForm(false);
      loadTransactions();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      await deleteTransaction(id);
      loadTransactions();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditForm({
      description: t.description || "",
      amount: t.amount,
      currency: t.currency,
      category: t.category,
      type: t.type,
      vendor: t.vendor || "",
      date: t.date,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id) => {
    try {
      await updateTransaction(id, editForm);
      setEditingId(null);
      setEditForm({});
      loadTransactions();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleApplyVendorRule = async (id) => {
    try {
      const result = await applyVendorRule(id, true);
      const msg = result.matchesUpdated > 0
        ? `Updated ${result.matchesUpdated} similar transactions with the same vendor rule.`
        : "Vendor rule saved. Similar transactions will be categorized automatically on future imports.";
      alert(msg);
      loadTransactions();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const typeColors = {
    income: "bg-emerald-100 text-emerald-700",
    expense: "bg-red-100 text-red-700",
    investment: "bg-amber-100 text-amber-700",
    transfer: "bg-blue-100 text-blue-700",
  };

  const clearFilters = () => {
    setFilter({ type: "", category: "", from: "", to: "", vendor: "" });
  };

  const hasActiveFilters = filter.type || filter.category || filter.from || filter.to || filter.vendor;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 mt-1">
            {transactions.length} records found
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasActiveFilters
                ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Filter size={16} />
            Filters
            {hasActiveFilters && (
              <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {[filter.type, filter.category, filter.from, filter.to, filter.vendor].filter(Boolean).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cancel" : "Add Transaction"}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-700">Filter Transactions</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-indigo-600 hover:underline">
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white"
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="investment">Investment</option>
              <option value="transfer">Transfer</option>
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Category..."
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Vendor..."
                value={filter.vendor}
                onChange={(e) => setFilter({ ...filter, vendor: e.target.value })}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>
            <input
              type="date"
              value={filter.from}
              onChange={(e) => setFilter({ ...filter, from: e.target.value })}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              placeholder="From"
            />
            <input
              type="date"
              value={filter.to}
              onChange={(e) => setFilter({ ...filter, to: e.target.value })}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
              placeholder="To"
            />
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="investment">Investment</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (&#8377;)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="e.g., salary, rent, SIP"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vendor</label>
              <input
                type="text"
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="e.g., Amazon, Walmart"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="Optional details"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Save Transaction
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            No transactions found. Add some or upload a document.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    {editingId === t.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            value={editForm.date}
                            onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.vendor}
                            onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editForm.category}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-full px-2 py-1 border border-slate-300 rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editForm.type}
                            onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                            className="px-2 py-1 border border-slate-300 rounded text-sm"
                          >
                            <option value="income">Income</option>
                            <option value="expense">Expense</option>
                            <option value="investment">Investment</option>
                            <option value="transfer">Transfer</option>
                          </select>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.amount}
                            onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                            className="w-24 px-2 py-1 border border-slate-300 rounded text-sm text-right"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => saveEdit(t.id)}
                              className="text-emerald-600 hover:text-emerald-700 p-1"
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-slate-400 hover:text-slate-600 p-1"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatDate(t.date)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900 max-w-xs truncate">
                          {t.description || "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {t.vendor || "\u2014"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {capitalize(t.category)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[t.type] || "bg-slate-100 text-slate-600"}`}>
                            {capitalize(t.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {formatCurrency(t.amount, t.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => startEdit(t)}
                              className="text-slate-400 hover:text-indigo-500 transition-colors p-1"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            {t.vendor && (
                              <button
                                onClick={() => handleApplyVendorRule(t.id)}
                                className="text-slate-400 hover:text-amber-500 transition-colors p-1"
                                title="Apply category to all transactions from this vendor"
                              >
                                <Tag size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(t.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
