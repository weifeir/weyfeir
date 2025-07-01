import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { styled, useTheme, alpha } from '@mui/material/styles';
import {
  Box, Typography, Paper, Grid, Button, Drawer, List, ListItem,
  ListItemIcon, ListItemText, Divider, AppBar, Toolbar, IconButton,
  Badge, CssBaseline, Avatar, Tabs, Tab, CircularProgress, TextField,
  Container, Card, CardContent, CardMedia, Alert, AlertTitle, Snackbar,
  Menu, MenuItem, Tooltip, InputAdornment, TableContainer, Table, TableHead,
  TableBody, TableRow, TableCell, TablePagination, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, FormControl, InputLabel, Select,
  OutlinedInput, Chip, Modal, Backdrop, Fade, FormControlLabel, Switch, ListItemButton, 
  Step, StepLabel, Stepper, Collapse, LinearProgress, FormGroup, Checkbox,
  CardHeader, CardActions, Stack, Link, Fab, Rating
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ShoppingBag as ShoppingBagIcon,
  Settings as SettingsIcon,
  ExitToApp as ExitToAppIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  Add as AddIcon,
  MonetizationOn as MoneyIcon,
  ShoppingBasket as OrderIcon,
  Person as PersonIcon,
  Person as ProfileIcon,
  Store as StoreIcon,
  Category as CategoryIcon,
  PowerSettingsNew as LogoutIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  ChatBubble as ChatBubbleIcon,
  AttachMoney as AttachMoneyIcon,
  Create as CreateIcon,
  Cancel as CancelIcon,
  Save as SaveIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  Message as MessageIcon,
  MoreVert as MoreVertIcon,
  Assignment as AssignmentIcon,
  AssignmentInd as AssignmentIndIcon,
  DeleteSweep as DeleteSweepIcon,
  ShoppingCart as ShoppingCartIcon,
  AddShoppingCart as AddShoppingCartIcon,
  Remove as RemoveIcon,
  ShoppingCartCheckout as ShoppingCartCheckoutIcon,
  Block as BlockIcon,
  Visibility as VisibilityIcon,
  Inventory as ProductsIcon,
  ShoppingBag as SellersProductsIcon,
  Warehouse as StorehouseIcon,
  LocalShipping as LocalShippingIcon,
  Home as HomeIcon,
  CheckCircle as CheckCircleIcon,
  Chat as ConversationsIcon,
  AccountBalance,
  CurrencyBitcoin as CurrencyBitcoinIcon
} from '@mui/icons-material';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, setDoc, addDoc, orderBy, onSnapshot, serverTimestamp, getDoc, arrayUnion, arrayRemove, increment, documentId } from 'firebase/firestore';
import { Chat } from './ChatComponents';
import StatusUpdateModal from './StatusUpdateModal';
import WithdrawalRequestsManager from './WithdrawalRequestsManager';
import { addDummyProducts } from '../utils/dummyProducts';
import { useNotificationSound } from '../utils/notificationSound';

const drawerWidth = 260;

// Calculate the navbar height to position the sidebar correctly
const navbarHeight = 64;

