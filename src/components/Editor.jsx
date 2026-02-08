import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import FlameIcon from './FlameIcon';

const BULLET_RE = /^\s*[-*+\u2022]\s+(.*)$/;
const ORDERED_RE = /^\s*\d+[.)]\s+(.*)$/;

const escapeHtml = (value = '') => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const isProbablyHtml = (value = '') => /<\/?[a-z][\s\S]*>/i.test(value);

const plainTextToHtml = (text = '') => {
  const normalized = String(text || '').replace(/\r\n/g, '\n');
  if (!normalized.trim()) {
    return '<p></p>';
  }

  const lines = normalized.split('\n');
  const blocks = [];

  let listType = null;
  let listItems = [];

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      listType = null;
      listItems = [];
      return;
    }

    const tag = listType === 'ol' ? 'ol' : 'ul';
    blocks.push(`<${tag}>${listItems.join('')}</${tag}>`);

    listType = null;
    listItems = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine || '';
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      blocks.push('<p></p>');
      return;
    }

    const bulletMatch = line.match(BULLET_RE);
    if (bulletMatch) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(`<li>${escapeHtml(bulletMatch[1])}</li>`);
      return;
    }

    const orderedMatch = line.match(ORDERED_RE);
    if (orderedMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(`<li>${escapeHtml(orderedMatch[1])}</li>`);
      return;
    }

    flushList();
    blocks.push(`<p>${escapeHtml(line)}</p>`);
  });

  flushList();

  return blocks.join('') || '<p></p>';
};

const normalizeIncomingContent = (value = '') => {
  if (!value || !String(value).trim()) {
    return '<p></p>';
  }

  if (isProbablyHtml(value)) {
    return String(value);
  }

  return plainTextToHtml(value);
};

const Editor = ({
  valueHtml,
  plainText,
  onChange,
  programProgress,
  totalDays = 1,
  isYesterday = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '',
      }),
    ],
    content: '<p></p>',
    editorProps: {
      attributes: {
        class: 'editor-prosemirror',
      },
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    onUpdate: ({ editor: instance }) => {
      if (!onChangeRef.current) return;
      const text = instance.getText({ blockSeparator: '\n' }).replace(/\u00a0/g, ' ');
      const html = instance.getHTML();
      onChangeRef.current({ text, html });
    },
  }, []);

  useEffect(() => {
    if (!editor) return;

    const normalized = normalizeIncomingContent(valueHtml);
    const current = editor.getHTML();

    if (current !== normalized) {
      editor.commands.setContent(normalized, false);
    }
  }, [editor, valueHtml]);

  const showPlaceholder = !plainText || plainText.trim() === '';
  const isFirstDay = programProgress.week === 1 && programProgress.day === 1;

  return (
    <div className="editor-container" onClick={() => editor?.commands.focus('end')}>
      {showPlaceholder && (
        <div className={`placeholder-overlay ${isFocused ? 'dimmed' : ''} ${!isFirstDay ? 'minimal' : ''}`}>
          {isFirstDay ? (
            <>
              <p>
                <strong>Morning Pages</strong> are three pages of longhand, stream of consciousness writing, done first thing in the morning.*
              </p>
              <p>
                There is no wrong way to do Morning Pages. These daily pages are not meant to be art. They are not even meant to be "writing." They are about anything and everything that crosses your mind - and they are for your eyes only.
              </p>
              <p className="footnote">
                *For this digital version, "three pages" equals 750 words.
              </p>
              <div className="progress-info">
                Week {programProgress?.week || 1} of 12 • Day {programProgress?.day || 1}
              </div>
            </>
          ) : (
            <div className="minimal-placeholder">
              <div className="streak-flame-container">
                <FlameIcon size="large" isGrey={isYesterday} />
                <div className="streak-number">{isYesterday ? 'Yesterday' : `Day ${totalDays}`}</div>
              </div>
            </div>
          )}
        </div>
      )}

      <EditorContent editor={editor} className="editor-content" />

      <style>{`
        .editor-container {
          width: 100%;
          margin-top: 1rem;
          cursor: text;
          position: relative;
        }
        .placeholder-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          color: var(--color-dim);
          transition: opacity 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          font-family: var(--font-body);
          font-size: 1.15rem;
          line-height: 1.8;
        }
        .placeholder-overlay.dimmed {
          opacity: 0.1;
        }
        .placeholder-overlay p {
          margin: 0 0 1.5rem 0;
          max-width: 680px;
        }
        .placeholder-overlay strong {
          font-weight: bold;
          color: var(--color-text);
        }
        .footnote {
          font-size: 0.9rem;
          opacity: 0.7;
          margin-bottom: 2rem !important;
          font-style: italic;
        }
        .progress-info {
          font-family: var(--font-sans);
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          opacity: 0.6;
          margin-top: 1rem;
        }

        .placeholder-overlay.minimal {
          justify-content: center;
          align-items: center;
          text-align: center;
          padding-bottom: 10vh;
        }

        .minimal-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          animation: fadeIn 0.8s ease-out;
        }

        .streak-flame-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .streak-number {
          font-size: 3rem;
          font-weight: 300;
          font-family: var(--font-body);
          color: var(--color-dim);
          line-height: 1;
          letter-spacing: -1px;
        }

        .editor-content {
          width: 100%;
        }

        .editor-content .editor-prosemirror,
        .editor-content .ProseMirror {
          width: 100%;
          outline: none;
          border: none;
          padding: 0;
          margin: 0;
          min-height: 50vh;
          background: transparent;
          font-family: var(--font-body);
          font-size: 1.15rem;
          line-height: 1.6;
          color: var(--color-text);
          white-space: pre-wrap;
          word-break: break-word;
          position: relative;
          z-index: 10;
        }

        .editor-content .ProseMirror p {
          margin: 0 0 0.7em 0;
        }

        .editor-content .ProseMirror p:last-child {
          margin-bottom: 0;
        }

        .editor-content .ProseMirror ul,
        .editor-content .ProseMirror ol {
          margin: -0.05em 0 0.7em 0.18em;
          padding-left: 1.05em;
        }

        .editor-content .ProseMirror li {
          margin: 0.12em 0;
        }

        .editor-content .ProseMirror li p {
          margin: 0;
        }

        .editor-content .ProseMirror ul li::marker,
        .editor-content .ProseMirror ol li::marker {
          color: var(--color-dim);
        }
      `}</style>
    </div>
  );
};

export default Editor;
