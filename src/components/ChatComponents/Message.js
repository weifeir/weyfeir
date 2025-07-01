import React, { useState } from 'react';
import { Box, Typography, Avatar, Paper, styled, alpha, CircularProgress, IconButton, Menu, MenuItem } from '@mui/material';
import { Image, Transformation } from 'cloudinary-react';
import { cloudinary } from '../../utils/cloudinaryConfig';
import { MoreVert as MoreVertIcon, Delete as DeleteIcon } from '@mui/icons-material';

const MessageContainer = styled(Box)(({ theme, isAdmin }) => ({
  display: 'flex',
  justifyContent: isAdmin ? 'flex-end' : 'flex-start',
  marginBottom: theme.spacing(2),
  width: '100%',
  [theme.breakpoints.down('sm')]: {
    marginBottom: theme.spacing(1.5),
  }
}));

const MessageBubble = styled(Box)(({ theme, isCurrentUser }) => ({
  maxWidth: '80%',
  padding: theme.spacing(1.5, 2),
  borderRadius: '1rem',
  backgroundColor: isCurrentUser ? theme.palette.primary.main : 'white',
  color: isCurrentUser ? 'white' : theme.palette.text.primary,
  alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  position: 'relative',
  '& img': {
    maxWidth: '100%',
    borderRadius: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  [theme.breakpoints.down('sm')]: {
    maxWidth: '85%',
    padding: theme.spacing(1, 1.5),
    fontSize: '0.95rem',
  }
}));

const MessageContent = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
});

const MessageTimeStamp = styled(Typography)(({ theme }) => ({
  fontSize: '0.7rem',
  color: theme.palette.text.secondary,
  alignSelf: 'flex-end',
  marginTop: '4px',
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.65rem',
  }
}));

const MessageImage = styled('img')({
  maxWidth: '100%',
  maxHeight: '200px',
  borderRadius: '8px',
  cursor: 'pointer',
  display: 'block',
});

const MessageAvatar = styled(Avatar)(({ theme, isAdmin }) => ({
  width: 36,
  height: 36,
  borderRadius: '50%',
  backgroundColor: isAdmin ? theme.palette.primary.main : theme.palette.grey[300],
  color: isAdmin ? 'white' : theme.palette.text.primary,
  fontSize: '1rem',
  marginRight: theme.spacing(1),
  marginLeft: theme.spacing(1),
  [theme.breakpoints.down('sm')]: {
    width: 30,
    height: 30,
    marginRight: theme.spacing(0.5),
    marginLeft: theme.spacing(0.5),
    fontSize: '0.8rem'
  }
}));

const CloudinaryImage = ({ publicId, url, alt, onClick }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  if (!publicId && url) {
    return (
      <Box sx={{ position: 'relative' }}>
        {loading && (
          <Box sx={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)' 
          }}>
            <CircularProgress size={24} />
          </Box>
        )}
        <MessageImage
          src={url} 
          alt={alt}
          onClick={onClick}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          style={{ display: loading ? 'none' : 'block' }}
        />
      </Box>
    );
  }
  
  const extractPublicId = (cloudinaryUrl) => {
    if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) return null;
    
    try {
      const urlParts = cloudinaryUrl.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      if (uploadIndex === -1) return null;
      
      return urlParts.slice(uploadIndex + 2).join('/');
    } catch (e) {
      console.error('Error extracting Cloudinary public ID:', e);
      return null;
    }
  };
  
  const imagePublicId = publicId || extractPublicId(url);
  
  if (imagePublicId) {
    return (
      <Box sx={{ position: 'relative' }}>
        {loading && (
          <Box sx={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)' 
          }}>
            <CircularProgress size={24} />
          </Box>
        )}
        <Image 
          publicId={imagePublicId} 
          cloudName={cloudinary.config().cloud.cloudName}
          onClick={onClick}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          style={{ 
            maxWidth: '100%', 
            maxHeight: '200px', 
            borderRadius: '8px', 
            cursor: 'pointer',
            display: loading ? 'none' : 'block' 
          }}
        >
          <Transformation quality="auto" fetchFormat="auto" />
          <Transformation crop="limit" width="800" height="600" />
        </Image>
      </Box>
    );
  }
  
  return null;
};

