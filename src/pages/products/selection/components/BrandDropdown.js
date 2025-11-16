import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { useCompany } from '../../../../context/CompanyContext';

const BrandDropdown = ({ value, onChange, rowId, isNew }) => {
  const { isDarkMode } = useTheme();
  const { brands: companyBrands } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    hoverBg: isDarkMode ? 'hover:bg-dark-bg-primary' : 'hover:bg-gray-50',
    dropdownBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    selectedBg: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50',
    selectedText: isDarkMode ? 'text-blue-400' : 'text-blue-600',
  };

  // Get brand names from company brands
  const brands = companyBrands.map(b => b.name);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdownContent = document.getElementById(`brand-dropdown-${rowId}`);
      
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        dropdownContent &&
        !dropdownContent.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, rowId]);

  const handleSelect = (brand) => {
    onChange(rowId, brand);
    setIsOpen(false);
    setSearchTerm('');
  };

  const filteredBrands = brands.filter(brand =>
    brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-between rounded-md border ${themeClasses.bg} ${themeClasses.border} ${themeClasses.text} ${themeClasses.hoverBg} transition-all text-left ${isNew ? 'border-blue-500' : ''}`}
        style={{ 
          gap: '0.375rem',
          padding: '0.25rem 0.5rem',
          minWidth: '140px',
          width: '100%'
        }}
      >
        <span style={{ fontSize: '0.75rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || 'Select brand...'}
        </span>
        <svg
          className={`transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
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
          id={`brand-dropdown-${rowId}`}
          className={`fixed ${themeClasses.dropdownBg} ${themeClasses.border} border rounded-lg shadow-xl min-w-[200px] max-h-[300px] overflow-hidden flex flex-col`}
          style={{ 
            top: dropdownRef.current?.getBoundingClientRect().bottom + 4 + 'px',
            left: dropdownRef.current?.getBoundingClientRect().left + 'px',
            zIndex: 9999
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-b" style={{ borderColor: isDarkMode ? '#374151' : '#e5e7eb' }}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${themeClasses.bg} ${themeClasses.text} ${themeClasses.border} border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                style={{ paddingLeft: '2rem', paddingRight: '0.75rem', paddingTop: '0.375rem', paddingBottom: '0.375rem' }}
                onClick={(e) => e.stopPropagation()}
              />
              <svg
                className={`${themeClasses.textSecondary}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', width: '0.875rem', height: '0.875rem' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1">
            {filteredBrands.length > 0 ? (
              filteredBrands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => handleSelect(brand)}
                  className={`w-full flex items-center justify-between text-sm transition-colors text-left ${
                    value === brand
                      ? `${themeClasses.selectedBg} ${themeClasses.selectedText}`
                      : `${themeClasses.text} ${themeClasses.hoverBg}`
                  }`}
                  style={{ padding: '0.625rem 0.75rem', fontWeight: '500' }}
                >
                  <span>{brand}</span>
                  {value === brand && (
                    <svg style={{ width: '1rem', height: '1rem' }} fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))
            ) : (
              <div className={`text-center ${themeClasses.textSecondary} text-sm`} style={{ padding: '1.5rem' }}>
                No brands found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandDropdown;

