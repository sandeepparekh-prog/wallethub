import { useState, useEffect, useCallback } from "react";
import {
  fetchVendorRules,
  createVendorRule,
  deleteVendorRule,
} from "../utils/api";
import { capitalize } from "../utils/format";
import { Plus, Trash2, X, Tag } from "lucide-react";

export default function VendorRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    vendor_pattern: "",
    vendor_name: "",
    category: "",
    type: "expense",
  });
  const [search, setSearch] = useState("");

  const loadRules = useCallback(() => {
    setLoading(true);
    fetchVendorRules()
      .then(setRules)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createVendorRule(form);
      setForm({ vendor_pattern: "", vendor_name: "", category: "", type: "expense" });
      setShowForm(false);
      loadRules();
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this vendor rule?")) return;
    try {
      await deleteVendorRule(id);
      loadRules();
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

  const filtered = search
    ? rules.filter(
        (r) =>
          r.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
          r.vendor_pattern.toLowerCase().includes(search.toLowerCase()) ||
          r.category.toLowerCase().includes(search.toLowerCase())
      )
    : rules;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendor Rules</h1>
          <p className="text-slate-500 mt-1">
            Define rules to auto-categorize transactions by vendor. {rules.length} rules configured.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add Rule"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Pattern (match text in description)
              </label>
              <input
                type="text"
                value={form.vendor_pattern}
                onChange={(e) => setForm({ ...form, vendor_pattern: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder='e.g., "walmart", "netflix", "uber eats"'
                required
              />
              <p className="text-xs text-slate-400 mt-1">Case-insensitive. Supports regex.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Vendor Name
              </label>
              <input
                type="text"
                value={form.vendor_name}
                onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="e.g., Walmart, Netflix"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                placeholder="e.g., groceries, subscriptions"
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
          </div>
          <button
            type="submit"
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            Save Rule
          </button>
        </form>
      )}

      <div>
        <input
          type="text"
          placeholder="Search rules..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Tag size={32} className="mx-auto text-slate-300 mb-3" />
            <p>No vendor rules found.</p>
            <p className="text-sm mt-1">Add rules to auto-categorize imported transactions.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Pattern</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Vendor Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono text-slate-700">{r.vendor_pattern}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{r.vendor_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{capitalize(r.category)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[r.type] || "bg-slate-100 text-slate-600"}`}>
                      {capitalize(r.type)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
