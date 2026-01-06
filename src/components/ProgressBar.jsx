import React from 'react';

const ProgressBar = ({ current, target = 750 }) => {
  // We want 3 segments. Each segment represents 1/3 of the target.
  const segmentTarget = target / 3;
  const segments = [1, 2, 3]; // 3 pages

  return (
    <div className="progress-container">
      {segments.map((s) => {
        // Calculate fill for this specific segment
        // e.g. for segment 1 (0-250), segment 2 (250-500), segment 3 (500-750)
        const segmentStart = (s - 1) * segmentTarget;
        const segmentEnd = s * segmentTarget;

        let fillPercentage = 0;
        if (current >= segmentEnd) {
          fillPercentage = 100;
        } else if (current > segmentStart) {
          fillPercentage = ((current - segmentStart) / segmentTarget) * 100;
        }

        const isComplete = fillPercentage >= 100;

        return (
          <div key={s} className="progress-segment-wrapper">
            <div
              className={`progress-bar ${isComplete ? 'complete' : ''}`}
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        );
      })}

      <style>{`
        .progress-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 6px;
          display: flex;
          gap: 4px; /* Space between segments */
          z-index: 100;
          background: rgba(0,0,0,0.02);
        }
        .progress-segment-wrapper {
          flex: 1;
          background: transparent;
          height: 100%;
          position: relative;
        }
        .progress-bar {
          height: 100%;
          background-color: var(--color-accent);
          transition: width 0.3s ease-out, background-color 0.5s;
          width: 0%;
        }
        .progress-bar.complete {
          background-color: var(--color-success);
        }
      `}</style>
    </div>
  );
};

export default ProgressBar;
