import React from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const RemainingFormulaCheckModal = ({ isOpen, onClose, onYes, onNo, productData }) => {
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  const themeClasses = {
    modalBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
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
        zIndex: 10002,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        className={themeClasses.modalBg}
        style={{
          width: '456px',
          height: '230px',
          borderRadius: '12px',
          border: `1px solid ${themeClasses.border}`,
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div style={{ padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', boxSizing: 'border-box' }}>
          {/* Warning Icon */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '16px',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              opacity: 1,
              boxSizing: 'border-box',
            }}
          >
            <img
              src="/assets/exclamation.png"
              alt="Exclamation"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Text Section */}
          <div style={{ 
            width: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px', 
            opacity: 1,
            alignItems: 'center',
            textAlign: 'center',
          }}>
            {/* Title */}
            <h2
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: themeClasses.textPrimary,
                margin: 0,
                textAlign: 'center',
              }}
            >
              Remaining Formula Check Required
            </h2>

            {/* Body Text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center', alignItems: 'center' }}>
              <p
                style={{
                  fontSize: '14px',
                  color: themeClasses.textSecondary,
                  margin: 0,
                  lineHeight: '1.5',
                  textAlign: 'center',
                }}
              >
                This is the last product using the formula {formula}.
              </p>
              <p
                style={{
                  fontSize: '14px',
                  color: themeClasses.textSecondary,
                  margin: 0,
                  lineHeight: '1.5',
                  textAlign: 'center',
                }}
              >
                Is there any formula left in the vessel?
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', marginTop: 'auto', width: '100%' }}>
            <button
              onClick={onNo}
              style={{
                flex: 1,
                height: '32px',
                padding: 0,
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                color: '#000000',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: 1,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              No, Empty
            </button>
            <button
              onClick={onYes}
              style={{
                flex: 1,
                height: '32px',
                padding: 0,
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                color: '#000000',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: 1,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Yes, Formula Left
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RemainingFormulaCheckModal;



