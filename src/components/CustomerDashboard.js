import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Paper, 
  Box,
  Avatar,
  Button,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  CircularProgress,
  Divider,
  Badge,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  styled,
  CssBaseline,
  Chip,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  InputAdornment,
  InputBase,
  InputLabel,
  FormControl,
  Select,
  useTheme,
  alpha,
  useMediaQuery,
  Tooltip,
  Zoom
} from '@mui/material';
import { 
  ShoppingCart as CartIcon,
  Favorite,
  Person,
  LocalShipping as OrderIcon,
  Add as AddIcon,
  Store as StoreIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Dashboard,
  ShoppingBag,
  ReceiptLong,
  Search,
  Delete,
  ShoppingCartOutlined,
  Remove,
  Add,
  ShoppingCart,
  ArrowForward,
  Mail as MailIcon,
  Home as HomeIcon,
  InfoOutlined,
  CardGiftcard,
  Stars,
  LocalOffer,
  Inventory,
  AccessTime,
  ArrowUpward
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, getDocs, query, where, updateDoc, arrayUnion, setDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

// Define the drawer width
const drawerWidth = 260;

// Calculate the navbar height to position the sidebar correctly
const navbarHeight = 64;

// Create a styled main content area
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  }),
);

// Enhanced styled components
const StyledDashboardCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 16,
  position: 'relative',
  overflow: 'hidden',
  transition: 'transform 0.3s, box-shadow 0.3s',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  '&:hover': {
    transform: 'translateY(-8px)',
    boxShadow: '0 12px 20px 0 rgba(0,0,0,0.13)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100px',
    height: '100px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '0 0 0 100%',
  },
}));

const StyledProductCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.4s ease, box-shadow 0.4s ease',
  borderRadius: 16,
  overflow: 'hidden',
  '&:hover': {
    transform: 'translateY(-10px)',
    boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
  }
}));

const StatusChip = styled(Chip)(({ theme, status }) => {
  let color, bgColor;
  
  switch(status) {
    case 'completed':
      color = '#1b5e20';
      bgColor = '#e8f5e9';
      break;
    case 'shipped':
      color = '#0d47a1';
      bgColor = '#e3f2fd';
      break;
    case 'processing':
      color = '#e65100';
      bgColor = '#fff3e0';
      break;
    case 'canceled':
      color = '#b71c1c';
      bgColor = '#ffebee';
      break;
    default:
      color = '#424242';
      bgColor = '#f5f5f5';
  }
  
  return {
    backgroundColor: bgColor,
    color: color,
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: 8,
    '& .MuiChip-label': {
      padding: '0 8px',
    }
  };
});

const SectionHeading = styled(Typography)(({ theme }) => ({
  position: 'relative',
  marginBottom: theme.spacing(3),
  paddingBottom: theme.spacing(1),
  fontWeight: 700,
  '&:after': {
    content: '""',
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 4,
    width: 60,
    backgroundImage: 'linear-gradient(to right, #3f51b5, #9c27b0)',
    borderRadius: 4
  }
}));

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: 16,
  boxShadow: '0 6px 18px rgba(0, 0, 0, 0.08)',
  overflow: 'hidden',
  '& .MuiTableCell-head': {
    backgroundImage: 'linear-gradient(to right, #3f51b5, #5c6bc0)',
    color: theme.palette.common.white,
    fontWeight: 600,
  },
  '& .MuiTableRow-root:nth-of-type(even)': {
    backgroundColor: alpha(theme.palette.primary.light, 0.04),
  },
  '& .MuiTableCell-root': {
    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
  }
}));

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    boxSizing: 'border-box',
    backgroundImage: 'linear-gradient(to bottom, #1a237e, #283593, #303f9f)',
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
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    }
  }
}));

const AnimatedAvatar = styled(Avatar)(({ theme }) => ({
  width: 80,
  height: 80,
  margin: '0 auto 16px',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  color: 'white',
  boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
  fontSize: 32,
  position: 'relative',
  transition: 'transform 0.3s ease',
  '&:hover': {
    transform: 'scale(1.1)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2), rgba(0, 0, 0, 0) 70%)',
  }
}));

const GlassPanel = styled(Paper)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
  backdropFilter: 'blur(10px)',
  borderRadius: 16,
  padding: theme.spacing(3),
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
  border: `1px solid ${alpha(theme.palette.common.white, 0.2)}`,
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    boxShadow: '0 15px 35px 0 rgba(31, 38, 135, 0.2)',
    transform: 'translateY(-5px)',
  }
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

const DashboardCard = ({ title, value, icon, color }) => (
  <StyledDashboardCard elevation={3} sx={{ 
    background: color || 'background.paper',
    '.MuiTypography-root': { color: color ? 'white' : 'inherit' }
  }}>
    <Box display="flex" alignItems="center" justifyContent="space-between" position="relative" zIndex={1}>
      <Box>
        <Typography color="textSecondary" variant="subtitle2" gutterBottom 
          sx={{ fontWeight: 500, color: color ? 'rgba(255,255,255,0.8)' : undefined }}>
          {title}
        </Typography>
        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
          {value}
        </Typography>
      </Box>
      <Avatar 
        sx={{ 
          bgcolor: color ? 'rgba(255, 255, 255, 0.2)' : 'rgba(25, 118, 210, 0.12)', 
          width: 56, 
          height: 56,
          color: color ? 'white' : 'primary.main',
          transform: 'rotate(-10deg)',
          '&:hover': {
            transform: 'rotate(0deg) scale(1.1)',
            transition: 'transform 0.3s ease',
          }
        }}
      >
        {icon}
      </Avatar>
    </Box>
  </StyledDashboardCard>
);

