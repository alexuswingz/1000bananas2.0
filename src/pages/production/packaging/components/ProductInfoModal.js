import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ProductInfoModal = ({ isOpen, onClose, onBeginQC, productData }) => {
  const { isDarkMode } = useTheme();
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const themeClasses = {
    modalBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  // Use dark colors for desktop mode (matching vine table)
  const desktopModalBg = !isMobile ? '#111827' : (isDarkMode ? '#1a1a1a' : '#FFFFFF');
  const desktopTextPrimary = !isMobile ? '#FFFFFF' : (isDarkMode ? '#FFFFFF' : '#111827');
  const desktopTextSecondary = !isMobile ? '#9CA3AF' : (isDarkMode ? '#a0a0a0' : '#6B7280');

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
        padding: isMobile ? '12px' : '0',
      }}
      onClick={onClose}
    >
      <div
        style={{
          borderRadius: '12px',
          width: isMobile ? '100%' : '580px',
          maxWidth: isMobile ? '640px' : '90vw',
          maxHeight: '90vh',
          backgroundColor: desktopModalBg,
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
            width: '100%',
            height: '56px',
            backgroundColor: '#111827',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            paddingTop: '16px',
            paddingRight: '24px',
            paddingBottom: '16px',
            paddingLeft: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <h2 className="text-white text-lg font-semibold">Product Information</h2>
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

        {/* Separation Line */}
        <div
          style={{
            width: '100%',
            height: '1px',
            backgroundColor: '#374151',
          }}
        />

        {/* Content */}
        <div
          style={{
            padding: isMobile ? '1rem' : '1.25rem',
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            gap: '16px',
            flexDirection: isMobile ? 'column' : 'row',
            backgroundColor: desktopModalBg,
          }}
        >
          {/* Product Image Container - First on desktop, second on mobile */}
          {!isMobile && (
            <div
              style={{
                flexShrink: 0,
                position: 'relative',
                backgroundColor: !isMobile ? '#1F2937' : (isDarkMode ? '#1F2937' : '#FFFFFF'),
                borderRadius: '8px',
                border: `1px solid ${!isMobile ? '#374151' : '#E5E7EB'}`,
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '160px',
              }}
            >
              <img
                src={productData?.productImage || '/assets/TPS_Cherry Tree_8oz_Wrap (1).png'}
                alt={productData?.product || 'Product'}
                style={{
                  width: '100px',
                  height: '180px',
                  objectFit: 'contain',
                }}
              />
              {/* Expand Icon */}
              <button
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '24px',
                  height: '24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #E5E7EB',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            </div>
          )}

          {/* Product Information Container */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px 16px',
              alignContent: 'start',
              padding: isMobile ? '12px' : '16px',
              backgroundColor: '#141C2D',
              borderRadius: '8px',
              border: `1px solid ${!isMobile ? '#374151' : (isDarkMode ? '#2d2d2d' : '#E5E7EB')}`,
            }}
          >
            {/* Left Column */}
            <div>
              <span style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: desktopTextSecondary }}>
                Brand
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: desktopTextPrimary }}>
                {productData?.brand || 'TPS Plant Foods'}
              </span>
            </div>

            {/* Right Column */}
            <div>
              <span style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: desktopTextSecondary }}>
                Formula
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: desktopTextPrimary }}>
                {productData?.formula || 'F.Ultra Grow'}
              </span>
            </div>

            {/* Product Name */}
            <div>
              <span style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: desktopTextSecondary }}>
                Product Name
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: desktopTextPrimary }}>
                {productData?.product || 'Cherry Tree Fertilizer'}
              </span>
            </div>

            {/* QTY */}
            <div>
              <span style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: desktopTextSecondary }}>
                QTY
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: desktopTextPrimary }}>
                {productData?.qty?.toLocaleString() || '72,000'}
              </span>
            </div>

            {/* Size */}
            <div>
              <span style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: desktopTextSecondary }}>
                Size
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: desktopTextPrimary }}>
                {productData?.size || '8oz'}
              </span>
            </div>

            {/* Case # */}
            <div>
              <span style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: desktopTextSecondary }}>
                Case #
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: desktopTextPrimary }}>
                {productData?.caseNumber || '488'}
              </span>
            </div>

            {/* Label Location */}
            <div>
              <span style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: desktopTextSecondary }}>
                Label Location
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: desktopTextPrimary }}>
                {productData?.labelLocation || 'LBL-PLANT-218'}
              </span>
            </div>

            {/* TPS Ship # */}
            <div>
              <span style={{ fontSize: '11px', display: 'block', marginBottom: '2px', color: desktopTextSecondary }}>
                TPS Ship #
              </span>
              <span style={{ fontSize: '13px', fontWeight: '600', display: 'block', color: desktopTextPrimary }}>
                {productData?.tpsShipNumber || '10-01-2025'}
              </span>
            </div>
          </div>

          {/* Product Image Container - Second on mobile */}
          {isMobile && (
            <div
              style={{
                flexShrink: 0,
                position: 'relative',
                backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: '260px',
              }}
            >
              <img
                src={productData?.productImage || '/assets/TPS_Cherry Tree_8oz_Wrap (1).png'}
                alt={productData?.product || 'Product'}
                style={{
                  width: '160px',
                  height: '260px',
                  objectFit: 'contain',
                }}
              />
              {/* Expand Icon */}
              <button
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '24px',
                  height: '24px',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #E5E7EB',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #374151',
            backgroundColor: '#141C2D',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '6px',
              border: `1px solid ${!isMobile ? '#374151' : (isDarkMode ? '#2d2d2d' : '#E5E7EB')}`,
              backgroundColor: !isMobile ? '#1F2937' : (isDarkMode ? '#1a1a1a' : '#FFFFFF'),
              color: desktopTextPrimary,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = !isMobile ? '#374151' : (isDarkMode ? '#2a2a2a' : '#F9FAFB');
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = !isMobile ? '#1F2937' : (isDarkMode ? '#1a1a1a' : '#FFFFFF');
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
