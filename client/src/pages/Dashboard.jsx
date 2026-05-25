import { useState, useEffect } from "react";
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
  DollarSign,
  IndianRupee,
} from "lucide-react";
import StatCard from "../components/StatCard";
import {
  fetchSummary,
  fetchMonthly,
  fetchByCategory,
  fetchNetWorthTrend,
  fetchByCountry,
} from "../utils/api";
import { formatCurrency } from "../utils/format";

const COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#84cc16",
];

export default function Dashboard({ currency }) {
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [categories, setCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [netWorthTrend, setNetWorthTrend] = useState([]);
  const [countryData, setCountryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchSummary(currency),
      fetchMonthly(currency),
      fetchByCategory("expense", currency),
      fetchByCategory("income", currency),
      fetchNetWorthTrend(currency),
      fetchByCountry(currency),
    ])
      .then(([s, m, c, ic, nw, cd]) => {
        if (cancelled) return;
        setSummary(s);
        setMonthly(m);
        setCategories(c);
        setIncomeCategories(ic);
        setNetWorthTrend(nw);
        setCountryData(cd);
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [currency]);

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
        <h2 className="text-xl font-semibold text-slate-700">
          No financial data yet
        </h2>
        <p className="text-slate-500 mt-2">
          Upload documents or add transactions to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Financial Dashboard
        </h1>
        <p className="text-slate-500 mt-1">
          Your consolidated net worth overview
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Net Worth"
          value={summary.net_worth}
          currency={currency}
          icon={Wallet}
          color="indigo"
        />
        <StatCard
          title="Total Income"
          value={summary.total_income}
          currency={currency}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          title="Total Expenses"
          value={summary.total_expenses}
          currency={currency}
          icon={TrendingDown}
          color="red"
        />
        <StatCard
          title="Investments"
          value={summary.total_investments}
          currency={currency}
          icon={PiggyBank}
          color="amber"
        />
      </div>

      {countryData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={20} className="text-blue-600" />
              <h3 className="font-semibold text-slate-800">USA Holdings</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Account Balances</span>
                <span className="font-medium">
                  {formatCurrency(countryData.usa.account_balance, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Investments</span>
                <span className="font-medium">
                  {formatCurrency(countryData.usa.investments, currency)}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <IndianRupee size={20} className="text-orange-600" />
              <h3 className="font-semibold text-slate-800">India Holdings</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Account Balances</span>
                <span className="font-medium">
                  {formatCurrency(countryData.india.account_balance, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Investments</span>
                <span className="font-medium">
                  {formatCurrency(countryData.india.investments, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {netWorthTrend.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">
            Net Worth Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={netWorthTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                formatter={(val) => formatCurrency(val, currency)}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              />
              <Area
                type="monotone"
                dataKey="net_worth"
                stroke="#6366f1"
                fill="#eef2ff"
                strokeWidth={2}
                name="Net Worth"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {monthly.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">
            Monthly Income vs Expenses
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
              <Tooltip
                formatter={(val) => formatCurrency(val, currency)}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              />
              <Legend />
              <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
              <Bar dataKey="investment" fill="#f59e0b" name="Investments" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">
              Expense Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categories.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {categories.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatCurrency(val, currency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {incomeCategories.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4">
              Income Sources
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={incomeCategories.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} (${(percent * 100).toFixed(0)}%)`
                  }
                >
                  {incomeCategories.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => formatCurrency(val, currency)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