const ProductCard = ({ product, onAddToCart }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleViewDetails = () => {
    console.log("View details for product:", product.id);
  };
  
  if (!product) {
    console.error("Product data missing in ProductCard");
    return null;
  }
  
  return (
    <StyledProductCard 
      elevation={isHovered ? 4 : 1}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Box sx={{ position: 'relative', pt: '75%', overflow: 'hidden' }}>
      <CardMedia
        component="img"
          image={product.imageUrl || 'https://via.placeholder.com/300x200?text=Product+Image'}
        alt={product.name}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.6s ease',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
          }}
        />
        {product.discount > 0 && (
          <Chip
            label={`${product.discount}% OFF`}
            color="error"
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              fontWeight: 'bold',
              px: 1
            }}
          />
        )}
      </Box>
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography gutterBottom variant="h6" component="div" sx={{ fontWeight: 600, mb: 0.5 }}>
          {product.name}
        </Typography>
        {/* <Typography variant="body2" color="text.secondary" gutterBottom>
          {product.seller?.name || 'Unknown Seller'}
        </Typography> */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
          <Box>
            {product.discount > 0 ? (
              <>
                <Typography variant="h6" component="span" color="primary.main" sx={{ fontWeight: 'bold' }}>
                  ${(product.price * (1 - product.discount / 100)).toFixed(2)}
          </Typography>
                <Typography variant="body2" component="span" sx={{ textDecoration: 'line-through', ml: 1, color: 'text.disabled' }}>
                  ${product.price.toFixed(2)}
              </Typography>
              </>
            ) : (
              <Typography variant="h6" component="span" color="primary.main" sx={{ fontWeight: 'bold' }}>
                ${product.price.toFixed(2)}
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip 
              size="small" 
              icon={<StoreIcon fontSize="small" />} 
              label={product.stock > 0 ? 'In Stock' : ''} 
              color={product.stock > 0 ? 'success' : 'error'}
              variant="outlined"
            />
          </Box>
        </Box>
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button 
          variant="contained" 
          size="small" 
          startIcon={<ViewIcon />}
          onClick={handleViewDetails}
          sx={{ mr: 1, borderRadius: 8 }}
        >
          View
        </Button>
        <Button 
          variant="outlined"
          size="small" 
          startIcon={<ShoppingCartOutlined />}
          onClick={() => onAddToCart(product)}
          disabled={product.stock <= 0}
          sx={{ borderRadius: 8 }}
        >
          Add to Cart
        </Button>
      </CardActions>
    </StyledProductCard>
  );
};

// Define the OrderDetailsModal component
const OrderDetailsModal = ({ open, order, onClose }) => {
  if (!order) return null;
  
  // Helper function to format date safely
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      // Check if timestamp is a Firestore timestamp with toDate method
      if (timestamp && typeof timestamp.toDate === 'function') {
        return new Date(timestamp.toDate()).toLocaleDateString();
      } 
      // Check if it's a JavaScript Date object or timestamp in milliseconds
      else if (timestamp instanceof Date || typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleDateString();
      }
      // Handle string dates
      else if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString();
      }
      // Default fallback
      return 'N/A';
    } catch (error) {
      console.log('Error formatting date:', error);
      return 'N/A';
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
          <Typography variant="h6">Order Details</Typography>
          <Typography variant="body2">
            Order ID: {order.id}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Order Summary</Typography>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Order Date:</Typography>
                <Typography variant="body2">
                  {formatDate(order.createdAt)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Status:</Typography>
                <Chip 
                  label={order.status || 'Processing'} 
                  color={
                    order.status === 'Delivered' 
                      ? 'success' 
                      : order.status === 'Shipped' 
                      ? 'info' 
                      : 'warning'
                  } 
                  size="small" 
                />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Shipping Information</Typography>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="body1">{order.customerName}</Typography>
              <Typography variant="body2">{order.customerEmail}</Typography>
              <Typography variant="body2" mt={1}>
                <strong>Shipping Address:</strong><br />
                {order.shippingAddress}, {order.shippingCity}<br />
                {order.shippingPostalCode}, {order.shippingCountry}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>Order Items</Typography>
            <TableContainer component={Paper}>
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
                    <TableRow key={item.id}>
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
                            }}
                          />
                          <Box>
                            <Typography variant="body2">{item.name}</Typography>
                            {item.seller && (
                              <Typography variant="caption" color="text.secondary">
                                {/* Seller: {item.seller.shopName || 'Unknown'} */}
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
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '200px', mb: 1 }}>
                <Typography variant="body1">Subtotal:</Typography>
                <Typography variant="body1">${parseFloat(order.subtotal).toFixed(2)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '200px', mb: 1 }}>
                <Typography variant="body1" fontWeight="bold">Total:</Typography>
                <Typography variant="body1" fontWeight="bold">
                  ${parseFloat(order.total).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {(order.status === 'pending' || order.status === 'processing') && (
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => {
              // Order tracking functionality would go here
              console.log('Track order:', order.id);
            }}
          >
            Track Order
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const CustomerDashboard = () => {
  const [customerData, setCustomerData] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    postalCode: '',
  });
  const [passwordChange, setPasswordChange] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [filteredProductsList, setFilteredProductsList] = useState([]);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const mainRef = useRef(null);

  // Helper function to format date safely
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      // Check if timestamp is a Firestore timestamp with toDate method
      if (timestamp && typeof timestamp.toDate === 'function') {
        return new Date(timestamp.toDate()).toLocaleDateString();
      } 
      // Check if it's a JavaScript Date object or timestamp in milliseconds
      else if (timestamp instanceof Date || typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleDateString();
      }
      // Handle string dates
      else if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString();
      }
      // Default fallback
      return 'N/A';
    } catch (error) {
      console.log('Error formatting date:', error);
      return 'N/A';
    }
  };

  useEffect(() => {
    // This effect only runs when the auth state changes
    const authStateChanged = async () => {
      if (!auth.currentUser) {
        console.log('No authenticated user found');
        navigate('/customer/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'customers', auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setCustomerData(data);
          
          // Fetch cart data if it exists
          if (data.cart) {
            setCart(data.cart);
          }
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
      }
    };

    authStateChanged();
  }, [auth.currentUser, navigate]);

  useEffect(() => {
    // Only run product and order fetching when the component mounts
    // or when explicitly triggered, not on every render
    const fetchData = async () => {
      const fetchAllProducts = async () => {
        setLoading(true);
        try {
          // Fetch all sellers with active status
          const sellersRef = collection(db, 'sellers');
          const sellersQuery = query(sellersRef, where('status', '==', 'active'));
          const sellersSnapshot = await getDocs(sellersQuery);
          
          const sellersData = [];
          sellersSnapshot.forEach((doc) => {
            sellersData.push({ id: doc.id, ...doc.data() });
          });
          
          // Fetch products from each seller
          const allProducts = [];
          
          for (const seller of sellersData) {
            if (seller.products && Array.isArray(seller.products) && seller.products.length > 0) {
              const sellerProducts = await Promise.all(
                seller.products.map(async (productId) => {
                  const productDoc = await getDoc(doc(db, 'products', productId));
                  if (productDoc.exists()) {
                    return { 
                      id: productDoc.id, 
                      ...productDoc.data(),
                      seller: {
                        id: seller.id,
                        // shopName: seller.shopName,
                        // name: seller.name
                      }
                    };
                  }
                  return null;
                })
              );
              
              // Filter out null products
              const validProducts = sellerProducts.filter(p => p !== null);
              allProducts.push(...validProducts);
            }
          }
          
          setProducts(allProducts);
        } catch (error) {
          console.error('Error fetching products:', error);
          setSnackbar({
            open: true,
            message: 'Failed to load products. Please try again later.',
            severity: 'error'
          });
        } finally {
          setLoading(false);
        }
      };

      const fetchCustomerProfile = async () => {
        if (auth.currentUser) {
          try {
            const customerDoc = await getDoc(doc(db, 'customers', auth.currentUser.uid));
            if (customerDoc.exists()) {
              const data = customerDoc.data();
              setProfileData({
                name: data.name || '',
                phone: data.phone || '',
                email: auth.currentUser.email || '',
                address: data.address || '',
                postalCode: data.postalCode || '',
              });
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
            setSnackbar({
              open: true,
              message: 'Failed to load profile data',
              severity: 'error'
            });
          }
        }
      };

      const setupOrdersListener = () => {
        if (!auth.currentUser) return () => {};
        
        setOrdersLoading(true);
        
        try {
          // Create a query for this customer's orders
          const ordersRef = collection(db, 'orders');
          const q = query(
            ordersRef, 
            where('customerId', '==', auth.currentUser.uid),
            orderBy('createdAt', 'desc')
          );
          
          // Set up a real-time listener
          const unsubscribe = onSnapshot(q, 
            (querySnapshot) => {
              const ordersData = [];
              querySnapshot.forEach((doc) => {
                ordersData.push({ id: doc.id, ...doc.data() });
              });
              
              setOrders(ordersData);
              setOrdersLoading(false);
            },
            (error) => {
              console.log('Error in orders listener:', error.message);
              
              // Check if this is an index error and handle accordingly
              if (error.code === 'failed-precondition' || error.message.includes('index')) {
                // Fallback: Query without orderBy to at least show some data
                const simpleQuery = query(
                  ordersRef, 
                  where('customerId', '==', auth.currentUser.uid)
                );
                
                const fallbackUnsubscribe = onSnapshot(simpleQuery, 
                  (simpleQuerySnapshot) => {
                    const simpleOrdersData = [];
                    simpleQuerySnapshot.forEach((doc) => {
                      simpleOrdersData.push({ id: doc.id, ...doc.data() });
                    });
                    
                    // Sort manually on client side
                    simpleOrdersData.sort((a, b) => {
                      // Handle missing createdAt fields
                      if (!a.createdAt && !b.createdAt) return 0;
                      if (!a.createdAt) return 1; // b comes first
                      if (!b.createdAt) return -1; // a comes first
                      
                      // Handle Firestore timestamps
                      if (typeof a.createdAt.toDate === 'function' && typeof b.createdAt.toDate === 'function') {
                        return b.createdAt.toDate() - a.createdAt.toDate();
                      }
                      
                      // Handle JavaScript Date objects
                      if (a.createdAt instanceof Date && b.createdAt instanceof Date) {
                        return b.createdAt - a.createdAt;
                      }
                      
                      // Handle numbers (timestamps)
                      if (typeof a.createdAt === 'number' && typeof b.createdAt === 'number') {
                        return b.createdAt - a.createdAt;
                      }
                      
                      // Handle string dates
                      if (typeof a.createdAt === 'string' && typeof b.createdAt === 'string') {
                        return new Date(b.createdAt) - new Date(a.createdAt);
                      }
                      
                      // Handle mixed types - convert both to milliseconds if possible
                      try {
                        const aTime = typeof a.createdAt.toDate === 'function' 
                          ? a.createdAt.toDate().getTime() 
                          : new Date(a.createdAt).getTime();
                          
                        const bTime = typeof b.createdAt.toDate === 'function' 
                          ? b.createdAt.toDate().getTime() 
                          : new Date(b.createdAt).getTime();
                          
                        return bTime - aTime;
                      } catch (error) {
                        console.log('Error comparing dates:', error);
                        return 0;
                      }
                    });
                    
                    setOrders(simpleOrdersData);
                    setOrdersLoading(false);
                  },
                  (fallbackError) => {
                    console.log('Fallback query error:', fallbackError.message);
                    setOrdersLoading(false);
                    setOrders([]);
                  }
                );
                
                return fallbackUnsubscribe;
              }
              
              setSnackbar({
                open: true,
                message: 'Unable to load orders. Please try again later.',
                severity: 'error'
              });
              setOrdersLoading(false);
              setOrders([]);
            }
          );
          
          // Return the unsubscribe function for cleanup
          return unsubscribe;
        } catch (err) {
          console.log('Setup error:', err.message);
          setOrdersLoading(false);
          setOrders([]);
          return () => {}; // Return empty function as fallback
        }
      };

      if (auth.currentUser) {
        fetchAllProducts();
        fetchCustomerProfile();
        const unsubscribeOrders = setupOrdersListener();
        
        // Cleanup function to detach listeners when component unmounts
        return () => {
          if (unsubscribeOrders) {
            unsubscribeOrders();
          }
        };
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (mainRef.current) {
        const scrollTop = mainRef.current.scrollTop;
        setShowScrollTop(scrollTop > 300);
      }
    };
    
    if (mainRef.current) {
      mainRef.current.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (mainRef.current) {
        mainRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [mainRef.current]);

  const scrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const handleAddToCart = async (product) => {
    try {
      // Get current customer data to ensure we have the latest cart
      const customerRef = doc(db, 'customers', auth.currentUser.uid);
      const customerDoc = await getDoc(customerRef);
      
      if (!customerDoc.exists()) {
        throw new Error('Customer data not found. Please log out and log in again.');
      }
      
      const customerData = customerDoc.data();
      const currentCart = customerData.cart || [];
      
      // Check if product is already in cart
      const existingProduct = currentCart.find(item => item.id === product.id);
      
      let updatedCart;
      if (existingProduct) {
        // Update quantity if product already exists
        updatedCart = currentCart.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
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
        updatedCart = [...currentCart, cartItem];
      }
      
      // Update local state
      setCart(updatedCart);
      
      // Update in Firestore
      await updateDoc(customerRef, {
        cart: updatedCart
      });
      
      console.log('Cart updated successfully:', updatedCart);
      
      setSnackbar({
        open: true,
        message: 'Product added to cart!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      
      // More detailed error message
      let errorMessage = 'Failed to add product to cart. Please try again.';
      if (error.message) {
        errorMessage += ' Error: ' + error.message;
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleTabChange = (newValue) => {
    setActiveTab(newValue);
  };

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      const customerRef = doc(db, 'customers', auth.currentUser.uid);
      await updateDoc(customerRef, {
        name: profileData.name,
        phone: profileData.phone,
        address: profileData.address,
        postalCode: profileData.postalCode,
      });

      setSnackbar({
        open: true,
        message: 'Profile updated successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update profile',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = async () => {
    try {
      if (!newEmail) {
        throw new Error('Please enter a new email address');
      }
      if (!currentPassword) {
        throw new Error('Please enter your current password');
      }

      // Reauthenticate user
        const credential = EmailAuthProvider.credential(
          auth.currentUser.email,
        currentPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);

      // Update email
      await updateEmail(auth.currentUser, newEmail);

      setSnackbar({
        open: true,
        message: 'Email updated successfully!',
        severity: 'success'
      });
      setIsEmailDialogOpen(false);
      setNewEmail('');
      setCurrentPassword('');
      setProfileData({ ...profileData, email: newEmail });
    } catch (error) {
      console.error('Error updating email:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update email',
        severity: 'error'
      });
    }
  };

  const handlePasswordChange = async () => {
    try {
      if (passwordChange.newPassword !== passwordChange.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      // Reauthenticate user
          const credential = EmailAuthProvider.credential(
            auth.currentUser.email,
        passwordChange.currentPassword
          );
          await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, passwordChange.newPassword);
      
      setSnackbar({
        open: true,
        message: 'Password updated successfully!',
        severity: 'success'
      });
      setIsPasswordDialogOpen(false);
      setPasswordChange({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error updating password:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update password',
        severity: 'error'
      });
    }
  };

  // Effect to filter products whenever the search term or products list changes
  useEffect(() => {
    if (products && products.length > 0) {
      const filtered = products.filter(product => {
        if (!productSearchTerm) return true;
        if (!product || !product.name) return false;
        return product.name.toLowerCase().includes(productSearchTerm.toLowerCase());
      });
      setFilteredProductsList(filtered);
      console.log("Search term changed:", productSearchTerm, "filtered products:", filtered.length);
    } else {
      setFilteredProductsList([]);
    }
  }, [productSearchTerm, products]);

  // Function to refresh products based on search
  const refreshProducts = async () => {
    console.log("Refreshing products with search term:", productSearchTerm);
    setLoading(true);
    
    try {
      // Fetch all sellers with active status
      const sellersRef = collection(db, 'sellers');
      const sellersQuery = query(sellersRef, where('status', '==', 'active'));
      const sellersSnapshot = await getDocs(sellersQuery);
      
      const sellersData = [];
      sellersSnapshot.forEach((doc) => {
        sellersData.push({ id: doc.id, ...doc.data() });
      });
      
      // Fetch products from each seller
      const allProducts = [];
      
      for (const seller of sellersData) {
        if (seller.products && Array.isArray(seller.products) && seller.products.length > 0) {
          const sellerProducts = await Promise.all(
            seller.products.map(async (productId) => {
              const productDoc = await getDoc(doc(db, 'products', productId));
              if (productDoc.exists()) {
                return { 
                  id: productDoc.id, 
                  ...productDoc.data(),
                  seller: {
                    id: seller.id,
                  }
                };
              }
              return null;
            })
          );
          
          // Filter out null products
          const validProducts = sellerProducts.filter(p => p !== null);
          allProducts.push(...validProducts);
        }
      }
      
      setProducts(allProducts);
      
      // Filter products based on search term
      if (productSearchTerm) {
        const filtered = allProducts.filter(product => {
          if (!product || !product.name) return false;
          return product.name.toLowerCase().includes(productSearchTerm.toLowerCase());
        });
        setFilteredProductsList(filtered);
      } else {
        setFilteredProductsList(allProducts);
      }
    } catch (error) {
      console.error('Error refreshing products:', error);
      setSnackbar({
        open: true,
        message: 'Failed to refresh products. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDashboardContent = () => (
    <>
      <SectionHeading variant="h5" gutterBottom>
        Dashboard Overview
      </SectionHeading>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <Zoom in={true} style={{ transitionDelay: '100ms' }}>
            <Box>
          <DashboardCard 
                title="Total Orders" 
            value={orders.length} 
            icon={<ReceiptLong fontSize="large" />} 
                color="linear-gradient(135deg, #4527a0, #673ab7)"
          />
            </Box>
          </Zoom>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Zoom in={true} style={{ transitionDelay: '200ms' }}>
            <Box>
          <DashboardCard 
            title="Cart Items" 
            value={cart.reduce((total, item) => total + item.quantity, 0)} 
            icon={<ShoppingCart fontSize="large" />} 
                color="linear-gradient(135deg, #00796b, #009688)"
          />
            </Box>
          </Zoom>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Zoom in={true} style={{ transitionDelay: '300ms' }}>
            <Box>
          <DashboardCard 
            title="Wishlist" 
            value="0" 
            icon={<Favorite fontSize="large" />} 
                color="linear-gradient(135deg, #c62828, #e53935)"
          />
            </Box>
          </Zoom>
        </Grid>
      </Grid>

      <Box sx={{ mt: 5, mb: 1 }}>
        <SectionHeading variant="h5" gutterBottom>
          Recent Orders
        </SectionHeading>
        {ordersLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <GlassPanel elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ p: 2 }}>
              <ReceiptLong sx={{ fontSize: 70, color: 'text.disabled', mb: 2, opacity: 0.7 }} />
              <Typography color="textSecondary" variant="h6">
            No orders yet
          </Typography>
              <Typography color="textSecondary" variant="body2" sx={{ mt: 1 }}>
                Browse our products and place your first order!
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => handleTabChange(1)}
                          sx={{ 
                  mt: 3, 
                  borderRadius: 8, 
                  px: 4, 
                  py: 1.2,
                  background: 'linear-gradient(45deg, #3f51b5 30%, #7986cb 90%)',
                  boxShadow: '0 6px 15px rgba(63, 81, 181, 0.3)',
                  '&:hover': {
                    boxShadow: '0 8px 20px rgba(63, 81, 181, 0.4)',
                  }
                }}
              >
                Shop Now
              </Button>
                        </Box>
          </GlassPanel>
        ) : (
          <StyledTableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.slice(0, 5).map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>{order.id.substring(0, 8)}...</TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>${parseFloat(order.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <StatusChip 
                        label={order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        status={order.status}
                      />
                    </TableCell>
                    <TableCell>
                        <Button 
                          variant="outlined" 
                          size="small"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsOrderDetailsModalOpen(true);
                          }}
                        sx={{ 
                          borderRadius: 8,
                          transition: 'all 0.3s',
                          '&:hover': {
                            transform: 'translateY(-3px)',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                          }
                        }}
                      >
                        Details
                        </Button>
                    </TableCell>
                  </TableRow>
                  ))}
              </TableBody>
            </Table>
            {orders.length > 5 && (
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                <Button 
                  variant="text" 
                  color="primary"
                  onClick={() => handleTabChange(3)}
                  endIcon={<ArrowForward />}
                  sx={{
                    fontWeight: 'bold',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:after': {
                      content: '""',
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '0%',
                      height: '2px',
                      backgroundColor: 'primary.main',
                      transition: 'width 0.3s ease',
                    },
                    '&:hover:after': {
                      width: '100%',
                    }
                  }}
                >
                  View All Orders
                </Button>
              </Box>
            )}
          </StyledTableContainer>
        )}
      </Box>

      <Box sx={{ mt: 6, mb: 3 }}>
        <SectionHeading variant="h5" gutterBottom>
          Quick Shortcuts
        </SectionHeading>
        <Grid container spacing={3}>
          <Grid item xs={6} sm={3}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                textAlign: 'center',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 15px rgba(0,0,0,0.1)',
                  background: alpha(theme.palette.primary.main, 0.05)
                }
              }}
              onClick={() => handleTabChange(1)}
            >
              <ShoppingBag sx={{ fontSize: 40, color: '#5c6bc0', mb: 1 }} />
              <Typography variant="body1" fontWeight="medium">Shop Products</Typography>
        </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                textAlign: 'center',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 15px rgba(0,0,0,0.1)',
                  background: alpha(theme.palette.primary.main, 0.05)
                }
              }}
              onClick={() => handleTabChange(2)}
            >
              <ShoppingCart sx={{ fontSize: 40, color: '#26a69a', mb: 1 }} />
              <Typography variant="body1" fontWeight="medium">View Cart</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                textAlign: 'center',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 15px rgba(0,0,0,0.1)',
                  background: alpha(theme.palette.primary.main, 0.05)
                }
              }}
              onClick={() => handleTabChange(3)}
            >
              <OrderIcon sx={{ fontSize: 40, color: '#7e57c2', mb: 1 }} />
              <Typography variant="body1" fontWeight="medium">Track Orders</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                textAlign: 'center',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 8px 15px rgba(0,0,0,0.1)',
                  background: alpha(theme.palette.primary.main, 0.05)
                }
              }}
              onClick={() => handleTabChange(4)}
            >
              <Person sx={{ fontSize: 40, color: '#ec407a', mb: 1 }} />
              <Typography variant="body1" fontWeight="medium">My Profile</Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </>
  );

  const renderProductsContent = () => {
    return (
      <>
        <Typography variant="h5" gutterBottom>
          Shop Products
        </Typography>
        
        {/* Search bar for products */}
        <Paper
          component="form"
          sx={{
            p: '2px 4px',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            mb: 3,
            borderRadius: 2,
          }}
          elevation={2}
          onSubmit={(e) => {
            e.preventDefault(); // Prevent form submission
            // Run the search when form is submitted
            if (products && products.length > 0) {
              const filtered = products.filter(product => {
                if (!productSearchTerm) return true;
                if (!product || !product.name) return false;
                return product.name.toLowerCase().includes(productSearchTerm.toLowerCase());
              });
              setFilteredProductsList(filtered);
            }
          }}
        >
          <InputBase
            sx={{ ml: 1, flex: 1 }}
            placeholder="Search products by name..."
            value={productSearchTerm}
            onChange={(e) => {
              // Update the search term immediately
              const searchValue = e.target.value;
              setProductSearchTerm(searchValue);
              
              // Filter products directly here for immediate update
              if (products && products.length > 0) {
                const filtered = products.filter(product => {
                  if (!searchValue) return true;
                  if (!product || !product.name) return false;
                  return product.name.toLowerCase().includes(searchValue.toLowerCase());
                });
                setFilteredProductsList(filtered);
                console.log("Filtering products:", filtered.length, "results for", searchValue);
              }
            }}
            inputProps={{ 'aria-label': 'search products' }}
            autoFocus={activeTab === 1} // Auto focus when user switches to Products tab
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                refreshProducts(); // Refresh products on Enter key
              }
            }}
          />
          {productSearchTerm && (
            <>
              <Chip 
                size="small"
                label={`${filteredProductsList.length} results`}
                color="primary"
                variant="outlined"
                sx={{ mx: 1, cursor: 'pointer' }}
                onClick={() => {
                  // Refresh products when clicking on results chip
                  refreshProducts();
                  
                  // Scroll to the products section
                  const productsSection = document.getElementById('products-section');
                  if (productsSection) {
                    productsSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                clickable
              />
              <IconButton 
                size="small" 
                aria-label="clear" 
                onClick={() => {
                  setProductSearchTerm('');
                  // Refresh products when clearing search
                  refreshProducts();
                }}
                type="button"
              >
                <Delete fontSize="small" />
              </IconButton>
            </>
          )}
          <IconButton 
            type="button" 
            sx={{ p: '10px' }} 
            aria-label="search"
            onClick={() => {
              // Refresh products when clicking search button
              refreshProducts();
              
              // Scroll to results
              const productsSection = document.getElementById('products-section');
              if (productsSection) {
                productsSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <Search />
          </IconButton>
        </Paper>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredProductsList.length === 0 ? (
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography color="textSecondary" align="center">
              {products.length === 0 
                ? "No products available at the moment." 
                : "No products match your search."}
            </Typography>
            {productSearchTerm && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button 
                  variant="outlined" 
                  color="primary"
                  onClick={() => setProductSearchTerm('')}
                  startIcon={<Delete />}
                >
                  Clear Search
                </Button>
              </Box>
            )}
          </Paper>
        ) : (
          <Grid container spacing={3} id="products-section">
            {filteredProductsList.map((product) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                <ProductCard 
                  product={product} 
                  onAddToCart={handleAddToCart} 
                />
              </Grid>
            ))}
          </Grid>
        )}
      </>
    );
  };

  const renderCartContent = () => (
    <>
      <Typography variant="h5" gutterBottom>
        Shopping Cart
      </Typography>
      {cart.length === 0 ? (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography color="textSecondary" align="center">
            Your cart is empty. Browse products to add items to your cart.
          </Typography>
        </Paper>
      ) : (
        <Paper elevation={3} sx={{ p: 3 }}>
          {cart.map((item) => (
            <Box key={item.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={2} sm={1}>
                  <Box
                    component="img"
                    src={item.imageUrl}
                    alt={item.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = process.env.PUBLIC_URL + '/images/product1.jpg';
                    }}
                    sx={{
                      width: 60,
                      height: 60,
                      objectFit: 'cover',
                      borderRadius: 1,
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/product/${item.id}`)}
                  />
                </Grid>
                <Grid item xs={6} sm={7}>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { color: 'primary.main', textDecoration: 'underline' }
                    }}
                    onClick={() => navigate(`/product/${item.id}`)}
                  >
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Seller: {item.seller?.shopName || 'Unknown Shop'}
                  </Typography>
                </Grid>
                <Grid item xs={2} sm={2}>
                  <Typography variant="subtitle1">
                    ${item.price} x {item.quantity}
                  </Typography>
                </Grid>
                <Grid item xs={2} sm={2}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    ${(item.price * item.quantity).toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          ))}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Total: ${cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
            </Typography>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => navigate('/cart')}
            >
              View Full Cart
            </Button>
          </Box>
        </Paper>
      )}
    </>
  );

  const renderOrdersContent = () => (
    <>
      <Typography variant="h5" gutterBottom>
        My Orders
      </Typography>
      
      {ordersLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
      <Paper elevation={3} sx={{ p: 3 }}>
          <Typography color="textSecondary" align="center">
            You haven't placed any orders yet.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={() => handleTabChange(1)}
            >
              Browse Products
            </Button>
          </Box>
        </Paper>
      ) : (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>Order ID</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>Items</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>Total</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>{order.id.substring(0, 8)}...</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>{formatDate(order.createdAt)}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>${parseFloat(order.total).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>
                      <Box 
                        sx={{ 
                          display: 'inline-block',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.875rem',
                          backgroundColor: 
                            order.status === 'completed' ? '#e8f5e9' :
                            order.status === 'shipped' ? '#e3f2fd' :
                            order.status === 'processing' ? '#fff8e1' :
                            order.status === 'canceled' ? '#ffebee' : '#f5f5f5',
                          color: 
                            order.status === 'completed' ? '#2e7d32' :
                            order.status === 'shipped' ? '#1565c0' :
                            order.status === 'processing' ? '#f57f17' :
                            order.status === 'canceled' ? '#c62828' : '#616161'
                        }}
                      >
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Box>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid #e0e0e0' }}>
              <Button 
                variant="outlined" 
                        size="small"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsOrderDetailsModalOpen(true);
                        }}
                        sx={{ borderRadius: 8 }}
                      >
                        View Details
              </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </Box>
        </Paper>
      )}
    </>
  );

  const renderProfileContent = () => (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Manage Profile
      </Typography>
      <Paper elevation={3} sx={{ p: 3, mt: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Your Name"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Phone Number"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              value={profileData.email}
              disabled
              InputProps={{
                endAdornment: (
                  <Button
                    variant="outlined"
                    onClick={() => setIsEmailDialogOpen(true)}
                    startIcon={<EditIcon />}
                  >
                    Change
                  </Button>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Password"
              type="password"
              value="********"
              disabled
              InputProps={{
                endAdornment: (
                  <Button
                    variant="outlined"
                    onClick={() => setIsPasswordDialogOpen(true)}
                    startIcon={<EditIcon />}
                  >
                    Change
                  </Button>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Complete Address"
              multiline
              rows={3}
              value={profileData.address}
              onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Postal Code"
              value={profileData.postalCode}
              onChange={(e) => setProfileData({ ...profileData, postalCode: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleProfileUpdate}
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Email Change Dialog */}
      <Dialog
        open={isEmailDialogOpen}
        onClose={() => setIsEmailDialogOpen(false)}
        aria-modal={true}
        disablePortal={false}
        keepMounted
        container={document.body}
      >
        <DialogTitle>Change Email Address</DialogTitle>
        <DialogContent>
            <TextField
              fullWidth
            label="New Email Address"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
              margin="normal"
          />
          <TextField
            fullWidth
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEmailChange} variant="contained" color="primary">
            Update Email
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog
        open={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
        aria-modal={true}
        disablePortal={false}
        keepMounted
        container={document.body}
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
                <TextField
                  fullWidth
                  label="Current Password"
                  type="password"
            value={passwordChange.currentPassword}
            onChange={(e) => setPasswordChange({ ...passwordChange, currentPassword: e.target.value })}
                  margin="normal"
          />
                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
            value={passwordChange.newPassword}
            onChange={(e) => setPasswordChange({ ...passwordChange, newPassword: e.target.value })}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type="password"
            value={passwordChange.confirmPassword}
            onChange={(e) => setPasswordChange({ ...passwordChange, confirmPassword: e.target.value })}
                  margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
          <Button onClick={handlePasswordChange} variant="contained" color="primary">
            Update Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return renderDashboardContent();
      case 1:
        return renderProductsContent();
      case 2:
        return renderCartContent();
      case 3:
        return renderOrdersContent();
      case 4:
        return renderProfileContent();
      default:
        return renderDashboardContent();
    }
  };
//responsive sidebar
const [toogle, setToogle] = useState(true)

  return (
    <Box sx={{ display: 'flex' }}>


<button className='absolute z-20 mt-3  left-3 flex items-start box-border justify-center px-3 py-1  rounded-lg bg-custom-blue text-white ' onClick={() => setToogle(!toogle)}>
                           
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
      <CssBaseline />
      <StyledDrawer

className={` ${toogle ? 'block' : 'hidden'}`}

        sx={{
          width: drawerWidth,
          flexShrink: 0,
        }}
        variant="permanent"
        anchor="left"
      >
        <Box

        className="mt-20"
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            mb: 2,
            position: 'relative',
          }}
        >

<button className=' absolute top-0 mt-1 z-50 left-3 flex items-start box-border justify-center px-3 py-1  rounded-lg bg-custom-blue text-white ' onClick={() => setToogle(!toogle)}>
                  X
                </button>
          <AnimatedAvatar>
            {customerData?.name ? customerData.name.charAt(0).toUpperCase() : 'C'}
          </AnimatedAvatar>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white' }}>
            {customerData?.name || 'Customer'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
            {customerData?.email || 'customer@example.com'}
          </Typography>
        </Box>
        
        <List component="nav" sx={{ px: 2 }}>
          <ListItemButton
            selected={activeTab === 0}
            onClick={() => handleTabChange(0)}
            sx={{
              mb: 1,
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }
            }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <Dashboard />
            </ListItemIcon>
            <ListItemText primary="Dashboard" primaryTypographyProps={{ fontWeight: activeTab === 0 ? 'bold' : 'normal' }} />
          </ListItemButton>
          
          <ListItemButton
            selected={activeTab === 1}
            onClick={() => handleTabChange(1)}
            sx={{
              mb: 1,
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }
            }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <ShoppingBag />
            </ListItemIcon>
            <ListItemText primary="Products" primaryTypographyProps={{ fontWeight: activeTab === 1 ? 'bold' : 'normal' }} />
          </ListItemButton>
          
          <ListItemButton
            selected={activeTab === 2}
            onClick={() => handleTabChange(2)}
            sx={{
              mb: 1,
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }
            }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <ShoppingCart />
            </ListItemIcon>
            <ListItemText primary="Shopping Cart" primaryTypographyProps={{ fontWeight: activeTab === 2 ? 'bold' : 'normal' }} />
            {cart.length > 0 && (
              <Badge 
                badgeContent={cart.reduce((total, item) => total + item.quantity, 0)} 
                color="error"
                sx={{ 
                  '& .MuiBadge-badge': { 
                    fontWeight: 'bold',
                    animation: 'pulse 1.5s infinite',
                    '@keyframes pulse': {
                      '0%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.2)' },
                      '100%': { transform: 'scale(1)' },
                    }
                  } 
                }}
              />
            )}
          </ListItemButton>
          
          <ListItemButton
            selected={activeTab === 3}
            onClick={() => handleTabChange(3)}
            sx={{
              mb: 1,
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }
            }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <ReceiptLong />
            </ListItemIcon>
            <ListItemText primary="My Orders" primaryTypographyProps={{ fontWeight: activeTab === 3 ? 'bold' : 'normal' }} />
            {orders.length > 0 && (
              <Chip
                size="small"
                label={orders.length}
                sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.2)', 
                  color: 'white',
                  fontWeight: 'bold' 
                }}
              />
            )}
          </ListItemButton>
          
          <ListItemButton
            selected={activeTab === 4}
            onClick={() => handleTabChange(4)}
            sx={{
              mb: 1,
              borderRadius: 2,
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                backgroundColor: 'rgba(255, 255, 255, 0.16)',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
              }
            }}
          >
            <ListItemIcon sx={{ color: 'white' }}>
              <Person />
            </ListItemIcon>
            <ListItemText primary="Manage Profile" primaryTypographyProps={{ fontWeight: activeTab === 4 ? 'bold' : 'normal' }} />
          </ListItemButton>
        </List>
        
        <Box sx={{ mt: 'auto', p: 2, textAlign: 'center' }}>
          <Button 
            variant="outlined" 
            color="inherit" 
            onClick={() => {
              auth.signOut();
              navigate('/');
            }}
            sx={{ 
              borderColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 8,
              px: 3,
              py: 1,
              fontWeight: 'medium',
              textTransform: 'none',
              letterSpacing: 1,
              transition: 'all 0.3s',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                transform: 'translateY(-2px)',
              }
            }}
          >
            Sign Out
          </Button>
      </Box>
      </StyledDrawer>
      
      <Main open={true} ref={mainRef} sx={{ 
        background: 'linear-gradient(to bottom, #f5f7ff, #ffffff)',
        overflowY: 'auto',
        height: '100vh'
      }}
      onClick={() => {
        // Close sidebar when clicking on main content
        if (toogle) {
          setToogle(false);
        }
      }}
      >
        <Box 
          sx={{ 
            flexGrow: 1, 
            mt: 3, 
            px: { xs: 2, sm: 3, md: 4 },
            maxWidth: 1400,
            mx: 'auto',
            pb: 8
          }}
        >
          {renderTabContent()}
      </Box>

        <ScrollToTopButton 
          className={showScrollTop ? 'visible' : ''}
          onClick={scrollToTop}
          size="large"
        >
          <ArrowUpward />
        </ScrollToTopButton>
      </Main>

      {/* Order Details Modal */}
      <OrderDetailsModal
        open={isOrderDetailsModalOpen}
        order={selectedOrder}
        onClose={() => setIsOrderDetailsModalOpen(false)}
      />

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        TransitionComponent={Zoom}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            width: '100%',
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
            '& .MuiAlert-icon': {
              fontSize: 28
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CustomerDashboard; 
