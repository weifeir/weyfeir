import React from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Link,
  IconButton,
  Divider,
  useTheme,
  Button
} from '@mui/material';
import {
  Facebook,
  Twitter,
  Instagram,
  LinkedIn,
  Email,
  Phone,
  LocationOn,
  Payment,
  Storefront as StorefrontIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Footer = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <Box
      sx={{
        backgroundImage: 'linear-gradient(to bottom, #FF4D33, #FF5E46, #FF6E59)',
        color: 'white',
        pt: 6,
        pb: 3,
        mt: 8,
        position: 'relative',
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)',
        marginRight: 'calc(-50vw + 50%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #ff4081, #7c4dff, #00bcd4, #ff5722)',
        }
      }}
    >
      <Container 
        maxWidth={false}
        sx={{
          maxWidth: '1600px !important',
          px: { xs: 2, sm: 4, md: 6, lg: 8 },
          mx: 'auto'
        }}
      >
        <Grid container spacing={4}>
          {/* About Section */}
          <Grid item xs={12} md={3}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              About Our Store
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.7 }}>
              We provide high-quality products from trusted sellers worldwide. Our missi
              <Link
                href="/admin/login"
                sx={{
                  color: 'inherit',
                  textDecoration: 'none',
                  '&:hover': {
                    color: '#ff4081'
                  }
                }}
              >
                o
              </Link>
              n is to connect buyers with the best products at great prices.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <IconButton color="inherit" aria-label="Facebook">
                <Facebook />
              </IconButton>
              <IconButton color="inherit" aria-label="Twitter">
                <Twitter />
              </IconButton>
              <IconButton color="inherit" aria-label="Instagram">
                <Instagram />
              </IconButton>
              <IconButton color="inherit" aria-label="LinkedIn">
                <LinkedIn />
              </IconButton>
            </Box>
          </Grid>

          {/* Quick Links Section */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Quick Links
            </Typography>
            <Link href="#" color="inherit" sx={{ display: 'block', mb: 1, opacity: 0.7, '&:hover': { opacity: 1 } }}>
              Home
            </Link>
            {/* <Link href="/shop" color="inherit" sx={{ display: 'block', mb: 1, opacity: 0.7, '&:hover': { opacity: 1 } }}>
              Shop
            </Link>
            <Link href="/about" color="inherit" sx={{ display: 'block', mb: 1, opacity: 0.7, '&:hover': { opacity: 1 } }}>
              About Us
            </Link>
            <Link href="/contact" color="inherit" sx={{ display: 'block', mb: 1, opacity: 0.7, '&:hover': { opacity: 1 } }}>
              Contact
            </Link>
            <Link href="/faq" color="inherit" sx={{ display: 'block', mb: 1, opacity: 0.7, '&:hover': { opacity: 1 } }}>
              FAQ
            </Link> */}
            <Button
              variant="contained"
              onClick={() => {
                navigate('/seller/register');
                window.scrollTo(0, 0);
              }}
              startIcon={<StorefrontIcon />}
              sx={{
                mt: 2,
                background: 'linear-gradient(45deg, #FFE135 30%, #FFD700 90%)',
                boxShadow: '0 3px 5px 2px rgba(255, 225, 53, .3)',
                color: '#000',
                '&:hover': {
                  background: 'linear-gradient(45deg, #FFD700 30%, #FFE135 90%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 8px 2px rgba(255, 225, 53, .4)',
                },
                transition: 'all 0.3s ease',
                textTransform: 'none',
                fontWeight: 'bold',
                borderRadius: '25px',
                width: 'fit-content',
                px: 3
              }}
            >
              Apply Now
            </Button>
          </Grid>

          {/* Contact Section */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Contact Us
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <LocationOn sx={{ mr: 1, opacity: 0.7 }} />
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
              4 Copley Place, Floor 7, Boston, MA 02116, USA
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Phone sx={{ mr: 1, opacity: 0.7 }} />
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                +1 2894696121
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Email sx={{ mr: 1, opacity: 0.7 }} />
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
               weyfeir@gmail.com
              </Typography>
            </Box>
            {/* <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Payment sx={{ mr: 1, opacity: 0.7 }} />
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Secure Payment Gateway
              </Typography>
            </Box> */}
          </Grid>

          {/* App Download Section */}
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              APP DOWNLOAD
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.7 }}>
              Get our mobile app for a better shopping experience
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <a 
                href="https://play.google.com/store" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ display: 'block' }}
              >
                <img 
                  src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" 
                  alt="Get it on Google Play"
                  style={{marginLeft: '-7px', width: '160px', height: 'auto', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}
                />
              </a>
              <a 
                href="https://apps.apple.com/app/apple-store" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <img 
                  src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg" 
                  alt="Download on the App Store"
                  style={{ width: '140px', height: 'auto', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' }}
                />
              </a>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
        
        <Box sx={{ textAlign: 'center', opacity: 0.7 }}>
          <Typography variant="body2">
            © {2017} DelightSphere Shopping Store. All rights reserved.
          </Typography>
        
        </Box>
      </Container>
    </Box>
  );
};

export default Footer; 
