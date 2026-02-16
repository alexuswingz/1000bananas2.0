import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { addRecentCarrier } from '../../../../utils/recentCarriers';

const SERVICE_TYPE_OPTIONS = [
  '',
  'LTL',
  'FTL',
  'Parcel',
  'Expedited',
  'White Glove',
  'Other',
];

const AddCarrierModal = ({ isOpen, onClose, onSave }) => {
  const { isDarkMode } = useTheme();
  const [name, setName] = useState('');
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [notes, setNotes] = useState('');
  const [additionalContacts, setAdditionalContacts] = useState([]); // [{ contactName, phone, email }]

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPrimaryContactName('');
      setPhone('');
      setEmail('');
      setServiceType('');
      setNotes('');
      setAdditionalContacts([]);
    }
  }, [isOpen]);

  const handleSave = () => {
    const carrierName = name.trim();
    if (!carrierName) return;
    addRecentCarrier({ id: `carrier_${Date.now()}`, name: carrierName });
    onSave(carrierName);
    onClose();
  };

  const addAdditionalContact = () => {
    setAdditionalContacts((prev) => [...prev, { contactName: '', phone: '', email: '' }]);
  };

  const setAdditionalContactField = (index, field, value) => {
    setAdditionalContacts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const canSave = Boolean(
    name.trim() &&
      primaryContactName.trim() &&
      phone.trim() &&
      email.trim() &&
      serviceType
  );

  if (!isOpen) return null;

  const modalBg = isDarkMode ? '#232A3B' : '#FFFFFF';
  const inputBg = isDarkMode ? '#374052' : '#F9FAFB';
  const borderColor = isDarkMode ? '#4D5769' : '#D1D5DB';
  const inputText = isDarkMode ? '#FFFFFF' : '#111827';
  const labelColor = isDarkMode ? '#E5E7EB' : '#374151';
  const headerBorder = isDarkMode ? '#334155' : '#E5E7EB';
  const closeColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const placeholderColor = isDarkMode ? '#6B7280' : '#9CA3AF';

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: `1px solid ${borderColor}`,
    backgroundColor: inputBg,
    color: inputText,
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: labelColor,
    marginBottom: '6px',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='${encodeURIComponent(placeholderColor)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '36px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 10002,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: modalBg,
          borderRadius: '12px',
          border: `1px solid ${headerBorder}`,
          width: '600px',
          minHeight: '591px',
          maxHeight: '90vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            minHeight: '56px',
            padding: '16px 24px',
            borderBottom: `1px solid ${headerBorder}`,
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: inputText }}>
            Add New Carrier
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '32px',
              height: '32px',
              padding: 0,
              border: 'none',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              color: closeColor,
              fontSize: '20px',
              lineHeight: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#374052' : '#F3F4F6';
              e.currentTarget.style.color = inputText;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = closeColor;
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Carrier Name<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. WeShip, FedEx"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Primary Contact Name<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={primaryContactName}
              onChange={(e) => setPrimaryContactName(e.target.value)}
              placeholder="Enter Contact Name"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
            <div>
              <label style={labelStyle}>
                Phone Number<span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter Phone Number"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                Email<span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px', textAlign: 'right' }}>
            <button
              type="button"
              onClick={addAdditionalContact}
              style={{
                border: 'none',
                background: 'none',
                color: '#3B82F6',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              + Add Additional Contact Option
            </button>
          </div>

          {additionalContacts.map((contact, index) => (
            <div
              key={index}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div>
                <label style={labelStyle}>Contact Name</label>
                <input
                  type="text"
                  value={contact.contactName}
                  onChange={(e) => setAdditionalContactField(index, 'contactName', e.target.value)}
                  placeholder="Name"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input
                  type="text"
                  value={contact.phone}
                  onChange={(e) => setAdditionalContactField(index, 'phone', e.target.value)}
                  placeholder="Phone"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setAdditionalContactField(index, 'email', e.target.value)}
                  placeholder="Email"
                  style={inputStyle}
                />
              </div>
            </div>
          ))}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Service Type<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              style={{
                ...selectStyle,
                color: serviceType ? inputText : placeholderColor,
              }}
            >
              <option value="" disabled>
                Select Service Type
              </option>
              {SERVICE_TYPE_OPTIONS.filter(Boolean).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '0' }}>
            <label style={labelStyle}>Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this carrier..."
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '80px',
              }}
            />
          </div>
        </div>

        {/* Footer: dark charcoal, Cancel left (grey), Save Carrier right (blue) */}
        <div
          style={{
            marginTop: 'auto',
            padding: '16px 24px',
            borderTop: `1px solid ${isDarkMode ? '#2D3548' : '#E5E7EB'}`,
            backgroundColor: isDarkMode ? '#1E232E' : '#F8FAFC',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: `1px solid ${isDarkMode ? '#4A5568' : '#D1D5DB'}`,
              backgroundColor: isDarkMode ? '#3F4755' : '#E2E8F0',
              color: isDarkMode ? '#E5E7EB' : '#475569',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: canSave ? '#007AFF' : (isDarkMode ? '#374151' : '#94A3B8'),
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >
            Save Carrier
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCarrierModal;
