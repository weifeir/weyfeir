import { createContext, useContext, useState, useEffect } from 'react';

// Create a context to manage notification sound globally
const NotificationSoundContext = createContext();

// Path to the notification sound file - using process.env.PUBLIC_URL ensures correct path in production
const NOTIFICATION_SOUND_PATH = `${process.env.PUBLIC_URL}/sounds/notification.mp3`;

// Provider component for managing notification sounds
export const NotificationSoundProvider = ({ children }) => {
  const [audio, setAudio] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize audio on component mount
  useEffect(() => {
    try {
      const audioElement = new Audio(NOTIFICATION_SOUND_PATH);
      
      // Add error handling for the audio loading
      audioElement.addEventListener('error', (e) => {
        console.warn('Error loading notification sound:', e);
        // Still mark as initialized even if sound fails to load
        setInitialized(true);
      });

      audioElement.addEventListener('canplaythrough', () => {
        setAudio(audioElement);
        setInitialized(true);
      });
      
      // Cleanup
      return () => {
        if (audioElement) {
          audioElement.pause();
          audioElement.src = '';
        }
      };
    } catch (error) {
      console.warn('Error initializing notification sound:', error);
      // Mark as initialized even if there's an error
      setInitialized(true);
    }
  }, []);

  // Function to play notification sound
  const playNotificationSound = () => {
    if (audio) {
      try {
        // Reset the audio to the beginning if it's already playing
        audio.pause();
        audio.currentTime = 0;
        
        // Play the notification sound
        const playPromise = audio.play();
        
        // Handle promise rejection (browsers may block autoplay)
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn('Error playing notification sound:', error);
          });
        }
      } catch (error) {
        console.warn('Error playing notification sound:', error);
      }
    }
  };

  return (
    <NotificationSoundContext.Provider value={{ playNotificationSound, initialized }}>
      {children}
    </NotificationSoundContext.Provider>
  );
};

// Custom hook for using notification sound functionality
export const useNotificationSound = () => {
  const context = useContext(NotificationSoundContext);
  if (!context) {
    throw new Error('useNotificationSound must be used within a NotificationSoundProvider');
  }
  return context;
}; 