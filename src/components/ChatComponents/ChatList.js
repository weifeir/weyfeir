import React from 'react';
import { 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Typography, 
  Badge,
  Divider,
  Box,
  styled,
  alpha
} from '@mui/material';

const StyledListItem = styled(ListItem)(({ theme, isSelected }) => ({
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  transition: 'all 0.2s ease',
  backgroundColor: isSelected 
    ? alpha(theme.palette.primary.main, 0.1) 
    : 'transparent',
  '&:hover': {
    backgroundColor: isSelected 
      ? alpha(theme.palette.primary.main, 0.15) 
      : alpha(theme.palette.action.hover, 0.1),
  },
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    right: -3,
    top: 3,
    backgroundColor: theme.palette.success.main,
    color: theme.palette.success.main,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
  },
}));

const TruncatedText = styled(Typography)({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const ChatList = ({ chats, selectedChatId, onSelectChat, currentUserIsAdmin }) => {
  // Function to format the timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    const now = new Date();
    
    // If it's today, show the time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If it's this year but not today, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // If it's a different year, show year, month, and day
    return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <List sx={{ width: '100%', bgcolor: 'background.paper', p: 1 }}>
      {chats.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="text.secondary">
            {currentUserIsAdmin 
              ? "No sellers have started a conversation yet"
              : "Start a conversation with admin"}
          </Typography>
        </Box>
      ) : (
        chats.map((chat, index) => (
          <React.Fragment key={chat.id}>
            <StyledListItem 
              button 
              isSelected={selectedChatId === chat.id}
              onClick={() => onSelectChat(chat.id)}
              alignItems="flex-start"
            >
              <ListItemAvatar>
                {chat.unreadCount > 0 ? (
                  <StyledBadge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                  >
                    <Avatar alt={chat.otherUserName === "mdziq962#@gmail.com" || chat.otherUserName === "Customer Care" ? "Customer Care" : chat.otherUserName}>
                      {(chat.otherUserName === "mdziq962#@gmail.com" || chat.otherUserName === "Customer Care" ? "C" : chat.otherUserName?.charAt(0)?.toUpperCase()) || '?'}
                    </Avatar>
                  </StyledBadge>
                ) : (
                  <Avatar alt={chat.otherUserName === "mdziq962#@gmail.com" || chat.otherUserName === "Customer Care" ? "Customer Care" : chat.otherUserName}>
                    {(chat.otherUserName === "mdziq962#@gmail.com" || chat.otherUserName === "Customer Care" ? "C" : chat.otherUserName?.charAt(0)?.toUpperCase()) || '?'}
                  </Avatar>
                )}
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <TruncatedText variant="subtitle2">
                      {chat.otherUserName === "mdziq962#@gmail.com" || chat.otherUserName === "Customer Care" ? "Customer Care" : (chat.otherUserName || 'Unknown User')}
                    </TruncatedText>
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(chat.lastMessageTime)}
                    </Typography>
                  </Box>
                }
                secondary={
                  <TruncatedText 
                    variant="body2" 
                    color={chat.unreadCount > 0 ? "text.primary" : "text.secondary"}
                    sx={{ 
                      fontWeight: chat.unreadCount > 0 ? 'medium' : 'regular', 
                      display: 'inline' 
                    }}
                  >
                    {chat.lastMessage && (
                      chat.lastMessage.imageUrl 
                        ? '🖼️ Image' 
                        : chat.lastMessage.text || 'No messages yet'
                    )}
                  </TruncatedText>
                }
              />
              {chat.unreadCount > 0 && (
                <Badge 
                  badgeContent={chat.unreadCount} 
                  color="primary"
                  sx={{ alignSelf: 'center', ml: 1 }}
                />
              )}
            </StyledListItem>
            {index < chats.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))
      )}
    </List>
  );
};

export default ChatList; 