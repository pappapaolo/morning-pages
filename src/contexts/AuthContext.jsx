import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase';
import { AuthContext } from './auth-context';

const getFriendlyAuthError = (err) => {
  const code = err?.code || '';
  const host = typeof window !== 'undefined' ? window.location.hostname : 'your domain';

  switch (code) {
    case 'auth/popup-blocked':
      return 'Popup blocked. Trying redirect sign-in instead.';
    case 'auth/unauthorized-domain':
      return `This domain (${host}) is not authorized in Firebase Auth. Add it in Firebase Console > Authentication > Settings > Authorized domains.`;
    case 'auth/operation-not-allowed':
      return 'Google sign-in is disabled. Enable Google provider in Firebase Authentication > Sign-in method.';
    case 'auth/network-request-failed':
      return 'Network error during sign-in. Check your connection and try again.';
    default:
      return err?.message || 'Authentication failed.';
  }
};

export const AuthProvider = ({ children }) => {
  const isConfigured = isFirebaseConfigured();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isConfigured);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isConfigured || !auth) {
      return undefined;
    }

    let isActive = true;

    getRedirectResult(auth).catch((err) => {
      if (isActive) {
        setError(getFriendlyAuthError(err));
      }
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!isActive) return;
      setUser(user);
      setLoading(false);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [isConfigured]);

  const signInWithGoogle = async () => {
    if (!isConfigured || !auth || !googleProvider) {
      setError('Firebase not configured. Check .env file and restart dev server.');
      return;
    }

    try {
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      // Popup-based auth is blocked in some environments (Safari, strict privacy, in-app browsers).
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }

      setError(getFriendlyAuthError(err));
      throw err;
    }
  };

  const signOut = async () => {
    if (!auth) return;

    try {
      await firebaseSignOut(auth);
    } catch (err) {
      setError(getFriendlyAuthError(err));
      throw err;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    isConfigured,
    signInWithGoogle,
    signOut,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
