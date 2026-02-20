import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  DollarSign,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  MoreVertical,
  TrendingUp,
  XCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import alertService from '../../services/alertService';

const AlertCard = ({ alert, onUpdate, showActions = true }) => {
  const [isRead, setIsRead] = useState(alert.is_read ?? false);

  /** 🔁 Keep local state in sync with parent */
  useEffect(() => {
    setIsRead(alert.is_read ?? false);
  }, [alert.is_read]);

  const status = alert.status || 'active';
  const severity = alert.severity || 'info';

  /* ---------- UI helpers ---------- */

  const getAlertIcon = () => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = () => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'dismissed':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusText = () => {
    if (status === 'resolved') return 'Resolved';
    if (status === 'dismissed') return 'Dismissed';
    return 'Active';
  };

  const getAlertTypeIcon = () => {
    switch (alert.alert_type) {
      case 'budget_exceeded':
        return <TrendingUp className="h-4 w-4" />;
      case 'large_transaction':
        return <DollarSign className="h-4 w-4" />;
      case 'bill_due':
        return <Bell className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const hours = Math.floor((now - date) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  /* ---------- Actions ---------- */

  const handleMarkAsRead = async () => {
    await alertService.updateAlert(alert.id, { is_read: true });
    setIsRead(true);
    onUpdate?.();
  };

  const handleMarkAsUnread = async () => {
    await alertService.updateAlert(alert.id, { is_read: false });
    setIsRead(false);
    onUpdate?.();
  };

  const isActionable = alert.is_actionable && status === 'active';

  /* ---------- Render ---------- */

  return (
    <Card className={`w-full ${!isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex gap-3 flex-1">
            <div className={`p-2 rounded-lg ${getSeverityColor()}`}>
              {getAlertIcon()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle className="text-base truncate">
                  {alert.title || 'Alert'}
                </CardTitle>
                <Badge variant="outline" className="flex gap-1 items-center">
                  {getAlertTypeIcon()}
                  {alert.alert_type?.replace(/_/g, ' ') || 'General'}
                </Badge>
              </div>

              <CardDescription className="line-clamp-2">
                {alert.message || 'No details available'}
              </CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(alert.created_at)}
          </div>

          <div className="flex items-center gap-1">
            {getStatusIcon()}
            {getStatusText()}
          </div>

          {!isRead && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Unread
            </Badge>
          )}

          {isActionable && (
            <Badge className="bg-blue-100 text-blue-800">
              Action Required
            </Badge>
          )}
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="pt-0 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Details
          </Button>

          {!isRead ? (
            <Button size="sm" variant="ghost" onClick={handleMarkAsRead}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Read
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={handleMarkAsUnread}>
              <EyeOff className="h-4 w-4 mr-1" />
              Mark Unread
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};

export default AlertCard;
