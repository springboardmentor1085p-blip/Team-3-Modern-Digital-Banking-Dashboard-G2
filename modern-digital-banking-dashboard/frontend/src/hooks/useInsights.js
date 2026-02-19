import { useState, useEffect, useCallback } from 'react';
import insightService from '../services/insightService';
import { toast } from 'sonner';

export const useInsights = (params = {}) => {
  const [cashFlowInsights, setCashFlowInsights] = useState(null);
  const [trendInsights, setTrendInsights] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [spendingHabits, setSpendingHabits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCashFlowInsights = useCallback(async (timeRange = '30d') => {
    try {
      setLoading(true);
      const response = await insightService.getCashFlowInsights({ time_range: timeRange });
      setCashFlowInsights(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching cash flow insights:', error);
      setError('Failed to load cash flow insights');
      toast.error('Failed to load cash flow insights');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrendInsights = useCallback(async (metric = 'net_flow', period = 'monthly', months = 6) => {
    try {
      setLoading(true);
      const response = await insightService.getTrendInsights({
        metric,
        period,
        months
      });
      setTrendInsights(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching trend insights:', error);
      setError('Failed to load trend insights');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMonthlySummary = useCallback(async (months = 12) => {
    try {
      setLoading(true);
      const response = await insightService.getMonthlySummary({ months });
      setMonthlySummary(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
      setError('Failed to load monthly summary');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategoryBreakdown = useCallback(async (insightType = 'expense', timeRange = '30d', limit = 10) => {
    try {
      setLoading(true);
      const response = await insightService.getCategoryBreakdown({
        insight_type: insightType,
        time_range: timeRange,
        limit
      });
      setCategoryBreakdown(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching category breakdown:', error);
      setError('Failed to load category breakdown');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAnomalies = useCallback(async (threshold = 2.0) => {
    try {
      setLoading(true);
      const response = await insightService.getAnomalies({ threshold });
      setAnomalies(response.data?.anomalies || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      setError('Failed to load anomalies');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPredictions = useCallback(async (horizon = 30) => {
    try {
      setLoading(true);
      const response = await insightService.getPredictions({ horizon });
      setPredictions(response.data?.predictions || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setError('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSpendingHabits = useCallback(async (timeRange = '90d') => {
    try {
      setLoading(true);
      const response = await insightService.getSpendingHabits({ time_range: timeRange });
      setSpendingHabits(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching spending habits:', error);
      setError('Failed to load spending habits');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllInsights = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCashFlowInsights(params.timeRange),
        fetchTrendInsights(),
        fetchMonthlySummary(),
        fetchCategoryBreakdown('expense', params.timeRange),
        fetchAnomalies(),
        fetchPredictions(),
        fetchSpendingHabits()
      ]);
      setError(null);
    } catch (error) {
      console.error('Error fetching all insights:', error);
      setError('Failed to load insights');
      toast.error('Failed to load insights data');
    } finally {
      setLoading(false);
    }
  }, [params.timeRange, fetchCashFlowInsights, fetchTrendInsights, fetchMonthlySummary, 
      fetchCategoryBreakdown, fetchAnomalies, fetchPredictions, fetchSpendingHabits]);

  useEffect(() => {
    fetchAllInsights();
  }, [fetchAllInsights]);

  return {
    cashFlowInsights,
    trendInsights,
    monthlySummary,
    categoryBreakdown,
    anomalies,
    predictions,
    spendingHabits,
    loading,
    error,
    refetch: fetchAllInsights,
    fetchCashFlowInsights,
    fetchTrendInsights,
    fetchMonthlySummary,
    fetchCategoryBreakdown,
    fetchAnomalies,
    fetchPredictions,
    fetchSpendingHabits
  };
};

export const useInsightsCache = (key, fetchFunction, ttl = 5 * 60 * 1000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timestamp, setTimestamp] = useState(null);

  const fetchData = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && data && timestamp && (now - timestamp) < ttl) {
      return data;
    }

    try {
      setLoading(true);
      const result = await fetchFunction();
      setData(result);
      setTimestamp(now);
      setError(null);
      return result;
    } catch (error) {
      console.error('Error fetching cached data:', error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, data, timestamp, ttl]);

  const invalidate = useCallback(() => {
    setData(null);
    setTimestamp(null);
  }, []);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
    isStale: timestamp ? (Date.now() - timestamp) > ttl : true
  };
};