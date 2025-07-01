import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider, 
  CircularProgress, 
  IconButton, 
  Stack,
  Tooltip,
  styled,
  alpha,
  Menu,
  MenuItem,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import Message from './Message';
import ChatInput from './ChatInput';
import { db } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  getDoc,
  doc,
  updateDoc,
  arrayUnion,
  deleteDoc,
  getDocs
} from 'firebase/firestore';

const ChatWindowContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.background.default,
  position: 'relative',
  [theme.breakpoints.down('sm')]: {
    width: '100vw',
    height: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 1050
  },
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.primary.main,
  color: 'white',
  textAlign: 'center',
  position: 'relative',
  [theme.breakpoints.down('sm')]: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(2),
  }
}));

const HeaderSection = styled(Box)(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(1),
  marginTop: theme.spacing(1),
  borderTop: '1px solid rgba(255, 255, 255, 0.2)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  color: 'white',
}));

const MessageContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  width: '100%',
  padding: theme.spacing(2),
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  backgroundColor: '#f5f5f5',
  [theme.breakpoints.down('sm')]: {
    paddingBottom: theme.spacing(4),
  }
}));

const InputContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: 'white',
  borderTop: `1px solid ${theme.palette.divider}`,
  [theme.breakpoints.down('sm')]: {
    position: 'sticky',
    bottom: 0,
    left: 0,
    width: '100%',
    zIndex: 10,
    padding: theme.spacing(1.5),
    borderRadius: theme.spacing(2, 2, 0, 0),
    boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
  }
}));

const NoConversationContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: theme.spacing(3),
  backgroundColor: '#f5f5f5',
  textAlign: 'center',
  '& > *': {
    marginBottom: theme.spacing(1),
  },
}));

const AvatarIcon = styled(Box)(({ theme }) => ({
  width: 60,
  height: 60,
  borderRadius: '50%',
  backgroundColor: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: theme.spacing(2),
  '& svg': {
    width: 32,
    height: 32,
    color: theme.palette.primary.main,
  },
}));

