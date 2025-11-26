import React from 'react';
import { createPortal } from 'react-dom';

const VarianceExceededModal = ({ isOpen, onClose, onGoBack, onRecount, varianceCount = 0 }) => {
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
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
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
        {/* Orange Warning Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#F97316',
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
            stroke="#FFFFFF"
            strokeWidth="3"
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
            color: '#6B7280',
            margin: 0,
            textAlign: 'center',
            lineHeight: '1.5',
          }}
        >
          {varianceCount} {varianceCount === 1 ? 'product exceeds' : 'products exceed'} allowed variance. Please perform a recount.
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
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#F9FAFB',
              color: '#374151',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
            }}
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={onRecount}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
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
            Recount ({varianceCount})
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VarianceExceededModal;





