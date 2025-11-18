import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';

const NewShipmentModal = ({ isOpen, onClose, newShipment, setNewShipment }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  // Dropdown states
  const [shipmentTypeOpen, setShipmentTypeOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const shipmentTypeRef = useRef(null);
  const accountRef = useRef(null);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shipmentTypeRef.current && !shipmentTypeRef.current.contains(event.target)) {
        setShipmentTypeOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };

    if (shipmentTypeOpen || accountOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [shipmentTypeOpen, accountOpen]);

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
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        className={`${themeClasses.cardBg} ${themeClasses.border}`}
        style={{
          width: 'min(900px, 92vw)',
          borderRadius: '0.75rem',
          boxShadow:
            '0 20px 40px rgba(15,23,42,0.35), 0 0 0 1px rgba(15,23,42,0.08)',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: `1px solid ${isDarkMode ? '#111827' : '#E5E7EB'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            className={themeClasses.text}
            style={{ fontSize: '1rem', fontWeight: 600, color: isDarkMode ? '#FFFFFF' : '#151515' }}
          >
            New Shipment
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <svg
              style={{ width: '1.1rem', height: '1.1rem' }}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 6L18 18M18 6L6 18"
                stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Modal body */}
        <div
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {/* Form fields in 2x2 grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '1rem',
            }}
          >
            {/* Shipment # */}
            <div>
              <label
                className={themeClasses.textSecondary}
                style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}
              >
                Shipment # <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={newShipment.shipmentNumber}
                onChange={(e) =>
                  setNewShipment((prev) => ({
                    ...prev,
                    shipmentNumber: e.target.value,
                  }))
                }
                placeholder="Enter shipment # here..."
                className={`${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500`}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  color: isDarkMode ? '#FFFFFF' : '#151515',
                }}
              />
            </div>

            {/* Shipment Type */}
            <div>
              <label
                className={themeClasses.textSecondary}
                style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}
              >
                Shipment Type <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div ref={shipmentTypeRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShipmentTypeOpen(!shipmentTypeOpen)}
                  className={`${themeClasses.inputBg} ${themeClasses.border} border rounded-lg hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500`}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    minHeight: '38px',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.875rem',
                      color: newShipment.shipmentType ? (isDarkMode ? '#FFFFFF' : '#151515') : (isDarkMode ? '#9CA3AF' : '#9CA3AF'),
                      fontWeight: 400,
                    }}
                  >
                    {newShipment.shipmentType || 'Select Shipment Type'}
                  </span>
                  <svg
                    className={`transition-transform ${shipmentTypeOpen ? 'rotate-180' : ''}`}
                    style={{ 
                      width: '1rem', 
                      height: '1rem', 
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
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
                    className={`fixed ${themeClasses.inputBg} ${themeClasses.border} border rounded-lg shadow-xl overflow-hidden z-50`}
                    style={{
                      top: shipmentTypeRef.current?.getBoundingClientRect().bottom + 4 + 'px',
                      left: shipmentTypeRef.current?.getBoundingClientRect().left + 'px',
                      width: shipmentTypeRef.current?.offsetWidth + 'px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {['', 'AWD', 'Direct'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setNewShipment((prev) => ({ ...prev, shipmentType: option }));
                          setShipmentTypeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                          newShipment.shipmentType === option
                            ? isDarkMode ? 'bg-dark-bg-primary' : 'bg-blue-50'
                            : isDarkMode ? 'hover:bg-dark-bg-primary' : 'hover:bg-gray-50'
                        }`}
                        style={{
                          color: option ? (isDarkMode ? '#FFFFFF' : '#151515') : (isDarkMode ? '#9CA3AF' : '#9CA3AF'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{option || 'Select Shipment Type'}</span>
                        {newShipment.shipmentType === option && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Account */}
            <div>
              <label
                className={themeClasses.textSecondary}
                style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}
              >
                Account <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div ref={accountRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setAccountOpen(!accountOpen)}
                  className={`${themeClasses.inputBg} ${themeClasses.border} border rounded-lg hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500`}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    minHeight: '38px',
                    textAlign: 'left',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.875rem',
                      color: newShipment.account ? (isDarkMode ? '#FFFFFF' : '#151515') : (isDarkMode ? '#9CA3AF' : '#9CA3AF'),
                      fontWeight: 400,
                    }}
                  >
                    {newShipment.account === 'tps-nutrients' ? 'TPS Nutrients' : 
                     newShipment.account === 'green-earth' ? 'Green Earth Co' : 
                     'Select Account'}
                  </span>
                  <svg
                    className={`transition-transform ${accountOpen ? 'rotate-180' : ''}`}
                    style={{ 
                      width: '1rem', 
                      height: '1rem', 
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
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
                    className={`fixed ${themeClasses.inputBg} ${themeClasses.border} border rounded-lg shadow-xl overflow-hidden z-50`}
                    style={{
                      top: accountRef.current?.getBoundingClientRect().bottom + 4 + 'px',
                      left: accountRef.current?.getBoundingClientRect().left + 'px',
                      width: accountRef.current?.offsetWidth + 'px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }}
                  >
                    {[
                      { value: '', label: 'Select Account' },
                      { value: 'tps-nutrients', label: 'TPS Nutrients' },
                      { value: 'green-earth', label: 'Green Earth Co' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setNewShipment((prev) => ({ ...prev, account: option.value }));
                          setAccountOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                          newShipment.account === option.value
                            ? isDarkMode ? 'bg-dark-bg-primary' : 'bg-blue-50'
                            : isDarkMode ? 'hover:bg-dark-bg-primary' : 'hover:bg-gray-50'
                        }`}
                        style={{
                          color: option.value ? (isDarkMode ? '#FFFFFF' : '#151515') : (isDarkMode ? '#9CA3AF' : '#9CA3AF'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{option.label}</span>
                        {newShipment.account === option.value && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div>
              <label
                className={themeClasses.textSecondary}
                style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}
              >
                Location <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={newShipment.location || ''}
                onChange={(e) =>
                  setNewShipment((prev) => ({
                    ...prev,
                    location: e.target.value,
                  }))
                }
                placeholder="Enter location here..."
                className={`${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500`}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  color: isDarkMode ? '#FFFFFF' : '#151515',
                }}
              />
            </div>
          </div>

          {/* Supplier selector */}
          <div>
            <p
              className={themeClasses.textSecondary}
              style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.75rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}
            >
              Supplier (Select one) <span style={{ color: '#EF4444' }}>*</span>
            </p>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              {[
                {
                  id: 'amazon',
                  label: 'Amazon',
                  logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
                },
                {
                  id: 'walmart',
                  label: 'Walmart',
                  logo: '/assets/Walmart_logo_(2008).svg 1.png',
                },
              ].map((supplier) => {
                const isSelected = newShipment.supplier === supplier.id;
                return (
                  <button
                    key={supplier.id}
                    type="button"
                    onClick={() =>
                      setNewShipment((prev) => ({ ...prev, supplier: supplier.id }))
                    }
                    style={{
                      flex: '0 0 220px',
                      maxWidth: '220px',
                      minHeight: '170px',
                      borderRadius: '0.75rem',
                      border: `1px solid ${
                        isSelected
                          ? '#3B82F6'
                          : isDarkMode
                          ? '#1F2937'
                          : '#E5E7EB'
                      }`,
                      backgroundColor: isSelected
                        ? (isDarkMode ? 'rgba(37, 99, 235, 0.12)' : '#EFF6FF')
                        : (isDarkMode ? '#020617' : '#FFFFFF'),
                      boxShadow: isSelected
                        ? '0 0 0 1px rgba(59,130,246,0.4)'
                        : '0 1px 2px rgba(15,23,42,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.5rem 1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '120px',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.75rem',
                      }}
                    >
                      <img
                        src={supplier.logo}
                        alt={supplier.label}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                    </div>
                    <span
                      className={themeClasses.textSecondary}
                      style={{ fontSize: '0.8rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}
                    >
                      {supplier.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div
          style={{
            padding: '0.9rem 1.5rem',
            borderTop: `1px solid ${isDarkMode ? '#111827' : '#E5E7EB'}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className={themeClasses.textSecondary}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
              backgroundColor: isDarkMode ? '#020617' : '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: isDarkMode ? '#FFFFFF' : '#151515',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={
              !newShipment.shipmentNumber ||
              !newShipment.shipmentType ||
              !newShipment.account ||
              !newShipment.location
            }
            style={{
              padding: '0.5rem 1.1rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 500,
              backgroundColor:
                !newShipment.shipmentNumber ||
                !newShipment.shipmentType ||
                !newShipment.account ||
                !newShipment.location
                  ? '#D1D5DB'
                  : '#111827',
              color:
                !newShipment.shipmentNumber ||
                !newShipment.shipmentType ||
                !newShipment.account ||
                !newShipment.location
                  ? '#9CA3AF'
                  : '#FFFFFF',
              cursor:
                !newShipment.shipmentNumber ||
                !newShipment.shipmentType ||
                !newShipment.account ||
                !newShipment.location
                  ? 'not-allowed'
                  : 'pointer',
            }}
            onClick={() => {
              if (
                !newShipment.shipmentNumber ||
                !newShipment.shipmentType ||
                !newShipment.account ||
                !newShipment.location
              ) {
                return;
              }
              onClose();
              navigate('/dashboard/production/shipment/new', {
                state: {
                  shipmentData: newShipment
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

