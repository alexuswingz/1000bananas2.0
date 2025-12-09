import React from 'react';

const UncheckedFormulaModal = ({ isOpen, remainingCount = 0, onCancel, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 9998,
        }}
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '366px',
          height: '217px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          zIndex: 9999,
          padding: '24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#F97316',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0, marginBottom: '8px' }}>
            Unchecked Formula
          </h3>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
            {remainingCount} formula{remainingCount === 1 ? '' : 's'} has been left unchecked. Proceed anyway and mark as incomplete?
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              width: '151px',
              height: '31px',
              borderRadius: '4px',
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
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              width: '151px',
              height: '31px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#3B82F6',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
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
    </>
  );
};

export default UncheckedFormulaModal;

