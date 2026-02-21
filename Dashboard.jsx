import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Award,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

import { useAuth  } from '../context/AuthContext';
import {
  accountsAPI,
  transactionsAPI,
  budgetsAPI,
  billsAPI,
  rewardsAPI,
} from '../services/api';

import LoadingSpinner from '../components/common/LoadingSpinner';
import AccountCard from '../components/dashboard/AccountCard';
import TransactionList from '../components/dashboard/TransactionList';
import BudgetProgress from '../components/dashboard/BudgetProgress';

const Dashboard = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [data, setData] = useState({
    accounts: [],
    transactions: [],
    budgets: [],
    bills: { dueSoon: [], overdue: [] },
    rewards: null,
    stats: {
      totalBalance: 0,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      netCashFlow: 0,
    },
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        accountsRes,
        transactionsRes,
        budgetsRes,
        billsDueRes,
        rewardsRes,
      ] = await Promise.all([
        accountsAPI.getAll(),
        transactionsAPI.getAll({ limit: 10 }),
        budgetsAPI.getAll(),
        billsAPI.getDueSoon(7),
        rewardsAPI.getSummary(),
      ]);

      const accounts = accountsRes.data || [];
      const transactions = transactionsRes.data || [];

      const totalBalance = accounts.reduce(
        (sum, acc) => sum + Number(acc.balance || 0),
        0
      );

      const now = new Date();
      const monthlyTx = transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });

      const monthlyIncome = monthlyTx
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const monthlyExpenses = monthlyTx
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const dueSoon = billsDueRes.data || [];
      const overdue = dueSoon.filter(
        (b) => new Date(b.due_date) < new Date() && !b.is_paid
      );

      setData({
        accounts,
        transactions: transactions.slice(0, 5),
        budgets: budgetsRes.data || [],
        bills: { dueSoon, overdue },
        rewards: rewardsRes.data || null,
        stats: {
          totalBalance,
          monthlyIncome,
          monthlyExpenses,
          netCashFlow: monthlyIncome - monthlyExpenses,
        },
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {user?.full_name || user?.username} 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Here’s an overview of your finances
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Balance"
          value={data.stats.totalBalance}
          icon={<CreditCard />}
          positive
        />
        <StatCard
          title="Monthly Income"
          value={data.stats.monthlyIncome}
          icon={<TrendingUp />}
          positive
        />
        <StatCard
          title="Monthly Expenses"
          value={data.stats.monthlyExpenses}
          icon={<TrendingDown />}
        />
        <StatCard
          title="Net Cash Flow"
          value={data.stats.netCashFlow}
          icon={<DollarSign />}
          positive={data.stats.netCashFlow >= 0}
        />
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {data.bills.dueSoon.length > 0 && (
          <AlertCard
            title="Bills Due Soon"
            icon={<Calendar />}
            items={data.bills.dueSoon}
            link="/bills"
            color="yellow"
          />
        )}

        {data.bills.overdue.length > 0 && (
          <AlertCard
            title="Overdue Bills"
            icon={<AlertTriangle />}
            items={data.bills.overdue}
            link="/bills"
            color="red"
          />
        )}

        {data.rewards && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl">
            <div className="flex justify-between mb-2">
              <div className="flex gap-2 items-center">
                <Award /> <h3 className="font-semibold">Reward Points</h3>
              </div>
              <Link to="/rewards" className="text-sm font-medium">
                View
              </Link>
            </div>
            <p className="text-3xl font-bold">
              {data.rewards.total_points?.toLocaleString() || 0}
            </p>
            <p className="text-sm mt-1">
              {data.rewards.current_tier || 'Bronze'} Tier
            </p>
          </div>
        )}
      </div>

      {/* Accounts & Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Section title="Accounts" link="/accounts">
            <div className="grid md:grid-cols-2 gap-4">
              {data.accounts.slice(0, 4).map((a) => (
                <AccountCard key={a.id} account={a} />
              ))}
            </div>
          </Section>
        </div>

        <Section title="Recent Transactions" link="/transactions">
          <TransactionList transactions={data.transactions} />
        </Section>
      </div>

      {/* Budgets */}
      <Section title="Budget Progress" link="/budgets">
        {data.budgets.length ? (
          data.budgets.slice(0, 3).map((b) => (
            <BudgetProgress
                key={b.id}
                budgetId={b.id}
            />
          ))
        ) : (
          <div className="text-center text-gray-500">
            No budgets created yet
          </div>
        )}
      </Section>
    </div>
  );
};

/* 🔹 Reusable components */
const StatCard = ({ title, value, icon, positive }) => (
  <div className="bg-white p-6 rounded-xl shadow">
    <div className="flex justify-between">
      <div>
        <p className="text-sm text-gray-600">{title}</p>
        <p
          className={`text-2xl font-bold mt-1 ${
            positive ? 'text-green-600' : 'text-gray-900'
          }`}
        >
          ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div className="p-3 bg-gray-100 rounded-lg">{icon}</div>
    </div>
  </div>
);

const Section = ({ title, link, children }) => (
  <div className="bg-white rounded-xl shadow">
    <div className="p-6 border-b flex justify-between">
      <h2 className="font-bold">{title}</h2>
      <Link to={link} className="text-blue-600 font-medium">
        View All
      </Link>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const AlertCard = ({ title, icon, items, link, color }) => (
  <div className={`bg-${color}-50 border p-4 rounded-xl`}>
    <div className="flex justify-between mb-2">
      <div className="flex gap-2 items-center">
        {icon} <h3 className="font-semibold">{title}</h3>
      </div>
      <Link to={link} className="text-sm font-medium">
        View
      </Link>
    </div>
    {items.slice(0, 3).map((i) => (
      <div key={i.id} className="flex justify-between bg-white p-2 rounded mb-2">
        <span>{i.name}</span>
        <span>${i.amount}</span>
      </div>
    ))}
  </div>
);

export default Dashboard;
