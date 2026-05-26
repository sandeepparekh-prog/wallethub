import { useState, useEffect, useCallback, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Calendar,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import StatCard from "../components/StatCard";
import {
  fetchSummary,
  fetchByCategory,
  fetchNetWorthTrend,
  fetchTrend,
  fetchTransactions,
} from "../utils/api";
import { formatCurrency, capitalize } from "../utils/format";

const COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

const PERIOD_PRESETS = [
  { label: "This Week", key: "week" },
  { label: "This Month", key: "month" },
  { label: "This Quarter", key: "quarter" },
  { label: "This Year", key: "year" },
  { label: "Last Month", key: "last_month" },
  { label: "Last Quarter", key: "last_quarter" },
  { label: "Last Year", key: "last_year" },
  { label: "All Time", key: "all" },
  { label: "Custom", key: "custom" },
];

function getDateRange(key) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const dow = now.getDay();

  switch (key) {
    case "week": {
      const start = new Date(y, m, d - dow);
      return { from: fmt(start), to: fmt(now) };
    }
    case "month":
      return { from: `${y}-${pad(m + 1)}-01`, to: fmt(now) };
    case "quarter": {
      const qStart = Math.floor(m / 3) * 3;
      return { from: `${y}-${pad(qStart + 1)}-01`, to: fmt(now) };
    }
    case "year":
      return { from: `${y}-01-01`, to: fmt(now) };
    case "last_month": {
      const s = new Date(y, m - 1, 1);
      const e = new Date(y, m, 0);
      return { from: fmt(s), to: fmt(e) };
    }
    case "last_quarter": {
      const cq = Math.floor(m / 3);
      const lqStart = cq === 0 ? 9 : (cq - 1) * 3;
      const lqYear = cq === 0 ? y - 1 : y;
      const s = new Date(lqYear, lqStart, 1);
      const e = new Date(lqYear, lqStart + 3, 0);
      return { from: fmt(s), to: fmt(e) };
    }
    case "last_year":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case "all":
      return { from: undefined, to: undefined };
    default:
      return { from: undefined, to: undefined };
  }
}

function fmt(d) {
  return d.toISOString().split("T")[0];
}
function pad(n) {
  return String(n).padStart(2, "0");
}

