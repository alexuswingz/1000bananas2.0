import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { useCompany } from '../../../../context/CompanyContext';

const StatusDropdown = ({ value, onChange, rowId, isNew }) => {
  const { isDarkMode } = useTheme();
  const { statusWorkflows } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    hoverBg: isDarkMode ? 'hover:bg-dark-bg-primary' : 'hover:bg-gray-50',
    dropdownBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
  };

  // Convert custom statuses to options format
  const statusOptions = (statusWorkflows || []).sort((a, b) => a.order - b.order).map(status => {
    const color = status.color || '#6B7280';
    return {
      value: status.id,
      label: status.name,
      color: color,
      bgColor: `${color}20`, // 20% opacity
      textColor: color,
      borderColor: `${color}40`, // 40% opacity
    };
  });

  const selectedOption = statusOptions.find(opt => opt.value === value) || statusOptions[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (status) => {
    onChange(rowId, status);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-between gap-1.5 rounded-md border hover:opacity-80 transition-all min-w-[120px] group ${isNew ? 'ring-2 ring-blue-500' : ''}`}
        style={{ 
          padding: '0.25rem 0.5rem',
          backgroundColor: selectedOption?.bgColor,
          borderColor: selectedOption?.borderColor,
          color: selectedOption?.textColor
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>{selectedOption?.label}</span>
        </div>
        <svg
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ width: '0.75rem', height: '0.75rem' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className={`fixed ${themeClasses.dropdownBg} ${themeClasses.border} border rounded-lg shadow-xl min-w-[160px] overflow-hidden`}
          style={{ 
            top: dropdownRef.current?.getBoundingClientRect().bottom + 4 + 'px',
            left: dropdownRef.current?.getBoundingClientRect().left + 'px',
            zIndex: 9999
          }}
        >
          {statusOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                value !== option.value ? themeClasses.hoverBg : ''
              }`}
              style={
                value === option.value
                  ? { backgroundColor: option.bgColor, color: option.textColor }
                  : { color: isDarkMode ? '#e5e7eb' : '#111827' }
              }
            >
              <span>{option.label}</span>
              {value === option.value && (
                <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
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
  );
};

export default StatusDropdown;

