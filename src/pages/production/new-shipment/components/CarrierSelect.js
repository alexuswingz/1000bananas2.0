import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { getRecentCarriers, touchRecentCarrier } from '../../../../utils/recentCarriers';

/**
 * Carrier dropdown for Book Shipment:
 * - Input with dropdown below showing up to 5 recent carriers, filterable by typing name.
 * - "Add New Carrier" button at bottom opens modal (handled by parent).
 */
const CarrierSelect = ({ value, onChange, placeholder, onAddNewCarrier, inputStyle: customInputStyle, theme }) => {
  const { isDarkMode } = useTheme();
  const dm = theme && theme.inputBorder !== undefined;
  const isDark = dm ? (theme.inputBg === '#252F42') : isDarkMode;

  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [filter, setFilter] = useState('');
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const recentList = getRecentCarriers();
  const query = (filter || '').toLowerCase().trim();
  const filtered = query
    ? recentList.filter((c) => (c.name || '').toLowerCase().includes(query))
    : recentList;
  const showList = filtered.slice(0, 5);

  useEffect(() => {
    if (!isOpen || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 280),
    });
  }, [isOpen, showList.length]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!isOpen) return;
      const inInput = inputRef.current?.contains(e.target);
      const inDropdown = dropdownRef.current?.contains(e.target);
      if (!inInput && !inDropdown) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (carrier) => {
    const name = carrier.name || '';
    onChange(name);
    touchRecentCarrier(name);
    setIsOpen(false);
    setFilter('');
  };

  const handleAddNew = () => {
    setIsOpen(false);
    setFilter('');
    onAddNewCarrier?.();
  };

  const baseInputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: `1px solid ${isOpen ? '#3B82F6' : (isDark ? '#374151' : '#E5E7EB')}`,
    backgroundColor: isDark ? '#374151' : '#FFFFFF',
    color: isDark ? '#FFFFFF' : '#111827',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  };
  const inputStyle = customInputStyle ? { ...baseInputStyle, ...customInputStyle } : baseInputStyle;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          setFilter(v);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          setFilter(value || '');
        }}
        placeholder={placeholder}
        style={inputStyle}
        onBlur={(e) => {
          e.target.style.borderColor = isDark ? '#374151' : '#E5E7EB';
        }}
      />
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              maxHeight: '240px',
              overflow: 'auto',
              backgroundColor: isDark ? '#374151' : '#FFFFFF',
              border: `1px solid ${isDark ? '#4B5563' : '#E5E7EB'}`,
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              zIndex: 10001,
            }}
          >
            {showList.length > 0 && (
              <div style={{ padding: '6px 0', borderBottom: `1px solid ${isDark ? '#4B5563' : '#E5E7EB'}` }}>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: isDark ? '#9CA3AF' : '#6B7280',
                    padding: '4px 12px 8px',
                  }}
                >
                  Recent carriers
                </div>
                {showList.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: isDark ? '#E5E7EB' : '#111827',
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDark ? '#4B5563' : '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {c.name || 'Unnamed'}
                  </div>
                ))}
              </div>
            )}
            <div
              onClick={handleAddNew}
              style={{
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                color: '#3B82F6',
                fontSize: '13px',
                fontWeight: 500,
                borderTop: `1px solid ${isDark ? '#4B5563' : '#E5E7EB'}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDark ? '#4B5563' : '#EFF6FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>+ Add New Carrier</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default CarrierSelect;
