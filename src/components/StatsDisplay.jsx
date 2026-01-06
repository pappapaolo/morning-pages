import React, { useState, useEffect } from 'react';

const StatsDisplay = ({ wordCount, sessionWords, streak, startTime }) => {
  const [wpm, setWpm] = useState(0);
  const [elapsed, setElapsed] = useState('0:00');

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diffMinutes = (now - startTime) / 60000;

      if (diffMinutes > 0) {
        // Use sessionWords (words typed since start) instead of total wordCount
        setWpm(Math.round(sessionWords / diffMinutes));
      }

      const totalSeconds = Math.floor((now - startTime) / 1000);
      const m = Math.floor(totalSeconds / 60);
      const s = totalSeconds % 60;
      setElapsed(`${m}:${s.toString().padStart(2, '0')}`);

    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, wordCount, sessionWords]);

  return (
    <div className="stats-container">
      <span className="stat-item">{wordCount} words</span>
      <span className="separator">•</span>
      <span className="stat-item">{wpm} wpm</span>
      <span className="separator">•</span>
      <span className="stat-item">{elapsed}</span>

      <style>{`
        .stats-container {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          justify-content: center;
          align-items: center;
          color: var(--color-dim);
          font-family: var(--font-ui);
          font-size: 0.75rem; /* Tiny */
          opacity: 0.4; /* Low opacity */
          transition: opacity 0.3s;
        }
        .stats-container:hover {
            opacity: 1;
        }
        .separator {
            font-size: 0.5rem;
            opacity: 0.5;
        }
      `}</style>
    </div>
  );
};

export default StatsDisplay;
