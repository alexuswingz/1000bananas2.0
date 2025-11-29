import React from 'react';
import { createPortal } from 'react-dom';

const VarianceStillExceededModal = ({ isOpen, onClose, onGoBack, onConfirm }) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '8px',
          width: '400px',
          maxWidth: '90vw',
          padding: '32px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon - Gray outlined circle with orange exclamation */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            border: '2px solid #E5E7EB',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F97316"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 9v4M12 17h.01" />
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          </svg>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#111827',
            margin: 0,
            textAlign: 'center',
          }}
        >
          Variance Exceeded
        </h2>

        {/* Message */}
        <p
          style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#374151',
            margin: 0,
            textAlign: 'center',
            lineHeight: '1.5',
          }}
        >
          Your recount still exceeds the allowed variance. Confirm this variance or go back and edit the count.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            width: '100%',
            marginTop: '8px',
          }}
        >
          <button
            type="button"
            onClick={onGoBack}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3B82F6';
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

export default VarianceStillExceededModal;

