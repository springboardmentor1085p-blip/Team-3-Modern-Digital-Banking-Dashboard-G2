import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Bell,
  Search,
  Trash2,
  Eye,
  EyeOff,
  CheckCheck,
  RefreshCw
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import alertService from '../../services/alertService';
import AlertCard from './AlertCard';

const AlertList = ({ alerts = [], stats = null, onRefresh }) => {
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  /**
   * Normalize backend alerts
   */
  const normalizedAlerts = useMemo(() => {
    return alerts.map(alert => ({
      ...alert,
      alert_type: alert.alert_type || alert.type,
      severity: alert.severity || 'info',
      is_read: alert.is_read ?? alert.status !== 'active'
    }));
  }, [alerts]);

  /**
   * Filter alerts
   */
  const filterAlerts = useCallback(() => {
    let data = [...normalizedAlerts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.message?.toLowerCase().includes(q) ||
        a.alert_type?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      data = data.filter(a => a.status === statusFilter);
    }

    if (showUnreadOnly) {
      data = data.filter(a => !a.is_read);
    }

    setFilteredAlerts(data);
  }, [normalizedAlerts, searchQuery, statusFilter, showUnreadOnly]);

  useEffect(() => {
    filterAlerts();
  }, [filterAlerts]);

  /**
   * Bulk actions
   */
  const bulkUpdate = async (payload) => {
    if (selectedAlerts.length === 0) return;
    try {
      setBulkActionLoading(true);
      await alertService.bulkUpdateAlerts(selectedAlerts, payload);
      setSelectedAlerts([]);
      onRefresh?.();
    } catch (e) {
      console.error(e);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedAlerts.length === 0) return;

    setBulkActionLoading(true);
    try {
      await Promise.all(
        selectedAlerts.map((id) =>
          alertService.deleteAlert(id)
        )
      );

      setSelectedAlerts([]);
      onRefresh?.();
    } catch (error) {
      console.error('Bulk delete failed', error);
    } finally {
      setBulkActionLoading(false);
    }
  };



  /**
   * Counts
   */
  const getStatusCount = (status) => {
    if (!stats) return 0;
    if (status === 'all') return stats.total_alerts;
    return stats[`${status}_count`] || 0;
  };

  const unreadCount = stats?.unread_count || 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert Center
            </CardTitle>
            <CardDescription>
              {stats
                ? `${stats.total_alerts} alerts, ${stats.unread_count} unread`
                : 'Loading...'}
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={!unreadCount}
              onClick={() => alertService.markAllAsRead().then(onRefresh)}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Search + Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search alerts..."
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            variant={showUnreadOnly ? 'default' : 'outline'}
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            {showUnreadOnly ? <Eye /> : <EyeOff />}
            <Badge className="ml-2">{unreadCount}</Badge>
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="grid grid-cols-4 mb-4">
            {['all', 'active', 'resolved', 'dismissed'].map(s => (
              <TabsTrigger key={s} value={s}>
                {s.toUpperCase()}
                <Badge className="ml-2" variant="secondary">
                  {getStatusCount(s)}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Bulk actions */}
          {selectedAlerts.length > 0 && (
            <div className="mb-4 flex gap-2">
              <Button size="sm" onClick={() => bulkUpdate({ is_read: true })} disabled={bulkActionLoading}>
                Mark Read
              </Button>
              <Button size="sm" onClick={() => bulkUpdate({ is_read: false })} disabled={bulkActionLoading}>
                Mark Unread
              </Button>
              <Button size="sm" onClick={() => bulkUpdate({ status: 'dismissed' })} disabled={bulkActionLoading}>
                Dismiss
              </Button>
              <Button size="sm" variant="destructive" onClick={bulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          )}

          {/* Alerts */}
          <div className="space-y-4">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No alerts found
              </div>
            ) : (
              filteredAlerts.map(alert => (
                <div key={alert.id} className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={selectedAlerts.includes(alert.id)}
                    onChange={() =>
                      setSelectedAlerts(prev =>
                        prev.includes(alert.id)
                          ? prev.filter(id => id !== alert.id)
                          : [...prev, alert.id]
                      )
                    }
                  />
                  <AlertCard alert={alert} onUpdate={onRefresh} />
                </div>
              ))
            )}
          </div>
        </Tabs>
      </CardContent>

      <CardFooter className="text-sm text-gray-500">
        Showing {filteredAlerts.length} alerts
      </CardFooter>
    </Card>
  );
};

export default AlertList;
