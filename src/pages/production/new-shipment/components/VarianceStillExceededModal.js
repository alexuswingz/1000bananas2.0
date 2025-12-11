import React from 'react';
import { createPortal } from 'react-dom';

const VarianceStillExceededModal = ({ isOpen, onClose, onGoBack, onConfirm }) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
          borderRadius: '12px',
          width: '420px',
          maxWidth: '92vw',
          padding: '20px',
          boxShadow: '0 18px 28px rgba(0, 0, 0, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#F59E0B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '4px',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
            <path d="M12 3C7.029 3 3 7.029 3 12s4.029 9 9 9 9-4.029 9-9-4.029-9-9-9Z" />
          </svg>
        </div>

        <h2
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#111827',
            margin: 0,
            textAlign: 'center',
          }}
        >
          Are you sure?
        </h2>

        <p
          style={{
            fontSize: '14px',
            fontWeight: 400,
            color: '#4B5563',
            margin: 0,
            textAlign: 'center',
            lineHeight: '1.5',
          }}
        >
          This update will change our live inventory. Continue?
        </p>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            width: '100%',
            marginTop: '6px',
          }}
        >
          <button
            type="button"
            onClick={onGoBack}
            style={{
              flex: 1,
              height: '36px',
              padding: '0 14px',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              color: '#111827',
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
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              height: '36px',
              padding: '0 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#0B7DFF',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0669D1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#0B7DFF';
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VarianceStillExceededModal;



