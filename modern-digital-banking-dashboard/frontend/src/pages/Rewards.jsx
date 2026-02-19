import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Button,
  IconButton,
  Tooltip,
  Drawer,
  useMediaQuery,
  useTheme,
  Alert,
  CircularProgress,
  Fade,
  Chip,
  Avatar,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  Timeline as TimelineIcon,
  Leaderboard as LeaderboardIcon,
  CurrencyExchange as CurrencyIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Menu as MenuIcon,
  Refresh as RefreshIcon,
  Diamond as DiamondIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import RewardSummary from '../components/rewards/RewardSummary';
import RewardCard from '../components/rewards/RewardCard';
import CurrencySummary from '../components/rewards/CurrencySummary';
import { rewardsAPI } from '../services/api';
import { useSnackbar } from '../context/SnackbarContext';
import { useAuth } from '../context/AuthContext';
import { exportToCSV } from '../utils/exportUtils';
import './Rewards.css';

const Rewards = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { showSuccess } = useSnackbar();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rewards, setRewards] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [summary, setSummary] = useState(null);
  const [userRank, setUserRank] = useState(null);


  const fetchRewardsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch rewards summary
      const summaryData = await rewardsAPI.getRewardSummary();
      setSummary(summaryData);
      
      // Fetch recent rewards
      const rewardsData = await rewardsAPI.getRewards({ limit: 10 });
      setRewards(rewardsData);
      
      // Fetch leaderboard
      const leaderboardData = await rewardsAPI.getLeaderboard('monthly', 10);
      setLeaderboard(leaderboardData);
      
      // Find user rank
      const userRankData = leaderboardData.find(entry => entry.user_id === user?.id);
      setUserRank(userRankData);
      
    } catch (err) {
      showSuccess('Failed to load rewards data');
    } finally {
      setLoading(false);
    }
  }, [showSuccess, user?.id]);
    useEffect(() => {
    fetchRewardsData();
  }, [fetchRewardsData]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    fetchRewardsData();
    showSuccess('Refreshing rewards data...');
  };

  const handleExport = () => {
    if (!rewards.length) return;
    
    const exportData = rewards.map(reward => ({
      'Points': reward.points,
      'Bill Amount': reward.bill_amount,
      'Category': reward.category,
      'On Time Payment': reward.on_time_payment ? 'Yes' : 'No',
      'Description': reward.description || '',
      'Earned Date': reward.earned_at,
      'Tier': reward.tier || 'Bronze'
    }));
    
    exportToCSV(exportData, `rewards_export_${new Date().toISOString().split('T')[0]}.csv`);
    showSuccess('Rewards exported successfully');
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: 'My Rewards Achievements',
        text: `Check out my rewards progress: ${summary?.total_points || 0} points earned!`,
        url: window.location.href,
      };
      
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`I have ${summary?.total_points || 0} reward points in the BillTracker app!`);
        showSuccess('Achievements copied to clipboard');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleFavoriteToggle = async (rewardId, isFavorite) => {
    try {
      // Call API to update favorite status
      await rewardsAPI.toggleFavorite(rewardId, isFavorite);
      showSuccess(
        isFavorite ? 'Added to favorites' : 'Removed from favorites'
      );
    } catch (err) {
      showSuccess('Failed to update favorite');
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      bronze: '#cd7f32',
      silver: '#c0c0c0',
      gold: '#ffd700',
      platinum: '#e5e4e2',
      diamond: '#b9f2ff'
    };
    return colors[tier?.toLowerCase()] || colors.bronze;
  };

  if (loading && !summary) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="rewards-page">
      {/* Mobile App Bar */}
      {isMobile && (
        <Paper elevation={3} sx={{ position: 'sticky', top: 0, zIndex: 1100, mb: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" p={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <IconButton onClick={() => setDrawerOpen(true)}>
                <MenuIcon />
              </IconButton>
              <Typography variant="h6">Rewards</Typography>
              {userRank && (
                <Chip
                  label={`Rank #${userRank.rank}`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
            <Box display="flex" gap={1}>
              <IconButton size="small" onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
              <IconButton size="small" onClick={handleShare}>
                <ShareIcon />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      )}

      <Container maxWidth="xl" sx={{ py: isMobile ? 2 : 4 }}>
        {/* Page Header */}
        {!isMobile && (
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
            <Box>
              <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
                Rewards Program
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Earn points, unlock tiers, and track your achievements
              </Typography>
              
              {userRank && (
                <Box display="flex" alignItems="center" gap={2} mt={2}>
                  <Chip
                    icon={<TrophyIcon />}
                    label={`Rank #${userRank.rank} this month`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 'bold' }}
                  />
                  <Chip
                    icon={<StarIcon />}
                    label={`${userRank.total_points?.toLocaleString()} points`}
                    sx={{ 
                      bgcolor: `${getTierColor(userRank.current_tier)}20`,
                      color: getTierColor(userRank.current_tier),
                      fontWeight: 'bold'
                    }}
                  />
                </Box>
              )}
            </Box>
            
            <Box display="flex" gap={2}>
              <Tooltip title="Export Rewards">
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={handleExport}
                  disabled={!rewards.length}
                >
                  Export
                </Button>
              </Tooltip>
              <Tooltip title="Share Achievements">
                <Button
                  variant="outlined"
                  startIcon={<ShareIcon />}
                  onClick={handleShare}
                >
                  Share
                </Button>
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton onClick={handleRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}

        {/* Achievement Banner */}
        {summary && summary.current_tier === 'diamond' && (
          <Fade in={true}>
            <Alert 
              severity="info"
              icon={<DiamondIcon />}
              sx={{ 
                mb: 4,
                background: 'linear-gradient(135deg, #b9f2ff 0%, #7ce0ff 100%)',
                color: '#0066cc',
                border: '1px solid #7ce0ff'
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    🎉 Diamond Tier Achieved!
                  </Typography>
                  <Typography variant="body2">
                    You've reached the highest reward tier. Enjoy premium benefits!
                  </Typography>
                </Box>
                <DiamondIcon sx={{ fontSize: 48, color: '#0066cc' }} />
              </Box>
            </Alert>
          </Fade>
        )}

        {/* Main Content */}
        <Grid container spacing={3}>
          {/* Left Sidebar - Desktop Only */}
          {!isMobile && (
            <Grid item xs={12} md={3} lg={2}>
              <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
                <Typography variant="h6" gutterBottom>
                  Navigation
                </Typography>
                
                <Box display="flex" flexDirection="column" gap={2} mt={2}>
                  <Button
                    variant={activeTab === 0 ? 'contained' : 'outlined'}
                    color="primary"
                    startIcon={<TrendingUpIcon />}
                    onClick={() => setActiveTab(0)}
                    fullWidth
                  >
                    Overview
                  </Button>
                  
                  <Button
                    variant={activeTab === 1 ? 'contained' : 'outlined'}
                    startIcon={<TimelineIcon />}
                    onClick={() => setActiveTab(1)}
                    fullWidth
                  >
                    Recent Rewards
                  </Button>
                  
                  <Button
                    variant={activeTab === 2 ? 'contained' : 'outlined'}
                    startIcon={<LeaderboardIcon />}
                    onClick={() => setActiveTab(2)}
                    fullWidth
                  >
                    Leaderboard
                  </Button>
                  
                  <Button
                    variant={activeTab === 3 ? 'contained' : 'outlined'}
                    startIcon={<CurrencyIcon />}
                    onClick={() => setActiveTab(3)}
                    fullWidth
                  >
                    Currency
                  </Button>
                  
                  <Button
                    variant={activeTab === 4 ? 'contained' : 'outlined'}
                    startIcon={<TrophyIcon />}
                    onClick={() => setActiveTab(4)}
                    fullWidth
                  >
                    Tiers & Benefits
                  </Button>
                </Box>
                
                {/* Quick Stats */}
                {summary && (
                  <Box mt={4}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Quick Stats
                    </Typography>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Total Points:</Typography>
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        {summary.total_points.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" mb={1}>
                      <Typography variant="body2">Current Tier:</Typography>
                      <Typography variant="body2" fontWeight="bold" color={getTierColor(summary.current_tier)}>
                        {summary.current_tier}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">To Next Tier:</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {summary.points_to_next_tier?.toLocaleString() || 'Max'}
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                {/* User Info */}
                {user && (
                  <Box mt={4} pt={3} borderTop={1} borderColor="divider">
                    <Box display="flex" alignItems="center" gap={2} mb={1}>
                      <Avatar
                        src={user.avatar}
                        alt={user.full_name || user.username}
                        sx={{ width: 40, height: 40 }}
                      >
                        {(user.full_name || user.username).charAt(0).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2">
                          {user.full_name || user.username}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Grid>
          )}

          {/* Main Content Area */}
          <Grid item xs={12} md={isMobile ? 12 : 9} lg={isMobile ? 12 : 10}>
            {/* Tabs for Mobile */}
            {isMobile ? (
              <>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ mb: 3 }}
                >
                  <Tab label="Overview" icon={<TrendingUpIcon />} iconPosition="start" />
                  <Tab label="Rewards" icon={<TimelineIcon />} iconPosition="start" />
                  <Tab label="Leaderboard" icon={<LeaderboardIcon />} iconPosition="start" />
                  <Tab label="Currency" icon={<CurrencyIcon />} iconPosition="start" />
                  <Tab label="Tiers" icon={<TrophyIcon />} iconPosition="start" />
                </Tabs>
                
                {activeTab === 0 && (
                  <Paper sx={{ p: 3, mb: 3 }}>
                    <RewardSummary userId={user?.id} compact={false} showTabs={false} />
                  </Paper>
                )}
                
                {activeTab === 1 && (
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom mb={3}>
                      Recent Rewards
                    </Typography>
                    {rewards.length > 0 ? (
                      <Grid container spacing={2}>
                        {rewards.map(reward => (
                          <Grid item xs={12} key={reward.id}>
                            <RewardCard
                              reward={reward}
                              onFavoriteToggle={handleFavoriteToggle}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography color="text.secondary" align="center" py={4}>
                        No rewards yet. Start paying bills to earn points!
                      </Typography>
                    )}
                  </Paper>
                )}
                
                {activeTab === 2 && (
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom mb={3}>
                      Monthly Leaderboard
                    </Typography>
                    {leaderboard.length > 0 ? (
                      <Grid container spacing={2}>
                        {leaderboard.map((entry, index) => (
                          <Grid item xs={12} key={entry.user_id}>
                            <Card 
                              sx={{ 
                                bgcolor: entry.user_id === user?.id ? 'primary.light' : 'background.paper',
                                border: entry.user_id === user?.id ? '2px solid' : '1px solid',
                                borderColor: entry.user_id === user?.id ? 'primary.main' : 'divider'
                              }}
                            >
                              <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                  <Box display="flex" alignItems="center" gap={2}>
                                    <Avatar
                                      sx={{
                                        width: 40,
                                        height: 40,
                                        bgcolor: getTierColor(entry.current_tier),
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '1.25rem'
                                      }}
                                    >
                                      {index < 3 ? ['🥇', '🥈', '🥉'][index] : entry.rank}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="subtitle1" fontWeight="bold">
                                        {entry.username}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {entry.email}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <Box textAlign="right">
                                    <Typography variant="h6" color="primary" fontWeight="bold">
                                      {entry.total_points.toLocaleString()} pts
                                    </Typography>
                                    <Chip
                                      label={entry.current_tier}
                                      size="small"
                                      sx={{
                                        bgcolor: `${getTierColor(entry.current_tier)}20`,
                                        color: getTierColor(entry.current_tier),
                                        textTransform: 'capitalize'
                                      }}
                                    />
                                  </Box>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography color="text.secondary" align="center" py={4}>
                        No leaderboard data available
                      </Typography>
                    )}
                  </Paper>
                )}
                
                {activeTab === 3 && (
                  <Paper sx={{ p: 3 }}>
                    <CurrencySummary userId={user?.id} compact={false} />
                  </Paper>
                )}
                
                {activeTab === 4 && (
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom mb={3}>
                      Reward Tiers & Benefits
                    </Typography>
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        How Tiers Work
                      </Typography>
                      <Typography variant="body2">
                        Earn points to progress through tiers. Higher tiers give you better benefits!
                      </Typography>
                    </Alert>
                    
                    <Grid container spacing={2}>
                      {[
                        { tier: 'Bronze', points: '0-499', benefits: ['Basic tracking', 'Email support'], color: '#cd7f32' },
                        { tier: 'Silver', points: '500-1,999', benefits: ['Priority support', 'Advanced analytics'], color: '#c0c0c0' },
                        { tier: 'Gold', points: '2,000-4,999', benefits: ['Early access', 'Dedicated manager'], color: '#ffd700' },
                        { tier: 'Platinum', points: '5,000-9,999', benefits: ['Custom integrations', 'API access'], color: '#e5e4e2' },
                        { tier: 'Diamond', points: '10,000+', benefits: ['24/7 support', 'Enterprise features'], color: '#b9f2ff' }
                      ].map(tier => (
                        <Grid item xs={12} key={tier.tier}>
                          <Card sx={{ borderLeft: `4px solid ${tier.color}` }}>
                            <CardContent>
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box>
                                  <Typography variant="h6" color={tier.color} fontWeight="bold">
                                    {tier.tier}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {tier.points} points
                                  </Typography>
                                </Box>
                                <Avatar sx={{ bgcolor: `${tier.color}20`, color: tier.color }}>
                                  {tier.tier === 'Bronze' ? '🥉' :
                                   tier.tier === 'Silver' ? '🥈' :
                                   tier.tier === 'Gold' ? '🥇' :
                                   tier.tier === 'Platinum' ? '🏆' : '💎'}
                                </Avatar>
                              </Box>
                              
                              <Divider sx={{ my: 2 }} />
                              
                              <Typography variant="subtitle2" gutterBottom>
                                Benefits:
                              </Typography>
                              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                                {tier.benefits.map((benefit, index) => (
                                  <Typography component="li" variant="body2" key={index} color="text.secondary">
                                    {benefit}
                                  </Typography>
                                ))}
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                )}
              </>
            ) : (
              <>
                {activeTab === 0 && (
                  <Paper sx={{ p: 3, mb: 3 }}>
                    <RewardSummary userId={user?.id} compact={false} showTabs={true} />
                  </Paper>
                )}
                
                {activeTab === 1 && (
                  <Paper sx={{ p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Typography variant="h5">
                        Recent Reward Activity
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => navigate('/rewards/history')}
                      >
                        View All
                      </Button>
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    
                    {rewards.length > 0 ? (
                      <Grid container spacing={3}>
                        {rewards.map(reward => (
                          <Grid item xs={12} md={6} key={reward.id}>
                            <RewardCard
                              reward={reward}
                              onFavoriteToggle={handleFavoriteToggle}
                            />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Box textAlign="center" py={8}>
                        <TrophyIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No rewards yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          Start paying bills to earn reward points!
                        </Typography>
                        <Button
                          variant="contained"
                          onClick={() => navigate('/bills')}
                        >
                          Go to Bills
                        </Button>
                      </Box>
                    )}
                  </Paper>
                )}
                
                {activeTab === 2 && (
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom mb={3}>
                      Monthly Leaderboard
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Card sx={{ bgcolor: 'primary.light', border: '2px solid', borderColor: 'primary.main' }}>
                          <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Box display="flex" alignItems="center" gap={3}>
                                <Avatar
                                  sx={{
                                    width: 60,
                                    height: 60,
                                    bgcolor: getTierColor(userRank?.current_tier),
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '1.5rem'
                                  }}
                                >
                                  {userRank ? userRank.rank : '?'}
                                </Avatar>
                                <Box>
                                  <Typography variant="h6" fontWeight="bold">
                                    Your Ranking
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {userRank ? `Rank #${userRank.rank} this month` : 'Not ranked yet'}
                                  </Typography>
                                  <Typography variant="h4" color="primary" fontWeight="bold">
                                    {userRank?.total_points?.toLocaleString() || '0'} points
                                  </Typography>
                                </Box>
                              </Box>
                              <Box textAlign="right">
                                <Chip
                                  label={userRank?.current_tier || 'Bronze'}
                                  size="medium"
                                  sx={{
                                    bgcolor: `${getTierColor(userRank?.current_tier)}20`,
                                    color: getTierColor(userRank?.current_tier),
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    textTransform: 'capitalize'
                                  }}
                                />
                                <Typography variant="body2" color="text.secondary" mt={1}>
                                  {leaderboard.length} participants
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      {leaderboard.slice(0, 5).map((entry, index) => (
                        <Grid item xs={12} key={entry.user_id}>
                          <Card sx={{ 
                            opacity: entry.user_id === user?.id ? 1 : 0.9,
                            transition: 'all 0.3s ease',
                            '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                          }}>
                            <CardContent>
                              <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box display="flex" alignItems="center" gap={2}>
                                  <Avatar
                                    sx={{
                                      width: 40,
                                      height: 40,
                                      bgcolor: index < 3 ? ['#ffd700', '#c0c0c0', '#cd7f32'][index] : getTierColor(entry.current_tier),
                                      color: 'white',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {index < 3 ? ['🥇', '🥈', '🥉'][index] : entry.rank}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="subtitle1" fontWeight="medium">
                                      {entry.username}
                                      {entry.user_id === user?.id && (
                                        <Chip label="You" size="small" color="primary" sx={{ ml: 1 }} />
                                      )}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {entry.email}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Box textAlign="right">
                                  <Typography variant="h6" color="primary" fontWeight="bold">
                                    {entry.total_points.toLocaleString()} pts
                                  </Typography>
                                  <Chip
                                    label={entry.current_tier}
                                    size="small"
                                    sx={{
                                      bgcolor: `${getTierColor(entry.current_tier)}20`,
                                      color: getTierColor(entry.current_tier),
                                      textTransform: 'capitalize'
                                    }}
                                  />
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                )}
                
                {activeTab === 3 && (
                  <Paper sx={{ p: 3 }}>
                    <CurrencySummary userId={user?.id} compact={false} />
                  </Paper>
                )}
                
                {activeTab === 4 && (
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h5" gutterBottom mb={3}>
                      Reward Tiers & Benefits
                    </Typography>
                    
                    <Grid container spacing={3}>
                      {[
                        { 
                          tier: 'Bronze', 
                          points: '0-499', 
                          benefits: ['Basic bill tracking', 'Email support', 'Standard rewards'], 
                          color: '#cd7f32',
                          icon: '🥉'
                        },
                        { 
                          tier: 'Silver', 
                          points: '500-1,999', 
                          benefits: ['Priority support', 'Advanced analytics', 'Custom categories', '1.1x point multiplier'], 
                          color: '#c0c0c0',
                          icon: '🥈'
                        },
                        { 
                          tier: 'Gold', 
                          points: '2,000-4,999', 
                          benefits: ['Early feature access', 'Dedicated account manager', 'Enhanced security', '1.25x point multiplier'], 
                          color: '#ffd700',
                          icon: '🥇'
                        },
                        { 
                          tier: 'Platinum', 
                          points: '5,000-9,999', 
                          benefits: ['Custom integrations', 'API access', 'White-label reports', '24/7 chat support', '1.5x point multiplier'], 
                          color: '#e5e4e2',
                          icon: '🏆'
                        },
                        { 
                          tier: 'Diamond', 
                          points: '10,000+', 
                          benefits: ['24/7 phone support', 'Custom development', 'Enterprise features', 'Highest priority', '2x point multiplier'], 
                          color: '#b9f2ff',
                          icon: '💎'
                        }
                      ].map(tier => (
                        <Grid item xs={12} md={6} key={tier.tier}>
                          <Card 
                            className={`tier-card ${tier.tier.toLowerCase()}`}
                            sx={{ 
                              height: '100%',
                              border: summary?.current_tier?.toLowerCase() === tier.tier.toLowerCase() ? `3px solid ${tier.color}` : '1px solid #e0e0e0',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                transform: 'translateY(-4px)',
                                boxShadow: `0 8px 25px ${tier.color}40`
                              }
                            }}
                          >
                            <CardContent>
                              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                                <Box>
                                  <Typography variant="h4" color={tier.color} fontWeight="bold">
                                    {tier.tier}
                                  </Typography>
                                  <Typography variant="body1" color="text.secondary">
                                    {tier.points} points
                                  </Typography>
                                </Box>
                                <Avatar
                                  sx={{
                                    width: 60,
                                    height: 60,
                                    bgcolor: `${tier.color}20`,
                                    color: tier.color,
                                    fontSize: '2rem'
                                  }}
                                >
                                  {tier.icon}
                                </Avatar>
                              </Box>
                              
                              <Divider sx={{ my: 2 }} />
                              
                              <Typography variant="h6" gutterBottom>
                                Benefits
                              </Typography>
                              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                                {tier.benefits.map((benefit, index) => (
                                  <Typography 
                                    component="li" 
                                    variant="body2" 
                                    key={index}
                                    sx={{ 
                                      mb: 1,
                                      color: summary?.current_tier?.toLowerCase() === tier.tier.toLowerCase() ? tier.color : 'text.secondary'
                                    }}
                                  >
                                    {benefit}
                                  </Typography>
                                ))}
                              </Box>
                              
                              {summary?.current_tier?.toLowerCase() === tier.tier.toLowerCase() && (
                                <Alert 
                                  severity="success" 
                                  sx={{ mt: 3 }}
                                  icon={<StarIcon />}
                                >
                                  <Typography variant="subtitle2">
                                    Current Tier 🎉
                                  </Typography>
                                </Alert>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                )}
              </>
            )}
          </Grid>
        </Grid>
      </Container>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 280, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Rewards Program
          </Typography>
          
          <Box display="flex" flexDirection="column" gap={2} mt={3}>
            <Button
              variant={activeTab === 0 ? 'contained' : 'outlined'}
              color="primary"
              startIcon={<TrendingUpIcon />}
              onClick={() => {
                setActiveTab(0);
                setDrawerOpen(false);
              }}
              fullWidth
            >
              Overview
            </Button>
            
            <Button
              variant={activeTab === 1 ? 'contained' : 'outlined'}
              startIcon={<TimelineIcon />}
              onClick={() => {
                setActiveTab(1);
                setDrawerOpen(false);
              }}
              fullWidth
            >
              Recent Rewards
            </Button>
            
            <Button
              variant={activeTab === 2 ? 'contained' : 'outlined'}
              startIcon={<LeaderboardIcon />}
              onClick={() => {
                setActiveTab(2);
                setDrawerOpen(false);
              }}
              fullWidth
            >
              Leaderboard
            </Button>
            
            <Button
              variant={activeTab === 3 ? 'contained' : 'outlined'}
              startIcon={<CurrencyIcon />}
              onClick={() => {
                setActiveTab(3);
                setDrawerOpen(false);
              }}
              fullWidth
            >
              Currency
            </Button>
            
            <Button
              variant={activeTab === 4 ? 'contained' : 'outlined'}
              startIcon={<TrophyIcon />}
              onClick={() => {
                setActiveTab(4);
                setDrawerOpen(false);
              }}
              fullWidth
            >
              Tiers & Benefits
            </Button>
          </Box>
          
          {/* User Stats */}
          {summary && (
            <Box mt={4} pt={3} borderTop={1} borderColor="divider">
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Your Stats
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: getTierColor(summary.current_tier),
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  {summary.current_tier === 'Bronze' ? '🥉' :
                   summary.current_tier === 'Silver' ? '🥈' :
                   summary.current_tier === 'Gold' ? '🥇' :
                   summary.current_tier === 'Platinum' ? '🏆' : '💎'}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {summary.total_points.toLocaleString()} pts
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.current_tier} Tier
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
};

export default Rewards;