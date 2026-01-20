import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { toast } from 'sonner';

const LogUnitsProducedModal = ({ isOpen, onClose, productData, onConfirm }) => {
  const { isDarkMode } = useTheme();
  const [unitsProduced, setUnitsProduced] = useState('');
  const [remainingQuantity, setRemainingQuantity] = useState(0);

  useEffect(() => {
    if (isOpen && productData) {
      // Pre-fill with existing units produced if available, otherwise start with 0
      const existingUnits = productData.unitsProduced || 0;
      setUnitsProduced(existingUnits.toString());
      calculateRemaining(existingUnits);
    }
  }, [isOpen, productData]);

  const calculateRemaining = (produced) => {
    const total = productData?.qty || 0;
    const producedNum = parseFloat(produced) || 0;
    const remaining = Math.max(0, total - producedNum);
    setRemainingQuantity(remaining);
  };

  const handleUnitsProducedChange = (e) => {
    const value = e.target.value;
    // Allow empty string, numbers, and decimal points
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setUnitsProduced(value);
      calculateRemaining(value);
    }
  };

  const handleClose = () => {
    setUnitsProduced('');
    setRemainingQuantity(0);
    onClose();
  };

    const handleConfirm = () => {
    const produced = parseFloat(unitsProduced) || 0;
    if (onConfirm) {
      onConfirm(produced);
    }
    
    // Show toast notification
    const productDisplayName = `${productName}${productSize ? ` (${productSize})` : ''}`;
    toast.success(
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span style={{ fontSize: '14px', color: '#111827', fontWeight: '500' }}>
          Units Produced logged for {productDisplayName}
        </span>
      </div>,
      {
        style: {
          width: '473px',
          height: '36px',
          borderRadius: '12px',
          padding: '8px 12px',
          gap: '24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
        duration: 3000,
      }
    );
    
    onClose();
  };

  if (!isOpen) return null;

  const themeClasses = {
    modalBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  const totalUnits = productData?.qty || 0;
  const productName = productData?.product || 'Product';
  const productSize = productData?.size || '';

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
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600', margin: 0 }}>
            Log Units Produced
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: themeClasses.textSecondary,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Product Information Box */}
          <div
            style={{
              backgroundColor: isDarkMode ? '#1F2937' : '#E9F4FF',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '14px', color: themeClasses.textPrimary, fontWeight: '500' }}>
              {productName} {productSize ? `(${productSize})` : ''}
            </span>
            <span style={{ fontSize: '14px', color: '#2563EB', fontWeight: '600' }}>
              Total: {totalUnits.toLocaleString()} units
            </span>
          </div>

          {/* Units Produced Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                fontSize: '14px',
                fontWeight: '500',
                color: themeClasses.textPrimary,
              }}
            >
              Units Produced (Units)
            </label>
            <p
              style={{
                fontSize: '12px',
                color: themeClasses.textSecondary,
                margin: 0,
              }}
            >
              Enter the quantity of units produced so far.
            </p>
            <input
              type="text"
              value={unitsProduced}
              onChange={handleUnitsProducedChange}
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                borderRadius: '8px',
                border: `1px solid #2563EB`,
                backgroundColor: themeClasses.inputBg,
                color: themeClasses.textPrimary,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="0"
            />
          </div>

          {/* Remaining Quantity Display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                fontSize: '14px',
                fontWeight: '500',
                color: themeClasses.textPrimary,
              }}
            >
              Remaining Quantity (Units)
            </label>
            <p
              style={{
                fontSize: '12px',
                color: themeClasses.textSecondary,
                margin: 0,
              }}
            >
              Auto-calculated from the units produced.
            </p>
            <input
              type="text"
              value={remainingQuantity.toLocaleString()}
              readOnly
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                borderRadius: '8px',
                border: `1px solid ${themeClasses.border}`,
                backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
                color: themeClasses.textSecondary,
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                cursor: 'not-allowed',
              }}
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div
          style={{
            padding: '24px',
            borderTop: `1px solid ${themeClasses.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              height: '40px',
              padding: '0 16px',
              borderRadius: '8px',
              border: `1px solid ${themeClasses.border}`,
              backgroundColor: themeClasses.modalBg,
              color: themeClasses.textPrimary,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              height: '40px',
              padding: '0 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1D4ED8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2563EB';
            }}
          >
            Confirm Split
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LogUnitsProducedModal;

