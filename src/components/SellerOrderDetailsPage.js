import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Grid, 
  Paper, 
  TableContainer, 
  Table, 
  TableHead, 
  TableRow, 
  TableCell, 
  TableBody, 
  Button, 
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Breadcrumbs,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  ShoppingCartCheckout as ShoppingCartCheckoutIcon,
  Check as CheckIcon,
  Lock as LockIcon,
  CheckCircleOutline as CheckCircleOutlineIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth, refreshFirebaseAuthSession } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const SellerOrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Function to refresh authentication state
  const refreshAuthState = async () => {
    try {
      // Use the helper function from firebase.js
      const refreshResult = await refreshFirebaseAuthSession();
      console.log("Auth refresh result:", refreshResult);
      return refreshResult;
    } catch (error) {
      console.error("Error refreshing auth state:", error);
      return false;
    }
  };

  useEffect(() => {
    // Refresh auth state when component loads
    refreshAuthState();
    
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const orderRef = doc(db, "orders", orderId);
        const orderDoc = await getDoc(orderRef);

        if (!orderDoc.exists()) {
          setError("Order not found");
          return;
        }

        setOrder({ id: orderDoc.id, ...orderDoc.data() });
      } catch (err) {
        console.error("Error fetching order details:", err);
        setError("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp instanceof Date 
        ? timestamp 
        : new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Invalid date';
    }
  };

  const openPasswordDialog = () => {
    setPassword('');
    setPasswordError('');
    
    // Check if the user is logged in first
    if (!auth.currentUser) {
      // Try to refresh the session
      refreshAuthState().then(result => {
        if (result) {
          // Session refreshed successfully, open dialog
    setPasswordDialogOpen(true);
        } else {
          // Redirect to login
          navigate('/seller/login', { 
            state: { returnUrl: `/seller/order/${orderId}` } 
          });
        }
      });
    } else {
      // User is logged in, open dialog normally
      setPasswordDialogOpen(true);
    }
  };

  const closePasswordDialog = () => {
    setPasswordDialogOpen(false);
    setPassword('');
    setPasswordError('');
  };

  const handlePasswordConfirm = async () => {
    try {
      setLoading(true);
      
      // Try to refresh the session first if needed
      await refreshAuthState();
      
      // Get current user - should be refreshed if needed
      const user = auth.currentUser;
      if (!user) {
        setPasswordError("You must be logged in to pick an order");
        return;
      }
      
      // Get seller ID from localStorage
      const sellerId = localStorage.getItem('sellerId');
      if (!sellerId) {
        throw new Error("Seller ID not found");
      }
      
      // Try Firebase Authentication first
      try {
        const email = user.email;
        const credential = EmailAuthProvider.credential(email, password);
        
        // Attempt to reauthenticate with Firebase
        await reauthenticateWithCredential(user, credential);
        
        // If successful, proceed with order pickup
        closePasswordDialog();
        await processOrderPickup();
      } catch (authError) {
        console.error("Authentication error:", authError);
        
        // On Firebase Auth error, try fallback to database password verification
        try {
          // Get seller data from Firestore
          const sellerRef = doc(db, "sellers", sellerId);
          const sellerDoc = await getDoc(sellerRef);
          
          if (!sellerDoc.exists()) {
            throw new Error("Seller data not found");
          }
          
          const sellerData = sellerDoc.data();
          
          // Check password against database stored password
          if (password === sellerData.password || password === sellerData.plainPassword) {
            // Password matches database record, proceed with order pickup
            console.log("Password verified using database record");
            closePasswordDialog();
            await processOrderPickup();
          } else {
            // Password doesn't match database record
            setPasswordError("Incorrect password. Please try again.");
          }
        } catch (dbError) {
          console.error("Database verification error:", dbError);
          
          // If network errors are detected, give user the benefit of doubt
          if (authError.code === 'auth/network-request-failed') {
            setPasswordError("Network error. Please check your connection and try again.");
          } else if (authError.code === 'auth/too-many-requests') {
            setPasswordError("Too many attempts. Please try again later.");
          } else if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password') {
            setPasswordError("Incorrect password. Please try again.");
          } else {
            // For other authentication errors, show generic error
            setPasswordError("Authentication failed. Please try again.");
          }
        }
      }
    } catch (error) {
      console.error("Error in password confirmation:", error);
      setPasswordError(error.message || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePickOrder = () => {
    openPasswordDialog();
  };

  const processOrderPickup = async () => {
    try {
      setLoading(true);
      
      // Get seller ID from localStorage
      const sellerId = localStorage.getItem('sellerId');
      
      if (!sellerId) {
        throw new Error("Seller ID not found in localStorage");
      }

      // Get the order details
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error("Order not found");
      }

      const orderData = orderDoc.data();

      // Ensure order is in a status that can be picked
      if (orderData.status !== "assigned" && orderData.status !== "pending") {
        throw new Error("This order cannot be picked in its current status");
      }

      // Calculate total product price and profit from order items
      let totalProductPrice = 0;
      let totalAdditionalProfit = 0;

      if (orderData.items && Array.isArray(orderData.items)) {
        orderData.items.forEach((item) => {
          const itemPrice = Number(item.price || 0);
          const itemQuantity = Number(item.quantity || 1);

          totalProductPrice += itemPrice * itemQuantity;
          totalAdditionalProfit += itemPrice * 0.23 * itemQuantity;
        });
      }

      // Get seller's current data
      const sellerRef = doc(db, "sellers", sellerId);
      const sellerDoc = await getDoc(sellerRef);

      if (!sellerDoc.exists()) {
        throw new Error("Seller data not found");
      }

      const sellerData = sellerDoc.data();
      const currentWalletBalance = Number(sellerData.walletBalance) || 0;
      const currentPendingAmount = Number(sellerData.pendingAmount) || 0;

      // Check if seller has enough balance
      if (currentWalletBalance < totalProductPrice) {
        alert("Insufficient wallet balance to pick this order");
        return;
      }

      // Update the order status to "picked"
      await updateDoc(orderRef, {
        status: "picked",
        pickedAt: serverTimestamp(),
        statusHistory: arrayUnion({
          status: "picked",
          timestamp: new Date().toISOString(),
          updatedBy: "seller",
        }),
      });

      // Update seller's wallet balance and pending amount
      await updateDoc(sellerRef, {
        walletBalance: currentWalletBalance - totalProductPrice,
        pendingAmount: currentPendingAmount + totalProductPrice + totalAdditionalProfit,
        lastUpdated: serverTimestamp(),
      });

      // Add transaction record
      await addDoc(collection(db, "transactions"), {
        orderId: orderId,
        sellerId: sellerId,
        amount: -totalProductPrice,
        type: "order_picked",
        affectsRevenue: true,
        timestamp: serverTimestamp(),
        note: `Funds reserved for order #${orderData.orderNumber || orderId.substring(0, 8)}`,
      });

      // Update local state
      setOrder(prevOrder => ({
        ...prevOrder,
        status: "picked",
        pickedAt: new Date(),
      }));

      // Replace alert with custom dialog
      setSuccessMessage("Order picked successfully. Processing will begin shortly!");
      setSuccessDialogOpen(true);
      
    } catch (error) {
      console.error("Error picking order:", error);
      alert("Failed to pick order: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (newStatus) => {
    try {
      setLoading(true);

      // Get seller ID from localStorage
      const sellerId = localStorage.getItem('sellerId');
      const sellerEmail = localStorage.getItem('sellerEmail');
      const sellerName = localStorage.getItem('sellerName') || sellerEmail;
      
      if (!sellerId) {
        throw new Error("Seller ID not found in localStorage");
      }

      // Get the order details
      const orderRef = doc(db, "orders", orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        throw new Error("Order not found");
      }

      const orderData = orderDoc.data();

      // If the status is being changed to 'completed', add a special note for admin verification
      const isCompletionRequest = newStatus === "completed";

      const updatedStatus = isCompletionRequest
        ? "completion_requested"
        : newStatus;

      // Update the order with the new status
      await updateDoc(orderRef, {
        status: updatedStatus,
        statusHistory: arrayUnion({
          status: updatedStatus,
          timestamp: new Date().toISOString(),
          updatedBy: "seller",
          note: isCompletionRequest
            ? "Seller requested order completion - awaiting admin verification"
            : undefined,
        }),
        completionRequestedAt: isCompletionRequest
          ? serverTimestamp()
          : orderData.completionRequestedAt,
      });

      // If this is a completion request, also notify admin
      if (isCompletionRequest) {
        // Create a notification for the admin
        await addDoc(collection(db, "notifications"), {
          type: "completion_request",
          orderId: orderId,
          sellerId: sellerId,
          createdAt: serverTimestamp(),
          read: false,
          message: `Seller ${sellerName || sellerEmail} has requested completion approval for order #${orderData.orderNumber || orderId.substring(0, 8)}.`,
          priority: "high",
        });
      }

      // Update local state
      setOrder(prevOrder => ({
        ...prevOrder,
        status: updatedStatus,
        completionRequestedAt: isCompletionRequest ? new Date() : prevOrder.completionRequestedAt,
      }));

      alert(isCompletionRequest
        ? "Order completion requested. Admin will review and approve to transfer funds to your wallet."
        : `Order status updated to ${newStatus}`);

    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Failed to update order status. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Success Dialog Component
  const SuccessDialog = ({ open, message, onClose }) => (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="success-dialog-title"
      aria-describedby="success-dialog-description"
    >
      <DialogContent sx={{ minWidth: 300, textAlign: 'center', py: 3 }}>
        <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 60, mb: 2 }} />
        <Typography id="success-dialog-description" variant="h6" gutterBottom>
          Success!
        </Typography>
        <Typography color="text.secondary">
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button onClick={onClose} variant="contained" color="primary">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
        <Button 
          variant="contained" 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/seller/dashboard')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Order not found</Typography>
        <Button 
          variant="contained" 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/seller/dashboard')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  // Mobile order items display component
  const MobileOrderItems = () => (
    <Stack spacing={2} sx={{ mt: 2 }}>
      {order.items?.map((item, index) => (
        <Card key={`${order.id}-${index}-${item.id || item.name}`} variant="outlined">
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              {item.imageUrl && (
                <Box 
                  component="img"
                  src={item.imageUrl}
                  alt={item.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = process.env.PUBLIC_URL + '/images/product1.jpg';
                  }}
                  sx={{
                    width: 40,
                    height: 40,
                    objectFit: 'cover',
                    borderRadius: 1
                  }}
                />
              )}
              <Typography variant="subtitle2">{item.name}</Typography>
            </Box>
            <Grid container spacing={1}>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">Price</Typography>
                <Typography variant="body2">${Number(item.price || 0).toFixed(2)}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">Quantity</Typography>
                <Typography variant="body2">{item.quantity}</Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">Profit</Typography>
                <Typography variant="body2" sx={{ color: 'success.main' }}>
                  ${(Number(item.price || 0) * 0.23).toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2">${(Number(item.price || 0) * (item.quantity || 1)).toFixed(2)}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ))}
      
      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Shipping:</Typography>
            <Typography variant="body2">${Number(order.shipping || 0).toFixed(2)}</Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" color="primary">Total:</Typography>
            <Typography variant="subtitle2" color="primary">
              ${Number(order.total || order.totalAmount || 0).toFixed(2)}
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2" color="success.main">Total Profit:</Typography>
            <Typography variant="subtitle2" color="success.main">
              ${Number(order.items?.reduce((total, item) => total + (Number(item.price || 0) * 0.23 * (item.quantity || 1)), 0) || 0).toFixed(2)}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );

  return (
    <>
      <Container 
        maxWidth="lg" 
        sx={{ 
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 1, sm: 3 }
        }}
      >
        {/* Breadcrumbs - Hide on mobile */}


        {/* Mobile back button
        {isMobile && (
          <Box sx={{ mb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/seller/dashboard?tab=orders')}
              size="small"
            >
              Back to Orders
            </Button>
          </Box>
        )} */}

        {/* Header section */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between', 
            alignItems: isMobile ? 'flex-start' : 'center', 
            mb: 3 
          }}
        >
          <Typography 
            variant={isMobile ? "h5" : "h4"} 
            sx={{ mb: isMobile ? 1 : 0 }}
          >
            Order #{order.orderNumber || order.id.substring(0, 8)}
          </Typography>
          
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              width: isMobile ? '100%' : 'auto',
              justifyContent: isMobile ? 'space-between' : 'flex-end'
            }}
          >
            {/* {(order.status === "assigned" || order.status === "pending") && (
              <Button
                variant="contained"
                color="primary"
                onClick={handlePickOrder}
                startIcon={<ShoppingCartCheckoutIcon />}
                disabled={loading}
                size={isMobile ? "medium" : "large"}
                sx={{ 
                  flexGrow: isMobile ? 1 : 0,
                  fontWeight: 'bold',
                  py: isMobile ? 1 : 1.5,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
                  }
                }}
              >
                {isMobile ? "PICK ORDER" : "PICK THIS ORDER"}
              </Button> */}
            {/* )} */}
            <Chip
              label={order.status}
              color={
                order.status === "completed" ? "success" :
                order.status === "processing" ? "info" :
                order.status === "assigned" ? "primary" :
                order.status === "pending" ? "warning" :
                order.status === "cancelled" ? "error" : "default"
              }
              size={isMobile ? "small" : "medium"}
            />
          </Box>
        </Box>

        {/* Main content */}
        <Grid container spacing={isMobile ? 2 : 3}>
          {/* Customer Information */}
          {/* <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: { xs: 2, md: 3 }, height: '100%' }}>
              <Typography variant="h6" gutterBottom color="primary">
                Customer Information
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Name:</Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>{order.customerName || 'N/A'}</Typography>
                <Typography variant="body2" color="text.secondary">Email:</Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>{order.customerEmail || 'N/A'}</Typography>
                <Typography variant="body2" color="text.secondary">Phone:</Typography>
                <Typography variant="body1">{order.customerPhone || 'N/A'}</Typography>
              </Box>
            </Paper>
          </Grid> */}

          {/* Order Information */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: { xs: 2, md: 3 }, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary">
                  Order Information
                </Typography>
                <IconButton
                  color="primary"
                  onClick={() => {
                    // First navigate to the dashboard
                    navigate('/seller/dashboard');
                    // Then set the active tab to orders in localStorage
                    localStorage.setItem('sellerActiveTab', 'orders');
                  }}
                  size="small"
                  sx={{
                    border: '1px solid',
                    borderColor: 'primary.light',
                    '&:hover': {
                      backgroundColor: 'primary.light',
                      color: 'white'
                    }
                  }}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Box>
              <Box sx={{ mb: 2 }}>
                {/* <Typography variant="body2" color="textSecondary">Order Date:</Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>{formatDate(order.createdAt)}</Typography> */}
                {/* <Typography variant="body2" color="textSecondary">Payment Method:</Typography>
                <Typography variant="body1" sx={{ mb: 1 }}>{order.paymentMethod || 'N/A'}</Typography> */}
                <Typography variant="body2" color="textSecondary">Assignment:</Typography>
                <Typography variant="body1">
                  {order.assignedByAdmin ? 'Assigned by Admin' : 'Direct Order'}
                </Typography>
                
                {(order.status === "assigned" || order.status === "pending") && (
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      fullWidth
                      onClick={handlePickOrder}
                      startIcon={<ShoppingCartCheckoutIcon />}
                      disabled={loading}
                      size="large"
                      sx={{
                        py: 1.5,
                        fontWeight: 'bold',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
                        }
                      }}
                    >
                      PICK THIS ORDER
                    </Button>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Order Items - Desktop */}
          <Grid item xs={12}>
            <Paper elevation={1} sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" gutterBottom color="primary">
                Order Items
              </Typography>
              
              {isMobile ? (
                <MobileOrderItems />
              ) : (
                <TableContainer sx={{ maxHeight: { xs: 300, sm: 500 } }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Profit</TableCell>
                        <TableCell align="center">Quantity</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {order.items?.map((item, index) => (
                        <TableRow key={`${order.id}-${index}-${item.id || item.name}`}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              {item.imageUrl && (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = process.env.PUBLIC_URL + '/images/product1.jpg';
                                  }}
                                  style={{
                                    width: 40,
                                    height: 40,
                                    objectFit: 'cover',
                                    borderRadius: 4
                                  }}
                                />
                              )}
                              <Typography variant="body2">{item.name}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            ${Number(item.price || 0).toFixed(2)}
                          </TableCell>
                          <TableCell align="right">
                            ${Number(item.price*23/100 || 0).toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            {item.quantity}
                          </TableCell>
                          <TableCell align="right">
                            ${(Number(item.price || 0) * (item.quantity || 1)).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell colSpan={3} align="right">
                          <Typography variant="body2">Subtotal:</Typography>
                        </TableCell>
                        <TableCell align="right">
                          
                          ${Number(order.subtotal || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} align="right">
                          <Typography variant="body2">Shipping:</Typography>
                        </TableCell>
                        <TableCell align="right">
                          ${Number(order.shipping || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={3} align="right">
                          <Typography variant="subtitle2" color="primary">Total:</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="subtitle2" color="primary">
                            ${Number(order.total || order.totalAmount || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Action buttons */}
        <Box 
          sx={{ 
            mt: { xs: 2, sm: 3, md: 4 }, 
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 2,
            justifyContent: isMobile ? 'stretch' : 'center'
          }}
        >
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/seller/dashboard?tab=orders')}
            startIcon={<ArrowBackIcon />}
            fullWidth={isMobile}
          >
            Back to Orders
          </Button>
          
         
          
          {order.status === "processing" && (
            <Button
              variant="contained"
              color="success"
              onClick={() => handleUpdateOrderStatus("completed")}
              disabled={loading}
              fullWidth={isMobile}
              size={isMobile ? "medium" : "medium"}
            >
              Request Completion
            </Button>
          )}
        </Box>

        {/* Floating Action Button for Pick Order - shows for pending and assigned orders */}
        {(order.status === "assigned" || order.status === "pending") && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 20,
              right: 20,
              zIndex: 1000,
            }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={handlePickOrder}
              disabled={loading}
              sx={{
                borderRadius: '50%',
                width: 64,
                height: 64,
                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                '&:hover': {
                  transform: 'scale(1.1)',
                  boxShadow: '0 6px 14px rgba(0,0,0,0.4)',
                }
              }}
            >
              <CheckIcon fontSize="large" />
            </Button>
          </Box>
        )}

        {/* Password Confirmation Dialog */}
        <Dialog 
          open={passwordDialogOpen} 
          onClose={() => !loading && closePasswordDialog()}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon color="primary" />
            Password Confirmation
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Please enter your password to confirm picking this order.
            </DialogContentText>
            {passwordError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {passwordError}
                {passwordError === "You must be logged in to pick an order" ? (
                  <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => {
                        // Refresh auth and try again
                        refreshAuthState().then(result => {
                          if (result) {
                            setPasswordError('');
                          } else {
                            setPasswordError('');
                          }
                        });
                      }}
                    >
                      TRY AGAIN
                    </Button>
                    <Button 
                      size="small" 
                      variant="contained"
                      color="primary"
                      onClick={() => {
                        closePasswordDialog();
                        navigate('/seller/login', { 
                          state: { returnUrl: `/seller/order/${orderId}` } 
                        });
                      }}
                    >
                      LOGIN
                    </Button>
                  </Box>
                ) : (
                <Button 
                  size="small" 
                  sx={{ ml: 1 }} 
                  onClick={() => {
                    setPasswordError('');
                    setPassword('');
                  }}
                >
                    TRY AGAIN
                </Button>
                )}
              </Alert>
            )}
            <TextField
              autoFocus
              margin="dense"
              label="Password"
              type="password"
              fullWidth
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              error={!!passwordError}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && password) {
                  handlePasswordConfirm();
                }
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button 
              onClick={closePasswordDialog} 
              disabled={loading}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordConfirm} 
              disabled={!password || loading}
              variant="contained"
              color="primary"
              startIcon={loading ? <CircularProgress size={20} /> : <CheckIcon />}
            >
              {loading ? "Verifying..." : "Confirm"}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
      <SuccessDialog
        open={successDialogOpen}
        message={successMessage}
        onClose={() => setSuccessDialogOpen(false)}
      />
    </>
  );
};

export default SellerOrderDetailsPage; 
