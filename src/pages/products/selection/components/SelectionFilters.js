import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const SelectionFilters = ({ onSearch, onNewProduct, onBulkUpload, hasUnsavedRow }) => {
  const { isDarkMode } = useTheme();
  const [searchValue, setSearchValue] = useState('');

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  const handleClear = () => {
    setSearchValue('');
    onSearch && onSearch('');
  };

  const handleSearchChange = (e) => {
    setSearchValue(e.target.value);
    onSearch && onSearch(e.target.value);
  };

  return (
    <div 
      className="mb-6"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap'
      }}
    >
      {/* Left side - Logo and Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '200px' }}>
        <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/assets/logo.png" alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
        </div>
        <h1 className={`text-2xl font-bold ${themeClasses.text}`}>New Selection</h1>
      </div>

      {/* Right side - Search and New Product Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: '1', minWidth: '300px', justifyContent: 'flex-end' }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Find a shipment..."
            value={searchValue}
            onChange={handleSearchChange}
            className={`${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm`}
            style={{
              paddingLeft: '2.75rem',
              paddingRight: searchValue ? '2.5rem' : '1rem',
              paddingTop: '0.625rem',
              paddingBottom: '0.625rem',
              width: '100%'
            }}
          />
          <svg
            className={`${themeClasses.textSecondary}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{
              position: 'absolute',
              left: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '1rem',
              height: '1rem'
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {/* Clear button */}
          {searchValue && (
            <button
              onClick={handleClear}
              className={`${themeClasses.textSecondary} transition-colors hover:bg-gray-100 dark:hover:bg-gray-700`}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '0.25rem',
                borderRadius: '9999px'
              }}
            >
              <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

            {/* Bulk Upload Button */}
        <button
          onClick={onBulkUpload}
          className={`text-sm font-semibold transition-all border shadow-sm rounded-xl ${
            isDarkMode ? 'bg-dark-bg-tertiary hover:bg-dark-bg-primary border-dark-border-primary' : 'bg-white hover:bg-gray-50 border-gray-300'
          } ${themeClasses.text} hover:shadow-md`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            whiteSpace: 'nowrap'
          }}
          title="Import products from CSV"
        >
          <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span>Bulk Upload</span>
        </button>

        {/* New Product Button */}
        <button
          onClick={onNewProduct}
          disabled={hasUnsavedRow}
          className={`text-sm font-semibold transition-all border shadow-sm rounded-xl ${
            hasUnsavedRow
              ? 'bg-gray-400 border-gray-400 text-gray-200 cursor-not-allowed opacity-50'
              : `${isDarkMode ? 'bg-dark-bg-tertiary hover:bg-dark-bg-primary border-dark-border-primary' : 'bg-[#2C3544] hover:bg-[#232935] border-[#2C3544]'} text-white hover:shadow-md`
          }`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1.25rem',
            whiteSpace: 'nowrap'
          }}
          title={hasUnsavedRow ? 'Please save or cancel the current row before adding a new one' : 'Add new product'}
        >
          <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Product</span>
        </button>
      </div>
    </div>
  );
};

export default SelectionFilters;

