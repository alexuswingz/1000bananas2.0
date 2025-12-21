import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const StatusCommentModal = ({ isOpen, onClose, onComplete, isDarkMode, statusFieldName }) => {
  const [comment, setComment] = useState('');
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const textareaRef = useRef(null);
  const theme = useTheme();
  const darkMode = isDarkMode ?? theme?.isDarkMode ?? false;

  // Get display name for the status field
  const getStatusDisplayName = (fieldName) => {
    const displayNames = {
      'addProducts': 'Add Products',
      'formulaCheck': 'Formula Check',
      'labelCheck': 'Label Check',
      'bookShipment': 'Book Shipment',
      'sortProducts': 'Sort Products',
      'sortFormulas': 'Sort Formulas',
    };
    return displayNames[fieldName] || fieldName;
  };

  // Sync internal state with prop
  useEffect(() => {
    if (isOpen) {
      setInternalIsOpen(true);
      setComment('');
      setIsClosing(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } else {
      setInternalIsOpen(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setInternalIsOpen(false);
    setIsClosing(false);
    if (onClose) {
      onClose();
    }
  };

  const handleSkipAndComplete = () => {
    handleClose();
    if (onComplete) {
      onComplete('');
    }
  };

  const handleAddCommentAndComplete = () => {
    console.log('handleAddCommentAndComplete called', comment);
    // Prevent multiple clicks
    if (isClosing || !internalIsOpen) {
      console.log('Already closing or not open, ignoring click');
      return;
    }
    setIsClosing(true);
    
    // Close modal immediately using internal state
    setInternalIsOpen(false);
    
    // Call parent's onClose
    if (onClose) {
      onClose();
    }
    
    // Then call the complete handler
    if (onComplete) {
      // Use setTimeout to ensure modal closes first
      setTimeout(() => {
        onComplete(comment);
        setIsClosing(false);
      }, 0);
    } else {
      console.error('onComplete handler is not defined');
      setIsClosing(false);
    }
  };

  if (!internalIsOpen) return null;

  const statusDisplayName = getStatusDisplayName(statusFieldName);

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10005,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={(e) => {
          // Only close if clicking the backdrop itself, not the modal content
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '480px',
            maxHeight: '90vh',
            backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
            borderRadius: '8px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 10006,
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: darkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: darkMode ? '#F9FAFB' : '#111827',
              margin: 0,
            }}>
              Add a Comment
            </h2>
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: darkMode ? '#9CA3AF' : '#6B7280',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = darkMode ? '#D1D5DB' : '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = darkMode ? '#9CA3AF' : '#6B7280';
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div style={{
            padding: '24px',
            flex: '1 1 auto',
            overflowY: 'auto',
          }}>
            <p style={{
              fontSize: '14px',
              color: darkMode ? '#D1D5DB' : '#374151',
              margin: '0 0 16px 0',
              lineHeight: '1.5',
            }}>
              {statusDisplayName} has been marked as incomplete. Add a comment to provide more details for your team.
            </p>

            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: darkMode ? '#E5E7EB' : '#374151',
              marginBottom: '8px',
            }}>
              Comment (Optional)
            </label>
            <textarea
              ref={textareaRef}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. Additional details about this status..."
              style={{
                width: '100%',
                minHeight: '110px',
                padding: '12px',
                borderRadius: '6px',
                border: darkMode ? '1px solid #374151' : '1px solid #D1D5DB',
                backgroundColor: darkMode ? '#374151' : '#FFFFFF',
                color: darkMode ? '#E5E7EB' : '#374151',
                fontSize: '14px',
                fontWeight: 400,
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{
            padding: '20px 24px',
            borderTop: darkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}>
            <button
              type="button"
              disabled={isClosing}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleSkipAndComplete();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: darkMode ? '1px solid #374151' : '1px solid #D1D5DB',
                backgroundColor: 'transparent',
                color: darkMode ? '#D1D5DB' : '#374151',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isClosing ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                minWidth: '140px',
                flexShrink: 0,
                position: 'relative',
                zIndex: 10006,
                opacity: isClosing ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isClosing) {
                  e.currentTarget.style.backgroundColor = darkMode ? '#374151' : '#F9FAFB';
                }
              }}
              onMouseLeave={(e) => {
                if (!isClosing) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              Skip & Complete
            </button>
            <button
              type="button"
              disabled={isClosing}
              onClick={(e) => {
                console.log('Add Comment button clicked', { 
                  comment, 
                  onComplete: !!onComplete, 
                  onClose: !!onClose,
                  isClosing 
                });
                e.stopPropagation();
                e.preventDefault();
                e.nativeEvent?.stopImmediatePropagation?.();
                handleAddCommentAndComplete();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isClosing ? '#9CA3AF' : '#0B7DFF',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isClosing ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                minWidth: '190px',
                flexShrink: 0,
                position: 'relative',
                zIndex: 10006,
                opacity: isClosing ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isClosing) {
                  e.currentTarget.style.backgroundColor = '#0669D1';
                }
              }}
              onMouseLeave={(e) => {
                if (!isClosing) {
                  e.currentTarget.style.backgroundColor = '#0B7DFF';
                }
              }}
            >
              {isClosing ? 'Processing...' : 'Add Comment & Complete'}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default StatusCommentModal;


















