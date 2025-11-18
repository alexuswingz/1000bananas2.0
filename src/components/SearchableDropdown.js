import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const SearchableDropdown = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Select...', 
  disabled = false,
  label = '',
  style = {}
}) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get display value
  const displayValue = value || placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange({ target: { value: option } });
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchTerm('');
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    } else if (e.key === 'Enter' && filteredOptions.length === 1) {
      handleSelect(filteredOptions[0]);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', ...style }}>
      {label && (
        <label 
          className={`text-xs font-semibold ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'} mb-2`}
          style={{ display: 'block', textTransform: 'uppercase' }}
        >
          {label}
        </label>
      )}
      
      {/* Main input/button */}
      <div
        onClick={handleToggle}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
          color: disabled ? (isDarkMode ? '#64748b' : '#94a3b8') : (isDarkMode ? '#fff' : '#000'),
          border: `2px solid ${isOpen ? '#3b82f6' : (isDarkMode ? '#334155' : '#e2e8f0')}`,
          fontSize: '0.875rem',
          fontWeight: '500',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          transition: 'border-color 0.2s'
        }}
      >
        <span style={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          color: !value ? (isDarkMode ? '#64748b' : '#94a3b8') : (isDarkMode ? '#fff' : '#000'),
          flex: 1
        }}>
          {displayValue}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {value && !disabled && (
            <svg 
              onClick={(e) => {
                e.stopPropagation();
                onChange({ target: { value: '' } });
                setIsOpen(false);
              }}
              style={{ 
                width: '16px', 
                height: '16px',
                cursor: 'pointer',
                opacity: 0.6
              }} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <svg 
            style={{ 
              width: '16px', 
              height: '16px',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.25rem)',
            left: 0,
            right: 0,
            backgroundColor: isDarkMode ? '#1e293b' : '#fff',
            border: `2px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
            borderRadius: '0.5rem',
            boxShadow: isDarkMode 
              ? '0 10px 25px rgba(0, 0, 0, 0.3)' 
              : '0 10px 25px rgba(0, 0, 0, 0.1)',
            zIndex: 50,
            maxHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Search input */}
          <div style={{ padding: '0.5rem' }}>
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9',
                color: isDarkMode ? '#fff' : '#000',
                border: `1px solid ${isDarkMode ? '#334155' : '#cbd5e1'}`,
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Results count */}
          {searchTerm && (
            <div style={{
              padding: '0.5rem 1rem',
              borderBottom: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
              fontSize: '0.75rem',
              color: isDarkMode ? '#64748b' : '#94a3b8',
              fontWeight: '600'
            }}>
              {filteredOptions.length} result{filteredOptions.length !== 1 ? 's' : ''}
            </div>
          )}

          {/* Options list */}
          <div style={{ 
            overflowY: 'auto', 
            maxHeight: '240px',
            padding: '0.25rem'
          }}>
            {filteredOptions.length === 0 ? (
              <div style={{
                padding: '0.75rem 1rem',
                color: isDarkMode ? '#64748b' : '#94a3b8',
                fontSize: '0.875rem',
                textAlign: 'center'
              }}>
                {searchTerm ? 'No results found' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={index}
                  onClick={() => handleSelect(option)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    backgroundColor: value === option 
                      ? (isDarkMode ? '#334155' : '#e2e8f0')
                      : 'transparent',
                    color: isDarkMode ? '#fff' : '#000',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (value !== option) {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#1e293b' : '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (value !== option) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {option}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;

