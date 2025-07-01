import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc,
  Timestamp,
  writeBatch
} from 'firebase/firestore';

/**
 * This function previously deleted messages older than 60 hours
 * It has been modified to keep all chat messages permanently
 */
export const cleanupOldChatMessages = async () => {
  console.log('Chat message cleanup disabled - all messages will be preserved permanently');
  return 0; // Return 0 to indicate no messages were deleted
};

/**
 * Creates a background worker that previously cleaned up old chat messages
 * Now modified to preserve all messages
 */
export const initializeChatCleanupWorker = () => {
  console.log('Chat cleanup worker initialized in preservation mode - all messages will be kept permanently');
  
  // Run once at initialization to log the change
  setTimeout(() => {
    console.log('Chat messages will be preserved permanently - automatic deletion has been disabled');
  }, 10000);
}; 
