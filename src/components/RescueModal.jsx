import React from 'react';

const RescueModal = ({ onRescue, onSkip }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Save Your Streak!</h2>
                <p>
                    You missed yesterday's pages. Would you like to complete them now to keep your streak alive?
                </p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onSkip}>
                        No, Start Today
                    </button>
                    <button className="btn-primary" onClick={onRescue}>
                        Yes, Do Yesterday
                    </button>
                </div>
            </div>

            <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          backdrop-filter: blur(2px);
        }
        .modal-content {
          background: var(--color-bg);
          padding: 2rem;
          border-radius: 12px;
          max-width: 400px; /* specific for this modal */
          width: 90%;
          text-align: center;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          border: 1px solid var(--color-border);
          font-family: var(--font-ui);
        }
        .modal-content h2 {
          font-size: 1.5rem;
          margin-bottom: 1rem;
          color: var(--color-text);
        }
        .modal-content p {
          margin-bottom: 2rem;
          color: var(--color-dim);
          line-height: 1.5;
        }
        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        button {
          padding: 0.8rem 1.5rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          font-family: var(--font-ui);
          transition: all 0.2s;
        }
        .btn-primary {
          background: var(--color-text);
          color: var(--color-bg);
          font-weight: 500;
        }
        .btn-primary:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .btn-secondary {
          background: transparent;
          color: var(--color-dim);
          border: 1px solid var(--color-border);
        }
        .btn-secondary:hover {
          border-color: var(--color-dim);
          color: var(--color-text);
        }
      `}</style>
        </div>
    );
};

export default RescueModal;
