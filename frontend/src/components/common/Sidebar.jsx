// FINAL FILE: src/components/common/Sidebar.jsx

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';

import {
  Dashboard,
  AccountBalance,
  Receipt,
  TrendingUp,
  CreditCard,
  Settings,
  Logout,
  ReceiptLong,
  Insights,
  Notifications,
  Download,
} from '@mui/icons-material';

import { useAuth } from '../../context/AuthContext';

export const SIDEBAR_WIDTH = 250;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Accounts', icon: <AccountBalance />, path: '/accounts' },
  { text: 'Transactions', icon: <Receipt />, path: '/transactions' },
  { text: 'Budgets', icon: <TrendingUp />, path: '/budgets' },
  { text: 'Bills', icon: <ReceiptLong />, path: '/bills' },
  { text: 'Rewards', icon: <TrendingUp />, path: '/rewards' },

  // Milestone 4
  { text: 'Insights', icon: <Insights />, path: '/insights' },
  { text: 'Alerts', icon: <Notifications />, path: '/alerts' },
  { text: 'Reports', icon: <Download />, path: '/reports' },

  // Utility
  { text: 'Cards', icon: <CreditCard />, path: '/cards' },
  { text: 'Settings', icon: <Settings />, path: '/settings' },
];

const Sidebar = ({ open = false, onClose }) => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { logout } = useAuth();

  const drawerContent = (
    <Box sx={{ width: SIDEBAR_WIDTH, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" color="primary" fontWeight="bold">
          BankDash
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Financial Dashboard
        </Typography>
      </Box>

      <Divider />

      {/* Navigation */}
      <List sx={{ flex: 1 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <ListItem
              key={item.text}
              component={Link}
              to={item.path}
              onClick={isMobile ? onClose : undefined}
              sx={{
                mx: 1,
                mb: 0.5,
                borderRadius: 2,
                color: isActive ? theme.palette.primary.main : 'inherit',
                backgroundColor: isActive
                  ? theme.palette.primary.light + '20'
                  : 'transparent',
                transition: 'all .15s ease',
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive ? theme.palette.primary.main : 'inherit',
                  minWidth: 36,
                }}
              >
                {item.icon}
              </ListItemIcon>

              <ListItemText primary={item.text} />
            </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* Logout */}
      <List>
        <ListItem
          onClick={logout}
          sx={{
            mx: 1,
            mb: 1,
            borderRadius: 2,
            cursor: 'pointer',
            '&:hover': { backgroundColor: theme.palette.error.light + '20' },
          }}
        >
          <ListItemIcon>
            <Logout />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );

  // Mobile drawer
  if (isMobile) {
    return (
      <Drawer anchor="left" open={open} onClose={onClose}>
        {drawerContent}
      </Drawer>
    );
  }

  // Desktop drawer
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
