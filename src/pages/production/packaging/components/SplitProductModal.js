import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const SplitProductModal = ({ isOpen, onClose, product, onConfirm }) => {
  const { isDarkMode } = useTheme();
  const [firstBatchQty, setFirstBatchQty] = useState('');
  const [secondBatchQty, setSecondBatchQty] = useState(0);

  // Get the total quantity from the product (try multiple possible property names)
  const totalQty = product?.qty || product?.quantity || product?.totalQty || 0;

  // Update second batch quantity when first batch changes
  useEffect(() => {
    if (firstBatchQty === '') {
      setSecondBatchQty(0);
      return;
    }

    const firstQty = parseFloat(firstBatchQty.replace(/,/g, '')) || 0;
    const secondQty = Math.max(0, totalQty - firstQty);
    setSecondBatchQty(secondQty);
  }, [firstBatchQty, totalQty]);

  // Initialize first batch quantity when modal opens
  useEffect(() => {
    if (product && totalQty > 0) {
      // Set initial value to a large portion (e.g., 70,000 if total is 72,000)
      const initialValue = Math.floor(totalQty * 0.97); // 97% of total
      setFirstBatchQty(initialValue.toLocaleString());
    } else {
      setFirstBatchQty('');
      setSecondBatchQty(0);
    }
  }, [product, totalQty]);

  const handleFirstBatchChange = (e) => {
    const value = e.target.value.replace(/,/g, '');
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      const numValue = value === '' ? '' : parseInt(value, 10);
      if (numValue === '' || (numValue >= 0 && numValue <= totalQty)) {
        setFirstBatchQty(value === '' ? '' : numValue.toLocaleString());
      }
    }
  };

  const handleConfirm = () => {
    const firstQty = parseFloat(firstBatchQty.replace(/,/g, '')) || 0;
    if (firstQty > 0 && firstQty < totalQty && onConfirm) {
      onConfirm({
        firstBatchQty: firstQty,
        secondBatchQty: secondBatchQty,
        product: product,
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setFirstBatchQty('');
    setSecondBatchQty(0);
    if (onClose) {
      onClose();
    }
  };

  console.log('SplitProductModal: isOpen=', isOpen, 'product=', product);
  
  if (!product) {
    console.log('SplitProductModal: No product provided, returning null');
    return null;
  }

  console.log('SplitProductModal: Rendering modal for product:', product, 'totalQty:', totalQty);

  const firstQtyNum = parseFloat(firstBatchQty.replace(/,/g, '')) || 0;
  const isValid = firstQtyNum > 0 && firstQtyNum < totalQty;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={handleClose}
      >
        {/* Modal */}
        <div
          style={{
            width: '90%',
            maxWidth: '500px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              backgroundColor: '#1C2634',
              padding: '1rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
            }}
          >
            <h2
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#FFFFFF',
                margin: 0,
              }}
            >
              Split Product Quantity
            </h2>
            <button
              type="button"
              onClick={handleClose}
              style={{
                width: '24px',
                height: '24px',
                border: 'none',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <svg
                style={{ width: '16px', height: '16px' }}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 6L18 18M18 6L6 18"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            {/* First Batch Quantity */}
            <div>
              <label
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '8px',
                  color: '#111827',
                }}
              >
                First Batch Quantity (Units)
              </label>
              <p
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  margin: '0 0 8px 0',
                }}
              >
                Enter the quantity of units for the first batch.
              </p>
              <input
                type="text"
                value={firstBatchQty}
                onChange={handleFirstBatchChange}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#111827',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#3B82F6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#D1D5DB';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Second Batch Quantity */}
            <div>
              <label
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '8px',
                  color: '#111827',
                }}
              >
                Second Batch Quantity (Units)
              </label>
              <p
                style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  margin: '0 0 8px 0',
                }}
              >
                Auto-calculated from the first batch.
              </p>
              <input
                type="text"
                value={secondBatchQty.toLocaleString()}
                readOnly
                disabled
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#6B7280',
                  backgroundColor: '#F9FAFB',
                  outline: 'none',
                  cursor: 'not-allowed',
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
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
              onClick={handleConfirm}
              disabled={!isValid}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '14px',
                fontWeight: 500,
                backgroundColor: isValid ? '#3B82F6' : '#9CA3AF',
                color: '#FFFFFF',
                cursor: isValid ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (isValid) {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }
              }}
              onMouseLeave={(e) => {
                if (isValid) {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }
              }}
            >
              Confirm Split
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default SplitProductModal;

