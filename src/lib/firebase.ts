// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
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

export const storage: FirebaseStorage = getStorage(app);
