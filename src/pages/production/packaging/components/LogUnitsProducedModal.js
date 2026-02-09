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
      // Debug: log productData to verify structure
      console.log('LogUnitsProducedModal - productData received:', productData);
      console.log('LogUnitsProducedModal - product field:', productData.product);
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
      `Units Produced logged for ${productDisplayName}`,
      {
        style: {
          width: '473px',
          height: '36px',
          borderRadius: '12px',
          padding: '8px 12px',
          gap: '24px',
          backgroundColor: '#111827',
          border: '1px solid #374151',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
          color: '#FFFFFF',
          fontSize: '14px',
          fontWeight: '500',
        },
        duration: 3000,
      }
    );
    
    onClose();
  };

  if (!isOpen) return null;

  // Always use dark mode styling for this modal
  const themeClasses = {
    modalBg: '#111827',
    textPrimary: '#FFFFFF',
    textSecondary: '#9CA3AF',
    border: '#374151',
    inputBg: '#1F2937',
  };

  const totalUnits = productData?.qty || 0;
  // Get product name from table - check multiple possible field names
  // The table uses 'product' field, so prioritize that
  const productName = (productData && (productData.product || productData.product_name || productData.productName)) || 'Product';
  const productSize = productData?.size || '';

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
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
        style={{
          width: '424px',
          height: '340px',
          backgroundColor: '#111827',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
          opacity: 1,
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
            Log Units Produced
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
          borderBottom: 'none',
          marginBottom: '0',
        }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#FFFFFF',
              marginBottom: '8px',
            }}
          >
            Units Produced (Units)
          </h3>
          <p
            style={{
              fontSize: '14px',
              color: '#9CA3AF',
              marginBottom: '16px',
            }}
          >
            Enter the quantity of units produced so far.
          </p>

          <input
            type="text"
            value={unitsProduced}
            onChange={handleUnitsProducedChange}
            placeholder="Enter units produced here..."
            style={{
              width: '376px',
              height: '41px',
              paddingTop: '12px',
              paddingRight: '16px',
              paddingBottom: '12px',
              paddingLeft: '16px',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: '#374151',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: '#4B5563',
              color: '#FFFFFF',
              marginBottom: '16px',
              boxSizing: 'border-box',
              outline: 'none',
              display: 'block',
              opacity: 1,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3B82F6';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#374151';
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
              Remaining Quantity: <b>{remainingQuantity.toLocaleString()} units</b> (Auto-calculated from the units produced)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            paddingTop: '16px',
            paddingRight: '24px',
            paddingBottom: '16px',
            paddingLeft: '24px',
            display: 'flex',
            gap: '16px',
            justifyContent: 'space-between',
            backgroundColor: '#111827',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            borderTop: 'none',
            borderBottom: 'none',
            marginTop: '0',
          }}
        >
          <button
            onClick={handleClose}
            style={{
              width: '72px',
              height: '31px',
              borderRadius: '4px',
              gap: '10px',
              opacity: 1,
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: '#374151',
              backgroundColor: '#374151',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              padding: 0,
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
            style={{
              width: '107px',
              height: '31px',
              borderRadius: '6px',
              gap: '8px',
              paddingTop: '8px',
              paddingRight: '16px',
              paddingBottom: '8px',
              paddingLeft: '16px',
              border: 'none',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              opacity: 1,
              whiteSpace: 'nowrap',
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

