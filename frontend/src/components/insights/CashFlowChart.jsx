import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ===============================
   SAFE DATA NORMALIZATION
================================ */
const normalizeData = (raw = []) => {
  return raw.map((item, index) => {
    // SAMPLE DATA: { period: "Sep", income, expenses }
    if (item.period) {
      return {
        label: item.period,
        value: item.income - item.expenses,
        income: item.income,
        expenses: item.expenses
      };
    }

    // MONTHLY SUMMARY
    if (item.month_name && item.year) {
      return {
        label: `${item.month_name.slice(0, 3)} ${item.year}`,
        value: item.net_cash_flow,
        income: item.total_income,
        expenses: item.total_expenses
      };
    }

    // BACKEND DATE FORMAT
    if (item.period_start || item.date) {
      const d = new Date(item.period_start || item.date);
      const label = isNaN(d)
        ? `P${index + 1}`
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return {
        label,
        value: item.value ?? item.net_cash_flow ?? 0,
        income: item.income ?? 0,
        expenses: item.expenses ?? 0
      };
    }

    // FALLBACK
    return {
      label: `P${index + 1}`,
      value: item.value ?? 0,
      income: item.income ?? 0,
      expenses: item.expenses ?? 0
    };
  });
};

/* ===============================
   COMPONENT
================================ */
const CashFlowChart = ({ initialData = [] }) => {
  const [chartType, setChartType] = useState('area');
  const [period, setPeriod] = useState('monthly');

  const data = useMemo(() => normalizeData(initialData), [initialData]);

  /* ===============================
     TREND CALCULATION
  ================================ */
  const trend = useMemo(() => {
    if (data.length < 2) return 'stable';
    const last = data[data.length - 1].value;
    const prev = data[data.length - 2].value;
    if (last > prev) return 'up';
    if (last < prev) return 'down';
    return 'stable';
  }, [data]);

  const formatCurrency = (v) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(v);

  const renderChart = () => {
    if (!data.length) {
      return (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          No data available
        </div>
      );
    }

    const common = {
      data,
      margin: { top: 20, right: 30, left: 10, bottom: 10 }
    };

    if (chartType === 'area') {
      return (
        <AreaChart {...common}>
          <defs>
            <linearGradient id="flow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={formatCurrency} />
          <Tooltip formatter={formatCurrency} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            fill="url(#flow)"
            name="Net Cash Flow"
          />
        </AreaChart>
      );
    }

    if (chartType === 'line') {
      return (
        <LineChart {...common}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={formatCurrency} />
          <Tooltip formatter={formatCurrency} />
          <Legend />
          <Line dataKey="income" stroke="#10b981" name="Income" />
          <Line dataKey="expenses" stroke="#ef4444" name="Expenses" />
        </LineChart>
      );
    }

    return (
      <BarChart {...common}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" />
        <YAxis tickFormatter={formatCurrency} />
        <Tooltip formatter={formatCurrency} />
        <Legend />
        <Bar dataKey="income" fill="#10b981" name="Income" />
        <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
      </BarChart>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Cash Flow Overview
          {trend === 'up' && <TrendingUp className="text-green-500 h-4 w-4" />}
          {trend === 'down' && <TrendingDown className="text-red-500 h-4 w-4" />}
          {trend === 'stable' && <Minus className="text-gray-500 h-4 w-4" />}
        </CardTitle>
        <CardDescription>Last periods overview</CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={chartType} onValueChange={setChartType}>
          <div className="flex justify-between mb-4">
            <TabsList>
              <TabsTrigger value="area">Area</TabsTrigger>
              <TabsTrigger value="line">Line</TabsTrigger>
              <TabsTrigger value="bar">Bar</TabsTrigger>
            </TabsList>

            <div className="flex gap-2">
              {['monthly', 'weekly', 'daily'].map(p => (
                <Button
                  key={p}
                  size="sm"
                  variant={period === p ? 'default' : 'outline'}
                  onClick={() => setPeriod(p)}
                >
                  {p[0].toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <TabsContent value={chartType}>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="grid grid-cols-3 text-center border-t pt-4">
        <div>
          <p className="text-sm text-gray-500">Current</p>
          <p className="text-xl font-bold">
            {data.length ? formatCurrency(data[data.length - 1].value) : '$0'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Average</p>
          <p className="text-xl font-bold">
            {data.length
              ? formatCurrency(
                  data.reduce((s, d) => s + d.value, 0) / data.length
                )
              : '$0'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Trend</p>
          <p className="text-xl font-bold capitalize">{trend}</p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default CashFlowChart;
