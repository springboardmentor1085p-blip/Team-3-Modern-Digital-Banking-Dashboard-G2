import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Flame, 
  AlertTriangle, 
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  Zap
} from 'lucide-react';
import  insightService  from '../../services/insightService';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

const BurnRateCard = () => {
  const [loading, setLoading] = useState(true);
  const [burnRate, setBurnRate] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [timeFrame, setTimeFrame] = useState('month');


  const fetchBurnRateData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await insightService.getMonthlySummary(
        new Date().getFullYear(),
        12
      );
      
      if (response.data) {
        setMonthlyData(response.data);
        calculateBurnRate(response.data);
      }
    } catch (error) {
      console.error('Error fetching burn rate data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBurnRateData();
  }, [fetchBurnRateData]);

  const calculateBurnRate = (data) => {
    if (!data || data.length === 0) {
      setBurnRate(null);
      return;
    }

    // Get current month data or latest available
    const currentMonthIndex = data.length - 1;
    const currentMonth = data[currentMonthIndex];
    
    if (!currentMonth) {
      setBurnRate(null);
      return;
    }

    const dailySpend = currentMonth.avg_daily_spend;
    const totalExpenses = currentMonth.total_expenses;
    const totalIncome = currentMonth.total_income;
    const daysInMonth = new Date(
      currentMonth.year,
      currentMonth.month,
      0
    ).getDate();
    
    // Calculate days passed in current month
    const today = new Date();
    const daysPassed = Math.min(today.getDate(), daysInMonth);
    
    // Projected monthly spend
    const projectedMonthlySpend = dailySpend * daysInMonth;
    
    // Monthly burn rate (expenses vs income)
    const monthlyBurnRate = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
    
    // Runway calculation (how many months can you survive with current savings)
    const avgMonthlyNet = data.reduce((sum, month) => {
      return sum + (month.total_income - month.total_expenses);
    }, 0) / data.length;
    
    // Assuming current savings = average net * number of months
    const currentSavings = avgMonthlyNet * 3; // Simplified
    const runwayMonths = avgMonthlyNet < 0 
      ? 0 
      : currentSavings / Math.abs(avgMonthlyNet);
    
    setBurnRate({
      dailySpend,
      totalExpenses,
      totalIncome,
      daysPassed,
      daysInMonth,
      projectedMonthlySpend,
      monthlyBurnRate,
      currentSavings,
      runwayMonths,
      netCashFlow: currentMonth.net_cash_flow,
      savingsRate: currentMonth.savings_rate
    });
  };

  const getBurnRateStatus = () => {
    if (!burnRate) return 'stable';
    
    if (burnRate.monthlyBurnRate > 90) return 'critical';
    if (burnRate.monthlyBurnRate > 75) return 'high';
    if (burnRate.monthlyBurnRate > 50) return 'warning';
    return 'good';
  };

  const getStatusColor = () => {
    const status = getBurnRateStatus();
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getStatusIcon = () => {
    const status = getBurnRateStatus();
    switch (status) {
      case 'critical': 
      case 'high':
        return <Flame className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getStatusText = () => {
    const status = getBurnRateStatus();
    switch (status) {
      case 'critical': return 'Critical Burn Rate';
      case 'high': return 'High Burn Rate';
      case 'warning': return 'Moderate Burn Rate';
      default: return 'Healthy Burn Rate';
    }
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
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!burnRate) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Burn Rate Analysis</CardTitle>
          <CardDescription>No data available for analysis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getStatusColor()}`}>
              {getStatusIcon()}
            </div>
            <div>
              <CardTitle>Burn Rate Analysis</CardTitle>
              <CardDescription>{getStatusText()}</CardDescription>
            </div>
          </div>
          <Badge variant={getBurnRateStatus() === 'good' ? 'success' : 'destructive'}>
            {formatPercentage(burnRate.monthlyBurnRate)} Burn Rate
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Monthly Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Month Progress</span>
            </div>
            <span className="text-sm text-gray-600">
              {burnRate.daysPassed}/{burnRate.daysInMonth} days
            </span>
          </div>
          <Progress 
            value={(burnRate.daysPassed / burnRate.daysInMonth) * 100} 
            className="h-2"
          />
        </div>

        {/* Spend vs Budget */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Monthly Spending</span>
            </div>
            <span className="text-sm font-medium">
              {formatCurrency(burnRate.totalExpenses)} / {formatCurrency(burnRate.projectedMonthlySpend)}
            </span>
          </div>
          <Progress 
            value={(burnRate.totalExpenses / burnRate.projectedMonthlySpend) * 100} 
            className="h-2"
          />
          <p className="text-xs text-gray-500">
            {burnRate.totalExpenses > burnRate.projectedMonthlySpend ? 'Over' : 'Under'} budget by{' '}
            {formatCurrency(Math.abs(burnRate.totalExpenses - burnRate.projectedMonthlySpend))}
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Daily Average</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(burnRate.dailySpend)}</p>
            <p className="text-xs text-gray-500">Per day spending</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Savings Rate</span>
            </div>
            <p className="text-2xl font-bold">{formatPercentage(burnRate.savingsRate)}</p>
            <p className="text-xs text-gray-500">Of income saved</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Net Cash Flow</span>
            </div>
            <p className={`text-2xl font-bold ${
              burnRate.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {burnRate.netCashFlow >= 0 ? '+' : ''}{formatCurrency(burnRate.netCashFlow)}
            </p>
            <p className="text-xs text-gray-500">This month</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Runway</span>
            </div>
            <p className="text-2xl font-bold">{burnRate.runwayMonths.toFixed(1)} months</p>
            <p className="text-xs text-gray-500">At current rate</p>
          </div>
        </div>

        {/* Burn Rate Analysis */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Burn Rate Analysis</h4>
            <Badge variant={getBurnRateStatus() === 'good' ? 'success' : 'destructive'}>
              {formatPercentage(burnRate.monthlyBurnRate)}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Income</span>
              <span className="text-sm font-medium">{formatCurrency(burnRate.totalIncome)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Expenses</span>
              <span className="text-sm font-medium">{formatCurrency(burnRate.totalExpenses)}</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Utilization</span>
              <span className="text-sm font-medium">
                {formatPercentage(burnRate.monthlyBurnRate)}
              </span>
            </div>
          </div>

          {getBurnRateStatus() === 'critical' && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Critical Alert</p>
                  <p className="text-xs text-red-600">
                    Your expenses are {formatPercentage(burnRate.monthlyBurnRate)} of your income. 
                    Consider reducing discretionary spending.
                  </p>
                </div>
              </div>
            </div>
          )}

          {getBurnRateStatus() === 'high' && (
            <div className="bg-orange-50 border border-orange-200 rounded p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-800">High Burn Rate</p>
                  <p className="text-xs text-orange-600">
                    Your spending is high relative to income. Review your budget categories.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-gray-500">
            Based on {monthlyData.length} months of data
          </div>
          <div className="flex gap-2">
            <Button
              variant={timeFrame === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFrame('month')}
            >
              Monthly
            </Button>
            <Button
              variant={timeFrame === 'quarter' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFrame('quarter')}
            >
              Quarterly
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default BurnRateCard;