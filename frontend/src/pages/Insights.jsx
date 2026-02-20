import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  AlertTriangle,
  RefreshCw,
  Download,
  Target,
  Zap,
  Eye,
  Filter,
} from 'lucide-react';
import CashFlowChart from '../components/insights/CashFlowChart';
import BurnRateCard from '../components/insights/BurnRateCard';
import TopMerchants from '../components/insights/TopMerchants';
import  insightService  from '../services/insightService';
import  alertService  from '../services/alertService';
import { toast } from 'sonner';

const SAMPLE_INSIGHTS = {
  total_income: 120000,
  total_expenses: 85000,
  net_cash_flow: 35000,
  savings_rate: 29.2,
  cash_flow_trend: 'increasing',
  month_over_month_growth: 8.5,
  income_transaction_count: 42,
  expense_transaction_count: 87,
  most_frequent_category: 'Food',
  category_breakdown: [
    { category: 'Food', amount: 28000, percentage: 33, transaction_count: 45 },
    { category: 'Rent', amount: 36000, percentage: 42, transaction_count: 6 },
    { category: 'Transport', amount: 9000, percentage: 11, transaction_count: 18 },
    { category: 'Entertainment', amount: 12000, percentage: 14, transaction_count: 18 },
  ]
};

const SAMPLE_CASHFLOW = [
  { period: 'Sep', income: 18000, expenses: 14000 },
  { period: 'Oct', income: 20000, expenses: 15000 },
  { period: 'Nov', income: 22000, expenses: 16000 },
  { period: 'Dec', income: 25000, expenses: 18000 },
  { period: 'Jan', income: 26000, expenses: 19000 },
  { period: 'Feb', income: 28000, expenses: 20000 },
];

const SAMPLE_MONTHLY = [
  {
    month_name: 'September',
    year: 2025,
    total_income: 18000,
    total_expenses: 14000,
    net_cash_flow: 4000,
    savings_rate: 22,
    transaction_count: 35,
  },
  {
    month_name: 'October',
    year: 2025,
    total_income: 20000,
    total_expenses: 15000,
    net_cash_flow: 5000,
    savings_rate: 25,
    transaction_count: 38,
  },
];

const SAMPLE_PREDICTIONS = Array.from({ length: 7 }).map((_, i) => ({
  date: new Date(Date.now() + i * 86400000).toISOString(),
  predicted_income: 900,
  predicted_expenses: 650,
  predicted_net_flow: 250,
}));


