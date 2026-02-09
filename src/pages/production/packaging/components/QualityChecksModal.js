import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const QualityChecksModal = ({ isOpen, onClose, productData, onStartProduction }) => {
  const { isDarkMode } = useTheme();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [qualityCheckImages, setQualityCheckImages] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const uploadAreaRef = useRef(null);
  const dropdownRef = useRef(null);

  // Detect mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setUploadedFile(null);
      setQualityCheckImages([]);
      setIsDropdownOpen(false);
      if (uploadedFileUrl) {
        URL.revokeObjectURL(uploadedFileUrl);
        setUploadedFileUrl(null);
      }
    }
  }, [isOpen]);

  // Cleanup object URL when component unmounts
  useEffect(() => {
    return () => {
      if (uploadedFileUrl) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
    };
  }, [uploadedFileUrl]);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

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
    { 
      id: 'formula', 
      label: 'Formula Verifications', 
      confirmationText: 'Confirm Correct Formula',
      description: 'Verify the correct fertilizer formula was used for this product and batch.',
      icon: '/assets/basura.png'
    },
    { 
      id: 'fillLevel', 
      label: 'Fill Level', 
      confirmationText: 'Confirm Fill Level',
      description: 'Ensure each container is filled to the approved level by shining a light behind the bottle for clarity.',
      icon: '/assets/level.png'
    },
    { 
      id: 'seal', 
      label: 'Proper Seal', 
      confirmationText: 'Confirm Proper Seal',
      description: 'Confirm all containers are properly sealed with no leaks, burns, or defects.',
      icon: '/assets/seal.png'
    },
    { 
      id: 'product', 
      label: 'Finished Product', 
      confirmationText: 'Confirm Finished Product',
      description: 'Verify the product is fully finished, including proper labeling and cap tightness.',
      icon: '/assets/TPS_Cherry Tree_8oz_Wrap (1).png'
    },
    { 
      id: 'upcScan', 
      label: 'UPC', 
      confirmationText: 'Confirm UPC',
      description: 'Confirm the correct UPC label is applied and scannable.',
      icon: '/assets/scan.png'
    },
    { 
      id: 'boxSticker', 
      label: 'Box Sticker', 
      confirmationText: 'Confirm Box Sticker',
      description: 'Verify the correct box sticker is applied and legible on all cases.',
      icon: '/assets/box.png'
    },
  ];

  const steps = allSteps.map((step, index) => ({
    ...step,
    active: index === currentStepIndex,
    completed: index < currentStepIndex,
  }));

  const currentStep = allSteps[currentStepIndex];
  const isLastStep = currentStepIndex === allSteps.length - 1;

  const handleContinue = () => {
    // Store the uploaded image for current step
    if (uploadedFileUrl) {
      const newImages = [...qualityCheckImages];
      newImages[currentStepIndex] = uploadedFileUrl;
      setQualityCheckImages(newImages);
    }
    
    // Cleanup uploaded file URL
    if (uploadedFileUrl) {
      URL.revokeObjectURL(uploadedFileUrl);
      setUploadedFileUrl(null);
    }
    
    if (isLastStep) {
      // Close QC modal and open Production Started modal with images
      setUploadedFile(null);
      onClose();
      if (onStartProduction) {
        // Pass quality check images to production started modal
        onStartProduction(qualityCheckImages);
      }
    } else {
      setCurrentStepIndex((prev) => prev + 1);
      setUploadedFile(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Cleanup previous URL if exists
      if (uploadedFileUrl) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
      setUploadedFile(file);
      setUploadedFileUrl(URL.createObjectURL(file));
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

  // Mobile Layout
  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: isDarkMode ? '#111827' : '#F3F4F6',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto',
        }}
      >
        {/* Mobile Header */}
        <div
          style={{
            backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
            padding: '12px 16px',
            borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
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
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#FFFFFF' : '#374151'} strokeWidth={2}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#111827', margin: 0 }}>
            Quality Check
          </h2>
          <div style={{ position: 'relative', minWidth: '120px' }}>
            <select
              value={currentStepIndex}
              onChange={(e) => {
                setCurrentStepIndex(Number(e.target.value));
                setUploadedFile(null);
              }}
              style={{
                width: '100%',
                padding: '6px 24px 6px 8px',
                fontSize: '12px',
                fontWeight: '500',
                color: isDarkMode ? '#FFFFFF' : '#374151',
                backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                border: isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
                borderRadius: '6px',
                appearance: 'none',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {allSteps.map((step, index) => {
                const prefix = `${index + 1}. `;
                const maxLabelLength = 10;
                const truncatedLabel = step.label.length > maxLabelLength 
                  ? step.label.substring(0, maxLabelLength) + '...' 
                  : step.label;
                return (
                  <option key={step.id} value={index}>
                    {prefix}{truncatedLabel}
                  </option>
                );
              })}
            </select>
            <svg
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                width: '12px',
                height: '12px',
              }}
              viewBox="0 0 12 12"
              fill="none"
            >
              <path d="M2.5 4.5L6 8L9.5 4.5" stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Mobile Content */}
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
          {/* Step Indicator */}
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#3B82F6', letterSpacing: '0.05em' }}>
              STEP {currentStepIndex + 1} OF {allSteps.length}:
            </span>
          </div>

          {/* Instruction with Formula */}
          <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <p style={{ fontSize: '14px', fontWeight: '400', margin: 0, color: isDarkMode ? '#D1D5DB' : '#374151' }}>
              {currentStep.id === 'formula' && productData?.formula 
                ? (
                  <>
                    Confirm Correct Formula: <span style={{ color: '#3B82F6', fontWeight: '600' }}>{productData.formula}</span>
                  </>
                )
                : currentStep.confirmationText
              }
            </p>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ flexShrink: 0 }}
            >
              <circle cx="8" cy="8" r="7" fill={isDarkMode ? '#6B7280' : '#9CA3AF'} />
              <path
                d="M8 4.5V8.5M8 11.5H8.01"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
              borderRadius: '2px',
              marginBottom: '24px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(currentStepIndex / allSteps.length) * 100}%`,
                height: '100%',
                backgroundColor: '#3B82F6',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {/* White Card */}
          <div
            style={{
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              borderRadius: '12px',
              border: isDarkMode ? '2px dashed #4B5563' : '2px dashed #D1D5DB',
              padding: '32px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              minHeight: '400px',
              gap: '16px',
            }}
          >
            {/* Show uploaded image preview or step icon */}
            {uploadedFile && uploadedFileUrl ? (
              <div style={{ width: '100%', maxWidth: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <img
                  src={uploadedFileUrl}
                  alt="Uploaded"
                  style={{
                    width: '100%',
                    maxHeight: '300px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    border: isDarkMode ? '1px solid #4B5563' : '1px solid #E5E7EB',
                  }}
                />
                <p style={{ fontSize: '14px', color: '#22C55E', fontWeight: '500', margin: 0 }}>
                  ✓ Image uploaded successfully
                </p>
              </div>
            ) : (
              <>
                {/* Step Icon */}
                <img
                  src={currentStep.icon}
                  alt={currentStep.label}
                  style={{
                    width: '120px',
                    height: '120px',
                    objectFit: 'contain',
                  }}
                />

                {/* Title */}
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: isDarkMode ? '#FFFFFF' : '#111827', margin: 0, textAlign: 'center' }}>
                  {currentStep.confirmationText}
                </h3>

                {/* Description */}
                <p style={{ fontSize: '14px', color: isDarkMode ? '#9CA3AF' : '#6B7280', margin: 0, textAlign: 'center', maxWidth: '280px' }}>
                  {currentStep.description}
                </p>

                {/* Take Image Button */}
                <button
                  onClick={() => document.getElementById('mobile-camera-upload').click()}
                  style={{
                    width: '100%',
                    maxWidth: '280px',
                    padding: '12px 24px',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2563EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#3B82F6';
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Take Image
                </button>

                {/* Upload from Gallery Link */}
                <button
                  onClick={() => document.getElementById('mobile-gallery-upload').click()}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#3B82F6',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  or Upload from Gallery
                </button>
              </>
            )}

            {/* Camera input - opens camera directly on mobile */}
            <input
              id="mobile-camera-upload"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* Gallery input - opens file picker/gallery */}
            <input
              id="mobile-gallery-upload"
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            {/* Use Image Button - shown after image is uploaded */}
            {uploadedFile && (
              <button
                onClick={handleContinue}
                style={{
                  width: '100%',
                  maxWidth: '280px',
                  padding: '12px 24px',
                  backgroundColor: '#22C55E',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s ease',
                  marginTop: '8px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#16A34A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#22C55E';
                }}
              >
                {isLastStep ? 'Start Production' : 'Use Image'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop Layout
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
        style={{
          borderRadius: '12px',
          width: '648px',
          height: '558px',
          backgroundColor: '#111827',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: '#111827',
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
            backgroundColor: '#374151',
          }}
        />

        {/* Content */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto', backgroundColor: '#111827' }}>
          {/* Step Header */}
          <div style={{ marginBottom: '0' }}>
            {/* Step Counter */}
            <div style={{ marginBottom: '0' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#3B82F6', letterSpacing: '0.05em' }}>
                STEP {currentStepIndex + 1} OF {allSteps.length}:
              </span>
            </div>
          </div>

          {/* Old step indicator removed - replaced with dropdown above */}
          <div style={{ display: 'none' }}>
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

          {/* Step Confirmation with Dropdown */}
          <div style={{ marginTop: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <p style={{ fontSize: '14px', fontWeight: '400', margin: 0, color: '#FFFFFF' }}>
                {currentStep.id === 'formula' && productData?.formula 
                  ? (
                    <>
                      Confirm Correct Formula: <span style={{ color: '#3B82F6', fontWeight: '600' }}>{productData.formula}</span>
                    </>
                  )
                  : currentStep.confirmationText
                }
              </p>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{ flexShrink: 0 }}
              >
                <circle cx="8" cy="8" r="7" fill="#6B7280" />
                <path
                  d="M8 4.5V8.5M8 11.5H8.01"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            
            {/* Step Dropdown */}
            <div ref={dropdownRef} style={{ position: 'relative', width: '187px' }}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  width: '187px',
                  height: '24px',
                  paddingTop: '4px',
                  paddingRight: '32px',
                  paddingBottom: '4px',
                  paddingLeft: '12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  outline: 'none',
                  boxSizing: 'border-box',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {currentStepIndex + 1}. {allSteps[currentStepIndex].label}
              </button>
              {/* Dropdown Arrow */}
              <svg
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: isDropdownOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
                  pointerEvents: 'none',
                  width: '12px',
                  height: '12px',
                  transition: 'transform 0.2s ease',
                }}
                viewBox="0 0 12 12"
                fill="none"
              >
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              
              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '28px',
                    left: 0,
                    right: 0,
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
                    zIndex: 1000,
                    overflow: 'hidden',
                  }}
                >
                  {allSteps.map((step, index) => (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        setCurrentStepIndex(index);
                        setUploadedFile(null);
                        setIsDropdownOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: index === currentStepIndex ? '#FFFFFF' : '#FFFFFF',
                        backgroundColor: index === currentStepIndex ? '#3B82F6' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (index !== currentStepIndex) {
                          e.currentTarget.style.backgroundColor = '#374151';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (index !== currentStepIndex) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {index + 1}. {step.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#374151',
              borderRadius: '2px',
              marginBottom: '6px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(currentStepIndex / allSteps.length) * 100}%`,
                height: '100%',
                backgroundColor: '#3B82F6',
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {/* Completion Indicator */}
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: '400', color: '#FFFFFF' }}>
              {currentStepIndex + 1} of {allSteps.length} completed
            </span>
          </div>

          {/* File Upload Area */}
          <div
            ref={uploadAreaRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
              position: 'relative',
              borderRadius: '12px',
              width: '100%',
              height: '240px',
              cursor: 'pointer',
              border: '2px dashed #374151',
              backgroundColor: '#1F2937',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              marginBottom: '24px',
            }}
            onMouseEnter={() => {
              if (uploadAreaRef.current) {
                uploadAreaRef.current.style.borderColor = '#4B5563';
                uploadAreaRef.current.style.backgroundColor = '#374151';
              }
            }}
            onMouseLeave={() => {
              if (uploadAreaRef.current) {
                uploadAreaRef.current.style.borderColor = '#374151';
                uploadAreaRef.current.style.backgroundColor = '#1F2937';
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
            
            {/* Camera Icon */}
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              style={{ opacity: 0.4 }}
            >
              <rect width="64" height="64" rx="8" fill="#9CA3AF" />
              <path
                d="M26 22L28 18H36L38 22H46C47.1046 22 48 22.8954 48 24V42C48 43.1046 47.1046 44 46 44H18C16.8954 44 16 43.1046 16 42V24C16 22.8954 16.8954 22 18 22H26Z"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <circle
                cx="32"
                cy="33"
                r="6"
                stroke="white"
                strokeWidth="2"
                fill="none"
              />
            </svg>

            {/* Upload Text */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '0 0 4px 0' }}>
                Drag and drop photo or{' '}
                <span style={{ color: '#3B82F6', fontWeight: '500', cursor: 'pointer' }}>
                  Click to upload
                </span>
              </p>
              <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                Max size: 3MB (JPG, PNG)
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #374151',
            backgroundColor: '#141C2D',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '6px',
              border: '1px solid #374151',
              backgroundColor: '#1F2937',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1F2937';
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
