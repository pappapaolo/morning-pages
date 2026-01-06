import React, { useEffect, useRef } from 'react';

const Editor = ({ value, onChange, placeholder = "Clear your mind..." }) => {
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <div className="editor-container">
      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus
        spellCheck="false"
      />
      <style>{`
        .editor-container {
          width: 100%;
          margin-top: 1rem;
          padding-bottom: 50vh; /* Huge padding at bottom */
          cursor: text;
        }
        .editor-textarea {
          width: 100%;
          border: none;
          outline: none;
          resize: none;
          background: transparent;
          font-family: var(--font-body);
          font-size: 1.15rem;
          line-height: 1.8;
          color: var(--color-text);
          padding: 0;
          overflow: hidden;
          min-height: 50vh; 
        }
        .editor-textarea::placeholder {
          color: var(--color-placeholder);
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default Editor;
