import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const ProductionNotesModal = ({ isOpen, onClose, product, notes = [], onAddNote, onSaveNote, isDarkMode }) => {
  const { isDarkMode: themeDarkMode } = useTheme();
  const darkMode = isDarkMode ?? themeDarkMode ?? false;
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    // Focus the textarea when adding note starts
    if (isAddingNote && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isAddingNote]);

  const handleAddNote = () => {
    setIsAddingNote(true);
    setNewNoteText('');
  };

  const handleSaveNote = () => {
    if (newNoteText.trim() && onAddNote) {
      onAddNote(newNoteText.trim());
      setNewNoteText('');
      setIsAddingNote(false);
    }
  };

  const handleCancelNote = () => {
    setNewNoteText('');
    setIsAddingNote(false);
  };

  const handleClose = () => {
    setIsAddingNote(false);
    setNewNoteText('');
    if (onClose) {
      onClose();
    }
  };

  if (!isOpen || !product) return null;

  // Format product name with size for display
  const productDisplayName = product.size 
    ? `${product.product || product.product_name || 'Product'} - ${product.size}`
    : (product.product || product.product_name || 'Product');

  // Get user info from localStorage
  const userName = localStorage.getItem('userName') || 'User';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

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
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={handleClose}
      >
        {/* Modal */}
        <div
          style={{
            width: '90%',
            maxWidth: '640px',
            maxHeight: 'calc(90vh - 10px)',
            backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: '#1C2634',
              padding: '16px 24px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: '56px',
              width: '100%',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
              boxSizing: 'border-box',
            }}
          >
            <h2
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: '#FFFFFF',
                margin: 0,
              }}
            >
              {productDisplayName}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              maxWidth: '640px',
              minHeight: '174px',
              overflowY: 'auto',
              padding: '16px 24px 32px 24px',
              gap: '24px',
              backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
              border: '1px solid',
              borderColor: darkMode ? '#374151' : '#E5E7EB',
              borderTop: 'none',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px',
              boxSizing: 'border-box',
            }}
          >
            {/* Production Notes Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: darkMode ? '#F9FAFB' : '#111827',
                  margin: 0,
                }}
              >
                Production Notes
              </h3>
              {!isAddingNote && (
                <button
                  type="button"
                  onClick={handleAddNote}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#007AFF',
                    fontSize: '14px',
                    fontWeight: 400,
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>Add Note</span>
                </button>
              )}
            </div>

            {/* Notes List - Most recent at bottom, scroll up for older notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notes.length === 0 ? (
                <p
                  style={{
                    fontSize: '14px',
                    color: darkMode ? '#9CA3AF' : '#6B7280',
                    textAlign: 'center',
                    padding: '2rem 0',
                    margin: 0,
                  }}
                >
                  No production notes yet.
                </p>
              ) : (
                [...notes].reverse().map((note, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: darkMode ? '#374151' : '#F9FAFB',
                      borderRadius: '8px',
                      border: darkMode ? '1px solid #4B5563' : '1px solid #E5E7EB',
                      boxShadow: darkMode ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#F59E0B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontSize: '10px',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {note.userInitials || userInitials}
                    </div>

                    {/* Note Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: darkMode ? '#F9FAFB' : '#111827',
                          }}
                        >
                          {note.userName || userName}
                        </span>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 400,
                            color: darkMode ? '#9CA3AF' : '#6B7280',
                          }}
                        >
                          {note.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: '14px',
                          fontWeight: 400,
                          color: darkMode ? '#D1D5DB' : '#374151',
                          lineHeight: '1.5',
                          margin: 0,
                          wordWrap: 'break-word',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {note.text || note.content || note}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Comment Box - Only visible when isAddingNote is true */}
            {isAddingNote && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  maxWidth: '592px',
                  minHeight: '63px',
                  padding: '12px',
                  gap: '8px',
                  borderRadius: '8px',
                  border: darkMode ? '1px solid #4B5563' : '1px solid #007AFF',
                  backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              >
                {/* User Avatar and Name */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {/* User Avatar */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#F59E0B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: '10px',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {userInitials}
                  </div>
                  {/* User Name */}
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: darkMode ? '#F9FAFB' : '#111827',
                    }}
                  >
                    {userName}
                  </span>
                </div>

                {/* Input Field */}
                <textarea
                  ref={textareaRef}
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    minHeight: '40px',
                    padding: '0',
                    borderRadius: '0',
                    border: 'none',
                    backgroundColor: 'transparent',
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
            )}
          </div>

          {/* Footer with Cancel and Save Changes buttons - Only visible when isAddingNote is true */}
          {isAddingNote && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                maxWidth: '640px',
                minHeight: '63px',
                padding: '16px 24px',
                borderRight: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                borderBottom: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                borderLeft: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                borderBottomLeftRadius: '12px',
                borderBottomRightRadius: '12px',
                backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                }}
              >
              <button
                type="button"
                onClick={handleCancelNote}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: `1px solid ${darkMode ? '#4B5563' : '#D1D5DB'}`,
                  backgroundColor: darkMode ? '#374151' : '#FFFFFF',
                  color: darkMode ? '#E5E7EB' : '#374151',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={!newNoteText.trim()}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: newNoteText.trim() ? '#2563EB' : '#9CA3AF',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: newNoteText.trim() ? 'pointer' : 'not-allowed',
                  opacity: newNoteText.trim() ? 1 : 0.6,
                }}
              >
                Comment
              </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

export default ProductionNotesModal;

