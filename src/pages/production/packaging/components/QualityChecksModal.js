import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const QualityChecksModal = ({ isOpen, onClose, productData, onStartProduction }) => {
  const { isDarkMode } = useTheme();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const uploadAreaRef = useRef(null);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setUploadedFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const themeClasses = {
    modalBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  const getStepIcon = (stepId, isActive, isCompleted) => {
    const iconColor = isActive || isCompleted ? 'white' : '#6B7280';
    const iconSize = 24;
    const svgStyle = { display: 'block', verticalAlign: 'middle' };

    // If step is completed, show checkmark icon
    if (isCompleted) {
      return (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={svgStyle}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      );
    }

    switch (stepId) {
      case 'formula':
        // Flask/beaker icon - using icons.png image
        return (
          <img 
            src="/assets/icons.png" 
            alt="Formula" 
            width={iconSize} 
            height={iconSize} 
            style={{ display: 'block', objectFit: 'contain' }}
          />
        );
      case 'fillLevel':
        // Container/fill level icon
        return (
          <img 
            src="/assets/Container.png" 
            alt="Fill Level" 
            width={iconSize} 
            height={iconSize} 
            style={{ display: 'block', objectFit: 'contain' }}
          />
        );
      case 'seal':
        // Padlock icon
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2} style={svgStyle}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        );
      case 'product':
        // Bottle/container icon
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={svgStyle}>
            <path d="M10 2h4M10 2v2M10 4h4M10 4v16a2 2 0 002 2h0a2 2 0 002-2V4" />
          </svg>
        );
      case 'upcScan':
        // Barcode icon - vertical lines
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={iconColor} style={svgStyle}>
            <rect x="3" y="4" width="2" height="16" />
            <rect x="7" y="4" width="1" height="16" />
            <rect x="10" y="4" width="2" height="16" />
            <rect x="14" y="4" width="1" height="16" />
            <rect x="17" y="4" width="2" height="16" />
            <rect x="21" y="4" width="1" height="16" />
          </svg>
        );
      case 'boxSticker':
        // Cardboard box outline icon
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={svgStyle}>
            <rect x="3" y="8" width="18" height="12" rx="2" />
            <path d="M3 8l9-4 9 4M12 4v16" />
          </svg>
        );
      default:
        return null;
    }
  };

  const allSteps = [
    { id: 'formula', label: 'Formula', confirmationText: 'Confirm Correct Formula' },
    { id: 'fillLevel', label: 'Fill Level', confirmationText: 'Confirm Fill Level' },
    { id: 'seal', label: 'Seal', confirmationText: 'Confirm Seal' },
    { id: 'product', label: 'Product', confirmationText: 'Confirm Product' },
    { id: 'upcScan', label: 'UPC Scan', confirmationText: 'Confirm UPC Scan' },
    { id: 'boxSticker', label: 'Box Sticker', confirmationText: 'Confirm Box Sticker' },
  ];

  const steps = allSteps.map((step, index) => ({
    ...step,
    active: index === currentStepIndex,
    completed: index < currentStepIndex,
  }));

  const currentStep = allSteps[currentStepIndex];
  const isLastStep = currentStepIndex === allSteps.length - 1;

  const handleContinue = () => {
    if (isLastStep) {
      // Close QC modal and open Production Started modal
      onClose();
      if (onStartProduction) {
        onStartProduction();
      }
    } else {
      setCurrentStepIndex((prev) => prev + 1);
      setUploadedFile(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
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
          height: '558px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="bg-[#2C3544]"
          style={{
            padding: '1rem 1.5rem',
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 className="text-white text-lg font-semibold">Quality Checks (QC)</h2>
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

        {/* Separator Line */}
        <div
          style={{
            width: '100%',
            height: '1px',
            backgroundColor: '#E5E7EB',
          }}
        />

        {/* Content */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto' }}>
          {/* Step Indicator */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ width: '600px', height: '47px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
              {/* Continuous background line - spans full width, centered on icon circles */}
              <div
                style={{
                  position: 'absolute',
                  left: '16px',
                  right: '16px',
                  height: '2px',
                  backgroundColor: '#E5E7EB',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 0,
                }}
              />
              {/* Blue line segments for completed/active steps */}
              {steps.map((step, index) => {
                if (index === 0) return null; // First step doesn't need a line before it
                const prevStep = steps[index - 1];
                const isLineActive = prevStep.active || prevStep.completed;
                if (!isLineActive) return null;
                
                // Calculate positions with space-between distribution
                // Container: 600px, 6 items of 65px = 390px, remaining = 210px for 5 gaps = 42px per gap
                const stepWidth = 65;
                const totalStepWidth = 6 * stepWidth; // 390px
                const totalGap = 600 - totalStepWidth; // 210px
                const gapSize = totalGap / 5; // 42px per gap
                
                // Calculate center positions (center of each 32px circle)
                // Circle is centered in its 65px container, so center is at: container_left + 32.5px (center of 65px)
                const prevCenter = (index - 1) * stepWidth + (index - 1) * gapSize + stepWidth / 2;
                const currentCenter = index * stepWidth + index * gapSize + stepWidth / 2;
                const lineStart = prevCenter;
                const lineWidth = currentCenter - prevCenter;
                
                return (
                  <div
                    key={`line-${index}`}
                    style={{
                      position: 'absolute',
                      left: `${lineStart}px`,
                      width: `${lineWidth}px`,
                      height: '3px',
                      backgroundColor: '#22C55E',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 1,
                    }}
                  />
                );
              })}
              {/* Step circles and labels */}
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '65px',
                    height: '47px',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: step.active || step.completed ? '#22C55E' : '#E5E7EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '2px',
                      flexShrink: 0,
                      position: 'relative',
                      zIndex: 3,
                    }}
                  >
                    {getStepIcon(step.id, step.active, step.completed)}
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      color: step.active || step.completed ? '#22C55E' : '#6B7280',
                      fontWeight: step.active ? '600' : '400',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      lineHeight: '1',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Step Confirmation */}
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <p className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>
              {currentStep.id === 'formula' && productData?.formula 
                ? (
                  <>
                    Confirm Correct Formula:{' '}
                    <span style={{ color: '#3B82F6', fontWeight: '600' }}>
                      {productData.formula}
                    </span>
                  </>
                )
                : currentStep.confirmationText
              }
            </p>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <circle cx="7" cy="7" r="6.5" fill={isDarkMode ? '#9CA3AF' : '#6B7280'} />
              <path
                d="M7 4V7M7 10H7.01"
                stroke="white"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* File Upload Area */}
          <div
            ref={uploadAreaRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
              position: 'relative',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '600px',
              height: '296px',
              cursor: 'pointer',
              backgroundImage: `url('/assets/Asset Upload Area.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              transition: 'all 0.2s ease',
              marginBottom: '1rem',
            }}
            onMouseEnter={() => {
              if (uploadAreaRef.current) {
                uploadAreaRef.current.style.opacity = '0.9';
              }
            }}
            onMouseLeave={() => {
              if (uploadAreaRef.current) {
                uploadAreaRef.current.style.opacity = '1';
              }
            }}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <input
              id="file-upload"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
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
            onClick={handleContinue}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '6px',
              backgroundColor: '#3B82F6',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3B82F6';
            }}
          >
            {isLastStep ? 'Start Production' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QualityChecksModal;
