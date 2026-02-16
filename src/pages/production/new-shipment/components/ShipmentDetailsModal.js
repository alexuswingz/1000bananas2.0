import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import LocationSelect from './LocationSelect';
import AddLocationModal from './AddLocationModal';
import CarrierSelect from './CarrierSelect';
import AddCarrierModal from './AddCarrierModal';

const ShipmentDetailsModal = ({ isOpen, onClose, shipmentData, totalUnits = 0, totalBoxes = 0, onSave, onBookAndProceed }) => {
  const { isDarkMode } = useTheme();

  const theme = {
    modalBg: isDarkMode ? '#1A2235' : '#FFFFFF',
    modalBorder: isDarkMode ? '#334155' : '#E5E7EB',
    headerBorder: isDarkMode ? '#334155' : '#E5E7EB',
    titleColor: isDarkMode ? '#FFFFFF' : '#111827',
    closeBtnColor: isDarkMode ? '#9CA3AF' : '#6B7280',
    labelColor: isDarkMode ? '#E5E7EB' : '#374151',
    inputBg: isDarkMode ? '#252F42' : '#FFFFFF',
    inputBorder: isDarkMode ? '#334155' : '#D1D5DB',
    inputText: isDarkMode ? '#FFFFFF' : '#111827',
    inputPlaceholder: isDarkMode ? '#6B7280' : '#9CA3AF',
    focusBorder: '#3B82F6',
    dropdownBg: isDarkMode ? '#252F42' : '#FFFFFF',
    dropdownBorder: isDarkMode ? '#334155' : '#E5E7EB',
    dropdownText: isDarkMode ? '#E5E7EB' : '#111827',
    dropdownMuted: isDarkMode ? '#9CA3AF' : '#6B7280',
    dropdownHover: isDarkMode ? '#334155' : '#F3F4F6',
    cancelBg: isDarkMode ? '#252F42' : '#FFFFFF',
    cancelBorder: isDarkMode ? '#334155' : '#D1D5DB',
    cancelText: isDarkMode ? '#E5E7EB' : '#374151',
    cancelHover: isDarkMode ? '#334155' : '#F9FAFB',
    saveBg: '#3B82F6',
    saveHover: '#2563EB',
    carrierArrow: isDarkMode ? '#9CA3AF' : '#374151',
  };

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
  const [addLocationForField, setAddLocationForField] = useState(null); // 'shipFrom' | 'shipTo'
  const [isAddCarrierOpen, setIsAddCarrierOpen] = useState(false);

  // Get Amazon Shipment # format based on shipment type
  const getAmazonShipmentFormat = (type) => {
    if (type === 'FBA' || type === 'Parcel') {
      return 'FBAXXXXXXXXX';
    } else if (type === 'AWD') {
      return 'STAR-XXXXXXXXXXXXX';
    }
    return 'Select shipment type first'; // When no type is selected
  };

  // Update editable data when shipmentData changes
  useEffect(() => {
    if (shipmentData) {
      const shipmentName = shipmentData.shipmentName || shipmentData.shipmentNumber || '2025.11.18';
      const shipmentType = shipmentData.shipmentType || '';
      const format = getAmazonShipmentFormat(shipmentType);
      setEditableData({
        shipmentName: shipmentType ? `${shipmentName} ${shipmentType}`.trim() : shipmentName,
        shipmentType: shipmentType || '',
        amazonShipmentNumber: format,
        amazonRefId: 'XXXXXXXX',
        shipping: 'UPS',
        shipFrom: shipmentData.shipFrom || '',
        shipTo: shipmentData.shipTo || '',
        carrier: shipmentData.carrier || '',
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

  if (!isOpen) return null;

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
      const type = parts.length > 1 ? parts[parts.length - 1] : (shipmentData?.shipmentType || editableData.shipmentType || '');
      
      const updatedData = {
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
      };
      
      onSave(updatedData);
      
      // Pass the updated data to onBookAndProceed so it doesn't have to wait for state update
      if (onBookAndProceed) {
        onBookAndProceed(updatedData);
      }
    }
    onClose();
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
            backgroundColor: theme.modalBg,
            borderRadius: '8px',
          width: '520px',
            height: 'auto',
            border: `1px solid ${theme.modalBorder}`,
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
              borderBottom: `1px solid ${theme.headerBorder}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: theme.titleColor,
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
                color: theme.closeBtnColor,
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
                    color: theme.labelColor,
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
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                }}
                  onFocus={(e) => {
                    e.target.style.borderColor = theme.focusBorder;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = theme.inputBorder;
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
                    color: theme.labelColor,
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
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: editableData.shipmentType ? theme.inputText : theme.inputPlaceholder,
                    fontSize: '13px',
                    outline: 'none',
                          cursor: 'pointer',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='${encodeURIComponent(theme.carrierArrow)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    paddingRight: '32px',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = theme.focusBorder;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = theme.inputBorder;
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
                    color: theme.labelColor,
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
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = theme.focusBorder;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = theme.inputBorder;
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
                    color: theme.labelColor,
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
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = theme.focusBorder;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = theme.inputBorder;
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
                    color: theme.labelColor,
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
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                    fontSize: '13px',
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='${encodeURIComponent(theme.carrierArrow)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    paddingRight: '32px',
                        }}
                  onFocus={(e) => {
                    e.target.style.borderColor = theme.focusBorder;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = theme.inputBorder;
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
                    color: theme.labelColor,
                    marginBottom: '4px',
                  }}
                >
                  Ship From<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <LocationSelect
                  value={editableData.shipFrom}
                  onChange={(v) => setEditableData((prev) => ({ ...prev, shipFrom: v }))}
                  placeholder="Enter or select location..."
                  onAddNewLocation={() => setAddLocationForField('shipFrom')}
                  inputStyle={{
                    padding: '6px 10px',
                    fontSize: '13px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                  }}
                  theme={theme}
                />
              </div>

              {/* Ship To - Full Width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: theme.labelColor,
                    marginBottom: '4px',
                  }}
                >
                  Ship To<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <LocationSelect
                  value={editableData.shipTo}
                  onChange={(v) => setEditableData((prev) => ({ ...prev, shipTo: v }))}
                  placeholder="Enter or select destination..."
                  onAddNewLocation={() => setAddLocationForField('shipTo')}
                  inputStyle={{
                    padding: '6px 10px',
                    fontSize: '13px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                  }}
                  theme={theme}
                />
              </div>

              {/* Carrier - Full Width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: theme.labelColor,
                    marginBottom: '4px',
                  }}
                >
                  Carrier<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <CarrierSelect
                  value={editableData.carrier}
                  onChange={(v) => setEditableData((prev) => ({ ...prev, carrier: v }))}
                  placeholder="Enter or select carrier..."
                  onAddNewCarrier={() => setIsAddCarrierOpen(true)}
                  inputStyle={{
                    padding: '6px 10px',
                    fontSize: '13px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                  }}
                  theme={theme}
                />
              </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
              padding: '12px 20px',
              borderTop: `1px solid ${theme.headerBorder}`,
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
                border: `1px solid ${theme.cancelBorder}`,
                backgroundColor: theme.cancelBg,
                color: theme.cancelText,
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.cancelHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.cancelBg;
              }}
            >
              Cancel
            </button>
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          <button
            type="button"
                onClick={handleBookAndProceed}
            style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
              border: 'none',
                  backgroundColor: theme.saveBg,
              color: '#FFFFFF',
                  fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.saveHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.saveBg;
            }}
          >
                Save Changes
          </button>
            </div>
          </div>
        </div>
      </div>

      <AddLocationModal
        isOpen={addLocationForField !== null}
        onClose={() => setAddLocationForField(null)}
        onSave={(displayValue) => {
          if (addLocationForField === 'shipFrom') {
            setEditableData((prev) => ({ ...prev, shipFrom: displayValue }));
          } else if (addLocationForField === 'shipTo') {
            setEditableData((prev) => ({ ...prev, shipTo: displayValue }));
          }
          setAddLocationForField(null);
        }}
      />

      <AddCarrierModal
        isOpen={isAddCarrierOpen}
        onClose={() => setIsAddCarrierOpen(false)}
        onSave={(carrierName) => {
          setEditableData((prev) => ({ ...prev, carrier: carrierName }));
          setIsAddCarrierOpen(false);
        }}
      />
    </>
  );
};

export default ShipmentDetailsModal;
