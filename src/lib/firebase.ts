
// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For security, these values are stored in environment variables
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

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

// Initialize Firebase only if the config is complete
if (isFirebaseConfigured) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    storage = getStorage(app);
} else {
    console.warn("Firebase configuration is incomplete. App will run in offline mode. Please ensure all NEXT_PUBLIC_FIREBASE_* variables are set correctly in your .env file.");
}


export { app, db, storage };