const Insights = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState(null);
  const [cashFlowData, setCashFlowData] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [spendingHabits, setSpendingHabits] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [timeFrame, setTimeFrame] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchInsightsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch cash flow insights
      const cashFlowResponse = await insightService.getCashFlowInsights({
        time_range: timeFrame
      });
      setInsights(cashFlowResponse.data);
      
      // Fetch trend data for chart
      const trendResponse = await insightService.getTrendInsights({
        metric: 'net_flow',
        period: 'monthly',
        months: 6
      });
      setCashFlowData(trendResponse.data);
      
      // Fetch monthly summary
      const monthlyResponse = await insightService.getMonthlySummary({
        months: 6
      });
      setMonthlySummary(monthlyResponse.data);
      
      // Fetch anomalies
      const anomaliesResponse = await insightService.getAnomalies();
      setAnomalies(anomaliesResponse.data?.anomalies || []);
      
      // Fetch predictions
      const predictionsResponse = await insightService.getPredictions();
      setPredictions(predictionsResponse.data?.predictions || []);
      
      // Fetch spending habits
      const habitsResponse = await insightService.getSpendingHabits({
        time_range: '90d'
      });
      setSpendingHabits(habitsResponse.data);
      
      // Fetch recent alerts
      const alertsResponse = await alertService.getAlerts({
        limit: 5,
        unread_only: true
      });
      setAlerts(alertsResponse.data?.alerts || []);
      
    } catch (error) {
      console.warn('Using sample insights data');

      setInsights(SAMPLE_INSIGHTS);
      setCashFlowData(SAMPLE_CASHFLOW);
      setMonthlySummary(SAMPLE_MONTHLY);
      setPredictions(SAMPLE_PREDICTIONS);
      setAnomalies([]);
      setSpendingHabits({
        strength_score: 0.82,
        habits: {
          weekday_spending: {
            Monday: 1200,
            Tuesday: 1500,
            Wednesday: 1300,
            Thursday: 1700,
            Friday: 2200,
            Saturday: 2800,
            Sunday: 2000,
          },
          time_of_day: {
            morning: 1800,
            afternoon: 3200,
            evening: 4500,
            night: 900,
          },
        },
        insights: [
          'Spending peaks on weekends',
          'Evening spending is highest',
          'Food is the dominant category',
        ],
      });

      toast.info('Loaded sample insights data');
    } finally {
      setLoading(false);
    }
  }, [timeFrame]);
  useEffect(() => {
    fetchInsightsData();
  }, [fetchInsightsData]);

  const handleRefresh = () => {
    fetchInsightsData();
    toast.success('Insights refreshed');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value?.toFixed(1) || '0.0'}%`;
  };

  const getTrendIcon = (value) => {
    if (!value) return null;
    return value > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getTrendColor = (value) => {
    if (!value) return 'text-gray-600';
    return value > 0 ? 'text-green-600' : 'text-red-600';
  };

  const renderOverviewCards = () => {
    if (!insights) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {formatCurrency(insights.total_income)}
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(insights.month_over_month_growth)}
                <span className={`text-sm ${getTrendColor(insights.month_over_month_growth)}`}>
                  {formatPercentage(insights.month_over_month_growth)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {insights.income_transaction_count} transactions
            </p>
          </CardContent>
        </Card>

        {/* Total Expenses Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {formatCurrency(insights.total_expenses)}
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(-insights.month_over_month_growth)}
                <span className={`text-sm ${getTrendColor(-insights.month_over_month_growth)}`}>
                  {formatPercentage(-insights.month_over_month_growth)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {insights.expense_transaction_count} transactions
            </p>
          </CardContent>
        </Card>

        {/* Net Cash Flow Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Net Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-2xl font-bold ${
                insights.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(insights.net_cash_flow)}
              </div>
              <Badge variant={
                insights.cash_flow_trend === 'increasing' ? 'success' :
                insights.cash_flow_trend === 'decreasing' ? 'destructive' : 'secondary'
              }>
                {insights.cash_flow_trend}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Cash flow {insights.cash_flow_trend}
            </p>
          </CardContent>
        </Card>

        {/* Savings Rate Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Savings Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                {formatPercentage(insights.savings_rate)}
              </div>
              <div className={`p-2 rounded-lg ${
                insights.savings_rate >= 20 ? 'bg-green-100 text-green-600' :
                insights.savings_rate >= 10 ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                {insights.savings_rate >= 20 ? <Zap className="h-4 w-4" /> :
                 insights.savings_rate >= 10 ? <Target className="h-4 w-4" /> :
                 <AlertTriangle className="h-4 w-4" />}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {insights.savings_rate >= 20 ? 'Excellent' :
               insights.savings_rate >= 10 ? 'Good' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAlertsSection = () => {
    if (alerts.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Recent Alerts
          </CardTitle>
          <CardDescription>
            {alerts.length} unread alert{alerts.length !== 1 ? 's' : ''} requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.slice(0, 3).map(alert => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/alerts`)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-600' :
                    alert.severity === 'warning' ? 'bg-orange-100 text-orange-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-sm text-gray-500">{alert.message}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/alerts')}
          >
            View All Alerts
          </Button>
        </CardFooter>
      </Card>
    );
  };

  const renderAnomaliesSection = () => {
    if (anomalies.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Unusual Transactions
          </CardTitle>
          <CardDescription>
            {anomalies.length} unusual transaction{anomalies.length !== 1 ? 's' : ''} detected
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {anomalies.slice(0, 3).map(anomaly => (
              <div key={anomaly.transaction_id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{anomaly.description}</p>
                    <p className="text-sm text-gray-500">{anomaly.category} • {anomaly.reason}</p>
                  </div>
                  <Badge variant="destructive">
                    {formatCurrency(anomaly.amount)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/reports')}
          >
            View Full Report
          </Button>
        </CardFooter>
      </Card>
    );
  };

  const renderPredictionsSection = () => {
    if (predictions.length === 0) return null;

    const totalPredicted = predictions.reduce((sum, p) => sum + (p.predicted_net_flow || 0), 0);
    const avgPredicted = totalPredicted / predictions.length;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            30-Day Forecast
          </CardTitle>
          <CardDescription>
            Projected cash flow based on historical data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-3xl font-bold">
                {formatCurrency(avgPredicted)}
              </p>
              <p className="text-sm text-gray-500">Average daily projection</p>
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {predictions.slice(0, 7).map((prediction, index) => (
                <div
                  key={index}
                  className="text-center"
                  title={`${prediction.date}: ${formatCurrency(prediction.predicted_net_flow || 0)}`}
                >
                  <div className={`h-8 rounded ${
                    (prediction.predicted_net_flow || 0) > 0 ? 'bg-green-100' :
                    (prediction.predicted_net_flow || 0) < 0 ? 'bg-red-100' :
                    'bg-gray-100'
                  }`} />
                  <p className="text-xs mt-1">
                    {new Date(prediction.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setActiveTab('forecast')}
          >
            View Detailed Forecast
          </Button>
        </CardFooter>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[400px]" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Insights</h1>
          <p className="text-gray-500">
            Analyze your cash flow, spending patterns, and financial health
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/reports')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Time Frame Selector */}
      <div className="flex items-center gap-2 mb-6">
        <Button
          variant={timeFrame === '7d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeFrame('7d')}
        >
          Last 7 days
        </Button>
        <Button
          variant={timeFrame === '30d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeFrame('30d')}
        >
          Last 30 days
        </Button>
        <Button
          variant={timeFrame === '90d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeFrame('90d')}
        >
          Last 90 days
        </Button>
        <Button
          variant={timeFrame === 'year' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeFrame('year')}
        >
          This Year
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:grid-cols-6">
          <TabsTrigger value="overview">
            <Eye className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="cashflow">
            <TrendingUp className="h-4 w-4 mr-2" />
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="spending">
            <PieChart className="h-4 w-4 mr-2" />
            Spending
          </TabsTrigger>
          <TabsTrigger value="habits">
            <BarChart3 className="h-4 w-4 mr-2" />
            Habits
          </TabsTrigger>
          <TabsTrigger value="forecast">
            <Target className="h-4 w-4 mr-2" />
            Forecast
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <Filter className="h-4 w-4 mr-2" />
            Analysis
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          {renderOverviewCards()}

          {/* Charts and Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CashFlowChart
                initialData={cashFlowData}
                timeRange={timeFrame}
              />
            </div>
            
            <div className="space-y-6">
              {renderAlertsSection()}
              {renderAnomaliesSection()}
              {renderPredictionsSection()}
            </div>
          </div>

          {/* Monthly Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Summary</CardTitle>
              <CardDescription>
                Last 6 months of financial performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 font-medium text-gray-500">Month</th>
                      <th className="text-left py-3 font-medium text-gray-500">Income</th>
                      <th className="text-left py-3 font-medium text-gray-500">Expenses</th>
                      <th className="text-left py-3 font-medium text-gray-500">Net Flow</th>
                      <th className="text-left py-3 font-medium text-gray-500">Savings Rate</th>
                      <th className="text-left py-3 font-medium text-gray-500">Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummary.slice().reverse().map((month, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <div className="font-medium">{month.month_name} {month.year}</div>
                        </td>
                        <td className="py-3">
                          <div className="font-medium text-green-600">
                            {formatCurrency(month.total_income)}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="font-medium text-red-600">
                            {formatCurrency(month.total_expenses)}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className={`font-medium ${
                            month.net_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(month.net_cash_flow)}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="font-medium">
                            {formatPercentage(month.savings_rate)}
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="text-gray-600">
                            {month.transaction_count}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-6">
          <CashFlowChart
            initialData={cashFlowData}
            timeRange={timeFrame}
          />
          
          <BurnRateCard />
        </TabsContent>

        {/* Spending Tab */}
        <TabsContent value="spending" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopMerchants limit={8} timeRange={timeFrame} />
            
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Where your money is going</CardDescription>
              </CardHeader>
              <CardContent>
                {insights?.category_breakdown?.length > 0 ? (
                  <div className="space-y-4">
                    {insights.category_breakdown.slice(0, 8).map((category, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: `hsl(${index * 40}, 70%, 60%)`
                              }}
                            />
                            <span className="font-medium">{category.category}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(category.amount)}</div>
                            <div className="text-sm text-gray-500">
                              {category.percentage.toFixed(1)}% • {category.transaction_count} transactions
                            </div>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${category.percentage}%`,
                              backgroundColor: `hsl(${index * 40}, 70%, 60%)`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No category data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Habits Tab */}
        <TabsContent value="habits" className="space-y-6">
          {spendingHabits ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Spending Habits Analysis</CardTitle>
                  <CardDescription>
                    Pattern strength: {spendingHabits.strength_score}/1.0
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Weekday Spending */}
                  <div className="mb-6">
                    <h3 className="font-medium mb-3">Weekday Spending Pattern</h3>
                    <div className="grid grid-cols-7 gap-2">
                      {Object.entries(spendingHabits.habits?.weekday_spending || {}).map(([day, amount]) => (
                        <div key={day} className="text-center">
                          <div className="text-xs text-gray-500 mb-1">
                            {day.slice(0, 3)}
                          </div>
                          <div className="text-lg font-medium">
                            {formatCurrency(amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Time of Day */}
                  <div className="mb-6">
                    <h3 className="font-medium mb-3">Time of Day Spending</h3>
                    <div className="grid grid-cols-4 gap-4">
                      {Object.entries(spendingHabits.habits?.time_of_day || {}).map(([time, amount]) => (
                        <div key={time} className="text-center p-3 border rounded-lg">
                          <div className="text-sm font-medium capitalize">{time}</div>
                          <div className="text-2xl font-bold">
                            {formatCurrency(amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Insights */}
                  {spendingHabits.insights && spendingHabits.insights.length > 0 && (
                    <div className="border-t pt-6">
                      <h3 className="font-medium mb-3">Key Insights</h3>
                      <ul className="space-y-2">
                        {spendingHabits.insights.map((insight, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div className="mt-1">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                            </div>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Spending Habits</CardTitle>
                <CardDescription>Loading habits analysis...</CardDescription>
              </CardHeader>
            </Card>
          )}
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>30-Day Cash Flow Forecast</CardTitle>
              <CardDescription>
                Based on historical patterns and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              {predictions.length > 0 ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-sm text-gray-500">Avg Daily Income</div>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(
                          predictions.reduce((sum, p) => sum + (p.predicted_income || 0), 0) / predictions.length
                        )}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-sm text-gray-500">Avg Daily Expenses</div>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(
                          predictions.reduce((sum, p) => sum + (p.predicted_expenses || 0), 0) / predictions.length
                        )}
                      </div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-sm text-gray-500">Projected Net</div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(
                          predictions.reduce((sum, p) => sum + (p.predicted_net_flow || 0), 0) / predictions.length
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Forecast Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 font-medium text-gray-500">Date</th>
                          <th className="text-left py-3 font-medium text-gray-500">Predicted Income</th>
                          <th className="text-left py-3 font-medium text-gray-500">Predicted Expenses</th>
                          <th className="text-left py-3 font-medium text-gray-500">Net Flow</th>
                          <th className="text-left py-3 font-medium text-gray-500">Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {predictions.map((prediction, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="py-3">
                              {new Date(prediction.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                              {prediction.is_weekend && (
                                <Badge variant="outline" className="ml-2">Weekend</Badge>
                              )}
                            </td>
                            <td className="py-3 text-green-600">
                              {formatCurrency(prediction.predicted_income || 0)}
                            </td>
                            <td className="py-3 text-red-600">
                              {formatCurrency(prediction.predicted_expenses || 0)}
                            </td>
                            <td className="py-3 font-medium">
                              {formatCurrency(prediction.predicted_net_flow || 0)}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500"
                                    style={{
                                      width: `${Math.min(100, (
                                        (prediction.confidence_interval_high || 0) - 
                                        (prediction.confidence_interval_low || 0)
                                      ) / 1000 * 100)}%`
                                    }}
                                  />
                                </div>
                                <span className="text-sm text-gray-500">
                                  ±{formatCurrency(
                                    ((prediction.confidence_interval_high || 0) - 
                                     (prediction.confidence_interval_low || 0)) / 2
                                  )}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No forecast data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Anomalies */}
            <Card>
              <CardHeader>
                <CardTitle>Anomaly Detection</CardTitle>
                <CardDescription>
                  Unusual transactions identified
                </CardDescription>
              </CardHeader>
              <CardContent>
                {anomalies.length > 0 ? (
                  <div className="space-y-4">
                    {anomalies.slice(0, 5).map((anomaly, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{anomaly.description}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              {anomaly.category} • {new Date(anomaly.date).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge variant="destructive">
                            {formatCurrency(anomaly.amount)}
                          </Badge>
                        </div>
                        <div className="mt-3">
                          <div className="text-sm font-medium">{anomaly.reason}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Deviation score: {anomaly.deviation_score.toFixed(2)}
                          </div>
                        </div>
                        {anomaly.suggested_action && (
                          <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                            💡 {anomaly.suggested_action}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No anomalies detected
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>
                  Suggestions for improving your financial health
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights?.savings_rate < 10 && (
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Target className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Increase Savings Rate</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Your current savings rate is {formatPercentage(insights.savings_rate)}. 
                            Aim for at least 10-20% to build financial security.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {insights?.total_expenses > insights?.total_income * 0.8 && (
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Reduce High Spending</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Your expenses are {formatPercentage((insights.total_expenses / insights.total_income) * 100)} of your income. 
                            Consider reviewing discretionary spending.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {insights?.most_frequent_category && (
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <PieChart className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">Review {insights.most_frequent_category} Spending</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            This is your most frequent spending category. 
                            Consider setting a budget for better control.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">Track Progress Monthly</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Review your monthly summaries regularly to track progress 
                          toward your financial goals.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default Insights;