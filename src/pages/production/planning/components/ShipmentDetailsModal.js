import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

// Account to Brand mapping based on Amazon Seller Account Structure
const ACCOUNT_OPTIONS = [
  {
    name: 'The Plant Shoppe, LLC',
    brands: ['TPS Nutrients', 'TPS Plant Foods', 'Bloom City'],
    description: 'Plant nutrients and fertilizers',
  },
  {
    name: 'Total Pest Supply',
    brands: ['NatureStop', "Ms. Pixie's", "Burke's", 'Mint+'],
    description: 'Pest control products',
  },
];

const ShipmentDetailsModal = ({ isOpen, onClose, row, onUpdate }) => {
  const { isDarkMode } = useTheme();
  
  // Edit mode state - fields are read-only until user clicks "Edit Info"
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Initialize form state from row data
  const [shipmentName, setShipmentName] = useState(row?.shipment || '');
  const [marketplace, setMarketplace] = useState(row?.marketplace || 'Amazon');
  const [account, setAccount] = useState(row?.account || '');
  
  // Dropdown states
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const marketplaceRef = useRef(null);
  const accountRef = useRef(null);
  
  // Focus states for blue border on focus
  const [focusedField, setFocusedField] = useState(null);
  
  // Update form state when row changes and reset edit mode
  useEffect(() => {
    if (row) {
      setShipmentName(row.shipment || '');
      setMarketplace(row.marketplace || 'Amazon');
      setAccount(row.account || '');
      setIsEditMode(false); // Reset edit mode when row changes
    }
  }, [row]);
  
  // Reset edit mode when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditMode(false);
      setFocusedField(null);
    }
  }, [isOpen]);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (marketplaceRef.current && !marketplaceRef.current.contains(event.target)) {
        setMarketplaceOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };

    if (marketplaceOpen || accountOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [marketplaceOpen, accountOpen]);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  const handleEditInfo = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isEditMode) {
      // Enter edit mode
      setIsEditMode(true);
    } else {
      // Save changes and exit edit mode
      if (onUpdate && row) {
      const updates = {
        shipment_number: shipmentName,
        // Marketplace and account are not editable for existing shipments
      };
        onUpdate(row.id, updates);
      }
      setIsEditMode(false);
      onClose();
    }
  };
  
  const handleCancel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isEditMode) {
      // Reset to original values and exit edit mode
      if (row) {
        setShipmentName(row.shipment || '');
        setMarketplace(row.marketplace || 'Amazon');
        setAccount(row.account || '');
      }
      setIsEditMode(false);
    } else {
      // Just close the modal
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10005,
      }}
      onClick={(e) => {
        // Only close if clicking the backdrop itself, not the modal content
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div
        className={`${themeClasses.cardBg}`}
        style={{
          width: '600px',
          maxWidth: '90vw',
          borderRadius: '12px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          backgroundColor: '#FFFFFF',
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: '#111827',
              margin: 0,
            }}
          >
            Shipment Details
          </h2>
            <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
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
                stroke="#9CA3AF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <div
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Shipment Name */}
          <div>
            <label
              style={{ 
                fontSize: '13px', 
                fontWeight: 500, 
                display: 'block', 
                marginBottom: '8px', 
                color: '#374151' 
              }}
            >
              Shipment Name<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={shipmentName}
              onChange={(e) => setShipmentName(e.target.value)}
              placeholder="Enter shipment name"
              disabled={!isEditMode}
              readOnly={!isEditMode}
              onFocus={() => isEditMode && setFocusedField('shipmentName')}
              onBlur={() => setFocusedField(null)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: isEditMode && focusedField === 'shipmentName' 
                  ? '1px solid #3B82F6' 
                  : '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                color: isEditMode ? '#111827' : '#6B7280',
                backgroundColor: isEditMode ? '#FFFFFF' : '#F9FAFB',
                outline: 'none',
                cursor: isEditMode ? 'text' : 'not-allowed',
                transition: 'border-color 0.2s ease',
              }}
            />
          </div>

          {/* Marketplace */}
          <div>
            <label
              style={{ 
                fontSize: '13px', 
                fontWeight: 500, 
                display: 'block', 
                marginBottom: '8px', 
                color: '#374151' 
              }}
            >
              Marketplace<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div ref={marketplaceRef} style={{ position: 'relative' }}>
              <button
                type="button"
                disabled={true}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#F9FAFB',
                  cursor: 'not-allowed',
                  fontSize: '14px',
                  color: marketplace ? '#6B7280' : '#9CA3AF',
                  outline: 'none',
                }}
              >
                <span>{marketplace || 'Select Marketplace'}</span>
                <svg
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    color: '#9CA3AF',
                    flexShrink: 0,
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M19 9L12 16L5 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              
              {false && marketplaceOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    zIndex: 100,
                  }}
                >
                  {['Amazon'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setMarketplace(option);
                        setMarketplaceOpen(false);
                        setFocusedField(null);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        fontSize: '14px',
                        color: '#111827',
                        backgroundColor: marketplace === option ? '#F3F4F6' : '#FFFFFF',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#F3F4F6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = marketplace === option ? '#F3F4F6' : '#FFFFFF'}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Seller Account */}
          <div>
            <label
              style={{ 
                fontSize: '13px', 
                fontWeight: 500, 
                display: 'block', 
                marginBottom: '8px', 
                color: '#374151' 
              }}
            >
              Seller Account<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div ref={accountRef} style={{ position: 'relative' }}>
              <button
                type="button"
                disabled={true}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: '#F9FAFB',
                  cursor: 'not-allowed',
                  fontSize: '14px',
                  color: account ? '#6B7280' : '#9CA3AF',
                  outline: 'none',
                }}
              >
                <span>{account || 'Select Account'}</span>
                <svg
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    color: '#9CA3AF',
                    flexShrink: 0,
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M19 9L12 16L5 9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              
              {false && accountOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    zIndex: 100,
                    maxHeight: '300px',
                    overflowY: 'auto',
                  }}
                >
                  {ACCOUNT_OPTIONS.map((option) => (
                    <button
                      key={option.name}
                      type="button"
                      onClick={() => {
                        setAccount(option.name);
                        setAccountOpen(false);
                        setFocusedField(null);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 14px',
                        fontSize: '14px',
                        color: '#111827',
                        backgroundColor: account === option.name ? '#EBF5FF' : '#FFFFFF',
                        border: 'none',
                        borderBottom: '1px solid #F3F4F6',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (account !== option.name) {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (account !== option.name) {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500 }}>{option.name}</span>
                        {account === option.name && (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M13.3332 4L5.99984 11.3333L2.6665 8" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '4px', 
                        marginTop: '6px' 
                      }}>
                        {option.brands.map(brand => (
                          <span
                            key={brand}
                            style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#F3F4F6',
                              color: '#6B7280',
                            }}
                          >
                            {brand}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={handleCancel}
            style={{
              width: '72px',
              height: '31px',
              padding: '0',
              borderRadius: '4px',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isEditMode ? 'Cancel' : 'Close'}
          </button>
          <button
            type="button"
            disabled={isEditMode && !shipmentName}
            onClick={handleEditInfo}
            style={{
              width: isEditMode ? '115px' : 'fit-content',
              height: isEditMode ? '31px' : 'fit-content',
              minWidth: isEditMode ? '115px' : '72px',
              minHeight: isEditMode ? '31px' : '16px',
              padding: '0',
              borderRadius: isEditMode ? '4px' : '6px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: isEditMode 
                ? (!shipmentName ? '#9CA3AF' : '#3B82F6')
                : 'transparent',
              color: isEditMode ? '#FFFFFF' : '#3B82F6',
              cursor: (isEditMode && !shipmentName) ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isEditMode ? '0' : '8px',
              boxShadow: isEditMode && shipmentName ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {isEditMode ? (
              'Save Changes'
            ) : (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                    stroke="#3B82F6"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Edit Info
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ShipmentDetailsModal;