const ChatWindow = ({ 
  selectedChatId, 
  onBackClick, 
  currentUserUid, 
  currentUserName,
  isAdmin,
  otherUserDetails,
  onDeleteChat,
  onMessageSent
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef(null);
  const [localUserDetails, setLocalUserDetails] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const theme = useTheme();
  const [sellerStatus, setSellerStatus] = useState(null);
  
  // Add state for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Load seller status from localStorage and listen for changes
  useEffect(() => {
    if (!isAdmin) {
      const status = localStorage.getItem('sellerStatus');
      setSellerStatus(status);
      
      // Set up a listener for changes to localStorage
      const handleStorageChange = (e) => {
        if (e.key === 'sellerStatus') {
          setSellerStatus(e.newValue);
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      // Periodically check seller status from Firestore
      const checkSellerStatus = async () => {
        try {
          const sellerId = localStorage.getItem('sellerId');
          if (!sellerId) return;
          
          const sellerRef = doc(db, 'sellers', sellerId);
          const sellerDoc = await getDoc(sellerRef);
          
          if (sellerDoc.exists()) {
            const firebaseStatus = sellerDoc.data().status;
            
            // If status has changed, update localStorage
            if (firebaseStatus !== status) {
              localStorage.setItem('sellerStatus', firebaseStatus);
              setSellerStatus(firebaseStatus);
            }
          }
        } catch (error) {
          console.error('Error checking seller status:', error);
        }
      };
      
      // Check status immediately
      checkSellerStatus();
      
      // Set interval to check status periodically (every 60 seconds)
      const intervalId = setInterval(checkSellerStatus, 60000);
      
      // Clean up event listener and interval
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        clearInterval(intervalId);
      };
    }
  }, [isAdmin]);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Load messages for the selected chat
  useEffect(() => {
    if (!selectedChatId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    const messagesRef = collection(db, 'chats', selectedChatId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMessages(messagesList);
      setLoading(false);
      
      // Mark messages as read
      if (messagesList.length > 0) {
        markMessagesAsRead();
      }
    });
    
    return () => unsubscribe();
  }, [selectedChatId, currentUserUid]);
  
  // Mark messages as read
  const markMessagesAsRead = async () => {
    if (!selectedChatId) return;
    
    try {
      const chatRef = doc(db, 'chats', selectedChatId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        // Determine which field to update based on whether user is admin
        const fieldToUpdate = isAdmin 
          ? 'adminUnreadCount' 
          : 'sellerUnreadCount';
        
        await updateDoc(chatRef, {
          [fieldToUpdate]: 0
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };
  
  // Send a new message
  const handleSendMessage = async (text, imageUrl) => {
    if ((!text || text.trim() === '') && !imageUrl) return;
    
    try {
      // Get user data from localStorage if currentUserUid is not available 
      // (this happens when using localStorage persistence)
      let senderUid = currentUserUid;
      let senderName = currentUserName;
      
      if (!senderUid) {
        if (isAdmin) {
          // For admin users
          senderUid = localStorage.getItem('adminId');
          senderName = "Customer Care"; // Always use "Customer Care" for admin instead of email
          
          if (!senderUid) {
            console.error('No admin ID available');
            return;
          }
        } else {
          // For seller users
          senderUid = localStorage.getItem('sellerId');
          senderName = localStorage.getItem('sellerName') || 
                     localStorage.getItem('sellerShopName') || 
                     localStorage.getItem('sellerEmail') || 'Seller';
          
          if (!senderUid) {
            console.error('No seller ID available');
            return;
          }
        }
      } else if (isAdmin) {
        // Always use "Customer Care" as the sender name for admin users
        senderName = "Customer Care";
      }
      
      // Add the message to the messages subcollection
      await addDoc(collection(db, 'chats', selectedChatId, 'messages'), {
        text: text || '',
        imageUrl: imageUrl || null,
        senderUid: senderUid,
        senderName: senderName,
        timestamp: serverTimestamp(),
        isRead: false
      });
      
      // Update the chat document with the last message
      const chatRef = doc(db, 'chats', selectedChatId);
      
      await updateDoc(chatRef, {
        lastMessage: {
          text: text || '',
          imageUrl: imageUrl || null,
          senderUid: senderUid,
          timestamp: serverTimestamp()
        },
        lastMessageTime: serverTimestamp(),
        // Increment unread count for the other user
        [isAdmin ? 'sellerUnreadCount' : 'adminUnreadCount']: arrayUnion(1)
      });
      
      // Call the onMessageSent callback if it exists (for both admin and seller)
      if (onMessageSent) {
        console.log(`Message sent by ${isAdmin ? 'admin' : 'seller'}, calling onMessageSent callback`);
        onMessageSent();
      } else {
        console.log(`Message sent by ${isAdmin ? 'admin' : 'seller'}, but no onMessageSent callback provided`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Fetch other user details when selected chat changes
  useEffect(() => {
    const fetchOtherUserDetails = async () => {
      if (!selectedChatId) {
        setLocalUserDetails(null);
        return;
      }
      
      try {
        const chatDoc = await getDoc(doc(db, 'chats', selectedChatId));
        if (!chatDoc.exists()) return;
        
        const chatData = chatDoc.data();
        const otherUserUid = isAdmin ? chatData.sellerUid : chatData.adminUid;
        
        // If the current user is a seller and the other user is an admin, display "Customer Care"
        if (!isAdmin) {
          setLocalUserDetails({
            uid: otherUserUid,
            displayName: "Customer Care"
          });
          return;
        }
        
        // If the current user is an admin, make sure to display seller's email
        const userDoc = await getDoc(doc(db, isAdmin ? 'sellers' : 'admins', otherUserUid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          if (isAdmin) {
            // For admin dashboard, always show seller's email
            setLocalUserDetails({
              uid: otherUserUid,
              displayName: userData.email || 'Unknown User'
            });
          } else {
            // For other cases, use normal display hierarchy
            setLocalUserDetails({
              uid: otherUserUid,
              displayName: userData.displayName || userData.shopName || userData.email || 'Unknown User'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching chat details:', error);
      }
    };
    
    fetchOtherUserDetails();
  }, [selectedChatId, isAdmin]);

  // Use either the props otherUserDetails or our local state
  const displayUserDetails = otherUserDetails || localUserDetails;
  
  // Ensure admin email is hidden and displayed as Customer Care
  const displayName = displayUserDetails?.displayName === "mdziq962#@gmail.com" || displayUserDetails?.displayName === "Customer Care" 
    ? "Customer Care" 
    : displayUserDetails?.displayName || 'Chat';

  // Handle menu open
  const handleMenuOpen = (event) => {
    setMenuAnchorEl(event.currentTarget);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  // Handle chat deletion
  const handleDeleteChat = () => {
    if (onDeleteChat && selectedChatId) {
      if (window.confirm('Are you sure you want to clear this conversation? This will remove all messages except the initial "How can I help you?" message.')) {
        onDeleteChat(selectedChatId);
      }
    }
    handleMenuClose();
  };

  // Handle message deletion (new function)
  const handleMessageDelete = async (messageId) => {
    if (!messageId || !selectedChatId) return;
    
    try {
      setDeleteLoading(true);
      
      // Delete the message from the Firestore collection
      await deleteDoc(doc(db, 'chats', selectedChatId, 'messages', messageId));
      
      // Update the messages list in state
      setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      
      // Check if we need to update the last message in the chat document
      const chatRef = doc(db, 'chats', selectedChatId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        
        // If the deleted message was the last message, update to the previous message
        // Get all remaining messages
        const messagesRef = collection(db, 'chats', selectedChatId, 'messages');
        const messagesQuery = query(messagesRef, orderBy('timestamp', 'desc'), where("id", "!=", messageId));
        const messagesSnapshot = await getDocs(messagesQuery);
        
        if (!messagesSnapshot.empty) {
          // Get the most recent message (which is now the last message)
          const lastMessage = messagesSnapshot.docs[0].data();
          
          // Update the chat document with the new last message
          await updateDoc(chatRef, {
            lastMessage: {
              text: lastMessage.text || '',
              imageUrl: lastMessage.imageUrl || null,
              senderUid: lastMessage.senderUid,
              timestamp: lastMessage.timestamp
            },
            lastMessageTime: lastMessage.timestamp
          });
        }
      }
      
      setDeleteLoading(false);
      console.log(`Message ${messageId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting message:', error);
      setDeleteLoading(false);
    }
  };

  // Handle confirmation before deleting message
  const confirmDeleteMessage = (messageId) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleConfirmDelete = () => {
    if (messageToDelete) {
      handleMessageDelete(messageToDelete);
    }
    setDeleteDialogOpen(false);
    setMessageToDelete(null);
  };

  // Handle delete cancellation
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setMessageToDelete(null);
  };

  // Function to manually refresh messages
  const refreshMessages = async () => {
    if (!selectedChatId || refreshing) return;
    
    setRefreshing(true);
    
    try {
      // Requery the messages collection
      const messagesRef = collection(db, 'chats', selectedChatId, 'messages');
      const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
      
      const snapshot = await getDocs(messagesQuery);
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMessages(messagesList);
      
      // Mark messages as read
      if (messagesList.length > 0) {
        await markMessagesAsRead();
      }
      
      // Check if seller status has changed
      if (!isAdmin) {
        const sellerId = localStorage.getItem('sellerId');
        if (sellerId) {
          const sellerRef = doc(db, 'sellers', sellerId);
          const sellerDoc = await getDoc(sellerRef);
          
          if (sellerDoc.exists()) {
            const firebaseStatus = sellerDoc.data().status;
            localStorage.setItem('sellerStatus', firebaseStatus);
            setSellerStatus(firebaseStatus);
          }
        }
      }
      
      console.log('Chat refreshed manually');
    } catch (error) {
      console.error('Error refreshing messages:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (!selectedChatId) {
    return (
      <ChatWindowContainer>
        <ChatHeader>
          {onBackClick && (
            <IconButton 
              onClick={onBackClick} 
              sx={{ 
                position: 'absolute', 
                left: 8, 
                top: 8, 
                color: 'white',
                [theme.breakpoints.down('sm')]: {
                  top: 12
                }
              }} 
              size="small"
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Chat
          </Typography>
          <AvatarIcon>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
          </AvatarIcon>
          <Typography variant="h5" sx={{ fontWeight: 'medium', mb: 1 }}>
            Questions? Chat with us!
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50' }} />
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Typically replies under 6 minutes
            </Typography>
          </Box>
          
          <HeaderSection>
            <Typography variant="body2">
              Seller Support Chat
            </Typography>
          </HeaderSection>
        </ChatHeader>
        <NoConversationContainer>
          <Typography variant="body1" color="text.secondary">
            Start a conversation with our customer service team
          </Typography>
        </NoConversationContainer>
      </ChatWindowContainer>
    );
  }

  return (
    <ChatWindowContainer>
      <ChatHeader>
        <IconButton 
          onClick={onBackClick} 
          sx={{ 
            position: 'absolute', 
            left: 8, 
            top: 8, 
            color: 'white',
            [theme.breakpoints.down('sm')]: {
              top: 12
            }
          }} 
          size="small"
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">
          {displayName}
        </Typography>
        
        {/* Refresh button - visible for both admin and sellers */}
        <Tooltip title="Refresh messages">
          <IconButton 
            onClick={refreshMessages} 
            disabled={refreshing}
            sx={{ 
              position: 'absolute', 
              right: isAdmin ? 40 : 8,  // Position to the left of the menu button for admin
              top: 8, 
              color: 'white',
              [theme.breakpoints.down('sm')]: {
                top: 12
              }
            }}
            size="small"
          >
            {refreshing ? 
              <CircularProgress size={20} color="inherit" /> : 
              <RefreshIcon fontSize="small" />
            }
          </IconButton>
        </Tooltip>
        
        {isAdmin && (
          <IconButton 
            size="small" 
            onClick={handleMenuOpen}
            sx={{ 
              position: 'absolute', 
              right: 8, 
              top: 8, 
              color: 'white',
              [theme.breakpoints.down('sm')]: {
                top: 12
              }
            }}
            aria-label="Delete chat"
            title="Delete conversation"
          >
            <MoreVertIcon />
          </IconButton>
        )}
        
        <HeaderSection>
          <Typography variant="body2">
            Seller Support Chat
          </Typography>
        </HeaderSection>
        
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
          <MenuItem onClick={handleDeleteChat} sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Clear Conversation
          </MenuItem>
        </Menu>
      </ChatHeader>
      
      {/* Add verification status notification for non-verified sellers */}
      {!isAdmin && sellerStatus === 'pending' && (
        <Box 
          sx={{
            p: 2,
            bgcolor: '#FFF3E0',
            color: '#E65100',
            textAlign: 'center',
            fontWeight: 'bold',
            position: 'relative',
            zIndex: 10,
            display: { xs: 'block', sm: 'none' } // Only show on mobile
          }}
        >
          Account is not verified. contact your customer care.
        </Box>
      )}
      
      {/* Add frozen account notification for sellers in mobile browser display */}
      {!isAdmin && sellerStatus === 'frozen' && (
        <Box 
          sx={{
            p: 2,
            bgcolor: '#FFEBEE',
            color: 'error.dark',
            textAlign: 'center',
            fontWeight: 'bold',
            display: { xs: 'block', sm: 'none' }, // Only show on mobile
            position: 'relative',
            zIndex: 10
          }}
        >
          Your account is frozen.
        </Box>
      )}
      
      <MessageContainer>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {messages.map((message) => (
              <Message 
                key={message.id} 
                message={message} 
                isAdmin={isAdmin}
                onDeleteMessage={isAdmin ? confirmDeleteMessage : undefined} 
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </MessageContainer>
      
      <InputContainer>
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isAdmin={isAdmin}
          selectedChatId={selectedChatId}
          disabled={!isAdmin && sellerStatus === "inactive"}
        />
      </InputContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
      >
        <DialogTitle>Delete Message</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this message for everyone? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </ChatWindowContainer>
  );
};

export default ChatWindow; 
