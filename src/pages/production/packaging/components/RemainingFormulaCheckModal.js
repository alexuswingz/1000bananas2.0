import React from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const RemainingFormulaCheckModal = ({ isOpen, onClose, onYes, onNo, productData }) => {
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  const formula = productData?.formula || 'F.Ultra Grow';

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10002,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          width: '496px',
          height: '227px',
          borderRadius: '12px',
          border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
          overflow: 'visible',
          boxShadow: isDarkMode 
            ? '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          gap: '24px',
          opacity: 1,
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div style={{ 
          textAlign: 'center', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '10px',
          flex: '1 1 auto',
          minHeight: 0,
          justifyContent: 'flex-start',
        }}>
          {/* Warning Icon */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '16px',
              backgroundColor: '#F97316',
              padding: '8px',
              gap: '5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img
              src="/assets/In1.png"
              alt="Warning icon"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          {/* Text Section */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '4px', 
            flexShrink: 1, 
            minHeight: 0,
            alignItems: 'center',
            textAlign: 'center',
          }}>
            {/* Title */}
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: isDarkMode ? '#F9FAFB' : '#111827',
                margin: 0,
                lineHeight: '1.3',
              }}
            >
              Remaining Formula Check Required
            </h2>

            {/* Body Text */}
            <p
              style={{
                fontSize: '15px',
                color: isDarkMode ? '#D1D5DB' : '#111827',
                margin: 0,
                lineHeight: '1.4',
              }}
            >
              This is the last product using the formula {formula}.
            </p>
            <p
              style={{
                fontSize: '15px',
                color: isDarkMode ? '#D1D5DB' : '#111827',
                margin: 0,
                lineHeight: '1.4',
              }}
            >
              Is there any formula left in the vessel?
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          justifyContent: 'space-between',
          gap: '8px', 
          flexShrink: 0,
          width: '100%',
        }}>
          <button
            onClick={onNo}
            style={{
              width: '216px',
              height: '31px',
              borderRadius: '6px',
              paddingTop: '8px',
              paddingRight: '16px',
              paddingBottom: '8px',
              paddingLeft: '16px',
              border: '1px solid',
              borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              color: isDarkMode ? '#F9FAFB' : '#000000',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: 1,
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#1F2937' : '#FFFFFF';
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
              width: '216px',
              height: '31px',
              borderRadius: '6px',
              paddingTop: '8px',
              paddingRight: '16px',
              paddingBottom: '8px',
              paddingLeft: '16px',
              border: '1px solid',
              borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              color: isDarkMode ? '#F9FAFB' : '#000000',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: 1,
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#1F2937' : '#FFFFFF';
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
    </div>,
    document.body
  );
};

export default RemainingFormulaCheckModal;



