import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import Editor from './components/Editor';
import ProgressBar from './components/ProgressBar';
import StatsDisplay from './components/StatsDisplay';
import Sidebar from './components/Sidebar';
import AboutModal from './components/AboutModal';
import { storage } from './services/storage';

const TODAY_DATE_KEY = new Date().toLocaleDateString('en-CA');

function App() {
  const [text, setText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [streak, setStreak] = useState(0);

  // Milestones tracking to avoid re-triggering
  const [milestonesReached, setMilestonesReached] = useState(new Set());
  const [showToast, setShowToast] = useState(null); // Message or null
  const [showAbout, setShowAbout] = useState(false);

  const calculateWordCount = (str) => {
    return str.trim().split(/\s+/).filter(w => w.length > 0).length;
  };

  // ... (skip lines to render)

  return (
    <div className="app-container">
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      <ProgressBar current={wordCount} target={750} />

      <Sidebar
        currentDate={TODAY_DATE_KEY}
        onSelectDate={async (dateStr) => {
          // Very simple routing: load content into editor
          const content = await storage.getEntry(dateStr);
          setText(content || '');
          setWordCount(calculateWordCount(content || ''));
        }}
        onOpenAbout={() => setShowAbout(true)}
      />

      {/* Toast Notification */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        {showToast}
      </div>

      <header className="header">
        <h1 className="title">Morning Pages</h1>
        <div className="date-display">{todayStr}</div>
      </header>

      <main>
        <Editor value={text} onChange={handleTextChange} />

        {isDone && (
          <div className="done-message fade-in">
            <h2>✨ Done for the day. Come back tomorrow.</h2>
            <p>Streak: {streak} days</p>
          </div>
        )}

        <StatsDisplay
          wordCount={wordCount}
          streak={streak}
          startTime={startTime}
        />
      </main>

      <style>{`
        .toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: #333;
            color: #fff;
            padding: 10px 20px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-family: var(--font-ui);
            opacity: 0;
            transition: all 0.5s ease;
            z-index: 200;
        }
        .toast.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        .done-message {
            text-align: center;
            color: var(--color-success);
            margin-top: 2rem;
            margin-bottom: 2rem;
            font-family: var(--font-ui);
            padding: 2rem;
            background: #f1f8e9;
            border-radius: 8px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            width: 100%;
            margin-bottom: 2rem;
            font-family: var(--font-body); /* Shared font */
        }
        .title {
            text-transform: none;
            font-size: 1.1rem; /* Shared size */
            color: var(--color-text); /* Darker */
            margin: 0;
            font-weight: 600;
        }
        .date-display {
            font-family: var(--font-body); /* Shared font */
            font-size: 1.1rem; /* Shared size */
            color: #ccc; /* Lighter */
            margin: 0;
        }
      `}</style>
    </div>
  );
}

export default App;
