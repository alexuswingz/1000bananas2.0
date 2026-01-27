import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';

const LabelCheckCompleteModal = ({ isOpen, onClose, onGoToShipments, onBeginFormulaCheck, onBeginBookShipment, isFormulaCheckCompleted }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  const handleGoToShipments = () => {
    if (onGoToShipments) {
      onGoToShipments();
    }
    onClose();
    // Navigate to planning table with refresh flag
    navigate('/dashboard/production/planning', { 
      state: { refresh: true } 
    });
  };

  const handleBeginNextStep = () => {
    if (isFormulaCheckCompleted) {
      // If Formula Check is completed, go to Book Shipment
      if (onBeginBookShipment) {
        onBeginBookShipment();
      }
    } else {
      // Otherwise, go to Formula Check
      if (onBeginFormulaCheck) {
        onBeginFormulaCheck();
      }
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.35)',
          zIndex: 9998,
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
            borderRadius: '14px',
            width: '400px',
            border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 9999,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
              width: '24px',
              height: '24px',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div style={{
            padding: '32px 24px 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}>
            {/* Green checkmark icon */}
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12L10 17L19 8" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: isDarkMode ? '#F9FAFB' : '#111827',
              margin: 0,
              textAlign: 'center',
            }}>
              Label Check Complete!
            </h2>
          </div>

          {/* Footer buttons */}
          <div style={{
            padding: '14px 20px 20px',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
          }}>
            {/* Go to Shipments button */}
            <button
              type="button"
              onClick={handleGoToShipments}
              style={{
                minWidth: '170px',
                height: '31px',
                padding: '0 14px',
                borderRadius: '4px',
                border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
                backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                color: isDarkMode ? '#F9FAFB' : '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#4B5563' : '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#FFFFFF';
              }}
            >
              Go to Shipments
            </button>

            {/* Begin Formula Check / Begin Book Shipment button */}
            <button
              type="button"
              onClick={handleBeginNextStep}
              style={{
                minWidth: '170px',
                height: '31px',
                padding: '0 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#005FCC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3B82F6';
              }}
            >
              {isFormulaCheckCompleted ? 'Begin Book Shipment' : 'Begin Formula Check'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LabelCheckCompleteModal;




