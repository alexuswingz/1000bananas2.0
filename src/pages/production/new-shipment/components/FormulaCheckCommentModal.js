import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const FormulaCheckCommentModal = ({ isOpen, onClose, onComplete, isDarkMode }) => {
  const [comment, setComment] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Reset comment when modal opens
      setComment('');
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [isOpen]);

  const handleSkipAndComplete = () => {
    onComplete('');
  };

  const handleAddCommentAndComplete = () => {
    onComplete(comment);
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10002,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            borderRadius: '12px',
            width: '500px',
            maxWidth: '90vw',
            border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 10003,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ 
            padding: '20px 24px',
            borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: isDarkMode ? '#E5E7EB' : '#111827',
              margin: 0,
            }}>
              Add a Comment
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                width: '24px',
                height: '24px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div style={{ 
            padding: '24px',
            flex: '1 1 auto',
            overflowY: 'auto',
          }}>
            <p style={{
              fontSize: '14px',
              color: isDarkMode ? '#D1D5DB' : '#374151',
              margin: '0 0 16px 0',
              lineHeight: '1.5',
            }}>
              Formula Check has been marked as incomplete. Add a comment to provide more details for your team.
            </p>
            
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: isDarkMode ? '#E5E7EB' : '#374151',
              marginBottom: '8px',
            }}>
              Comment (Optional)
            </label>
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Labels are too low. ETA is 3 days."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                borderRadius: '6px',
                border: isDarkMode ? '1px solid #374151' : '1px solid #D1D5DB',
                backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                color: isDarkMode ? '#E5E7EB' : '#374151',
                fontSize: '14px',
                fontWeight: 400,
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Footer */}
          <div style={{ 
            padding: '16px 24px',
            borderTop: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            display: 'flex', 
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
          }}>
            <button
              type="button"
              onClick={handleSkipAndComplete}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: isDarkMode ? '1px solid #374151' : '1px solid #D1D5DB',
                backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                color: isDarkMode ? '#E5E7EB' : '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#4B5563' : '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#FFFFFF';
              }}
            >
              Skip & Complete
            </button>
            <button
              type="button"
              onClick={handleAddCommentAndComplete}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3B82F6';
              }}
            >
              Add Comment & Complete
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default FormulaCheckCommentModal;

