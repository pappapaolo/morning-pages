import React from 'react';

const AboutModal = ({ onClose }) => {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>&times;</button>

                <h2>About Morning Pages</h2>

                <p><strong>Morning Pages</strong> are three pages of longhand, stream of consciousness writing, done first thing in the morning.</p>

                <p>There is no wrong way to do Morning Pages. They are not high art. They are not even "writing." They are about anything and everything that crosses your mind–and they remain strictly private.</p>

                <h3>Why 750 Words?</h3>
                <p>Three handwritten pages translate to roughly <strong>750 words</strong> typed. This is the sweet spot for clearing your mind and unlocking creativity.</p>

                <h3>The Rules</h3>
                <ul>
                    <li><strong>Write Daily:</strong> Try to build a streak.</li>
                    <li><strong>Don't Overthink:</strong> Just keep typing.</li>
                    <li><strong>Be Honest:</strong> No one else will read this.</li>
                </ul>

                <p className="footer-note">Inspired by <em>The Artist's Way</em> by Julia Cameron.</p>
            </div>

            <style>{`
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .modal-content {
            background: var(--color-bg);
            padding: 2rem;
            border-radius: 8px;
            max-width: 600px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            font-family: var(--font-body);
            line-height: 1.6;
        }
        .close-btn {
            position: absolute;
            top: 10px;
            right: 15px;
            border: none;
            background: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--color-icon);
        }
        h2 { margin-top: 0; color: var(--color-text); }
        h3 { margin-top: 1.5rem; font-size: 1.1rem; }
        ul { padding-left: 1.2rem; }
        .footer-note {
            margin-top: 2rem;
            font-style: italic;
            font-size: 0.9rem;
            color: var(--color-dim);
            border-top: 1px solid var(--color-border);
            padding-top: 1rem;
        }
      `}</style>
        </div>
    );
};

export default AboutModal;
