import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { formatLocationDisplay, addRecentLocation } from '../../../../utils/recentLocations';

const COUNTRY_OPTIONS = [
  '',
  'United States',
  'Canada',
  'Mexico',
  'United Kingdom',
  'Germany',
  'France',
  'Australia',
  'Japan',
  'China',
  'India',
  'Brazil',
  'Spain',
  'Italy',
  'Netherlands',
  'Other',
];

const AddLocationModal = ({ isOpen, onClose, onSave }) => {
  const { isDarkMode } = useTheme();
  const [name, setName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [extraAddressLines, setExtraAddressLines] = useState([]);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setAddressLine1('');
      setAddressLine2('');
      setExtraAddressLines([]);
      setCity('');
      setState('');
      setZip('');
      setCountry('');
    }
  }, [isOpen]);

  const buildAddress = () => {
    const parts = [
      addressLine1,
      addressLine2,
      ...extraAddressLines,
      [city, state, zip].filter(Boolean).join(', '),
      country,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handleSave = () => {
    const locationName = name.trim() || 'Unnamed Location';
    const address = buildAddress();
    const displayValue = formatLocationDisplay(locationName, address);
    addRecentLocation({ id: `loc_${Date.now()}`, name: locationName, address });
    onSave(displayValue, { name: locationName, address });
    onClose();
  };

  const addAddressLine = () => {
    setExtraAddressLines((prev) => [...prev, '']);
  };

  const setExtraLine = (index, value) => {
    setExtraAddressLines((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const canSave = Boolean(
    name.trim() &&
      addressLine1.trim() &&
      city.trim() &&
      state.trim() &&
      zip.trim() &&
      country
  );

  if (!isOpen) return null;

  const borderColor = isDarkMode ? '#334155' : '#D1D5DB';
  const inputBg = isDarkMode ? '#252F42' : '#FFFFFF';
  const inputText = isDarkMode ? '#FFFFFF' : '#111827';
  const placeholderColor = isDarkMode ? '#6B7280' : '#9CA3AF';
  const labelColor = isDarkMode ? '#E5E7EB' : '#374151';
  const modalBg = isDarkMode ? '#1A2235' : '#FFFFFF';
  const headerBorder = isDarkMode ? '#334155' : '#E5E7EB';
  const closeColor = isDarkMode ? '#9CA3AF' : '#6B7280';

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
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
    marginBottom: '4px',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='${encodeURIComponent(placeholderColor)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
    paddingRight: '32px',
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
          minHeight: '595px',
          maxHeight: '90vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: horizontal, 56px height, 12px top radius, bottom border, padding 16/24 */}
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
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: inputText,
            }}
          >
            Add New Location
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
              e.currentTarget.style.backgroundColor = isDarkMode ? '#334155' : '#F3F4F6';
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

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Location Name<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Warehouse A"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Address Line 1<span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              placeholder="Street Address"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '4px' }}>
            <label style={labelStyle}>Address Line 2 (Optional)</label>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              placeholder="Suite, Building, Floor, etc."
              style={inputStyle}
            />
            <div style={{ textAlign: 'right', marginTop: '6px' }}>
              <button
                type="button"
                onClick={addAddressLine}
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
                + Add Address Line
              </button>
            </div>
          </div>

          {extraAddressLines.length > 0 &&
            extraAddressLines.map((line, index) => (
              <div key={index} style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Address Line {index + 3} (Optional)</label>
                <input
                  type="text"
                  value={line}
                  onChange={(e) => setExtraLine(index, e.target.value)}
                  placeholder="Suite, Building, Floor, etc."
                  style={inputStyle}
                />
              </div>
            ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>
                City<span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                State<span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="State"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={labelStyle}>
                Zip / Postal Code<span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="Zip"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                Country<span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{
                  ...selectStyle,
                  color: country ? inputText : placeholderColor,
                }}
              >
                <option value="" disabled>
                  Select Country
                </option>
                {COUNTRY_OPTIONS.filter(Boolean).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer: dark blue-grey background, separator line, Cancel left / Save right */}
        <div
          style={{
            marginTop: 'auto',
            padding: '16px 20px',
            borderTop: `1px solid ${isDarkMode ? '#334155' : '#E5E7EB'}`,
            backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
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
              border: 'none',
              backgroundColor: isDarkMode ? '#334155' : '#E2E8F0',
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
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: canSave ? '#007AFF' : (isDarkMode ? '#374151' : '#94A3B8'),
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >
            Save Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLocationModal;
