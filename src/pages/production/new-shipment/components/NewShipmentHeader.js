import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';

const NewShipmentHeader = ({
  tableMode,
  onTableModeToggle,
  onReviewShipmentClick,
  onCompleteClick,
  shipmentData,
  dataAsOfDate,
  totalUnits = 0,
  totalBoxes = 0,
  activeAction = 'add-products',
  onActionChange,
  completedTabs = new Set(),
  formulaCheckHasComment = false,
  formulaCheckRemainingCount = 0,
  labelCheckHasComment = false,
  labelCheckRemainingCount = 0,
  hideActionsDropdown = false,
  hasUnresolvedCheckIssues = false,
  productsAddedAfterExport = false,
}) => {
  // Stepper logic - determine which tabs are accessible
  // Workflow: Add Products → Label Check → Formula Check → Book Shipment → Sort Products → Sort Formulas
  const tabOrder = ['add-products', 'label-check', 'formula-check', 'book-shipment', 'sort-products', 'sort-formulas'];
  
  const isTabAccessible = (tabName) => {
    // add-products is always accessible
    if (tabName === 'add-products') return true;
    
    // Completed tabs are always accessible
    if (completedTabs.has(tabName)) return true;
    
    // Label Check comes first after Add Products, then Formula Check
    if (tabName === 'label-check') {
      // Block if there are unexported products
      if (productsAddedAfterExport) {
        return false;
      }
      // Accessible once add-products is completed
      return completedTabs.has('add-products');
    }
    
    if (tabName === 'formula-check') {
      // Block if there are unexported products
      if (productsAddedAfterExport) {
        return false;
      }
      // Accessible once label-check is completed
      return completedTabs.has('label-check');
    }
    
    // Book Shipment, Sort Products, Sort Formulas require BOTH formula-check AND label-check
    const laterSteps = ['book-shipment', 'sort-products', 'sort-formulas'];
    if (laterSteps.includes(tabName)) {
      // Must have both formula-check and label-check completed
      const bothChecksCompleted = completedTabs.has('formula-check') && completedTabs.has('label-check');
      if (!bothChecksCompleted) {
        return false;
      }
      
      // Block if there are unresolved issues
      if (hasUnresolvedCheckIssues) {
        return false;
      }
      
      // For steps after book-shipment, check if previous step is completed
      if (tabName === 'sort-products') {
        return completedTabs.has('book-shipment');
      }
      if (tabName === 'sort-formulas') {
        return completedTabs.has('sort-products');
      }
      
      // book-shipment is accessible if both checks are completed
      return true;
    }
    
    return false;
  };
  
  // Check if tab is blocked due to unexported products
  const isBlockedByUnexportedProducts = (tabName) => {
    const targetIndex = tabOrder.indexOf(tabName);
    return targetIndex >= tabOrder.indexOf('label-check') && productsAddedAfterExport;
  };
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  
  // Default values if shipmentData is not provided
  const shipmentNumber = shipmentData?.shipmentName || shipmentData?.shipmentNumber || '2025.11.18';
  const shipmentType = shipmentData?.shipmentType || 'AWD';
  const marketplace = shipmentData?.marketplace || 'Amazon';
  const account = shipmentData?.account || 'TPS Nutrients';
  
  // Format data freshness
  const formatDataFreshness = () => {
    if (!dataAsOfDate) return '';
    const now = new Date();
    const diff = Math.floor((now - dataAsOfDate) / 1000); // seconds
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return dataAsOfDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  // Ensure dropdown is closed when it is hidden by parent
  useEffect(() => {
    if (hideActionsDropdown && showDropdown) {
      setShowDropdown(false);
    }
  }, [hideActionsDropdown, showDropdown]);

  const handleThreeDotsClick = () => {
    setShowDropdown(!showDropdown);
  };

  const handleShipmentDetailsClick = () => {
    setShowDropdown(false);
    if (onReviewShipmentClick) {
      onReviewShipmentClick();
    }
  };

  return (
    <div style={{ 
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      padding: '16px 24px',
      borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
    }}>
      {/* Top Row - Back button and Order Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        {/* Left side - Back button and Shipment Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
              border: isDarkMode ? '1px solid #4B5563' : '1px solid #E5E7EB',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              padding: '8px 16px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#4B5563' : '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#FFFFFF';
            }}
          >
            <svg 
              style={{ width: '16px', height: '16px' }} 
              className={isDarkMode ? 'text-white' : 'text-gray-900'}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: 400,
              color: isDarkMode ? '#FFFFFF' : '#000000',
            }}>
              Back
            </span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: 400,
                letterSpacing: '0.05em',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
              }}>
                SHIPMENT
              </div>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 400,
                color: isDarkMode ? '#FFFFFF' : '#000000',
              }}>
                {shipmentNumber} {shipmentType}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: 400,
                letterSpacing: '0.05em',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
              }}>
                MARKETPLACE
              </div>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 400,
                color: isDarkMode ? '#FFFFFF' : '#000000',
              }}>
                {marketplace}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ 
                fontSize: '10px', 
                fontWeight: 400,
                letterSpacing: '0.05em',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
              }}>
                ACCOUNT
              </div>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 400,
                color: isDarkMode ? '#FFFFFF' : '#000000',
              }}>
                {account}
                </div>
            </div>
            </div>
            {dataAsOfDate && activeAction === 'add-products' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ 
                  fontSize: '10px', 
                  fontWeight: 400,
                  letterSpacing: '0.05em',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  DATA AS OF
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 400,
                  color: isDarkMode ? '#10B981' : '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <circle cx="6" cy="6" r="6"/>
                  </svg>
                  {formatDataFreshness()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Different controls based on active tab */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {activeAction === 'add-products' ? (
            <>
          {/* Table Mode Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: 500, 
              color: isDarkMode ? '#FFFFFF' : '#000000',
            }}>
              Table Mode
            </span>
            <button
              type="button"
              onClick={onTableModeToggle}
              style={{
                width: '48px',
                height: '28px',
                borderRadius: '14px',
                backgroundColor: tableMode ? '#007AFF' : (isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'),
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s',
                padding: 0,
              }}
              aria-label="Toggle Table Mode"
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  position: 'absolute',
                  top: '2px',
                  left: tableMode ? '22px' : '2px',
                  transition: 'left 0.2s',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                }}
              />
            </button>
          </div>

          {/* Settings Button */}
          <button
            type="button"
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            aria-label="Settings"
          >
            <img
              src="/assets/Icon Button.png"
              alt="Settings"
              style={{
                width: '19.45px',
                height: '20px',
                marginTop: '2px',
                marginLeft: '2.27px',
              }}
            />
          </button>

          {/* Three Dots Menu for Add Products */}
          {!hideActionsDropdown && (
            <div style={{ position: 'relative' }}>
              <button
                ref={buttonRef}
                type="button"
                onClick={handleThreeDotsClick}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  transition: 'opacity 0.2s',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="5" r="1" fill="currentColor"/>
                  <circle cx="12" cy="12" r="1" fill="currentColor"/>
                  <circle cx="12" cy="19" r="1" fill="currentColor"/>
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                    border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    minWidth: '160px',
                    zIndex: 1000,
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleShipmentDetailsClick}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      color: isDarkMode ? '#E5E7EB' : '#374151',
                      fontSize: '14px',
                      fontWeight: 400,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Shipment Details
                  </button>
                </div>
              )}
            </div>
          )}
            </>
          ) : activeAction === 'formula-check' ? (
            <>
              {/* Settings/Gear Icon */}
              <button
                type="button"
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                aria-label="Settings"
              >
                <img
                  src="/assets/Icon Button.png"
                  alt="Settings"
                  style={{
                    width: '19.45px',
                    height: '20px',
                    marginTop: '2px',
                    marginLeft: '2.27px',
                  }}
                />
              </button>

              {/* Three Dots Menu for Formula Check */}
              {!hideActionsDropdown && (
                <div style={{ position: 'relative' }}>
                  <button
                    ref={buttonRef}
                    type="button"
                    onClick={handleThreeDotsClick}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="5" r="1" fill="currentColor"/>
                      <circle cx="12" cy="12" r="1" fill="currentColor"/>
                      <circle cx="12" cy="19" r="1" fill="currentColor"/>
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div
                      ref={dropdownRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        minWidth: '160px',
                        zIndex: 1000,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleShipmentDetailsClick}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          color: isDarkMode ? '#E5E7EB' : '#374151',
                          fontSize: '14px',
                          fontWeight: 400,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Shipment Details
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : activeAction === 'label-check' ? (
            <>
              {/* Settings/Gear Icon */}
              <button
                type="button"
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                aria-label="Settings"
              >
                <img 
                  src="/assets/Icon Button.png" 
                  alt="Settings"
                  style={{ width: '19.45px', height: '20px' }}
                />
              </button>

              {/* Three Dots Menu for Label Check */}
              {!hideActionsDropdown && (
                <div style={{ position: 'relative' }}>
                  <button
                    ref={buttonRef}
                    type="button"
                    onClick={handleThreeDotsClick}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="5" r="1" fill="currentColor"/>
                      <circle cx="12" cy="12" r="1" fill="currentColor"/>
                      <circle cx="12" cy="19" r="1" fill="currentColor"/>
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div
                      ref={dropdownRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        minWidth: '160px',
                        zIndex: 1000,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleShipmentDetailsClick}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          color: isDarkMode ? '#E5E7EB' : '#374151',
                          fontSize: '14px',
                          fontWeight: 400,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Shipment Details
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : activeAction === 'book-shipment' ? (
            <>
              {/* Settings/Gear Icon */}
              <button
                type="button"
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                aria-label="Settings"
              >
                <img 
                  src="/assets/Icon Button.png" 
                  alt="Settings"
                  style={{ width: '19.45px', height: '20px' }}
                />
              </button>

              {/* Three Dots Menu for Book Shipment */}
              {!hideActionsDropdown && (
                <div style={{ position: 'relative' }}>
                  <button
                    ref={buttonRef}
                    type="button"
                    onClick={handleThreeDotsClick}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="5" r="1" fill="currentColor"/>
                      <circle cx="12" cy="12" r="1" fill="currentColor"/>
                      <circle cx="12" cy="19" r="1" fill="currentColor"/>
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div
                      ref={dropdownRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        minWidth: '160px',
                        zIndex: 1000,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleShipmentDetailsClick}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          color: isDarkMode ? '#E5E7EB' : '#374151',
                          fontSize: '14px',
                          fontWeight: 400,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Shipment Details
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : activeAction === 'sort-products' ? (
            <>
              {/* Settings/Gear Icon */}
              <button
                type="button"
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                aria-label="Settings"
              >
                <img 
                  src="/assets/Icon Button.png" 
                  alt="Settings"
                  style={{ width: '19.45px', height: '20px', marginTop: '2px', marginLeft: '2.27px' }}
                />
              </button>

              {/* Three Dots Menu for Sort Products */}
              {!hideActionsDropdown && (
                <div style={{ position: 'relative' }}>
                  <button
                    ref={buttonRef}
                    type="button"
                    onClick={handleThreeDotsClick}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="5" r="1" fill="currentColor"/>
                      <circle cx="12" cy="12" r="1" fill="currentColor"/>
                      <circle cx="12" cy="19" r="1" fill="currentColor"/>
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div
                      ref={dropdownRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        minWidth: '160px',
                        zIndex: 1000,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleShipmentDetailsClick}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          color: isDarkMode ? '#E5E7EB' : '#374151',
                          fontSize: '14px',
                          fontWeight: 400,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Shipment Details
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : activeAction === 'sort-formulas' ? (
            <>
              {/* Settings/Gear Icon */}
              <button
                type="button"
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                aria-label="Settings"
              >
                <img 
                  src="/assets/Icon Button.png" 
                  alt="Settings"
                  style={{ width: '19.45px', height: '20px', marginTop: '2px', marginLeft: '2.27px' }}
                />
              </button>

              {/* Three Dots Menu for Sort Formulas */}
              {!hideActionsDropdown && (
                <div style={{ position: 'relative' }}>
                  <button
                    ref={buttonRef}
                    type="button"
                    onClick={handleThreeDotsClick}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="5" r="1" fill="currentColor"/>
                      <circle cx="12" cy="12" r="1" fill="currentColor"/>
                      <circle cx="12" cy="19" r="1" fill="currentColor"/>
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showDropdown && (
                    <div
                      ref={dropdownRef}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        minWidth: '160px',
                        zIndex: 1000,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleShipmentDetailsClick}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          color: isDarkMode ? '#E5E7EB' : '#374151',
                          fontSize: '14px',
                          fontWeight: 400,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        Shipment Details
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '0px',
        marginTop: '16px',
        borderTop: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
        borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
      }}>
        <button
          type="button"
          onClick={() => onActionChange && onActionChange('add-products')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeAction === 'add-products' ? '#007AFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
            backgroundColor: activeAction === 'add-products' ? (isDarkMode ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)') : 'transparent',
            border: 'none',
            borderBottom: activeAction === 'add-products' ? '2px solid #007AFF' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {completedTabs.has('add-products') ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : activeAction === 'add-products' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#007AFF">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} strokeWidth="2">
              <circle cx="12" cy="12" r="6"/>
          </svg>
          )}
          <span>Add Products</span>
        </button>
        <button
          type="button"
          onClick={() => onActionChange && onActionChange('label-check')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeAction === 'label-check' ? '#007AFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
            backgroundColor: activeAction === 'label-check' ? (isDarkMode ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)') : 'transparent',
            border: 'none',
            borderBottom: activeAction === 'label-check' ? '2px solid #007AFF' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {completedTabs.has('label-check') ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : (labelCheckHasComment || labelCheckRemainingCount > 0) ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : activeAction === 'label-check' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#007AFF">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} strokeWidth="2">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          )}
          <span>Label Check</span>
        </button>
        <button
          type="button"
          onClick={() => onActionChange && onActionChange('formula-check')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeAction === 'formula-check' ? '#007AFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
            backgroundColor: activeAction === 'formula-check' ? (isDarkMode ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)') : 'transparent',
            border: 'none',
            borderBottom: activeAction === 'formula-check' ? '2px solid #007AFF' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {completedTabs.has('formula-check') ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : (formulaCheckHasComment || formulaCheckRemainingCount > 0) ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : activeAction === 'formula-check' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#007AFF">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} strokeWidth="2">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          )}
          <span>Formula Check</span>
        </button>
        <button
          type="button"
          onClick={() => onActionChange && onActionChange('book-shipment')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeAction === 'book-shipment' ? '#007AFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
            backgroundColor: activeAction === 'book-shipment' ? (isDarkMode ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)') : 'transparent',
            border: 'none',
            borderBottom: activeAction === 'book-shipment' ? '2px solid #007AFF' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {completedTabs.has('book-shipment') ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : activeAction === 'book-shipment' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#007AFF">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} strokeWidth="2">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          )}
          <span>Book Shipment</span>
        </button>
        <button
          type="button"
          onClick={() => onActionChange && onActionChange('sort-products')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeAction === 'sort-products' ? '#007AFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
            backgroundColor: activeAction === 'sort-products' ? (isDarkMode ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)') : 'transparent',
            border: 'none',
            borderBottom: activeAction === 'sort-products' ? '2px solid #007AFF' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {completedTabs.has('sort-products') ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : activeAction === 'sort-products' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#007AFF">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} strokeWidth="2">
              <circle cx="12" cy="12" r="6"/>
          </svg>
          )}
          <span>Sort Products</span>
        </button>
        <button
          type="button"
          onClick={() => onActionChange && onActionChange('sort-formulas')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeAction === 'sort-formulas' ? '#007AFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
            backgroundColor: activeAction === 'sort-formulas' ? (isDarkMode ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)') : 'transparent',
            border: 'none',
            borderBottom: activeAction === 'sort-formulas' ? '2px solid #007AFF' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {activeAction === 'sort-formulas' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#007AFF">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} strokeWidth="2">
              <circle cx="12" cy="12" r="6"/>
          </svg>
          )}
          <span>Sort Formulas</span>
        </button>
      </div>
    </div>
  );
};

export default NewShipmentHeader;