export default function Dashboard({ currency }) {
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [investmentCategories, setInvestmentCategories] = useState([]);
  const [netWorthTrend, setNetWorthTrend] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [periodKey, setPeriodKey] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [granularity, setGranularity] = useState("monthly");

  const [drilldown, setDrilldown] = useState(null);
  const [drilldownTxns, setDrilldownTxns] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);

  const dateRange = useMemo(() => periodKey === "custom"
    ? { from: customFrom || undefined, to: customTo || undefined }
    : getDateRange(periodKey), [periodKey, customFrom, customTo]);

  const loadData = useCallback(() => {
    setLoading(true);
    const { from, to } = dateRange;
    Promise.all([
      fetchSummary(currency, from, to),
      fetchByCategory("expense", currency, from, to),
      fetchByCategory("income", currency, from, to),
      fetchByCategory("investment", currency, from, to),
      fetchNetWorthTrend(currency),
      fetchTrend(currency, granularity, from, to),
    ])
      .then(([s, c, ic, inv, nw, tr]) => {
        setSummary(s);
        setCategories(c);
        setIncomeCategories(ic);
        setInvestmentCategories(inv);
        setNetWorthTrend(nw);
        setTrendData(tr);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currency, granularity, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDrilldown = useCallback((type, categoryName) => {
    setDrilldown({ type, category: categoryName });
    setDrilldownLoading(true);
    const { from, to } = dateRange;
    const params = { type, category: categoryName, limit: 100 };
    if (from) params.from = from;
    if (to) params.to = to;
    fetchTransactions(params)
      .then(setDrilldownTxns)
      .catch(console.error)
      .finally(() => setDrilldownLoading(false));
  }, [dateRange]);


  const closeDrilldown = () => {
    setDrilldown(null);
    setDrilldownTxns([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-20">
        <Wallet size={48} className="mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-700">No financial data yet</h2>
        <p className="text-slate-500 mt-2">Upload documents or add transactions to get started.</p>
      </div>
    );
  }

  const periodLabel = PERIOD_PRESETS.find((p) => p.key === periodKey)?.label || "All Time";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Dashboard</h1>
          <p className="text-slate-500 mt-1">
            {periodLabel} {dateRange.from && dateRange.to ? `(${dateRange.from} to ${dateRange.to})` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value)}
              className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white appearance-none cursor-pointer"
            >
              {PERIOD_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {periodKey === "custom" && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
              />
            </>
          )}

          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Savings" value={summary.savings} currency={currency} icon={Wallet} color="indigo" />
        <StatCard title="Income" value={summary.total_income} currency={currency} icon={TrendingUp} color="green" />
        <StatCard title="Expenses" value={summary.total_expenses} currency={currency} icon={TrendingDown} color="red" />
        <StatCard title="Investments" value={summary.total_investments} currency={currency} icon={PiggyBank} color="amber" />
      </div>

      {drilldown && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={closeDrilldown} className="text-slate-400 hover:text-slate-600">
              <ArrowLeft size={18} />
            </button>
            <h3 className="font-semibold text-slate-800">
              {capitalize(drilldown.type)}: {capitalize(drilldown.category)}
            </h3>
            <span className="text-sm text-slate-400">({drilldownTxns.length} transactions)</span>
          </div>
          {drilldownLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Vendor</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drilldownTxns.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-600">{t.date}</td>
                      <td className="px-3 py-2 text-slate-900">{t.description || "\u2014"}</td>
                      <td className="px-3 py-2 text-slate-600">{t.vendor || "\u2014"}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(t.amount, t.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {trendData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">
            Income vs Expenses ({capitalize(granularity)})
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                formatter={(val) => formatCurrency(val, currency)}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
              />
              <Legend />
              <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
              <Bar dataKey="investment" fill="#f59e0b" name="Investments" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {netWorthTrend.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Net Worth Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={netWorthTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                formatter={(val) => formatCurrency(val, currency)}
                contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
              />
              <Area type="monotone" dataKey="net_worth" stroke="#6366f1" fill="#eef2ff" strokeWidth={2} name="Net Worth" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {categories.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Expense Breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categories.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  onClick={(entry) => handleDrilldown("expense", entry.name)}
                  style={{ cursor: "pointer" }}
                >
                  {categories.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatCurrency(val, currency)} />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 text-center mt-2">Click a slice to see transactions</p>
          </div>
        )}

        {incomeCategories.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Income Sources</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={incomeCategories.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  onClick={(entry) => handleDrilldown("income", entry.name)}
                  style={{ cursor: "pointer" }}
                >
                  {incomeCategories.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatCurrency(val, currency)} />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 text-center mt-2">Click a slice to see transactions</p>
          </div>
        )}

        {investmentCategories.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Investment Allocation</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={investmentCategories.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  onClick={(entry) => handleDrilldown("investment", entry.name)}
                  style={{ cursor: "pointer" }}
                >
                  {investmentCategories.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatCurrency(val, currency)} />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 text-center mt-2">Click a slice to see transactions</p>
          </div>
        )}
      </div>

      {(categories.length > 0 || incomeCategories.length > 0) && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Category Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-600 mb-2">Expenses</h4>
                <div className="space-y-1">
                  {categories.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleDrilldown("expense", c.name)}
                      className="flex justify-between w-full px-3 py-1.5 rounded hover:bg-slate-50 text-sm text-left"
                    >
                      <span className="text-slate-700">{capitalize(c.name)}</span>
                      <span className="font-medium text-slate-900">{formatCurrency(c.value, currency)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {incomeCategories.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-emerald-600 mb-2">Income</h4>
                <div className="space-y-1">
                  {incomeCategories.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleDrilldown("income", c.name)}
                      className="flex justify-between w-full px-3 py-1.5 rounded hover:bg-slate-50 text-sm text-left"
                    >
                      <span className="text-slate-700">{capitalize(c.name)}</span>
                      <span className="font-medium text-slate-900">{formatCurrency(c.value, currency)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {investmentCategories.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-600 mb-2">Investments</h4>
                <div className="space-y-1">
                  {investmentCategories.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => handleDrilldown("investment", c.name)}
                      className="flex justify-between w-full px-3 py-1.5 rounded hover:bg-slate-50 text-sm text-left"
                    >
                      <span className="text-slate-700">{capitalize(c.name)}</span>
                      <span className="font-medium text-slate-900">{formatCurrency(c.value, currency)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
