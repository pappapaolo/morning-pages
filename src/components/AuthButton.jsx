import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthButton = ({ onSignIn, onSignOut }) => {
  const { user, loading, error, isConfigured, signInWithGoogle, signOut, clearError } = useAuth();

  if (!isConfigured) {
    return (
      <div className="auth-not-configured">
        <span>Firebase not configured</span>
        <style>{`
          .auth-not-configured {
            font-size: 0.75rem;
            color: var(--color-dim);
            font-style: italic;
          }
        `}</style>
      </div>
    );
  }

  if (loading) {
    return <div className="auth-loading">...</div>;
  }

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      if (onSignIn) onSignIn();
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      if (onSignOut) onSignOut();
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  if (user) {
    return (
      <div className="auth-user">
        <img
          src={user.photoURL || '/default-avatar.png'}
          alt={user.displayName || 'User'}
          className="user-avatar"
          onClick={handleSignOut}
          title="Click to sign out"
        />
        <style>{`
          .auth-user {
            display: flex;
            align-items: center;
          }
          .user-avatar {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            transition: opacity 0.2s;
          }
          .user-avatar:hover {
            opacity: 0.8;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="auth-container">
      {error && (
        <div className="auth-error" onClick={clearError}>
          {error}
        </div>
      )}
      <button className="google-sign-in-btn" onClick={handleSignIn}>
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        <span>Sign in with Google</span>
      </button>
      <style>{`
        .auth-container {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          width: 100%;
        }
        .google-sign-in-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.6rem 1rem;
          background: var(--color-bg);
          border: 1px solid var(--color-border);
          border-radius: 8px;
          color: var(--color-text);
          font-family: var(--font-ui);
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .google-sign-in-btn:hover {
          background: var(--color-bg-hover);
          border-color: var(--color-dim);
        }
        .auth-loading {
          color: var(--color-dim);
          font-size: 0.8rem;
        }
        .auth-error {
          font-size: 0.7rem;
          color: var(--color-accent);
          cursor: pointer;
          max-width: 200px;
          word-wrap: break-word;
        }
      `}</style>
    </div>
  );
};

export default AuthButton;
