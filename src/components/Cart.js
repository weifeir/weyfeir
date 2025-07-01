import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Grid,
  Paper,
  Divider,
  IconButton,
  TextField,
  Snackbar,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    address: '',
    phone: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    const fetchCart = async () => {
      try {
        setLoading(true);
        if (!auth.currentUser) {
          navigate('/customer/login');
          return;
        }

        const customerDoc = await getDoc(doc(db, 'customers', auth.currentUser.uid));
        if (customerDoc.exists()) {
          const customerData = customerDoc.data();
          if (customerData.cart) {
            setCart(customerData.cart);
          }
        }
      } catch (error) {
        console.error('Error fetching cart:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load cart data',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [navigate]);

  const updateCartInFirestore = async (updatedCart) => {
    try {
      const customerRef = doc(db, 'customers', auth.currentUser.uid);
      await updateDoc(customerRef, {
        cart: updatedCart
      });
      setCart(updatedCart);
    } catch (error) {
      console.error('Error updating cart:', error);
      setSnackbar({
        open: true,
        message: 'Failed to update cart',
        severity: 'error'
      });
    }
  };

  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    const updatedCart = cart.map(item => 
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    
    await updateCartInFirestore(updatedCart);
  };

  const handleRemoveItem = async (productId) => {
    const updatedCart = cart.filter(item => item.id !== productId);
    await updateCartInFirestore(updatedCart);
    
    setSnackbar({
      open: true,
      message: 'Item removed from cart',
      severity: 'success'
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const calculateSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal();
  };

  const handleShippingSubmit = async () => {
    if (!shippingInfo.address.trim() || !shippingInfo.phone.trim()) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return;
    }

    try {
      setProcessing(true);
      
      if (!auth.currentUser) {
        navigate('/customer/login');
        return;
      }

      // Get customer information
      const customerDoc = await getDoc(doc(db, 'customers', auth.currentUser.uid));
      if (!customerDoc.exists()) {
        throw new Error('Customer data not found');
      }
      
      const customerData = customerDoc.data();
      
      // Create a new order with shipping information
      const order = {
        customerId: auth.currentUser.uid,
        customerName: customerData.name || 'Customer',
        customerEmail: auth.currentUser.email,
        customerPhone: shippingInfo.phone,
        items: cart,
        subtotal: calculateSubtotal(),
        total: calculateTotal(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        shippingAddress: shippingInfo.address,
        orderDate: shippingInfo.date,
        paymentMethod: 'Not specified'
      };
      
      // Add order to Firestore
      const ordersRef = collection(db, 'orders');
      await addDoc(ordersRef, order);
      
      // Clear the cart
      const customerRef = doc(db, 'customers', auth.currentUser.uid);
      await updateDoc(customerRef, {
        cart: []
      });
      
      setCart([]);
      setIsShippingModalOpen(false);
      
      setSnackbar({
        open: true,
        message: 'Order placed successfully!',
        severity: 'success'
      });
      
      navigate('/customer/dashboard');
    } catch (error) {
      console.error('Error processing checkout:', error);
      setSnackbar({
        open: true,
        message: 'Failed to process checkout. Please try again.',
        severity: 'error'
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Button 
        startIcon={<BackIcon />} 
        onClick={() => navigate('/customer/dashboard')} 
        sx={{ mb: 2 }}
      >
        Back to Dashboard
      </Button>
      
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <CartIcon sx={{ mr: 1 }} />
        Shopping Cart ({cart.reduce((total, item) => total + item.quantity, 0)} items)
      </Typography>
      
      {cart.length === 0 ? (
        <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            Your cart is empty
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            Looks like you haven't added any products to your cart yet.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate('/customer/dashboard')}
            sx={{ mt: 2 }}
          >
            Browse Products
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3 }}>
              {cart.map((item) => (
                <Box key={item.id} sx={{ mb: 3, pb: 3, borderBottom: '1px solid #eee' }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={2}>
                      <Box
                        component="img"
                        src={item.imageUrl}
                        alt={item.name}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = process.env.PUBLIC_URL + '/images/product1.jpg';
                        }}
                        sx={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: 100,
                          objectFit: 'contain',
                          borderRadius: 1,
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate(`/product/${item.id}`)}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
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
                      {item.seller && (
                        <Typography variant="body2" color="text.secondary">
                          Seller: {item.seller.shopName || 'Unknown Shop'}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton 
                          size="small" 
                          onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        <TextField
                          size="small"
                          value={item.quantity}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value) && value > 0) {
                              handleQuantityChange(item.id, value);
                            }
                          }}
                          inputProps={{ 
                            min: 1, 
                            style: { textAlign: 'center' } 
                          }}
                          sx={{ width: 60, mx: 1 }}
                        />
                        <IconButton 
                          size="small" 
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={2}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ${item.price} each
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={1}>
                      <IconButton 
                        color="error" 
                        onClick={() => handleRemoveItem(item.id)}
                        aria-label="remove item"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Order Summary
                </Typography>
                <Box sx={{ my: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body1">Subtotal</Typography>
                    <Typography variant="body1">${calculateSubtotal().toFixed(2)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Total</Typography>
                    <Typography variant="h6" color="primary">${calculateTotal().toFixed(2)}</Typography>
                  </Box>
                </Box>
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth 
                  size="large"
                  sx={{ mt: 2 }}
                  onClick={() => setIsShippingModalOpen(true)}
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Proceed to Checkout'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
      
      {/* Shipping Information Modal */}
      <Dialog
        open={isShippingModalOpen}
        onClose={() => setIsShippingModalOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-modal={true}
        disablePortal={false}
        keepMounted
        container={document.body}
      >
        <DialogTitle>
          <Typography variant="h6">Shipping Information</Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Box component="form" sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Shipping Address"
              value={shippingInfo.address}
              onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
              required
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone Number"
              value={shippingInfo.phone}
              onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Order Date"
              type="date"
              value={shippingInfo.date}
              onChange={(e) => setShippingInfo({ ...shippingInfo, date: e.target.value })}
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsShippingModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleShippingSubmit}
            disabled={processing}
          >
            {processing ? 'Processing...' : 'Place Order'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Cart; 