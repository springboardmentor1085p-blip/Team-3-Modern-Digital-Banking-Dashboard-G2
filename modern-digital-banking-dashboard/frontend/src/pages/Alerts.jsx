import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Bell,
  AlertTriangle,
  Settings,
  CheckCheck,
  RefreshCw,
  Download,
} from 'lucide-react';
import AlertList from '../components/alerts/AlertList';
import alertService from '../services/alertService';
import { toast } from 'sonner';
import { Skeleton } from '../components/ui/skeleton';

const Alerts = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);

  /**
   * Fetch alerts + stats from backend
   */
  const fetchAlertsData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, statsRes] = await Promise.all([
        alertService.getAlerts({ limit: 50 }),
        alertService.getAlertStats(),
      ]);

      setAlerts(alertsRes.data.alerts || []);
      setStats(statsRes.data || null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initial load
   */
  useEffect(() => {
    fetchAlertsData();
  }, [fetchAlertsData]);

  /**
   * Handlers
   */
  const handleRefresh = () => {
    fetchAlertsData();
    toast.success('Alerts refreshed');
  };

  const handleMarkAllAsRead = async () => {
    try {
      await alertService.markAllAsRead();
      toast.success('All alerts marked as read');
      fetchAlertsData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to mark all alerts as read');
    }
  };

  const handleGenerateTestAlerts = async () => {
    try {
      await alertService.generateTestAlerts({ count: 3 });
      toast.success('Test alerts generated');
      fetchAlertsData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate test alerts');
    }
  };

  const handleExportAlerts = () => {
    toast.info('Export functionality coming soon');
  };

  const getSeverityCount = (severity) => {
    if (!stats?.by_severity) return 0;
    return stats.by_severity[severity] || 0;
  };

  /**
   * Loading UI
   */
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alert Center</h1>
          <p className="text-gray-500">
            Monitor and manage your financial notifications
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button variant="outline" onClick={handleExportAlerts}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          <Button onClick={() => navigate('/insights')}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            View Insights
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Total Alerts</p>
            <p className="text-2xl font-bold">{stats?.total_alerts || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Unread</p>
            <p className="text-2xl font-bold">{stats?.unread_count || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold">{stats?.active_count || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Resolved</p>
            <p className="text-2xl font-bold">{stats?.resolved_count || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert Type Distribution */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Alert Type Distribution</CardTitle>
          <CardDescription>Breakdown of alerts by type</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.by_type ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(stats.by_type).map(([type, count]) => (
                <div key={type} className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-gray-600 capitalize mt-1">
                    {type.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              No alert type data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleMarkAllAsRead}
              disabled={!stats?.unread_count}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All as Read
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleGenerateTestAlerts}
            >
              <Bell className="h-4 w-4 mr-2" />
              Generate Test Alerts
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alert Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/settings/notifications')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Notification Preferences
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/settings/alerts')}
            >
              <Bell className="h-4 w-4 mr-2" />
              Alert Rules & Triggers
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Severity Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Critical</span>
              <span>{getSeverityCount('critical')}</span>
            </div>
            <div className="flex justify-between">
              <span>Warning</span>
              <span>{getSeverityCount('warning')}</span>
            </div>
            <div className="flex justify-between">
              <span>Info</span>
              <span>{getSeverityCount('info')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert List */}
      <AlertList
        alerts={alerts}
        stats={stats}
        onRefresh={fetchAlertsData}
      />
    </div>
  );
};

export default Alerts;
