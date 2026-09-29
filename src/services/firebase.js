import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - these should be set in your .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if Firebase is configured
export const isFirebaseConfigured = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
  );
};

// Initialize Firebase only if configured
let app = null;
let auth = null;
let db = null;
let googleProvider = null;

if (isFirebaseConfigured()) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Make sign-in survive browser restarts explicitly. Firebase defaults to local
  // persistence in browsers, but setting it removes ambiguity across environments.
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('Could not enable persistent sign-in:', error);
  });
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
}

export { app, auth, db, googleProvider };
