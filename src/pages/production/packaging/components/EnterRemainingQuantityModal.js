import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const EnterRemainingQuantityModal = ({ isOpen, onClose, onConfirm, productData }) => {
  const { isDarkMode } = useTheme();
  const [remainingQuantity, setRemainingQuantity] = useState('');

  if (!isOpen) return null;

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
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          width: '600px',
          maxHeight: '90vh',
          backgroundColor: '#111827',
          borderRadius: '12px',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: '#374151',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            width: '100%',
            height: '52px',
            padding: '16px',
            borderBottom: '1px solid #374151',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
            backgroundColor: '#111827',
            boxSizing: 'border-box',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', margin: 0 }}>
            Enter Remaining Quantity
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9CA3AF';
            }}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ 
          padding: '1.5rem', 
          backgroundColor: '#111827', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'visible',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px',
        }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '8px',
            }}
          >
            Remaining Formulas (Gallons)
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: '#9CA3AF',
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
              width: '107px',
              height: '34px',
              paddingTop: '8px',
              paddingRight: '6px',
              paddingBottom: '8px',
              paddingLeft: '6px',
              border: '1px solid #374151',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#4B5563',
              color: '#FFFFFF',
              marginBottom: '16px',
              boxSizing: 'border-box',
              opacity: 0.75,
            }}
          />

          <div
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #374151',
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
                color: '#FFFFFF',
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
            borderTop: '1px solid #374151',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            backgroundColor: '#111827',
          }}
        >
          <button
            onClick={handleClose}
            style={{
              padding: '10px 20px',
              border: '1px solid #374151',
              borderRadius: '8px',
              backgroundColor: '#374151',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4B5563';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!remainingQuantity.trim()}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: remainingQuantity.trim() ? '#3B82F6' : '#374151',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '500',
              cursor: remainingQuantity.trim() ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={(e) => {
              if (remainingQuantity.trim()) {
                e.currentTarget.style.backgroundColor = '#2563EB';
              }
            }}
            onMouseLeave={(e) => {
              if (remainingQuantity.trim()) {
                e.currentTarget.style.backgroundColor = '#3B82F6';
              }
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

