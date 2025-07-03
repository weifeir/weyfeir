import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, useMediaQuery, useTheme, Drawer, IconButton, styled, alpha, Button, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText, CircularProgress, TextField, InputAdornment } from '@mui/material';
import { Menu as MenuIcon, Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import { db, auth } from '../../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc, 
  serverTimestamp,
  getDocs,
  or,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { cloudinary } from '../../utils/cloudinaryConfig';
import { initializeChatCleanupWorker } from '../../utils/chatCleanup';
import { useNavigate } from 'react-router-dom';

// Add a flag to track if Cloudinary is properly configured
let isCloudinaryConfigured = false;

// Check Cloudinary configuration
try {
  const cloudName = cloudinary.config().cloud.cloudName;
  if (cloudName && cloudName !== 'your-cloud-name') {
    isCloudinaryConfigured = true;
    console.log('Cloudinary integration enabled');
  } else {
    console.warn('Cloudinary not configured properly. Using Firebase Storage as fallback.');
  }
} catch (error) {
  console.error('Error initializing Cloudinary:', error);
}

const ChatContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  width: '100%',
  display: 'flex',
  overflow: 'hidden',
  backgroundColor: alpha(theme.palette.background.paper, 0.9),
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    height: '100vh'
  }
}));

const SidebarContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  overflow: 'hidden',
}));

const SidebarHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.8),
}));

// Add a new styled component for the scrollable chat list container
const ScrollableChatListContainer = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflowY: 'auto',
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.4),
  },
}));