// Create a styled main content area
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3), 
    transition: theme.transitions.create(['margin', 'background'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    background: 'linear-gradient(to bottom, #f5f7ff, #ffffff)',
    ...(open && {
      transition: theme.transitions.create(['margin', 'background'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  }),
);

// Enhanced styled components
const StyledDashboardCard = styled(Card)(({ theme, color }) => ({
      height: '100%',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 20,
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
      cursor: 'pointer',
  background: color ? `linear-gradient(135deg, ${color}, ${alpha(color, 0.8)})` : theme.palette.background.paper,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    right: 0,
    width: '150px',
    height: '150px',
    background: 'radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
    borderRadius: '0 0 0 100%',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '120px',
    height: '120px',
    background: 'radial-gradient(circle at center, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
    borderRadius: '0 100% 0 0',
  },
}));

const StyledSectionCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  overflow: 'visible',
  marginBottom: theme.spacing(4),
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  background: 'linear-gradient(to bottom right, #ffffff, #fafbff)',
  '&:hover': {
    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12)',
    transform: 'translateY(-4px)',
  },
  '& .MuiCardHeader-root': {
    paddingBottom: theme.spacing(2),
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    position: 'relative',
    background: 'linear-gradient(to right, rgba(63, 81, 181, 0.05), rgba(92, 107, 192, 0.02))',
    '&:after': {
      content: '""',
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '60px',
      height: 4,
      background: 'linear-gradient(to right, #3f51b5, #5c6bc0)',
      borderRadius: '0 0 4px 0',
      transition: 'width 0.3s ease'
    }
  },
  '&:hover .MuiCardHeader-root:after': {
    width: '120px',
  },
  '& .MuiCardContent-root': {
    padding: theme.spacing(3),
    '& .MuiTableContainer-root': {
      borderRadius: 16,
      boxShadow: 'none',
      border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    },
    '& .MuiTableHead-root .MuiTableCell-root': {
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
      color: theme.palette.text.primary,
      fontWeight: 600,
      borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.1)}`,
    },
    '& .MuiTableBody-root .MuiTableRow-root:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.02),
    }
  }
}));

const AnimatedAvatar = styled(Avatar)(({ theme, bgColor }) => ({
  backgroundColor: bgColor || alpha(theme.palette.primary.main, 0.1),
  color: theme.palette.primary.main,
  width: 64,
  height: 64,
  transform: 'rotate(-5deg)',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
  '&:hover': {
    transform: 'rotate(0deg) scale(1.1)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
  },
  '& .MuiSvgIcon-root': {
    fontSize: 36,
    transition: 'transform 0.3s ease',
  },
  '&:hover .MuiSvgIcon-root': {
    transform: 'scale(1.1) rotate(360deg)',
  }
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: drawerWidth,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundImage: 'linear-gradient(135deg, #1a237e, #283593, #303f9f, #3949ab)',
    color: 'white',
    borderRight: 'none',
    boxShadow: '2px 0 20px rgba(0, 0, 0, 0.2)',
    '&:before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      opacity: 0.1,
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2V6h4V4H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    }
  }
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 16,
  boxShadow: 'none',
  overflow: 'hidden',
  '& .MuiTableCell-head': {
    backgroundImage: 'linear-gradient(to right, #3f51b5, #5c6bc0)',
    color: theme.palette.common.white,
    fontWeight: 600,
    padding: theme.spacing(1.5, 2),
    fontSize: '0.875rem',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  },
  '& .MuiTableRow-root:nth-of-type(even)': {
    backgroundColor: alpha(theme.palette.primary.light, 0.04),
  },
  '& .MuiTableRow-root:hover': {
    backgroundColor: alpha(theme.palette.primary.light, 0.08),
  },
  '& .MuiTableCell-root': {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
    padding: theme.spacing(1.5, 2),
  },
  '& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root': {
    borderBottom: 'none',
  }
}));

const StyledChip = styled(Chip)(({ theme, chipcolor }) => {
  const getColorStyles = () => {
    switch(chipcolor) {
      case 'active':
        return {
          bgcolor: alpha(theme.palette.success.main, 0.12),
          color: theme.palette.success.dark,
          borderColor: alpha(theme.palette.success.main, 0.3),
          '&:hover': {
            bgcolor: alpha(theme.palette.success.main, 0.2),
          }
        };
      case 'pending':
        return {
          bgcolor: alpha(theme.palette.warning.main, 0.12),
          color: theme.palette.warning.dark,
          borderColor: alpha(theme.palette.warning.main, 0.3),
          '&:hover': {
            bgcolor: alpha(theme.palette.warning.main, 0.2),
          }
        };
      case 'frozen':
      case 'canceled':
        return {
          bgcolor: alpha(theme.palette.error.main, 0.12),
          color: theme.palette.error.dark,
          borderColor: alpha(theme.palette.error.main, 0.3),
          '&:hover': {
            bgcolor: alpha(theme.palette.error.main, 0.2),
          }
        };
      default:
        return {
          bgcolor: alpha(theme.palette.grey[500], 0.12),
          color: theme.palette.grey[700],
          borderColor: alpha(theme.palette.grey[500], 0.3),
          '&:hover': {
            bgcolor: alpha(theme.palette.grey[500], 0.2),
          }
        };
    }
  };

  return {
    fontWeight: 600,
    borderRadius: 12,
    border: '1px solid',
    transition: 'all 0.2s ease',
    padding: '4px 12px',
    height: 28,
    '&:hover': {
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      transform: 'translateY(-1px)'
    },
    ...getColorStyles()
  };
});

const SectionHeading = styled(Typography)(({ theme }) => ({
  position: 'relative',
  marginBottom: theme.spacing(3),
  paddingBottom: theme.spacing(1),
  fontWeight: 700,
  display: 'inline-block',
  '&:after': {
    content: '""',
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 4,
    width: 60,
    backgroundImage: 'linear-gradient(to right, #3f51b5, #9c27b0)',
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  '&:hover:after': {
    width: '100%',
  },
  '@keyframes fadeIn': {
    '0%': {
      opacity: 0,
      transform: 'translateY(10px)'
    },
    '100%': {
      opacity: 1,
      transform: 'translateY(0)'
    }
  },
  animation: 'fadeIn 0.5s ease-out forwards'
}));

const ScrollToTopButton = styled(IconButton)(({ theme }) => ({
  position: 'fixed',
  bottom: 20,
  right: 20,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.common.white,
  boxShadow: theme.shadows[5],
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  zIndex: 1000,
  transition: 'all 0.3s ease',
  transform: 'translateY(100px)',
  opacity: 0,
  '&.visible': {
    transform: 'translateY(0)',
    opacity: 1,
  }
}));

const StyledButton = styled(Button)(({ theme, color = 'primary', size = 'medium' }) => ({
  borderRadius: size === 'small' ? 8 : 12,
  textTransform: 'none',
  boxShadow: 'none',
  transition: 'all 0.3s ease',
  fontWeight: 600,
  padding: size === 'small' ? theme.spacing(0.5, 2) : theme.spacing(1, 2.5),
  '&:hover': {
    transform: color === 'error' ? 'none' : 'translateY(-2px)',
    boxShadow: color === 'error' ? 'none' : '0 4px 12px rgba(0,0,0,0.15)'
  },
  '&.MuiButton-contained': {
    backgroundImage: color === 'primary' ? 
      'linear-gradient(135deg, #3f51b5, #5c6bc0)' : 
      color === 'success' ? 
        'linear-gradient(135deg, #4caf50, #66bb6a)' : 
        color === 'error' ? 
          'linear-gradient(135deg, #f44336, #e57373)' : undefined,
    '&:hover': {
      backgroundImage: color === 'primary' ? 
        'linear-gradient(135deg, #303f9f, #3f51b5)' : 
        color === 'success' ? 
          'linear-gradient(135deg, #388e3c, #4caf50)' : 
          color === 'error' ? 
            'linear-gradient(135deg, #d32f2f, #f44336)' : undefined,
    }
  },
  '&.MuiButton-outlined': {
    borderWidth: 2,
    '&:hover': {
      borderWidth: 2
    }
  }
}));

const DashboardCard = ({ title, value, icon, color, onClick }) => {
  return (
    <StyledDashboardCard 
      elevation={1} 
      color={color}
    onClick={onClick}
  >
    <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
          <Box sx={{ mr: 2 }}>
            <Typography 
              variant="subtitle2" 
              gutterBottom 
          sx={{ 
                fontWeight: 600, 
                color: color ? 'rgba(255,255,255,0.9)' : 'text.secondary',
                fontSize: '0.875rem',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                mb: 1
              }}
            >
            {title}
          </Typography>
            <Typography 
              variant="h4" 
              component="div" 
              sx={{ 
                fontWeight: 700, 
                color: color ? 'white' : 'text.primary',
                textShadow: color ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
              }}
            >
            {value}
          </Typography>
        </Box>
          <AnimatedAvatar
            bgColor={color ? 'rgba(255, 255, 255, 0.2)' : undefined}
            sx={{ 
              color: color ? 'white' : 'primary.main',
              boxShadow: color ? '0 4px 20px rgba(0,0,0,0.2)' : undefined
            }}
          >
            {icon}
          </AnimatedAvatar>
      </Box>
    </CardContent>
    </StyledDashboardCard>
);
};

const SectionCard = ({ title, children, action }) => (
  <StyledSectionCard elevation={1}>
    <CardHeader
      title={
        <Typography variant="h6" fontWeight="600" sx={{ 
          position: 'relative',
          display: 'inline-block',
          color: 'text.primary',
          '&:after': {
            content: '""',
            position: 'absolute',
            bottom: -4,
            left: 0,
            width: 40,
            height: 3,
            backgroundColor: 'primary.main',
            borderRadius: 1.5,
            transition: 'width 0.3s ease'
          },
          '&:hover:after': {
            width: '100%'
          }
        }}>
          {title}
        </Typography>
      }
      action={action}
      sx={{ px: 3, py: 2.5 }}
    />
    <CardContent sx={{ p: 3, pt: 2 }}>
      {children}
    </CardContent>
  </StyledSectionCard>
);

const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    borderRadius: 20,
    boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
    background: 'linear-gradient(to bottom right, #ffffff, #fafbff)',
  },
  '& .MuiDialogTitle-root': {
    background: 'linear-gradient(to right, rgba(63, 81, 181, 0.05), rgba(92, 107, 192, 0.02))',
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    padding: theme.spacing(3),
  },
  '& .MuiDialogContent-root': {
    padding: theme.spacing(3),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(2, 3),
    background: alpha(theme.palette.background.default, 0.04),
  }
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: 12,
    transition: 'all 0.2s ease',
    '&:hover': {
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    },
    '&.Mui-focused': {
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    }
  }
}));

// Enhanced OrderDetailsModal for admin view
const OrderDetailsModal = ({ open, order, onClose, onUpdateStatus }) => {
  if (!order) return null;

  const formatDate = (timestamp) => {
    try {
      // Check if timestamp is a Firestore timestamp
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleString();
      }
      // Check if timestamp is a Date object
      else if (timestamp instanceof Date) {
        return timestamp.toLocaleString();
      }
      // Check if timestamp is a number (seconds or milliseconds since epoch)
      else if (typeof timestamp === 'number') {
        // Adjust for seconds vs milliseconds
        const dateTimestamp = timestamp > 9999999999 ? timestamp : timestamp * 1000;
        return new Date(dateTimestamp).toLocaleString();
      }
      // Handle string dates or timestamps
      else if (timestamp) {
        return new Date(timestamp).toLocaleString();
      }
      // If no valid timestamp, return current date/time
      return new Date().toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      // Return current date instead of 'Invalid date'
      return new Date().toLocaleString();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-modal={true}
      disablePortal={false}
      keepMounted
      container={document.body}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Order Details - #{order.orderNumber || order.id.substring(0, 8)}
          </Typography>
          <Chip
            label={order.status}
            color={
              order.status === 'completed' ? 'success' :
              order.status === 'processing' ? 'info' :
              order.status === 'assigned' ? 'primary' :
              order.status === 'on-the-way' ? 'warning' :
              order.status === 'cancelled' ? 'error' : 'default'
            }
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Customer Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom color="primary">
              Customer Information
            </Typography>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="textSecondary">Name:</Typography>
                <Typography variant="body1">{order.customerName || 'N/A'}</Typography>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="textSecondary">Email:</Typography>
                <Typography variant="body1">{order.customerEmail || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Phone:</Typography>
                <Typography variant="body1">{order.customerPhone || 'N/A'}</Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Shipping Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom color="primary">
              Shipping Information
            </Typography>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="textSecondary">Delivery Address:</Typography>
                <Typography variant="body1">{order.shippingAddress || 'No address provided'}</Typography>
              </Box>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="textSecondary">Order Date:</Typography>
                <Typography variant="body1">{formatDate(order.orderDate) || formatDate(order.createdAt) || 'N/A'}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Payment Method:</Typography>
                <Typography variant="body1">{order.paymentMethod || 'Not specified'}</Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Order Items */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom color="primary">
              Order Items
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <img
                            src={item.imageUrl || '/images/placeholder.png'}
                            alt={item.name}
                            style={{
                              width: 50,
                              height: 50,
                              objectFit: 'cover',
                              marginRight: 10,
                              borderRadius: 4
                            }}
                          />
                          <Box>
                            <Typography variant="body2" fontWeight="500">{item.name}</Typography>
                            {item.seller && (
                              <Typography variant="caption" color="text.secondary">
                                Seller: {item.seller.shopName || 'Unknown'}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>${parseFloat(item.price).toFixed(2)}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell align="right">
                        ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right">
                      <Typography variant="subtitle2">Total:</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle2" color="primary">
                        ${parseFloat(order.total).toFixed(2)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// Add the ProductModal component before the AdminDashboard component
const ProductModal = ({ open, onClose, product, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    category: '',
    stock: '',
    discount: ''
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price ? String(product.price) : '',
        imageUrl: product.imageUrl || '',
        category: product.category || '',
        stock: product.stock ? String(product.stock) : '',
        discount: product.discount ? String(product.discount) : ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        imageUrl: '',
        category: '',
        stock: '',
        discount: ''
      });
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const processedData = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock) || 0,
      discount: parseInt(formData.discount) || 0
    };

    onSave(processedData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            required
            fullWidth
            name="name"
            label="Product Name"
            value={formData.name}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            required
            fullWidth
            name="description"
            label="Description"
            value={formData.description}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            name="imageUrl"
            label="Image URL"
            value={formData.imageUrl}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            required
            fullWidth
            name="category"
            label="Category"
            value={formData.category}
            onChange={handleChange}
            margin="normal"
            select
          >
            <MenuItem value="electronics">Electronics</MenuItem>
            <MenuItem value="clothing">Clothing</MenuItem>
            <MenuItem value="books">Books</MenuItem>
            <MenuItem value="home">Home & Garden</MenuItem>
            <MenuItem value="toys">Toys & Games</MenuItem>
            <MenuItem value="sports">Sports & Outdoors</MenuItem>
            <MenuItem value="beauty">Beauty & Personal Care</MenuItem>
            <MenuItem value="automotive">Automotive</MenuItem>
          </TextField>
          <TextField
            required
            fullWidth
            name="price"
            label="Price"
            type="number"
            value={formData.price}
            onChange={handleChange}
            margin="normal"
            inputProps={{ min: 0, step: "0.01" }}
          />
          <TextField
            required
            fullWidth
            name="stock"
            label="Stock"
            type="number"
            value={formData.stock}
            onChange={handleChange}
            margin="normal"
            inputProps={{ min: 0 }}
          />
          <TextField
            fullWidth
            name="discount"
            label="Discount (%)"
            type="number"
            value={formData.discount}
            onChange={handleChange}
            margin="normal"
            inputProps={{ min: 0, max: 100 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {product ? 'Save Changes' : 'Add Product'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Add this component after the OrderDetailsModal but before the AdminDashboard component

// SellerDetailsModal component to display seller registration information
const SellerDetailsModal = ({ open, seller, onClose }) => {
  if (!seller) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Seller Registration Details
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <ClearIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" fontWeight="bold">Shop Name</Typography>
            <Typography variant="body1" paragraph>{seller.shopName || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" fontWeight="bold">Seller Name</Typography>
            <Typography variant="body1" paragraph>{seller.name || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" fontWeight="bold">Email</Typography>
            <Typography variant="body1" paragraph>{seller.email || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" fontWeight="bold">Phone</Typography>
            <Typography variant="body1" paragraph>{seller.phone || 'N/A'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" fontWeight="bold">Registration Date</Typography>
            <Typography variant="body1" paragraph>
              {seller.createdAt ? new Date(seller.createdAt).toLocaleDateString() : 'N/A'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1" fontWeight="bold">Status</Typography>
            <Chip 
              label={seller.status || 'N/A'} 
              color={
                seller.status === 'approved' ? 'success' : 
                seller.status === 'pending' ? 'warning' : 
                seller.status === 'rejected' ? 'error' : 'default'
              }
            />
          </Grid>
          
          {seller.address && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold">Address</Typography>
              <Typography variant="body1" paragraph>{seller.address}</Typography>
            </Grid>
          )}
          
          {seller.description && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold">Description</Typography>
              <Typography variant="body1" paragraph>{seller.description}</Typography>
            </Grid>
          )}
          
          {seller.businessType && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" fontWeight="bold">Business Type</Typography>
              <Typography variant="body1" paragraph>{seller.businessType}</Typography>
            </Grid>
          )}
          
          {seller.taxId && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" fontWeight="bold">Tax ID</Typography>
              <Typography variant="body1" paragraph>{seller.taxId}</Typography>
            </Grid>
          )}
          
          {/* ID Proof Images Section */}
          {seller.idProof && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>ID Proof Images</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {typeof seller.idProof === 'string' ? (
                  <Box 
                    component="img"
                    src={seller.idProof}
                    alt="ID Proof"
                    sx={{ 
                      width: 240, 
                      height: 180, 
                      objectFit: 'cover', 
                      border: '1px solid #ddd',
                      borderRadius: 1,
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(seller.idProof, '_blank')}
                  />
                ) : Array.isArray(seller.idProof) ? (
                  seller.idProof.map((image, index) => (
                    <Box 
                      key={index}
                      component="img"
                      src={image}
                      alt={`ID Proof ${index + 1}`}
                      sx={{ 
                        width: 240, 
                        height: 180, 
                        objectFit: 'cover', 
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(image, '_blank')}
                    />
                  ))
                ) : null}
              </Box>
            </Grid>
          )}
          
          {/* Alternative field names for ID proof images */}
          {!seller.idProof && (seller.idProofImages || seller.documents || seller.idProofFiles || seller.identityDocuments) && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>ID Proof Images</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {(() => {
                  const proofImages = seller.idProofImages || seller.documents || seller.idProofFiles || seller.identityDocuments;
                  
                  if (typeof proofImages === 'string') {
                    return (
                      <Box 
                        component="img"
                        src={proofImages}
                        alt="ID Proof"
                        sx={{ 
                          width: 240, 
                          height: 180, 
                          objectFit: 'cover', 
                          border: '1px solid #ddd',
                          borderRadius: 1,
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(proofImages, '_blank')}
                      />
                    );
                  } else if (Array.isArray(proofImages)) {
                    return proofImages.map((image, index) => (
                      <Box 
                        key={index}
                        component="img"
                        src={image}
                        alt={`ID Proof ${index + 1}`}
                        sx={{ 
                          width: 240, 
                          height: 180, 
                          objectFit: 'cover', 
                          border: '1px solid #ddd',
                          borderRadius: 1,
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(image, '_blank')}
                      />
                    ));
                  } else if (typeof proofImages === 'object') {
                    // Handle case where it's an object with URLs
                    return Object.values(proofImages).map((image, index) => {
                      if (typeof image === 'string') {
                        return (
                          <Box 
                            key={index}
                            component="img"
                            src={image}
                            alt={`ID Proof ${index + 1}`}
                            sx={{ 
                              width: 240, 
                              height: 180, 
                              objectFit: 'cover', 
                              border: '1px solid #ddd',
                              borderRadius: 1,
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(image, '_blank')}
                          />
                        );
                      }
                      return null;
                    }).filter(item => item !== null);
                  }
                  
                  return null;
                })()}
              </Box>
            </Grid>
          )}
          
          {/* Handle object format with front/back, frontImage/backImage structure */}
          {!seller.idProof && 
           !seller.idProofImages && 
           !seller.documents && 
           !seller.idProofFiles && 
           !seller.identityDocuments && 
           seller.verification && 
           seller.verification.documents && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>ID Proof Images</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {Object.entries(seller.verification.documents).map(([key, value], index) => {
                  if (typeof value === 'string') {
                    return (
                      <Box 
                        key={index}
                        component="img"
                        src={value}
                        alt={`ID Proof ${key}`}
                        sx={{ 
                          width: 240, 
                          height: 180, 
                          objectFit: 'cover', 
                          border: '1px solid #ddd',
                          borderRadius: 1,
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(value, '_blank')}
                      />
                    );
                  }
                  return null;
                })}
              </Box>
            </Grid>
          )}
          
          {/* Handle plain object structure with frontImage/backImage properties */}
          {!seller.idProof && 
           !seller.idProofImages && 
           !seller.documents && 
           !seller.idProofFiles && 
           !seller.identityDocuments && 
           typeof seller.frontImage === 'string' && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>ID Proof Images</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box 
                  component="img"
                  src={seller.frontImage}
                  alt="ID Proof Front"
                  sx={{ 
                    width: 240, 
                    height: 180, 
                    objectFit: 'cover', 
                    border: '1px solid #ddd',
                    borderRadius: 1,
                    cursor: 'pointer'
                  }}
                  onClick={() => window.open(seller.frontImage, '_blank')}
                />
                {seller.backImage && (
                  <Box 
                    component="img"
                    src={seller.backImage}
                    alt="ID Proof Back"
                    sx={{ 
                      width: 240, 
                      height: 180, 
                      objectFit: 'cover', 
                      border: '1px solid #ddd',
                      borderRadius: 1,
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(seller.backImage, '_blank')}
                  />
                )}
              </Box>
            </Grid>
          )}
          
          {/* For when idProof is an object with front/back properties */}
          {seller.idProof && typeof seller.idProof === 'object' && !Array.isArray(seller.idProof) && (
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>ID Proof Images</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {Object.entries(seller.idProof).map(([key, value], index) => {
                  if (typeof value === 'string') {
                    return (
                      <Box 
                        key={index}
                        component="img"
                        src={value}
                        alt={`ID Proof ${key}`}
                        sx={{ 
                          width: 240, 
                          height: 180, 
                          objectFit: 'cover', 
                          border: '1px solid #ddd',
                          borderRadius: 1,
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(value, '_blank')}
                      />
                    );
                  }
                  return null;
                })}
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  // State declarations
  const [pendingSellers, setPendingSellers] = useState([]);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalSellers: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewingCustomers, setIsViewingCustomers] = useState(false);
  const [isViewingProducts, setIsViewingProducts] = useState(false);
  const [sellers, setSellers] = useState([]);
  const [availableSellers, setAvailableSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [isSellerEditModalOpen, setIsSellerEditModalOpen] = useState(false);
  const [isViewingSellers, setIsViewingSellers] = useState(false);
  // Add state for seller details modal
  const [selectedSellerDetails, setSelectedSellerDetails] = useState(null);
  const [isSellerDetailsModalOpen, setIsSellerDetailsModalOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [sellerWithProducts, setSellerWithProducts] = useState([]);
  const [sellersProductsLoading, setSellersProductsLoading] = useState(false);
  const [customerProfiles, setCustomerProfiles] = useState([]);
  const [selectedCustomerProfile, setSelectedCustomerProfile] = useState(null);
  const [isCustomerProfileModalOpen, setIsCustomerProfileModalOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [unreadConversationsCount, setUnreadConversationsCount] = useState(() => {
    // Check localStorage for persisted unread count, default to 1 if not found
    const savedCount = localStorage.getItem('adminUnreadConversationsCount');
    return savedCount !== null ? parseInt(savedCount, 10) : 1;
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Cart state variables
  const [adminCart, setAdminCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedOrderInTable, setSelectedOrderInTable] = useState(null);
  const [isOrderTableModalOpen, setIsOrderTableModalOpen] = useState(false);
  const [open, setOpen] = useState(true);
  const [isAssignOrderModalOpen, setIsAssignOrderModalOpen] = useState(false);
  const [orderToAssign, setOrderToAssign] = useState(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isStatusUpdateModalOpen, setIsStatusUpdateModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Create a ref for the payment method input
  const paymentMethodInputRef = useRef(null);
  
  // Helper function for date formatting
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";

    try {
      // Check if timestamp is a Firestore timestamp
      if (timestamp && typeof timestamp.toDate === 'function') {
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(timestamp.toDate());
      }
      // Check if timestamp is a Date object
      else if (timestamp instanceof Date) {
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(timestamp);
      }
      // Check if timestamp is a number (seconds or milliseconds since epoch)
      else if (typeof timestamp === 'number') {
        // Adjust for seconds vs milliseconds
        const dateTimestamp = timestamp > 9999999999 ? timestamp : timestamp * 1000;
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date(dateTimestamp));
      }
      // Handle string dates or timestamps
      else if (timestamp) {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(date);
        }
      }
      
      console.warn("Unable to format date:", timestamp);
      return "N/A";
    } catch (error) {
      console.error('Error formatting date:', error, timestamp);
      return "N/A";
    }
  };
  
  // Define a local placeholder image path
  const placeholderImage = process.env.PUBLIC_URL + '/images/product1.jpg';

  const [adminProfile, setAdminProfile] = useState({
    name: 'Admin',
    email: 'admin@example.com',
    role: 'Administrator',
    lastLogin: new Date().toISOString()
  });

  // Add state for profile edit mode and dialog visibility
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: '',
    email: '',
    role: ''
  });
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);

  // Add these state declarations with the other state declarations in the main component (around line 810-870)
  const [sellersProductsPage, setSellersProductsPage] = useState(0);
  const [sellersProductsRowsPerPage, setSellersProductsRowsPerPage] = useState(10);
  const [selectedSellerEmail, setSelectedSellerEmail] = useState('');

  // Add these state declarations near other state declarations
  const [sellersCache, setSellersCache] = useState({});
  const [lastSellersRefresh, setLastSellersRefresh] = useState(null);
  const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  // Add this with the other state variables
  const [sellerEmailSearch, setSellerEmailSearch] = useState('');
  const [orderEmailSearch, setOrderEmailSearch] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  
  const { playNotificationSound } = useNotificationSound();
  
  useEffect(() => {
    if (activeTab === 'storehouse' || activeTab === 'products') {
      fetchProducts();
    } else if (activeTab === 'sellersProducts') {
      fetchSellersWithProducts();
    } else if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [activeTab]);

  // Add a separate useEffect to fetch data on initial load
  useEffect(() => {
    fetchDashboardData();
    initializeProduct();
    
    // Fetch sellers and products for the Sellers Products section
    fetchSellers();
    fetchProducts();
    
    // Always fetch sellers with products on component mount
    fetchSellersWithProducts();
    
    // Fetch orders on mount
    fetchOrders();
  }, []);

  // Listen for new messages and update unread indicator
  useEffect(() => {
    // Get admin ID from localStorage or auth
    const adminId = localStorage.getItem('adminId') || auth.currentUser?.uid;
    if (!adminId) {
      console.log('No admin ID available for chat monitoring');
      return;
    }
    
    console.log('Setting up chat listener for admin ID:', adminId);

    // Get reference to the chats collection
    const chatsRef = collection(db, 'chats');
    
    // Create a query for all chats where adminId matches
    const q = query(chatsRef, where('adminUid', '==', adminId));
    
    // Listen for changes in any chat documents
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Don't update if user is currently on conversations tab
      if (activeTab === 'conversations') return;
      
      // Calculate total unread count across all chats
      let totalUnreadCount = 0;
      
      console.log(`Found ${snapshot.docs.length} admin chats to check for unread messages`);
      
      snapshot.forEach((doc) => {
        const chatData = doc.data();
        const adminUnreadCount = chatData.adminUnreadCount || 0;
        totalUnreadCount += adminUnreadCount;
        
        if (adminUnreadCount > 0) {
          console.log(`Chat ${doc.id}: ${adminUnreadCount} unread messages`);
        }
      });
      
      // If there are unread messages, update the indicator
      if (totalUnreadCount > 0) {
        console.log(`Setting admin unread count to ${totalUnreadCount}`);
        setUnreadConversationsCount(totalUnreadCount);
        localStorage.setItem('adminUnreadConversationsCount', totalUnreadCount.toString());
      }
    }, error => {
      console.error('Error in admin chat listener:', error);
    });
    
    return () => unsubscribe();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch pending sellers
      await fetchPendingSellers();
      
      // Fetch statistics using the improved fetchStats function
      await fetchStats();
      
      // Rest of the function can stay as is
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setSnackbar({
        open: true,
        message: 'Error loading dashboard data',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingSellers = async () => {
    try {
      const sellersRef = collection(db, 'sellers');
      const q = query(sellersRef, where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const pendingSellers = [];
      querySnapshot.forEach((docSnapshot) => {
        pendingSellers.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });
      
      setPendingSellers(pendingSellers);
    } catch (error) {
      console.error('Error fetching pending sellers:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch customers count
      const customersSnapshot = await getDocs(collection(db, 'customers'));
      const customersCount = customersSnapshot.size;

      // Fetch active sellers count
      const sellersRef = collection(db, 'sellers');
      const activeSellersQuery = query(sellersRef, where('status', '==', 'active'));
      const activeSellersSnapshot = await getDocs(activeSellersQuery);
      const activeSellersCount = activeSellersSnapshot.size;

      // Fetch orders count and calculate revenue
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const ordersCount = ordersSnapshot.size;
      
      let totalRevenue = 0;
      ordersSnapshot.forEach((doc) => {
        const orderData = doc.data();
        
        // Only count revenue from completed or processing orders
        if (orderData.status === 'completed' || orderData.status === 'processing' || orderData.status === 'picked') {
          // Try to get the total amount from various fields that might contain it
          if (orderData.total) {
            totalRevenue += parseFloat(orderData.total);
          } else if (orderData.totalAmount) {
            totalRevenue += parseFloat(orderData.totalAmount);
          } else if (orderData.pendingAdded) {
            // As a fallback, use the pending added amount
            totalRevenue += parseFloat(orderData.pendingAdded);
          } else if (orderData.items && Array.isArray(orderData.items)) {
            // If we have order items, calculate from them
            let orderTotal = 0;
            orderData.items.forEach(item => {
              const itemPrice = parseFloat(item.price || 0);
              const itemQuantity = parseInt(item.quantity || 1);
              orderTotal += itemPrice * itemQuantity;
            });
            totalRevenue += orderTotal;
          }
        }
      });

      setStats({
        totalCustomers: customersCount,
        totalSellers: activeSellersCount,
        totalOrders: ordersCount,
        totalRevenue: totalRevenue.toFixed(2)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSellerApproval = async (sellerId, status) => {
    try {
      const sellerRef = doc(db, 'sellers', sellerId);
      await updateDoc(sellerRef, {
        status: status === 'approved' ? 'active' : status, // Set status to 'active' when approved
        approvalRequest: {
          status: status === 'approved' ? 'active' : status,
          updatedAt: new Date().toISOString()
        }
      });

      // Refresh the pending sellers list and stats
      await Promise.all([
        fetchPendingSellers(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error updating seller status:', error);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    // Clear unread indicator when the Conversations tab is opened
    if (tab === "conversations" && unreadConversationsCount > 0) {
      setUnreadConversationsCount(0);
      // Save to localStorage to persist across page refreshes
      localStorage.setItem('adminUnreadConversationsCount', '0');
    }
    
    // Fetch data based on the selected tab
    if (tab === 'sellersProducts') {
      fetchSellersWithProducts();
    } else if (tab === 'products' || tab === 'storehouse') {
      fetchProducts();
    }
  };

  const fetchCustomers = async () => {
    try {
      const customersSnapshot = await getDocs(collection(db, 'customers'));
      const customersData = [];
      customersSnapshot.forEach((docSnapshot) => {
        customersData.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleCustomerEdit = async (customerId, updatedData) => {
    try {
      const customerRef = doc(db, 'customers', customerId);
      await updateDoc(customerRef, updatedData);
      await fetchCustomers();
      setIsEditModalOpen(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  const handleCustomerDelete = async (customerId) => {
    try {
      await deleteDoc(doc(db, 'customers', customerId));
      await fetchCustomers();
      await fetchStats(); // Refresh the stats to update total customers
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const fetchSellers = async () => {
    try {
      const sellersRef = collection(db, 'sellers');
      // Modified query to include both active and frozen sellers
      const q = query(sellersRef, where('status', 'in', ['active', 'frozen']));
      const querySnapshot = await getDocs(q);
      
      const sellersData = [];
      querySnapshot.forEach((docSnapshot) => {
        const sellerData = docSnapshot.data();
        // Ensure all required fields are initialized
        if (!sellerData.paymentMethods) {
          sellerData.paymentMethods = [];
        }
        if (!sellerData.address) {
          sellerData.address = '';
        }
        // Make sure to include the actual password from Firestore
        sellersData.push({ 
          id: docSnapshot.id, 
          ...sellerData,
          password: sellerData.plainPassword || sellerData.password || 'N/A' // Try both password fields
        });
      });
      
      // Sort sellers by registration date (newest first)
      sellersData.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      
      setSellers(sellersData);
    } catch (error) {
      console.error('Error fetching sellers:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching sellers data',
        severity: 'error'
      });
    }
  };

  const handleSellerEdit = async (sellerId, updatedData) => {
    try {
      const sellerRef = doc(db, 'sellers', sellerId);
      await updateDoc(sellerRef, updatedData);
      await fetchSellers();
      await fetchStats(); // Refresh stats to update active sellers count
      setIsSellerEditModalOpen(false);
      setSelectedSeller(null);
    } catch (error) {
      console.error('Error updating seller:', error);
    }
  };

  const handleSellerDelete = async (sellerId) => {
    try {
      await deleteDoc(doc(db, 'sellers', sellerId));
      await fetchSellers();
      await fetchStats(); // Refresh stats to update active sellers count
    } catch (error) {
      console.error('Error deleting seller:', error);
    }
  };

  const handleDeactivateSeller = async (sellerId) => {
    try {
      // Use the more consistent handleUpdateSellerStatus function
      await handleUpdateSellerStatus(sellerId, 'frozen');
      
      // Refresh stats (already handled in handleUpdateSellerStatus)
      await fetchStats();
    } catch (error) {
      console.error('Error deactivating seller:', error);
      alert('Failed to deactivate seller. Please try again.');
    }
  };

  // Cart-related functions
  const handleAddToCart = (product) => {
    // Check if the product is already in the cart
    const existingItem = adminCart.find(item => item.id === product.id);

    if (existingItem) {
      // Update quantity if product already exists in cart
      const updatedCart = adminCart.map(item => 
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
      setAdminCart(updatedCart);
    } else {
      // Add new product to cart
      const cartItem = {
        id: product.id,
        name: product.name,
        price: product.price || 0,
        imageUrl: product.imageUrl || process.env.PUBLIC_URL + '/images/product1.jpg',
        quantity: 1,
        seller: product.seller || null
      };
      setAdminCart([...adminCart, cartItem]);
    }
    
    // Open the cart sidebar
    setIsCartOpen(true);
    
    // Show success message
    setSnackbar({
      open: true,
      message: 'Product added to cart!',
      severity: 'success'
    });
  };

  const initializeProduct = async () => {
    try {
      const productRef = doc(db, 'products', '1');
      const productDoc = await getDoc(productRef);

      if (!productDoc.exists()) {
        // Only create if product doesn't exist
        await setDoc(productRef, {
          id: '1',
          name: 'Toy Car',
          description: 'A beautiful and durable toy car for children. Perfect for playtime and collecting. Features smooth rolling wheels and detailed design.',
          imageUrl: process.env.PUBLIC_URL + '/images/product1.jpg',
          price: 20,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        // console.log('Product initialized successfully');
      }
      
      // Fetch products to refresh the display
      await fetchProducts();
    } catch (error) {
      console.error('Error initializing product:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const productsRef = collection(db, 'products');
      const querySnapshot = await getDocs(productsRef);
      
      const productsData = [];
      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        // Add default cost if not present (50% of price)
        const price = parseFloat(data.price) || 0;
        const cost = data.cost ? parseFloat(data.cost) : price * 0.5;
        
        productsData.push({ 
          id: docSnapshot.id, 
          ...data,
          price: price,
          cost: cost
        });
      });
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSellersWithProducts = async (forceRefresh = false) => {
    setSellersProductsLoading(true);
    
    try {
      // Check if we have valid cached data
      const currentTime = new Date().getTime();
      if (
        !forceRefresh && 
        lastSellersRefresh && 
        (currentTime - lastSellersRefresh < CACHE_EXPIRY_TIME) && 
        sellerWithProducts.length > 0
      ) {
        // Use cached data if it's less than 5 minutes old
        setSellersProductsLoading(false);
        return;
      }

      // Fetch all sellers first (with a smaller payload)
      const sellersQuery = query(
        collection(db, 'sellers')
        // Firebase v9 doesn't support select like this
      );
      const sellersSnapshot = await getDocs(sellersQuery);
      
      // Initialize an array to collect all product IDs with their respective sellers
      let productSellerPairs = [];
      let sellerMap = {};
      
      // Collect all product IDs and build a seller lookup map
      sellersSnapshot.docs.forEach(sellerDoc => {
        const sellerData = {
          id: sellerDoc.id,
          ...sellerDoc.data()
        };
        
        // Only process sellers who have products
        if (sellerData.products && sellerData.products.length > 0) {
          // For each product ID, create a pair with seller info
          sellerData.products.forEach(productId => {
            productSellerPairs.push({
              productId,
              seller: {
                id: sellerData.id,
                name: sellerData.name || 'Unnamed Seller',
                shopName: sellerData.shopName || 'Unnamed Shop',
                email: sellerData.email || 'No email'
              }
            });
            
            // Also maintain the sellerMap for caching
            sellerMap[`${productId}-${sellerData.id}`] = {
              id: sellerData.id,
              name: sellerData.name || 'Unnamed Seller',
              shopName: sellerData.shopName || 'Unnamed Shop',
              email: sellerData.email || 'No email'
            };
          });
        }
      });
      
      // If no products found, set empty array and return early
      if (productSellerPairs.length === 0) {
        setSellerWithProducts([]);
        setSellersProductsLoading(false);
        setLastSellersRefresh(currentTime);
        return;
      }
      
      // For caching purposes, get unique product IDs to fetch
      const allProductIds = productSellerPairs.map(pair => pair.productId);
      const uniqueProductIds = [...new Set(allProductIds)];
      
      // Check if we have any cached products we can use
      let productsToFetch = uniqueProductIds;
      let productsCache = {};
      
      if (sellersCache && Object.keys(sellersCache).length > 0) {
        productsToFetch = [];
        uniqueProductIds.forEach(productId => {
          if (sellersCache[productId]) {
            // Cache the product data for use below
            productsCache[productId] = sellersCache[productId];
          } else {
            // Need to fetch this product
            productsToFetch.push(productId);
          }
        });
      }
      
      // Fetch products in larger batches to reduce round trips
      const batchSize = 20; // Increased from 10 to 20
      
      // Fetch products we don't have in cache
      for (let i = 0; i < productsToFetch.length; i += batchSize) {
        const batch = productsToFetch.slice(i, i + batchSize);
        
        // Using an in query for multiple documents at once
        if (batch.length > 0) {
          const productsQuery = query(
            collection(db, 'products'),
            where(documentId(), 'in', batch)
          );
          
          const productsSnapshot = await getDocs(productsQuery);
          
          // Process the results
          productsSnapshot.docs.forEach(productDoc => {
            const productId = productDoc.id;
            const productData = productDoc.data();
            
            // Store in the cache
            setSellersCache(prev => ({
              ...prev,
              [productId]: {
                id: productId,
                ...productData
              }
            }));
            
            // Add to our local cache
            productsCache[productId] = {
              id: productId,
              ...productData
            };
          });
        }
      }
      
      // Now construct the final results by combining product data with seller info
      const productResults = productSellerPairs.map(({ productId, seller }) => {
        // If we have the product data (either from cache or fetched)
        if (productsCache[productId] || sellersCache[productId]) {
          const productData = productsCache[productId] || sellersCache[productId];
          return {
            ...productData,
            seller
          };
        }
        return null;
      }).filter(product => product !== null);
      
      setSellerWithProducts(productResults);
      setLastSellersRefresh(currentTime);
    } catch (error) {
      setError(error.message);
      console.error('Error fetching sellers with products:', error);
    } finally {
      setSellersProductsLoading(false);
    }
  };

  const handleRemoveProductFromSeller = async (sellerId, productId) => {
    try {
      // Get the seller document
      const sellerRef = doc(db, 'sellers', sellerId);
      const sellerDoc = await getDoc(sellerRef);
      
      if (!sellerDoc.exists()) {
        alert('Seller not found');
        return;
      }
      
      const sellerData = sellerDoc.data();
      
      // Check if the seller has the product
      if (!sellerData.products || !sellerData.products.includes(productId)) {
        alert('This product is not associated with this seller');
        return;
      }
      
      // Remove the product from the seller's products array
      const updatedProducts = sellerData.products.filter(id => id !== productId);
      
      // Update the seller document
      await updateDoc(sellerRef, {
        products: updatedProducts
      });
      
      // Update the local state immediately to avoid waiting for a full reload
      setSellerWithProducts(prevProducts => 
        prevProducts.filter(product => 
          !(product.id === productId && product.seller.id === sellerId)
        )
      );
      
      // Success notification
      setSnackbar({
        open: true,
        message: 'Product removed from seller successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error removing product from seller:', error);
      setSnackbar({
        open: true,
        message: 'Failed to remove product from seller: ' + error.message,
        severity: 'error'
      });
    }
  };

  // Function to assign a product to a seller (for testing)
  const assignProductToSeller = async (sellerId, productId) => {
    try {
      // Get the seller document
      const sellerRef = doc(db, 'sellers', sellerId);
      const sellerDoc = await getDoc(sellerRef);
      
      if (!sellerDoc.exists()) {
        console.error('Seller not found');
        return;
      }
      
      const sellerData = sellerDoc.data();
      
      // Check if the seller already has the product
      const currentProducts = sellerData.products || [];
      if (currentProducts.includes(productId)) {
        console.log('Seller already has this product');
        return;
      }
      
      // Add the product to the seller's products array
      const updatedProducts = [...currentProducts, productId];
      
      // Update the seller document
      await updateDoc(sellerRef, {
        products: updatedProducts
      });
      
      console.log(`Product ${productId} assigned to seller ${sellerId}`);
      
      // Refresh the sellers with products data
      await fetchSellersWithProducts();
    } catch (error) {
      console.error('Error assigning product to seller:', error);
    }
  };

  const handleProductEdit = async (productData) => {
    try {
      setLoading(true);
      
      if (editingProduct) {
        // Updating existing product
        const updatedData = {
          ...editingProduct,
          ...productData,
          updatedAt: serverTimestamp(),
        };

        // Remove any undefined or null values
        Object.keys(updatedData).forEach(key => {
          if (updatedData[key] === undefined || updatedData[key] === null) {
            delete updatedData[key];
          }
        });

        // Update in Firestore
        const productRef = doc(db, 'products', editingProduct.id);
        await updateDoc(productRef, updatedData);

        // Update local state
        setProducts(prevProducts => 
          prevProducts.map(p => 
            p.id === editingProduct.id ? { ...p, ...updatedData } : p
          )
        );

        setSnackbar({
          open: true,
          message: 'Product updated successfully',
          severity: 'success'
        });
      } else {
        // Adding new product
        const newProduct = {
          ...productData,
          isDummy: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'products'), newProduct);
        const addedProduct = { id: docRef.id, ...newProduct };
        
        setProducts(prevProducts => [...prevProducts, addedProduct]);

        setSnackbar({
          open: true,
          message: 'Product added successfully',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Error updating product:', error);
      setSnackbar({
        open: true,
        message: 'Error updating product: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
      setProductModalOpen(false);
      setEditingProduct(null);
    }
  };

  const handleProductDelete = async (productId) => {
    try {
      await deleteDoc(doc(db, 'products', productId));
      await fetchProducts();
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    }
  };

  const fetchCustomerProfiles = async () => {
    try {
      setLoading(true);
      const customersRef = collection(db, 'customers');
      const customersSnapshot = await getDocs(customersRef);
      
      const profiles = [];
      customersSnapshot.forEach((doc) => {
        profiles.push({ id: doc.id, ...doc.data() });
      });
      
      setCustomerProfiles(profiles);
    } catch (error) {
      console.error('Error fetching customer profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerProfileUpdate = async (customerId, updatedData) => {
    try {
      const customerRef = doc(db, 'customers', customerId);
      await updateDoc(customerRef, updatedData);
      
      setSnackbar({
        open: true,
        message: 'Customer profile updated successfully!',
        severity: 'success'
      });
      
      // Refresh customer profiles
      fetchCustomerProfiles();
      setIsCustomerProfileModalOpen(false);
    } catch (error) {
      console.error('Error updating customer profile:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update customer profile',
        severity: 'error'
      });
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(
        ordersRef,
        orderBy('createdAt', 'desc')
      );
      
      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = [];
      let pendingCount = 0;
      
      ordersSnapshot.forEach((doc) => {
        const orderData = doc.data();
        // Properly handle Firestore timestamp conversion
        const createdAt = orderData.createdAt && typeof orderData.createdAt.toDate === 'function'
          ? orderData.createdAt.toDate()
          : orderData.createdAt
            ? new Date(orderData.createdAt)
            : new Date();
            
        ordersData.push({ 
          id: doc.id, 
          ...orderData,
          createdAt: createdAt
        });
        
        if (orderData.status === 'pending') {
          pendingCount++;
        }
      });
      
      setOrders(ordersData);
      setFilteredOrders(ordersData);
      setPendingOrdersCount(pendingCount);
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (error.code === 'failed-precondition' || error.message.includes('requires an index')) {
        alert('Please wait while we set up the database. This may take a few minutes. If the issue persists, please contact support.');
        // Provide link to create index
        // console.log('Create the required index here:', error.message.split('https')[1]);
      } else {
      setSnackbar({
        open: true,
        message: 'Failed to fetch orders',
        severity: 'error'
      });
      }
    } finally {
      setLoading(false);
    }
  };

  // Track guarantee money amounts even outside the orders tab
  useEffect(() => {
    const fetchGuaranteeMoneyCount = async () => {
      try {
        const ordersRef = collection(db, 'orders');
        const pendingOrdersQuery = query(
          ordersRef,
          where('status', '==', 'pending')
        );
        
        const pendingOrdersSnapshot = await getDocs(pendingOrdersQuery);
        setPendingOrdersCount(pendingOrdersSnapshot.size);
      } catch (error) {
        console.error('Error fetching guarantee money count:', error);
        if (error.code === 'failed-precondition' || error.message.includes('requires an index')) {
          // Silent fail for index creation
          // console.log('Create the required index here:', error.message.split('https')[1]);
        }
      }
    };

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'orders'),
        where('status', '==', 'pending')
      ),
      (snapshot) => {
        setPendingOrdersCount(snapshot.size);
      },
      (error) => {
        console.error('Error in guarantee money listener:', error);
      }
    );

    fetchGuaranteeMoneyCount();
    
    return () => unsubscribe();
  }, []);

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      setLoading(true);
      
      // Get the order details
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        throw new Error('Order not found');
      }
      
      const orderData = orderDoc.data();
      const now = new Date();
      
      // Log the original order data
      console.log('ORIGINAL ORDER DATA:', JSON.stringify(orderData, null, 2));
      
      // Update the order status
      await updateDoc(orderRef, {
        status: newStatus,
        statusHistory: arrayUnion({
          status: newStatus,
          timestamp: now.toISOString(),
          updatedBy: 'admin',
          note: `Status updated to ${newStatus} by admin`
        })
      });
      
      // If the new status is 'completed', transfer the grand total amount to the seller's wallet
      if (newStatus === 'completed' && orderData.sellerId) {
        try {
          // DEBUG: Log all the calculation fields that might be used
          console.log('ORDER COMPLETION - Available fields for calculation:', {
            pendingAdded: orderData.pendingAdded,
            walletDeducted: orderData.walletDeducted,
            additionalProfit: orderData.additionalProfit,
            total: orderData.total,
            totalAmount: orderData.totalAmount,
            items: orderData.items ? orderData.items.length : 'none'
          });
          
          // Get the seller's current data FIRST
          const sellerRef = doc(db, 'sellers', orderData.sellerId);
          const sellerDoc = await getDoc(sellerRef);
          
          if (!sellerDoc.exists()) {
            throw new Error('Seller not found');
          }
          
            const sellerData = sellerDoc.data();
            const currentWalletBalance = Number(sellerData.walletBalance || 0);
            const currentPendingAmount = Number(sellerData.pendingAmount || 0);
            
          console.log('SELLER DATA BEFORE UPDATE:', {
            id: orderData.sellerId,
            walletBalance: currentWalletBalance,
            pendingAmount: currentPendingAmount
          });
          
          // FORCE APPROACH: Calculate the base amount and 23% profit directly from the order items
          let baseAmount = 0;
          let profitAmount = 0;
          let grandTotal = 0;
          
          // Method 1: Try to use pendingAdded from the order (most accurate)
          if (orderData.pendingAdded && Number(orderData.pendingAdded) > 0) {
            grandTotal = Number(orderData.pendingAdded);
            
            // If walletDeducted is available, we can use it to determine the base and profit split
            if (orderData.walletDeducted && Number(orderData.walletDeducted) > 0) {
              baseAmount = Number(orderData.walletDeducted);
              profitAmount = grandTotal - baseAmount;
            } else {
              // If not, we'll estimate (base is 81.3% of total, profit is 18.7%)
              baseAmount = Number((grandTotal / 1.23).toFixed(2));
              profitAmount = Number((grandTotal - baseAmount).toFixed(2));
            }
            
            console.log('METHOD 1 - Using pendingAdded from order:', {
              pendingAdded: grandTotal,
              baseAmount,
              profitAmount
            });
          }
          // Method 2: Try using walletDeducted + additionalProfit directly
          else if (orderData.walletDeducted && orderData.additionalProfit) {
            baseAmount = Number(orderData.walletDeducted);
            profitAmount = Number(orderData.additionalProfit);
            grandTotal = baseAmount + profitAmount;
            
            console.log('METHOD 2 - Using walletDeducted + additionalProfit:', {
              baseAmount,
              profitAmount,
              grandTotal
            });
          }
          // Method 3: Calculate from items
          else if (orderData.items && Array.isArray(orderData.items) && orderData.items.length > 0) {
            orderData.items.forEach(item => {
              const itemPrice = Number(item.price || 0);
              const itemQuantity = Number(item.quantity || 1);
              baseAmount += itemPrice * itemQuantity;
            });
            
            // Calculate 23% profit
            profitAmount = Number((baseAmount * 0.23).toFixed(2));
            grandTotal = baseAmount + profitAmount;
            
            console.log('METHOD 3 - Calculated from items:', {
              baseAmount,
              profitAmount,
              grandTotal
            });
          }
          // Method 4: Fall back to total/totalAmount if available
          else if (orderData.total || orderData.totalAmount) {
            const totalValue = Number(orderData.total || orderData.totalAmount || 0);
            baseAmount = Number((totalValue / 1.23).toFixed(2));
            profitAmount = Number((totalValue - baseAmount).toFixed(2));
            grandTotal = baseAmount + profitAmount;
            
            console.log('METHOD 4 - Using total/totalAmount:', {
              totalUsed: orderData.total ? 'total' : 'totalAmount',
              totalValue,
              baseAmount,
              profitAmount,
              grandTotal
            });
          }
          
          // Final safety check - ensure we have positive values
          baseAmount = Math.max(0, baseAmount);
          profitAmount = Math.max(0, profitAmount);
          grandTotal = baseAmount + profitAmount;
          
          console.log('FINAL CALCULATION RESULTS:', {
            baseAmount,
            profitAmount,
            grandTotal
          });
          
          // If we couldn't calculate a valid amount, log an error but don't throw
          if (grandTotal <= 0) {
            console.error('ERROR: Could not calculate a valid amount to transfer. Defaulting to 0.');
          }
          
          // Now we'll update the seller's wallet - FORCE TRANSFER AMOUNT FROM PENDING TO WALLET
          const newWalletBalance = currentWalletBalance + grandTotal;
          const newPendingAmount = Math.max(0, currentPendingAmount - grandTotal);
          
          console.log('WALLET UPDATE CALCULATION:', {
            previousWalletBalance: currentWalletBalance,
            previousPendingAmount: currentPendingAmount,
            transferAmount: grandTotal,
            newWalletBalance,
            newPendingAmount
          });
            
            // Update seller's wallet and pending amounts
            await updateDoc(sellerRef, {
              walletBalance: newWalletBalance,
              pendingAmount: newPendingAmount,
              lastUpdated: serverTimestamp()
            });
            
          // Verify the update was successful by getting the seller's data again
          const updatedSellerDoc = await getDoc(sellerRef);
          const updatedSellerData = updatedSellerDoc.data();
          
          console.log('SELLER DATA AFTER UPDATE:', {
            id: orderData.sellerId,
            walletBalance: updatedSellerData.walletBalance,
            pendingAmount: updatedSellerData.pendingAmount,
            expectedWalletBalance: newWalletBalance,
            expectedPendingAmount: newPendingAmount
          });
          
          // Add a transaction record for accounting
            await addDoc(collection(db, 'transactions'), {
              orderId: orderId,
              sellerId: orderData.sellerId,
            amount: grandTotal,
            baseAmount: baseAmount,
            profitAmount: profitAmount,
              type: 'order_completed',
              timestamp: serverTimestamp(),
            description: `Order #${orderData.orderNumber || orderId.substring(0, 8)} completed. $${baseAmount.toFixed(2)} base + $${profitAmount.toFixed(2)} profit (total $${grandTotal.toFixed(2)}) transferred from pending to wallet.`,
            walletBalanceBefore: currentWalletBalance,
            walletBalanceAfter: newWalletBalance,
            pendingAmountBefore: currentPendingAmount,
            pendingAmountAfter: newPendingAmount,
            processedBy: 'admin'
            });
            
            // Update the order with transfer information
            await updateDoc(orderRef, {
            pendingTransferred: grandTotal,
            baseAmountTransferred: baseAmount,
            profitAmountTransferred: profitAmount,
            transferredAt: serverTimestamp(),
            walletBalanceBefore: currentWalletBalance,
            walletBalanceAfter: newWalletBalance,
            pendingAmountBefore: currentPendingAmount,
            pendingAmountAfter: newPendingAmount
          });
          
          console.log(`SUCCESS: Transferred $${grandTotal.toFixed(2)} total (base: $${baseAmount.toFixed(2)} + profit: $${profitAmount.toFixed(2)}) from pending to wallet for seller ${orderData.sellerId}`);
          
          // Set a special message for this operation
      setSnackbar({
        open: true,
            message: `Order status updated to ${newStatus}. Transferred $${baseAmount.toFixed(2)} + $${profitAmount.toFixed(2)} profit (total $${grandTotal.toFixed(2)}) from pending to wallet balance.`,
        severity: 'success'
      });
        } catch (transferError) {
          // If there was an error in the transfer process, log it but don't throw
          console.error('ERROR during wallet transfer process:', transferError);
          setSnackbar({
            open: true,
            message: `Order status updated to ${newStatus}, but there was an error transferring funds: ${transferError.message}`,
            severity: 'warning'
          });
        }
      } else {
        // For other status updates, just show a success message
        setSnackbar({
          open: true,
          message: `Order status updated to ${newStatus}`,
          severity: 'success'
        });
      }

      // Refresh orders list
      await fetchOrders();
    } catch (error) {
      console.error('ERROR updating order status:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update order status: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsOrderDetailsModalOpen(true);
  };

  const handleCloseOrderDetailsModal = () => {
    setIsOrderDetailsModalOpen(false);
    setSelectedOrder(null);
  };

  const renderDashboardContent = () => {
    return (
      <Box sx={{ mt: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardCard
              title="Total Customers"
              value={stats.totalCustomers}
              icon={<PeopleIcon />}
              color="#3f51b5"
              onClick={() => handleTabChange('customers')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardCard
              title="Active Sellers"
              value={stats.totalSellers}
              icon={<StoreIcon />}
              color="#f44336"
              onClick={() => handleTabChange('sellers')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardCard
              title="Guarantee Money"
              value={pendingOrdersCount}
              icon={<LocalShippingIcon />}
              color="#ff9800"
              onClick={() => handleTabChange('orders')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <DashboardCard
              title="Total Revenue"
              value={`$${Number(stats.totalRevenue).toFixed(2)}`}
              icon={<MoneyIcon />}
              color="#4caf50"
              onClick={() => handleTabChange('revenue')}
            />
          </Grid>
        </Grid>
        
        {/* Pending sellers section with improved styling */}
        {pendingSellers.length > 0 && (
          <SectionCard 
            title="Pending Seller Approval Requests" 
            action={
              <StyledButton 
                startIcon={<RefreshIcon />} 
                size="small" 
                onClick={fetchPendingSellers} 
                variant="outlined"
              >
                Refresh
              </StyledButton>
            }
          >
            <StyledTableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} size="medium">
          <TableHead>
            <TableRow>
                    <TableCell>Shop Name</TableCell>
                    <TableCell>Seller Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
                    <TableCell>Registration Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>View Password</TableCell>
                    <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
                  {pendingSellers.map((seller) => (
                    <TableRow key={seller.id} hover>
                <TableCell>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {seller.shopName}
                        </Typography>
                    </TableCell>
                      <TableCell>{seller.name}</TableCell>
                      <TableCell>{seller.email}</TableCell>
                      <TableCell>{seller.phone}</TableCell>
                    <TableCell>
                        {new Date(seller.createdAt).toLocaleDateString()}
                    </TableCell>
                      <TableCell>{seller.status}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {seller.plainPassword || seller.password || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Approve Seller">
                          <StyledButton
                            variant="contained"
                        size="small"
                            color="success"
                            onClick={() => handleSellerApproval(seller.id, 'active')}
                            sx={{ mr: 1 }}
                            startIcon={<CheckCircleIcon />}
                          >
                            Approve
                          </StyledButton>
                        </Tooltip>
                        <Tooltip title="Reject Application">
                          <StyledButton
                    variant="outlined"
                            color="error"
                    size="small"
                    onClick={() => {
                              if (window.confirm('Are you sure you want to reject this seller?')) {
                                handleSellerApproval(seller.id, 'rejected');
                              }
                    }}
                            startIcon={<CancelIcon />}
                          >
                            Reject
                          </StyledButton>
                        </Tooltip>
                        <Tooltip title="View Seller Details">
                          <StyledButton
                            variant="outlined"
                            color="primary"
                            size="small"
                            onClick={() => {
                              setSelectedSellerDetails(seller);
                              setIsSellerDetailsModalOpen(true);
                            }}
                            startIcon={<VisibilityIcon />}
                          >
                            View
                          </StyledButton>
                        </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
            </StyledTableContainer>
    </SectionCard>
        )}

        {/* Quick Actions Section */}
        <SectionCard title="Quick Actions">
              <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Box 
                sx={{ 
                  p: 2, 
                  borderRadius: 3, 
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 6px 12px rgba(0,0,0,0.08)',
                    borderColor: 'primary.main',
                  }
                }}
                onClick={() => handleTabChange('orders')}
              >
                <Avatar sx={{ bgcolor: alpha('#2196F3', 0.1), color: '#2196F3', mr: 2 }}>
                  <OrderIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">Manage Orders</Typography>
                    <Typography variant="body2" color="text.secondary">
                    View and update customer orders
                    </Typography>
                    </Box>
                    </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box 
                sx={{ 
                  p: 2, 
                  borderRadius: 3, 
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 6px 12px rgba(0,0,0,0.08)',
                    borderColor: 'primary.main',
                  }
                }}
                onClick={() => handleTabChange('products')}
              >
                <Avatar sx={{ bgcolor: alpha('#4CAF50', 0.1), color: '#4CAF50', mr: 2 }}>
                  <ProductsIcon />
                </Avatar>
                                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">Manage Products</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add, edit or remove products
                                    </Typography>
                                </Box>
                              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Box 
                sx={{ 
                  p: 2, 
                  borderRadius: 3, 
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 6px 12px rgba(0,0,0,0.08)',
                    borderColor: 'primary.main',
                  }
                }}
                onClick={() => handleTabChange('sellersProducts')}
              >
                <Avatar sx={{ bgcolor: alpha('#9C27B0', 0.1), color: '#9C27B0', mr: 2 }}>
                  <SellersProductsIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">Seller Products</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage seller product assignments
                      </Typography>
                  </Box>
                </Box>
            </Grid>
            </Grid>
        </SectionCard>
      </Box>
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'dashboard') {
      if (isViewingSellers) {
        return (
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, ml: 0 }}>
              <Typography variant="h4" gutterBottom fontWeight="medium">
                Seller Management
              </Typography>
              <Button 
                startIcon={<ArrowBackIcon />} 
                variant="outlined" 
                onClick={() => setIsViewingSellers(false)}
              >
                Back to Dashboard
              </Button>
            </Box>

            <SectionCard 
              title="All Sellers"
              action={
                <Button 
                  startIcon={<RefreshIcon />} 
                  variant="outlined" 
                  size="small"
                  onClick={fetchSellers}
                >
                  Refresh
                </Button>
              }
            >
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Shop Name</TableCell>
                      <TableCell>Seller Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Registration Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>View Password</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sellers.map((seller) => (
                      <TableRow key={seller.id}>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {seller.shopName}
                          </Typography>
                        </TableCell>
                        <TableCell>{seller.name}</TableCell>
                        <TableCell>{seller.email}</TableCell>
                        <TableCell>{seller.phone}</TableCell>
                        <TableCell>
                          {new Date(seller.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{seller.status}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {seller.plainPassword || seller.password || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            onClick={() => {
                              const sellerWithDefaults = {
                                ...seller,
                                address: seller.address || '',
                                paymentMethods: seller.paymentMethods || []
                              };
                              setSelectedSeller(sellerWithDefaults);
                              setIsSellerEditModalOpen(true);
                            }}
                            sx={{ mr: 1 }}
                            startIcon={<EditIcon />}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to remove this seller?')) {
                                handleSellerDelete(seller.id);
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </Box>
        );
      }

      if (isViewingCustomers) {
        return (
          <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, ml: 0 }}>
              <Typography variant="h4" gutterBottom fontWeight="medium">
                Customer Management
              </Typography>
              <Button 
                startIcon={<ArrowBackIcon />} 
                variant="outlined" 
                onClick={() => setIsViewingCustomers(false)}
              >
                Back to Dashboard
              </Button>
            </Box>

            <SectionCard title="All Customers">
              <TableContainer>
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell>Registration Date</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell>{customer.address}</TableCell>
                        <TableCell>
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setIsEditModalOpen(true);
                            }}
                            sx={{ mr: 1 }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to remove this customer?')) {
                                handleCustomerDelete(customer.id);
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>

            {/* Edit Customer Modal */}
            <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
              <DialogTitle>Edit Customer</DialogTitle>
              <DialogContent>
                <Box component="form" sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Name"
                    defaultValue={selectedCustomer?.name}
                    margin="normal"
                    onChange={(e) => {
                      setSelectedCustomer({
                        ...selectedCustomer,
                        name: e.target.value
                      });
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    defaultValue={selectedCustomer?.email}
                    margin="normal"
                    onChange={(e) => {
                      setSelectedCustomer({
                        ...selectedCustomer,
                        email: e.target.value
                      });
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Phone"
                    defaultValue={selectedCustomer?.phone}
                    margin="normal"
                    onChange={(e) => {
                      setSelectedCustomer({
                        ...selectedCustomer,
                        phone: e.target.value
                      });
                    }}
                  />
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button 
                  onClick={() => handleCustomerEdit(selectedCustomer.id, {
                    name: selectedCustomer.name,
                    email: selectedCustomer.email,
                    phone: selectedCustomer.phone
                  })}
                  variant="contained"
                >
                  Save Changes
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        );
      }

      return (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, ml: 0 }}>
            <Typography variant="h4" fontWeight="medium">
              Admin Dashboard
            </Typography>
            <Button 
              startIcon={<RefreshIcon />} 
              variant="outlined" 
              onClick={fetchDashboardData}
              disabled={loading}
            >
              Refresh Data
            </Button>
          </Box>

          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardCard 
                title="Total Customers" 
                value={stats.totalCustomers} 
                icon={<PeopleIcon fontSize="large" />} 
                color="#4CAF50"
                onClick={() => {
                  setIsViewingCustomers(true);
                  fetchCustomers();
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardCard 
                title="Active Sellers" 
                value={stats.totalSellers} 
                icon={<StoreIcon fontSize="large" />} 
                color="#2196F3"
                onClick={() => {
                  setIsViewingSellers(true);
                  fetchSellers();
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardCard 
                title="Total Orders" 
                value={stats.totalOrders} 
                icon={<OrderIcon fontSize="large" />} 
                color="#FF9800"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DashboardCard 
                title="Total Revenue" 
                value={`$${Number(stats.totalRevenue).toFixed(2)}`}
                icon={<MoneyIcon fontSize="large" />} 
                color="#4CAF50"
              />
            </Grid>
          </Grid>

          <SectionCard 
            title="Pending Seller Approvals" 
            action={
              <Badge 
                badgeContent={pendingSellers.length} 
                color="error" 
                sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 20, minWidth: 20 } }}
              >
                <Typography variant="subtitle2" color="primary">
                  {pendingSellers.length} {pendingSellers.length === 1 ? 'Request' : 'Requests'}
                </Typography>
              </Badge>
            }
          >
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Shop Name</TableCell>
                    <TableCell>Seller Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Registration Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>View Password</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingSellers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Box py={3}>
                          <Typography color="textSecondary">
                            No pending approval requests
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingSellers.map((seller) => (
                      <TableRow key={seller.id}>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {seller.shopName}
                          </Typography>
                        </TableCell>
                        <TableCell>{seller.name}</TableCell>
                        <TableCell>{seller.email}</TableCell>
                        <TableCell>{seller.phone}</TableCell>
                        <TableCell>
                          {new Date(seller.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{seller.status}</TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {seller.plainPassword || seller.password || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleSellerApproval(seller.id, 'approved')}
                            sx={{ mr: 1 }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => handleSellerApproval(seller.id, 'rejected')}
                          >
                            Reject
                          </Button>
                          <Tooltip title="View Seller Details">
                            <StyledButton
                              variant="outlined"
                              color="primary"
                              size="small"
                              onClick={() => {
                                setSelectedSellerDetails(seller);
                                setIsSellerDetailsModalOpen(true);
                              }}
                              startIcon={<VisibilityIcon />}
                            >
                              View
                            </StyledButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>

          <SectionCard title="Recent Activity">
            <Typography color="textSecondary">
              No recent activity to display
            </Typography>
          </SectionCard>
        </Box>
      );
    } else if (activeTab === 'sellerProfiles') {
      return renderSellerProfilesContent();
    } else if (activeTab === 'products') {
      return (
        <Box sx={{ width: '100%' }}>
          <Typography variant="h4" gutterBottom>
            Products Management
          </Typography>
          <SectionCard title="All Products">
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                View all products below. To edit or delete products, please go to the Product Storehouse section.
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product ID</TableCell>
                    <TableCell>Image</TableCell>
                    <TableCell>Product Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Price</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.id}</TableCell>
                      <TableCell>
                        <Box
                          component="img"
                          src={product.imageUrl}
                          alt={product.name}
                          onError={(e) => {
                            e.target.onerror = null; // Prevent infinite loop
                            e.target.src = placeholderImage;
                          }}
                          sx={{
                            width: 100,
                            height: 100,
                            objectFit: 'cover',
                            borderRadius: 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            backgroundColor: '#f5f5f5',
                            display: 'block',
                            border: '1px solid #e0e0e0'
                          }}
                          loading="lazy"
                        />
                      </TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.description}</TableCell>
                      <TableCell>${product.price || 20}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </Box>
      );
    } else if (activeTab === 'storehouse') {
      return (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Product Storehouse</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={handleGenerateDummyProducts}
                disabled={loading}
              >
                Generate 200 Dummy Products
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingProduct(null);
                  setProductModalOpen(true);
                }}
              >
                Add New Product
              </Button>
            </Box>
          </Box>
          <SectionCard title="Inventory">
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product ID</TableCell>
                    <TableCell>Image</TableCell>
                    <TableCell>Product Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.id}</TableCell>
                      <TableCell>
                        <Box
                          component="img"
                          src={product.imageUrl}
                          alt={product.name}
                          onError={(e) => {
                            e.target.onerror = null; // Prevent infinite loop
                            e.target.src = placeholderImage;
                          }}
                          sx={{
                            width: 100,
                            height: 100,
                            objectFit: 'cover',
                            borderRadius: 1,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            backgroundColor: '#f5f5f5',
                            display: 'block',
                            border: '1px solid #e0e0e0'
                          }}
                          loading="lazy"
                        />
                      </TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.description}</TableCell>
                      <TableCell>${product.price || 0}</TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          onClick={() => {
                            setEditingProduct(product);
                            setProductModalOpen(true);
                          }}
                          sx={{ mr: 1 }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this product?')) {
                              handleProductDelete(product.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>

          <ProductModal
            open={productModalOpen}
            onClose={() => {
              setProductModalOpen(false);
              setEditingProduct(null);
            }}
            product={editingProduct}
            onSave={handleProductEdit}
          />
        </Box>
      );
    } else if (activeTab === 'orders') {
      return renderOrdersContent();
    } else if (activeTab === 'package') {
      return (
        <Box sx={{ width: '100%' }}>
          <Typography variant="h4" gutterBottom>
            Package Management
          </Typography>
          <SectionCard title="All Packages">
            <Typography color="textSecondary">
              Package management features will appear here
            </Typography>
          </SectionCard>
        </Box>
      );
    } else if (activeTab === 'spreadPackages') {
      return (
        <Box sx={{ width: '100%' }}>
          <Typography variant="h4" gutterBottom>
            Spread Packages
          </Typography>
          <SectionCard title="All Spread Packages">
            <Typography color="textSecondary">
              Spread package features will appear here
            </Typography>
          </SectionCard>
        </Box>
      );
    } else if (activeTab === 'affiliate') {
      return (
        <Box sx={{ width: '100%' }}>
          <Typography variant="h4" gutterBottom>
            Affiliate System
          </Typography>
          <SectionCard title="Affiliate Management">
            <Typography color="textSecondary">
              Affiliate system features will appear here
            </Typography>
          </SectionCard>
        </Box>
      );
    } else if (activeTab === 'withdraw') {
      return (
        <Box sx={{ width: '100%' }}>
          <Typography variant="h4" gutterBottom>
            Money Withdrawal Requests
          </Typography>
          <WithdrawalRequestsManager />
        </Box>
      );
    } else if (activeTab === 'conversations') {
      return (
        <Box sx={{ width: '100%' }}>
          {/* <Typography variant="h4" gutterBottom>
            Conversations
          </Typography> */}
          <Chat 
            isAdmin={true} 
            onMessageSent={handleNewMessage}
          />
        </Box>
      );
    } else if (activeTab === 'settings') {
      return (
        <Box sx={{ width: '100%' }}>
          <Typography variant="h4" gutterBottom>
            Shop Settings
          </Typography>
          <SectionCard title="General Settings">
            <Typography color="textSecondary">
              Shop settings will appear here
            </Typography>
          </SectionCard>
        </Box>
      );
    } else if (activeTab === 'refunds') {
      return (
        <Box sx={{ width: '100%' }}>
          <Typography variant="h4" gutterBottom>
            Received Refund Requests
          </Typography>
          <SectionCard title="All Refund Requests">
            <Typography color="textSecondary">
              Refund request features will appear here
            </Typography>
          </SectionCard>
        </Box>
      );
    } else if (activeTab === 'sellersProducts') {
      return renderSellersProductsContent();
    } else if (activeTab === 'customerProfiles') {
      return renderCustomerProfilesContent();
    } else if (activeTab === 'sellerProfiles') {
      return renderSellerProfilesContent();
    } else if (activeTab === 'addMoney') {
      return <AddMoneyForm />;
    } else if (activeTab === 'adminProfile') {
      return (
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom sx={{ color: '#1a237e', fontWeight: 'bold' }}>
            Admin Profile
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: '#1a237e', mr: 2 }}>
                        <ProfileIcon />
                      </Avatar>
                      <Typography variant="h6">Profile Information</Typography>
                    </Box>
                  }
                />
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Name
                      </Typography>
                      <Typography variant="body1">{adminProfile.name}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body1">{adminProfile.email}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Role
                      </Typography>
                      <Typography variant="body1">{adminProfile.role}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Last Login
                      </Typography>
                      <Typography variant="body1">
                        {new Date(adminProfile.lastLogin).toLocaleString()}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
                <CardActions sx={{ p: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleEditProfileOpen}
                    sx={{
                      bgcolor: '#1a237e',
                      '&:hover': {
                        bgcolor: '#283593',
                      },
                    }}
                  >
                    Edit Profile
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: '#1a237e', mr: 2 }}>
                        <SettingsIcon />
                      </Avatar>
                      <Typography variant="h6">Security Settings</Typography>
                    </Box>
                  }
                />
                <CardContent>
                  <Stack spacing={2}>
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={handleChangePasswordOpen}
                      sx={{ borderColor: '#1a237e', color: '#1a237e' }}
                    >
                      Change Password
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<SettingsIcon />}
                      sx={{ borderColor: '#1a237e', color: '#1a237e' }}
                    >
                      Two-Factor Authentication
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Edit Profile Dialog */}
          <Dialog open={isEditProfileOpen} onClose={handleEditProfileClose} maxWidth="sm" fullWidth>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EditIcon sx={{ mr: 1, color: '#1a237e' }} />
                <Typography variant="h6">Edit Profile</Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              {profileUpdateSuccess ? (
                <Alert severity="success" sx={{ my: 2 }}>
                  Profile updated successfully!
                </Alert>
              ) : (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    margin="dense"
                    label="Name"
                    name="name"
                    value={profileFormData.name}
                    onChange={handleProfileInputChange}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    margin="dense"
                    label="Email"
                    name="email"
                    type="email"
                    value={profileFormData.email}
                    onChange={handleProfileInputChange}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    margin="dense"
                    label="Role"
                    name="role"
                    value={profileFormData.role}
                    onChange={handleProfileInputChange}
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleEditProfileClose} color="primary">
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateProfile} 
                color="primary" 
                variant="contained"
                disabled={profileUpdateSuccess}
                sx={{ bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' } }}
              >
                {profileUpdateSuccess ? 'Updated' : 'Save Changes'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Change Password Dialog */}
          <Dialog open={isChangePasswordOpen} onClose={handleChangePasswordClose} maxWidth="sm" fullWidth>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SettingsIcon sx={{ mr: 1, color: '#1a237e' }} />
                <Typography variant="h6">Change Password</Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              {passwordUpdateSuccess ? (
                <Alert severity="success" sx={{ my: 2 }}>
                  Password updated successfully!
                </Alert>
              ) : (
                <Box sx={{ mt: 2 }}>
                  {passwordError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {passwordError}
                    </Alert>
                  )}
                  <TextField
                    fullWidth
                    margin="dense"
                    label="Current Password"
                    name="currentPassword"
                    type="password"
                    value={passwordFormData.currentPassword}
                    onChange={handlePasswordInputChange}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    margin="dense"
                    label="New Password"
                    name="newPassword"
                    type="password"
                    value={passwordFormData.newPassword}
                    onChange={handlePasswordInputChange}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    margin="dense"
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={passwordFormData.confirmPassword}
                    onChange={handlePasswordInputChange}
                    error={passwordFormData.confirmPassword !== passwordFormData.newPassword && passwordFormData.confirmPassword !== ''}
                    helperText={passwordFormData.confirmPassword !== passwordFormData.newPassword && passwordFormData.confirmPassword !== '' ? 'Passwords do not match' : ''}
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleChangePasswordClose} color="primary">
                Cancel
              </Button>
              <Button 
                onClick={handleUpdatePassword} 
                color="primary" 
                variant="contained" 
                disabled={passwordUpdateSuccess}
                sx={{ bgcolor: '#1a237e', '&:hover': { bgcolor: '#283593' } }}
              >
                {passwordUpdateSuccess ? 'Updated' : 'Update Password'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      );
    } else if (activeTab === 'spreadPackages') {
      return (
        <Box sx={{ width: '100%' }}>
          <Typography variant="h4" gutterBottom>
            Spread Packages
          </Typography>
          <SectionCard title="All Spread Packages">
            <Typography color="textSecondary">
              Spread package features will appear here
            </Typography>
          </SectionCard>
        </Box>
      );
    } else if (activeTab === 'viewSellerProfile') {
      return (
        <Box sx={{ width: '100%' }}>
          <Typography variant="h4" gutterBottom fontWeight="medium">
            Seller Profiles
          </Typography>
          <SectionCard title="All Sellers">
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Shop Name</TableCell>
                    <TableCell>Registration Date</TableCell>
                    <TableCell>Wallet Balance</TableCell>
                    {/* <TableCell>Pending Wallet</TableCell> */}
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sellers.map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell>{seller.name}</TableCell>
                      <TableCell>{seller.email}</TableCell>
                      <TableCell>{seller.phone || 'N/A'}</TableCell>
                      <TableCell>{seller.shopName || 'N/A'}</TableCell>
                      <TableCell>
                        {seller.registrationDate ? new Date(seller.registrationDate.toDate()).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        ${(seller.walletBalance || 0).toFixed(2)}
                      </TableCell>
                      {/* <TableCell>
                        ${(seller.pendingWallet || 0).toFixed(2)}
                      </TableCell> */}
                      <TableCell>
                        <Tooltip title={`Click to ${seller.status?.toLowerCase() === 'active' ? 'freeze' : 'activate'} seller`}>
                          <Chip 
                            label={seller.status?.toLowerCase() || 'active'} 
                            color={seller.status?.toLowerCase() === 'active' ? 'success' : 'error'}
                            size="small"
                            onClick={() => {
                              const newStatus = seller.status?.toLowerCase() === 'active' ? 'frozen' : 'active';
                              const action = newStatus === 'active' ? 'activate' : 'freeze';
                              
                              if (window.confirm(`Are you sure you want to ${action} this seller?`)) {
                                handleUpdateSellerStatus(seller.id, newStatus);
                              }
                            }}
                            sx={{ 
                              cursor: 'pointer',
                              '&:hover': { 
                                opacity: 0.8,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                              },
                              transition: 'all 0.2s',
                              fontWeight: 'medium'
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton 
                          size="small" 
                          onClick={() => setSelectedSeller(seller)}
                          color="primary"
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditSeller(seller)}
                          color="secondary"
                        >
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SectionCard>
        </Box>
      );
    }
    
    return null;
  };

  const renderSellerProfilesContent = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Seller Profiles
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Shop Name</TableCell>
              <TableCell>Registration Date</TableCell>
              <TableCell>Wallet Balance</TableCell>
              <TableCell>Seller Country</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sellers.map((seller) => (
              <TableRow key={seller.id}>
                <TableCell>{seller.name || 'No Name'}</TableCell>
                <TableCell>{seller.email}</TableCell>
                <TableCell>{seller.phone}</TableCell>
                <TableCell>{seller.shopName}</TableCell>
                <TableCell>{seller.createdAt ? formatDate(seller.createdAt) : 'N/A'}</TableCell>
                <TableCell>${(seller.walletBalance || 0).toFixed(2)}</TableCell>
                <TableCell>{seller.country || 'N/A'}</TableCell>
                <TableCell>
                  <Rating
                    value={seller.rating || 0}
                    readOnly
                    size="small"
                    precision={1}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={seller.status || 'pending'} 
                    color={seller.status === 'active' ? 'success' :
                           seller.status === 'pending' ? 'warning' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditSeller(seller)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to remove this seller?')) {
                          handleSellerDelete(seller.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                    {seller.status === 'active' && (
                      <Button
                        variant="outlined"
                        color="warning"
                        size="small"
                        startIcon={<BlockIcon />}
                        onClick={() => handleDeactivateSeller(seller.id)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderSellersProductsContent = () => {
    // Get unique seller emails for the dropdown
    const uniqueSellerEmails = [...new Set(
      sellerWithProducts
        .filter(product => product.seller && product.seller.email)
        .map(product => product.seller.email)
    )].sort((a, b) => a.localeCompare(b)); // Sort emails alphabetically in ascending order
    
    // Filter products based on selected seller email or search term
    const filteredProducts = sellerWithProducts.filter(product => {
      // Only include products with valid seller data
      if (!product.seller || !product.seller.email) return false;

      // If a seller email is selected in the dropdown, filter by that
      if (selectedSellerEmail && product.seller.email !== selectedSellerEmail) return false;

      // If there's a search term, also filter by that
      if (sellerEmailSearch &&
          !product.seller.email.toLowerCase().includes(sellerEmailSearch.toLowerCase())) {
        return false;
      }

      // If no seller is selected, don't show any products
      if (selectedSellerEmail === '') return false;

      return true;
    });

    // Calculate pagination based on filtered products
    const startIndex = sellersProductsPage * sellersProductsRowsPerPage;
    const endIndex = startIndex + sellersProductsRowsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    // Handle page change
    const handleSellersProductsPageChange = (event, newPage) => {
      setSellersProductsPage(newPage);
    };

    // Handle rows per page change
    const handleSellersProductsRowsPerPageChange = (event) => {
      setSellersProductsRowsPerPage(parseInt(event.target.value, 10));
      setSellersProductsPage(0);
    };

    // Force refresh data
    const handleForceRefresh = () => {
      fetchSellersWithProducts(true); // Pass true to force refresh
      setSelectedSellerEmail(''); // Clear the selected seller email
    };

    // Handle seller email selection
    const handleSellerEmailChange = (event) => {
      setSelectedSellerEmail(event.target.value);
      setSellersProductsPage(0); // Reset to first page when selecting a new seller
    };

    // Add this function to handle opening the assign product modal
    const handleOpenAssignProductModal = (product) => {
      setProductToAssign(product);
      setSelectedOrderId('');
      fetchAvailableOrders();
      setIsAssignProductModalOpen(true);
    };

    return (
      <Box sx={{ width: '100%' }}>
        <Typography variant="h4" gutterBottom fontWeight="medium">
          Sellers Products
        </Typography>
        
        <SectionCard title="All Sellers Products">
          {/* Add seller selection dropdown and search bar */}
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <FormControl sx={{ minWidth: 250 }}>
              <InputLabel id="seller-select-label">Select Seller</InputLabel>
              <Select
                labelId="seller-select-label"
                id="seller-select"
                value={selectedSellerEmail}
                onChange={handleSellerEmailChange}
                label="Select Seller"
                size="small"
              >
                <MenuItem value="">No Seller Selected</MenuItem>
                {uniqueSellerEmails.map((email) => (
                  <MenuItem key={email} value={email}>{email}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Search by Seller Email"
              variant="outlined"
              size="small"
              fullWidth
              value={sellerEmailSearch}
              onChange={(e) => {
                setSellerEmailSearch(e.target.value);
                setSellersProductsPage(0); // Reset to first page on search
              }}
              sx={{ maxWidth: 400, flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: sellerEmailSearch ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSellerEmailSearch('');
                        setSellersProductsPage(0);
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null
              }}
            />
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={handleForceRefresh}
              disabled={sellersProductsLoading}
              variant="outlined"
            >
              Refresh
            </Button>
          </Box>
          
          {sellersProductsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {selectedSellerEmail ? (
                <>
                  <Grid container spacing={2}>
                    {paginatedProducts.map((product) => (
                      <Grid item xs={12} sm={6} md={2.4} key={`${product.id}-${product.seller.id}`}>
                        <Card 
                          elevation={2} 
                          sx={{ 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                              transform: 'translateY(-5px)',
                              boxShadow: 6
                            }
                          }}
                        >
                          <CardMedia
                            component="img"
                            height="140"
                            image={product.imageUrl}
                            alt={product.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = process.env.PUBLIC_URL + '/images/product1.jpg';
                            }}
                            sx={{ objectFit: 'cover' }}
                          />
                          <CardContent sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1" component="div" noWrap fontWeight="medium">
                              {product.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              mb: 1
                            }}>
                              {product.description || 'No description'}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                              <Typography variant="h6" color="primary">
                                ${Number(product.price).toFixed(2)}
                              </Typography>
                            </Box>
                            <Typography variant="body2" noWrap sx={{ mt: 1 }}>
                              <span style={{ fontWeight: 'bold' }}>Seller:</span> {product.seller.email || 'No email'}
                            </Typography>
                          </CardContent>
                          <CardActions sx={{ p: 2, pt: 0 }}>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => handleRemoveProductFromSeller(product.seller.id, product.id)}
                              sx={{ mr: 1, fontSize: '0.7rem', py: 0.5, minWidth: '60px' }}
                            >
                              Remove
                            </Button>
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              onClick={() => handleAddToCart(product)}
                              sx={{ fontSize: '0.7rem', py: 0.5, minWidth: '60px' }}
                            >
                              <AddShoppingCartIcon fontSize="small" sx={{ mr: 0.5, fontSize: '1rem' }} />
                              Cart
                            </Button>
                          </CardActions>
                        </Card>
                      </Grid>
                    ))}
                    {filteredProducts.length === 0 && (
                      <Grid item xs={12}>
                        <Box sx={{ py: 3, textAlign: 'center' }}>
                          <Typography color="text.secondary">
                            No products found for the selected seller
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                  {filteredProducts.length > 0 && (
                    <TablePagination
                      rowsPerPageOptions={[5, 10, 15, 20, 25]}
                      component="div"
                      count={filteredProducts.length}
                      rowsPerPage={sellersProductsRowsPerPage}
                      page={sellersProductsPage}
                      onPageChange={handleSellersProductsPageChange}
                      onRowsPerPageChange={handleSellersProductsRowsPerPageChange}
                    />
                  )}
                </>
              ) : (
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No Seller Selected
                  </Typography>
                  <Typography color="text.secondary">
                    Please select a seller from the dropdown above to view their products
                  </Typography>
                </Box>
              )}
            </>
          )}
        </SectionCard>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {filteredProducts.length} products from 
            {selectedSellerEmail 
              ? ` seller "${selectedSellerEmail}"` 
              : ' No seller selected'}
            {lastSellersRefresh && (
              <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: 'gray' }}>
                (Last updated: {new Date(lastSellersRefresh).toLocaleTimeString()})
              </span>
            )}
          </Typography>
        </Box>

        {/* Order History Section - Only Admin Created Orders */}
        <SectionCard 
          title="Admin Assigned Orders" 
          sx={{ mt: 4 }}
          action={
            <Button 
              startIcon={<RefreshIcon />} 
              onClick={() => {
                setLoading(true);
                fetchOrders().finally(() => setLoading(false));
              }}
              variant="outlined"
              size="small"
            >
              Refresh Orders
            </Button>
          }
        >
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Seller</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Profit</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedSellerEmail && orders.filter(order => 
                    order.source === 'admin' && 
                    order.sellerInfo?.email === selectedSellerEmail
                  ).length > 0 ? (
                    orders
                      .filter(order => 
                        order.source === 'admin' && 
                        order.sellerInfo?.email === selectedSellerEmail
                      )
                      // .slice(0, 10) - Removed this limitation to show all orders
                      .map((order) => (
                        <TableRow 
                          key={order.id}
                          hover
                          sx={{
                            '&:hover': {
                              bgcolor: alpha(theme.palette.secondary.light, 0.1)
                            }
                          }}
                        >
                          <TableCell>
                            <Tooltip title="View order details">
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  cursor: 'pointer',
                                  '&:hover': { color: theme.palette.primary.main },
                                  fontWeight: 'medium',
                                }}
                                onClick={() => handleViewDetails(order)}
                              >
                                {order.orderNumber || order.id.substring(0, 8)}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{formatDate(order.createdAt)}</TableCell>
                          <TableCell>{order.sellerInfo?.email || 'Unknown Seller'}</TableCell>
                          <TableCell>${Number(order.totalAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>${Number(order.totalAmount*23/100 || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip 
                              label={order.status} 
                              color={
                                order.status === 'completed' ? 'success' :
                                order.status === 'processing' ? 'info' :
                                order.status === 'on-the-way' ? 'warning' :
                                order.status === 'cancelled' ? 'error' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Tooltip title="View Details">
                                <IconButton 
                                  size="small" 
                                  color="primary"
                                  onClick={() => handleViewDetails(order)}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Update Status">
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={(event) => {
                                    setSelectedOrder(order);
                                    setAnchorEl(event.currentTarget);
                                  }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body2" color="text.secondary">
                          {selectedSellerEmail 
                            ? `No admin-assigned orders found for ${selectedSellerEmail}` 
                            : 'Please select a seller to view their orders'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </SectionCard>
        {/* xyz */}
        {/* Status update dropdown menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          MenuListProps={{
            'aria-labelledby': 'status-update-button',
          }}
        >
          <MenuItem onClick={() => {
            handleUpdateOrderStatus(selectedOrder?.id, 'on-the-way');
            setAnchorEl(null);
          }}>
            <Chip 
              label="On the way" 
              color="warning"
              size="small"
              sx={{ minWidth: 80 }}
            />
          </MenuItem>
          <MenuItem onClick={() => {
            handleUpdateOrderStatus(selectedOrder?.id, 'completed');
            setAnchorEl(null);
          }}>
            <Chip 
              label="Completed" 
              color="success"
              size="small"
              sx={{ minWidth: 80 }}
            />
          </MenuItem>
          <MenuItem onClick={() => {
            handleUpdateOrderStatus(selectedOrder?.id, 'cancelled');
            setAnchorEl(null);
          }}>
            <Chip 
              label="Cancelled" 
              color="error"
              size="small"
              sx={{ minWidth: 80 }}
            />
          </MenuItem>
        </Menu>
      </Box>
    );
  };

  const renderOrdersContent = () => {
    return (
        <Box sx={{ p: 3, width: '100%', px: { xs: 0, sm: 3, md: 4 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: { xs: 0, sm: 3, md: 4 } }}>
          <Typography variant="h4" gutterBottom>
              Orders Management
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              setLoading(true);
              fetchOrders().finally(() => setLoading(false));
            }}
          >
            Refresh Orders
          </Button>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            label="Search by customer email"
            value={orderEmailSearch}
            onChange={(e) => setOrderEmailSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
              ),
              endAdornment: orderEmailSearch ? (
                <IconButton size="small" onClick={() => setOrderEmailSearch('')}>
                  <CloseIcon />
                </IconButton>
              ) : null
            }}
            size="small"
          />
        </Box>
        
        <Grid container spacing={2}>
          {filteredOrders
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((order) => (
              <Grid item xs={12} key={order.id}>
                <Paper sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={1}>
                    {/* Order Information displayed vertically */}
                    <Grid item xs={12} sm={4} md={3} lg={2}>
                      <Typography variant="subtitle2" color="text.secondary">Order ID</Typography>
                      <Typography variant="body2">{order.orderNumber || order.id.substring(0, 8)}</Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={4} md={3} lg={2}>
                      <Typography variant="subtitle2" color="text.secondary">Customer</Typography>
                      <Typography variant="body2">{order.customerName || order.customerEmail || 'Anonymous'}</Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={4} md={3} lg={2}>
                      <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                      <Typography variant="body2">{order.customerEmail || 'No email'}</Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={4} md={3} lg={2}>
                      <Typography variant="subtitle2" color="text.secondary">Product Names</Typography>
                      <Tooltip title={order.items?.map(item => `${item.name} (x${item.quantity})`).join('\n') || 'No products'}>
                        <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {order.items?.map(item => item.name).join(', ').slice(0, 30)}
                          {order.items && order.items.join(', ').length > 30 ? '...' : ''}
                          {!order.items && 'No products'}
                        </Typography>
                      </Tooltip>
                    </Grid>
                    
                    <Grid item xs={12} sm={4} md={3} lg={2}>
                      <Typography variant="subtitle2" color="text.secondary">Date</Typography>
                      <Typography variant="body2">{formatDate(order.createdAt)}</Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={4} md={3} lg={2}>
                      <Typography variant="subtitle2" color="text.secondary">Shipping Address</Typography>
                      <Tooltip title={String(order.shippingAddress || 'No address provided')}>
                        <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {String(order.shippingAddress || 'No address').slice(0, 20)}
                          {order.shippingAddress && String(order.shippingAddress).length > 20 ? '...' : ''}
                        </Typography>
                      </Tooltip>
                    </Grid>
                    
                    <Grid item xs={12} sm={4} md={3} lg={2}>
                      <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                      <Typography variant="body2">{order.customerPhone || 'No phone'}</Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={4} md={3} lg={2}>
                      <Typography variant="subtitle2" color="text.secondary">Total</Typography>
                      <Typography variant="body2">${parseFloat(order.total).toFixed(2)}</Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={4} md={3} lg={2}>
                      <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                      <Chip
                        label={order.status}
                        color={
                          order.status === 'completed' ? 'success' :
                          order.status === 'processing' ? 'info' :
                          order.status === 'assigned' ? 'primary' :
                          order.status === 'on-the-way' ? 'warning' :
                          order.status === 'cancelled' ? 'error' : 'default'
                        }
                        size="small"
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={4} md={3} lg={2}>
                      <Typography variant="subtitle2" color="text.secondary">Assigned To</Typography>
                      {order.sellerId ? (
                        <Tooltip title="View seller details">
                          <Chip 
                            label={sellers.find(s => s.id === order.sellerId)?.email || 'Unknown Seller'} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                            onClick={() => {
                              // View seller details logic here
                              handleTabChange('sellerProfiles');
                              // Additional logic to focus on this seller
                            }}
                          />
                        </Tooltip>
                      ) : (
                        <Chip label="Unassigned" size="small" color="default" variant="outlined" />
                      )}
                    </Grid>
                    
                    <Grid item xs={12} sm={4} md={3} lg={2}>
                      <Typography variant="subtitle2" color="text.secondary">Actions</Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewDetails(order)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Update Status">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsStatusUpdateModalOpen(true);
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {order.status !== 'cancelled' && (
                          <Tooltip title={order.sellerId ? "Reassign Order" : "Assign to Seller"}>
                            <IconButton 
                              size="small" 
                              color={order.sellerId ? "secondary" : "success"}
                              onClick={() => handleOpenAssignModal(order)}
                            >
                              <AssignmentIndIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ))}
        </Grid>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredOrders.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />

        {/* Order Details Modal */}
        <OrderDetailsModal
          open={isOrderTableModalOpen}
          order={selectedOrderInTable}
          onClose={() => {
            setIsOrderTableModalOpen(false);
            setSelectedOrderInTable(null);
          }}
          onUpdateStatus={handleUpdateOrderStatus}
        />
        
        {/* Assign Order Modal */}
        <AssignOrderModal
          open={isAssignOrderModalOpen}
          order={orderToAssign}
          onClose={handleCloseAssignModal}
          onAssign={handleAssignOrder}
        />
        
        {/* Status Update Modal */}
        <StatusUpdateModal
          open={isStatusUpdateModalOpen}
          order={selectedOrder}
          onClose={() => {
            setIsStatusUpdateModalOpen(false);
            setSelectedOrder(null);
          }}
          onUpdateStatus={handleUpdateOrderStatus}
        />
      </Box>
    );
  };

  const renderCustomerProfilesContent = () => (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom fontWeight="medium">
        Customer Profiles
      </Typography>
      <SectionCard title="All Customer Profiles">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Join Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customerProfiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>{profile.name}</TableCell>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>{profile.phone}</TableCell>
                  <TableCell>{profile.address}</TableCell>
                  <TableCell>{new Date(profile.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setSelectedCustomerProfile(profile);
                        setIsCustomerProfileModalOpen(true);
                      }}
                    >
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
    </Box>
  );

  // Function to handle scroll to top
  const scrollToTop = () => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  // Add scroll event listener to show/hide scroll to top button
  useEffect(() => {
    const handleScroll = () => {
      const mainContent = document.querySelector('main');
      if (mainContent) {
        setShowScrollTop(mainContent.scrollTop > 300);
      }
    };

    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (mainContent) {
        mainContent.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const handleUpdateSellerStatus = async (sellerId, newStatus) => {
    try {
      // Normalize the status to lowercase
      const normalizedStatus = newStatus.toLowerCase();
      
      await updateDoc(doc(db, 'sellers', sellerId), {
        status: normalizedStatus,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setSellers(sellers.map(seller => 
        seller.id === sellerId 
          ? { ...seller, status: normalizedStatus }
          : seller
      ));

      // Refresh data that might be affected by status change
      fetchSellersWithProducts();

      // Show success message
      setSnackbar({
        open: true,
        message: `Seller ${normalizedStatus === 'active' ? 'activated' : 'frozen'} successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating seller status:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update seller status',
        severity: 'error'
      });
    }
  };

  const AddMoneyForm = () => {
    const [sellers, setSellers] = useState([]);
    const [selectedSeller, setSelectedSeller] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    // Add the missing handler functions
    const handleSellerChange = (event) => {
      setSelectedSeller(event.target.value);
    };

    const handleAmountChange = (event) => {
      // Allow positive numbers including decimals
      const value = event.target.value;
      // Regex to validate positive numbers with up to 2 decimal places
      const regex = /^\d*\.?\d{0,2}$/;
      if (value === '' || regex.test(value)) {
        setAmount(value);
      }
    };

    // Fetch sellers when component mounts
    useEffect(() => {
      fetchSellersList();
    }, []);

    const fetchSellersList = async () => {
      setLoading(true);
      try {
        const sellersSnapshot = await getDocs(collection(db, 'sellers'));
        const sellersList = sellersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort sellers by email in ascending order
        sellersList.sort((a, b) => a.email.localeCompare(b.email));
        setSellers(sellersList);
      } catch (error) {
        console.error('Error fetching sellers:', error);
        alert('Failed to load sellers. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    const handleAddMoney = async () => {
      if (!selectedSeller || !amount) {
        alert('Please select a seller and enter an amount.');
        return;
      }
      
      const amountToAdd = parseFloat(amount);
      
      if (isNaN(amountToAdd) || amountToAdd <= 0) {
        alert('Please enter a valid amount greater than 0.');
        return;
      }
      
      setLoading(true);
      try {
        const sellerDocRef = doc(db, 'sellers', selectedSeller);
        const sellerDoc = await getDoc(sellerDocRef);
        
        if (!sellerDoc.exists()) {
          alert('Seller not found.');
          setLoading(false);
          return;
        }
        
        const sellerData = sellerDoc.data();
        const currentBalance = sellerData.walletBalance || 0;
        const currentRevenue = sellerData.totalRevenue || 0;
        
        // Calculate new values - use toFixed(2) to ensure proper decimal handling
        const newBalance = parseFloat((currentBalance + amountToAdd).toFixed(2));
        const newRevenue = parseFloat((currentRevenue + amountToAdd).toFixed(2));

        // Update both wallet balance and revenue
        await updateDoc(sellerDocRef, {
          walletBalance: newBalance,
          totalRevenue: newRevenue,
          lastUpdated: serverTimestamp()
        });

        // Add transaction record
        await addDoc(collection(db, 'transactions'), {
          sellerId: selectedSeller,
          amount: amountToAdd,
          type: 'admin_deposit',
          affectsRevenue: true,
          timestamp: serverTimestamp(),
          previousBalance: currentBalance,
          newBalance: newBalance,
          previousRevenue: currentRevenue,
          newRevenue: newRevenue,
          note: 'Manual deposit by admin'
        });

        // Refresh stats to update revenue display
        fetchStats();
        
        alert(`Successfully updated:\n- Added $${amountToAdd.toFixed(2)} to wallet\n- New Balance: $${newBalance.toFixed(2)}\n- New Revenue: $${newRevenue.toFixed(2)}`);
        setSelectedSeller('');
        setAmount('');
        
      } catch (error) {
        console.error('Error adding funds:', error);
        alert('Failed to add funds. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Add Money to Seller's Wallet
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="seller-select-label">Select Seller</InputLabel>
            <Select
              labelId="seller-select-label"
              id="seller-select"
              value={selectedSeller}
              label="Select Seller"
              onChange={handleSellerChange}
            >
              {sellers.map(seller => (
                <MenuItem key={seller.id} value={seller.id}>
                  {/* {seller.name || 'Unnamed'} -  */}
                  {seller.email} (Current Balance: ${seller.walletBalance ? seller.walletBalance.toFixed(2) : '0.00'})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Amount"
            type="text"
            value={amount}
            onChange={handleAmountChange}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">$</InputAdornment>,
            }}
            placeholder="0.00"
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddMoney}
            disabled={!selectedSeller || !amount}
            fullWidth
          >
            ADD MONEY TO WALLET
          </Button>
        </Paper>
      </Box>
    );
  };

  // Add the AddMoneyForm to the sidebar
  const renderSidebarContent = () => (
    <Box sx={{ mt: 2  }}>
      <List>
        <ListItemButton 
          onClick={() => handleTabChange('dashboard')}
          selected={activeTab === 'dashboard'}
          sx={{
            '&.Mui-selected': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              },
            },
          }}
        >
          <ListItemIcon>
            <DashboardIcon sx={{ color: 'white' }} />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItemButton>

        <ListItemButton 
          onClick={() => handleTabChange('adminProfile')}
          selected={activeTab === 'adminProfile'}
          sx={{
            '&.Mui-selected': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              },
            },
          }}
        >
          <ListItemIcon>
            <ProfileIcon sx={{ color: 'white' }} />
          </ListItemIcon>
          <ListItemText primary="Admin Profile" />
        </ListItemButton>

        {/* Other sidebar items */}
        <ListItem button onClick={() => setActiveTab('addMoney')}>
          <ListItemText primary="Add Money" />
        </ListItem>
      </List>
    </Box>
  );

  // Add a function to handle opening the assign order modal
  const handleOpenAssignModal = async (order) => {
    try {
      setOrderToAssign(order);
      // Fetch active sellers
      const sellersRef = collection(db, 'sellers');
      const q = query(sellersRef, where('status', '==', 'active'));
      const querySnapshot = await getDocs(q);
      
      const activeSellers = [];
      querySnapshot.forEach((doc) => {
        activeSellers.push({ id: doc.id, ...doc.data() });
      });
      
      setAvailableSellers(activeSellers);
      setIsAssignOrderModalOpen(true);
    } catch (error) {
      console.error('Error fetching available sellers:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch available sellers',
        severity: 'error'
      });
    }
  };

  // Add a function to handle closing the assign order modal
  const handleCloseAssignModal = () => {
    setIsAssignOrderModalOpen(false);
    setOrderToAssign(null);
  };

  // Add a function to handle assigning an order to a seller
  const handleAssignOrder = async () => {
    if (!orderToAssign) {
      alert('No order selected.');
      return;
    }

    // If no seller is selected and there's a current seller, this is an unassign operation
    const isUnassigning = !selectedSellerId && orderToAssign.sellerId;

    setAssignLoading(true);
    try {
      console.log(isUnassigning ? "Unassigning order from seller" : "Assigning order to seller:", selectedSellerId);
      console.log("Order data:", orderToAssign);
      
      // Get the current timestamp
      const now = new Date();
      
      // Update the order
      const orderRef = doc(db, 'orders', orderToAssign.id);
      
      if (isUnassigning) {
        // Unassign the order
        await updateDoc(orderRef, {
          sellerId: null,
          assignedAt: null,
          assignedBy: null,
          status: 'pending',
          statusHistory: arrayUnion({
            status: 'unassigned',
            timestamp: now.toISOString(),
            note: 'Unassigned by admin'
          })
        });

        // Remove order from previous seller's orders list
        if (orderToAssign.sellerId) {
          const prevSellerRef = doc(db, 'sellers', orderToAssign.sellerId);
          const prevSellerDoc = await getDoc(prevSellerRef);
          
          if (prevSellerDoc.exists()) {
            const prevSellerData = prevSellerDoc.data();
            const updatedOrders = (prevSellerData.orders || []).filter(id => id !== orderToAssign.id);
            await updateDoc(prevSellerRef, { orders: updatedOrders });
          }
        }
      } else {
        // Assign the order to new seller
        await updateDoc(orderRef, {
          sellerId: selectedSellerId,
          assignedAt: now,
          assignedBy: 'admin',
          status: 'assigned',
          statusHistory: arrayUnion({
            status: 'assigned',
            timestamp: now.toISOString(),
            note: `Manually ${orderToAssign.sellerId ? 're-assigned' : 'assigned'} to seller by admin`
          })
        });

        // If there was a previous seller, remove the order from their list
        if (orderToAssign.sellerId && orderToAssign.sellerId !== selectedSellerId) {
          const prevSellerRef = doc(db, 'sellers', orderToAssign.sellerId);
          const prevSellerDoc = await getDoc(prevSellerRef);
          
          if (prevSellerDoc.exists()) {
            const prevSellerData = prevSellerDoc.data();
            const updatedOrders = (prevSellerData.orders || []).filter(id => id !== orderToAssign.id);
            await updateDoc(prevSellerRef, { orders: updatedOrders });
          }
        }

        // Add order to new seller's list
        const sellerRef = doc(db, 'sellers', selectedSellerId);
        const sellerDoc = await getDoc(sellerRef);
        
        if (sellerDoc.exists()) {
          const sellerData = sellerDoc.data();
          const currentOrders = sellerData.orders || [];
          
          if (!currentOrders.includes(orderToAssign.id)) {
            await updateDoc(sellerRef, {
              orders: [...currentOrders, orderToAssign.id]
            });
          }
        }
      }

      // Refresh orders list
      await fetchOrders();
      
      alert(isUnassigning ? 'Order successfully unassigned!' : 'Order successfully assigned to seller!');
      handleCloseAssignModal();
    } catch (error) {
      console.error('Error managing order assignment:', error);
      alert('Failed to manage order assignment. Please try again.');
    } finally {
      setAssignLoading(false);
    }
  };

  // Update the AssignOrderModal component
  const AssignOrderModal = ({ open, order, onClose, onAssign }) => {
    if (!order) return null;
    
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>Assign Order to Seller</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Select Seller</InputLabel>
              <Select
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
                label="Select Seller"
              >
                {availableSellers.map((seller) => (
                  <MenuItem key={seller.id} value={seller.id}>
                    {seller.name || seller.shopName || 'Unnamed Seller'}
                    <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                      ({seller.email || 'No email'})
                    </Typography>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleAssignOrder}
            variant="contained"
            color="primary"
            disabled={assignLoading}
            startIcon={assignLoading ? <CircularProgress size={20} /> : null}
          >
            {assignLoading ? 'Assigning...' : 'Assign Order'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Add pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Add State and functions to fetch and display seller address and payment methods
  const [sellerDetails, setSellerDetails] = useState({ address: '', paymentMethods: [] });

  const fetchSellerDetails = async (sellerId) => {
    try {
      const sellerDoc = await getDoc(doc(db, 'sellers', sellerId));
      if (sellerDoc.exists()) {
        const data = sellerDoc.data();
        setSellerDetails({
          address: data.address || 'Not provided',
          paymentMethods: data.paymentMethods || [],
        });
      }
    } catch (error) {
      console.error('Error fetching seller details:', error);
    }
  };

  useEffect(() => {
    if (selectedSeller) {
      fetchSellerDetails(selectedSeller.id);
    }
  }, [selectedSeller]);

  // Handle edit profile dialog open
  const handleEditProfileOpen = () => {
    setProfileFormData({
      name: adminProfile.name,
      email: adminProfile.email,
      role: adminProfile.role
    });
    setIsEditProfileOpen(true);
    setProfileUpdateSuccess(false);
  };

  // Handle edit profile dialog close
  const handleEditProfileClose = () => {
    setIsEditProfileOpen(false);
  };

  // Handle change password dialog open
  const handleChangePasswordOpen = () => {
    setPasswordFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
    setIsChangePasswordOpen(true);
    setPasswordUpdateSuccess(false);
  };

  // Handle change password dialog close
  const handleChangePasswordClose = () => {
    setIsChangePasswordOpen(false);
  };

  // Handle profile form input changes
  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle password form input changes
  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user types
    if (passwordError) {
      setPasswordError('');
    }
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    try {
      // In a real app, you would update the profile in the database
      // For this demo, we'll just update the local state
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAdminProfile(prev => ({
        ...prev,
        name: profileFormData.name,
        email: profileFormData.email,
        role: profileFormData.role
      }));
      
      setProfileUpdateSuccess(true);
      
      // Close the dialog after a short delay
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setProfileUpdateSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  // Handle password update
  const handleUpdatePassword = async () => {
    try {
      // Validate passwords
      if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }
      
      if (passwordFormData.newPassword.length < 6) {
        setPasswordError('Password must be at least 6 characters');
        return;
      }
      
      // In a real app, you would validate the current password and update it in the database
      // For this demo, we'll just simulate a successful update
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setPasswordUpdateSuccess(true);
      
      // Clear form and close the dialog after a short delay
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setPasswordUpdateSuccess(false);
        setPasswordFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }, 1500);
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError('Failed to update password');
    }
  };

  const handleGenerateDummyProducts = async () => {
    try {
      setLoading(true);
      const result = await addDummyProducts();
      if (result) {
        await fetchProducts();
        setSnackbar({
          open: true,
          message: 'Successfully added 200 dummy products',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Error generating dummy products:', error);
      setSnackbar({
        open: true,
        message: 'Failed to generate dummy products',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to handle editing seller
  const handleEditSeller = (seller) => {
    setSelectedSeller(seller);
    setIsSellerEditModalOpen(true);
  };

  // First add the form ref near other refs
  const formRef = useRef(null);

  // Update the handleUpdateSeller function
  const handleUpdateSeller = async () => {
    if (!selectedSeller || !formRef.current) return;

    try {
      setLoading(true);
      
      // Get form elements using the ref
      const form = formRef.current;
      
      // Get values directly from form elements
      const nameInput = form.querySelector('input[name="name"]');
      const phoneInput = form.querySelector('input[name="phone"]');
      const shopNameInput = form.querySelector('input[name="shopName"]');
      const statusSelect = form.querySelector('select[name="status"]');
      const addressInput = form.querySelector('textarea[name="address"]');
      const passwordInput = form.querySelector('input[name="password"]');
      const countryInput = form.querySelector('input[name="country"]');
      const ratingInput = form.querySelector('input[name="rating"]');
      
      const updatedData = {
        name: nameInput?.value || selectedSeller.name,
        phone: phoneInput?.value || selectedSeller.phone,
        shopName: shopNameInput?.value || selectedSeller.shopName,
        status: statusSelect?.value || selectedSeller.status,
        address: addressInput?.value || selectedSeller.address,
        country: countryInput?.value || selectedSeller.country,
        rating: selectedSeller.rating || 0,
        updatedAt: serverTimestamp()
      };

      // Handle password update
      const password = passwordInput?.value?.trim();
      if (password) {
        updatedData.password = password;
        updatedData.plainPassword = password; // Store plaintext password for admin view
        console.log('Updating password to:', password); // Debug log
        
        try {
          // Import needed Firebase auth functions
          const { getAuth, updatePassword, EmailAuthProvider } = await import('firebase/auth');
          
          // Update the seller's password in Firebase Authentication
          const auth = getAuth();
          const { createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth');
          
          // Get the seller's email
          const sellerEmail = selectedSeller.email;
          
          // Use admin special privilege to update user password in auth
          // This is a workaround since we don't have admin SDK in client side
          try {
            // Custom auth token would be the proper way, but we'll use a workaround
            // Create a functions call to a cloud function that updates the user password
            // For now, we'll update Firestore and notify user they need to use password reset
            
            // Add a flag to indicate password was reset by admin
            updatedData.passwordResetByAdmin = true;
            updatedData.passwordResetAt = serverTimestamp();
            updatedData.requirePasswordChange = true;
            
            setSnackbar({
              open: true,
              message: 'Password updated in database. Note: The seller will need to use this new password for login.',
              severity: 'warning'
            });
          } catch (authError) {
            console.error('Error updating Firebase Auth password:', authError);
          }
        } catch (importError) {
          console.error('Error importing Firebase Auth functions:', importError);
        }
      }

      console.log('Updating seller with data:', updatedData);
      console.log('Seller ID:', selectedSeller.id);
      
      const sellerRef = doc(db, 'sellers', selectedSeller.id);
      await updateDoc(sellerRef, updatedData);
      
      // Force refresh sellers list to get updated data
      await fetchSellers();

      setIsSellerEditModalOpen(false);
      setSelectedSeller(null);
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'Seller profile updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating seller:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update seller profile: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Display seller details in the UI
  const [toogle, setToogle] = useState(false)

  // Add this effect to filter orders by email
  useEffect(() => {
    if (orders.length > 0) {
      if (orderEmailSearch.trim() === '') {
        setFilteredOrders(orders);
      } else {
        const filtered = orders.filter(order => 
          order.customerEmail && 
          order.customerEmail.toLowerCase().includes(orderEmailSearch.toLowerCase())
        );
        setFilteredOrders(filtered);
      }
      // Reset pagination to first page when filter changes
      setPage(0);
    } else {
      setFilteredOrders([]);
    }
  }, [orders, orderEmailSearch]);

  // State variables for product assignment
  const [isAssignProductModalOpen, setIsAssignProductModalOpen] = useState(false);
  const [productToAssign, setProductToAssign] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState('');

  // Function to fetch available orders for assignment
  const fetchAvailableOrders = async () => {
    try {
      const ordersRef = collection(db, 'orders');
      const ordersQuery = query(
        ordersRef,
        where('status', 'in', ['pending', 'processing'])
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = [];

      ordersSnapshot.forEach((doc) => {
        const orderData = doc.data();
        ordersData.push({
          id: doc.id,
          ...orderData,
          orderNumber: orderData.orderNumber || doc.id.substring(0, 8)
        });
      });

      setAvailableOrders(ordersData);
    } catch (error) {
      console.error('Error fetching available orders:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch available orders',
        severity: 'error'
      });
    }
  };

  // Additional cart related functions
  const handleRemoveFromCart = (productId) => {
    const updatedCart = adminCart.filter(item => item.id !== productId);
    setAdminCart(updatedCart);
    
    setSnackbar({
      open: true,
      message: 'Item removed from cart',
      severity: 'info'
    });
  };

  const handleUpdateCartQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedCart = adminCart.map(item => 
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    
    setAdminCart(updatedCart);
  };

  const handleClearCart = () => {
    setAdminCart([]);
    setSnackbar({
      open: true,
      message: 'Cart cleared',
      severity: 'info'
    });
  };

  const toggleCartSidebar = () => {
    setIsCartOpen(!isCartOpen);
  };

  const getTotalCartItems = () => {
    return adminCart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalCartPrice = () => {
    return adminCart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Function to create orders from cart items and assign to sellers
  const createOrderFromCart = async () => {
    if (adminCart.length === 0) {
      setSnackbar({
        open: true,
        message: 'Your cart is empty',
        severity: 'warning'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Group cart items by seller
      const itemsBySeller = {};
      
      adminCart.forEach(item => {
        if (!item.seller || !item.seller.id) {
          // Skip items without seller info
          console.error('Item has no seller information:', item);
          return;
        }
        
        const sellerId = item.seller.id;
        
        if (!itemsBySeller[sellerId]) {
          itemsBySeller[sellerId] = {
            seller: item.seller,
            items: []
          };
        }
        
        itemsBySeller[sellerId].items.push({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.imageUrl
        });
      });
      
      // Create an order for each seller
      const orderPromises = Object.keys(itemsBySeller).map(async (sellerId) => {
        const sellerData = itemsBySeller[sellerId];
        const orderItems = sellerData.items;
        
        // Calculate total amount
        const totalAmount = orderItems.reduce((total, item) => 
          total + (item.price * item.quantity), 0);
        
        // Generate order number
        const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        // Create the order document
        const orderData = {
          orderNumber,
          sellerId: sellerId,
          sellerInfo: {
            name: sellerData.seller.name || '',
            email: sellerData.seller.email || '',
            shopName: sellerData.seller.shopName || ''
          },
          customerInfo: {
            name: 'Admin Order',
            email: adminProfile.email || 'admin@example.com',
          },
          items: orderItems,
          totalAmount: totalAmount,
          status: 'pending',
          statusHistory: [
            {
              status: 'pending',
              timestamp: new Date().toISOString(),
              updatedBy: 'admin',
              note: 'Order created by admin'
            }
          ],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          source: 'admin',
          notes: 'Order created and assigned by admin'
        };
        
        // Add to Firestore
        const orderRef = await addDoc(collection(db, 'orders'), orderData);
        
        // Also update the seller's orders collection for quick access
        await updateDoc(doc(db, 'sellers', sellerId), {
          latestOrders: arrayUnion({
            id: orderRef.id,
            orderNumber: orderNumber,
            totalAmount: totalAmount,
            createdAt: new Date().toISOString(),
            status: 'pending'
          })
        });
        
        return {
          id: orderRef.id,
          sellerId: sellerId,
          orderNumber: orderNumber
        };
      });
      
      const createdOrders = await Promise.all(orderPromises);
      
      // Clear the cart after successful order creation
      setAdminCart([]);
      setIsCartOpen(false);
      
      // Show success message
      setSnackbar({
        open: true,
        message: `${createdOrders.length} order(s) created and assigned to seller(s)`,
        severity: 'success'
      });
      
      // Refresh the sellers products data instead of changing tabs
      fetchSellersWithProducts(true);
      
    } catch (error) {
      console.error('Error creating orders:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create orders. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to handle when an admin sends a message
  const handleNewMessage = useCallback(() => {
    // Play notification sound
    playNotificationSound();
  }, [playNotificationSound]);

  return (
<Box className={'relative'} sx={{ display: 'flex', flexDirection: 'column', height: '100%', mt: `${navbarHeight}px` }}>      {/* Main content area with sidebar */}

      <button className='absolute z-20 -top-10 left-0 flex items-start box-border justify-center px-3 py-1  rounded-lg bg-custom-blue text-white ' onClick={() => setToogle(!toogle)}>
              
      <div className="flex items-center">
    {/* Hamburger/drawer icon using CSS */}
    <div className="space-y-1 mr-2">
      <div className="w-6 h-0.5 bg-white"></div>
      <div className="w-6 h-0.5 bg-white"></div>
      <div className="w-6 h-0.5 bg-white"></div>
    </div>
    {/* Optional text */}
    <span>Menu</span>
  </div>   
              
      </button>

      {/* Fixed Cart Button */}
      <Fab
        color="primary"
        aria-label="cart"
        sx={{
          position: 'fixed',
          bottom: 90,
          right: 20,
          zIndex: 1000,
          bgcolor: '#FF4D33',
          '&:hover': {
            bgcolor: '#FF6E59',
          },
        }}
        onClick={toggleCartSidebar}
      >
        <Badge badgeContent={getTotalCartItems()} color="error">
          <ShoppingCartIcon />
        </Badge>
      </Fab>
{/* xyz */}
      <Box sx={{ display: 'flex', flexGrow: 1, position: 'relative' }}>
        <Drawer

         className={`md:w-64  ${toogle ? `block` : `hidden`}`}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              backgroundColor: '#f7f7f7',
              borderRight: '1px solid #e0e0e0',
              top: `${navbarHeight}px`, // Position below navbar
              height: `calc(100% - ${navbarHeight}px)`, // Adjust height
              overflowY: 'auto',
            },
          }}
          variant="permanent"
          anchor="left"
          open={true}
        >
          <Box sx={{ overflow: 'auto' }}>
            <List>

            <div className='w-full relative h-10'>
                <button className='absolute left-3 mt-1 flex items-start box-border justify-center px-3 py-1  rounded-lg bg-custom-blue text-white ' onClick={() => setToogle(!toogle)}>
                  X
                </button>
              </div>

              <ListItemButton 
                selected={activeTab === 'dashboard'} 
                onClick={() => handleTabChange('dashboard')}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <HomeIcon color={activeTab === 'dashboard' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Dashboard" />
              </ListItemButton>

              <ListItemButton 
                selected={activeTab === 'products'} 
                onClick={() => handleTabChange('products')}
                sx={{ 
                  '&.Mui-selected': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.16)',
                    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
                    transform: 'scale(1.03)',
                  },
                  '&.Mui-selected:hover': { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                  borderRadius: '8px',
                  mx: 1,
                  mb: 0.5,
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemIcon sx={{ color: 'white' }}>
                  <ProductsIcon color={activeTab === 'products' ? 'white' : 'inherit'} />
                </ListItemIcon>
                <ListItemText 
                  primary="Products" 
                  primaryTypographyProps={{ 
                    fontWeight: activeTab === 'products' ? 'bold' : 'normal' 
                  }} 
                />
              </ListItemButton>

              <ListItemButton 
                selected={activeTab === 'sellersProducts'} 
                onClick={() => {
                  handleTabChange('sellersProducts');
                  fetchSellersWithProducts();
                }}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <SellersProductsIcon color={activeTab === 'sellersProducts' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Sellers Products" />
              </ListItemButton>

              <ListItemButton 
                selected={activeTab === 'storehouse'} 
                onClick={() => handleTabChange('storehouse')}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <StorehouseIcon color={activeTab === 'storehouse' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Product Storehouse" />
              </ListItemButton>

              <ListItemButton 
                selected={activeTab === 'orders'} 
                onClick={() => handleTabChange('orders')}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <Badge 
                    badgeContent={pendingOrdersCount} 
                    color="error"
                    max={99}
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.6rem',
                        height: '16px',
                        minWidth: '16px',
                      }
                    }}
                  >
                  <OrderIcon color={activeTab === 'orders' ? 'primary' : 'inherit'} />
                  </Badge>
                </ListItemIcon>
                <ListItemText primary="Orders" />
              </ListItemButton>

              {/* <ListItemButton 
                selected={activeTab === 'package'} 
                onClick={() => handleTabChange('package')}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5
                }}
              >
                <ListItemIcon>
                  <PackageIcon color={activeTab === 'package' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Package" />
              </ListItemButton> */}

              {/* <ListItemButton 
                selected={activeTab === 'spreadPackages'} 
                onClick={() => handleTabChange('spreadPackages')}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <SpreadIcon color={activeTab === 'spreadPackages' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Spread Packages" />
              </ListItemButton> */}

              {/* <ListItemButton 
                selected={activeTab === 'affiliate'} 
                onClick={() => handleTabChange('affiliate')}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <AffiliateIcon color={activeTab === 'affiliate' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Affiliate System" />
              </ListItemButton> */}

              <ListItemButton 
                selected={activeTab === 'withdraw'} 
                onClick={() => handleTabChange('withdraw')}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <AccountBalance color={activeTab === 'withdraw' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Money Withdraw" />
              </ListItemButton>

              <ListItemButton 
                selected={activeTab === 'conversations'} 
                onClick={() => handleTabChange('conversations')}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <ConversationsIcon color={activeTab === 'conversations' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Conversations" />
                {unreadConversationsCount > 0 && (
                  <Box
                    sx={{
                      bgcolor: 'error.main',
                      color: 'white',
                      borderRadius: '50%',
                      width: 22,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      mr: 1
                    }}
                  >
                    {unreadConversationsCount}
                  </Box>
                )}
              </ListItemButton>

              {/* <ListItemButton 
                selected={activeTab === 'adminProfile'} 
                onClick={() => handleTabChange('adminProfile')}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <ProfileIcon color={activeTab === 'adminProfile' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Admin Profile" />
              </ListItemButton> */}

              <ListItemButton 
                selected={activeTab === 'viewSellerProfile'} 
                onClick={() => handleTabChange('viewSellerProfile')}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <StoreIcon color={activeTab === 'viewSellerProfile' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="View Seller Profile" />
              </ListItemButton>

              {/* <ListItemButton 
                selected={activeTab === 'settings'} 
                onClick={() => handleTabChange('settings')}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <SettingsIcon color={activeTab === 'settings' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Shop Setting" />
              </ListItemButton> */}

              {/* <ListItemButton 
                selected={activeTab === 'refunds'} 
                onClick={() => handleTabChange('refunds')}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <RefundIcon color={activeTab === 'refunds' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Received Refund Request" />
              </ListItemButton> */}
{/* 
              <ListItemButton 
                selected={activeTab === 'sellerProfiles'} 
                onClick={() => {
                  handleTabChange('sellerProfiles');
                  fetchSellers();
                }}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <StoreIcon color={activeTab === 'sellerProfiles' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Seller Profiles" />
              </ListItemButton> */}

              <ListItemButton 
                selected={activeTab === 'customerProfiles'} 
                onClick={() => {
                  handleTabChange('customerProfiles');
                  fetchCustomerProfiles();
                }}
                sx={{ 
                  '&.Mui-selected': { backgroundColor: '#edf3fd', color: '#3b82f6' },
                  '&.Mui-selected:hover': { backgroundColor: '#e5effd' },
                  borderRadius: '4px',
                  mx: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon>
                  <ProfileIcon color={activeTab === 'customerProfiles' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText primary="Customer Profiles" />
              </ListItemButton>

              <ListItem button onClick={() => setActiveTab('addMoney')}>
                <ListItemText primary="Add Money" />
              </ListItem>
            </List>
          </Box>
        </Drawer>
        <Main open={true} sx={{ 
          mt: 0,
          pl: 0,
          ml: 0,
          width: `calc(100% - ${drawerWidth}px)`,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          position: 'relative', // Add position relative
          minHeight: `calc(100vh - ${navbarHeight}px)`, // Ensure minimum height
          background: 'linear-gradient(to bottom, #f5f7ff, #ffffff)',
          overflowY: 'auto',
          pb: 6
        }}
        onClick={() => {
          // Close sidebar when clicking on main content
          if (toogle) {
            setToogle(false);
          }
        }}
        >
          {renderTabContent()}
          {/* <ChatWindow userRole="admin" recipientRole="seller" /> */}
          <ScrollToTopButton 
            className={showScrollTop ? 'visible' : ''}
            onClick={scrollToTop}
            size="large"
          >
            <ArrowUpwardIcon />
          </ScrollToTopButton>
        </Main>
      </Box>
      <ProductModal
        open={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={handleProductEdit}
      />

      {/* Seller Details Modal */}
      <Dialog 
        open={!!selectedSeller} 
        onClose={() => setSelectedSeller(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Seller Details
          <IconButton
            aria-label="close"
            onClick={() => setSelectedSeller(null)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CancelIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedSeller && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Name</Typography>
                  <Typography variant="body1">{selectedSeller.name}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Email</Typography>
                  <Typography variant="body1">{selectedSeller.email}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Phone</Typography>
                  <Typography variant="body1">{selectedSeller.phone || 'N/A'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Shop Name</Typography>
                  <Typography variant="body1">{selectedSeller.shopName || 'N/A'}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Registration Date</Typography>
                  <Typography variant="body1">
                    {selectedSeller.registrationDate 
                      ? new Date(selectedSeller.registrationDate.toDate()).toLocaleDateString() 
                      : 'N/A'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Chip 
                    label={selectedSeller.status || 'Active'} 
                    color={selectedSeller.status === 'Active' ? 'success' : 'warning'}
                    size="small"
                  />
                </Box>
              </Grid>
              {selectedSeller.address && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">Address</Typography>
                    <Typography variant="body1">{selectedSeller.address}</Typography>
                  </Box>
                </Grid>
              )}
              
              {/* Payment Methods Section */}
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    Payment Methods
                  </Typography>
                  <Grid container spacing={2}>
                    {/* Cash Payment */}
                    {selectedSeller.cashPayment && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <MoneyIcon sx={{ mr: 1, color: 'success.main' }} />
                            <Typography variant="subtitle2">Cash Payment</Typography>
                          </Box>
                          <Typography variant="body2" color="textSecondary">
                            Accepts cash payments
                          </Typography>
                        </Paper>
                      </Grid>
                    )}

                    {/* Bank Payment */}
                    {selectedSeller.bankPayment && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <AccountBalance sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography variant="subtitle2">Bank Details</Typography>
                          </Box>
                          <Grid container spacing={1}>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="textSecondary">
                                Bank Name:
                              </Typography>
                              <Typography variant="body1">
                                {selectedSeller.bankName || 'N/A'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="textSecondary">
                                Account Name:
                              </Typography>
                              <Typography variant="body1">
                                {selectedSeller.bankAccountName || 'N/A'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="textSecondary">
                                Account Number:
                              </Typography>
                              <Typography variant="body1">
                                {selectedSeller.bankAccountNumber || 'N/A'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="textSecondary">
                                IFSC Code:
                              </Typography>
                              <Typography variant="body1">
                                {selectedSeller.ifscCode || 'N/A'}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>
                    )}

                    {/* USDT Payment */}
                    {selectedSeller.usdtPayment && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CurrencyBitcoinIcon sx={{ mr: 1, color: 'warning.main' }} />
                            <Typography variant="subtitle2">USDT Details</Typography>
                          </Box>
                          <Grid container spacing={1}>
                            <Grid item xs={12}>
                              <Typography variant="body2" color="textSecondary">
                                USDT Address:
                              </Typography>
                              <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                                {selectedSeller.usdtAddress || 'N/A'}
                              </Typography>
                            </Grid>
                            {selectedSeller.usdtLink && (
                              <Grid item xs={12}>
                                <Typography variant="body2" color="textSecondary">
                                  USDT Payment Link:
                                </Typography>
                                <Link
                                  href={selectedSeller.usdtLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{ wordBreak: 'break-all' }}
                                >
                                  {selectedSeller.usdtLink}
                                </Link>
                              </Grid>
                            )}
                          </Grid>
                        </Paper>
                      </Grid>
                    )}

                    {!selectedSeller.cashPayment && !selectedSeller.bankPayment && !selectedSeller.usdtPayment && (
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          No payment methods configured
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </Grid>

              {/* ID Proof Section */}
              {selectedSeller.documentType && selectedSeller.idProof && (
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>ID Proof Images</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {typeof selectedSeller.idProof === 'string' ? (
                        <Box 
                          component="img"
                          src={selectedSeller.idProof}
                          alt="ID Proof"
                          sx={{ 
                            width: 240, 
                            height: 180, 
                            objectFit: 'cover', 
                            border: '1px solid #ddd',
                            borderRadius: 1,
                            cursor: 'pointer'
                          }}
                          onClick={() => window.open(selectedSeller.idProof, '_blank')}
                        />
                      ) : Array.isArray(selectedSeller.idProof) ? (
                        selectedSeller.idProof.map((image, index) => (
                          <Box 
                            key={index}
                            component="img"
                            src={image}
                            alt={`ID Proof ${index + 1}`}
                            sx={{ 
                              width: 240, 
                              height: 180, 
                              objectFit: 'cover', 
                              border: '1px solid #ddd',
                              borderRadius: 1,
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(image, '_blank')}
                          />
                        ))
                      ) : null}
                    </Box>
                  </Box>
                </Grid>
              )}
              
              {/* Alternative field names for ID proof images */}
              {!selectedSeller.idProof && (selectedSeller.idProofImages || selectedSeller.documents || selectedSeller.idProofFiles || selectedSeller.identityDocuments) && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>ID Proof Images</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {(() => {
                      const proofImages = selectedSeller.idProofImages || selectedSeller.documents || selectedSeller.idProofFiles || selectedSeller.identityDocuments;
                      
                      if (typeof proofImages === 'string') {
                        return (
                          <Box 
                            component="img"
                            src={proofImages}
                            alt="ID Proof"
                            sx={{ 
                              width: 240, 
                              height: 180, 
                              objectFit: 'cover', 
                              border: '1px solid #ddd',
                              borderRadius: 1,
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(proofImages, '_blank')}
                          />
                        );
                      } else if (Array.isArray(proofImages)) {
                        return proofImages.map((image, index) => (
                          <Box 
                            key={index}
                            component="img"
                            src={image}
                            alt={`ID Proof ${index + 1}`}
                            sx={{ 
                              width: 240, 
                              height: 180, 
                              objectFit: 'cover', 
                              border: '1px solid #ddd',
                              borderRadius: 1,
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(image, '_blank')}
                          />
                        ));
                      } else if (typeof proofImages === 'object') {
                        // Handle case where it's an object with URLs
                        return Object.values(proofImages).map((image, index) => {
                          if (typeof image === 'string') {
                            return (
                              <Box 
                                key={index}
                                component="img"
                                src={image}
                                alt={`ID Proof ${index + 1}`}
                                sx={{ 
                                  width: 240, 
                                  height: 180, 
                                  objectFit: 'cover', 
                                  border: '1px solid #ddd',
                                  borderRadius: 1,
                                  cursor: 'pointer'
                                }}
                                onClick={() => window.open(image, '_blank')}
                              />
                            );
                          }
                          return null;
                        }).filter(item => item !== null);
                      }
                      
                      return null;
                    })()}
                  </Box>
                </Grid>
              )}
              
              {/* Handle object format with front/back, frontImage/backImage structure */}
              {!selectedSeller.idProof && 
               !selectedSeller.idProofImages && 
               !selectedSeller.documents && 
               !selectedSeller.idProofFiles && 
               !selectedSeller.identityDocuments && 
               selectedSeller.verification && 
               selectedSeller.verification.documents && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>ID Proof Images</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {Object.entries(selectedSeller.verification.documents).map(([key, value], index) => {
                      if (typeof value === 'string') {
                        return (
                          <Box 
                            key={index}
                            component="img"
                            src={value}
                            alt={`ID Proof ${key}`}
                            sx={{ 
                              width: 240, 
                              height: 180, 
                              objectFit: 'cover', 
                              border: '1px solid #ddd',
                              borderRadius: 1,
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(value, '_blank')}
                          />
                        );
                      }
                      return null;
                    })}
                  </Box>
                </Grid>
              )}
              
              {/* Handle plain object structure with frontImage/backImage properties */}
              {!selectedSeller.idProof && 
               !selectedSeller.idProofImages && 
               !selectedSeller.documents && 
               !selectedSeller.idProofFiles && 
               !selectedSeller.identityDocuments && 
               typeof selectedSeller.frontImage === 'string' && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>ID Proof Images</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box 
                      component="img"
                      src={selectedSeller.frontImage}
                      alt="ID Proof Front"
                      sx={{ 
                        width: 240, 
                        height: 180, 
                        objectFit: 'cover', 
                        border: '1px solid #ddd',
                        borderRadius: 1,
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(selectedSeller.frontImage, '_blank')}
                    />
                    {selectedSeller.backImage && (
                      <Box 
                        component="img"
                        src={selectedSeller.backImage}
                        alt="ID Proof Back"
                        sx={{ 
                          width: 240, 
                          height: 180, 
                          objectFit: 'cover', 
                          border: '1px solid #ddd',
                          borderRadius: 1,
                          cursor: 'pointer'
                        }}
                        onClick={() => window.open(selectedSeller.backImage, '_blank')}
                      />
                    )}
                  </Box>
                </Grid>
              )}
              
              {/* For when idProof is an object with front/back properties */}
              {selectedSeller.idProof && typeof selectedSeller.idProof === 'object' && !Array.isArray(selectedSeller.idProof) && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>ID Proof Images</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {Object.entries(selectedSeller.idProof).map(([key, value], index) => {
                      if (typeof value === 'string') {
                        return (
                          <Box 
                            key={index}
                            component="img"
                            src={value}
                            alt={`ID Proof ${key}`}
                            sx={{ 
                              width: 240, 
                              height: 180, 
                              objectFit: 'cover', 
                              border: '1px solid #ddd',
                              borderRadius: 1,
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(value, '_blank')}
                          />
                        );
                      }
                      return null;
                    })}
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedSeller(null)}>Close</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => {
              handleEditSeller(selectedSeller);
              setSelectedSeller(null);
            }}
          >
            Edit Profile
          </Button>
        </DialogActions>
      </Dialog>

      {/* Seller Edit Modal */}
      <Dialog 
        open={isSellerEditModalOpen} 
        onClose={() => setIsSellerEditModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Edit Seller Profile
          <IconButton
            aria-label="close"
            onClick={() => setIsSellerEditModalOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CancelIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedSeller && (
            <form ref={formRef}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Name"
                    name="name"
                    defaultValue={selectedSeller.name}
                    variant="outlined"
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    defaultValue={selectedSeller.email}
                    variant="outlined"
                    margin="normal"
                    disabled
                  />
                  <TextField
                    fullWidth
                    label="Phone"
                    name="phone"
                    defaultValue={selectedSeller.phone}
                    variant="outlined"
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="New Password"
                    name="password"
                    id="seller-password"
                    type="text"
                    defaultValue=""
                    variant="outlined"
                    margin="normal"
                    helperText="Leave blank to keep current password"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Shop Name"
                    name="shopName"
                    defaultValue={selectedSeller.shopName}
                    variant="outlined"
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="Country"
                    name="country"
                    defaultValue={selectedSeller.country}
                    variant="outlined"
                    margin="normal"
                    required
                  />
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="status"
                      defaultValue={selectedSeller.status || 'Active'}
                    >
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Inactive">Inactive</MenuItem>
                      <MenuItem value="Suspended">Suspended</MenuItem>
                    </Select>
                  </FormControl>
                  <Box sx={{ mt: 2 }}>
                    <Typography component="legend">Seller Rating</Typography>
                    <Rating
                      name="rating"
                      value={Number(selectedSeller.rating) || 0}
                      precision={1}
                      max={5}
                      size="large"
                      onChange={(event, newValue) => {
                        setSelectedSeller(prev => ({
                          ...prev,
                          rating: newValue
                        }));
                      }}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    name="address"
                    defaultValue={selectedSeller.address}
                    variant="outlined"
                    margin="normal"
                    multiline
                    rows={3}
                  />
                </Grid>
              </Grid>
            </form>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsSellerEditModalOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleUpdateSeller}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cart Sidebar */}
      <Drawer
        anchor="right"
        open={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 400 },
            p: 2,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            Cart ({getTotalCartItems()} items)
          </Typography>
          <IconButton onClick={() => setIsCartOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        {adminCart.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Your cart is empty
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<ShoppingCartIcon />}
              onClick={() => {
                setIsCartOpen(false);
                handleTabChange('sellersProducts');
              }}
              sx={{ mt: 2 }}
            >
              Continue Shopping
            </Button>
          </Box>
        ) : (
          <>
            <List sx={{ mb: 2, maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
              {adminCart.map((item) => (
                <ListItem 
                  key={item.id}
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleRemoveFromCart(item.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  }
                  sx={{ 
                    py: 1.5, 
                    px: 0, 
                    borderBottom: '1px solid', 
                    borderColor: 'divider' 
                  }}
                >
                  <Box sx={{ display: 'flex', width: '100%', alignItems: 'center' }}>
                    <Box 
                      component="img" 
                      src={item.imageUrl} 
                      alt={item.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = process.env.PUBLIC_URL + '/images/product1.jpg';
                      }}
                      sx={{ 
                        width: 70, 
                        height: 70, 
                        mr: 2, 
                        objectFit: 'cover',
                        borderRadius: 1 
                      }}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" noWrap>{item.name}</Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {item.seller ? `Seller: ${item.seller.shopName || item.seller.email || 'Unknown'}` : 'Unknown Seller'}
                      </Typography>
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold', mt: 0.5 }}>
                        ${(item.price * item.quantity).toFixed(2)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleUpdateCartQuantity(item.id, Math.max(1, item.quantity - 1))}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <Typography sx={{ mx: 1, minWidth: '20px', textAlign: 'center' }}>
                          {item.quantity}
                        </Typography>
                        <IconButton 
                          size="small" 
                          onClick={() => handleUpdateCartQuantity(item.id, item.quantity + 1)}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
            
            <Box sx={{ mt: 'auto' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1">Subtotal:</Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                  ${getTotalCartPrice().toFixed(2)}
                </Typography>
              </Box>
              
              <Button 
                variant="contained" 
                fullWidth 
                startIcon={<ShoppingCartCheckoutIcon />}
                sx={{ mb: 1 }}
                onClick={() => {
                  createOrderFromCart();
                }}
              >
                Checkout
              </Button>
              
              <Button 
                variant="outlined" 
                fullWidth 
                color="error" 
                startIcon={<DeleteSweepIcon />}
                onClick={handleClearCart}
              >
                Clear Cart
              </Button>
            </Box>
          </>
        )}
      </Drawer>

      {/* Status Update Modal */}
      <StatusUpdateModal
        open={isStatusUpdateModalOpen}
        order={selectedOrder}
        onClose={() => {
          setIsStatusUpdateModalOpen(false);
          setSelectedOrder(null);
        }}
        onUpdateStatus={handleUpdateOrderStatus}
      />

      {/* Seller Details Modal */}
      <SellerDetailsModal
        open={isSellerDetailsModalOpen}
        seller={selectedSellerDetails}
        onClose={() => setIsSellerDetailsModalOpen(false)}
      />
      
      {snackbar.open && (
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};

export default AdminDashboard; 
