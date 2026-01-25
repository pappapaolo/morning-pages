# Claude Code Guidelines

## End of Session
Always commit and push changes at the end of each session so they can be tested in production.

## Project Overview
Morning Pages - a minimalist writing app for daily journaling (750 words/3 pages).

## Tech Stack
- React + Vite
- Firebase Auth & Firestore for sync
- Hosted on Vercel

## Key Files
- `src/App.jsx` - Main app component, state management
- `src/components/Sidebar.jsx` - Navigation, date list, auth button
- `src/components/AuthButton.jsx` - Google sign-in, profile dropdown
- `src/services/sync.js` - Firebase sync logic
- `src/services/storage.js` - Local storage abstraction
