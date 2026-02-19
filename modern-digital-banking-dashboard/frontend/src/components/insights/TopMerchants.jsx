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
import { Badge } from '../ui/badge';
import { 
  Store, 
  TrendingUp, 
  TrendingDown, 
  MoreVertical,
  Filter,
  ExternalLink,
  ShoppingBag,
  CreditCard,
  Coffee,
  Car,
  Utensils
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';

const TopMerchants = ({ limit = 10, timeRange = '30d' }) => {
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState([]);
  const [category, setCategory] = useState('all');
  const [timeFrame, setTimeFrame] = useState('30d');
  const [sortBy, ] = useState('amount');

  const merchantIcons = {
    'Amazon': <ShoppingBag className="h-4 w-4" />,
    'Walmart': <Store className="h-4 w-4" />,
    'Target': <Store className="h-4 w-4" />,
    'Starbucks': <Coffee className="h-4 w-4" />,
    'Uber': <Car className="h-4 w-4" />,
    'DoorDash': <Utensils className="h-4 w-4" />,
    'Netflix': <CreditCard className="h-4 w-4" />,
    'Spotify': <CreditCard className="h-4 w-4" />,
    'default': <Store className="h-4 w-4" />
  };

  const categoryColors = {
    'Shopping': 'bg-blue-100 text-blue-800',
    'Dining': 'bg-green-100 text-green-800',
    'Entertainment': 'bg-purple-100 text-purple-800',
    'Transportation': 'bg-orange-100 text-orange-800',
    'Groceries': 'bg-emerald-100 text-emerald-800',
    'Utilities': 'bg-gray-100 text-gray-800',
    'default': 'bg-gray-100 text-gray-800'
  };


  const fetchTopMerchants = useCallback(async () => {
    try {
      setLoading(true);
      // This would normally come from an API endpoint
      // For now, we'll simulate data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockData = [
        {
          id: 1,
          name: 'Amazon',
          category: 'Shopping',
          amount: 1250.75,
          transactionCount: 8,
          trend: 'up',
          trendPercentage: 15.5,
          avgTransaction: 156.34,
          lastTransaction: '2024-01-15'
        },
        {
          id: 2,
          name: 'Starbucks',
          category: 'Dining',
          amount: 345.50,
          transactionCount: 12,
          trend: 'down',
          trendPercentage: 8.2,
          avgTransaction: 28.79,
          lastTransaction: '2024-01-14'
        },
        {
          id: 3,
          name: 'Whole Foods',
          category: 'Groceries',
          amount: 890.25,
          transactionCount: 6,
          trend: 'up',
          trendPercentage: 5.3,
          avgTransaction: 148.38,
          lastTransaction: '2024-01-13'
        },
        {
          id: 4,
          name: 'Uber',
          category: 'Transportation',
          amount: 245.80,
          transactionCount: 9,
          trend: 'up',
          trendPercentage: 22.1,
          avgTransaction: 27.31,
          lastTransaction: '2024-01-12'
        },
        {
          id: 5,
          name: 'Netflix',
          category: 'Entertainment',
          amount: 15.99,
          transactionCount: 1,
          trend: 'stable',
          trendPercentage: 0,
          avgTransaction: 15.99,
          lastTransaction: '2024-01-11'
        },
        {
          id: 6,
          name: 'Target',
          category: 'Shopping',
          amount: 456.30,
          transactionCount: 4,
          trend: 'down',
          trendPercentage: 12.4,
          avgTransaction: 114.08,
          lastTransaction: '2024-01-10'
        },
        {
          id: 7,
          name: 'Chevron',
          category: 'Transportation',
          amount: 210.45,
          transactionCount: 3,
          trend: 'up',
          trendPercentage: 18.7,
          avgTransaction: 70.15,
          lastTransaction: '2024-01-09'
        },
        {
          id: 8,
          name: 'Apple Store',
          category: 'Shopping',
          amount: 899.99,
          transactionCount: 1,
          trend: 'stable',
          trendPercentage: 0,
          avgTransaction: 899.99,
          lastTransaction: '2024-01-08'
        }
      ];

      // Filter by category if not 'all'
      let filteredData = mockData;
      if (category !== 'all') {
        filteredData = mockData.filter(item => item.category === category);
      }

      // Sort data
      filteredData.sort((a, b) => {
        if (sortBy === 'amount') {
          return b.amount - a.amount;
        } else if (sortBy === 'transactions') {
          return b.transactionCount - a.transactionCount;
        } else if (sortBy === 'average') {
          return b.avgTransaction - a.avgTransaction;
        }
        return 0;
      });

      // Limit results
      setMerchants(filteredData.slice(0, limit));
    } catch (error) {
      console.error('Error fetching top merchants:', error);
    } finally {
      setLoading(false);
    } 
  }, [category, sortBy, limit]);

  useEffect(() => {
    fetchTopMerchants();
  }, [fetchTopMerchants]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const getMerchantIcon = (merchantName) => {
    return merchantIcons[merchantName] || merchantIcons.default;
  };

  const getCategoryColor = (category) => {
    return categoryColors[category] || categoryColors.default;
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <span className="h-4 w-4">−</span>;
    }
  };

  const getTotalSpend = () => {
    return merchants.reduce((total, merchant) => total + merchant.amount, 0);
  };

  const getCategories = () => {
    const uniqueCategories = [...new Set(merchants.map(m => m.category))];
    return ['all', ...uniqueCategories];
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Top Merchants
            </CardTitle>
            <CardDescription>
              Your biggest spending destinations
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Time Frame Tabs */}
        <div className="mb-6">
          <Tabs value={timeFrame} onValueChange={setTimeFrame}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="7d">Last 7 days</TabsTrigger>
              <TabsTrigger value="30d">Last 30 days</TabsTrigger>
              <TabsTrigger value="90d">Last 90 days</TabsTrigger>
              <TabsTrigger value="year">This year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {getCategories().map(cat => (
              <Badge
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                className="cursor-pointer capitalize"
                onClick={() => setCategory(cat)}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </Badge>
            ))}
          </div>
        </div>

        {/* Total Spend Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Spend</p>
              <p className="text-2xl font-bold">{formatCurrency(getTotalSpend())}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Average Transaction</p>
              <p className="text-lg font-medium">
                {formatCurrency(
                  merchants.length > 0 
                    ? merchants.reduce((sum, m) => sum + m.avgTransaction, 0) / merchants.length
                    : 0
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Merchants List */}
        <div className="space-y-4">
          {merchants.length === 0 ? (
            <div className="text-center py-8">
              <Store className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No merchant data available</p>
              <p className="text-sm text-gray-400">Try selecting a different time period</p>
            </div>
          ) : (
            merchants.map((merchant, index) => {
              const percentage = (merchant.amount / getTotalSpend()) * 100;
              
              return (
                <div key={merchant.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            {getMerchantIcon(merchant.name)}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{merchant.name}</h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getCategoryColor(merchant.category)}`}
                            >
                              {merchant.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{merchant.transactionCount} transactions</span>
                            <span>Avg: {formatCurrency(merchant.avgTransaction)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold">{formatCurrency(merchant.amount)}</span>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(merchant.trend)}
                          <span className={`text-sm ${
                            merchant.trend === 'up' ? 'text-green-600' :
                            merchant.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {merchant.trendPercentage > 0 ? '+' : ''}{merchant.trendPercentage}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Last: {new Date(merchant.lastTransaction).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="ml-2">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </DropdownMenu>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Spend percentage</span>
                      <span className="font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-gray-500">
            Showing {merchants.length} of {merchants.length} merchants
          </div>
          <Button variant="outline" size="sm" onClick={fetchTopMerchants}>
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Report
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default TopMerchants;