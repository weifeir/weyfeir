import React, { useState, useEffect } from 'react';
import { 
  Paper, 
  BottomNavigation, 
  BottomNavigationAction, 
  Badge,
  Box
} from '@mui/material';
import { 
  Home as HomeIcon,
  Category as CategoryIcon,
  ShoppingCart as CartIcon,
  Notifications as NotificationsIcon,
  Person as AccountIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  
  // Set initial active tab based on current path when component mounts
  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActiveTab(0);
    else if (path.includes('/cart')) setActiveTab(2);
    else if (path.includes('/notifications')) setActiveTab(3);
    else if (path.includes('/account') || path.includes('/profile')) setActiveTab(4);
  }, [location.pathname]);

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        display: { xs: 'block', sm: 'none' },
        zIndex: 1000,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
        boxShadow: '0px -2px 10px rgba(0,0,0,0.1)'
      }} 
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={activeTab}
        sx={{
          bgcolor: '#fff',
          height: 60,
          '& .MuiBottomNavigationAction-root': {
            color: '#757575',
            '&.Mui-selected': {
              color: '#FF4D33',
            }
          }
        }}
      >
        <BottomNavigationAction 
          label="Home" 
          icon={<HomeIcon />} 
          onClick={() => {
            navigate('/');
            setActiveTab(0);
          }}
        />
        <BottomNavigationAction 
          label="Categories" 
          icon={<CategoryIcon />} 
          onClick={() => {
            navigate('/');
            setActiveTab(1);
          }}
        />
        <BottomNavigationAction 
          label="Cart" 
          icon={
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <CartIcon />
            </Box>
          }
          onClick={() => {
            navigate('/cart');
            setActiveTab(2);
          }}
        />
        <BottomNavigationAction 
          label="Notifications" 
          icon={<NotificationsIcon />} 
          onClick={() => {
            navigate('/customer/login');
            setActiveTab(3);
          }}
        />
        <BottomNavigationAction 
          label="Account" 
          icon={<AccountIcon />} 
          onClick={() => {
            navigate('/customer/login');
            setActiveTab(4);
          }}
        />
      </BottomNavigation>
    </Paper>
  );
};

export default MobileBottomNav;
