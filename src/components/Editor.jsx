import React, { useEffect, useRef } from 'react';

const Editor = ({ value, onChange, placeholder = "Clear your mind..." }) => {
  const contentRef = useRef(null);

  // Sync value from props only if drastically different from current innerText to avoid cursor jumping
  // For a simple implementation, we can trust local state for typing and only sync on load
  useEffect(() => {
    if (contentRef.current && value) {
      const currentText = contentRef.current.innerText;
      // Only update if empty or significantly different (e.g. initial load)
      if (currentText.trim() === '' && value.length > 0) {
        contentRef.current.innerText = value;
      }
    }
  }, [value]);

  const handleInput = (e) => {
    if (onChange) {
      onChange(e.currentTarget.innerText);
    }
  };

  return (
    <div className="editor-container">
      <div
        ref={contentRef}
        className="editor-content"
        contentEditable
        onInput={handleInput}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />

      <style>{`
        .editor-container {
          width: 100%;
          margin-top: 1rem;
          /* padding-bottom removed, handled by spacer */
          cursor: text;
        }
        .editor-content {
          width: 100%;
          outline: none;
          background: transparent;
          font-family: var(--font-body);
          font-size: 1.15rem;
          line-height: 1.8;
          color: var(--color-text);
          min-height: 50vh;
          white-space: pre-wrap; /* Preserve whitespace logic */
        }
        .editor-content:empty::before {
          content: attr(data-placeholder);
          color: var(--color-placeholder);
          font-style: italic;
          cursor: text;
        }
        /* Style paragraphs if they exist, though simple contentEditable often makes divs */
        .editor-content > div, .editor-content > p {
            margin-bottom: 1.5em; /* The requested spacing */
            min-height: 1.5em; /* Ensure empty lines have height */
        }
      `}</style>
    </div>
  );
};

export default Editor;
