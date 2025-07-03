import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { 
  Container, 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  CardMedia, 
  Box,
  CircularProgress,
  Button,
  CardActions,
  Fade,
  Paper,
  InputBase,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Info as InfoIcon,
  AddShoppingCart as AddCartIcon,
  LocalOffer as OfferIcon,
  Search as SearchIcon,
  HomeOutlined,
  ElectricalServices,
  Checkroom,
  Toys
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';

const DEFAULT_FALLBACK_IMAGE = 'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=300';

// Add a helper for localStorage management
const storageManager = {
  // Get data from localStorage safely
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Error getting ${key} from localStorage:`, error);
      return null;
    }
  },
  
  // Set data in localStorage with error handling
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn(`Error setting ${key} in localStorage:`, error);
      
      // If storage is full, try to clear some space
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        storageManager.cleanup();
        
        // Try one more time after cleanup
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryError) {
          console.error('Still cannot store data after cleanup:', retryError);
          return false;
        }
      }
      return false;
    }
  },
  
  // Clean up old or less important data
  cleanup: () => {
    try {
      // Find keys that can be safely removed
      const keysToRemove = [];
      
      // Identify keys that can be deleted (based on your app's needs)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        // Check if it's a cache key or has "cache" in the name
        if (key.includes('cache') || key.includes('temp') || key.includes('products')) {
          keysToRemove.push(key);
        }
      }
      
      // Remove the identified keys
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // Continue with other keys if one fails
        }
      });
      
      console.log(`Cleaned up ${keysToRemove.length} items from localStorage`);
    } catch (error) {
      console.error('Error cleaning up localStorage:', error);
    }
  }
};

const HomePage = ({ isAuthenticated, searchTerm }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [error, setError] = useState(null);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Memoize special offers to prevent unnecessary re-renders
  const specialOffers = useMemo(() => [
    {
      title: "Flash Sale! 🎉",
      description: "50% OFF on all Electronics - Limited Time Only!",
      color: "#ff4081"
    },
    {
      title: "Weekend Special! 🌟",
      description: "Buy 1 Get 1 Free on Fashion Items",
      color: "#7c4dff"
    },
    {
      title: "New User Offer! 🎁",
      description: "Get $20 OFF on your first purchase",
      color: "#00bcd4"
    },
    {
      title: "Clearance Sale! 💫",
      description: "Up to 70% OFF on Selected Items",
      color: "#ff5722"
    }
  ], []);

  // State for featured brands section
  const [brandScrollPosition, setBrandScrollPosition] = useState(0);

  // Rotate offers every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentOfferIndex((prevIndex) => 
        prevIndex === specialOffers.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000);

    return () => clearInterval(timer);
  }, []);

  // Get search term directly from URL as well as props
  useEffect(() => {
    // Prioritize the URL search term
    const urlSearchTerm = searchParams.get('search') || '';
    
    console.log("HomePage search term synchronization:", {
      urlSearchTerm, 
      propSearchTerm: searchTerm,
      currentLocalTerm: localSearchTerm
    });
    
    // Always update local search term to match the parent component's state
    if (searchTerm !== localSearchTerm) {
      setLocalSearchTerm(searchTerm || '');
    }
    // If URL has a search term that doesn't match the local state
    else if (urlSearchTerm && urlSearchTerm !== localSearchTerm) {
      setLocalSearchTerm(urlSearchTerm);
    }
  }, [searchParams, searchTerm, localSearchTerm]);

  // Sample product data for non-authenticated users
  const sampleProductsData = useMemo(() => {
    const categories = [
      // All categories (Electronics, Fashion, Toys) removed
    ];
    
    // Update the placeholder images arrays with more reliable URLs
    // Better placeholder images with category matching
    const placeholderImages = [
      // All placeholder images removed
    ];
    
    // Default fallback image for all categories
    const defaultFallbackImage = DEFAULT_FALLBACK_IMAGE;

    // Return empty categories
    return categories;
  }, []);

  const handleCategoryChange = (event, newValue) => {
    setActiveCategory(newValue);
  };

  useEffect(() => {
    const fetchAllProducts = async () => {
      if (!isAuthenticated) {
        // We'll now show sample products even for non-authenticated users
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // Create a products cache key based on timestamp
        const cacheKey = 'homepage_products';
        const cacheExpiry = 5 * 60 * 1000; // 5 minutes
        
        // Try to get cached data first using our storage manager
        const cachedData = storageManager.get(cacheKey);
        if (cachedData) {
          try {
            const { data, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp < cacheExpiry) {
              setProducts(data);
              setLoading(false);
              // Fetch fresh data in background
              fetchFreshData();
              return;
            }
          } catch (parseError) {
            console.warn('Error parsing cached data:', parseError);
            // If parsing fails, we'll continue to fetch fresh data
          }
        }

        // If no valid cache or cache error, fetch fresh data
        await fetchFreshData();

      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    const fetchFreshData = async () => {
      try {
        // Fetch all sellers with active status
        const sellersRef = collection(db, 'sellers');
        const sellersQuery = query(sellersRef, where('status', '==', 'active'));
        const sellersSnapshot = await getDocs(sellersQuery);
        
        // Process all sellers data at once
        const sellersData = sellersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Collect all product IDs first
        const productIds = sellersData.reduce((acc, seller) => {
          if (seller.products && Array.isArray(seller.products)) {
            acc.push(...seller.products);
          }
          return acc;
        }, []);

        // Create a map of seller data for quick lookup
        const sellerMap = sellersData.reduce((acc, seller) => {
          acc[seller.id] = {
            shopName: seller.shopName,
            name: seller.name
          };
          return acc;
        }, {});

        // Batch fetch products in groups of 10
        const batchSize = 10;
        const productPromises = [];
        
        for (let i = 0; i < productIds.length; i += batchSize) {
          const batch = productIds.slice(i, i + batchSize);
          const batchPromises = batch.map(async (productId) => {
            const productDoc = await getDoc(doc(db, 'products', productId));
            if (productDoc.exists()) {
              const sellerId = sellersData.find(s => s.products?.includes(productId))?.id;
              return {
                id: productDoc.id,
                ...productDoc.data(),
                seller: sellerId ? {
                  id: sellerId,
                  ...sellerMap[sellerId]
                } : null
              };
            }
            return null;
          });
          productPromises.push(...batchPromises);
        }

        // Wait for all product fetches to complete
        const productsResults = await Promise.all(productPromises);
        const validProducts = productsResults.filter(p => p !== null);

        // Set all products in state for the current session
        setProducts(validProducts);

        // For localStorage, limit to a reasonable number of products to prevent quota errors
        // Only store the most recent products (up to 50)
        const maxProductsToCache = 50;
        const sortedProducts = [...validProducts]
          .sort((a, b) => {
            // Sort by createdAt timestamp if available, newest first
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
          })
          .slice(0, maxProductsToCache);

        // Only store essential data to reduce size
        const trimmedProducts = sortedProducts.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          category: product.category,
          seller: product.seller ? {
            id: product.seller.id,
            shopName: product.seller.shopName,
            name: product.seller.name
          } : null,
          createdAt: product.createdAt
        }));

        // Use our storage manager to safely store the data
        storageManager.set('homepage_products', JSON.stringify({
          data: trimmedProducts,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error fetching fresh data:', error);
        // Don't throw here, just log the error and return
        // This allows the app to continue working even if fetching fails
      }
    };

    fetchAllProducts();
  }, [isAuthenticated]);

  // Modified to show sample products for non-authenticated users
  const displayProductsWithKeys = useMemo(() => {
    if (!isAuthenticated) {
      // For non-authenticated users, filter the sample products
      let allProducts = sampleProductsData.flatMap(cat => cat.products);
      
      if (localSearchTerm) {
        const searchLower = localSearchTerm.toLowerCase().trim();
        allProducts = allProducts.filter(product => 
          product.name.toLowerCase().includes(searchLower) || 
          product.category.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower)
        );
      }
      
      return allProducts;
    }
    
    // For authenticated users, continue using real products
    const filtered = products
      .filter(product => {
        if (!localSearchTerm) return true;
        const searchLower = localSearchTerm.toLowerCase().trim();
        return (
          (product.name && product.name.toLowerCase().includes(searchLower)) ||
          (product.description && product.description.toLowerCase().includes(searchLower)) ||
          (product.category && product.category.toLowerCase().includes(searchLower)) ||
          (product.seller?.shopName && product.seller.shopName.toLowerCase().includes(searchLower))
        );
      })
      .filter(product => product && product.name && product.price)
      .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
    
    // Assign stable unique keys to each product
    return filtered.map((product, index) => ({
      ...product,
      uniqueKey: `product-${product.id || ''}-${index}`
    }));
  }, [products, localSearchTerm, isAuthenticated, sampleProductsData]);

  // Get the products for the current category (for non-authenticated users)
  const currentCategoryProducts = useMemo(() => {
    if (isAuthenticated) return displayProductsWithKeys;
    
    if (localSearchTerm) return displayProductsWithKeys;
    
    return sampleProductsData[activeCategory]?.products || [];
  }, [isAuthenticated, displayProductsWithKeys, sampleProductsData, activeCategory, localSearchTerm]);

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  const handleDetailsClick = (e, productId) => {
    e.stopPropagation(); // Prevent card click
    navigate(`/product/${productId}`);
  };

  const handleAddToCart = async (e, product) => {
    e.stopPropagation(); // Prevent card click
    
    if (!auth.currentUser) {
      alert('Please login to add products to cart');
      navigate('/customer/login');
      return;
    }

    try {
      // Get current customer data to ensure we have the latest cart
      const customerRef = doc(db, 'customers', auth.currentUser.uid);
      const customerDoc = await getDoc(customerRef);
      
      if (!customerDoc.exists()) {
        throw new Error('Customer data not found');
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
          imageUrl: product.imageUrl || DEFAULT_FALLBACK_IMAGE,
          quantity: 1,
          seller: product.seller || null
        };
        updatedCart = [...currentCart, cartItem];
      }
      
      // Update in Firestore
      await updateDoc(customerRef, {
        cart: updatedCart
      });
      
      alert('Product added to cart successfully!');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart. Please try again.');
    }
  };

  // Handle search input change in mobile search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearchTerm(value);
  };
  
  // Handle search submission
  const handleSearchSubmit = () => {
    if (localSearchTerm.trim()) {
      console.log("Direct navigation with search:", localSearchTerm.trim());
      // Use direct navigation instead of React Router to avoid state sync issues
      window.location.href = `/?search=${encodeURIComponent(localSearchTerm.trim())}`;
    } else {
      window.location.href = '/';
    }
  };
  
  // Handle search key press (Enter)
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchSubmit();
    }
  };
  
  // Handle clearing search
  const handleClearSearch = () => {
    setLocalSearchTerm('');
    window.location.href = '/';
  };

  // Add this near the top of the file, inside the component
  const categoryImages = useMemo(() => ({
    womenClothing: '/images/categories/women-clothing.jpg',
    menClothing: '/images/categories/men-clothing.jpg',
    computers: '/images/categories/computers-cameras.jpg',
    kidsToys: '/images/categories/kids-toys.jpg',
    sports: '/images/categories/sports-outdoor.jpg',
    automobile: '/images/categories/automobile-motorcycle.jpg',
    jewelry: '/images/categories/jewelry-watches.jpg'
  }), []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Container maxWidth="xl" sx={{ mt: 10, mb: 5, px: { xs: 0.5, sm: 2 } }}>
        {/* Banner Carousel - Desktop */}
        <Box sx={{ position: 'relative', width: { sm: '80%' }, mb: 4, borderRadius: 2, overflow: 'hidden', boxShadow: 3, display: { xs: 'none', sm: 'block' } }}>
          <Box sx={{ position: 'relative' }}>
            <Box
              component="img"
              src={process.env.PUBLIC_URL + "/images/one-day-special.jpg"}
              alt="Fashion banner"
              loading="eager"
              sx={{
                width: '100%',
                height: { xs: 200, sm: 300 },
                objectFit: 'cover',
                filter: 'brightness(0.8)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '80%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'center',
                p: { xs: 2, sm: 4 },
                background: 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%)',
              }}
            >
              {/* <Box
                sx={{
                  bgcolor: 'white',
                  color: '#FF0000',
                  p: 1,
                  borderRadius: 1,
                  display: 'inline-block',
                  mb: 1,
                  fontWeight: 'bold',
                  fontSize: { xs: 12, sm: 14 },
                }}
              >
                100% Authentic
              </Box> */}
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{ 
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                  mb: 0.5,
                }}
              >
                ONE DAY SPECIAL:
              </Typography>
              <Typography 
                variant="h3" 
                component="h2" 
                sx={{ 
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                  mb: 2,
                }}
              >
                UP TO 50% OFF
              </Typography>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box
                  sx={{
                    bgcolor: 'black',
                    color: 'white',
                    p: 1,
                    textAlign: 'center',
                    width: { xs: 130, sm: 160 },
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: { xs: 12, sm: 14 } }}>
                    25% off with
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: { xs: 12, sm: 14 } }}>
                    min. spend $150
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: 'black',
                    color: 'white',
                    p: 1,
                    textAlign: 'center',
                    width: { xs: 130, sm: 160 },
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: { xs: 12, sm: 14 } }}>
                    Buy 3,
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: { xs: 12, sm: 14 } }}>
                    get 15% off
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            {/* Carousel Navigation */}
            <Box sx={{ position: 'absolute', bottom: 10, left: 0, width: '100%', display: 'flex', justifyContent: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'white', opacity: 0.7 }} />
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'white', opacity: 0.7 }} />
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#FF4D33', opacity: 1 }} />
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'white', opacity: 0.7 }} />
            </Box>
            
           
          
          </Box>
          
        
        </Box>

  {/* Todays Deal Banner - Right Side */}
  <Box 
            sx={{ 
              position: 'absolute', 
              top: { xs: 'auto', md: 0 }, 
              bottom: { xs: 0, md: 'auto' },
              right: 0, 
              mr:10,
              width: { xs: '100%', sm: '180px' }, 
              height: { xs: '55%', sm: '57%' },
              maxWidth: { xs: '100%', sm: '180px' },
              bgcolor: '#FFF4EF',
              mt:'140px',
              overflow: 'hidden',
              display: { xs: 'none', md: 'block' },
              zIndex: 1
            }}
          >
            <Box sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" component="h3" fontWeight="bold" sx={{ mb: 1, color: '#333', textAlign: 'center' }}>
                Todays Deal <Box component="span" sx={{ bgcolor: 'red', color: 'white', fontSize: '0.7rem', p: 0.5, borderRadius: 1, ml: 0.5 }}>Hot</Box>
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto', height: 'calc(100% - 40px)' }}>
                {/* Deal Product 1 */}
                <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid #FF6347', cursor: 'pointer' }}>
                  <Box sx={{ mb: 1 }}>
                    <img 
                      src="https://m.media-amazon.com/images/I/71ctRE34RuL._AC_UF894,1000_QL80_.jpg" 
                      alt="Boston t-shirt" 
                      style={{ width: '100%', height: 'auto', objectFit: 'contain' }} 
                    />
                  </Box>
                  <Typography color="error" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                    $8.98
                  </Typography>
                  <Typography sx={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'text.secondary' }}>
                    $9.48
                  </Typography>
                </Box>
                
                {/* Deal Product 2 */}
                <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid #eaeaea', cursor: 'pointer' }}>
                  <Box sx={{ mb: 1 }}>
                    <img 
                      src="https://images.pexels.com/photos/5961984/pexels-photo-5961984.jpeg?auto=compress&cs=tinysrgb&w=80" 
                      alt="Blue jacket" 
                      style={{ width: '100%', height: 'auto', objectFit: 'contain' }} 
                    />
                  </Box>
                  <Typography color="error" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                    $27.14
                  </Typography>
                  <Typography sx={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'text.secondary' }}>
                    $27.64
                  </Typography>
                </Box>
                
                {/* Deal Product 3 */}
                <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid #eaeaea', cursor: 'pointer' }}>
                  <Box sx={{ mb: 1 }}>
                    <img 
                      src="https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg?auto=compress&cs=tinysrgb&w=80" 
                      alt="Power tool" 
                      style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                    />
                  </Box>
                  <Typography color="error" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                    $45.99
                  </Typography>
                  <Typography sx={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'text.secondary' }}>
                    $55.99
                  </Typography>
                </Box>

                {/* Deal Product 4 */}
                <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid #eaeaea', cursor: 'pointer' }}>
                  <Box sx={{ mb: 1 }}>
                    <img 
                      src="https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=80" 
                      alt="Luxury watch" 
                      style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                    />
                  </Box>
                  <Typography color="error" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                    $149.99
                  </Typography>
                  <Typography sx={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'text.secondary' }}>
                    $199.99
                  </Typography>
                </Box>

                {/* Deal Product 5 */}
                <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid #eaeaea', cursor: 'pointer' }}>
                  <Box sx={{ mb: 1 }}>
                    <img 
                      src="https://images.pexels.com/photos/1279107/pexels-photo-1279107.jpeg?auto=compress&cs=tinysrgb&w=80" 
                      alt="Headphones" 
                      style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                    />
                  </Box>
                  <Typography color="error" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                    $89.99
                  </Typography>
                  <Typography sx={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'text.secondary' }}>
                    $129.99
                  </Typography>
                </Box>

                {/* Deal Product 6 */}
                <Box sx={{ bgcolor: 'white', p: 1, borderRadius: 1, border: '1px solid #eaeaea', cursor: 'pointer' }}>
                  <Box sx={{ mb: 1 }}>
                    <img 
                      src="https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=80" 
                      alt="Camera" 
                      style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                    />
                  </Box>
                  <Typography color="error" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                    $599.99
                  </Typography>
                  <Typography sx={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'text.secondary' }}>
                    $799.99
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

        {/* Mobile Banner - ONE DAY SPECIAL */}
        <Box sx={{ 
          position: 'relative', 
          width: '100%', 
          mb: 4, 
          mt: -8,
          mx: 'auto',
          borderRadius: 2, 
          overflow: 'hidden', 
          boxShadow: 3, 
          display: { xs: 'block', sm: 'none' } 
        }}>
          <Box sx={{ position: 'relative' }}>
            <Box
              component="img"
              src={process.env.PUBLIC_URL + "/images/one-day-special.jpg"}
              alt="Fashion banner"
              loading="eager"
              sx={{
                width: '100%',
                height: { xs: 200, sm: 300 },
                objectFit: 'cover',
                filter: 'brightness(0.8)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%)',
              }}
            >
              {/* <Box
                sx={{
                  bgcolor: 'white',
                  color: '#FF0000',
                  p: 1,
                  borderRadius: 1,
                  display: 'inline-block',
                  mb: 1,
                  fontWeight: 'bold',
                  fontSize: 12,
                }}
              >
                100% Authentic
              </Box> */}
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{ 
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.5rem',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                  mb: 0.5,
                  textAlign: 'center'
                }}
              >
                ONE DAY SPECIAL:
              </Typography>
              <Typography 
                variant="h3" 
                component="h2" 
                sx={{ 
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '2rem',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                  mb: 2,
                  textAlign: 'center'
                }}
              >
                UP TO 50% OFF
              </Typography>
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  gap: 2,
                  flexWrap: 'wrap',
                  justifyContent: 'center'
                }}
              >
                <Box
                  sx={{
                    bgcolor: 'black',
                    color: 'white',
                    p: 1,
                    textAlign: 'center',
                    width: 130,
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    25% off with
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    min. spend $150
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: 'black',
                    color: 'white',
                    p: 1,
                    textAlign: 'center',
                    width: 130,
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    Buy 3,
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 12 }}>
                    get 15% off
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Product Categories Section - Below Banner */}
        <Box sx={{ 
          display: 'flex',
          position: 'relative',
          flexDirection: 'column',
          alignItems: 'center', 
          mb: 4, 
          mt: 4,
          py: 2, 
          width: { xs: '98%', sm: '80%' },
          px: 2,
          mx: '0%',
          backgroundColor: '#f9f9f9',
          borderRadius: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          {/* <Typography variant="h6" fontWeight="medium" color="text.secondary" align="center" sx={{ mb: 2 }}>
            Shop by Category
          </Typography> */}
          <Box sx={{ 
            display: 'flex', 
            flexWrap: { xs: 'nowrap', sm: 'wrap' },
            justifyContent: { xs: 'space-between', sm: 'space-between' },
            gap: { xs: 0, sm: 2, md: 3 },
            width: '100%',
            overflowX: 'hidden',
            pb: { xs: 2, sm: 0 },
            pl: { xs: 0.5, sm: 0 },
            pr: { xs: 0.5, sm: 0 }
          }}>
            {/* Women Clothing */}
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                cursor: 'pointer',
                width: { xs: '19%', sm: 'auto' },
                '&:hover': {
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s',
                }
              }}
              onClick={() => navigate('/category/women-clothing')}
            >
              <Box 
                sx={{ 
                  width: { xs: 45, sm: 70 }, 
                  height: { xs: 45, sm: 70 }, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  mb: 1,
                  overflow: 'hidden',
                  border: '1px solid #eee',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <img 
                  src={process.env.PUBLIC_URL + "/images/women-clothing.jpg"}
                  alt="Women Clothing" 
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <Typography variant="body2" align="center" sx={{ fontSize: { xs: '0.6rem', sm: '0.8rem' }, fontWeight: 'medium', mt: 0.5 }}>
                Women Clothing<br />& Fashion
              </Typography>
            </Box>

            {/* Men Clothing */}
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s',
                }
              }}
              onClick={() => navigate('/category/men-clothing')}
            >
              <Box 
                sx={{ 
                  width: { xs: 45, sm: 70 }, 
                  height: { xs: 45, sm: 70 }, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  mb: 1,
                  overflow: 'hidden',
                  border: '1px solid #eee',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <img 
                  src={process.env.PUBLIC_URL + "/images/men-clothing.jpg"}
                  alt="Men Clothing" 
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <Typography variant="body2" align="center" sx={{ fontSize: { xs: '0.6rem', sm: '0.8rem' }, fontWeight: 'medium', mt: 0.5 }}>
                Men Clothing<br />& Fashion
              </Typography>
            </Box>

            {/* Computers-Cameras */}
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s',
                }
              }}
              onClick={() => navigate('/category/electronics')}
            >
              <Box 
                sx={{ 
                  width: { xs: 45, sm: 70 }, 
                  height: { xs: 45, sm: 70 }, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  mb: 1,
                  overflow: 'hidden',
                  border: '1px solid #eee',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <img 
                  src={process.env.PUBLIC_URL + "/images/computers-cameras.jpg"}
                  alt="Computers & Cameras" 
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <Typography variant="body2" align="center" sx={{ fontSize: { xs: '0.6rem', sm: '0.8rem' }, fontWeight: 'medium', mt: 0.5 }}>
                Computers-<br />Cameras-<br />Accessories
              </Typography>
            </Box>

            {/* Kids & toy */}
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                cursor: 'pointer',
                width: { xs: '19%', sm: 'auto' },
                '&:hover': {
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s',
                }
              }}
              onClick={() => navigate('/category/kids-toys')}
            >
              <Box 
                sx={{ 
                  width: { xs: 45, sm: 70 }, 
                  height: { xs: 45, sm: 70 }, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  mb: 1,
                  overflow: 'hidden',
                  border: '1px solid #eee',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <img 
                  src={process.env.PUBLIC_URL + "/images/kids-toys.jpg"}
                  alt="Kids & toy" 
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <Typography variant="body2" align="center" sx={{ fontSize: { xs: '0.6rem', sm: '0.8rem' }, fontWeight: 'medium', mt: 0.5 }}>
                Kids & toy
              </Typography>
            </Box>

            {/* Sports & outdoor */}
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                cursor: 'pointer',
                width: { xs: '19%', sm: 'auto' },
                '&:hover': {
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s',
                }
              }}
              onClick={() => navigate('/category/sports')}
            >
              <Box 
                sx={{ 
                  width: { xs: 45, sm: 70 }, 
                  height: { xs: 45, sm: 70 }, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  mb: 1,
                  overflow: 'hidden',
                  border: '1px solid #eee',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <img 
                  src={process.env.PUBLIC_URL + "/images/sports-outdoor.jpg"}
                  alt="Sports & outdoor" 
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <Typography variant="body2" align="center" sx={{ fontSize: { xs: '0.6rem', sm: '0.8rem' }, fontWeight: 'medium', mt: 0.5 }}>
                Sports & outdoor
              </Typography>
            </Box>

            {/* Automobile & Motorcycle */}
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                cursor: 'pointer',
                width: { xs: '19%', sm: 'auto' },
                display: { xs: 'none', sm: 'flex' },
                '&:hover': {
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s',
                }
              }}
              onClick={() => navigate('/category/automobile')}
            >
              <Box 
                sx={{ 
                  width: { xs: 45, sm: 70 }, 
                  height: { xs: 45, sm: 70 }, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  mb: 1,
                  overflow: 'hidden',
                  border: '1px solid #eee',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <img 
                  src={process.env.PUBLIC_URL + "/images/automobile-motorcycle.jpg"}
                  alt="Automobile & Motorcycle" 
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <Typography variant="body2" align="center" sx={{ fontSize: { xs: '0.6rem', sm: '0.8rem' }, fontWeight: 'medium', mt: 0.5 }}>
                Automobile &<br />Motorcycle
              </Typography>
            </Box>

            {/* Jewelry & Watches */}
            <Box 
              sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                cursor: 'pointer',
                width: { xs: '19%', sm: 'auto' },
                display: { xs: 'none', sm: 'flex' },
                '&:hover': {
                  transform: 'translateY(-2px)',
                  transition: 'all 0.3s',
                }
              }}
              onClick={() => navigate('/category/jewelry')}
            >
              <Box 
                sx={{ 
                  width: { xs: 45, sm: 70 }, 
                  height: { xs: 45, sm: 70 }, 
                  borderRadius: '50%', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  mb: 1,
                  overflow: 'hidden',
                  border: '1px solid #eee',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <img 
                  src={process.env.PUBLIC_URL + "/images/jewelry-watches.jpg"}
                  alt="Jewelry & Watches" 
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <Typography variant="body2" align="center" sx={{ fontSize: { xs: '0.6rem', sm: '0.8rem' }, fontWeight: 'medium', mt: 0.5 }}>
                Jewelry & Watches
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Promotional Banners */}
        <Box sx={{ mb: 5, width: '97%' }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            width: '100%'
          }}>
            {/* Banner 1 - Valentine's Sale */}
            <Box 
              component="img"
              src="https://t4.ftcdn.net/jpg/04/41/14/65/360_F_441146553_haUBrTpsJJ22bEbsMlgkNosGuWGwbV0t.jpg"
              alt="Valentine's Big Sale"
              sx={{ 
                width: { xs: '100%', md: '33.33%' }, 
                height: { xs: 120, md: 150 },
                objectFit: 'cover',
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                '&:hover': { transform: 'scale(1.02)' }
              }}
            />
            
            {/* Banner 2 - Flash Sale */}
            <Box 
              component="img"
              src="https://mir-s3-cdn-cf.behance.net/project_modules/fs/3ce709113389695.60269c221352f.jpg"
              alt="Flash Sale"
              sx={{ 
                width: { xs: '100%', md: '33.33%' }, 
                height: { xs: 120, md: 150 },
                objectFit: 'cover',
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                '&:hover': { transform: 'scale(1.02)' }
              }}
            />
            
            {/* Banner 3 - 15% Off Everything */}
            <Box 
              component="img"
              src="https://img.freepik.com/premium-vector/ramadan-kareem-sale-banner-template_234845-758.jpg"
              alt="15% Off Everything"
              sx={{ 
                width: { xs: '100%', md: '33.33%' }, 
                height: { xs: 120, md: 150 },
                objectFit: 'cover',
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                '&:hover': { transform: 'scale(1.02)' }
              }}
            />
          </Box>
        </Box>

        <Typography backgroundColor="#FFECE8" variant="h6" component="h3" fontWeight="bold" sx={{ color: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
              Todays Deal 
              <Box 
              component="span" 
              sx={{ 
                bgcolor: 'red', 
                color: 'white', 
                fontSize: '0.7rem', 
                p: 0.5, 
                borderRadius: 1, 
                ml: 1 
              }}
            >
              Hot
            </Box>
            </Typography>
            


        {/* Mobile Todays Deal Section - Below Shop by Category */}
        <Box 
          sx={{ 
            backgroundColor: '#FF4D33',
            paddingBottom: 2,
            display: { xs: 'block', md: 'none' },
            width: '100%',
            mb: 4,
            px: 2
          }}
        >
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            mb: 2
          }}>
            
          </Box>
          
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 2,
            '& > *': {
              height: 'auto'
            }
          }}>
            {/* Deal Product 1 */}
            <Box sx={{ 
              bgcolor: 'white', 
              p: 2, 
              borderRadius: 1, 
              border: '2px solid #FF4D33',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              height: 'auto'
            }}>
              <Box sx={{ 
                mb: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 120,
                width: '100%'
              }}>
                <img 
                  src="https://m.media-amazon.com/images/I/71ctRE34RuL._AC_UF894,1000_QL80_.jpg" 
                  alt="Boston t-shirt" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              </Box>
              <Typography color="error" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                $8.98
              </Typography>
              <Typography sx={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'text.secondary' }}>
                $9.48
              </Typography>
            </Box>
            
            {/* Deal Product 2 */}
            <Box sx={{ 
              bgcolor: 'white', 
              p: 2, 
              borderRadius: 1, 
              border: '2px solid #FF4D33',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              height: 'auto'
            }}>
              <Box sx={{ 
                mb: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 120,
                width: '100%'
              }}>
                <img 
                  src="https://images.pexels.com/photos/5961984/pexels-photo-5961984.jpeg?auto=compress&cs=tinysrgb&w=300" 
                  alt="Blue jacket" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              </Box>
              <Typography color="error" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                $27.14
              </Typography>
              <Typography sx={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'text.secondary' }}>
                $27.64
              </Typography>
            </Box>
            
            {/* Deal Product 3 */}
            <Box sx={{ 
              bgcolor: 'white', 
              p: 2, 
              borderRadius: 1, 
              border: '2px solid #FF4D33',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              height: 'auto'
            }}>
              <Box sx={{ 
                mb: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 120,
                width: '100%'
              }}>
                <img 
                  src="https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg?auto=compress&cs=tinysrgb&w=300" 
                  alt="Power tool" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
              <Typography color="error" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                $27.00
              </Typography>
              <Typography sx={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'text.secondary' }}>
                $30.00
              </Typography>
            </Box>
            
            {/* Deal Product 4 */}
            <Box sx={{ 
              bgcolor: 'white', 
              p: 2, 
              borderRadius: 1, 
              border: '2px solid #FF4D33',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              height: 'auto'
            }}>
              <Box sx={{ 
                mb: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 120,
                width: '100%'
              }}>
                <img 
                  src="https://images.pexels.com/photos/190819/pexels-photo-190819.jpeg?auto=compress&cs=tinysrgb&w=300" 
                  alt="Luxury watch" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
              <Typography color="error" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                $23.00
              </Typography>
              <Typography sx={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'text.secondary' }}>
                $24.00
              </Typography>
            </Box>
            
            {/* Deal Product 5 */}
            <Box sx={{ 
              bgcolor: 'white', 
              p: 2, 
              borderRadius: 1, 
              border: '2px solid #FF4D33',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              height: 'auto'
            }}>
              <Box sx={{ 
                mb: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 120,
                width: '100%'
              }}>
                <img 
                  src="https://images.pexels.com/photos/1279107/pexels-photo-1279107.jpeg?auto=compress&cs=tinysrgb&w=300" 
                  alt="Headphones" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
              <Typography color="error" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                $89.99
              </Typography>
              <Typography sx={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'text.secondary' }}>
                $129.99
              </Typography>
            </Box>
            
            {/* Deal Product 6 */}
            <Box sx={{ 
              bgcolor: 'white', 
              p: 2, 
              borderRadius: 1, 
              border: '2px solid #FF4D33',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              height: 'auto'
            }}>
              <Box sx={{ 
                mb: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: 120,
                width: '100%'
              }}>
                <img 
                  src="https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=300" 
                  alt="Camera" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Box>
              <Typography color="error" fontWeight="bold" sx={{ fontSize: '1rem' }}>
                $599.99
              </Typography>
              <Typography sx={{ textDecoration: 'line-through', fontSize: '0.8rem', color: 'text.secondary' }}>
                $799.99
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Search Section - Mobile friendly additional search box */}
        <Box 
          sx={{ 
            mb: 4, 
            display: { xs: 'block', md: 'none' }, // Only show on mobile/small screens
            textAlign: 'center'
          }}
        >
          <Typography variant="h6" gutterBottom>
            Find Your Perfect Product
          </Typography>
          <Paper
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchSubmit();
            }}
            sx={{
              p: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              maxWidth: '600px',
              margin: '0 auto',
              backgroundColor: '#f5f5f5',
              '&:hover': {
                backgroundColor: '#fff',
                boxShadow: 2
              },
              borderRadius: '4px',
              border: '1px solid #e0e0e0',
              transition: 'all 0.3s ease',
            }}
          >
            <SearchIcon sx={{ p: '10px', color: 'primary.main' }} />
            <InputBase
              sx={{ 
                ml: 1, 
                flex: 1,
                '& input': {
                  padding: '10px 0',
                }
              }}
              placeholder="Search products by name..."
              value={localSearchTerm}
              onChange={handleSearchChange}
              onKeyPress={handleSearchKeyPress}
            />
            {localSearchTerm && (
              <IconButton 
                size="small"
                sx={{ p: '5px' }} 
                aria-label="clear search"
                onClick={handleClearSearch}
              >
                <Typography sx={{ fontSize: 18, fontWeight: 'bold' }}>×</Typography>
              </IconButton>
            )}
            <IconButton 
              size="small"
              sx={{ p: '8px' }} 
              aria-label="search"
              onClick={handleSearchSubmit}
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          </Paper>
        </Box>

        {/* New Products Section */}
       
                {/* Special Offers Section */}
        <Box sx={{ mb: 4 }}>
          <Fade in={true} timeout={500}>
            <Paper
              elevation={3}
              sx={{
                p: 2,
                background: `linear-gradient(45deg, ${specialOffers[currentOfferIndex].color} 30%, ${specialOffers[currentOfferIndex].color}dd 90%)`,
                color: 'white',
                borderRadius: 2,
                transition: 'background 0.5s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              <OfferIcon fontSize="large" />
              <Box>
                <Typography variant="h5" component="h2" fontWeight="bold">
                  {specialOffers[currentOfferIndex].title}
                </Typography>
                <Typography variant="subtitle1">
                  {specialOffers[currentOfferIndex].description}
                </Typography>
              </Box>
            </Paper>
          </Fade>
        </Box>

        {/* Today's Deal Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
            px: 1,
          }}>
            <Typography variant="h5" component="h2" fontWeight="bold">
              Today's Deal
            </Typography>
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                bgcolor: '#FF4D33',
                color: 'white',
                px: 1,
                py: 0.2,
                borderRadius: 1,
                fontSize: '0.8rem',
                fontWeight: 'bold',
              }}
            >
              Hot
            </Box>
          </Box>
          
          <Box sx={{
            display: 'flex',
            overflow: 'auto',
            gap: 2,
            pb: 1,
            '&::-webkit-scrollbar': {
              height: 6,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#f1f1f1',
              borderRadius: 2,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#888',
              borderRadius: 2,
            },
          }}>
            {/* Deal Product 1 */}
            <Card 
              sx={{ 
                minWidth: { xs: '160px', sm: '200px' }, 
                maxWidth: { xs: '160px', sm: '200px' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3,
                }
              }}
              onClick={() => isAuthenticated ? handleProductClick('dealproduct1') : navigate('/customer/login')}
            >
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  height="160"
                  image="https://m.media-amazon.com/images/I/71ctRE34RuL._AC_UF894,1000_QL80_.jpg"
                  alt="Premium headphones with case"
                />
              </Box>
              <CardContent sx={{ p: 1 }}>
                <Typography color="primary" fontWeight="bold" variant="body1">
                  $24.00
                </Typography>
                <Typography color="text.secondary" sx={{ textDecoration: 'line-through', fontSize: '0.85rem' }}>
                  $25.00
                </Typography>
              </CardContent>
            </Card>

            {/* Deal Product 2 */}
            <Card 
              sx={{ 
                minWidth: { xs: '160px', sm: '200px' }, 
                maxWidth: { xs: '160px', sm: '200px' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3,
                }
              }}
              onClick={() => isAuthenticated ? handleProductClick('dealproduct2') : navigate('/customer/login')}
            >
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  height="160"
                  image="https://images.pexels.com/photos/5961984/pexels-photo-5961984.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                  alt="Gold jewelry collection"
                />
              </Box>
              <CardContent sx={{ p: 1 }}>
                <Typography color="primary" fontWeight="bold" variant="body1">
                  $31.89
                </Typography>
                <Typography color="text.secondary" sx={{ textDecoration: 'line-through', fontSize: '0.85rem' }}>
                  $32.49
                </Typography>
              </CardContent>
            </Card>

            {/* Deal Product 3 */}
            <Card 
              sx={{ 
                minWidth: { xs: '160px', sm: '200px' }, 
                maxWidth: { xs: '160px', sm: '200px' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3,
                }
              }}
              onClick={() => isAuthenticated ? handleProductClick('dealproduct3') : navigate('/customer/login')}
            >
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  height="160"
                  image="https://images.pexels.com/photos/4041392/pexels-photo-4041392.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                  alt="Skincare products"
                />
              </Box>
              <CardContent sx={{ p: 1 }}>
                <Typography color="primary" fontWeight="bold" variant="body1">
                  $19.95
                </Typography>
                <Typography color="text.secondary" sx={{ textDecoration: 'line-through', fontSize: '0.85rem' }}>
                  $24.99
                </Typography>
              </CardContent>
            </Card>

            {/* Deal Product 4 */}
            <Card 
              sx={{ 
                minWidth: { xs: '160px', sm: '200px' }, 
                maxWidth: { xs: '160px', sm: '200px' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3,
                }
              }}
              onClick={() => isAuthenticated ? handleProductClick('dealproduct4') : navigate('/customer/login')}
            >
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  height="160"
                  image="https://images.pexels.com/photos/356056/pexels-photo-356056.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                  alt="Smart watch"
                />
              </Box>
              <CardContent sx={{ p: 1 }}>
                <Typography color="primary" fontWeight="bold" variant="body1">
                  $49.99
                </Typography>
                <Typography color="text.secondary" sx={{ textDecoration: 'line-through', fontSize: '0.85rem' }}>
                  $59.99
                </Typography>
              </CardContent>
            </Card>

            {/* Deal Product 5 */}
            <Card 
              sx={{ 
                minWidth: { xs: '160px', sm: '200px' }, 
                maxWidth: { xs: '160px', sm: '200px' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3,
                }
              }}
              onClick={() => isAuthenticated ? handleProductClick('dealproduct5') : navigate('/customer/login')}
            >
              <Box sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  height="160"
                  image="https://images.pexels.com/photos/341523/pexels-photo-341523.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
                  alt="Professional camera"
                />
              </Box>
              <CardContent sx={{ p: 1 }}>
                <Typography color="primary" fontWeight="bold" variant="body1">
                  $399.00
                </Typography>
                <Typography color="text.secondary" sx={{ textDecoration: 'line-through', fontSize: '0.85rem' }}>
                  $449.00
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {!isAuthenticated && (
          <Box sx={{ mb: 4, p: 2, bgcolor: 'white', borderRadius: 1 }}>
            {/* <Typography align="center" color="white">
              Login to enjoy personalized recommendations and add products to your cart
            </Typography> */}
          </Box>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
            <Typography color="error">{error}</Typography>
          </Box>
        ) : !isAuthenticated && !localSearchTerm ? (
          <>
            {/* New Products Section */}
          
             {/* New Products Section */}
        <Box sx={{ mb: 5, position: 'relative', overflow: 'hidden' }}>
          <Typography variant="h5" component="h2" color="error" fontWeight="bold" sx={{ mb: 2, borderBottom: '1px solid #eaeaea', pb: 1 }}>
            New Products
          </Typography>
          
          <Box sx={{ position: 'relative', px: { xs: 2, md: 0 } }}>
            <Box sx={{ 
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              py: 2
            }} id="newProductsContainer">
              {/* Product 1 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                marginBottom={2}
                  component="img"
                  height="180"
                  image="https://babyplanet.pk/cdn/shop/files/BLL-T-907_c49b014b-c03a-4bf6-9c64-ea7c506c6d50.jpg?v=1716804172g"
                  alt=" KRIDDO Kids Tricycles"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $70.00 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  KRIDDO Kids Tricycles for 2-4 Year Olds, Toddler Trike Gift for 24 Months to 4 Years, White
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 2 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://shop.autelrobotics.com/cdn/shop/articles/EVO_in_Flight_1.jpg?v=1625008247"
                  alt=" Autel EVO II Dual"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $5,625.00 /KG
                                    </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Autel EVO II Dual 640T Thermal imaging Foldable Drone Thermal Camera Evo 2 Cheap Drones With 8k Hd Camera                  </Typography>
                </CardContent>
              </Card>

              {/* Product 3 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://newparadisestore.com/cdn/shop/files/aveeno-baby-daily-care-hair-body-wash-250ml_1024x1024.jpg?v=1716635582"
                  alt="Aveeno Baby Daily Moisture Gentle Bath Wash & Shampoo"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $33.75 /Pc                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Aveeno Baby Daily Moisture Gentle Bath Wash & Shampoo with Natural Oat Extract, Hypoallergenic, Tear-Free & Paraben-Free Formula for Sensitive Hair & Skin, Lightly Scented, 33 fl. oz
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 4 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://tec-way.ch/wp-content/uploads/2024/10/rouge-brio-600x600.png"
                  alt="Hot sale "
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $540.77 /KG                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Hot sale trotinette electrique eu/best selling trotinette electrique tout terrain 24 pouces/cheap piece trotinette electrique                  </Typography>
                </CardContent>
              </Card>

              {/* Product 5 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/41ffbjxyYmL.jpg"
                  alt=" ACEGER Girls Bike "
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">

                  $161.25 /Pc  
                                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  ACEGER Girls Bike with Basket, Kids Bicycle for 3-13 Years, Included Coaster Brake & Caliper Brake, 14 16 18 Inch with Training Wheels, 20 Inch with Kickstand but no Training Wheels                  </Typography>
                </CardContent>
              </Card>

              {/* Product 6 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://shop.autelrobotics.com/cdn/shop/files/3_47eaa25b-518c-4471-bba6-c2eaea700060_1100x.jpg?v=1695867554"
                  alt=" Autel EVO II Dual"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $5,625.00 /KG
                                    </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Autel EVO II Dual 640T Thermal imaging Foldable Drone Thermal Camera Evo 2 Cheap Drones With 8k Hd Camera                  </Typography>
                </CardContent>
              </Card>

              {/* Product 7 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRut6Gt3kdBwZosJmLXnPkk1y7TN8GP0S3b4g&s"
                  alt=" FIMI X8 MINI PRO Fly Combo"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $447.50 /KG
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  FIMI X8 MINI PRO Fly Combo 249g Weight Foldable 3 Axies 4K Mini Drone With Camera Beginner Drone                  </Typography>
                </CardContent>
              </Card>

              {/* Product 8 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/61psdJRuT3L.jpg"
                  alt=" Stilts walker"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $875.00 /KG
                                    </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Stilts walker led big robot costume clothing with robotic voice for men                  </Typography>
                </CardContent>
              </Card>

              {/* Product 9 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQtg9-b1DA5kKcSwneN2f60JFxXIVqLB2gNWg&s"
                  alt="Luxury Modern Full Body Robot AI"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $1,570.00 /KG
                                    </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Luxury Modern Full Body Robot AI Smart SL Track deluxe massage cahir Zero Gravity Shiatsu AI 4D Massage Chair for Home Office                  </Typography>
                </CardContent>
              </Card>

              {/* Product 10 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://www.bhg.com/thmb/NDkdvXT8Ko6TAz0TpmpSkKw-Ivw=/4000x0/filters:no_upscale():strip_icc()/bhg-june-couches-test-pb-turner-square-arm-leather-sofa-abby-mercer-002-4269346460a54b57957d848b2a444982.jpeg"
                  alt="Durable leather sofa"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $937.50 /kg
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Durable leather sofa, the latest sofa design living room furniture                  </Typography>
                </CardContent>
              </Card>

              {/* Product 11 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRkRl8aKPMT-BDy74ieKF76CVzbbREct4_--g&s"
                  alt="  Bjflamingo Italian carbon steel "
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $1,058.66 /kg
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Bjflamingo Italian carbon steel dinning tables sets luxury 6 chairs                  </Typography>
                </CardContent>
              </Card>

              {/* Product 12 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://oxygendigitalshop.com/media/cache/1500x0/mageplaza/post/s/2/s22_ultra_kv_3_pc_1673324383.webp"
                  alt=" 2022 Smartphone for Samsung "
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $322.50 /kg
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  2022 Smartphone for Samsung S22 Ultra 5G original unlocked wholesale Android 12 Global Version 6.8 inch 2G +16 GB Mobile phones                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Left Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                left: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('newProductsContainer');
                if (container) {
                  container.scrollLeft -= container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&lt;</Typography>
            </IconButton>

            {/* Right Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                right: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('newProductsContainer');
                if (container) {
                  container.scrollLeft += container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&gt;</Typography>
            </IconButton>
          </Box>
        </Box>

          {/* Featured Products Section */}
          <Box sx={{ mb: 5, position: 'relative', overflow: 'hidden' }}>
          <Typography variant="h5" component="h2" color="error" fontWeight="bold" sx={{ mb: 2, borderBottom: '1px solid #eaeaea', pb: 1 }}>
          Featured Products
          </Typography>
          
          <Box sx={{ position: 'relative', px: { xs: 2, md: 0 } }}>
            <Box sx={{ 
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              py: 2
            }} id="FeaturedProductsContainer">
              {/* Product 1 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://www.pedalcardepot.com/wp-content/uploads/kriddo-kids-tricycles-age-24-month-to-4-years-toddler-kids-trike-for-25-to-5-year-old-gift-toddler-tricycles-for-2-4-yea-2-819x1024.jpg"
                  alt="Baby Shorts"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    
                  $70.00 /Pc  
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  KRIDDO Kids Tricycles for 2-4 Year Olds, Toddler Trike Gift for 24 Months to 4 Years, White
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 2 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://th.bing.com/th/id/OIP.QL9wWI-4Ukr8EG1TxDOk6gHaIx?rs=1&pid=ImgDetMain"
                  alt="Easter Basket Stuffers"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $22.35/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Easter Basket Stuffers - Toddlers Montessori Toys
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 3 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://th.bing.com/th/id/OIP.wwNiAO_EiVkvjSGELd54FgHaHa?rs=1&pid=ImgDetMain"
                  alt="Electric Bottle Brush"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $35.00/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    MomMed Electric Bottle Brush, Electric Baby Bottle Cleaner
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 4 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHpwyBFo6ZgOfSvqgvJkPRuAZozPjqHtrh-g&s"
                  alt=" STARBUCKS KOREA"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $54.09 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  STARBUCKS KOREA X BLACK PINK Rhinestone Cold Cup Tumbler Bag Limited Edition                  </Typography>
                </CardContent>
              </Card>

              {/* Product 5 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/4226894/pexels-photo-4226894.jpeg"
                  alt="Comfort Grip Scissors"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $12.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    JD GLOBAL Basics Multipurpose, Comfort Grip Scissors
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 6 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1029896/pexels-photo-1029896.jpeg"
                  alt="Wireless Earbuds"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $45.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Premium Wireless Earbuds with Noise Cancellation
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 7 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/4065906/pexels-photo-4065906.jpeg"
                  alt="Smart Watch"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $89.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Smart Watch with Heart Rate Monitor and GPS
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 8 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg"
                  alt="Portable Blender"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $32.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Portable Blender for Smoothies and Shakes
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 9 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/4050388/pexels-photo-4050388.jpeg"
                  alt="Wireless Charger"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $19.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Fast Wireless Charger for iPhone and Android
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 10 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg"
                  alt="Smart LED Light Bulbs"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $15.75/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Smart LED Light Bulbs, Color Changing, Works with Alexa
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 11 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg"
                  alt="Yoga Mat"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $24.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Premium Yoga Mat with Carrying Strap, Non-Slip
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 12 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg"
                  alt="Stainless Steel Water Bottle"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $18.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Insulated Stainless Steel Water Bottle, 24oz
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Left Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                left: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('FeaturedProductsContainer');
                if (container) {
                  container.scrollLeft -= container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&lt;</Typography>
            </IconButton>

            {/* Right Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                right: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('FeaturedProductsContainer');
                if (container) {
                  container.scrollLeft += container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&gt;</Typography>
            </IconButton>
          </Box>
        </Box>


           {/* Best Selling Products Section */}
           <Box sx={{ mb: 5, position: 'relative', overflow: 'hidden' }}>
          <Typography variant="h5" component="h2" color="error" fontWeight="bold" sx={{ mb: 2, borderBottom: '1px solid #eaeaea', pb: 1 }}>
          Best Selling Products
          </Typography>
          
          <Box sx={{ position: 'relative', px: { xs: 2, md: 0 } }}>
            <Box sx={{ 
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              py: 2
            }} id="BestSellingProductsContainer">
              {/* Product 1 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://img.drz.lazcdn.com/static/pk/p/ab0d15810c5fd7de384ed9c9eab18abe.jpg_720x720q80.jpg"
                  alt="10 x Self Adhesive Wall Sticky Hooks"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $1.00 /pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  10 x Self Adhesive Wall Sticky Hooks Strong Stainless steel Door Hook Holder UK                  </Typography>
                </CardContent>
              </Card>

              {/* Product 2 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwC5Gi_WkP_29OcF8roEgNSQtBFXZ2lb7c1Q&s"
                  alt="LECDER i37 Kids Headphones"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $16.99 /PC
                                    </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  ELECDER i37 Kids Headphones Children Girls Boys Teens Foldable Adjustable On Ear Headphones 3.5mm Jack Compatible Cellphones Computer MP3/4 Kindle School Tablet Orange/Black
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 3 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/71XlpJxa83L._UF1000,1000_QL80_.jpg"
                  alt=" LIDYUK End Table"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $147.50 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  LIDYUK End Table with Charging Station, Flip Top Side Table with USB Ports and Outlets, Nightstand for Small Spaces, Bedside Tables with Storage Shelf for Living Room, Bedroom, Dark Cherry                  </Typography>
                </CardContent>
              </Card>

              {/* Product 4 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://alayajunior.com/cdn/shop/files/pink_2bb29375-7f21-447c-af35-0f060e2736a4.jpg?v=1701436164"
                  alt="Baby Diaper Bag"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $46.24 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Baby Diaper Bag Backpack with Changing Station, Waterproof Changing Pad, USB Charging Port,Pacifier Case ,Pink Color                  </Typography>
                </CardContent>
              </Card>

              {/* Product 5 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images-eu.ssl-images-amazon.com/images/I/614ObayapaL._AC_UL600_SR600,600_.jpg"
                  alt="Ankis Black Brown White Biege Gold Women's Flat Sandals"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $42.50 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Ankis Black Brown White Biege Gold Women's Flat Sandals Comfortable Women's Slide Sandals Fashion Flat Sandals for Women Summer                  </Typography>
                </CardContent>
              </Card>

              {/* Product 6 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://image.made-in-china.com/2f0j00wkPVKDvtEoYZ/Large-Metal-Stairs-Doors-Hallways-Wall-Wide-Protection-Pets-Retractable-Safety-Baby-Gate.webp"
                  alt="Retractable Baby Safety Gate"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $36.24 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Retractable Baby Safety Gate, Mesh Pet Gate 33" Tall, Extends to 55" Wide, Black                  </Typography>
                </CardContent>
              </Card>

              {/* Product 7 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/51zPDh+y6-L._AC_SL1500_.jpg"
                  alt="OK MOKKOM Automatic Nut Milk Maker"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $83.75 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  OK MOKKOM Automatic Nut Milk Maker 20 oz Soy Milk Maker, Homemade Almond, Oat, Coconut, Soy, or Plant-Based Milk Dairy Free Beverages, Almond Milk Maker with Delay Start/Boild Water/Self Clean - White                  </Typography>
                </CardContent>
              </Card>

              {/* Product 8 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://static-01.daraz.pk/p/ad0c4564dc632473885bfcb0755c9b76.jpg"
                  alt="Portable Blender"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $35.00 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Portable Blender for SmoothMomMed Electric Bottle Brush, Electric Baby Bottle Brush Set with Silicone Bottle/Pacifier/Straw Brush and Mixing Head, Waterproof Bottle Cleaner Brush with Drying Rack, 2 Modes & 360° Rotationies and Shakes
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 9 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images-cdn.ubuy.com.sa/660a2301f604eb59ba5450d0-pirecart-14-panel-foldable-baby-playpen.jpg"
                  alt="Pirecart 14-Panel Foldable Baby Playpen"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $141.24 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Pirecart 14-Panel Foldable Baby Playpen, Unisex Kids Playard Center with Game Panel & Lock Door                  </Typography>
                </CardContent>
              </Card>

              {/* Product 10 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTu0uQuovksBaflfplO-4GVvCRrK2cVD3eF7A&s"
                  alt="Gardening Tools"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $42.50 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Gardening Tools 9-Piece Heavy Duty Gardening Hand Tools with Fashion and Durable Garden Tools Organizer Handbag,Rust-Proof Garden Tool Set, Ideal Gardening Gifts for Women                  </Typography>
                </CardContent>
              </Card>

              {/* Product 11 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg"
                  alt="Yoga Mat"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $24.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Premium Yoga Mat with Carrying Strap, Non-Slip
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 12 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg"
                  alt="Stainless Steel Water Bottle"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $18.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Insulated Stainless Steel Water Bottle, 24oz
                  </Typography>
                </CardContent>
              </Card> */}
            </Box>

            {/* Left Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                left: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('BestSellingProductsContainer');
                if (container) {
                  container.scrollLeft -= container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&lt;</Typography>
            </IconButton>

            {/* Right Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                right: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('BestSellingProductsContainer');
                if (container) {
                  container.scrollLeft += container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&gt;</Typography>
            </IconButton>
          </Box>
        </Box>

      

        {/* Promotional Banners */}
        <Box sx={{ mb: 5, width: '100%' }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            width: '100%'
          }}>
            {/* Banner 1 - Valentine's Sale */}
            <Box 
              component="img"
              src="https://t4.ftcdn.net/jpg/04/41/14/65/360_F_441146553_haUBrTpsJJ22bEbsMlgkNosGuWGwbV0t.jpg"
              alt="Valentine's Big Sale"
              sx={{ 
                width: { xs: '100%', md: '33.33%' }, 
                height: { xs: 120, md: 150 },
                objectFit: 'cover',
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                '&:hover': { transform: 'scale(1.02)' }
              }}
            />
            
            {/* Banner 2 - Flash Sale */}
            <Box 
              component="img"
              src="https://mir-s3-cdn-cf.behance.net/project_modules/fs/3ce709113389695.60269c221352f.jpg"
              alt="Flash Sale"
              sx={{ 
                width: { xs: '100%', md: '33.33%' }, 
                height: { xs: 120, md: 150 },
                objectFit: 'cover',
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                '&:hover': { transform: 'scale(1.02)' }
              }}
            />
            
            {/* Banner 3 - 15% Off Everything */}
            <Box 
              component="img"
              src="https://img.freepik.com/premium-vector/ramadan-kareem-sale-banner-template_234845-758.jpg"
              alt="15% Off Everything"
              sx={{ 
                width: { xs: '100%', md: '33.33%' }, 
                height: { xs: 120, md: 150 },
                objectFit: 'cover',
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                '&:hover': { transform: 'scale(1.02)' }
              }}
            />
          </Box>
        </Box>

   {/* Women Clothing & Fashion Section */}
   <Box sx={{ mb: 5, position: 'relative', overflow: 'hidden' }}>
          <Typography variant="h5" component="h2" color="error" fontWeight="bold" sx={{ mb: 2, borderBottom: '1px solid #eaeaea', pb: 1 }}>
          Women Clothing & Fashion
          </Typography>
          
          <Box sx={{ position: 'relative', px: { xs: 2, md: 0 } }}>
            <Box sx={{ 
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              py: 2
            }} id="WomenClothingProductsContainer">
              {/* Product 1 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://media-photos.depop.com/b0/851846/1091744571_ff4c6995d9ca42df986b3c2ffd29ba75/P0.jpg"
                  alt="River Island Womens Midi Dress"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $8.24 /pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  River Island Womens Midi Dress Brown Satin Animal Print Stylish                  </Typography>
                </CardContent>
              </Card>

              {/* Product 2 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://www.moshulu.co.uk/images/ladies-fluffy-sheepskin-mule-slipper-p2899-134860_image.jpg"
                  alt="Ladies Mule Slippers"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $10.97 /PC
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Ladies Mule Slippers Ladies Mules Slip On Slippers Sheepskin Slippers Hard Sole                  </Typography>
                </CardContent>
              </Card>

              {/* Product 3 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/41Pn0i3N5-L._SL500_.jpg"
                  alt="Electric Bottle Brush"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $30.09 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Solid Zipper Front Slim Top, Versatile Long Sleeve Mock Neck Top For Spring & Fall, Women's Clothing                  </Typography>
                </CardContent>
              </Card>

              {/* Product 4 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTLeud2MYjTMJe2g5OlUpw9TexrArvt8m36Xw&s"
                  alt="Travistar Crossbody Bags"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $35.00 /PC
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Travistar Crossbody Bags for Women Small Handbags PU Leather Shoulder Bag Purse Evening Bag Quilted Satchels with Chain Strap                  </Typography>
                </CardContent>
              </Card>

              {/* Product 5 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/71u+Si9K7AL._UY1000_.jpg"
                  alt="JD.GLOBAL Essentials Women's Classic-Fit Short-Sleeve V-Neck T-Shirt"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $17.50 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  JD.GLOBAL Essentials Women's Classic-Fit Short-Sleeve V-Neck T-Shirt, Multipacks                  </Typography>
                </CardContent>
              </Card>

              {/* Product 6 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://cdn.media.amplience.net/i/drmartens/24622211.80.jpg?$medium$"
                  alt="Dr. Martens Women's Blaire Brando Fisherman Sandal"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $97.50 /Pc                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Dr. Martens Women's Blaire Brando Fisherman Sandal                  </Typography>
                </CardContent>
              </Card>

              {/* Product 7 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images-eu.ssl-images-amazon.com/images/I/614ObayapaL._AC_UL600_SR600,600_.jpg"
                  alt="Ankis Black Brown White Biege Gold Women's Flat Sandals Comfortable Women's Slide Sandals Fashion Flat Sandals for Women Summer"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $42.50 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Ankis Black Brown White Biege Gold Women's Flat Sandals Comfortable Women's Slide Sandals Fashion Flat Sandals for Women Summer                  </Typography>
                </CardContent>
              </Card>

              {/* Product 8 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/S/aplus-media-library-service-media/ee3f0c62-4277-4d88-9462-14a9a051e74d.__CR0,0,800,600_PT0_SX600_V1___.jpg"
                  alt="BTFBM Women's 2024 Summer Casual Beach Dresses Crew Neck Short Sleeve Wrap Party Club Mini Ruched Bodycon T Shirt Dress"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                   
$48.75 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  BTFBM Women's 2024 Summer Casual Beach Dresses Crew Neck Short Sleeve Wrap Party Club Mini Ruched Bodycon T Shirt Dress
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 9 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://i5.walmartimages.com/seo/5-Pack-Women-s-Short-Sleeve-V-Neck-Activewear-T-Shirt-Dry-Fit-Moisture-Wicking-Perfomance-Yoga-Top-Available-in-Plus-Size_467e8474-57c5-4976-aa7c-0a5f349d782d.044e15b66001ae115b3058051921d8d5.jpeg"
                  alt="JD.GLOBAL Essentials Women's Classic-Fit Short-Sleeve V-Neck T-Shirt"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $17.50 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  JD.GLOBAL Essentials Women's Classic-Fit Short-Sleeve V-Neck T-Shirt, Multipacks                  </Typography>
                </CardContent>
              </Card>

              {/* Product 10 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://www.realsimple.com/thmb/gqKTece1AiXK5ilfHKhJj9qquHE=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/amazon-essentials-womens-classic-fit-short-sleeve-v-neck-t-shirt--b6bf66a618a14d06b9f20e294db3ac7d.jpg"
                  alt="JD.GLOBAL Essentials Women's Classic-Fit Short-Sleeve V-Neck T-Shirt"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $17.50 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  JD.GLOBAL Essentials Women's Classic-Fit Short-Sleeve V-Neck T-Shirt, Multipacks
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 11 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg"
                  alt="Yoga Mat"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $24.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Premium Yoga Mat with Carrying Strap, Non-Slip
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 12 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg"
                  alt="Stainless Steel Water Bottle"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $18.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Insulated Stainless Steel Water Bottle, 24oz
                  </Typography>
                </CardContent>
              </Card> */}
            </Box>

            {/* Left Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                left: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('WomenClothingProductsContainer');
                if (container) {
                  container.scrollLeft -= container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&lt;</Typography>
            </IconButton>

            {/* Right Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                right: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('WomenClothingProductsContainer');
                if (container) {
                  container.scrollLeft += container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&gt;</Typography>
            </IconButton>
          </Box>
        </Box>





 {/* Beauty, Health & Hair Section */}
 <Box sx={{ mb: 5, position: 'relative', overflow: 'hidden' }}>
          <Typography variant="h5" component="h2" color="error" fontWeight="bold" sx={{ mb: 2, borderBottom: '1px solid #eaeaea', pb: 1 }}>
          Beauty, Health & Hair
          </Typography>
          
          <Box sx={{ position: 'relative', px: { xs: 2, md: 0 } }}>
            <Box sx={{ 
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              py: 2
            }} id="BeautyProductsContainer">
              {/* Product 1 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/91ITAognfPL.jpg"
                  alt="Scarleton Purses for Women Large Hobo Bags Washed Vegan Leather Shoulder Bag Satchel Tote Top Handle Handbags"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                   
                        $48.75 /PC
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Scarleton Purses for Women Large Hobo Bags Washed Vegan Leather Shoulder Bag Satchel Tote Top Handle Handbags, H1292                  </Typography>
                </CardContent>
              </Card>

              {/* Product 2 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT73I96GnseUECY5ngY2Uil9xPBZcKSz7iS3g&s"
                  alt="Hair Dryer, NEXPURE 1800W Professional Ionic Hairdryer for Hair Care, Powerful Hot/Cool Wind Blow Dryer with Diffuser, Nozzle, ETL, UL and ALCI Safety Plug (Dark Grey)"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $44.99 /Pc$22.35/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Hair Dryer, NEXPURE 1800W Professional Ionic Hairdryer for Hair Care, Powerful Hot/Cool Wind Blow Dryer with Diffuser, Nozzle, ETL, UL and ALCI Safety Plug (Dark Grey)                  </Typography>
                </CardContent>
              </Card>

              {/* Product 3 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsdttq8Jl14zqbdAr3lFDGAqJURTaeHRYShw&s"
                  alt="Parfums de Marly Kalan by Parfums de Marly, 2.5 oz EDP Spray for Men"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $189.85 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Parfums de Marly Kalan by Parfums de Marly, 2.5 oz EDP Spray for Men                  </Typography>
                </CardContent>
              </Card>

              {/* Product 4 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://perfumeoasis.co.uk/cdn/shop/files/godolphin75.png?v=1710529768"
                  alt="Parfums De Marly Godolphin Eau De Toilette Spray, Cologne for Men, 4.2 Oz"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $185.62 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Parfums De Marly Godolphin Eau De Toilette Spray, Cologne for Men, 4.2 Oz                  </Typography>
                </CardContent>
              </Card>

              {/* Product 5 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://img.drz.lazcdn.com/static/pk/p/8807396c807e9606a19388c848f99ad2.jpg_720x720q80.jpg_.webp"
                  alt="Hinzonek 5 in 1 Hair Blower Brush Hairdryer-Detachable and Interchangeable Hot Tools Blow Dryer Brush, Negative Ion Technology Heated Curling Brush for Straightening, Curling, Dry Combing"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                   
$26.73 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
Hinzonek 5 in 1 Hair Blower Brush Hairdryer-Detachable and Interchangeable Hot Tools Blow Dryer Brush, Negative Ion Technology Heated Curling Brush for Straightening, Curling, Dry Combing                  </Typography>
                </CardContent>
              </Card>

              {/* Product 6 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1029896/pexels-photo-1029896.jpeg"
                  alt="beauty creams"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $23.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                 Beauty Creams
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 7 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://esellerstorevip.biz/public/uploads/all/9c8WWMynWk72cz1WGwjEpMN69jdHu5zZlESnPYdG.png"
                  alt="Luxury Modern Full Body Robot AI Smart SL Track deluxe massage cahir Zero Gravity Shiatsu AI 4D Massage Chair for Home Office"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $1,570.00 /KG
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Luxury Modern Full Body Robot AI Smart SL Track deluxe massage cahir Zero Gravity Shiatsu AI 4D Massage Chair for Home Office                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 8 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg"
                  alt="Portable Blender"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $32.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Portable Blender for Smoothies and Shakes
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 9 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/4050388/pexels-photo-4050388.jpeg"
                  alt="Wireless Charger"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $19.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Fast Wireless Charger for iPhone and Android
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 10 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg"
                  alt="Smart LED Light Bulbs"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $15.75/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Smart LED Light Bulbs, Color Changing, Works with Alexa
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 11 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg"
                  alt="Yoga Mat"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $24.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Premium Yoga Mat with Carrying Strap, Non-Slip
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 12 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg"
                  alt="Stainless Steel Water Bottle"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $18.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Insulated Stainless Steel Water Bottle, 24oz
                  </Typography>
                </CardContent>
              </Card> */}
            </Box>

            {/* Left Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                left: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('BeautyProductsContainer');
                if (container) {
                  container.scrollLeft -= container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&lt;</Typography>
            </IconButton>

            {/* Right Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                right: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('BeautyProductsContainer');
                if (container) {
                  container.scrollLeft += container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&gt;</Typography>
            </IconButton>
          </Box>
        </Box>

{/* Jewelry & Watches Section */}
<Box sx={{ mb: 5, position: 'relative', overflow: 'hidden' }}>
          <Typography variant="h5" component="h2" color="error" fontWeight="bold" sx={{ mb: 2, borderBottom: '1px solid #eaeaea', pb: 1 }}>
          Jewelry & Watches
          </Typography>
          
          <Box sx={{ position: 'relative', px: { xs: 2, md: 0 } }}>
            <Box sx={{ 
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              py: 2
            }} id="JewelryWatchesProductsContainer">
              {/* Product 1 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQw_x5SZcMb0JY4tIEgJTZIOTxmECaEUG9sZg&s"
                  alt="Fashion Pure"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $4,164.48 /kg
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Fashion Pure 18k Gold 6ct Diamond Chain Necklace Bracelet Women Ladies Bridal Engagement Wedding Jewelry                  </Typography>
                </CardContent>
              </Card>

              {/* Product 2 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://s.alicdn.com/@sc04/kf/Hb05a186cf8604e92b5cc72a200b6344eg.jpg_350x350.jpg"
                  alt="5D hard yellow solid gold jewelry manufacturer fashion 61.38g 22inch pure 24k gold chain necklace jewelry for man"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $5,825.00 /kg
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  5D hard yellow solid gold jewelry manufacturer fashion 61.38g 22inch pure 24k gold chain necklace jewelry for man                  </Typography>
                </CardContent>
              </Card>

              {/* Product 3 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://s.alicdn.com/@sc04/kf/H127ab7bd18c0439da24f96021b464133o.jpg_300x300.jpg"
                  alt="24k gold chain necklace jewelry for man"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  
                        $5,825.00 /kg
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  24k gold chain necklace jewelry for man                  </Typography>
                </CardContent>
              </Card>

              {/* Product 4 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://s.alicdn.com/@sc04/kf/Abc937ef1a63e499293fbd26bd0e7f3aen.jpg"
                  alt="solid gold jewelry manufacturer fashion"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $4,785.00 /kg
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  solid gold jewelry manufacturer fashion                  </Typography>
                </CardContent>
              </Card>

              {/* Product 5 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/81zSh9pyYhL._UF1000,1000_QL80_.jpg"
                  alt="Smart Watch for Men Women(Answer/Make Call),1.83" 
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    
$62.49 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Smart Watch for Men Women(Answer/Make Call),1.83" Fitness Tracker with Blood Pressure Heart Rate Monitor,Sleep Tracker,Pedometer,123 Sport Modes, IP68 Waterproof Smartwatches for iPhone&Android                  </Typography>
                </CardContent>
              </Card>

              {/* Product 6 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/71UwjCXkvgL._AC_SL1500_.jpg"
                  alt="Michael Kors Crossbody"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $86.81 /PC
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Michael Kors Crossbody                  </Typography>
                </CardContent>
              </Card>

              {/* Product 7 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://lzd-img-global.slatic.net/g/p/fa8b8e43242a878da27457f101f47b25.jpg_720x720q80.jpg_.webp"
                  alt="Arthesdam Jewellery 916 Gold Starry Solitaire Pendant"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                   
$157.50 /pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Arthesdam Jewellery 916 Gold Starry Solitaire Pendant                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 8 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg"
                  alt="Portable Blender"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $32.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Portable Blender for Smoothies and Shakes
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 9 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/4050388/pexels-photo-4050388.jpeg"
                  alt="Wireless Charger"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $19.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Fast Wireless Charger for iPhone and Android
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 10 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg"
                  alt="Smart LED Light Bulbs"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $15.75/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Smart LED Light Bulbs, Color Changing, Works with Alexa
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 11 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg"
                  alt="Yoga Mat"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $24.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Premium Yoga Mat with Carrying Strap, Non-Slip
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 12 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg"
                  alt="Stainless Steel Water Bottle"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $18.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Insulated Stainless Steel Water Bottle, 24oz
                  </Typography>
                </CardContent>
              </Card> */}
            </Box>

            {/* Left Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                left: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('JewelryWatchesProductsContainer');
                if (container) {
                  container.scrollLeft -= container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&lt;</Typography>
            </IconButton>

            {/* Right Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                right: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('JewelryWatchesProductsContainer');
                if (container) {
                  container.scrollLeft += container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&gt;</Typography>
            </IconButton>
          </Box>
        </Box>


 {/* Sports & Outdoor Section */}
 <Box sx={{ mb: 5, position: 'relative', overflow: 'hidden' }}>
          <Typography variant="h5" component="h2" color="error" fontWeight="bold" sx={{ mb: 2, borderBottom: '1px solid #eaeaea', pb: 1 }}>
          Sports & Outdoor
          </Typography>
          
          <Box sx={{ position: 'relative', px: { xs: 2, md: 0 } }}>
            <Box sx={{ 
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              py: 2
            }} id="SportsoutdoorProductsContainer">
              {/* Product 1 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/81RZapYzF0L._AC_UF350,350_QL80_.jpg"
                  alt="Canon EOS 2000D Rebel T7 DSLR Camera with 18-55mm III Lens With 25 Piece Bundle"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $527.24 /PC
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Canon EOS 2000D Rebel T7 DSLR Camera with 18-55mm III Lens With 25 Piece Bundle                  </Typography>
                </CardContent>
              </Card>

              {/* Product 2 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/71tXufnu2XL._UF1000,1000_QL80_.jpg"
                  alt="1 Pair Boardless Skateboard, Double Wheel Roller With Thicked Pendal And Durable PU Wheel Drift Anti-Slip Board, Suitable For Beginners"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $157.00 /pc
                                    </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  1 Pair Boardless Skateboard, Double Wheel Roller With Thicked Pendal And Durable PU Wheel Drift Anti-Slip Board, Suitable For Beginners                  </Typography>
                </CardContent>
              </Card>

              {/* Product 3 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/61sx0sjSxSL._UF1000,1000_QL80_.jpg"
                  alt="ELENKER Steerable Knee Scooter Walker Shock Absorber Ultra Compact Portable"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $109.24 /PC
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  ELENKER Steerable Knee Scooter Walker Shock Absorber Ultra Compact Portable                  </Typography>
                </CardContent>
              </Card>

              {/* Product 4 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRvYZMEB7zN1-SjmkUFGyQoAYXii0x2F_8zbQ&s"
                  alt="Tuffcare Smooth Steerable Seated Scooter, Slow Propelled Mobility Knee Walker"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $229.24 /PC
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Tuffcare Smooth Steerable Seated Scooter, Slow Propelled Mobility Knee Walker                  </Typography>
                </CardContent>
              </Card>

              {/* Product 5 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ25lEf8HFDD7GCar2JqKEFMd_n31HZm2zwoA&s"
                  alt="Canon EOS R6 Full-Frame Mirrorless Camera with 4K Video, Full-Frame CMOS Senor, DIGIC X Image Processor, Dual UHS-II SD Memory Card Slots, and Up to 12 fps with Mechnical Shutter, Body Only, Black"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">

                  $3,118.75 /Pc
                                    </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Canon EOS R6 Full-Frame Mirrorless Camera with 4K Video, Full-Frame CMOS Senor, DIGIC X Image Processor, Dual UHS-II SD Memory Card Slots, and Up to 12 fps with Mechnical Shutter, Body Only, Black                  </Typography>
                </CardContent>
              </Card>

              {/* Product 6 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/71E+oh38ZqL.jpg"
                  alt="Marcy Dual Action Cross Training Recumbent Exercise Bike with Arm Exercisers, Gym Equipment for Work from Home Fitness, Black JX-7301"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  
$384.99 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Marcy Dual Action Cross Training Recumbent Exercise Bike with Arm Exercisers, Gym Equipment for Work from Home Fitness, Black JX-7301                  </Typography>
                </CardContent>
              </Card>

              {/* Product 7 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://esellerstorevip.biz/public/uploads/all/WiN7dZMQoymwvhd6z6Hdw1UJKP5jJaIaaZDXlHSq.png"
                  alt="Smart Watch"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $237.60 /PC
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Lowepro backpack Pro Trekker BP 350 AW II. No Fees! EU Seller!
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 8 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg"
                  alt="Portable Blender"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $32.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Portable Blender for Smoothies and Shakes
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 9 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/4050388/pexels-photo-4050388.jpeg"
                  alt="Wireless Charger"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $19.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Fast Wireless Charger for iPhone and Android
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 10 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg"
                  alt="Smart LED Light Bulbs"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $15.75/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Smart LED Light Bulbs, Color Changing, Works with Alexa
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 11 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg"
                  alt="Yoga Mat"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $24.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Premium Yoga Mat with Carrying Strap, Non-Slip
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 12 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg"
                  alt="Stainless Steel Water Bottle"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $18.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Insulated Stainless Steel Water Bottle, 24oz
                  </Typography>
                </CardContent>
              </Card> */}
            </Box>

            {/* Left Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                left: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('SportsoutdoorProductsContainer');
                if (container) {
                  container.scrollLeft -= container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&lt;</Typography>
            </IconButton>

            {/* Right Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                right: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('SportsoutdoorProductsContainer');
                if (container) {
                  container.scrollLeft += container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&gt;</Typography>
            </IconButton>
          </Box>
        </Box>


{/* Men Clothing & Fashion Section */}
<Box sx={{ mb: 5, position: 'relative', overflow: 'hidden' }}>
          <Typography variant="h5" component="h2" color="error" fontWeight="bold" sx={{ mb: 2, borderBottom: '1px solid #eaeaea', pb: 1 }}>
          Men Clothing & Fashion
          </Typography>
          
          <Box sx={{ position: 'relative', px: { xs: 2, md: 0 } }}>
            <Box sx={{ 
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              py: 2
            }} id="MenClothingProductsContainer">
              {/* Product 1 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/51IFihcA3qL._SL1024_.jpg"
                  alt="Dunlop Protective Footwear, Chesapeake plain toe Black Amazon, 100% Waterproof PVC, Lightweight and Durable, 8677577.11, Size 11 US"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $24.06 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Dunlop Protective Footwear, Chesapeake plain toe Black Amazon, 100% Waterproof PVC, Lightweight and Durable, 8677577.11, Size 11 US                  </Typography>
                </CardContent>
              </Card>

              {/* Product 2 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQgKoktlyh4nVePjJYiV_Iwt06kb8yBpWHODQ&s"
                  alt="adidas Men's Ultraboost 1.0 Sneaker"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                   
$171.86 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  adidas Men's Ultraboost 1.0 Sneaker                  </Typography>
                </CardContent>
              </Card>

              {/* Product 3 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQJ_XOqW1NbAHkKt1AFDy7Hnun1NUjWgwKsGQ&s"
                  alt="Timberland Men's 6-Inch Premium Waterproof Boot"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $148.75 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Timberland Men's 6-Inch Premium Waterproof Boot                  </Typography>
                </CardContent>
              </Card>

              {/* Product 4 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://resources.mandmdirect.com/Images/_default/r/o/3/ro30216_1_cloudzoom.jpg"
                  alt="Crocs Echo Clog Men desert grass"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                 
$37.85 /pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Crocs Echo Clog Men desert grass
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 5 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsSJ9V4DIcNCQxiLtUSR5KKiFY8vGAOaon7A&s"
                  alt="MENS WOMENS CASUAL SWEAT SHORTS PLAIN GYM SHORTS FLEECE HOUSE GYM DAILY HAREM"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    
$7.74 /PC
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  MENS WOMENS CASUAL SWEAT SHORTS PLAIN GYM SHORTS FLEECE HOUSE GYM DAILY HAREM                  </Typography>
                </CardContent>
              </Card>

              {/* Product 6 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://img.drz.lazcdn.com/static/pk/p/36d71ce04cd88438f2158fe9248affe1.jpg_720x720q80.jpg"
                  alt=" Genuine Leather Luxury Belts"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $23.85 /pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Genuine Leather Luxury Belts For Men Classy Dress Belts Mens Belt Many Colors                  </Typography>
                </CardContent>
              </Card>

              {/* Product 7 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://esellerstorevip.biz/public/uploads/all/8pG3Ay1B5GS4CkaE1bUwVGKOqZtA9bwSlpDtw2cz.jpg"
                  alt=" Plus Size Men's "
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $89.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Plus Size Men's "Simple" Print Sweatshirt & Sweatpants Set For Autumn/winter, Contrast Color 2Pcs Outfits For Sports/outdoor, Men's Clothing
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 8 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg"
                  alt="Portable Blender"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $32.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Portable Blender for Smoothies and Shakes
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 9 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/4050388/pexels-photo-4050388.jpeg"
                  alt="Wireless Charger"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $19.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Fast Wireless Charger for iPhone and Android
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 10 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg"
                  alt="Smart LED Light Bulbs"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $15.75/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Smart LED Light Bulbs, Color Changing, Works with Alexa
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 11 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg"
                  alt="Yoga Mat"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $24.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Premium Yoga Mat with Carrying Strap, Non-Slip
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 12 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg"
                  alt="Stainless Steel Water Bottle"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $18.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Insulated Stainless Steel Water Bottle, 24oz
                  </Typography>
                </CardContent>
              </Card> */}
            </Box>

            {/* Left Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                left: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('MenClothingProductsContainer');
                if (container) {
                  container.scrollLeft -= container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&lt;</Typography>
            </IconButton>

            {/* Right Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                right: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('MenClothingProductsContainer');
                if (container) {
                  container.scrollLeft += container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&gt;</Typography>
            </IconButton>
          </Box>
        </Box>


{/* Kids & toy Section */}
<Box sx={{ mb: 5, position: 'relative', overflow: 'hidden' }}>
          <Typography variant="h5" component="h2" color="error" fontWeight="bold" sx={{ mb: 2, borderBottom: '1px solid #eaeaea', pb: 1 }}>
          Kids & toy
          </Typography>
          
          <Box sx={{ position: 'relative', px: { xs: 2, md: 0 } }}>
            <Box sx={{ 
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              py: 2
            }} id="KidsProductsContainer">
              {/* Product 1 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/51FK6XjSHgL._SL500_.jpg"
                  alt="Baby Diaper Bag Backpack with Changing Station, Waterproof Changing Pad, USB Charging Port,Pacifier Case ,Pink Color"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $46.24 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Baby Diaper Bag Backpack with Changing Station, Waterproof Changing Pad, USB Charging Port,Pacifier Case ,Pink Color                  </Typography>
                </CardContent>
              </Card>

              {/* Product 2 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://i5.walmartimages.com/seo/MAM-Easy-Active-11oz-2-Pack-Bottle-Pink_0853e52b-5912-4424-ab48-5b3d761dc674.a1c18942ee70ee14145d736cf3ed5238.jpeg"
                  alt="MAM Easy Active Baby Bottle 11oz, Easy Switch Between Breast and Bottle, Easy to Clean, 4+ Months & Plastic Trainer Cup (1 Count), 8 oz. Trainer Drinking Cup with Extra-Soft Spout"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $23.09 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  MAM Easy Active Baby Bottle 11oz, Easy Switch Between Breast and Bottle, Easy to Clean, 4+ Months & Plastic Trainer Cup (1 Count), 8 oz. Trainer Drinking Cup with Extra-Soft Spout
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 3 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/31hYmdK2v9L._SL500_.jpg"
                  alt="Aveeno Baby Daily Moisture Gentle Bath Wash & Shampoo with Natural Oat Extract, Hypoallergenic, Tear-Free & Paraben-Free Formula for Sensitive Hair & Skin, Lightly Scented, 33 fl. oz"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $33.75 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Aveeno Baby Daily Moisture Gentle Bath Wash & Shampoo with Natural Oat Extract, Hypoallergenic, Tear-Free & Paraben-Free Formula for Sensitive Hair & Skin, Lightly Scented, 33 fl. oz
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 4 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/71oGZbrbypL._UF894,1000_QL80_.jpg"
                  alt="KRIDDO Kids Tricycles for 2-4 Year Olds, Toddler Trike Gift for 24 Months to 4 Years, White"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $70.00 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  KRIDDO Kids Tricycles for 2-4 Year Olds, Toddler Trike Gift for 24 Months to 4 Years, White
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 5 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/71mbagdMEaL._AC_SL1500_.jpg"
                  alt="JOYSTAR Pluto Kids Bike 12 14 16 18 20 Inch Children's Bicycle for Boys Girls Age 3-12 Years, Kids' Bicycles, Multiple Colors"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $236.25 /Pc                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    JD GLOBAL Basics Multipurpose, Comfort Grip ScissJOYSTAR Pluto Kids Bike 12 14 16 18 20 Inch Children's Bicycle for Boys Girls Age 3-12 Years, Kids' Bicycles, Multiple Colorsors
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 6 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/61ZUHIA6MhL._SL1500_.jpg"
                  alt="MAM Bottle Nipples Mixed Flow Pack - Fast Flow Nipple Level 3 and Extra Fast Flow Nipple Level 4, for Newborns and Older, SkinSoft Silicone Nipples for Baby Bottles, Fits All MAM Bottles, 4 Pack"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $13.75 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  MAM Bottle Nipples Mixed Flow Pack - Fast Flow Nipple Level 3 and Extra Fast Flow Nipple Level 4, for Newborns and Older, SkinSoft Silicone Nipples for Baby Bottles, Fits All MAM Bottles, 4 Pack                  </Typography>
                </CardContent>
              </Card>

              {/* Product 7 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://esellerstorevip.biz/public/uploads/all/TDmw7TvzEpU4TzKvvwrl4dhBrdw0nG4HbXZ4SC1f.jpg"
                  alt="MomMed Electric Bottle Brush, Electric Baby Bottle Brush Set with Silicone Bottle/Pacifier/Straw Brush and Mixing Head, Waterproof Bottle Cleaner Brush with Drying Rack, 2 Modes & 360° Rotation"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $35.00 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  MomMed Electric Bottle Brush, Electric Baby Bottle Brush Set with Silicone Bottle/Pacifier/Straw Brush and Mixing Head, Waterproof Bottle Cleaner Brush with Drying Rack, 2 Modes & 360° Rotation                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 8 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg"
                  alt="Portable Blender"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $32.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Portable Blender for Smoothies and Shakes
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 9 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/4050388/pexels-photo-4050388.jpeg"
                  alt="Wireless Charger"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $19.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Fast Wireless Charger for iPhone and Android
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 10 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg"
                  alt="Smart LED Light Bulbs"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $15.75/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Smart LED Light Bulbs, Color Changing, Works with Alexa
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 11 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg"
                  alt="Yoga Mat"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $24.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Premium Yoga Mat with Carrying Strap, Non-Slip
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 12 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg"
                  alt="Stainless Steel Water Bottle"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $18.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Insulated Stainless Steel Water Bottle, 24oz
                  </Typography>
                </CardContent>
              </Card> */}
            </Box>

            {/* Left Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                left: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('KidsProductsContainer');
                if (container) {
                  container.scrollLeft -= container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&lt;</Typography>
            </IconButton>

            {/* Right Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                right: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('KidsProductsContainer');
                if (container) {
                  container.scrollLeft += container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&gt;</Typography>
            </IconButton>
          </Box>
        </Box>



        {/* omputers-Cameras-Accessories Section */}
<Box sx={{ mb: 5, position: 'relative', overflow: 'hidden' }}>
          <Typography variant="h5" component="h2" color="error" fontWeight="bold" sx={{ mb: 2, borderBottom: '1px solid #eaeaea', pb: 1 }}>
          Computers-Cameras-Accessories
          </Typography>
          
          <Box sx={{ position: 'relative', px: { xs: 2, md: 0 } }}>
            <Box sx={{ 
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              py: 2
            }} id="ComputersProductsContainer">
              {/* Product 1 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/7181WX9bUjS.jpg"
                  alt="ELECDER i37 Kids Headphones Children Girls Boys Teens Foldable Adjustable On Ear Headphones 3.5mm Jack Compatible Cellphones Computer MP3/4 Kindle School Tablet Orange/Black"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $16.99 /PC
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  ELECDER i37 Kids Headphones Children Girls Boys Teens Foldable Adjustable On Ear Headphones 3.5mm Jack Compatible Cellphones Computer MP3/4 Kindle School Tablet Orange/Black                  </Typography>
                </CardContent>
              </Card>

              {/* Product 2 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://m.media-amazon.com/images/I/511CmBo39fL._AC_UF894,1000_QL80_.jpg"
                  alt="Xiaomi Pad 5 WiFi Only 11 inches 120Hz 8720mAh Bluetooth 5.0 Four Speakers Dolby Atmos 13 Mp Camera + Fast Car 51W Charger Bundle (Cosmic Gray, 256GB + 6GB)"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $497.99 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Xiaomi Pad 5 WiFi Only 11 inches 120Hz 8720mAh Bluetooth 5.0 Four Speakers Dolby Atmos 13 Mp Camera + Fast Car 51W Charger Bundle (Cosmic Gray, 256GB + 6GB)                  </Typography>
                </CardContent>
              </Card>

              {/* Product 3 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrXNaKwcIp7u0s8JzenhLpY5rfo8Lt_bJB3g&s"
                  alt="New Dell Pro Slim 15" 
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $17.74 /Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  New Dell Pro Slim 15" Briefcase Laptop Bag                  </Typography>
                </CardContent>
              </Card>

              {/* Product 4 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_gwVTjkIh7RYIhzxtgU89RbdgrOqrwCxDQq2ZqJpl6dMerkhoHnj4bJPBnJ_xAvSpRB8&usqp=CAU"
                  alt="Wireless Speaker, 4 Sound Holes, 6D Surround Sound, Shocking Heavy Bass, RBG Color, Long Strip, Easy To Store And Save Space, Desktop Audio/computer Speaker/car Speaker/cycling Speaker/camping Speaker"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                   
$48.84 /pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Wireless Speaker, 4 Sound Holes, 6D Surround Sound, Shocking Heavy Bass, RBG Color, Long Strip, Easy To Store And Save Space, Desktop Audio/computer Speaker/car Speaker/cycling Speaker/camping Speaker                  </Typography>
                </CardContent>
              </Card>

              {/* Product 5 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://i5.walmartimages.com/seo/YinDiao-Caller-Mechanical-Keyboard-104-Keys-Green-Axis-Backlit-Office-E-sports-Game-Keyboard-Wired-USB-Desktop-Computer-Notebook-Universal_1eee649b-0d33-455f-bcb4-6e0996247089.49dd05e160f88206503bc66b1069d6ea.jpeg"
                  alt="YinDiao Caller Mechanical Keyboard 104 Keys Green Axis Backlit Office E-sports Game Keyboard Wired USB Desktop Computer Notebook Universal"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $106.95 /pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  YinDiao Caller Mechanical Keyboard 104 Keys Green Axis Backlit Office E-sports Game Keyboard Wired USB Desktop Computer Notebook Universal                  </Typography>
                </CardContent>
              </Card>

              {/* Product 6 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://esellerstorevip.biz/public/uploads/all/39xb9a9fht07ID8mbiB6s0yzPl1V2fZSctNfvgNA.jpg"
                  alt="RGB Desktop Speakers, 2.0CH Stereo PC Computer Gaming Speakers, 6W Multimedia Monitor Speakers, Volume Control, USB Powered / 3.5mm Cable"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $13.61 /pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  RGB Desktop Speakers, 2.0CH Stereo PC Computer Gaming Speakers, 6W Multimedia Monitor Speakers, Volume Control, USB Powered / 3.5mm Cable                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 7 */}
              {/* <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://esellerstorevip.biz/public/uploads/all/4SP2HwITvYWNK9aweOHaAFsPtDMCJ1kZk4Iq3UPM.jpg"
                  alt="Upgrade Your Gaming Experience: G2000 Surround Stereo Gaming Headset with Noise Cancelling Mic, LED Lights & Soft Memory Earmuffs for PS5/PS4/Xbox One/Nintendo Switch/PC Mac"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                  $104.70 /pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                  Upgrade Your Gaming Experience: G2000 Surround Stereo Gaming Headset with Noise Cancelling Mic, LED Lights & Soft Memory Earmuffs for PS5/PS4/Xbox One/Nintendo Switch/PC Mac
                  </Typography>
                </CardContent>
              </Card> */}

              {/* Product 8 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1667088/pexels-photo-1667088.jpeg"
                  alt="Portable Blender"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $32.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Portable Blender for Smoothies and Shakes
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 9 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/4050388/pexels-photo-4050388.jpeg"
                  alt="Wireless Charger"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $19.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Fast Wireless Charger for iPhone and Android
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 10 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg"
                  alt="Smart LED Light Bulbs"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $15.75/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Smart LED Light Bulbs, Color Changing, Works with Alexa
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 11 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg"
                  alt="Yoga Mat"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $24.99/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                    <Box component="span" color="#e0e0e0" sx={{ fontSize: '14px' }}>★</Box>
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Premium Yoga Mat with Carrying Strap, Non-Slip
                  </Typography>
                </CardContent>
              </Card>

              {/* Product 12 */}
              <Card sx={{ 
                minWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                maxWidth: { xs: 'calc(100% / 2.2)', sm: 'calc(100% / 3.2)', md: 'calc(100% / 5.2)' },
                cursor: 'pointer',
                '&:hover': { 
                  transform: 'translateY(-4px)', 
                  transition: 'transform 0.3s ease',
                  boxShadow: 3
                }
              }}>
                <CardMedia
                  component="img"
                  height="180"
                  image="https://images.pexels.com/photos/2536965/pexels-photo-2536965.jpeg"
                  alt="Stainless Steel Water Bottle"
                />
                <CardContent sx={{ p: 1, pt: 1.5 }}>
                  <Typography color="error" fontWeight="bold" variant="body1">
                    $18.50/Pc
                  </Typography>
                  <Box sx={{ display: 'flex', my: 0.5 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Box key={star} component="span" color="#FFB900" sx={{ fontSize: '14px' }}>★</Box>
                    ))}
                  </Box>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', height: '40px', overflow: 'hidden' }}>
                    Insulated Stainless Steel Water Bottle, 24oz
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Left Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                left: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('ComputersProductsContainer');
                if (container) {
                  container.scrollLeft -= container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&lt;</Typography>
            </IconButton>

            {/* Right Arrow */}
            <IconButton 
              size="small" 
              sx={{ 
                position: 'absolute',
                right: { xs: 0, md: -15 },
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#555', 
                bgcolor: '#fff', 
                boxShadow: '0 0 5px rgba(0,0,0,0.2)', 
                borderRadius: '50%',
                width: 30, 
                height: 30,
                zIndex: 1,
                '&:hover': { bgcolor: '#f5f5f5' }
              }}
              onClick={() => {
                const container = document.getElementById('ComputersProductsContainer');
                if (container) {
                  container.scrollLeft += container.offsetWidth;
                }
              }}
            >
              <Typography sx={{ fontSize: 16 }}>&gt;</Typography>
            </IconButton>
          </Box>
        </Box>

{/* Promotional Banners */}
<Box sx={{ mb: 5, width: '100%' }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            width: '100%'
          }}>
            {/* Banner 1 - Valentine's Sale */}
            <Box 
              component="img"
              src="https://t4.ftcdn.net/jpg/04/41/14/65/360_F_441146553_haUBrTpsJJ22bEbsMlgkNosGuWGwbV0t.jpg"
              alt="Valentine's Big Sale"
              sx={{ 
                width: { xs: '100%', md: '33.33%' }, 
                height: { xs: 120, md: 150 },
                objectFit: 'cover',
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                '&:hover': { transform: 'scale(1.02)' }
              }}
            />
            
            {/* Banner 2 - Flash Sale */}
            <Box 
              component="img"
              src="https://mir-s3-cdn-cf.behance.net/project_modules/fs/3ce709113389695.60269c221352f.jpg"
              alt="Flash Sale"
              sx={{ 
                width: { xs: '100%', md: '33.33%' }, 
                height: { xs: 120, md: 150 },
                objectFit: 'cover',
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                '&:hover': { transform: 'scale(1.02)' }
              }}
            />
            
            {/* Banner 3 - 15% Off Everything */}
            <Box 
              component="img"
              src="https://img.freepik.com/premium-vector/ramadan-kareem-sale-banner-template_234845-758.jpg"
              alt="15% Off Everything"
              sx={{ 
                width: { xs: '100%', md: '33.33%' }, 
                height: { xs: 120, md: 150 },
                objectFit: 'cover',
                borderRadius: 1,
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                '&:hover': { transform: 'scale(1.02)' }
              }}
            />
          </Box>
        </Box>


  {/* Featured Brands Section */}
  <Box sx={{ mb: 5, width: '100%' }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            mb: 2 
          }}>
            <Typography 
              variant="h5" 
              component="h2" 
              sx={{ 
                fontWeight: 'bold',
                position: 'relative',
                '&:after': {
                  content: '""',
                  position: 'absolute',
                  bottom: -5,
                  left: 0,
                  width: 60,
                  height: 3,
                  bgcolor: 'primary.main',
                  borderRadius: 1
                }
              }}
            >
              Featured Brands
            </Typography>

            {/* Desktop Navigation Arrows */}
            <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => {
                  const container = document.getElementById('featuredBrandsContainer');
                  if (container) {
                    container.scrollLeft -= 300;
                  }
                }}
                sx={{ minWidth: 0, p: 1 }}
              >
                &#9664;
              </Button>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => {
                  const container = document.getElementById('featuredBrandsContainer');
                  if (container) {
                    container.scrollLeft += 300;
                  }
                }}
                sx={{ minWidth: 0, p: 1 }}
              >
                &#9654;
              </Button>
            </Box>
          </Box>

          {/* Brands Container */}
          <Box sx={{ position: 'relative', overflow: 'hidden' }}>
            <Box 
              id="featuredBrandsContainer"
              sx={{ 
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                scrollBehavior: 'smooth',
                pb: 2,
                '&::-webkit-scrollbar': {
                  display: 'none'
                },
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
              }}
            >
              {/* Brand 1 */}
              <Box 
                onClick={() => navigate('/customer/login')}
                sx={{
                  minWidth: { xs: 150, sm: 180, md: 200 },
                  height: { xs: 100, sm: 120, md: 130 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  p: 2,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3
                  }
                }}>
                <Box 
                  component="img"
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1024px-Amazon_logo.svg.png"
                  alt="Amazon"
                  sx={{ 
                    height: 50,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    mb: 1
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 'medium', textAlign: 'center' }}>
                  Amazon
                </Typography>
              </Box>

              {/* Brand 2 */}
              <Box 
                onClick={() => navigate('/customer/login')}
                sx={{
                  minWidth: { xs: 150, sm: 180, md: 200 },
                  height: { xs: 100, sm: 120, md: 130 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  p: 2,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3
                  }
                }}>
                <Box 
                  component="img"
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/2560px-Samsung_Logo.svg.png"
                  alt="Samsung"
                  sx={{ 
                    height: 50,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    mb: 1
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 'medium', textAlign: 'center' }}>
                  Samsung
                </Typography>
              </Box>

              {/* Brand 3 */}
              <Box 
                onClick={() => navigate('/customer/login')}
                sx={{
                  minWidth: { xs: 150, sm: 180, md: 200 },
                  height: { xs: 100, sm: 120, md: 130 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  p: 2,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3
                  }
                }}>
                <Box 
                  component="img"
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/1667px-Apple_logo_black.svg.png"
                  alt="Apple"
                  sx={{ 
                    height: 50,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    mb: 1
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 'medium', textAlign: 'center' }}>
                  Apple
                </Typography>
              </Box>

              {/* Brand 4 */}
              <Box 
                onClick={() => navigate('/customer/login')}
                sx={{
                  minWidth: { xs: 150, sm: 180, md: 200 },
                  height: { xs: 100, sm: 120, md: 130 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  p: 2,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3
                  }
                }}>
                <Box 
                  component="img"
                  src="https://crystalpng.com/wp-content/uploads/2025/05/lenovo-logo.png"
                  alt="Lenovo"
                  sx={{ 
                    height: 50,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    mb: 1
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 'medium', textAlign: 'center' }}>
                  Lenovo
                </Typography>
              </Box>

              {/* Brand 5 */}
              <Box 
                onClick={() => navigate('/customer/login')}
                sx={{
                  minWidth: { xs: 150, sm: 180, md: 200 },
                  height: { xs: 100, sm: 120, md: 130 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  p: 2,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3
                  }
                }}>
                <Box 
                  component="img"
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Xiaomi_logo_%282021-%29.svg/1024px-Xiaomi_logo_%282021-%29.svg.png"
                  alt="Xiaomi"
                  sx={{ 
                    height: 50,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    mb: 1
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 'medium', textAlign: 'center' }}>
                  Xiaomi
                </Typography>
              </Box>

              {/* Brand 6 */}
              <Box 
                onClick={() => navigate('/customer/login')}
                sx={{
                  minWidth: { xs: 150, sm: 180, md: 200 },
                  height: { xs: 100, sm: 120, md: 130 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  p: 2,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3
                  }
                }}>
                <Box 
                  component="img"
                  src="https://images.icon-icons.com/2845/PNG/512/fila_logo_icon_181400.png"
                  alt="Fila"
                  sx={{ 
                    height: 50,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    mb: 1
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 'medium', textAlign: 'center' }}>
                 FILA
                </Typography>
              </Box>

              {/* Brand 7 */}
              <Box 
              onClick={() => navigate('/customer/login')}
              sx={{
                minWidth: { xs: 150, sm: 180, md: 200 },
                height: { xs: 100, sm: 120, md: 130 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                p: 2,
                transition: 'transform 0.3s, box-shadow 0.3s',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 3
                }
              }}>
                <Box 
                  component="img"
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/HP_LOGO.png/1008px-HP_LOGO.png"
                  alt="Hp"
                  sx={{ 
                    height: 50,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    mb: 1
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 'medium', textAlign: 'center' }}>
                  Hp
                </Typography>
              </Box>

              {/* Brand 8 */}
              <Box
              onClick={() => navigate('/customer/login')}
               sx={{
                minWidth: { xs: 150, sm: 180, md: 200 },
                height: { xs: 100, sm: 120, md: 130 },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e0e0e0',
                borderRadius: 2,
                p: 2,
                transition: 'transform 0.3s, box-shadow 0.3s',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 3
                }
              }}>
                <Box 
                  component="img"
                  src="https://images.seeklogo.com/logo-png/61/1/puma-logo-png_seeklogo-613053.png"
                  alt="Puma"
                  sx={{ 
                    height: 50,
                    maxWidth: '100%',
                    objectFit: 'contain',
                    mb: 1
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 'medium', textAlign: 'center' }}>
                  Puma
                </Typography>
              </Box>
            </Box>

            {/* Mobile Navigation Arrows */}
            <Box sx={{ 
              display: { xs: 'flex', md: 'none' }, 
              justifyContent: 'center',
              mt: 2,
              gap: 1
            }}>
              <IconButton 
                size="small" 
                onClick={() => {
                  const container = document.getElementById('featuredBrandsContainer');
                  if (container) {
                    container.scrollLeft -= 200;
                  }
                }}
                sx={{ 
                  bgcolor: 'background.paper', 
                  boxShadow: 1,
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
              >
                &#9664;
              </IconButton>
              
              <IconButton 
                size="small" 
                onClick={() => {
                  const container = document.getElementById('featuredBrandsContainer');
                  if (container) {
                    container.scrollLeft += 200;
                  }
                }}
                sx={{ 
                  bgcolor: 'background.paper', 
                  boxShadow: 1,
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
              >
                &#9654;
              </IconButton>
            </Box>
          </Box>
        </Box>



            {/* Category Tabs for Non-Authenticated Users */}
            <Box sx={{ mb: 4 }}>
              <Tabs 
                value={activeCategory} 
                onChange={handleCategoryChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontSize: { xs: '0.8rem', sm: '1rem' },
                    minWidth: { xs: 'auto', sm: 120 },
                  }
                }}
              >
                {sampleProductsData.map((category, index) => (
                  <Tab 
                    key={category.id} 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {category.icon}
                        <span>{category.name}</span>
                      </Box>
                    } 
                    id={`tab-${index}`}
                    aria-controls={`tabpanel-${index}`}
                  />
                ))}
              </Tabs>
            </Box>
            
            {/* Render Category Products */}
            {sampleProductsData.length > 0 ? (
              <>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 'medium', ml: 1 }}>
                    {sampleProductsData[activeCategory].name}
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  {currentCategoryProducts.filter(product => !product.hidden).map((product) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={product.uniqueKey}>
                      <Card 
                        sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'visible',
                          transition: 'all 0.3s ease-in-out',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 3
                          }
                        }}
                        onClick={() => navigate('/customer/login')}
                        onMouseEnter={() => setHoveredCard(product.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        {product.isFeatured && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: -10,
                              right: -10,
                              bgcolor: 'error.main',
                              color: 'white',
                              borderRadius: '50%',
                              width: 40,
                              height: 40,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              fontSize: '0.8rem',
                              zIndex: 1,
                              boxShadow: 2
                            }}
                          >
                            HOT
                          </Box>
                        )}
                        {product.discountPercent > 0 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 10,
                              left: 0,
                              bgcolor: 'success.main',
                              color: 'white',
                              py: 0.5,
                              px: 1,
                              fontWeight: 'bold',
                              fontSize: '0.8rem',
                              zIndex: 1,
                              boxShadow: 1
                            }}
                          >
                            {product.discountPercent}% OFF
                          </Box>
                        )}
                        <CardMedia
                          component="img"
                          height="250"
                          image={product.imageUrl}
                          alt={product.name}
                          sx={{ 
                            objectFit: 'cover',
                            width: '100%',
                            height: 250,
                            backgroundColor: '#f5f5f5',
                            aspectRatio: '1/1',
                            objectPosition: 'center',
                            display: 'block',
                            position: 'relative',
                            '& img': {
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              objectPosition: 'center'
                            }
                          }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = product.fallbackImage || DEFAULT_FALLBACK_IMAGE;
                          }}
                        />
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography gutterBottom variant="h6" component="h2" noWrap>
                            {product.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, height: '40px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {product.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" color="primary" fontWeight="bold">
                              ${product.discountPercent > 0 
                                ? (product.price * (1 - product.discountPercent/100)).toFixed(2)
                                : product.price}
                            </Typography>
                            {product.discountPercent > 0 && (
                              <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                                ${product.price}
                              </Typography>
                            )}
                          </Box>
                        </CardContent>
                        <Fade in={hoveredCard === product.id}>
                          <CardActions 
                            sx={{ 
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              bgcolor: 'rgba(0, 0, 0, 0.7)',
                              justifyContent: 'center',
                              p: 1
                            }}
                          >
                            <Button
                              variant="contained"
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate('/customer/login');
                              }}
                              sx={{ color: 'white' }}
                            >
                              Login to View
                            </Button>
                          </CardActions>
                        </Fade>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </>
            ) : null}
          </>
        ) : displayProductsWithKeys.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              No products found matching your search criteria
            </Typography>
            {localSearchTerm && (
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => {
                  navigate('/', { replace: true });
                }}
                sx={{ mt: 2 }}
              >
                Clear Search
              </Button>
            )}
          </Box>
        ) : (
          <Grid container spacing={3}>
            {displayProductsWithKeys.filter(product => !product.hidden).map((product) => {
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.uniqueKey}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      cursor: 'pointer',
                      position: 'relative',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3,
                        transition: 'all 0.3s ease-in-out'
                      }
                    }}
                    onClick={() => handleProductClick(product.id)}
                    onMouseEnter={() => setHoveredCard(product.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <CardMedia
                      component="img"
                      height="250"
                      image={product.imageUrl || DEFAULT_FALLBACK_IMAGE}
                      alt={product.name}
                      sx={{ 
                        objectFit: 'cover',
                        width: '100%',
                        height: 250,
                        backgroundColor: '#f5f5f5',
                        aspectRatio: '1/1',
                        objectPosition: 'center',
                        display: 'block',
                        position: 'relative',
                        '& img': {
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          objectPosition: 'center'
                        }
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = DEFAULT_FALLBACK_IMAGE;
                      }}
                    />
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography gutterBottom variant="h6" component="h2" noWrap>
                        {product.name}
                      </Typography>
                      {/* <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {product.seller?.shopName || 'Unknown Shop'}
                      </Typography> */}
                      <Typography variant="h6" color="primary">
                        ${product.price}
                      </Typography>
                    </CardContent>
                    <Fade in={hoveredCard === product.id}>
                      <CardActions 
                        sx={{ 
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          bgcolor: 'rgba(0, 0, 0, 0.7)',
                          justifyContent: 'space-between',
                          p: 1
                        }}
                      >
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<InfoIcon />}
                          onClick={(e) => handleDetailsClick(e, product.id)}
                          sx={{ color: 'white' }}
                        >
                          Details
                        </Button>
                        {isAuthenticated ? (
                          <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<AddCartIcon />}
                            onClick={(e) => handleAddToCart(e, product)}
                            sx={{ color: 'white' }}
                          >
                            Add to Cart
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            color="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              alert('Please login to add products to cart');
                              navigate('/customer/login');
                            }}
                            sx={{ color: 'white' }}
                          >
                            Login to Buy
                          </Button>
                        )}
                      </CardActions>
                    </Fade>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>
      <Footer />
      <MobileBottomNav />
    </>
  );
};

export default HomePage; 
