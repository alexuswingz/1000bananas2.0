import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const FilterDrawer = ({ isOpen, onClose, onApply, filters, setFilters, buttonRef }) => {
  const { isDarkMode } = useTheme();
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  const [expandedSections, setExpandedSections] = useState({});

  React.useEffect(() => {
    if (isOpen && buttonRef?.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 370;
      const dropdownMaxHeight = window.innerHeight * 0.8; // 80vh
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate horizontal position
      let left = rect.left;
      // If dropdown would go off right edge, align to right edge of button
      if (left + dropdownWidth > viewportWidth) {
        left = rect.right - dropdownWidth;
      }
      // If still off screen, align to right edge of viewport with padding
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 16;
      }
      // Don't go off left edge
      if (left < 16) {
        left = 16;
      }
      
      // Calculate vertical position
      let top = rect.bottom + 8;
      // If dropdown would go off bottom, position above button instead
      if (top + dropdownMaxHeight > viewportHeight) {
        top = rect.top - dropdownMaxHeight - 8;
        // If still off screen, align to bottom with padding
        if (top < 16) {
          top = 16;
        }
      }
      
      setPosition({ top, left });
    }
  }, [isOpen, buttonRef]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleClearAll = () => {
    setFilters({
      sellerAccount: '',
      country: '',
      brandName: '',
      productType: '',
      size: '',
      descriptors: '',
      formula: ''
    });
  };

  const handleApply = () => {
    onApply();
    onClose();
  };

  if (!isOpen) return null;

  const filterOptions = {
    sellerAccount: ['All', 'TPS Nutrients', 'Green Earth Co', 'Garden Masters'],
    country: ['All', 'U.S.', 'Canada', 'UK', 'Australia'],
    brandName: ['All', 'TPS Plant Foods', 'Nature\'s Choice', 'ProGrow'],
    productType: ['All', 'Fertilizer', 'Pesticide', 'Plant Food', 'Soil Amendment'],
    size: ['All', '8oz', 'Quart', 'Gallon', '5 Gallon'],
    descriptors: ['All', 'Organic', 'Natural', 'Premium', 'Professional'],
    formula: ['All', 'Liquid', 'Powder', 'Granular', 'Tablet']
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0"
        onClick={onClose}
        style={{ 
          display: isOpen ? 'block' : 'none',
          zIndex: 9998
        }}
      />

      {/* Floating Filter Dropdown */}
      <div 
        className={`fixed ${themeClasses.cardBg} border-2 ${themeClasses.border} rounded-xl shadow-2xl`}
        style={{
          width: '370px',
          maxHeight: 'calc(80vh - 32px)',
          overflowY: 'auto',
          top: `${position.top}px`,
          left: `${position.left}px`,
          display: isOpen ? 'block' : 'none',
          zIndex: 9999
        }}
      >
        <div style={{ padding: '1.5rem' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 className={`text-lg font-bold ${themeClasses.text}`}>Filters</h2>
            <button
              onClick={onClose}
              className={`${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors`}
            >
              <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filter Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Seller Account */}
            <div className={`border ${themeClasses.border} rounded-lg overflow-hidden`}>
              <button
                onClick={() => toggleSection('sellerAccount')}
                className={`w-full px-4 py-3 flex items-center justify-between ${themeClasses.bg} hover:opacity-80 transition-opacity`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} className={themeClasses.text} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className={`font-medium ${themeClasses.text}`}>Seller Account</span>
                </div>
                <svg
                  style={{ width: '1.25rem', height: '1.25rem', transform: expandedSections.sellerAccount ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  className={themeClasses.textSecondary}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.sellerAccount && (
                <div className={`px-4 py-3 border-t ${themeClasses.border}`}>
                  <select
                    value={filters.sellerAccount}
                    onChange={(e) => handleFilterChange('sellerAccount', e.target.value)}
                    className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.bg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    {filterOptions.sellerAccount.map(option => (
                      <option key={option} value={option === 'All' ? '' : option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Country */}
            <div className={`border ${themeClasses.border} rounded-lg overflow-hidden`}>
              <button
                onClick={() => toggleSection('country')}
                className={`w-full px-4 py-3 flex items-center justify-between ${themeClasses.bg} hover:opacity-80 transition-opacity`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} className={themeClasses.text} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`font-medium ${themeClasses.text}`}>Country</span>
                </div>
                <svg
                  style={{ width: '1.25rem', height: '1.25rem', transform: expandedSections.country ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  className={themeClasses.textSecondary}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.country && (
                <div className={`px-4 py-3 border-t ${themeClasses.border}`}>
                  <select
                    value={filters.country}
                    onChange={(e) => handleFilterChange('country', e.target.value)}
                    className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.bg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    {filterOptions.country.map(option => (
                      <option key={option} value={option === 'All' ? '' : option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Brand Name */}
            <div className={`border ${themeClasses.border} rounded-lg overflow-hidden`}>
              <button
                onClick={() => toggleSection('brandName')}
                className={`w-full px-4 py-3 flex items-center justify-between ${themeClasses.bg} hover:opacity-80 transition-opacity`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} className={themeClasses.text} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className={`font-medium ${themeClasses.text}`}>Brand Name</span>
                </div>
                <svg
                  style={{ width: '1.25rem', height: '1.25rem', transform: expandedSections.brandName ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  className={themeClasses.textSecondary}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.brandName && (
                <div className={`px-4 py-3 border-t ${themeClasses.border}`}>
                  <select
                    value={filters.brandName}
                    onChange={(e) => handleFilterChange('brandName', e.target.value)}
                    className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.bg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    {filterOptions.brandName.map(option => (
                      <option key={option} value={option === 'All' ? '' : option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Product Type */}
            <div className={`border ${themeClasses.border} rounded-lg overflow-hidden`}>
              <button
                onClick={() => toggleSection('productType')}
                className={`w-full px-4 py-3 flex items-center justify-between ${themeClasses.bg} hover:opacity-80 transition-opacity`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} className={themeClasses.text} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className={`font-medium ${themeClasses.text}`}>Product Type</span>
                </div>
                <svg
                  style={{ width: '1.25rem', height: '1.25rem', transform: expandedSections.productType ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  className={themeClasses.textSecondary}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.productType && (
                <div className={`px-4 py-3 border-t ${themeClasses.border}`}>
                  <select
                    value={filters.productType}
                    onChange={(e) => handleFilterChange('productType', e.target.value)}
                    className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.bg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    {filterOptions.productType.map(option => (
                      <option key={option} value={option === 'All' ? '' : option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Size */}
            <div className={`border ${themeClasses.border} rounded-lg overflow-hidden`}>
              <button
                onClick={() => toggleSection('size')}
                className={`w-full px-4 py-3 flex items-center justify-between ${themeClasses.bg} hover:opacity-80 transition-opacity`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} className={themeClasses.text} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className={`font-medium ${themeClasses.text}`}>Size</span>
                </div>
                <svg
                  style={{ width: '1.25rem', height: '1.25rem', transform: expandedSections.size ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  className={themeClasses.textSecondary}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.size && (
                <div className={`px-4 py-3 border-t ${themeClasses.border}`}>
                  <select
                    value={filters.size}
                    onChange={(e) => handleFilterChange('size', e.target.value)}
                    className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.bg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    {filterOptions.size.map(option => (
                      <option key={option} value={option === 'All' ? '' : option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Descriptors */}
            <div className={`border ${themeClasses.border} rounded-lg overflow-hidden`}>
              <button
                onClick={() => toggleSection('descriptors')}
                className={`w-full px-4 py-3 flex items-center justify-between ${themeClasses.bg} hover:opacity-80 transition-opacity`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} className={themeClasses.text} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className={`font-medium ${themeClasses.text}`}>Descriptors</span>
                </div>
                <svg
                  style={{ width: '1.25rem', height: '1.25rem', transform: expandedSections.descriptors ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  className={themeClasses.textSecondary}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.descriptors && (
                <div className={`px-4 py-3 border-t ${themeClasses.border}`}>
                  <select
                    value={filters.descriptors}
                    onChange={(e) => handleFilterChange('descriptors', e.target.value)}
                    className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.bg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    {filterOptions.descriptors.map(option => (
                      <option key={option} value={option === 'All' ? '' : option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Formula */}
            <div className={`border ${themeClasses.border} rounded-lg overflow-hidden`}>
              <button
                onClick={() => toggleSection('formula')}
                className={`w-full px-4 py-3 flex items-center justify-between ${themeClasses.bg} hover:opacity-80 transition-opacity`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <svg style={{ width: '1.25rem', height: '1.25rem' }} className={themeClasses.text} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <span className={`font-medium ${themeClasses.text}`}>Formula</span>
                </div>
                <svg
                  style={{ width: '1.25rem', height: '1.25rem', transform: expandedSections.formula ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  className={themeClasses.textSecondary}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.formula && (
                <div className={`px-4 py-3 border-t ${themeClasses.border}`}>
                  <select
                    value={filters.formula}
                    onChange={(e) => handleFilterChange('formula', e.target.value)}
                    className={`w-full px-3 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.bg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    {filterOptions.formula.map(option => (
                      <option key={option} value={option === 'All' ? '' : option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}` }}>
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Apply
            </button>
            <button
              onClick={handleClearAll}
              className={`flex-1 px-4 py-2.5 border ${themeClasses.border} ${themeClasses.text} hover:${themeClasses.bg} rounded-lg font-medium transition-colors`}
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterDrawer;

