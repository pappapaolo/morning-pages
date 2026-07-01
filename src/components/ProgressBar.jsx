import React from 'react';

const ProgressBar = ({ current, target = 750 }) => {
  // Single continuous bar filling 0 -> 100% of the target.
  const fillPercentage = Math.min(100, Math.max(0, (current / target) * 100));

  return (
    <div className="progress-container">
      <div className="progress-bar" style={{ width: `${fillPercentage}%` }} />

      <style>{`
        .progress-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 6px;
          z-index: 100;
          background: rgba(0, 0, 0, 0.02);
        }
        .progress-bar {
          height: 100%;
          width: 0%;
          /* Gradient anchored to the full track width so the bar reads
             yellow early on and resolves to green near completion. */
          background-image: linear-gradient(to right, #FACC15, #22C55E);
          background-size: 100vw 100%;
          background-position: left center;
          background-repeat: no-repeat;
          transition: width 0.3s ease-out;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.45);
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;
