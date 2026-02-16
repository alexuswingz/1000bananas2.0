import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { getRecentLocations, addRecentLocation, touchRecentLocation, formatLocationDisplay } from '../../../../utils/recentLocations';

/**
 * Location dropdown for Ship From / Ship To:
 * - Input with dropdown below showing up to 5 recent locations, filterable by typing (name or number).
 * - "Add New Location" button at bottom opens modal (handled by parent).
 */
const LocationSelect = ({ value, onChange, placeholder, onAddNewLocation, inputStyle: customInputStyle, theme }) => {
  const { isDarkMode } = useTheme();
  const dm = theme ? theme.inputBorder !== undefined : false;
  const isDark = dm ? (theme.inputBg === '#252F42') : isDarkMode;

  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [filter, setFilter] = useState('');
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const recentList = getRecentLocations();
  const query = (filter || '').toLowerCase().trim();
  const filtered = query
    ? recentList.filter((loc) => {
        const name = (loc.name || '').toLowerCase();
        const address = (loc.address || '').toLowerCase();
        const combined = `${name} ${address}`;
        const hasNumber = /\d/.test(query) && /\d/.test(combined);
        const matchesName = name.includes(query) || address.includes(query) || combined.includes(query);
        return matchesName || (hasNumber && combined.replace(/\s/g, '').includes(query.replace(/\s/g, '')));
      })
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

  const handleSelect = (loc) => {
    const display = formatLocationDisplay(loc.name, loc.address);
    onChange(display);
    touchRecentLocation(loc);
    setIsOpen(false);
    setFilter('');
  };

  const handleAddNew = () => {
    setIsOpen(false);
    setFilter('');
    onAddNewLocation?.();
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
                  Recent locations
                </div>
                {showList.map((loc) => {
                  const display = formatLocationDisplay(loc.name, loc.address);
                  return (
                    <div
                      key={loc.id}
                      onClick={() => handleSelect(loc)}
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
                      <div style={{ fontWeight: 500 }}>{loc.name || 'Unnamed'}</div>
                      {loc.address ? (
                        <div style={{ fontSize: '12px', color: isDark ? '#9CA3AF' : '#6B7280', marginTop: '2px' }}>
                          {loc.address}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
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
              <span>+ Add New Location</span>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default LocationSelect;
