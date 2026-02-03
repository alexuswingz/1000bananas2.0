import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

// Shipment type options (FBA, AWD, Hazmat)
const TYPE_OPTIONS = ['FBA', 'AWD', 'Hazmat'];

// Carrier options
const CARRIER_OPTIONS = ['UPS', 'FedEx', 'USPS', 'DHL', 'Other'];

const ShipmentDetailsModal = ({ isOpen, onClose, row, onUpdate }) => {
  const { isDarkMode } = useTheme();
  
  // Edit mode state - fields are read-only until user clicks "Edit Info"
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Initialize form state from row data
  const [shipmentName, setShipmentName] = useState(row?.shipment || '');
  const [type, setType] = useState(row?.shipmentType || row?.type || '');
  const [amazonShipmentNumber, setAmazonShipmentNumber] = useState(row?.amazonShipmentNumber || row?.amazon_shipment_id || '');
  const [amazonRefId, setAmazonRefId] = useState(row?.amazonRefId || row?.amazon_ref_id || '');
  const [shipFrom, setShipFrom] = useState(row?.shipFrom || row?.ship_from || '');
  const [shipTo, setShipTo] = useState(row?.shipTo || row?.ship_to || '');
  const [carrier, setCarrier] = useState(row?.carrier || '');
  
  // Dropdown states
  const [typeOpen, setTypeOpen] = useState(false);
  const [carrierOpen, setCarrierOpen] = useState(false);
  const typeRef = useRef(null);
  const carrierRef = useRef(null);
  
  // Focus states for blue border on focus
  const [focusedField, setFocusedField] = useState(null);
  
  // Update form state when row changes and reset edit mode
  useEffect(() => {
    if (row) {
      setShipmentName(row.shipment || '');
      setType(row.shipmentType || row.type || '');
      setAmazonShipmentNumber(row.amazonShipmentNumber || row.amazon_shipment_id || '');
      setAmazonRefId(row.amazonRefId || row.amazon_ref_id || '');
      setShipFrom(row.shipFrom || row.ship_from || '');
      setShipTo(row.shipTo || row.ship_to || '');
      setCarrier(row.carrier || '');
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
      if (typeRef.current && !typeRef.current.contains(event.target)) {
        setTypeOpen(false);
      }
      if (carrierRef.current && !carrierRef.current.contains(event.target)) {
        setCarrierOpen(false);
      }
    };

    if (typeOpen || carrierOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [typeOpen, carrierOpen]);

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
          shipment_type: type || undefined,
          amazon_shipment_id: amazonShipmentNumber || undefined,
          amazon_ref_id: amazonRefId || undefined,
          ship_from: shipFrom || undefined,
          ship_to: shipTo || undefined,
          carrier: carrier || undefined,
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
        setType(row.shipmentType || row.type || '');
        setAmazonShipmentNumber(row.amazonShipmentNumber || row.amazon_shipment_id || '');
        setAmazonRefId(row.amazonRefId || row.amazon_ref_id || '');
        setShipFrom(row.shipFrom || row.ship_from || '');
        setShipTo(row.shipTo || row.ship_to || '');
        setCarrier(row.carrier || '');
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
          border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
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
            borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2
            style={{ 
              fontSize: '16px', 
              fontWeight: 600, 
              color: isDarkMode ? '#E5E7EB' : '#111827',
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
                stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
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
          {/* Row 1: Shipment Name + Shipment Type (two columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '8px',
                  color: isDarkMode ? '#E5E7EB' : '#374151',
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
                    : isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: isEditMode
                    ? (isDarkMode ? '#E5E7EB' : '#111827')
                    : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                  backgroundColor: isEditMode
                    ? (isDarkMode ? '#374151' : '#FFFFFF')
                    : (isDarkMode ? '#111827' : '#F9FAFB'),
                  outline: 'none',
                  cursor: isEditMode ? 'text' : 'not-allowed',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>
            <div ref={typeRef} style={{ position: 'relative' }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '8px',
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                }}
              >
                Shipment Type<span style={{ color: '#EF4444' }}>*</span>
              </label>
              <button
                type="button"
                disabled={!isEditMode}
                onClick={() => isEditMode && setTypeOpen((prev) => !prev)}
                onFocus={() => isEditMode && setFocusedField('type')}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  border: isEditMode && (focusedField === 'type' || typeOpen)
                    ? '1px solid #3B82F6'
                    : isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: isEditMode
                    ? (isDarkMode ? '#374151' : '#FFFFFF')
                    : (isDarkMode ? '#111827' : '#F9FAFB'),
                  cursor: isEditMode ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  color: type
                    ? (isEditMode ? (isDarkMode ? '#E5E7EB' : '#111827') : (isDarkMode ? '#9CA3AF' : '#6B7280'))
                    : (isDarkMode ? '#6B7280' : '#9CA3AF'),
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <span>{type || 'Select Shipment Type'}</span>
                <svg
                  style={{
                    width: '16px',
                    height: '16px',
                    color: '#9CA3AF',
                    flexShrink: 0,
                    transform: typeOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
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
              {typeOpen && isEditMode && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                    border: isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    zIndex: 100,
                  }}
                >
                  {TYPE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setType(option);
                        setTypeOpen(false);
                        setFocusedField(null);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '10px 12px',
                        fontSize: '14px',
                        color: isDarkMode ? '#E5E7EB' : '#111827',
                        backgroundColor: type === option
                          ? (isDarkMode ? '#374151' : '#F3F4F6')
                          : (isDarkMode ? '#1F2937' : '#FFFFFF'),
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = type === option
                          ? (isDarkMode ? '#374151' : '#F3F4F6')
                          : (isDarkMode ? '#374151' : '#F3F4F6');
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = type === option
                          ? (isDarkMode ? '#374151' : '#F3F4F6')
                          : (isDarkMode ? '#1F2937' : '#FFFFFF');
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Amazon Shipment # + Amazon Ref ID (two columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '8px',
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                }}
              >
                Amazon Shipment #<span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={amazonShipmentNumber}
                onChange={(e) => setAmazonShipmentNumber(e.target.value)}
                placeholder="e.g. FBAXXXXXXXXX"
                disabled={!isEditMode}
                readOnly={!isEditMode}
                onFocus={() => isEditMode && setFocusedField('amazonShipmentNumber')}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: isEditMode && focusedField === 'amazonShipmentNumber'
                    ? '1px solid #3B82F6'
                    : isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: isEditMode
                    ? (isDarkMode ? '#E5E7EB' : '#111827')
                    : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                  backgroundColor: isEditMode
                    ? (isDarkMode ? '#374151' : '#FFFFFF')
                    : (isDarkMode ? '#111827' : '#F9FAFB'),
                  outline: 'none',
                  cursor: isEditMode ? 'text' : 'not-allowed',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'block',
                  marginBottom: '8px',
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                }}
              >
                Amazon Ref ID<span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={amazonRefId}
                onChange={(e) => setAmazonRefId(e.target.value)}
                placeholder="e.g. XXXXXXXX"
                disabled={!isEditMode}
                readOnly={!isEditMode}
                onFocus={() => isEditMode && setFocusedField('amazonRefId')}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: isEditMode && focusedField === 'amazonRefId'
                    ? '1px solid #3B82F6'
                    : isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: isEditMode
                    ? (isDarkMode ? '#E5E7EB' : '#111827')
                    : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                  backgroundColor: isEditMode
                    ? (isDarkMode ? '#374151' : '#FFFFFF')
                    : (isDarkMode ? '#111827' : '#F9FAFB'),
                  outline: 'none',
                  cursor: isEditMode ? 'text' : 'not-allowed',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>
          </div>

          {/* Ship From (full width) */}
          <div>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 500,
                display: 'block',
                marginBottom: '8px',
                color: isDarkMode ? '#E5E7EB' : '#374151',
              }}
            >
              Ship From
            </label>
            <input
              type="text"
              value={shipFrom}
              onChange={(e) => setShipFrom(e.target.value)}
              placeholder="Enter Shipment Location..."
              disabled={!isEditMode}
              readOnly={!isEditMode}
              onFocus={() => isEditMode && setFocusedField('shipFrom')}
              onBlur={() => setFocusedField(null)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: isEditMode && focusedField === 'shipFrom'
                  ? '1px solid #3B82F6'
                  : isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                color: isEditMode
                  ? (isDarkMode ? '#E5E7EB' : '#111827')
                  : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                backgroundColor: isEditMode
                  ? (isDarkMode ? '#374151' : '#FFFFFF')
                  : (isDarkMode ? '#111827' : '#F9FAFB'),
                outline: 'none',
                cursor: isEditMode ? 'text' : 'not-allowed',
                transition: 'border-color 0.2s ease',
              }}
            />
          </div>

          {/* Ship To (full width) */}
          <div>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 500,
                display: 'block',
                marginBottom: '8px',
                color: isDarkMode ? '#E5E7EB' : '#374151',
              }}
            >
              Ship To
            </label>
            <input
              type="text"
              value={shipTo}
              onChange={(e) => setShipTo(e.target.value)}
              placeholder="Enter Shipment Destination..."
              disabled={!isEditMode}
              readOnly={!isEditMode}
              onFocus={() => isEditMode && setFocusedField('shipTo')}
              onBlur={() => setFocusedField(null)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: isEditMode && focusedField === 'shipTo'
                  ? '1px solid #3B82F6'
                  : isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                color: isEditMode
                  ? (isDarkMode ? '#E5E7EB' : '#111827')
                  : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                backgroundColor: isEditMode
                  ? (isDarkMode ? '#374151' : '#FFFFFF')
                  : (isDarkMode ? '#111827' : '#F9FAFB'),
                outline: 'none',
                cursor: isEditMode ? 'text' : 'not-allowed',
                transition: 'border-color 0.2s ease',
              }}
            />
          </div>

          {/* Carrier (full width dropdown) */}
          <div ref={carrierRef} style={{ position: 'relative' }}>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 500,
                display: 'block',
                marginBottom: '8px',
                color: isDarkMode ? '#E5E7EB' : '#374151',
              }}
            >
              Carrier
            </label>
            <button
              type="button"
              disabled={!isEditMode}
              onClick={() => isEditMode && setCarrierOpen((prev) => !prev)}
              onFocus={() => isEditMode && setFocusedField('carrier')}
              onBlur={() => setFocusedField(null)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                border: isEditMode && (focusedField === 'carrier' || carrierOpen)
                  ? '1px solid #3B82F6'
                  : isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
                borderRadius: '6px',
                backgroundColor: isEditMode
                  ? (isDarkMode ? '#374151' : '#FFFFFF')
                  : (isDarkMode ? '#111827' : '#F9FAFB'),
                cursor: isEditMode ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                color: carrier
                  ? (isEditMode ? (isDarkMode ? '#E5E7EB' : '#111827') : (isDarkMode ? '#9CA3AF' : '#6B7280'))
                  : (isDarkMode ? '#6B7280' : '#9CA3AF'),
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
            >
              <span>{carrier || 'Select Carrier Name...'}</span>
              <svg
                style={{
                  width: '16px',
                  height: '16px',
                  color: '#9CA3AF',
                  flexShrink: 0,
                  transform: carrierOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
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
            {carrierOpen && isEditMode && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  border: isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden',
                  zIndex: 100,
                }}
              >
                {CARRIER_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setCarrier(option);
                      setCarrierOpen(false);
                      setFocusedField(null);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 12px',
                      fontSize: '14px',
                      color: isDarkMode ? '#E5E7EB' : '#111827',
                      backgroundColor: carrier === option
                        ? (isDarkMode ? '#374151' : '#F3F4F6')
                        : (isDarkMode ? '#1F2937' : '#FFFFFF'),
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = carrier === option
                        ? (isDarkMode ? '#374151' : '#F3F4F6')
                        : (isDarkMode ? '#374151' : '#F3F4F6');
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = carrier === option
                        ? (isDarkMode ? '#374151' : '#F3F4F6')
                        : (isDarkMode ? '#1F2937' : '#FFFFFF');
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
              backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              color: isDarkMode ? '#E5E7EB' : '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isEditMode && (!shipmentName || !amazonShipmentNumber || !amazonRefId)}
            onClick={handleEditInfo}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              backgroundColor: isEditMode && shipmentName && amazonShipmentNumber && amazonRefId
                ? '#3B82F6'
                : 'transparent',
              color: isEditMode
                ? (shipmentName && amazonShipmentNumber && amazonRefId ? '#FFFFFF' : '#9CA3AF')
                : (isDarkMode ? '#60A5FA' : '#3B82F6'),
              cursor: (isEditMode && (!shipmentName || !amazonShipmentNumber || !amazonRefId)) ? 'not-allowed' : 'pointer',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                stroke={isEditMode && shipmentName && amazonShipmentNumber && amazonRefId ? '#FFFFFF' : (isDarkMode ? '#60A5FA' : '#3B82F6')}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                stroke={isEditMode && shipmentName && amazonShipmentNumber && amazonRefId ? '#FFFFFF' : (isDarkMode ? '#60A5FA' : '#3B82F6')}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isEditMode ? 'Save Changes' : 'Edit Info'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ShipmentDetailsModal;
