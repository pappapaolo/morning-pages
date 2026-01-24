import React from 'react';

const FlameIcon = ({ size = 'small', className = '' }) => {
  const dimensions = size === 'large' ? { width: 80, height: 100 } : { width: 20, height: 25 };

  return (
    <svg
      width={dimensions.width}
      height={dimensions.height}
      viewBox="0 0 24 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flame-icon ${className}`}
    >
      <defs>
        <linearGradient id={`flameGradient-${size}`} x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#ff6b35" />
          <stop offset="50%" stopColor="#f7c453" />
          <stop offset="100%" stopColor="#ffe066" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C12 2 4 10 4 18C4 24 8 28 12 28C16 28 20 24 20 18C20 10 12 2 12 2Z"
        fill={`url(#flameGradient-${size})`}
      />
      <path
        d="M12 10C12 10 8 15 8 20C8 24 10 26 12 26C14 26 16 24 16 20C16 15 12 10 12 10Z"
        fill="#ff8c42"
        opacity="0.8"
      />
      <path
        d="M12 15C12 15 10 18 10 21C10 23.5 11 25 12 25C13 25 14 23.5 14 21C14 18 12 15 12 15Z"
        fill="#ffe066"
        opacity="0.9"
      />
      <style>{`
        .flame-icon {
          display: inline-block;
          vertical-align: middle;
          animation: flameFlicker 3s ease-in-out infinite;
        }

        @keyframes flameFlicker {
          0%, 100% {
            transform: scale(1) rotate(0deg);
          }
          25% {
            transform: scale(1.02) rotate(-1deg);
          }
          50% {
            transform: scale(0.98) rotate(0.5deg);
          }
          75% {
            transform: scale(1.01) rotate(-0.5deg);
          }
        }
      `}</style>
    </svg>
  );
};

export default FlameIcon;
