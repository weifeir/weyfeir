import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Box,
  Alert,
  Divider,
  FormControlLabel,
  Checkbox,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import Footer from './Footer';

const SellerLogin = ({ setIsSeller }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      // Check if we have a remembered seller
      const rememberedSeller = localStorage.getItem('rememberedSeller') === 'true';
      const sellerId = localStorage.getItem('sellerId');
      
      if (rememberedSeller && sellerId) {
        try {
          const sellerDoc = await getDoc(doc(db, 'sellers', sellerId));
          if (sellerDoc.exists()) {
            const userData = sellerDoc.data();
            if (userData.status === 'active' || userData.status === 'frozen') {
              setIsSeller(true);
              navigate('/seller/dashboard');
            }
          }
        } catch (error) {
          console.error('Error checking remembered seller:', error);
        }
      }
    };
    
    checkAuth();
  }, [navigate, setIsSeller]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Set the persistence based on rememberMe
      const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistenceType);
      
      // First try regular Firebase Authentication
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check if user is an approved seller
        const userDoc = await getDoc(doc(db, 'sellers', userCredential.user.uid));
        if (userDoc.exists()) {
          handleSellerAuthenticated(userDoc, userCredential.user.uid);
        } else {
          setError('Not authorized as seller');
          await auth.signOut();
        }
      } catch (firebaseAuthError) {
        console.log('Firebase auth failed, checking database password...');
        
        // If Firebase Authentication fails, try checking against database password
        // This is for passwords set by admin that weren't synced with Firebase Auth
        try {
          // Find seller by email
          const sellersRef = collection(db, 'sellers');
          const q = query(sellersRef, where('email', '==', email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const sellerDoc = querySnapshot.docs[0];
            const sellerData = sellerDoc.data();
            
            // Check if the password in the database matches
            if (sellerData.password === password || sellerData.plainPassword === password) {
              // Password matches the one in the database
              handleSellerAuthenticated(sellerDoc, sellerDoc.id);
            } else {
              setError('Invalid email or password');
            }
          } else {
            setError('Invalid email or password');
          }
        } catch (dbError) {
          console.error('Database check error:', dbError);
          setError('Invalid email or password');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to handle authenticated seller
  const handleSellerAuthenticated = async (userDoc, userId) => {
    const userData = userDoc.data();
    if (userData.role === 'seller') {
      if (userData.status === 'active' || userData.status === 'frozen' || userData.status === 'pending') {
        try {
          // Always store seller data for persistence
          localStorage.setItem('rememberedSeller', 'true');
          
          // Store seller status in local storage
          localStorage.setItem('sellerStatus', userData.status);
          
          // Set seller in local storage
          localStorage.setItem('sellerId', userId);
          localStorage.setItem('sellerEmail', userData.email);
          localStorage.setItem('sellerName', userData.name || userData.displayName || '');
          localStorage.setItem('sellerShopName', userData.shopName || '');
          
          // Try to update Firebase Auth if using database password
          if (!auth.currentUser) {
            try {
              const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
              console.log('Firebase Auth updated successfully');
            } catch (authError) {
              console.log('Could not update Firebase Auth, will proceed with database auth');
              // Still proceed even if Firebase Auth fails
            }
          }
          
          // Ensure all seller data is loaded
          const freshSellerDoc = await getDoc(doc(db, 'sellers', userId));
          if (freshSellerDoc.exists()) {
            // Store complete seller data in localStorage for immediate access
            localStorage.setItem('sellerData', JSON.stringify(freshSellerDoc.data()));
          }
          
          // Store the timestamp of when the seller logged in
          localStorage.setItem('sellerLoginTime', new Date().toISOString());
          
          setIsSeller(true);
          navigate('/seller/dashboard');
        } catch (error) {
          console.error('Error in handleSellerAuthenticated:', error);
          setError('Error loading seller data. Please try again.');
          auth.signOut();
        }
      } else {
        setError('Your registration was rejected');
        auth.signOut();
      }
    } else {
      setError('Not authorized as seller');
      auth.signOut();
    }
  };

  return (
    <>
      <Container maxWidth="sm" sx={{ width: '100%', px: { xs: 0, sm: 3, md: 4 } }}>
        <Box sx={{ mt: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <IconButton 
              onClick={() => navigate('/')} 
              aria-label="back to home"
              sx={{ color: 'primary.main' }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Box>
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            <Typography variant="h4" align="center" gutterBottom>
              Seller Login
            </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <FormControlLabel
              control={
                <Checkbox 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  color="primary"
                />
              }
              label="Remember me"
              sx={{ mt: 1 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 2 ,
                backgroundImage: 'linear-gradient(to bottom, #FF4D33, #FF5E46, #FF6E59)',
                '&:hover': {
                  backgroundImage: 'linear-gradient(to bottom, #FF5E46, #FF6E59, #FF7E69)',
                  boxShadow: '0 4px 8px rgba(255, 77, 51, 0.3)'
                }

              }}
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <Box sx={{ mt: 3, mb: 2 }}>
            <Divider>
              <Typography variant="body2" color="textSecondary">
                Want to become a seller?
              </Typography>
            </Divider>
          </Box>

          <Button
            fullWidth
            variant="outlined"
            onClick={() => navigate('/seller/register')}
            sx={{ mt: 1 }}
          >
            Register as Seller
          </Button>
        </Paper>
        </Box>
      </Container>
      <Footer />
    </>
  );
};

export default SellerLogin; 
