import React, { useState } from 'react';
import { 
  Container, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Box,
  Alert,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Input,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CheckCircleOutline
} from '@mui/material';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { uploadToCloudinary } from '../utils/cloudinaryConfig';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Footer from './Footer';

const SELLER_SECRET_KEY = "74682";

const SellerRegister = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [shopName, setShopName] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [country, setCountry] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [frontIdFile, setFrontIdFile] = useState(null);
  const [backIdFile, setBackIdFile] = useState(null);
  const [frontIdPreview, setFrontIdPreview] = useState('');
  const [backIdPreview, setBackIdPreview] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ front: 0, back: 0 });
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (side, e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError(`Please select an image file for the ${side} side of your ID.`);
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError(`The ${side} side image is too large. Please select an image under 5MB.`);
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    if (side === 'front') {
      setFrontIdFile(file);
      setFrontIdPreview(previewUrl);
    } else {
      setBackIdFile(file);
      setBackIdPreview(previewUrl);
    }
  };

  const handleCloseSuccessDialog = () => {
    setSuccessDialogOpen(false);
    navigate('/seller/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsUploading(true);
    
    // Validate all required fields
    if (!email || !password || !name || !phone || !shopName || !secretKey || !country) {
      setError('Please fill in all required fields');
      setIsUploading(false);
      return;
    }
    
    // Validate that password and country match
    if (password !== country) {
      setError('Password and confirm password must match exactly');
      setIsUploading(false);
      return;
    }
    
    // Validate secret key
    if (secretKey !== SELLER_SECRET_KEY) {
      setError('Invalid secret key');
      setIsUploading(false);
      return;
    }

    // Validate ID proof if document type is selected
    if (documentType && (!frontIdFile || !backIdFile)) {
      setError('Please upload both front and back ID proof images');
      setIsUploading(false);
      return;
    }

    try {
      let frontIdUrl = '';
      let backIdUrl = '';

      // Upload ID proof images to Cloudinary if document type is selected
      if (documentType) {
        try {
          // Upload front ID image
          frontIdUrl = await uploadToCloudinary(frontIdFile, (progress) => {
            setUploadProgress(prev => ({ ...prev, front: progress }));
          });
          
          // Upload back ID image
          backIdUrl = await uploadToCloudinary(backIdFile, (progress) => {
            setUploadProgress(prev => ({ ...prev, back: progress }));
          });
        } catch (uploadError) {
          console.error('Error uploading ID images:', uploadError);
          setError('Failed to upload ID images. Please try again.');
          setIsUploading(false);
          return;
        }
      }

      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Add seller details to Firestore
      await setDoc(doc(db, 'sellers', userCredential.user.uid), {
        name,
        email,
        phone,
        shopName,
        country,
        createdAt: new Date().toISOString(),
        role: 'seller',
        status: 'pending',
        approvalRequest: {
          status: 'pending',
          submittedAt: new Date().toISOString()
        },
        documentType: documentType || null,
        idProof: documentType ? {
          frontImage: frontIdUrl,
          backImage: backIdUrl
        } : null
      });

      // Show success message in popup dialog instead of alert
      setSuccessDialogOpen(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Container maxWidth="sm" sx={{ width: '100%', px: { xs: 0, sm: 3, md: 4 } }}>
        <Box sx={{ mt: 8 }}>
          <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            <Typography variant="h4" align="center" gutterBottom>
              Seller Registration
            </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
            />
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
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Shop Name"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Invitation Code"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
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
              helperText="Password must match exactly with the confirm Password field"
            />
            <TextField
              fullWidth
              label="confirm password"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              margin="normal"
              required
              helperText="confirm password must match exactly with the Password field"
            />

            <Box sx={{ mt: 3 }}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Select ID Proof</FormLabel>
                <RadioGroup
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  <FormControlLabel value="AADHAAR" control={<Radio />} label="Id Card" />
                  <FormControlLabel value="PASSPORT" control={<Radio />} label="Passport" />
                  <FormControlLabel value="DRIVING_LICENSE" control={<Radio />} label="Driving License" />
                  <FormControlLabel value="SSN" control={<Radio />} label="Social Security Card" />
                </RadioGroup>
              </FormControl>
            </Box>

            {documentType && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  ID Proof Images
                </Typography>
                
                {/* Front side image upload */}
                <Box sx={{ mt: 2, border: '1px dashed #ccc', p: 2, borderRadius: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    Front Side of ID *
                  </Typography>
                  <Input
                    type="file"
                    inputProps={{ accept: 'image/*' }}
                    onChange={(e) => handleFileChange('front', e)}
                    sx={{ display: 'none' }}
                    id="front-id-upload"
                  />
                  <label htmlFor="front-id-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      sx={{ mb: 2 }}
                    >
                      Upload Front Side
                    </Button>
                  </label>
                  
                  {frontIdPreview && (
                    <Box sx={{ mt: 1, mb: 1 }}>
                      <img 
                        src={frontIdPreview} 
                        alt="Front ID Preview" 
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} 
                      />
                    </Box>
                  )}
                  
                  {isUploading && uploadProgress.front > 0 && (
                    <Box sx={{ width: '100%', mt: 1 }}>
                      <LinearProgress variant="determinate" value={uploadProgress.front} />
                      <Typography variant="body2" align="center">{uploadProgress.front}%</Typography>
                    </Box>
                  )}
                </Box>
                
                {/* Back side image upload */}
                <Box sx={{ mt: 2, border: '1px dashed #ccc', p: 2, borderRadius: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    Back Side of ID *
                  </Typography>
                  <Input
                    type="file"
                    inputProps={{ accept: 'image/*' }}
                    onChange={(e) => handleFileChange('back', e)}
                    sx={{ display: 'none' }}
                    id="back-id-upload"
                  />
                  <label htmlFor="back-id-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      sx={{ mb: 2  }}
                    
                    >
                      Upload Back Side
                    </Button>
                  </label>
                  
                  {backIdPreview && (
                    <Box sx={{ mt: 1, mb: 1 }}>
                      <img 
                        src={backIdPreview} 
                        alt="Back ID Preview" 
                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain' }} 
                      />
                    </Box>
                  )}
                  
                  {isUploading && uploadProgress.back > 0 && (
                    <Box sx={{ width: '100%', mt: 1 }}>
                      <LinearProgress variant="determinate" value={uploadProgress.back} />
                      <Typography variant="body2" align="center">{uploadProgress.back}%</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 3, position: 'relative' }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isUploading}
                sx={{ height: 48 
                  ,backgroundImage: 'linear-gradient(to bottom, #FF4D33, #FF5E46, #FF6E59)',
                '&:hover': {
                  backgroundImage: 'linear-gradient(to bottom, #FF5E46, #FF6E59, #FF7E69)',
                  boxShadow: '0 4px 8px rgba(255, 77, 51, 0.3)'
                }

                }}
              >
                {isUploading ? 'Processing...' : 'Register as Seller'}
              </Button>
              {isUploading && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <CircularProgress size={24} />
                </Box>
              )}
            </Box>

            <Button
              fullWidth
              variant="text"
              sx={{ mt: 1 }}
              onClick={() => navigate('/seller/login')}
              disabled={isUploading}
            >
              Already have a seller account? Login
            </Button>
          </form>
        </Paper>
      </Box>

      {/* Success Dialog Popup */}
      <Dialog
        open={successDialogOpen}
        onClose={handleCloseSuccessDialog}
        aria-labelledby="success-dialog-title"
        aria-describedby="success-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxWidth: 450
          }
        }}
      >
        <DialogTitle id="success-dialog-title" sx={{ textAlign: 'center', pt: 3 }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64, mb: 1 }} />
          <Typography variant="h5" component="div">
            Registration Successful
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="success-dialog-description" sx={{ textAlign: 'center', px: 2 }}>
            Your request for approval has been submitted.Please try to login after 10 minutes.

          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button 
            onClick={handleCloseSuccessDialog} 
            variant="contained" 
            autoFocus
            sx={{ 
              minWidth: 120,
              borderRadius: 6
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
      <Footer />
    </>
  );
};

export default SellerRegister; 
