# Morning Pages project instructions

- Commit and push completed changes so they can be tested in production.
- Keep changes focused and validate them with `npm run lint` and `npm run build`.

## Project

Morning Pages is a minimalist React and Vite writing app for daily 750-word journaling.

- `src/App.jsx`: editor state, persistence, and sync coordination
- `src/components/Sidebar.jsx`: navigation, history, account, and backup UI
- `src/services/storage.js`: durable local IndexedDB storage and recovery
- `src/services/sync.js`: authenticated Firebase and Firestore sync
- `src/services/firebase.js`: Firebase initialization and Google authentication

Production is hosted on Vercel and deploys from `main`.
