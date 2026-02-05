import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';

const NewShipmentHeader = ({
  tableMode,
  onTableModeToggle,
  onReviewShipmentClick,
  onCompleteClick,
  shipmentData,
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
  canAccessTab,
}) => {
  // Debug logging to trace completedTabs
  useEffect(() => {
    console.log('📊 NewShipmentHeader completedTabs:', {
      completedTabs: Array.from(completedTabs),
      addProductsComplete: completedTabs.has('add-products'),
      exportComplete: completedTabs.has('export'),
      labelCheckComplete: completedTabs.has('label-check'),
      formulaCheckComplete: completedTabs.has('formula-check'),
      activeAction,
    });
  }, [completedTabs, activeAction]);
  const location = useLocation();
  // Stepper logic - determine which tabs are accessible
  // Workflow: Add Products → (Label Check & Formula Check in any order) → Book Shipment → Sort Products → Sort Formulas
  const tabOrder = ['add-products', 'label-check', 'formula-check', 'book-shipment', 'sort-products', 'sort-formulas'];
  
  const isTabAccessible = (tabName) => {
    // add-products is always accessible
    if (tabName === 'add-products') return true;
    
    // Completed tabs are always accessible (even if there are unresolved issues or missing prerequisites)
    // This allows users to go back to previously completed steps
    if (completedTabs.has(tabName)) return true;
    
    // Label Check and Formula Check can be accessed as soon as the user
    // decides to move forward. We only block if there are known
    // unexported products (to prevent mismatches with the export file).
    if (tabName === 'label-check' || tabName === 'formula-check') {
      if (productsAddedAfterExport) {
        return false;
      }
      return true;
    }
    
    // Book Shipment, Sort Products, Sort Formulas require BOTH formula-check AND label-check
    const laterSteps = ['book-shipment', 'sort-products', 'sort-formulas'];
    if (laterSteps.includes(tabName)) {
      // Must have both formula-check and label-check completed
      const bothChecksCompleted = completedTabs.has('formula-check') && completedTabs.has('label-check');
      if (!bothChecksCompleted) {
        return false;
      }
      
      // Block if there are unresolved issues (only for non-completed tabs)
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
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const typeDropdownRef = useRef(null);
  const typeButtonRef = useRef(null);
  
  // Default values if shipmentData is not provided
  const shipmentNumber = shipmentData?.shipmentName || shipmentData?.shipmentNumber || '2025.11.18';
  const shipmentType = shipmentData?.shipmentType || ''; // Only show type if it's been selected
  const marketplace = shipmentData?.marketplace || 'Amazon';
  const account = shipmentData?.account || 'TPS Nutrients';

  // Format shipment creation date as YYYY.MM.DD — use today when creating new shipment
  const createdDateRaw = shipmentData?.shipmentDate || shipmentData?.shipment_date;
  const dateToShow = createdDateRaw || new Date().toISOString().split('T')[0];
  const createdDateFormatted = (() => {
    const d = new Date(dateToShow + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}.${m}.${day}`;
  })();

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
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(event.target) &&
        typeButtonRef.current &&
        !typeButtonRef.current.contains(event.target)
      ) {
        setShowTypeDropdown(false);
      }
    };

    if (showDropdown || showTypeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown, showTypeDropdown]);

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
    setShowTypeDropdown(false);
    if (onReviewShipmentClick) {
      onReviewShipmentClick();
    }
  };

  return (
    <div style={{ 
      backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
      padding: '16px 24px 0 24px',
      borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
    }}>
      {/* Top Row - Back button and Order Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        {/* Left side - Back button and Shipment Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <button
            type="button"
            onClick={() => {
              // If coming from planning, navigate back with refresh flag
              if (location.state?.fromPlanning) {
                navigate('/dashboard/production/planning', {
                  state: {
                    activeTab: 'shipments',
                    refresh: true,
                  }
                });
              } else {
                navigate(-1);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              minWidth: '30px',
              minHeight: '30px',
              backgroundColor: isDarkMode ? '#252F42' : '#FFFFFF',
              border: isDarkMode ? '1px solid #334155' : '1px solid #E5E7EB',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              padding: '6px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#2D3A52' : '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#252F42' : '#FFFFFF';
            }}
            aria-label="Back"
          >
            <svg 
              style={{ width: '16px', height: '16px', flexShrink: 0 }} 
              className={isDarkMode ? 'text-white' : 'text-gray-900'}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          {createdDateFormatted && (
            <div style={{
              fontSize: '16px',
              fontWeight: 400,
              color: isDarkMode ? '#FFFFFF' : '#111827',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}>
              {createdDateFormatted}
            </div>
          )}
          {shipmentType && (
            <>
              <span
                style={{
                  display: 'inline-flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 8px',
                  minHeight: '23px',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  color: '#60A5FA',
                  backgroundColor: isDarkMode ? '#1E3A5F' : '#1E40AF',
                  border: '2px solid #334155',
                  borderRadius: '4px',
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  boxSizing: 'border-box',
                }}
              >
                {shipmentType}
              </span>
              <div style={{ position: 'relative' }}>
                <button
                  ref={typeButtonRef}
                  type="button"
                  onClick={() => setShowTypeDropdown((prev) => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    padding: 0,
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  }}
                  aria-label="More options"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
                {showTypeDropdown && (
                  <div
                    ref={typeDropdownRef}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '8px',
                      backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
                      border: isDarkMode ? '1px solid #334155' : '1px solid #E5E7EB',
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
                        e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#F3F4F6';
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
            </>
          )}
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
                width: '33.33px',
                height: '20px',
                borderRadius: '10px',
                backgroundColor: tableMode ? '#3B82F6' : (isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'),
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s',
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label="Toggle Table Mode"
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  position: 'absolute',
                  top: '2px',
                  left: tableMode ? '15.33px' : '2px',
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
              width: '24px',
              height: '24px',
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
              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
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
                  width: '24px',
                  height: '24px',
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
                  style={{ width: '24px', height: '24px', objectFit: 'contain' }}
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
                  width: '24px',
                  height: '24px',
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
                  style={{ width: '24px', height: '24px', objectFit: 'contain' }}
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
                  width: '24px',
                  height: '24px',
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
                  style={{ width: '24px', height: '24px', objectFit: 'contain' }}
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
                  width: '24px',
                  height: '24px',
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
                  style={{ width: '24px', height: '24px', objectFit: 'contain' }}
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
                  width: '24px',
                  height: '24px',
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
                  style={{ width: '24px', height: '24px', objectFit: 'contain' }}
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
        position: 'relative',
      }}>
        {/* Line on top of tabs - 46px wider */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '-23px',
          right: '-23px',
          height: '1px',
          backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
        }} />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const isAccessible = isTabAccessible('add-products') && (!canAccessTab || canAccessTab('add-products'));
            if (isAccessible && onActionChange && typeof onActionChange === 'function') {
              onActionChange('add-products');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeAction === 'add-products' ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
            backgroundColor: activeAction === 'add-products' ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
            border: 'none',
            borderBottom: activeAction === 'add-products' ? '2px solid #3B82F6' : '2px solid transparent',
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6">
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
          onClick={() => {
            if (isTabAccessible('label-check') && onActionChange) {
              onActionChange('label-check');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeAction === 'label-check' ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
            backgroundColor: activeAction === 'label-check' ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
            border: 'none',
            borderBottom: activeAction === 'label-check' ? '2px solid #3B82F6' : '2px solid transparent',
            cursor: isTabAccessible('label-check') ? 'pointer' : 'not-allowed',
            opacity: isTabAccessible('label-check') ? 1 : 0.5,
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {completedTabs.has('label-check') ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : activeAction === 'label-check' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : (labelCheckHasComment || labelCheckRemainingCount > 0) ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B">
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
          onClick={() => {
            if (isTabAccessible('formula-check') && onActionChange) {
              onActionChange('formula-check');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeAction === 'formula-check' ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
            backgroundColor: activeAction === 'formula-check' ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
            border: 'none',
            borderBottom: activeAction === 'formula-check' ? '2px solid #3B82F6' : '2px solid transparent',
            cursor: isTabAccessible('formula-check') ? 'pointer' : 'not-allowed',
            opacity: isTabAccessible('formula-check') ? 1 : 0.5,
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {completedTabs.has('formula-check') ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : activeAction === 'formula-check' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : (formulaCheckHasComment || formulaCheckRemainingCount > 0) ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B">
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
          onClick={() => {
            if (isTabAccessible('book-shipment') && onActionChange) {
              onActionChange('book-shipment');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeAction === 'book-shipment' ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
            backgroundColor: activeAction === 'book-shipment' ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
            border: 'none',
            borderBottom: activeAction === 'book-shipment' ? '2px solid #3B82F6' : '2px solid transparent',
            cursor: isTabAccessible('book-shipment') ? 'pointer' : 'not-allowed',
            opacity: isTabAccessible('book-shipment') ? 1 : 0.5,
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {completedTabs.has('book-shipment') ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : activeAction === 'book-shipment' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6">
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
          onClick={() => {
            if (isTabAccessible('sort-products') && onActionChange) {
              onActionChange('sort-products');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeAction === 'sort-products' ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
            backgroundColor: activeAction === 'sort-products' ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
            border: 'none',
            borderBottom: activeAction === 'sort-products' ? '2px solid #3B82F6' : '2px solid transparent',
            cursor: isTabAccessible('sort-products') ? 'pointer' : 'not-allowed',
            opacity: isTabAccessible('sort-products') ? 1 : 0.5,
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {completedTabs.has('sort-products') ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : activeAction === 'sort-products' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6">
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
          onClick={() => {
            if (isTabAccessible('sort-formulas') && onActionChange) {
              onActionChange('sort-formulas');
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 500,
            color: activeAction === 'sort-formulas' ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
            backgroundColor: activeAction === 'sort-formulas' ? (isDarkMode ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)') : 'transparent',
            border: 'none',
            borderBottom: activeAction === 'sort-formulas' ? '2px solid #3B82F6' : '2px solid transparent',
            cursor: isTabAccessible('sort-formulas') ? 'pointer' : 'not-allowed',
            opacity: isTabAccessible('sort-formulas') ? 1 : 0.5,
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {completedTabs.has('sort-formulas') ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#10B981">
              <circle cx="12" cy="12" r="6"/>
            </svg>
          ) : activeAction === 'sort-formulas' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#3B82F6">
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