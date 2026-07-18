// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
<<<<<<< HEAD
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Web app's Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyB9DP7aA2pw4Ob4nu9Xo5l9OdtF1auP8-E",
  authDomain: "jwc-flowers.firebaseapp.com",
  projectId: "jwc-flowers",
  storageBucket: "jwc-flowers.firebasestorage.app",
  messagingSenderId: "508118562990",
  appId: "1:508118562990:web:aaac5b4282fb16fc82153f",
  measurementId: "G-87WQWXS9W1"
};

// Initialize Firebase
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let dbInstance: Firestore;

if (typeof window !== 'undefined') {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} else {
  dbInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
}

export const db: Firestore = dbInstance;

=======
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if all firebase config keys are provided
const isFirebaseConfigured = Object.values(firebaseConfig).every(value => !!value && !value.includes('YOUR_'));

if (!isFirebaseConfigured) {
    console.warn("Firebase configuration is incomplete. App may not function correctly. Please ensure all NEXT_PUBLIC_FIREBASE_* variables are set correctly in your .env file.");
}

// Initialize Firebase
const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export Firestore and Storage instances directly
// These will throw an error at runtime if config is missing, which is the expected behavior.
export const db: Firestore = getFirestore(app);
>>>>>>> origin/main
export const storage: FirebaseStorage = getStorage(app);
