import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const ProductionStartedModal = ({ isOpen, onClose, productData, onPause, onMarkDone, onImageClick, onLogUnitsClick, qualityCheckImages }) => {
  const { isDarkMode } = useTheme();
  const [isQualityChecksExpanded, setIsQualityChecksExpanded] = useState(false);
  const [selectedTab, setSelectedTab] = useState('fillLevel');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProductionNotesExpanded, setIsProductionNotesExpanded] = useState(false);
  const [isProductionPaused, setIsProductionPaused] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [notes, setNotes] = useState([
    {
      id: 1,
      author: 'Christian R.',
      initials: 'CR',
      date: 'Aug 20, 2025',
      text: "F.Succulent isn't ready to be made. It'll take to a couple days for the remaining raw materials to arrive.",
      color: '#F59E0B'
    }
  ]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [isMobile, setIsMobile] = useState(() => {
    // Initialize immediately to prevent flickering
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 640;
    }
    return false;
  });
  const uploadAreaRef = useRef(null);
  const textareaRef = useRef(null);
  const productionNotesContentRef = useRef(null);

  const qualityCheckTabs = [
    { id: 'formula', label: 'Formula' },
    { id: 'fillLevel', label: 'Fill Level' },
    { id: 'seal', label: 'Seal' },
    { id: 'product', label: 'Product' },
    { id: 'upcScan', label: 'UPC Scan' },
    { id: 'boxSticker', label: 'Box Sticker' },
  ];

  useEffect(() => {
    if (isProductionNotesExpanded && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isProductionNotesExpanded]);

  // Detect mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync isProductionPaused with productData status
  useEffect(() => {
    if (productData?.status === 'paused') {
      setIsProductionPaused(true);
    } else if (productData?.status === 'in_progress') {
      setIsProductionPaused(false);
    }
  }, [productData?.status]);

  // Reset image index and selected tab when quality check images change
  useEffect(() => {
    if (qualityCheckImages && qualityCheckImages.length > 0) {
      setCurrentImageIndex(0);
      // Set selected tab to first tab with an image
      const firstTabWithImage = qualityCheckTabs.findIndex((tab, idx) => qualityCheckImages[idx]);
      if (firstTabWithImage !== -1) {
        setSelectedTab(qualityCheckTabs[firstTabWithImage].id);
      }
    }
  }, [qualityCheckImages]);

  if (!isOpen) {
    console.log('ProductionStartedModal: isOpen is false, returning null');
    return null;
  }
  
  console.log('ProductionStartedModal: Rendering modal', { isOpen, hasOnClose: !!onClose, productData });

  const themeClasses = {
    modalBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
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
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      setUploadedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Get user info from localStorage
  const getUserInfo = () => {
    const userName = localStorage.getItem('userName') || 'User';
    const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return { userName, userInitials };
  };

  const handleAddNote = () => {
    setIsAddingNote(true);
    setNewNoteText('');
  };

  const handleSaveNote = () => {
    if (newNoteText.trim()) {
      const { userName, userInitials } = getUserInfo();
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      
      const newNote = {
        id: notes.length + 1,
        author: userName,
        initials: userInitials,
        date: dateStr,
        text: newNoteText.trim(),
        color: '#F59E0B'
      };
      
      setNotes([...notes, newNote]);
      setNewNoteText('');
      // Keep input visible - don't set isAddingNote to false
    }
  };

  const handleCancelNote = () => {
    setNewNoteText('');
    setIsAddingNote(false);
  };

  return createPortal(
    <div>
      {/* Dark Mode Scrollbar Styles */}
      <style>{`
        .production-modal-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .production-modal-scrollbar::-webkit-scrollbar-track {
          background: ${isDarkMode ? '#1F2937' : '#F3F4F6'};
          border-radius: 4px;
        }
        .production-modal-scrollbar::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#4B5563' : '#9CA3AF'};
          border-radius: 4px;
        }
        .production-modal-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#6B7280' : '#6B7280'};
        }
        .production-modal-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${isDarkMode ? '#4B5563 #1F2937' : '#9CA3AF #F3F4F6'};
        }
      `}</style>
      {/* Mobile Layout - Modal Overlay */}
      {isMobile && (
      <div
        className="md:hidden"
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
          zIndex: 10001,
          padding: '12px',
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Production Started Header */}
          <div
            style={{
              backgroundColor: '#2C3544',
              padding: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <h2 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '600', margin: 0 }}>Production Started</h2>
            <button
              onClick={onClose}
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="production-modal-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Production Status Section - Show when paused (Mobile) */}
          {isProductionPaused && (
            <div
              style={{
                backgroundColor: '#EFF6FF',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid #BFDBFE',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2563EB"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '14px', color: '#1E40AF', fontWeight: '500' }}>
                  Production is paused.
                </span>
                {' '}
                <button
                  onClick={() => {
                    if (onLogUnitsClick) {
                      onLogUnitsClick();
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Log units produced?
                </button>
              </div>
            </div>
          )}

          {/* Product Information Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              padding: '1rem',
            }}
          >
            {/* Product Details Grid */}
            <div
              style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem 1rem',
              }}
            >
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '0.25rem' }}>Brand:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                    {productData?.brand || 'TPS Plant Foods'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '0.25rem' }}>Product Name:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                    {productData?.product || 'Cherry Tree Fertilizer'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '0.25rem' }}>Size:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                    {productData?.size || '8oz'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '0.25rem' }}>Label Location:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                    {productData?.labelLocation || 'LBL-PLANT-218'}
                  </span>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '0.25rem' }}>Formula:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                    {productData?.formula || 'F.Ultra Grow'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '0.25rem' }}>QTY:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                    {productData?.qty?.toLocaleString() || '72,000'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '0.25rem' }}>Case #:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                    {productData?.caseNumber || '488'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '0.25rem' }}>TPS Ship #:</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                    {productData?.tpsShipNumber || '10-01-2025'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quality Checks Section */}
          <div style={{ flexShrink: 0 }}>
            {/* Quality Checks Container */}
            <div 
              style={{ 
                width: '100%',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                display: 'flex',
                alignItems: 'center',
                padding: '10px 14px',
              }}
            >
              {/* Quality Checks Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Quality Checks</h3>
                <span style={{ color: '#10B981', fontSize: '14px', fontWeight: '500' }}>Complete (6/6)</span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6B7280"
                strokeWidth={2}
                style={{
                  transform: isQualityChecksExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer',
                }}
                onClick={() => setIsQualityChecksExpanded(!isQualityChecksExpanded)}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            </div>

            {/* Quality Check Items */}
            <div
              style={{
                display: 'grid',
                gridTemplateRows: isQualityChecksExpanded ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.3s ease',
                overflow: 'hidden',
              }}
            >
              <div style={{ minHeight: 0, overflow: 'hidden' }}>
                {/* Quality Check Tabs - Horizontal Scrollable */}
                <div
                  className="production-modal-scrollbar"
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    marginTop: '0.75rem',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'thin',
                    scrollbarColor: isDarkMode ? '#4B5563 #1F2937' : '#9CA3AF #F3F4F6',
                    paddingBottom: '8px',
                    whiteSpace: 'nowrap',
                    flexWrap: 'nowrap',
                  }}
                >
                  {qualityCheckTabs.map((tab, index) => {
                    const isCompleted = qualityCheckImages && qualityCheckImages[index] !== null;
                    const hasImage = qualityCheckImages && qualityCheckImages[index];
                    const isSelected = selectedTab === tab.id;
                    return (
                      <div
                        key={tab.id}
                        onClick={() => {
                          if (hasImage) {
                            setSelectedTab(tab.id);
                            setCurrentImageIndex(index);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? '#EBF5FF' : 'transparent',
                          border: isSelected ? '1px solid #3B82F6' : '1px solid transparent',
                          cursor: hasImage ? 'pointer' : 'default',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: isCompleted ? '#10B981' : '#D1D5DB',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ 
                          fontSize: '14px', 
                          color: isSelected ? '#3B82F6' : '#111827', 
                          fontWeight: isSelected ? '600' : '400' 
                        }}>
                          {tab.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Image Carousel - Mobile View */}
                {(() => {
                  const selectedTabIndex = qualityCheckTabs.findIndex(tab => tab.id === selectedTab);
                  const displayImage = qualityCheckImages && qualityCheckImages[selectedTabIndex];
                  const hasImages = qualityCheckImages && qualityCheckImages.some(img => img !== null);
                  
                  if (displayImage) {
                    // Find all images with their indices
                    const imagesWithIndices = qualityCheckImages
                      .map((img, idx) => ({ img, idx }))
                      .filter(({ img }) => img !== null);
                    
                    const currentImageIdx = imagesWithIndices.findIndex(({ idx }) => idx === currentImageIndex);
                    const currentImage = imagesWithIndices[currentImageIdx] || imagesWithIndices[0];
                    const hasPrev = currentImageIdx > 0;
                    const hasNext = currentImageIdx < imagesWithIndices.length - 1;
                    
                    return (
                      <div style={{ position: 'relative', width: '100%', marginTop: '0.75rem', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#F9FAFB' }}>
                        {/* Left Arrow */}
                        {hasPrev && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const prevIdx = imagesWithIndices[currentImageIdx - 1].idx;
                              setCurrentImageIndex(prevIdx);
                              const prevTab = qualityCheckTabs[prevIdx];
                              if (prevTab) setSelectedTab(prevTab.id);
                            }}
                            style={{
                              position: 'absolute',
                              left: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              border: '1px solid #E5E7EB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              zIndex: 10,
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M15 18l-6-6 6-6" />
                            </svg>
                          </button>
                        )}
                        
                        {/* Image */}
                        <img
                          src={currentImage?.img || displayImage}
                          alt={`Quality check ${selectedTab}`}
                          style={{
                            width: '100%',
                            height: 'auto',
                            maxHeight: '400px',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                          onError={(e) => {
                            console.error('Failed to load quality check image:', e.target.src);
                          }}
                        />
                        
                        {/* Right Arrow */}
                        {hasNext && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextIdx = imagesWithIndices[currentImageIdx + 1].idx;
                              setCurrentImageIndex(nextIdx);
                              const nextTab = qualityCheckTabs[nextIdx];
                              if (nextTab) setSelectedTab(nextTab.id);
                            }}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              border: '1px solid #E5E7EB',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              zIndex: 10,
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  } else {
                    // Upload Area - Only show when no images
                    return (
                      <div
                        ref={uploadAreaRef}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        style={{
                          border: '2px dashed #D1D5DB',
                          borderRadius: '8px',
                          padding: '2rem',
                          textAlign: 'center',
                          backgroundColor: '#F9FAFB',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          marginTop: '0.75rem',
                        }}
                        onClick={() => document.getElementById('file-upload-mobile').click()}
                      >
                        <input
                          id="file-upload-mobile"
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                        {!uploadedFile ? (
                          <>
                            <div style={{ marginBottom: '0.75rem' }}>
                              <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#9CA3AF"
                                strokeWidth={1.5}
                                style={{ margin: '0 auto' }}
                              >
                                <circle cx="12" cy="12" r="10" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </div>
                            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '0.25rem' }}>
                              Drag and drop photo or{' '}
                              <span style={{ color: '#2563EB', fontWeight: '500' }}>Click to upload</span>
                            </p>
                            <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
                              Max size: 3MB (JPG, PNG)
                            </p>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <span style={{ fontSize: '14px', color: '#10B981', fontWeight: '500' }}>
                              {uploadedFile.name}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                })()}
              </div>
            </div>

            {/* Show image when collapsed and a step is selected */}
            <div 
              style={{ 
                position: 'relative', 
                width: '100%', 
                borderRadius: '8px', 
                overflow: 'hidden',
                maxHeight: !isQualityChecksExpanded ? '300px' : '0',
                opacity: !isQualityChecksExpanded ? 1 : 0,
                transition: 'max-height 0.3s ease-out, opacity 0.2s ease-out',
                pointerEvents: !isQualityChecksExpanded ? 'auto' : 'none',
              }}
            >
              <img
                src={productData?.stepImages?.[selectedTab] || "/assets/TPS_Cherry Tree_8oz_Wrap.png"}
                alt="Product"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '300px',
                  objectFit: 'contain',
                  backgroundColor: '#F9FAFB',
                }}
                onError={(e) => {
                  if (e.target.src !== "/assets/TPS_Cherry Tree_8oz_Wrap.png") {
                    e.target.src = "/assets/TPS_Cherry Tree_8oz_Wrap.png";
                  } else {
                    e.target.style.display = 'none';
                  }
                }}
              />
            </div>
          </div>

          {/* Production Notes Section */}
          <div style={{ flexShrink: 0 }}>
            {/* Production Notes Container */}
            <div 
              style={{ 
                width: '100%',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#F9FAFB',
                display: 'flex',
                alignItems: 'center',
                padding: '10px 14px',
              }}
            >
              {/* Production Notes Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Production Notes</h3>
                <span style={{ color: '#10B981', fontSize: '14px', fontWeight: '500' }}>Complete (1/1)</span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6B7280"
                strokeWidth={2}
                style={{
                  transform: isProductionNotesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProductionNotesExpanded(prev => !prev);
                }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
            </div>

            {/* Production Notes Content */}
            <div 
              ref={productionNotesContentRef}
              style={{ 
                display: 'grid',
                gridTemplateRows: isProductionNotesExpanded ? '1fr' : '0fr',
                transition: 'grid-template-rows 0.3s ease',
                marginTop: '1rem',
                overflow: 'hidden',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 0 }}>
                {/* Note 1 */}
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#F59E0B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: '600',
                      flexShrink: 0,
                    }}
                  >
                    CR
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>Christian R.</span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>Aug 20, 2025</span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#374151', margin: 0, lineHeight: '1.5' }}>
                      F.Succulent isn't ready to be made. It'll take a couple days for the remaining raw materials to arrive.
                    </p>
                  </div>
                </div>

                {/* Note 2 */}
                <div
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#3B82F6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: '600',
                      flexShrink: 0,
                    }}
                  >
                    JD
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>John Doe</span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>Aug 21, 2025</span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#374151', margin: 0, lineHeight: '1.5' }}>
                      Production is on track. All materials have been received.
                    </p>
                  </div>
                </div>

                {/* Units Produced Info - Mobile */}
                {productData?.unitsProduced && (
                  <div
                    style={{
                      padding: '0.75rem',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#1F2937',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', color: '#374151', margin: 0, lineHeight: '1.5' }}>
                        {productData.unitsProduced.toLocaleString()} Units marked as produced. {productData.remainingQty?.toLocaleString() || 0} units remain for production.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          </div>

        {/* Footer Buttons */}
        <div
          style={{
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => {
              if (isProductionPaused) {
                setIsProductionPaused(false);
                if (onPause) {
                  onPause(false); // Resume
                }
              } else {
                setIsProductionPaused(true);
                if (onPause) {
                  onPause(true); // Pause
                }
              }
            }}
            style={{
              width: '84px',
              height: '24px',
              paddingTop: '4px',
              paddingRight: '12px',
              paddingBottom: '4px',
              paddingLeft: '12px',
              borderRadius: '4px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              color: '#374151',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: 1,
            }}
          >
            {isProductionPaused ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Resume
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="8" y1="6" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="18" />
                </svg>
                Pause
              </>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Mark Done clicked (mobile)');
              if (onMarkDone) {
                onMarkDone();
              }
            }}
            style={{
              width: '111px',
              height: '24px',
              borderRadius: '4px',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: 0,
              opacity: 1,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Mark Done
          </button>
        </div>
        </div>
      </div>
      )}

      {/* Desktop Layout - Centered Modal */}
      {!isMobile && (
      <div
        className="hidden md:flex"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
        }}
        onClick={onClose}
      >
        <div
          style={{
            borderRadius: '12px',
            width: '648px',
            backgroundColor: '#111827',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
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
          <h2 className="text-white text-lg font-semibold">Production Summary</h2>
          <button
            onClick={(e) => {
              console.log('X button clicked in ProductionStartedModal');
              e.stopPropagation();
              e.preventDefault();
              if (onClose) {
                console.log('Calling onClose handler');
                onClose();
              } else {
                console.error('onClose is not defined!');
              }
            }}
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
        <div className="production-modal-scrollbar" style={{ padding: '1rem 1.5rem', overflowY: 'auto', overflowX: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: '#111827' }}>
          {/* Product Information Section */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexShrink: 0 }}>
            {/* Product Image */}
            <div
              style={{
                width: '160px',
                height: '212px',
                flexShrink: 0,
                backgroundColor: '#1F2937',
                borderRadius: '12px',
                border: '1px solid #374151',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                boxSizing: 'border-box',
                overflow: 'hidden',
                position: 'relative',
                cursor: productData?.status === 'in_progress' ? 'pointer' : 'default',
              }}
              onClick={() => {
                if (productData?.status === 'in_progress' && onImageClick) {
                  onImageClick();
                }
              }}
            >
              <img
                src={productData?.productImage || '/assets/TPS_Cherry Tree_8oz_Wrap (1).png'}
                alt={productData?.product || 'Cherry Tree Fertilizer'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
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
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #E5E7EB',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (productData?.productImage) {
                    window.open(productData.productImage, '_blank');
                  }
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              </button>
            </div>

            {/* Product Details - Two Columns */}
            <div 
              style={{ 
                width: '424px',
                height: '212px',
                backgroundColor: '#1F2937',
                borderRadius: '12px',
                border: '1px solid #374151',
                paddingTop: '12px',
                paddingRight: '16px',
                paddingBottom: '12px',
                paddingLeft: '16px',
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '24px',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ height: '35px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem', color: '#9CA3AF' }}>
                    Brand:
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                    {productData?.brand || 'TPS Plant Foods'}
                  </span>
                </div>
                <div style={{ height: '35px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem', color: '#9CA3AF' }}>
                    Product Name:
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                    {productData?.product || 'Cherry Tree Fertilizer'}
                  </span>
                </div>
                <div style={{ height: '35px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem', color: '#9CA3AF' }}>
                    Size:
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                    {productData?.size || '8oz'}
                  </span>
                </div>
                <div style={{ height: '35px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem', color: '#9CA3AF' }}>
                    Label Location:
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                    {productData?.labelLocation || 'LBL-PLANT-218'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ height: '35px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem', color: '#9CA3AF' }}>
                    Formula:
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                    {productData?.formula || 'F.Ultra Grow'}
                  </span>
                </div>
                <div style={{ height: '35px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem', color: '#9CA3AF' }}>
                    QTY:
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                    {productData?.qty?.toLocaleString() || '72,000'}
                  </span>
                </div>
                <div style={{ height: '35px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem', color: '#9CA3AF' }}>
                    Case #:
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                    {productData?.caseNumber || '488'}
                  </span>
                </div>
                <div style={{ height: '35px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', display: 'block', marginBottom: '0.25rem', color: '#9CA3AF' }}>
                    TPS Ship #:
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#FFFFFF' }}>
                    {productData?.tpsShipNumber || '10-01-2025'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quality Checks Section */}
          <div style={{ flexShrink: 0 }}>
            {/* Quality Checks Container */}
            <div 
              style={{ 
                borderRadius: '12px',
                border: '1px solid #374151',
                backgroundColor: '#1F2937',
                width: '600px',
                height: isQualityChecksExpanded ? 'auto' : '43px',
                paddingTop: '12px',
                paddingRight: '16px',
                paddingBottom: '12px',
                paddingLeft: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                overflow: 'hidden',
                transition: 'height 0.3s ease',
              }}
            >
              {/* Quality Checks Title with Status */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#FFFFFF' }}>
                    Quality Checks
                  </h3>
                  <span style={{ color: '#10B981', fontSize: '14px', fontWeight: '500' }}>
                    Complete (6/6)
                  </span>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: isQualityChecksExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  onClick={() => {
                    setIsQualityChecksExpanded(!isQualityChecksExpanded);
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {/* Collapsible Content - Steps Row and Drag and Drop Area */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: isQualityChecksExpanded ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.3s ease',
                  overflow: 'hidden',
                }}
              >
                <div style={{ minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {/* Quality Check Steps Table Row */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '0',
                      width: '100%',
                      borderTop: '1px solid #374151',
                      borderBottom: '1px solid #374151',
                      paddingTop: '8px',
                      paddingBottom: '8px',
                    }}
                  >
                    {qualityCheckTabs.map((tab, index) => {
                      const isCompleted = qualityCheckImages && qualityCheckImages[index] !== null;
                      const hasImage = qualityCheckImages && qualityCheckImages[index];
                      const isSelected = selectedTab === tab.id;
                      return (
                        <div
                          key={tab.id}
                          onClick={() => {
                            setSelectedTab(tab.id);
                            setCurrentImageIndex(index);
                          }}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem',
                            padding: '0.25rem 0.125rem',
                            cursor: 'pointer',
                            position: 'relative',
                            backgroundColor: isSelected ? '#374151' : 'transparent',
                            borderBottom: isSelected ? '2px solid #3B82F6' : '2px solid transparent',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = '#2A3441';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <div
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: isCompleted ? '#10B981' : '#4B5563',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ 
                            fontSize: '12px', 
                            color: isSelected ? '#3B82F6' : '#FFFFFF', 
                            fontWeight: isSelected ? '600' : '400',
                            whiteSpace: 'nowrap',
                          }}>
                            {tab.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Drag and Drop Area */}
                  <div style={{ marginTop: '12px' }}>
                  {(() => {
                    const selectedTabIndex = qualityCheckTabs.findIndex(tab => tab.id === selectedTab);
                    const displayImage = qualityCheckImages && qualityCheckImages[selectedTabIndex];
                    
                    return displayImage ? (
                      <div style={{ position: 'relative', width: '100%' }}>
                        <div style={{ position: 'relative', width: '100%', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#1F2937' }}>
                          <img
                            src={displayImage}
                            alt={`Quality check ${selectedTab}`}
                            style={{
                              width: '100%',
                              height: 'auto',
                              maxHeight: '400px',
                              objectFit: 'contain',
                              display: 'block',
                            }}
                            onError={(e) => {
                              console.error('Failed to load quality check image:', e.target.src);
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      /* Upload Area - Only show when no images */
                      <div
                        ref={uploadAreaRef}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onClick={() => document.getElementById('file-upload-production').click()}
                        style={{
                          border: `2px dashed #374151`,
                          borderRadius: '8px',
                          padding: '2rem 1.5rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          backgroundColor: '#1F2937',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#374151';
                          e.currentTarget.style.borderColor = '#4B5563';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#1F2937';
                          e.currentTarget.style.borderColor = '#374151';
                        }}
                      >
                        <input
                          id="file-upload-production"
                          type="file"
                          accept="image/jpeg,image/png"
                          onChange={handleFileChange}
                          style={{ display: 'none' }}
                        />
                        {uploadedFile ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={2}>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <span style={{ fontSize: '14px', color: '#10B981', fontWeight: '500' }}>
                              {uploadedFile.name}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div style={{ marginBottom: '0.75rem' }}>
                              <svg
                                width="64"
                                height="64"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#9CA3AF"
                                strokeWidth={1.5}
                                style={{ margin: '0 auto', opacity: 0.5 }}
                              >
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                              </svg>
                            </div>
                            <p style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                              Drag and drop photo or{' '}
                              <span style={{ color: '#3B82F6', fontWeight: '500' }}>Click to upload</span>
                            </p>
                            <p style={{ fontSize: '12px', color: '#6B7280' }}>
                              Max size: 5MB (JPG, PNG)
                            </p>
                      </>
                    )}
                  </div>
                    );
                  })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Production Status Section - Show when paused */}
          {isProductionPaused && (
            <div
              style={{
                backgroundColor: '#F9F9F9',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '0.75rem',
                border: '1px solid #EAEAEA',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2563EB"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '14px', color: '#1F2937', fontWeight: '500' }}>
                  Production is paused. 
                  <span style={{ fontSize: '14px', color: '#1C2634', fontWeight: '500', padding: '3px' }}>
                     Log units Produced?
                  </span>
                </span>
                {' '}
                <button
                  onClick={() => {
                    if (onLogUnitsClick) {
                      onLogUnitsClick();
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Log units produced
                </button>
              </div>
            </div>
          )}

          {/* Separator Line */}
          <div
            style={{
              width: '100%',
              height: '1px',
              backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
              marginTop: '0.5rem',
              marginBottom: '0.75rem',
            }}
          />

          {/* Production Notes Section */}
          <div style={{ flexShrink: 0 }}>
            {/* Production Notes Container */}
            <div 
              style={{ 
                borderRadius: '12px',
                border: '1px solid #374151',
                backgroundColor: '#1F2937',
                width: '600px',
                height: isProductionNotesExpanded ? 'auto' : '43px',
                paddingTop: '12px',
                paddingRight: '16px',
                paddingBottom: '12px',
                paddingLeft: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                overflow: 'hidden',
                transition: 'height 0.3s ease',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#FFFFFF' }}>
                    Production Notes
                  </h3>
                  <span style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: '400' }}>
                    {notes.length} Notes
                  </span>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: isProductionNotesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  onClick={() => {
                    setIsProductionNotesExpanded(!isProductionNotesExpanded);
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>

              {/* Collapsible Content - Notes and Comment Input */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: isProductionNotesExpanded ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.3s ease',
                  overflow: 'hidden',
                }}
              >
                <div style={{ minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Separator Line Below Header */}
                  <div
                    style={{
                      width: '100%',
                      height: '1px',
                      backgroundColor: '#374151',
                      marginBottom: '0.75rem',
                    }}
                  />

                  {/* Notes List */}
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#1F2937',
                        borderRadius: '8px',
                        border: '1px solid #374151',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: note.color || '#F59E0B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: '600',
                          flexShrink: 0,
                        }}
                      >
                        {note.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '14px', fontWeight: '500', color: '#FFFFFF' }}>
                            {note.author}
                          </span>
                          <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                            {note.date}
                          </span>
                        </div>
                        <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.5', color: '#FFFFFF' }}>
                          {note.text}
                        </p>
                      </div>
                    </div>
                  ))}
              
                  {/* Units Produced Info */}
                  {productData?.unitsProduced && (
                    <div
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#374151',
                        borderRadius: '8px',
                        border: '1px solid #4B5563',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: '#1F2937',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4M12 8h.01" />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', margin: 0, lineHeight: '1.5', color: '#9CA3AF' }}>
                          {productData.unitsProduced.toLocaleString()} Units marked as produced. {productData.remainingQty?.toLocaleString() || 0} units remain for production.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Separator Line Above Comment Input */}
                  <div
                    style={{
                      width: '100%',
                      height: '1px',
                      backgroundColor: '#374151',
                      marginTop: '0.5rem',
                    }}
                  />

                  {/* Add Comment Input - Always visible when expanded */}
                  <div
                    style={{
                      marginTop: '0.75rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                    }}
                  >
                    {/* User Avatar */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: '#F59E0B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: '600',
                        flexShrink: 0,
                      }}
                    >
                      {getUserInfo().userInitials}
                    </div>
                    
                    {/* Input Container */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        ref={textareaRef}
                        type="text"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newNoteText.trim()) {
                            handleSaveNote();
                          }
                        }}
                        placeholder="Add a comment here..."
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #374151',
                          backgroundColor: '#1F2937',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      
                      {/* Send Button */}
                      <button
                        onClick={handleSaveNote}
                        disabled={!newNoteText.trim()}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: newNoteText.trim() ? '#3B82F6' : '#374151',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: newNoteText.trim() ? 'pointer' : 'not-allowed',
                          flexShrink: 0,
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (newNoteText.trim()) {
                            e.currentTarget.style.backgroundColor = '#2563EB';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (newNoteText.trim()) {
                            e.currentTarget.style.backgroundColor = '#3B82F6';
                          }
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #374151',
            backgroundColor: '#111827',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <button
            onClick={() => {
              if (isProductionPaused) {
                setIsProductionPaused(false);
                if (onPause) {
                  onPause(false); // Resume
                }
              } else {
                setIsProductionPaused(true);
                if (onPause) {
                  onPause(true); // Pause
                }
              }
            }}
            style={{
              width: '92px',
              height: '32px',
              borderRadius: '4px',
              border: '1px solid #374151',
              backgroundColor: '#1F2937',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1F2937';
            }}
          >
            {isProductionPaused ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Resume
              </>
            ) : (
              <>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#000000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round">
                    <line x1="8" y1="6" x2="8" y2="18" />
                    <line x1="16" y1="6" x2="16" y2="18" />
                  </svg>
                </div>
                Pause
              </>
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Mark Done clicked (desktop)');
              if (onMarkDone) {
                onMarkDone();
              }
            }}
            style={{
              width: '119px',
              height: '32px',
              borderRadius: '4px',
              backgroundColor: '#10B981',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#10B981';
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            Mark Done
          </button>
        </div>
        </div>
      </div>
      )}
    </div>,
    document.body
  );
};

export default ProductionStartedModal;
