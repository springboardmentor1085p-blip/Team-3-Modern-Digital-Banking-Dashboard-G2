import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  LinearProgress,
  Tooltip,
  Avatar,
  Divider,
  Collapse,
  Button,
  Grid
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Paid as PaidIcon,
  Timer as TimerIcon,
  Category as CategoryIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  Share as ShareIcon,
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { useSnackbar } from '../../context/SnackbarContext';
import './RewardCard.css';

const RewardCard = ({ reward, onFavoriteToggle, compact = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(reward.is_favorite || false);
  const { showSuccess } = useSnackbar();

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleFavoriteToggle = async () => {
    try {
      setIsFavorite(!isFavorite);
      if (onFavoriteToggle) {
        await onFavoriteToggle(reward.id, !isFavorite);
      }
      showSuccess(
        !isFavorite ? 'Added to favorites' : 'Removed from favorites'
      );
    } catch (error) {
      setIsFavorite(isFavorite);
      showSuccess('Failed to update favorite');
    }
  };

  const handleShare = async () => {
    try {
      const shareData = {
        title: `Earned ${reward.points} Reward Points!`,
        text: `I just earned ${reward.points} points in the BillTracker rewards program!`,
        url: window.location.href,
      };
      
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`Earned ${reward.points} reward points!`);
        showSuccess('Link copied to clipboard');
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  // Calculate tier based on points
  const getTierInfo = (points) => {
    if (points >= 10000) {
      return { tier: 'Diamond', color: '#b9f2ff', icon: '💎', level: 5 };
    } else if (points >= 5000) {
      return { tier: 'Platinum', color: '#e5e4e2', icon: '🥇', level: 4 };
    } else if (points >= 2000) {
      return { tier: 'Gold', color: '#ffd700', icon: '🥈', level: 3 };
    } else if (points >= 500) {
      return { tier: 'Silver', color: '#c0c0c0', icon: '🥉', level: 2 };
    } else {
      return { tier: 'Bronze', color: '#cd7f32', icon: '🏅', level: 1 };
    }
  };

  const tierInfo = getTierInfo(reward.points);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Calculate point multiplier
  const calculateMultiplier = () => {
    let multiplier = 1.0;
    if (reward.on_time_payment) multiplier *= 1.5;
    if (reward.category === 'rent' || reward.category === 'mortgage') multiplier *= 1.2;
    if (reward.category === 'credit_card') multiplier *= 1.5;
    return multiplier.toFixed(1);
  };

  const multiplier = calculateMultiplier();

  // Calculate progress to next tier
  const calculateTierProgress = () => {
    const tierRanges = [
      { min: 0, max: 499 },
      { min: 500, max: 1999 },
      { min: 2000, max: 4999 },
      { min: 5000, max: 9999 },
      { min: 10000, max: Infinity }
    ];
    
    const currentTierIndex = tierInfo.level - 1;
    if (currentTierIndex >= 4) return 100; // Diamond tier
    
    const currentTier = tierRanges[currentTierIndex];
    const nextTier = tierRanges[currentTierIndex + 1];
    
    const pointsInTier = reward.points - currentTier.min;
    const tierRange = nextTier.min - currentTier.min;
    
    return Math.min(100, (pointsInTier / tierRange) * 100);
  };

  const tierProgress = calculateTierProgress();

  if (compact) {
    return (
      <Card className="reward-card compact">
        <CardContent sx={{ p: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar
                sx={{
                  bgcolor: `${tierInfo.color}30`,
                  color: tierInfo.color,
                  width: 40,
                  height: 40,
                  fontWeight: 'bold'
                }}
              >
                {tierInfo.icon}
              </Avatar>
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">
                  +{reward.points} pts
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format(parseISO(reward.earned_at), 'MMM dd')}
                </Typography>
              </Box>
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Chip
                label={reward.category}
                size="small"
                variant="outlined"
                sx={{ textTransform: 'capitalize' }}
              />
              {reward.on_time_payment && (
                <Tooltip title="On-time payment">
                  <TimerIcon color="success" fontSize="small" />
                </Tooltip>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`reward-card ${tierInfo.tier.toLowerCase()}`}>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              className="tier-avatar"
              sx={{
                bgcolor: `${tierInfo.color}30`,
                color: tierInfo.color,
                width: 56,
                height: 56,
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}
            >
              {tierInfo.icon}
            </Avatar>
            <Box>
              <Typography variant="h6" component="div" fontWeight="bold">
                +{reward.points} Reward Points
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {format(parseISO(reward.earned_at), 'MMM dd, yyyy • h:mm a')}
              </Typography>
            </Box>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"}>
              <IconButton size="small" onClick={handleFavoriteToggle}>
                {isFavorite ? (
                  <StarIcon sx={{ color: '#ffb400' }} />
                ) : (
                  <StarBorderIcon />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Share achievement">
              <IconButton size="small" onClick={handleShare}>
                <ShareIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Tier Progress */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="body2" color="text.secondary">
              {tierInfo.tier} Tier • Level {tierInfo.level}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(tierProgress)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={tierProgress}
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
            {tierInfo.level < 5 ? 
              `${10000 - reward.points} points to Diamond` : 
              'Maximum tier achieved!'}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Reward Details */}
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                <PaidIcon fontSize="small" />
                Bill Amount
              </Typography>
              <Typography variant="h6" color="primary.main">
                {formatCurrency(reward.bill_amount)}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                <CategoryIcon fontSize="small" />
                Category
              </Typography>
              <Chip
                label={reward.category}
                size="small"
                variant="outlined"
                sx={{ mt: 0.5, textTransform: 'capitalize' }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                <TimerIcon fontSize="small" />
                Payment
              </Typography>
              <Typography variant="body1" color={reward.on_time_payment ? 'success.main' : 'warning.main'}>
                {reward.on_time_payment ? 'On Time' : 'Late'}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" display="flex" alignItems="center" gap={0.5}>
                <TrendingUpIcon fontSize="small" />
                Multiplier
              </Typography>
              <Typography variant="h6" color="success.main">
                {multiplier}x
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {reward.description && (
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary">
              {reward.description}
            </Typography>
          </Box>
        )}

        {/* Expandable Section */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom color="primary">
              Points Breakdown
            </Typography>
            
            <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Base points (10 points/$)</Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {Math.round(reward.bill_amount * 10)} pts
                    </Typography>
                  </Box>
                </Grid>
                
                {reward.on_time_payment && (
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">On-time payment bonus (1.5x)</Typography>
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        +{Math.round(reward.bill_amount * 10 * 0.5)} pts
                      </Typography>
                    </Box>
                  </Grid>
                )}
                
                {(reward.category === 'rent' || reward.category === 'mortgage' || reward.category === 'credit_card') && (
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">
                        {reward.category === 'credit_card' ? 'Credit card bonus' : 'Priority category bonus'}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="success.main">
                        +{Math.round(reward.bill_amount * 10 * 0.2)} pts
                      </Typography>
                    </Box>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body1" fontWeight="bold">Total Points</Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary">
                      {reward.points} pts
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
            
            {reward.bill_id && (
              <Box mt={2}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => window.location.href = `/bills/${reward.bill_id}`}
                >
                  View Related Bill
                </Button>
              </Box>
            )}
          </Box>
        </Collapse>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button
          size="small"
          onClick={handleExpandClick}
          endIcon={
            <ExpandMoreIcon
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s'
              }}
            />
          }
        >
          {expanded ? 'Show Less' : 'View Details'}
        </Button>
        
        <Box display="flex" alignItems="center" gap={1}>
          {tierInfo.level >= 3 && (
            <Tooltip title={`${tierInfo.tier} Tier Achieved`}>
              <TrophyIcon sx={{ color: tierInfo.color }} />
            </Tooltip>
          )}
          <Chip
            icon={<CalendarIcon />}
            label={`Level ${tierInfo.level}`}
            size="small"
            variant="outlined"
            sx={{ borderColor: tierInfo.color, color: tierInfo.color }}
          />
        </Box>
      </CardActions>
    </Card>
  );
};

RewardCard.propTypes = {
  reward: PropTypes.shape({
    id: PropTypes.number.isRequired,
    points: PropTypes.number.isRequired,
    bill_amount: PropTypes.number.isRequired,
    category: PropTypes.string.isRequired,
    on_time_payment: PropTypes.bool.isRequired,
    description: PropTypes.string,
    earned_at: PropTypes.string.isRequired,
    bill_id: PropTypes.number,
    is_favorite: PropTypes.bool,
  }).isRequired,
  onFavoriteToggle: PropTypes.func,
  compact: PropTypes.bool,
};

export default RewardCard;