const Chat = ({ isAdmin, onMessageSent }) => {
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [otherUserDetails, setOtherUserDetails] = useState(null);
  const [currentUserUid, setCurrentUserUid] = useState(null);
  const [currentUserName, setCurrentUserName] = useState(null);
  
  // New state for seller selection dialog
  const [showSellerDialog, setShowSellerDialog] = useState(false);
  const [availableSellers, setAvailableSellers] = useState([]);
  const [sellerSearchQuery, setSellerSearchQuery] = useState('');
  const [loadingSellers, setLoadingSellers] = useState(false);
  
  // Add states for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  // Initialize the chat cleanup worker once when the component mounts
  useEffect(() => {
    // Only initialize the worker once, preferably if the user is an admin or seller
    if (currentUserUid) {
      console.log('Initializing chat worker for permanent message retention');
      initializeChatCleanupWorker();
    }
    
    // No cleanup needed for this effect as the worker will stop when the app is closed
  }, [currentUserUid]);
  
  // Get current user's UID and details
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setCurrentUserUid(user.uid);
        
        // Get current user profile data
        try {
          let userDoc;
          
          if (isAdmin) {
            userDoc = await getDoc(doc(db, 'admins', user.uid));
          } else {
            userDoc = await getDoc(doc(db, 'sellers', user.uid));
          }
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentUserName(userData.displayName || userData.shopName || userData.email || 'User');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        // Check localStorage for stored credentials when Firebase Auth doesn't have a user
        if (isAdmin) {
          // For admin users
          const adminId = localStorage.getItem('adminId');
          const adminEmail = localStorage.getItem('adminEmail');
          
          if (adminId) {
            console.log('Using admin data from localStorage:', adminId);
            setCurrentUserUid(adminId);
            setCurrentUserName(adminEmail || 'Admin');
            
            // Try to fetch fresh admin data
            try {
              const adminDoc = await getDoc(doc(db, 'admins', adminId));
              if (adminDoc.exists()) {
                const userData = adminDoc.data();
                setCurrentUserName(userData.displayName || userData.email || 'Admin');
              }
            } catch (error) {
              console.error('Error fetching admin profile from Firestore:', error);
            }
          } else {
            setCurrentUserUid(null);
            setCurrentUserName(null);
          }
        } else {
          // For seller users
          const sellerId = localStorage.getItem('sellerId');
          const sellerEmail = localStorage.getItem('sellerEmail');
          const sellerName = localStorage.getItem('sellerName');
          const sellerShopName = localStorage.getItem('sellerShopName');
          
          if (sellerId) {
            console.log('Using seller data from localStorage:', sellerId);
            setCurrentUserUid(sellerId);
            setCurrentUserName(sellerName || sellerShopName || sellerEmail || 'Seller');
            
            // Try to fetch fresh seller data
            try {
              const sellerDoc = await getDoc(doc(db, 'sellers', sellerId));
              if (sellerDoc.exists()) {
                const userData = sellerDoc.data();
                setCurrentUserName(userData.displayName || userData.shopName || userData.email || 'Seller');
              }
            } catch (error) {
              console.error('Error fetching seller profile from Firestore:', error);
            }
          } else {
            setCurrentUserUid(null);
            setCurrentUserName(null);
          }
        }
      }
    });
    
    return () => unsubscribe();
  }, [isAdmin]);
  
  // Load chats for the current user
  useEffect(() => {
    // Check localStorage for user data if we don't have currentUserUid yet
    if (!currentUserUid) {
      if (isAdmin) {
        const adminId = localStorage.getItem('adminId');
        if (adminId) {
          console.log('Setting admin ID from localStorage:', adminId);
          setCurrentUserUid(adminId);
          return; // The effect will run again with the userId set
        }
      } else {
        const sellerId = localStorage.getItem('sellerId');
        if (sellerId) {
          console.log('Setting seller ID from localStorage:', sellerId);
          setCurrentUserUid(sellerId);
          return; // The effect will run again with the userId set
        }
      }
    }
    
    if (!currentUserUid) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Create query based on user role
    const chatsRef = collection(db, 'chats');
    let chatQuery;
    
    if (isAdmin) {
      // For admins: get all chats in the system
      // This ensures any admin can see all seller conversations
      chatQuery = query(chatsRef);
    } else {
      // For sellers: only get chats where they are the seller
      chatQuery = query(chatsRef, where('sellerUid', '==', currentUserUid));
    }
    
    const unsubscribe = onSnapshot(chatQuery, async (snapshot) => {
      // Map the chat documents to state, including other user details
      const chatPromises = snapshot.docs.map(async (docSnapshot) => {
        const chatData = docSnapshot.data();
        
        // Determine other user ID
        const otherUserUid = isAdmin ? chatData.sellerUid : chatData.adminUid;
        
        // Set unread count based on user role
        const unreadCount = isAdmin ? chatData.adminUnreadCount || 0 : chatData.sellerUnreadCount || 0;
        
        // Get other user details
        let otherUserName = 'Unknown User';
        
        try {
          if (!isAdmin && otherUserUid) {
            // If current user is a seller and other user is admin, always show "Customer Care"
            otherUserName = "Customer Care";
            // Also store the admin email but it won't be displayed
            otherUserDetails = {
              displayName: "Customer Care",
              email: "sellnova66@gmail.com"
            };
          } else {
            const userDoc = await getDoc(doc(db, isAdmin ? 'sellers' : 'admins', otherUserUid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (isAdmin) {
                // Admin viewing a seller chat - always display the seller's email
                otherUserName = userData.email || 'Unknown User';
              } else {
                // Normal display name hierarchy for other cases
                otherUserName = userData.displayName || userData.shopName || userData.email || 'Unknown User';
              }
            }
          }
        } catch (error) {
          console.error('Error fetching other user details:', error);
        }
        
        return {
          id: docSnapshot.id,
          ...chatData,
          otherUserUid,
          otherUserName,
          unreadCount
        };
      });
      
      const chatsList = await Promise.all(chatPromises);
      
      // Sort chats by last message time (newest first)
      chatsList.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return b.lastMessageTime.seconds - a.lastMessageTime.seconds;
      });
      
      setChats(chatsList);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [currentUserUid, isAdmin]);
  
  // Fetch other user details when selected chat changes
  useEffect(() => {
    const fetchOtherUserDetails = async () => {
      if (!selectedChatId) {
        setOtherUserDetails(null);
        return;
      }
      
      const selectedChat = chats.find(chat => chat.id === selectedChatId);
      if (!selectedChat) return;
      
      try {
        if (!isAdmin) {
          // If this is a seller viewing admin messages, always display as Customer Care
          setOtherUserDetails({
            uid: selectedChat.otherUserUid,
            displayName: "Customer Care",
            email: "sellnova66@gmail.com" // Update email but it won't be displayed
          });
        } else {
          // Admin viewing seller details
          const userDoc = await getDoc(doc(db, 'sellers', selectedChat.otherUserUid));
          if (userDoc.exists()) {
            setOtherUserDetails({
              uid: selectedChat.otherUserUid,
              ...userDoc.data()
            });
          }
        }
      } catch (error) {
        console.error('Error fetching other user details:', error);
      }
    };
    
    fetchOtherUserDetails();
  }, [selectedChatId, chats, isAdmin]);
  
  // Function to fetch all sellers for admin
  const fetchAvailableSellers = async () => {
    if (!isAdmin || !currentUserUid) return;
    
    setLoadingSellers(true);
    try {
      const sellersRef = collection(db, 'sellers');
      // Only include active and frozen sellers
      const q = query(sellersRef, where('status', 'in', ['active', 'frozen']));
      const querySnapshot = await getDocs(q);
      
      const sellers = [];
      querySnapshot.forEach((doc) => {
        const sellerData = doc.data();
        sellers.push({
          id: doc.id,
          name: sellerData.shopName || sellerData.name || sellerData.email || 'Unknown Seller',
          email: sellerData.email || 'No email',
          status: sellerData.status || 'unknown'
        });
      });
      
      // Sort alphabetically by name
      sellers.sort((a, b) => a.name.localeCompare(b.name));
      
      setAvailableSellers(sellers);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    } finally {
      setLoadingSellers(false);
    }
  };

  // Modified to automatically create or get existing chat for sellers
  useEffect(() => {
    if (!currentUserUid || isAdmin) return;

    const setupSellerChat = async () => {
      try {
        // Find admin user
        const adminsRef = collection(db, 'admins');
        const adminsSnapshot = await getDocs(adminsRef);
        
        if (adminsSnapshot.empty) {
          console.error('No admin found');
          return;
        }
        
        // Use the first admin
        const adminDoc = adminsSnapshot.docs[0];
        const adminUid = adminDoc.id;
        
        // Check if a chat already exists
        const chatsRef = collection(db, 'chats');
        const existingChatQuery = query(
          chatsRef, 
          where('sellerUid', '==', currentUserUid),
          where('adminUid', '==', adminUid)
        );
        
        const existingChatsSnapshot = await getDocs(existingChatQuery);
        
        let chatId;
        let isNewChat = false;
        
        if (existingChatsSnapshot.empty) {
          isNewChat = true;
          // Create a new chat document
          const newChatRef = await addDoc(chatsRef, {
            sellerUid: currentUserUid,
            adminUid: adminUid,
            createdAt: serverTimestamp(),
            lastMessageTime: serverTimestamp(),
            adminUnreadCount: 0,
            sellerUnreadCount: 1,
            lastMessage: {
              text: "How can I help you?",
              senderUid: adminUid,
              timestamp: serverTimestamp()
            }
          });
          
          chatId = newChatRef.id;
        } else {
          // Use existing chat
          chatId = existingChatsSnapshot.docs[0].id;
        }
        
        // If this is a new chat, add the default welcome message
        if (isNewChat) {
          await addDoc(collection(db, 'chats', chatId, 'messages'), {
            text: "How can I help you?",
            imageUrl: null,
            senderUid: adminUid,
            senderName: "Customer Care",
            timestamp: serverTimestamp(),
            isRead: false
          });
        }
        
        setSelectedChatId(chatId);
      } catch (error) {
        console.error('Error setting up seller chat:', error);
      }
    };

    setupSellerChat();
  }, [currentUserUid, isAdmin]);

  // Filter sellers based on search query
  const filteredSellers = sellerSearchQuery.trim() === '' 
    ? availableSellers 
    : availableSellers.filter(seller => 
        seller.name.toLowerCase().includes(sellerSearchQuery.toLowerCase()) ||
        seller.email.toLowerCase().includes(sellerSearchQuery.toLowerCase())
      );

  // Start a new chat
  const startNewChat = async (sellerUid, sellerName) => {
    if (!currentUserUid) return;
    
    try {
      // For admin users, we need the seller's UID
      if (isAdmin) {
        if (!sellerUid) {
          console.error('No seller UID provided');
          return;
        }
        
        // Check if a chat already exists between this admin and seller
        const chatsRef = collection(db, 'chats');
        const existingChatQuery = query(
          chatsRef, 
          where('sellerUid', '==', sellerUid),
          where('adminUid', '==', currentUserUid)
        );
        
        const existingChatsSnapshot = await getDocs(existingChatQuery);
        
        let chatId;
        let isNewChat = false;
        
        if (existingChatsSnapshot.empty) {
          // Create a new chat document
          const newChatRef = await addDoc(chatsRef, {
            sellerUid: sellerUid,
            adminUid: currentUserUid,
            createdAt: serverTimestamp(),
            lastMessageTime: serverTimestamp(),
            adminUnreadCount: 0,
            sellerUnreadCount: 1,
            lastMessage: {
              text: "How can I help you?",
              senderUid: currentUserUid,
              timestamp: serverTimestamp()
            }
          });
          
          chatId = newChatRef.id;
          isNewChat = true;
        } else {
          // Use existing chat
          chatId = existingChatsSnapshot.docs[0].id;
        }
        
        // If this is a new chat, add the default welcome message
        if (isNewChat) {
          await addDoc(collection(db, 'chats', chatId, 'messages'), {
            text: "How can I help you?",
            imageUrl: null,
            senderUid: currentUserUid,
            senderName: "Customer Care",
            timestamp: serverTimestamp(),
            isRead: false
          });
        }
        
        setSelectedChatId(chatId);
        setShowSellerDialog(false); // Close the dialog after selecting a seller
      } else {
        // For seller users (original functionality)
        // Find admin user
        const adminsRef = collection(db, 'admins');
        const adminsSnapshot = await getDocs(adminsRef);
        
        if (adminsSnapshot.empty) {
          console.error('No admin found');
          return;
        }
        
        // Use the first admin (this is a simplification, might need to be adjusted)
        const adminDoc = adminsSnapshot.docs[0];
        const adminUid = adminDoc.id;
        
        // Check if a chat already exists
        const chatsRef = collection(db, 'chats');
        const existingChatQuery = query(
          chatsRef, 
          where('sellerUid', '==', currentUserUid),
          where('adminUid', '==', adminUid)
        );
        
        const existingChatsSnapshot = await getDocs(existingChatQuery);
        
        let chatId;
        let isNewChat = false;
        
        if (existingChatsSnapshot.empty) {
          // Create a new chat document
          const newChatRef = await addDoc(chatsRef, {
            sellerUid: currentUserUid,
            adminUid: adminUid,
            createdAt: serverTimestamp(),
            lastMessageTime: serverTimestamp(),
            adminUnreadCount: 0,
            sellerUnreadCount: 1,
            lastMessage: {
              text: "How can I help you?",
              senderUid: adminUid,
              timestamp: serverTimestamp()
            }
          });
          
          chatId = newChatRef.id;
          isNewChat = true;
        } else {
          // Use existing chat
          chatId = existingChatsSnapshot.docs[0].id;
        }
        
        // If this is a new chat, add the default welcome message
        if (isNewChat) {
          await addDoc(collection(db, 'chats', chatId, 'messages'), {
            text: "How can I help you?",
            imageUrl: null,
            senderUid: adminUid,
            senderName: "Customer Care",
            timestamp: serverTimestamp(),
            isRead: false
          });
        }
        
        setSelectedChatId(chatId);
      }
      
      setSidebarOpen(false);
    } catch (error) {
      console.error('Error starting new chat:', error);
    }
  };
  
  // Handle chat selection
  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };
  
  // Handle back button in mobile view
  const handleBackClick = () => {
    if (!isAdmin) {
      // For sellers, navigate to seller dashboard
      navigate('/seller/dashboard');
    } else {
      // For admin, keep the existing functionality
      setSelectedChatId(null);
      if (isMobile) {
        setSidebarOpen(true);
      }
    }
  };
  
  // Toggle sidebar on mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  // Modify the useEffect for the admin to fetch sellers when they open the dialog
  useEffect(() => {
    if (showSellerDialog && isAdmin) {
      fetchAvailableSellers();
    }
  }, [showSellerDialog, isAdmin]);
  
  // Function to open the delete confirmation dialog
  const confirmDeleteChat = (chatId) => {
    setChatToDelete(chatId);
    setDeleteDialogOpen(true);
  };
  
  // Function to close the delete confirmation dialog
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setChatToDelete(null);
  };
  
  // Function to handle chat deletion after confirmation
  const handleDeleteChat = async () => {
    if (!chatToDelete) return;
    
    try {
      setDeleteLoading(true);
      
      // Get the chat document to find seller information
      const chatDoc = await getDoc(doc(db, 'chats', chatToDelete));
      if (!chatDoc.exists()) {
        console.error('Chat does not exist');
        setDeleteLoading(false);
        closeDeleteDialog();
        return;
      }
      
      const chatData = chatDoc.data();
      const sellerId = chatData.sellerUid;
      const adminUid = chatData.adminUid;
      
      // Use a batch write to ensure all operations succeed or fail together
      const batch = writeBatch(db);
      
      // 1. Get all messages except the default "How can I help you?" message
      console.log(`Processing messages from chat ${chatToDelete}`);
      const messagesRef = collection(db, 'chats', chatToDelete, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      let defaultWelcomeMessageId = null;
      let hasDefaultMessage = false;
      
      // Find messages to delete (preserving the welcome message)
      if (!messagesSnapshot.empty) {
        messagesSnapshot.forEach((messageDoc) => {
          const messageData = messageDoc.data();
          
          // Check if this is the default welcome message from admin
          if (messageData.text === "How can I help you?" && 
              messageData.senderUid === adminUid &&
              messageData.senderName === "Customer Care") {
            hasDefaultMessage = true;
            defaultWelcomeMessageId = messageDoc.id;
            console.log('Found default welcome message, will preserve it');
          } else {
            // Delete all other messages
            batch.delete(doc(db, 'chats', chatToDelete, 'messages', messageDoc.id));
          }
        });
        
        console.log(`Deleting ${messagesSnapshot.size - (hasDefaultMessage ? 1 : 0)} messages`);
      }
      
      // 2. Reset the chat document instead of deleting it
      if (hasDefaultMessage) {
        // Update the chat document to reset it with only the welcome message
        batch.update(doc(db, 'chats', chatToDelete), {
          lastMessage: {
            text: "How can I help you?",
            senderUid: adminUid,
            timestamp: serverTimestamp()
          },
          lastMessageTime: serverTimestamp(),
          adminUnreadCount: 0,
          sellerUnreadCount: 1,  // Set to 1 to notify seller
          createdAt: serverTimestamp() // Reset creation time
        });
        
        console.log(`Resetting chat ${chatToDelete} to initial state`);
      } else {
        // If no default message was found, or we couldn't identify it, 
        // create a new welcome message and reset the chat
        
        // Delete the chat document first
        batch.delete(doc(db, 'chats', chatToDelete));
        
        console.log(`No default welcome message found. Creating a new chat for the seller`);
      }
      
      // 3. Execute the batch
      await batch.commit();
      
      // 4. If we deleted the chat completely (no welcome message found), create a new one
      if (!hasDefaultMessage) {
        // Create a new chat with a welcome message
        const newChatRef = await addDoc(collection(db, 'chats'), {
          sellerUid: sellerId,
          adminUid: adminUid,
          createdAt: serverTimestamp(),
          lastMessageTime: serverTimestamp(),
          adminUnreadCount: 0,
          sellerUnreadCount: 1,  // Set to 1 to notify seller
          lastMessage: {
            text: "How can I help you?",
            senderUid: adminUid,
            timestamp: serverTimestamp()
          }
        });
        
        // Add the welcome message to the new chat
        await addDoc(collection(db, 'chats', newChatRef.id, 'messages'), {
          text: "How can I help you?",
          imageUrl: null,
          senderUid: adminUid,
          senderName: "Customer Care",
          timestamp: serverTimestamp(),
          isRead: false
        });
        
        console.log(`Created new chat ${newChatRef.id} with welcome message`);
      }
      
      console.log(`Chat cleaning completed successfully`);
      
      // 5. Update the UI by removing the deleted chat from state
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatToDelete));
      
      // 6. If the deleted chat was selected, clear the selection
      if (selectedChatId === chatToDelete) {
        setSelectedChatId(null);
        setOtherUserDetails(null);
      }
      
      setDeleteLoading(false);
      closeDeleteDialog();
    } catch (error) {
      console.error('Error during chat cleanup:', error);
      setDeleteLoading(false);
      closeDeleteDialog();
    }
  };
  
  // Modify the chat layout for sellers to show chat window directly
  const renderChatLayout = () => {
    if (isMobile) {
      return (
        <>
          {isAdmin && (
            <IconButton 
              onClick={toggleSidebar} 
              sx={{ display: { xs: 'flex', md: 'none' }, mb: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          {isAdmin ? (
            <Drawer
              anchor="left"
              open={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              PaperProps={{
                sx: { width: '80%', maxWidth: '320px' }
              }}
            >
              <SidebarContainer square elevation={0}>
                <SidebarHeader>
                  <Typography variant="h6">Conversations</Typography>
                  <Button
                    startIcon={<AddIcon />}
                    size="small"
                    color="primary"
                    variant="outlined"
                    onClick={() => setShowSellerDialog(true)}
                    sx={{ mt: 1, borderRadius: '20px', textTransform: 'none' }}
                  >
                    New Conversation
                  </Button>
                </SidebarHeader>
                <ScrollableChatListContainer>
                  <ChatList 
                    chats={chats} 
                    selectedChatId={selectedChatId}
                    onSelectChat={handleSelectChat}
                    currentUserIsAdmin={isAdmin}
                  />
                </ScrollableChatListContainer>
              </SidebarContainer>
            </Drawer>
          ) : null}
          
          <Box sx={{ 
            width: '100%', 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            [theme.breakpoints.down('sm')]: {
              height: 'calc(100vh - 56px)', // Account for potential mobile browser navigation
              width: '100vw',
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 1000 // Ensure chat is on top
            }
          }}>
            <ChatWindow 
              selectedChatId={selectedChatId}
              onBackClick={handleBackClick}
              currentUserUid={currentUserUid}
              currentUserName={currentUserName}
              isAdmin={isAdmin}
              otherUserDetails={otherUserDetails}
              onDeleteChat={isAdmin ? confirmDeleteChat : undefined}
              onMessageSent={onMessageSent}
            />
          </Box>
        </>
      );
    }
    
    return (
      <Grid container sx={{ height: '100%' }}>
        {isAdmin && (
          <Grid item xs={12} md={4} sx={{ height: '100%' }}>
            <SidebarContainer elevation={0}>
              <SidebarHeader>
                <Typography variant="h6">Conversations</Typography>
                <Button
                  startIcon={<AddIcon />}
                  size="small"
                  color="primary"
                  variant="outlined"
                  onClick={() => setShowSellerDialog(true)}
                  sx={{ mt: 1, borderRadius: '20px', textTransform: 'none' }}
                >
                  New Conversation
                </Button>
              </SidebarHeader>
              <ScrollableChatListContainer>
                <ChatList 
                  chats={chats} 
                  selectedChatId={selectedChatId}
                  onSelectChat={handleSelectChat}
                  currentUserIsAdmin={isAdmin}
                />
              </ScrollableChatListContainer>
            </SidebarContainer>
          </Grid>
        )}
        
        <Grid item xs={12} md={isAdmin ? 8 : 12} sx={{ height: '100%' }}>
          <ChatWindow 
            selectedChatId={selectedChatId}
            onBackClick={handleBackClick}
            currentUserUid={currentUserUid}
            currentUserName={currentUserName}
            isAdmin={isAdmin}
            otherUserDetails={otherUserDetails}
            onDeleteChat={isAdmin ? confirmDeleteChat : undefined}
            onMessageSent={onMessageSent}
          />
        </Grid>
      </Grid>
    );
  };
  
  return (
    <ChatContainer>
      {renderChatLayout()}
      
      {/* Seller Selection Dialog - Only for Admin */}
      {isAdmin && (
        <Dialog 
          open={showSellerDialog} 
          onClose={() => setShowSellerDialog(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>
            Select a Seller to Start Conversation
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              fullWidth
              placeholder="Search sellers..."
              value={sellerSearchQuery}
              onChange={(e) => setSellerSearchQuery(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            
            {loadingSellers ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : filteredSellers.length > 0 ? (
              <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
                {filteredSellers.map((seller) => (
                  <ListItem 
                    button 
                    key={seller.id}
                    onClick={() => startNewChat(seller.id, seller.name)}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                      position: 'relative',
                      pl: 2,
                      ...(seller.status === 'frozen' ? { opacity: 0.7 } : {})
                    }}
                  >
                    <ListItemText 
                      primary={seller.name}
                      secondary={
                        <>
                          {seller.email}
                          {seller.status === 'frozen' && (
                            <Box component="span" sx={{ ml: 1, color: 'error.main', fontSize: '0.75rem' }}>
                              (Frozen)
                            </Box>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  {availableSellers.length === 0 
                    ? 'No sellers found' 
                    : 'No sellers match your search'}
                </Typography>
              </Box>
            )}
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={!deleteLoading ? closeDeleteDialog : undefined}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>Clear Conversation</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to clear this conversation?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This action will:
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            <Box component="li" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Remove all messages except the initial "How can I help you?" message
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Reset the conversation to its initial state for both you and the seller
              </Typography>
            </Box>
            <Box component="li">
              <Typography variant="body2" color="text.secondary">
                The seller will still be able to start a new conversation
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={closeDeleteDialog} 
            disabled={deleteLoading}
            color="primary"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteChat} 
            color="error" 
            disabled={deleteLoading}
            variant="contained"
            startIcon={deleteLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {deleteLoading ? 'Clearing...' : 'Clear Conversation'}
          </Button>
        </DialogActions>
      </Dialog>
    </ChatContainer>
  );
};

export default Chat;
