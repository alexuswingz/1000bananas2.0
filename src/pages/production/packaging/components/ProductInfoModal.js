import React, { useState, useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ProductInfoModal = ({ isOpen, onClose, onBeginQC, productData }) => {
  const { isDarkMode } = useTheme();
  const [selectedTab, setSelectedTab] = useState('fillLevel');
  const [uploadedFile, setUploadedFile] = useState(null);
  const uploadAreaRef = useRef(null);

  if (!isOpen) return null;

  const themeClasses = {
    modalBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  const qualityCheckTabs = [
    { id: 'formula', label: 'Formula' },
    { id: 'fillLevel', label: 'Fill Level' },
    { id: 'seal', label: 'Seal' },
    { id: 'product', label: 'Product' },
    { id: 'upcScan', label: 'UPC Scan' },
    { id: 'boxSticker', label: 'Box Sticker' },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      setUploadedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
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
          borderRadius: '12px',
          width: '648px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="bg-[#2C3544]"
          style={{
            width: '100%',
            height: '56px',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            borderBottomWidth: '1px',
            borderBottomStyle: 'solid',
            borderBottomColor: themeClasses.border,
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
          <h2 className="text-white text-lg font-semibold">Production Started</h2>
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
          {/* Product Information Section */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Product Image */}
            <div
              style={{
                width: '150px',
                height: '200px',
                flexShrink: 0,
                backgroundColor: 'transparent',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Placeholder for product image - white box with red border and red banner */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  position: 'relative',
                  border: '1px solid #EF4444',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  overflow: 'hidden',
                }}
              >
                {/* Red banner at top */}
                <div
                  style={{
                    width: '100%',
                    height: '50px',
                    backgroundColor: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    padding: '8px 4px',
                    boxSizing: 'border-box',
                  }}
                >
                  CHERRY TREE FERTILIZER
                </div>
                {/* Cherry blossom icon in center */}
                <div 
                  style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: '48px'
                  }}
                >
                  🌸
                </div>
              </div>
            </div>

            {/* Product Details - Two Columns */}
            <div 
              style={{ 
                flex: 1, 
                backgroundColor: '#F3F4F6',
                borderRadius: '8px',
                padding: '1.5rem',
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '2rem'
              }}
            >
              <div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span className={themeClasses.textSecondary} style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem' }}>
                    Brand:
                  </span>
                  <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '600' }}>
                    {productData?.brand || 'TPS Plant Foods'}
                  </span>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span className={themeClasses.textSecondary} style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem' }}>
                    Product Name:
                  </span>
                  <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '600' }}>
                    {productData?.product || 'Cherry Tree Fertilizer'}
                  </span>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span className={themeClasses.textSecondary} style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem' }}>
                    Size:
                  </span>
                  <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '600' }}>
                    {productData?.size || '8oz'}
                  </span>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span className={themeClasses.textSecondary} style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem' }}>
                    Label Location:
                  </span>
                  <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '600' }}>
                    {productData?.labelLocation || 'LBL-PLANT-218'}
                  </span>
                </div>
              </div>
              <div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span className={themeClasses.textSecondary} style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem' }}>
                    Formula:
                  </span>
                  <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '600' }}>
                    {productData?.formula || 'F.Ultra Grow'}
                  </span>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span className={themeClasses.textSecondary} style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem' }}>
                    QTY:
                  </span>
                  <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '600' }}>
                    {productData?.qty?.toLocaleString() || '72,000'}
                  </span>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span className={themeClasses.textSecondary} style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem' }}>
                    Case #:
                  </span>
                  <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '600' }}>
                    {productData?.caseNumber || '488'}
                  </span>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span className={themeClasses.textSecondary} style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem' }}>
                    TPS Ship #:
                  </span>
                  <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '600' }}>
                    {productData?.tpsShipNumber || '10-01-2025'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quality Checks Section */}
          <div style={{ marginBottom: '2rem' }}>
            {/* Quality Checks Title */}
            <h3 className={themeClasses.textPrimary} style={{ fontSize: '16px', fontWeight: '600', marginBottom: '1rem', marginTop: 0 }}>
              Quality Checks
            </h3>
            
            {/* Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                borderBottom: `1px solid ${themeClasses.border}`,
                marginBottom: '1rem',
              }}
            >
              {qualityCheckTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  style={{
                    padding: '0.75rem 1rem',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    borderBottom: selectedTab === tab.id ? `2px solid #2563EB` : `2px solid transparent`,
                    marginBottom: '-1px',
                    color: selectedTab === tab.id ? '#2563EB' : themeClasses.textSecondary,
                    fontWeight: selectedTab === tab.id ? '600' : '400',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Upload Area */}
            <div
              ref={uploadAreaRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('file-upload-modal').click()}
              style={{
                border: `2px dashed ${themeClasses.border}`,
                borderRadius: '8px',
                padding: '3rem 2rem',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                e.currentTarget.style.borderColor = '#2563EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1F2937' : '#F9FAFB';
                e.currentTarget.style.borderColor = themeClasses.border;
              }}
            >
              <input
                id="file-upload-modal"
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              {uploadedFile ? (
                <div>
                  <img
                    src="/assets/photo_camera.png"
                    alt="Upload"
                    style={{ width: '48px', height: '48px', margin: '0 auto 0.5rem', display: 'block' }}
                  />
                  <p className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '500', marginBottom: '0.25rem' }}>
                    {uploadedFile.name}
                  </p>
                  <p className={themeClasses.textSecondary} style={{ fontSize: '12px' }}>
                    Click to change
                  </p>
                </div>
              ) : (
                <>
                  <img
                    src="/assets/photo_camera.png"
                    alt="Upload"
                    style={{ width: '48px', height: '48px', margin: '0 auto 1rem', display: 'block' }}
                  />
                  <p className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '500', marginBottom: '0.25rem' }}>
                    Drag and drop photo or Click to upload
                  </p>
                  <p className={themeClasses.textSecondary} style={{ fontSize: '12px' }}>
                    Max size: 5MB (JPG, PNG)
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Production Notes Section */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3 className={themeClasses.textPrimary} style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                Production Notes
              </h3>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563EB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1D4ED8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add Note
              </button>
            </div>
            <div
              style={{
                padding: '1rem',
                backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
                borderRadius: '8px',
                border: `1px solid ${themeClasses.border}`,
              }}
            >
              <div style={{ marginBottom: '0.5rem' }}>
                <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '500' }}>
                  Christian R.
                </span>
                <span className={themeClasses.textSecondary} style={{ fontSize: '14px', marginLeft: '0.5rem' }}>
                  Aug 20, 2025
                </span>
              </div>
              <p className={themeClasses.textSecondary} style={{ fontSize: '14px', margin: 0, lineHeight: '1.5' }}>
                F.Succulent isn't ready to be made. It'll take to a couple days for the remaining raw materials to arrive.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: `1px solid ${themeClasses.border}`,
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
              border: `1px solid ${themeClasses.border}`,
              backgroundColor: themeClasses.modalBg,
              color: themeClasses.textPrimary,
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = themeClasses.modalBg;
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            Pause
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '6px',
              backgroundColor: '#10B981',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#10B981';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Mark Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductInfoModal;
