import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const EnterRemainingQuantityModal = ({ isOpen, onClose, onConfirm, productData }) => {
  const { isDarkMode } = useTheme();
  const [remainingQuantity, setRemainingQuantity] = useState('');

  if (!isOpen) return null;

  const themeClasses = {
    modalBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  const handleConfirm = () => {
    if (remainingQuantity.trim()) {
      onConfirm(remainingQuantity);
      setRemainingQuantity('');
    }
  };

  const handleClose = () => {
    setRemainingQuantity('');
    onClose();
  };

  const formula = productData?.formula || 'F.Ultra Grow';

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10003,
        padding: '16px',
      }}
      onClick={handleClose}
    >
      <div
        className={themeClasses.modalBg}
        style={{
          width: '200%',
          maxWidth: '500px',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: isDarkMode ? '#374151' : '#1F2937',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600', margin: 0 }}>
            Enter Remaining Quantity
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: themeClasses.textPrimary,
              marginBottom: '8px',
            }}
          >
            Remaining Formulas (Gallons)
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: themeClasses.textSecondary,
              marginBottom: '16px',
            }}
          >
            Enter the estimated amount remaining in the vessel
          </p>

          <input
            type="text"
            value={remainingQuantity}
            onChange={(e) => setRemainingQuantity(e.target.value)}
            placeholder="Enter remaining quantity here..."
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
              color: themeClasses.textPrimary,
              marginBottom: '16px',
              boxSizing: 'border-box',
            }}
          />

          <div
            style={{
              backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
              padding: '12px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <p
              style={{
                fontSize: '14px',
                color: themeClasses.textPrimary,
                margin: 0,
                flex: 1,
              }}
            >
              This amount will be marked and moved to <b>Floor Inventory </b> as unused formula for <b> {formula}. </b>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: `1px solid ${themeClasses.border}`,
            display: 'flex',
            gap: '12px',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
              borderRadius: '8px',
              backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
              color: themeClasses.textPrimary,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            enabled={!remainingQuantity.trim()}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: remainingQuantity.trim() ? '#3B82F6' : '#3B82F6',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '500',
              cursor: remainingQuantity.trim() ? 'pointer' : 'allowed pointer',
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default EnterRemainingQuantityModal;

