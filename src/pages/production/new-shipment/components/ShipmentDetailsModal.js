import React, { useState, useEffect } from 'react';
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

  if (!isOpen) return null;

  const handleSaveAndExit = () => {
    if (onSave) {
      // Parse shipment name back to separate name and type
      const parts = editableData.shipmentName.split(' ');
      const name = parts.slice(0, -1).join(' ') || parts[0];
      const type = parts[parts.length - 1] || editableData.shipmentType;
      
      onSave({
        shipmentName: name,
        shipmentType: type || editableData.shipmentType,
        marketplace: shipmentData?.marketplace || 'Amazon',
        account: shipmentData?.account || 'TPS Nutrients',
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
    if (onSave) {
      // Parse shipment name back to separate name and type
      const parts = editableData.shipmentName.split(' ');
      const name = parts.slice(0, -1).join(' ') || parts[0];
      const type = parts[parts.length - 1] || editableData.shipmentType;
      
      onSave({
        shipmentName: name,
        shipmentType: type || editableData.shipmentType,
        marketplace: shipmentData?.marketplace || 'Amazon',
        account: shipmentData?.account || 'TPS Nutrients',
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
            borderRadius: '12px',
            width: '600px',
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
              padding: '24px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h2 style={{
              fontSize: '20px',
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
              padding: '24px',
              scrollbarWidth: 'thin',
            }}
          >
            {/* Editable Shipment Details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
              {/* Shipment Name */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '8px',
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
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  Shipment Type<span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>
                </label>
                <select
                  value={editableData.shipmentType}
                  onChange={(e) => setEditableData({ ...editableData, shipmentType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: editableData.shipmentType ? '#111827' : '#9CA3AF',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px',
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
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '8px',
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
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '8px',
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
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  Shipping
                </label>
                <select
                  value={editableData.shipping}
                  onChange={(e) => setEditableData({ ...editableData, shipping: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    paddingRight: '36px',
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
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '8px',
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
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '14px',
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
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '8px',
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
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '14px',
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
              <div style={{ gridColumn: '1 / -1' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  Carrier
                </label>
                <input
                  type="text"
                  value={editableData.carrier}
                  onChange={(e) => setEditableData({ ...editableData, carrier: e.target.value })}
                  placeholder="Enter Carrier"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                    fontSize: '14px',
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
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '24px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: '14px',
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
            <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={handleSaveAndExit}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#3B82F6',
                  fontSize: '14px',
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
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  fontSize: '14px',
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