const Message = ({ message, isAdmin, onDeleteMessage }) => {
  const { text, imageUrl, timestamp, senderName, senderUid, id } = message;
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  
  // Display "Customer Care" instead of "mdziq962#@gmail.com" for sender name
  const displayName = senderName === "mdziq962#@gmail.com" || senderName === "Customer Care" ? "Customer Care" : senderName;
  
  // Determine if this message is from the current user (either admin or seller)
  // isAdmin prop now represents whether the current user is admin, not the message sender
  const isCurrentUserMessage = (isAdmin && (senderName === "mdziq962#@gmail.com" || senderName === "Customer Care")) || 
                             (!isAdmin && senderName !== "mdziq962#@gmail.com" && senderName !== "Customer Care");
  
  const formattedTime = timestamp ? new Date(timestamp.toDate()).toLocaleString() : '';
  
  // Calculate and format when the message will be deleted (24 hours after creation)
  const getExpirationTime = () => {
    if (!timestamp) return '';
    
    const messageDate = timestamp.toDate();
    const expirationDate = new Date(messageDate);
    expirationDate.setHours(expirationDate.getHours() + 24);
    
    // Check if message is about to expire
    const now = new Date();
    const hoursRemaining = Math.max(0, Math.floor((expirationDate - now) / (1000 * 60 * 60)));
    const minutesRemaining = Math.max(0, Math.floor(((expirationDate - now) % (1000 * 60 * 60)) / (1000 * 60)));
    
    if (hoursRemaining === 0 && minutesRemaining < 30) {
      return `Expires in ${minutesRemaining} min`;
    } else if (hoursRemaining < 3) {
      return `Expires in ${hoursRemaining}h ${minutesRemaining}m`;
    } else {
      return `Expires: ${expirationDate.toLocaleTimeString()}`;
    }
  };
  
  const handleImageClick = (url) => {
    window.open(url, '_blank');
  };

  const isCloudinaryImage = imageUrl && imageUrl.includes('cloudinary.com');

  // Handle opening the message menu
  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  // Handle closing the message menu
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Handle message deletion
  const handleDeleteMessage = () => {
    handleMenuClose();
    if (onDeleteMessage) {
      onDeleteMessage(id);
    }
  };

  return (
    <MessageContainer isAdmin={isCurrentUserMessage}>
      {!isCurrentUserMessage && (
        <MessageAvatar
          alt={displayName}
          isAdmin={isAdmin}
        />
      )}
      <MessageBubble isCurrentUser={isCurrentUserMessage}>
        <MessageContent>
          {/* Removed Customer Care name display as requested */}
          {text && (
            <Typography variant="body2" sx={{
              fontSize: {xs: '0.9rem', sm: '0.95rem', md: '1rem'},
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap'
            }}>
              {text}
            </Typography>
          )}
          {imageUrl && (
            isCloudinaryImage ? (
              <CloudinaryImage
                url={imageUrl}
                alt="Message attachment"
                onClick={() => handleImageClick(imageUrl)}
              />
            ) : (
              <MessageImage 
                src={imageUrl} 
                alt="Message attachment"
                onClick={() => handleImageClick(imageUrl)}
              />
            )
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            {/* Only show timestamp for admin users */}
            {isAdmin && (
              <MessageTimeStamp variant="caption">
                {formattedTime}
              </MessageTimeStamp>
            )}
            
            {/* Add delete option for admin users */}
            {isAdmin && (
              <>
                <IconButton 
                  size="small" 
                  onClick={handleMenuOpen}
                  sx={{ 
                    padding: '2px',
                    color: isCurrentUserMessage ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)'
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
                <Menu
                  anchorEl={menuAnchorEl}
                  open={Boolean(menuAnchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={handleDeleteMessage}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                    Delete for everyone
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>
        </MessageContent>
      </MessageBubble>
      {isCurrentUserMessage && (
        <MessageAvatar
          alt={senderName === "mdziq962#@gmail.com" || senderName === "Customer Care" ? "Customer Care" : displayName}
          isAdmin={isAdmin}
        />
      )}
    </MessageContainer>
  );
};

export default Message; 
