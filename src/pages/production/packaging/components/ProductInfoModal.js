import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ProductInfoModal = ({ isOpen, onClose, onBeginQC, productData }) => {
  const { isDarkMode } = useTheme();

  if (!isOpen) return null;

  const themeClasses = {
    modalBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  return (
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
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className={themeClasses.modalBg}
        style={{
          borderRadius: '8px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="bg-[#2C3544]"
          style={{
            padding: '1rem 1.5rem',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 className="text-white text-lg font-semibold">Product Info</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-300 transition-colors"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className={themeClasses.textSecondary} style={{ fontSize: '14px' }}>Brand:</span>
              <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '500' }}>
                {productData?.brand || 'TPS Plant Foods'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className={themeClasses.textSecondary} style={{ fontSize: '14px' }}>Formula:</span>
              <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '500' }}>
                {productData?.formula || 'F.Ultra Grow'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className={themeClasses.textSecondary} style={{ fontSize: '14px' }}>Product Name:</span>
              <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '500' }}>
                {productData?.product || 'Cherry Tree Fertilizer'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className={themeClasses.textSecondary} style={{ fontSize: '14px' }}>QTY:</span>
              <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '500' }}>
                {productData?.qty?.toLocaleString() || '72,000'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className={themeClasses.textSecondary} style={{ fontSize: '14px' }}>Size:</span>
              <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '500' }}>
                {productData?.size || '8oz'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className={themeClasses.textSecondary} style={{ fontSize: '14px' }}>Case #:</span>
              <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '500' }}>
                {productData?.caseNumber || '488'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className={themeClasses.textSecondary} style={{ fontSize: '14px' }}>Label Location:</span>
              <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '500' }}>
                {productData?.labelLocation || 'LBL-PLANT-218'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className={themeClasses.textSecondary} style={{ fontSize: '14px' }}>TPS Ship #:</span>
              <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '500' }}>
                {productData?.tpsShipNumber || '10-01-2025'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button
            onClick={onClose}
            className={themeClasses.modalBg}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '6px',
              border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
              color: themeClasses.textPrimary,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = themeClasses.modalBg.includes('dark') ? '#1F2937' : '#FFFFFF';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onBeginQC}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '6px',
              backgroundColor: '#2563EB',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#1D4ED8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#2563EB';
            }}
          >
            Begin QC
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductInfoModal;
