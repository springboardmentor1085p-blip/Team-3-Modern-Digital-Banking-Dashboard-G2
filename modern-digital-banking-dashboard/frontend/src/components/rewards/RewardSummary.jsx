import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { format, parseISO } from 'date-fns';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Avatar,
  Divider,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Paper,
  Fade
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  Timeline as TimelineIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  CalendarToday as CalendarIcon,
  BarChart as BarChartIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { rewardService } from '../../services/rewardService';
import { useSnackbar } from '../../context/SnackbarContext';
import { exportToCSV } from '../../utils/exportUtils';
import './RewardSummary.css';

const RewardSummary = ({ userId, compact = false, showTabs = true }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const { showInfo } = useSnackbar();


  const fetchRewardSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const summaryData = await rewardService.getRewardSummary();
      setSummary(summaryData);
    } catch (err) {
      setError('Failed to load reward summary');
      showInfo('Failed to load reward summary');
    } finally {
      setLoading(false);
    }
  }, [showInfo]);
  useEffect(() => {
    fetchRewardSummary();
  }, [fetchRewardSummary]);


  const handleRefresh = () => {
    fetchRewardSummary();
    showInfo('Refreshing reward summary...');
  };

  const handleExport = () => {
    if (!summary) {
      return (
        <Box textAlign="center" py={4}>
          <CircularProgress />
        </Box>
    );
}
    
    const exportData = [
      {
        'Total Points': summary.total_points,
        'Current Tier': summary.current_tier,
        'Next Tier': summary.next_tier || 'N/A',
        'Points to Next Tier': summary.points_to_next_tier || 'N/A',
        'Export Date': format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      }
    ];
    
    exportToCSV(exportData, `reward_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    showInfo('Reward summary exported successfully');
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: 'My Reward Summary',
        text: `Check out my reward progress: ${summary.total_points} points achieved!`,
        url: window.location.href,
      };
      
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`I have ${summary.total_points} reward points in the BillTracker app!`);
        showInfo('Summary copied to clipboard');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  // Get tier information
  const getTierInfo = (tier) => {
    const tiers = {
      bronze: { color: '#cd7f32', icon: '🥉', level: 1, next: 'Silver' },
      silver: { color: '#c0c0c0', icon: '🥈', level: 2, next: 'Gold' },
      gold: { color: '#ffd700', icon: '🥇', level: 3, next: 'Platinum' },
      platinum: { color: '#e5e4e2', icon: '🏆', level: 4, next: 'Diamond' },
      diamond: { color: '#b9f2ff', icon: '💎', level: 5, next: null }
    };
    return tiers[tier?.toLowerCase()] || tiers.bronze;
  };

  const tierInfo = getTierInfo(summary?.current_tier);

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!summary || !summary.points_to_next_tier || !summary.next_tier) return 0;
    
    const nextTierMinPoints = {
      silver: 500,
      gold: 2000,
      platinum: 5000,
      diamond: 10000
    };
    
    const currentTierMinPoints = {
      bronze: 0,
      silver: 500,
      gold: 2000,
      platinum: 5000,
      diamond: 10000
    };
    
    const currentMin = currentTierMinPoints[summary.current_tier.toLowerCase()] || 0;
    const nextMin = nextTierMinPoints[summary.next_tier?.toLowerCase()] || 0;
    
    if (nextMin <= currentMin) return 100;
    
    const progress = ((summary.total_points - currentMin) / (nextMin - currentMin)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const progress = calculateProgress();

  // Get monthly breakdown for chart
  const getMonthlyData = () => {
    if (!summary?.monthly_breakdown) return [];
    
    return summary.monthly_breakdown.slice(0, 6).reverse(); // Last 6 months
  };

  const monthlyData = getMonthlyData();

  if (loading && !summary) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !summary) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
        <Button onClick={fetchRewardSummary} sx={{ ml: 2 }}>Retry</Button>
      </Alert>
    );
  }

  if (compact) {
    return (
      <Card className="reward-summary compact">
        <CardContent sx={{ p: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar
                sx={{
                  bgcolor: `${tierInfo.color}30`,
                  color: tierInfo.color,
                  width: 48,
                  height: 48,
                  fontSize: '1.25rem',
                  fontWeight: 'bold'
                }}
              >
                {tierInfo.icon}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {(summary?.total_points ?? 0).toLocaleString()} pts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tierInfo.level === 5 ? 'Max Tier' : `${summary.points_to_next_tier} to ${summary.next_tier}`}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={summary.current_tier}
              size="small"
              sx={{
                bgcolor: `${tierInfo.color}20`,
                color: tierInfo.color,
                fontWeight: 'bold',
                textTransform: 'capitalize'
              }}
            />
          </Box>
          
          {tierInfo.level < 5 && (
            <Box mt={2}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: `${tierInfo.color}20`,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: tierInfo.color,
                    borderRadius: 3,
                  }
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Box className="reward-summary-container">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Reward Summary
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track your progress and unlock new tiers
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export">
            <IconButton onClick={handleExport} disabled={!summary}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share">
            <IconButton onClick={handleShare} disabled={!summary}>
              <ShareIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Main Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Points Card */}
        <Grid item xs={12} md={4}>
          <Card className="summary-card total-points">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" color="text.secondary">
                  Total Points
                </Typography>
                <TrophyIcon sx={{ color: tierInfo.color, fontSize: 32 }} />
              </Box>
              <Typography variant="h2" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {summary.total_points.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lifetime reward points earned
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <TrendingUpIcon fontSize="small" color="success" />
                <Typography variant="caption" color="success.main">
                  +{summary.recent_rewards?.reduce((sum, reward) => sum + reward.points, 0) || 0} this month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Current Tier Card */}
        <Grid item xs={12} md={4}>
          <Card className="summary-card current-tier">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" color="text.secondary">
                  Current Tier
                </Typography>
                <Avatar
                  sx={{
                    bgcolor: `${tierInfo.color}30`,
                    color: tierInfo.color,
                    width: 40,
                    height: 40,
                    fontSize: '1.25rem',
                    fontWeight: 'bold'
                  }}
                >
                  {tierInfo.icon}
                </Avatar>
              </Box>
              <Typography variant="h3" component="div" fontWeight="bold" sx={{ mb: 1 }}>
                {summary.current_tier?.charAt(0).toUpperCase() + summary.current_tier?.slice(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Level {tierInfo.level} • {tierInfo.level === 5 ? 'Maximum' : `${summary.next_tier} next`}
              </Typography>
              
              {tierInfo.level < 5 && (
                <Box mt={2}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Progress to {summary.next_tier}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {Math.round(progress)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: `${tierInfo.color}20`,
                      '& .MuiLinearProgress-bar': {
                        bgcolor: tierInfo.color,
                        borderRadius: 4,
                      }
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Next Tier Card */}
        <Grid item xs={12} md={4}>
          <Card className="summary-card next-tier">
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" color="text.secondary">
                  {tierInfo.level === 5 ? 'Achievements' : 'Next Tier'}
                </Typography>
                <StarIcon sx={{ color: '#ffb400', fontSize: 32 }} />
              </Box>
              
              {tierInfo.level === 5 ? (
                <Box>
                  <Typography variant="h5" component="div" fontWeight="bold" color="primary" sx={{ mb: 1 }}>
                    🎉 Maximum Tier!
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    You've reached the highest reward tier. Enjoy all premium benefits!
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Typography variant="h3" component="div" fontWeight="bold" color="primary" sx={{ mb: 1 }}>
                    {summary.next_tier}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {summary.points_to_next_tier?.toLocaleString()} points needed
                  </Typography>
                  
                  <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom color="primary">
                      Upcoming Benefits
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Higher point multipliers
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Exclusive rewards
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      • Priority support
                    </Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Section */}
      {showTabs && (
        <>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
          >
            <Tab label="Monthly Breakdown" icon={<CalendarIcon />} iconPosition="start" />
            <Tab label="Recent Rewards" icon={<TimelineIcon />} iconPosition="start" />
            <Tab label="Category Analysis" icon={<BarChartIcon />} iconPosition="start" />
          </Tabs>

          {/* Tab Content */}
          <Box mt={3}>
            {activeTab === 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Points Earned by Month
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                {monthlyData.length > 0 ? (
                  <Grid container spacing={2}>
                    {monthlyData.map((monthData, index) => {
                      const isIncreasing = index > 0 && 
                        monthData.total_points > monthlyData[index - 1].total_points;
                      
                      return (
                        <Grid item xs={12} key={monthData.month}>
                          <Box display="flex" alignItems="center" gap={3}>
                            <Box flex={1}>
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="subtitle2">
                                  {monthData.month}
                                </Typography>
                                <Typography variant="subtitle2" fontWeight="bold">
                                  {monthData.total_points.toLocaleString()} pts
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(100, (monthData.total_points / 5000) * 100)}
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  bgcolor: `${tierInfo.color}20`,
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: isIncreasing ? '#4caf50' : tierInfo.color,
                                    borderRadius: 4,
                                  }
                                }}
                              />
                              <Box display="flex" justifyContent="space-between" mt={0.5}>
                                <Typography variant="caption" color="text.secondary">
                                  {monthData.reward_count} rewards
                                </Typography>
                                <Typography variant="caption" color={isIncreasing ? 'success.main' : 'text.secondary'}>
                                  {isIncreasing ? <ArrowUpIcon fontSize="inherit" /> : <ArrowDownIcon fontSize="inherit" />}
                                  {isIncreasing ? ' Increasing' : ' Steady'}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                ) : (
                  <Typography color="text.secondary" align="center" py={4}>
                    No monthly data available
                  </Typography>
                )}
              </Paper>
            )}

            {activeTab === 1 && summary?.recent_rewards && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Recent Reward Activity
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={2}>
                  {summary.recent_rewards.slice(0, 5).map((reward, index) => (
                    <Grid item xs={12} key={reward.id || index}>
                      <Box display="flex" alignItems="center" justifyContent="space-between" p={2} sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            +{reward.points} points
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {reward.description || `${reward.category} payment`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(parseISO(reward.earned_at), 'MMM dd, yyyy')}
                          </Typography>
                        </Box>
                        <Chip
                          label={reward.category}
                          size="small"
                          variant="outlined"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {activeTab === 2 && summary?.monthly_breakdown && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Category Distribution
                </Typography>
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={2}>
                  {Object.entries(
                    summary.monthly_breakdown.reduce((acc, month) => {
                      Object.entries(month.categories || {}).forEach(([category, points]) => {
                        acc[category] = (acc[category] || 0) + points;
                      });
                      return acc;
                    }, {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([category, points]) => (
                      <Grid item xs={12} key={category}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box flex={1}>
                            <Box display="flex" justifyContent="space-between" mb={1}>
                              <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                                {category}
                              </Typography>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {points.toLocaleString()} pts
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, (points / 10000) * 100)}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: `${tierInfo.color}20`,
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: tierInfo.color,
                                  borderRadius: 4,
                                }
                              }}
                            />
                            <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                              {((points / summary.total_points) * 100).toFixed(1)}% of total points
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))}
                </Grid>
              </Paper>
            )}
          </Box>
        </>
      )}

      {/* Tips and Info */}
      <Fade in={true}>
        <Alert 
          severity="info" 
          icon={<InfoIcon />}
          sx={{ mt: 4 }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Tips to Earn More Points
          </Typography>
          <Typography variant="body2">
            • Pay bills on time for 1.5x bonus points
            <br />
            • Use credit card payments for extra rewards
            <br />
            • Maintain a payment streak for bonus multipliers
            <br />
            • Reach higher tiers for better point multipliers
          </Typography>
        </Alert>
      </Fade>
    </Box>
  );
};

RewardSummary.propTypes = {
  userId: PropTypes.number,
  compact: PropTypes.bool,
  showTabs: PropTypes.bool,
};

export default RewardSummary;