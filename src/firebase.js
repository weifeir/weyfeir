import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
 

  apiKey: "AIzaSyD_PObN82Zs5xngygchVrqTbrw69sLC6_8",
  authDomain: "weifeir.firebaseapp.com",
  projectId: "weifeir",
  storageBucket: "weifeir.firebasestorage.app",
  messagingSenderId: "129100349783",
  appId: "1:129100349783:web:e74bd39b200ecf74c03e12",
  measurementId: "G-536BRKMVG5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Helper function to refresh Firebase auth session
export const refreshFirebaseAuthSession = async () => {
  try {
    // Check if there's a stored seller ID and email
    const sellerId = localStorage.getItem('sellerId');
    const sellerEmail = localStorage.getItem('sellerEmail');
    
    if (!sellerId || !sellerEmail) {
      console.log("No stored seller credentials found");
      return false;
    }
    
    // If Firebase auth is not synced with localStorage
    if (!auth.currentUser || auth.currentUser.email !== sellerEmail) {
      console.log("Firebase auth session needs refresh");
      
      try {
        // Try to fetch seller data from Firestore
        const sellerDoc = await getDoc(doc(db, 'sellers', sellerId));
        
        if (!sellerDoc.exists()) {
          console.log("Seller document not found in Firestore");
          return false;
        }
        
        const sellerData = sellerDoc.data();
        
        // If we have password in localStorage or database
        const plainPassword = sellerData.plainPassword || sellerData.password;
        
        if (plainPassword && sellerEmail) {
          // Try to sign in again using stored credentials
          try {
            await signInWithEmailAndPassword(auth, sellerEmail, plainPassword);
            console.log("Firebase auth session refreshed successfully");
            return true;
          } catch (signInError) {
            console.error("Error refreshing auth session:", signInError);
            // Silent failure, user will need to log in manually
            return false;
          }
        }
      } catch (error) {
        console.error("Error fetching seller data:", error);
        return false;
      }
    } else {
      // Auth session is already valid
      return true;
    }
  } catch (error) {
    console.error("Error in refreshFirebaseAuthSession:", error);
    return false;
  }
  
  return false;
};

// Flag to track if admin creation has been attempted
let adminCreationAttempted = false;

// Create admin user
export const createAdminUser = async () => {
  // Skip if already attempted in this session
  if (adminCreationAttempted) {
    return;
  }
  
  adminCreationAttempted = true;
  
  try {
    const adminEmail = "mdziq962#@gmail.com";
    const adminPassword = "@zahidiq1MdX";
    
    // First try to sign in with admin credentials
    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      
      // Check if admin document exists in Firestore
      const adminDoc = await getDoc(doc(db, 'admins', userCredential.user.uid));
      if (!adminDoc.exists()) {
        // Create admin document if it doesn't exist
        await setDoc(doc(db, 'admins', userCredential.user.uid), {
          email: adminEmail,
          role: 'admin',
          createdAt: new Date().toISOString()
        });
      }
      
      // Sign out after setup
      await auth.signOut();
      return;
    } catch (signInError) {
      // If sign in fails, create new admin user
      if (signInError.code === 'auth/user-not-found') {
        const newAdminCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        
        // Create admin document in Firestore
        await setDoc(doc(db, 'admins', newAdminCredential.user.uid), {
          email: adminEmail,
          role: 'admin',
          createdAt: new Date().toISOString()
        });
        
        // Sign out after setup
        await auth.signOut();
        console.log("Admin user created successfully");
      } else {
        throw signInError;
      }
    }
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      // This case should be handled by the sign in attempt above
      console.log("Admin user already exists");
    } else {
      console.error("Error in admin setup:", error);
    }
  }
}; 
