import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

const NewShipmentModal = ({ isOpen, onClose, newShipment, setNewShipment }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  // Dropdown states
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [shipmentTypeOpen, setShipmentTypeOpen] = useState(false);
  const marketplaceRef = useRef(null);
  const accountRef = useRef(null);
  const shipmentTypeRef = useRef(null);
  const hasInitializedRef = useRef(false);
  
  // Auto-populate shipment name with current timestamp and set marketplace to Amazon when modal opens
  useEffect(() => {
    if (isOpen && !hasInitializedRef.current) {
      const updates = {};
      
      // Auto-populate shipment name with timestamp (YYYY-MM-DD HH:mm:ss)
      if (!newShipment.shipmentName) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const timestampString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        updates.shipmentName = timestampString;
      }
      
      // Auto-select Amazon if marketplace is not set
      if (!newShipment.marketplace) {
        updates.marketplace = 'Amazon';
      }
      
      if (Object.keys(updates).length > 0) {
        setNewShipment((prev) => ({
          ...prev,
          ...updates,
        }));
      }
      
      hasInitializedRef.current = true;
    }
    
    // Reset initialization flag when modal closes
    if (!isOpen) {
      hasInitializedRef.current = false;
    }
  }, [isOpen, newShipment.shipmentName, newShipment.marketplace, setNewShipment]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (marketplaceRef.current && !marketplaceRef.current.contains(event.target)) {
        setMarketplaceOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
      if (shipmentTypeRef.current && !shipmentTypeRef.current.contains(event.target)) {
        setShipmentTypeOpen(false);
      }
    };

    if (marketplaceOpen || accountOpen || shipmentTypeOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [marketplaceOpen, accountOpen, shipmentTypeOpen]);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className={`${themeClasses.cardBg}`}
        style={{
          width: '600px',
          maxWidth: '90vw',
          borderRadius: '12px',
          border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
            backgroundColor: isDarkMode ? '#111827' : '#F8F9FA',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <h2
            style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: isDarkMode ? '#FFFFFF' : '#111827',
              margin: 0,
            }}
          >
            New Shipment
          </h2>
          <button
            type="button"
            onClick={onClose}
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
                stroke={isDarkMode ? '#9CA3AF' : '#ADB5BD'}
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
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
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
                color: isDarkMode ? '#E5E7EB' : '#374151' 
              }}
            >
              Shipment Name<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={newShipment.shipmentName || ''}
              readOnly
              disabled
              placeholder="Auto-generated timestamp..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                borderRadius: '6px',
                fontSize: '14px',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                outline: 'none',
                cursor: 'not-allowed',
              }}
            />
          </div>

          {/* Shipment Type */}
          <div>
            <label
              style={{ 
                fontSize: '13px', 
                fontWeight: 500, 
                display: 'block', 
                marginBottom: '8px', 
                color: isDarkMode ? '#E5E7EB' : '#374151' 
              }}
            >
              Shipment Type<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div ref={shipmentTypeRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShipmentTypeOpen(!shipmentTypeOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                  borderRadius: '6px',
                  backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: newShipment.shipmentType ? (isDarkMode ? '#FFFFFF' : '#111827') : (isDarkMode ? '#9CA3AF' : '#9CA3AF'),
                  outline: 'none',
                }}
              >
                <span>{newShipment.shipmentType || 'Select Shipment Type'}</span>
                <svg
                  className={`transition-transform ${shipmentTypeOpen ? 'rotate-180' : ''}`}
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
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
              
              {shipmentTypeOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                    border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    zIndex: 100,
                  }}
                >
                  {['FBA', 'AWD', 'Hazmat'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setNewShipment((prev) => ({ ...prev, shipmentType: option }));
                        setShipmentTypeOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        fontSize: '14px',
                        color: isDarkMode ? '#FFFFFF' : '#111827',
                        backgroundColor: newShipment.shipmentType === option 
                          ? (isDarkMode ? '#4B5563' : '#F3F4F6') 
                          : (isDarkMode ? '#374151' : '#FFFFFF'),
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = isDarkMode ? '#4B5563' : '#F3F4F6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = newShipment.shipmentType === option 
                        ? (isDarkMode ? '#4B5563' : '#F3F4F6') 
                        : (isDarkMode ? '#374151' : '#FFFFFF')}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <label
              style={{ 
                fontSize: '13px', 
                fontWeight: 500, 
                display: 'block', 
                marginBottom: '8px', 
                color: isDarkMode ? '#E5E7EB' : '#374151' 
              }}
            >
              Marketplace<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div ref={marketplaceRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setMarketplaceOpen(!marketplaceOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                  borderRadius: '6px',
                  backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: newShipment.marketplace ? (isDarkMode ? '#FFFFFF' : '#111827') : (isDarkMode ? '#9CA3AF' : '#9CA3AF'),
                  outline: 'none',
                }}
              >
                <span>{newShipment.marketplace || 'Select Marketplace'}</span>
                <svg
                  className={`transition-transform ${marketplaceOpen ? 'rotate-180' : ''}`}
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
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
              
              {marketplaceOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                    border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
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
                        setNewShipment((prev) => ({ ...prev, marketplace: option }));
                        setMarketplaceOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        fontSize: '14px',
                        color: isDarkMode ? '#FFFFFF' : '#111827',
                        backgroundColor: newShipment.marketplace === option 
                          ? (isDarkMode ? '#4B5563' : '#F3F4F6') 
                          : (isDarkMode ? '#374151' : '#FFFFFF'),
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = isDarkMode ? '#4B5563' : '#F3F4F6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = newShipment.marketplace === option 
                        ? (isDarkMode ? '#4B5563' : '#F3F4F6') 
                        : (isDarkMode ? '#374151' : '#FFFFFF')}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Account */}
          <div>
            <label
              style={{ 
                fontSize: '13px', 
                fontWeight: 500, 
                display: 'block', 
                marginBottom: '8px', 
                color: isDarkMode ? '#E5E7EB' : '#374151' 
              }}
            >
              Account<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <div ref={accountRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setAccountOpen(!accountOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                  borderRadius: '6px',
                  backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: newShipment.account ? (isDarkMode ? '#FFFFFF' : '#111827') : (isDarkMode ? '#9CA3AF' : '#9CA3AF'),
                  outline: 'none',
                }}
              >
                <span>{newShipment.account || 'Select Account'}</span>
                <svg
                  className={`transition-transform ${accountOpen ? 'rotate-180' : ''}`}
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    color: isDarkMode ? '#9CA3AF' : '#9CA3AF',
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
              
              {accountOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                    border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
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
                        setNewShipment((prev) => ({ ...prev, account: option.name }));
                        setAccountOpen(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 14px',
                        fontSize: '14px',
                        color: isDarkMode ? '#FFFFFF' : '#111827',
                        backgroundColor: newShipment.account === option.name 
                          ? (isDarkMode ? '#1E40AF' : '#EBF5FF') 
                          : (isDarkMode ? '#374151' : '#FFFFFF'),
                        border: 'none',
                        borderBottom: `1px solid ${isDarkMode ? '#4B5563' : '#F3F4F6'}`,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (newShipment.account !== option.name) {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#4B5563' : '#F9FAFB';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (newShipment.account !== option.name) {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#FFFFFF';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 500 }}>{option.name}</span>
                        {newShipment.account === option.name && (
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
                              backgroundColor: isDarkMode ? '#4B5563' : '#F3F4F6',
                              color: isDarkMode ? '#D1D5DB' : '#6B7280',
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
            borderTop: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: `1px solid ${isDarkMode ? '#4B5563' : '#D1D5DB'}`,
              backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              color: isDarkMode ? '#E5E7EB' : '#374151',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              !newShipment.shipmentName ||
              !newShipment.shipmentType ||
              !newShipment.marketplace ||
              !newShipment.account
            }
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor:
                !newShipment.shipmentName ||
                !newShipment.shipmentType ||
                !newShipment.marketplace ||
                !newShipment.account
                  ? (isDarkMode ? '#4B5563' : '#9CA3AF')
                  : '#3B82F6',
              color: '#FFFFFF',
              cursor:
                !newShipment.shipmentName ||
                !newShipment.shipmentType ||
                !newShipment.marketplace ||
                !newShipment.account
                  ? 'not-allowed'
                  : 'pointer',
            }}
            onClick={() => {
              if (
                !newShipment.shipmentName ||
                !newShipment.shipmentType ||
                !newShipment.marketplace ||
                !newShipment.account
              ) {
                return;
              }
              onClose();
              navigate('/dashboard/production/shipment/new', {
                state: {
                  shipmentData: newShipment,
                  fromPlanning: true
                }
              });
            }}
          >
            Create New Shipment
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewShipmentModal;

