import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Box,
  FormControlLabel,
  Checkbox 
} from '@mui/material';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';


//login id and password
const ADMIN_EMAIL = 'mdziq962#@gmail.com';
const ADMIN_PASSWORD = '@zahidiq1MdX';

const AdminLogin = ({ setIsAdmin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const navigate = useNavigate();

  // Check if admin is already logged in via localStorage
  useEffect(() => {
    const rememberedAdmin = localStorage.getItem('rememberedAdmin') === 'true';
    const adminId = localStorage.getItem('adminId');
    
    if (rememberedAdmin && adminId) {
      console.log('Admin already logged in from localStorage');
      setIsAdmin(true);
      navigate('/admin/dashboard');
    }
  }, [navigate, setIsAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get admin password from localStorage or use the default
    const storedPassword = localStorage.getItem('adminPassword');
    const currentAdminPassword = storedPassword || ADMIN_PASSWORD;
    
    // Check if the provided credentials match the admin credentials
    if (email === ADMIN_EMAIL && password === currentAdminPassword) {
      try {
        // Use mock authentication instead of Firebase
        // Save admin data in localStorage
        localStorage.setItem('rememberedAdmin', rememberMe ? 'true' : 'false');
        localStorage.setItem('adminId', 'admin-' + Date.now());
        localStorage.setItem('adminEmail', ADMIN_EMAIL);
        localStorage.setItem('adminLoginTime', new Date().toISOString());
        
        // If we need to maintain Firebase auth for other features, 
        // we can silently try to auth but not depend on its success
        try {
          if (rememberMe) {
            await setPersistence(auth, browserLocalPersistence);
          }
          await signInWithEmailAndPassword(auth, email, password);
        } catch (firebaseError) {
          // Ignore Firebase auth errors, we're using our own auth
          console.log('Firebase auth not available, using mock auth');
        }
        
        setIsAdmin(true);
        navigate('/admin/dashboard');
      } catch (error) {
        setError('Something went wrong. Please try again.');
        console.error('Error during login process:', error);
      }
    } else {
      // If credentials don't match, show error
      setError('Invalid admin credentials. Access denied.');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ width: '100%', px: { xs: 0, sm: 3, md: 4 } }}>
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          <Typography variant="h4" align="center" gutterBottom>
            Admin Login
          </Typography>
          {error && (
            <Typography color="error" align="center" gutterBottom>
              {error}
            </Typography>
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
              sx={{ mt: 3,
                backgroundImage: 'linear-gradient(to bottom, #FF4D33, #FF5E46, #FF6E59)',
                '&:hover': {
                  backgroundImage: 'linear-gradient(to bottom, #FF5E46, #FF6E59, #FF7E69)',
                  boxShadow: '0 4px 8px rgba(255, 77, 51, 0.3)'
                }

               }}
            >
              Login
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminLogin; 
