import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const ShipmentDetailsModal = ({ isOpen, onClose, shipmentData, totalUnits = 0, totalBoxes = 0, onSave, onBookAndProceed }) => {
  const { isDarkMode } = useTheme();
  const [editableData, setEditableData] = useState({
    shipmentName: '',
    shipmentType: '',
    amazonShipmentNumber: 'FBAXXXXXXXXX',
    amazonRefId: 'XXXXXXXX',
    shipping: 'UPS',
    shipFrom: '',
    shipTo: '',
    carrier: '',
  });
  const [isCarrierDropdownOpen, setIsCarrierDropdownOpen] = useState(false);
  const [customCarrierInput, setCustomCarrierInput] = useState('');
  const carrierDropdownRef = useRef(null);
  const carrierInputRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const knownCarriers = ['WeShip', 'TopCarrier', 'Worldwide Express'];

  // Get Amazon Shipment # format based on shipment type
  const getAmazonShipmentFormat = (type) => {
    if (type === 'FBA' || type === 'Parcel') {
      return 'FBAXXXXXXXXX';
    } else if (type === 'AWD') {
      return 'STAR-XXXXXXXXXXXXX';
    }
    return 'FBAXXXXXXXXX'; // Default
  };

  // Update editable data when shipmentData changes
  useEffect(() => {
    if (shipmentData) {
      const shipmentName = shipmentData.shipmentName || shipmentData.shipmentNumber || '2025.11.18';
      const shipmentType = shipmentData.shipmentType || '';
      const format = getAmazonShipmentFormat(shipmentType);
      setEditableData({
        shipmentName: `${shipmentName} ${shipmentType}`.trim(),
        shipmentType: shipmentType || '',
        amazonShipmentNumber: format,
        amazonRefId: 'XXXXXXXX',
        shipping: 'UPS',
        shipFrom: '',
        shipTo: '',
        carrier: '',
      });
    }
  }, [shipmentData]);

  // Update Amazon Shipment # format when shipment type changes
  useEffect(() => {
    const format = getAmazonShipmentFormat(editableData.shipmentType);
    if (editableData.amazonShipmentNumber !== format && editableData.shipmentType) {
      setEditableData(prev => ({
        ...prev,
        amazonShipmentNumber: format,
      }));
    }
  }, [editableData.shipmentType]);

  // Calculate dropdown position and close when clicking outside
  useEffect(() => {
    const updateDropdownPosition = () => {
      if (carrierInputRef.current && isCarrierDropdownOpen) {
        const rect = carrierInputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    };

    const handleClickOutside = (event) => {
      if (
        carrierDropdownRef.current && 
        !carrierDropdownRef.current.contains(event.target) &&
        carrierInputRef.current &&
        !carrierInputRef.current.contains(event.target)
      ) {
        setIsCarrierDropdownOpen(false);
      }
    };

    if (isCarrierDropdownOpen) {
      updateDropdownPosition();
      window.addEventListener('resize', updateDropdownPosition);
      window.addEventListener('scroll', updateDropdownPosition, true);
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        window.removeEventListener('resize', updateDropdownPosition);
        window.removeEventListener('scroll', updateDropdownPosition, true);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isCarrierDropdownOpen]);

  const handleCarrierSelect = (carrier) => {
    setEditableData({ ...editableData, carrier });
    setIsCarrierDropdownOpen(false);
    setCustomCarrierInput('');
  };

  const handleUseCustomCarrier = () => {
    if (customCarrierInput.trim()) {
      handleCarrierSelect(customCarrierInput.trim());
    }
  };

  const handleAddNewCarrier = () => {
    // This would typically open a modal or navigate to add carrier page
    // For now, we'll just close the dropdown
    setIsCarrierDropdownOpen(false);
    // You can add your logic here to add a new carrier to the system
  };

  if (!isOpen) return null;

  const handleSaveAndExit = () => {
    if (onSave) {
      // Parse shipment name back to separate name and type
      const parts = editableData.shipmentName.trim().split(' ');
      // If there are multiple parts, the last is the type and the rest is the name
      // If only one part, it's the name and we use the existing shipmentType
      const name = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
      const type = parts.length > 1 ? parts[parts.length - 1] : (shipmentData?.shipmentType || editableData.shipmentType || 'AWD');
      
      onSave({
        shipmentNumber: name, // Use shipmentNumber (backend expects this)
        shipmentDate: shipmentData?.shipmentDate || new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        shipmentType: type,
        marketplace: shipmentData?.marketplace || 'Amazon',
        account: shipmentData?.account || 'TPS Nutrients',
        location: editableData.shipTo || '', // Use shipTo as location
        amazonShipmentNumber: editableData.amazonShipmentNumber,
        amazonRefId: editableData.amazonRefId,
        shipping: editableData.shipping,
        shipFrom: editableData.shipFrom,
        shipTo: editableData.shipTo,
        carrier: editableData.carrier,
      });
    }
    onClose();
  };

  const handleBookAndProceed = () => {
    // Validate that products have been added
    if (totalUnits === 0) {
      alert('Please add at least one product with quantity before booking the shipment.');
      return;
    }

    if (onSave) {
      // Parse shipment name back to separate name and type
      const parts = editableData.shipmentName.trim().split(' ');
      // If there are multiple parts, the last is the type and the rest is the name
      // If only one part, it's the name and we use the existing shipmentType
      const name = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
      const type = parts.length > 1 ? parts[parts.length - 1] : (shipmentData?.shipmentType || editableData.shipmentType || 'AWD');
      
      onSave({
        shipmentNumber: name, // Use shipmentNumber (backend expects this)
        shipmentDate: shipmentData?.shipmentDate || new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        shipmentType: type,
        marketplace: shipmentData?.marketplace || 'Amazon',
        account: shipmentData?.account || 'TPS Nutrients',
        location: editableData.shipTo || '', // Use shipTo as location
        amazonShipmentNumber: editableData.amazonShipmentNumber,
        amazonRefId: editableData.amazonRefId,
        shipping: editableData.shipping,
        shipFrom: editableData.shipFrom,
        shipTo: editableData.shipTo,
        carrier: editableData.carrier,
      });
    }
    onClose();
    if (onBookAndProceed) {
      onBookAndProceed();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        {/* Modal */}
      <div
        style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '8px',
          width: '520px',
            height: 'auto',
            border: '1px solid #E5E7EB',
          display: 'flex',
          flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 9999,
            position: 'relative',
            maxHeight: '90vh',
            overflow: 'hidden',
        }}
          onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#111827',
              margin: 0,
            }}>
            Shipment Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
                background: 'transparent',
              border: 'none',
                cursor: 'pointer',
                padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
                color: '#6B7280',
            }}
          >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
          </button>
        </div>

        {/* Content - scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
              padding: '16px 20px',
              scrollbarWidth: 'thin',
          }}
        >
            {/* Editable Shipment Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {/* Shipment Name */}
              <div>
                <label
              style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '4px',
              }}
            >
                  Shipment Name
                </label>
                <input
                  type="text"
                  value={editableData.shipmentName}
                  onChange={(e) => setEditableData({ ...editableData, shipmentName: e.target.value })}
                style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                  }}
                />
            </div>

              {/* Shipment Type */}
              <div>
                <label
                style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '4px',
                  }}
                >
                  Shipment Type<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <select
                  value={editableData.shipmentType}
                  onChange={(e) => setEditableData({ ...editableData, shipmentType: e.target.value })}
                        style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: editableData.shipmentType ? '#111827' : '#9CA3AF',
                    fontSize: '13px',
                    outline: 'none',
                          cursor: 'pointer',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    paddingRight: '32px',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                  }}
                >
                  <option value="">Select Shipment Type</option>
                  <option value="FBA">FBA</option>
                  <option value="AWD">AWD</option>
                  <option value="Parcel">Parcel</option>
                  <option value="Production Order">Production Order</option>
                </select>
                </div>

              {/* Amazon Shipment # */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '4px',
                  }}
                >
                  Amazon Shipment #<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="text"
                  value={editableData.amazonShipmentNumber}
                  onChange={(e) => setEditableData({ ...editableData, amazonShipmentNumber: e.target.value })}
                  placeholder={getAmazonShipmentFormat(editableData.shipmentType)}
                    style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                    }}
                  />
                </div>

              {/* Amazon Ref ID */}
              <div>
                <label
                    style={{
                    display: 'block',
                    fontSize: '12px',
                      fontWeight: 500,
                    color: '#374151',
                    marginBottom: '4px',
                    }}
                  >
                  Amazon Ref ID<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <input
                  type="text"
                  value={editableData.amazonRefId}
                  onChange={(e) => setEditableData({ ...editableData, amazonRefId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                  }}
                />
                  </div>

              {/* Shipping - Full Width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                    style={{
                    display: 'block',
                    fontSize: '12px',
                      fontWeight: 500,
                    color: '#374151',
                    marginBottom: '4px',
                    }}
                  >
                  Shipping
                </label>
                <select
                  value={editableData.shipping}
                  onChange={(e) => setEditableData({ ...editableData, shipping: e.target.value })}
                        style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    paddingRight: '32px',
                        }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                  }}
                      >
                  <option value="UPS">UPS</option>
                  <option value="FedEx">FedEx</option>
                  <option value="DHL">DHL</option>
                  <option value="USPS">USPS</option>
                  <option value="Other">Other</option>
                </select>
          </div>

              {/* Ship From - Full Width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label
              style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '4px',
              }}
            >
                  Ship From
                </label>
                <input
                  type="text"
                  value={editableData.shipFrom}
                  onChange={(e) => setEditableData({ ...editableData, shipFrom: e.target.value })}
                  placeholder="Enter Shipment Location"
                style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                  }}
                />
            </div>

              {/* Ship To - Full Width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '4px',
                  }}
                >
                  Ship To
                </label>
                <input
                  type="text"
                  value={editableData.shipTo}
                  onChange={(e) => setEditableData({ ...editableData, shipTo: e.target.value })}
                  placeholder="Enter Shipment Destination"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3B82F6';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                  }}
                />
                </div>

              {/* Carrier - Full Width */}
              <div style={{ gridColumn: '1 / -1', position: 'relative' }} ref={carrierDropdownRef}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '4px',
                  }}
                >
                  Carrier
                </label>
                <div
                  ref={carrierInputRef}
                  onClick={() => setIsCarrierDropdownOpen(!isCarrierDropdownOpen)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: editableData.carrier ? '#111827' : '#9CA3AF',
                    fontSize: '13px',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: '28px',
                  }}
                >
                  <span>{editableData.carrier || 'Select Carrier'}</span>
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 1L6 6L11 1" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                
                {isCarrierDropdownOpen && createPortal(
                  <div
                    ref={carrierDropdownRef}
                    style={{
                      position: 'fixed',
                      top: `${dropdownPosition.top}px`,
                      left: `${dropdownPosition.left}px`,
                      width: `${dropdownPosition.width}px`,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      zIndex: 10000,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Known Carriers */}
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #E5E7EB' }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#6B7280',
                        marginBottom: '6px',
                      }}>
                        Known Carriers:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {knownCarriers.map((carrier) => (
                          <div
                            key={carrier}
                            onClick={() => handleCarrierSelect(carrier)}
                            style={{
                              padding: '4px 6px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              color: '#111827',
                              fontSize: '12px',
                              transition: 'background-color 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#F3F4F6';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            {carrier}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Custom Entry */}
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #E5E7EB' }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#6B7280',
                        marginBottom: '6px',
                      }}>
                        Custom Entry:
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="text"
                          value={customCarrierInput}
                          onChange={(e) => setCustomCarrierInput(e.target.value)}
                          placeholder="Enter custom carrier name here..."
                          style={{
                            flex: 1,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #D1D5DB',
                            backgroundColor: '#FFFFFF',
                            color: '#111827',
                            fontSize: '12px',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#3B82F6';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#D1D5DB';
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUseCustomCarrier();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleUseCustomCarrier}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: '#9CA3AF',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#6B7280';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#9CA3AF';
                          }}
                        >
                          Use
                        </button>
                      </div>
                    </div>

                    {/* Create a Carrier */}
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: '#6B7280',
                        marginBottom: '6px',
                      }}>
                        Create a Carrier:
                      </div>
                      <div
                        onClick={handleAddNewCarrier}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          color: '#3B82F6',
                          fontSize: '12px',
                          padding: '2px 0',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 3V13M3 8H13" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Add new carrier to system</span>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
              padding: '12px 20px',
              borderTop: '1px solid #E5E7EB',
            display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              Cancel
            </button>
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={handleSaveAndExit}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#3B82F6',
                  fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
                Save and Exit
          </button>
          <button
            type="button"
                onClick={handleBookAndProceed}
            style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
              border: 'none',
                  backgroundColor: '#3B82F6',
              color: '#FFFFFF',
                  fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
            }}
          >
                Book and Proceed
          </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ShipmentDetailsModal;
