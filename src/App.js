import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import CustomerLogin from './components/CustomerLogin';
import CustomerRegister from './components/CustomerRegister';
import CustomerDashboard from './components/CustomerDashboard';
import ProductDetail from './components/ProductDetail';
import Cart from './components/Cart';
import HomePage from './components/HomePage';
import SellerLogin from './components/SellerLogin';
import SellerRegister from './components/SellerRegister';
import SellerDashboard from './components/SellerDashboard';
import SellerOrderDetailsPage from './components/SellerOrderDetailsPage';
import Setup from './components/Setup';
import { Container, CssBaseline, ThemeProvider, createTheme, Toolbar } from '@mui/material';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { NotificationSoundProvider } from './utils';

const theme = createTheme();

function App() {
  // Force check auth state directly from Firebase for initial state
  const initialAuthState = !!auth.currentUser;
  console.log("Initial auth state in App.js (constructor):", initialAuthState);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthState);
  const [searchTerm, setSearchTerm] = useState('');

  // Search term handler that can be passed to children
  const handleSearch = useCallback((term) => {
    console.log("Setting search term in App:", term);
    setSearchTerm(term);
  }, []);

  // Global authentication listener
  useEffect(() => {
    console.log("Setting up global auth state listener in App.js");
    
    // Force check auth state again after component mount
    const currentUser = auth.currentUser;
    console.log("Auth state in App.js (useEffect):", currentUser ? `User logged in: ${currentUser.email}` : "User logged out");
    setIsAuthenticated(!!currentUser);
    
    // Check for stored seller credentials
    const rememberedSeller = localStorage.getItem('rememberedSeller') === 'true';
    const sellerId = localStorage.getItem('sellerId');
    const sellerData = localStorage.getItem('sellerData');
    
    // Check for stored admin credentials
    const rememberedAdmin = localStorage.getItem('rememberedAdmin') === 'true';
    const adminId = localStorage.getItem('adminId');
    
    // Immediately set roles based on localStorage to prevent flicker
    if (rememberedAdmin && adminId) {
      console.log("Found remembered admin in localStorage");
      setIsAdmin(true);
      setIsAuthenticated(true);
    }
    if (rememberedSeller && sellerId && sellerData) {
      console.log("Found remembered seller in localStorage");
      setIsSeller(true);
      setIsAuthenticated(true);
    }
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Global auth state changed:", user ? `User logged in: ${user.email}` : "User logged out");
      setIsAuthenticated(!!user);
      
      // If user logs out, reset all role states unless we have remembered credentials
      if (!user) {
        // Only reset admin state if there's no remembered admin
        if (!(localStorage.getItem('rememberedAdmin') === 'true' && localStorage.getItem('adminId'))) {
          setIsAdmin(false);
        }
        
        // Only reset customer state
        setIsCustomer(false);
        
        // Only reset seller state if there's no remembered seller
        if (!(localStorage.getItem('rememberedSeller') === 'true' && localStorage.getItem('sellerId'))) {
          setIsSeller(false);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Setup />
      <NotificationSoundProvider>
        <Router>
          <AppContent 
            isAdmin={isAdmin} 
            setIsAdmin={setIsAdmin}
            isCustomer={isCustomer}
            setIsCustomer={setIsCustomer}
            isSeller={isSeller}
            setIsSeller={setIsSeller}
            isAuthenticated={isAuthenticated}
            searchTerm={searchTerm}
            onSearch={handleSearch}
          />
        </Router>
      </NotificationSoundProvider>
    </ThemeProvider>
  );
}

// Extract the AppContent to a separate component to use hooks that require Router context
function AppContent({ 
  isAdmin, setIsAdmin, 
  isCustomer, setIsCustomer, 
  isSeller, setIsSeller, 
  isAuthenticated, 
  searchTerm, onSearch 
}) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isSellerDashboard = location.pathname === '/seller/dashboard';
  
  // Extract search term from URL query parameters (once on mount)
  useEffect(() => {
    // Only run on component mount to initialize the search term from URL
    const querySearchTerm = searchParams.get('search');
    console.log("Initial URL search term:", querySearchTerm);
    
    if (querySearchTerm !== null) {
      // Always update app state from URL on mount
      onSearch(querySearchTerm);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this only runs once on mount

  // Watch for changes to the URL search parameter
  useEffect(() => {
    // Get the current search parameter from the URL
    const currentSearchParam = searchParams.get('search');
    console.log("URL search parameter changed:", currentSearchParam, "Current App searchTerm:", searchTerm);
    
    // If URL has no search parameter but we have a searchTerm in app state
    if (!currentSearchParam && searchTerm && location.pathname === '/') {
      console.log("Clearing search term because URL has no search parameter");
      onSearch('');
    }
    // If URL has a search parameter
    else if (currentSearchParam !== null && currentSearchParam !== searchTerm) {
      console.log("Updating search term from URL change:", currentSearchParam);
      onSearch(currentSearchParam);
    }
  }, [searchParams, searchTerm, onSearch, location.pathname]);

  // Protected route components
  const ProtectedAdminRoute = ({ children }) => {
    if (!isAdmin) {
      return <Navigate to="/admin/login" />;
    }
    return children;
  };

  const ProtectedCustomerRoute = ({ children }) => {
    if (!isCustomer) {
      return <Navigate to="/customer/login" />;
    }
    return children;
  };

  const ProtectedSellerRoute = ({ children }) => {
    // Check not only the isSeller state but also localStorage for seller credentials
    const rememberedSeller = localStorage.getItem('rememberedSeller') === 'true';
    const sellerId = localStorage.getItem('sellerId');
    const sellerData = localStorage.getItem('sellerData');
    
    if (!isSeller && !(rememberedSeller && sellerId && sellerData)) {
      return <Navigate to="/seller/login" />;
    }
    return children;
  };

  return (
    <>
      {!isSellerDashboard && (
        <>
          <Navbar 
            isAdmin={isAdmin} 
            setIsAdmin={setIsAdmin}
            isCustomer={isCustomer}
            setIsCustomer={setIsCustomer}
            isSeller={isSeller}
            setIsSeller={setIsSeller}
            isAuthenticated={isAuthenticated}
            onSearch={onSearch}
          />
          <Toolbar />
        </>
      )}
      <Container sx={{ 
        padding: isSellerDashboard ? 0 : undefined,
        maxWidth: isSellerDashboard ? '100%' : undefined
      }}>
        <Routes>
          <Route path="/" element={<HomePage isAuthenticated={isAuthenticated} searchTerm={searchTerm} />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={
            <AdminLogin setIsAdmin={setIsAdmin} />
          } />
          <Route path="/admin/dashboard" element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          } />

          {/* Customer Routes */}
          <Route path="/customer/login" element={
            <CustomerLogin setIsCustomer={setIsCustomer} />
          } />
          <Route path="/customer/register" element={
            <CustomerRegister />
          } />
          <Route path="/customer/dashboard" element={
            <ProtectedCustomerRoute>
              <CustomerDashboard />
            </ProtectedCustomerRoute>
          } />
          <Route path="/product/:productId" element={<ProductDetail isAuthenticated={isAuthenticated} />} />
          <Route path="/cart" element={
            <ProtectedCustomerRoute>
              <Cart />
            </ProtectedCustomerRoute>
          } />

          {/* Seller Routes */}
          <Route path="/seller/login" element={
            <SellerLogin setIsSeller={setIsSeller} />
          } />
          <Route path="/seller/register" element={
            <SellerRegister />
          } />
          <Route path="/seller/dashboard" element={
            <ProtectedSellerRoute>
              <SellerDashboard setIsSeller={setIsSeller} />
            </ProtectedSellerRoute>
          } />
          <Route path="/seller/order/:orderId" element={
            <ProtectedSellerRoute>
              <SellerOrderDetailsPage setIsSeller={setIsSeller} />
            </ProtectedSellerRoute>
          } />
        </Routes>
      </Container>
    </>
  );
}

export default App;
