import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthButton = ({ onSignIn, onSignOut }) => {
  const { user, loading, isConfigured, signInWithGoogle, signOut } = useAuth();

  if (!isConfigured) {
    return null; // Don't show if Firebase isn't configured
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
    <button className="sign-in-btn" onClick={handleSignIn} title="Sign in with Google">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
      <style>{`
        .sign-in-btn {
          background: transparent;
          border: none;
          color: var(--color-icon);
          width: 20px;
          height: 20px;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.3s;
        }
        .sign-in-btn:hover {
          color: var(--color-text);
        }
        .auth-loading {
          color: var(--color-dim);
          font-size: 0.8rem;
        }
      `}</style>
    </button>
  );
};

export default AuthButton;
