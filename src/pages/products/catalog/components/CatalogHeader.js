import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const CatalogHeader = ({ onSearch, activeTab, onTabChange }) => {
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
    <div className="mb-6">
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        {/* Left side - Icon only (header title removed) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
            borderRadius: '12px'
          }}>
            <svg style={{ width: '28px', height: '28px' }} className={themeClasses.text} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>

        {/* Right side - Search and Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, justifyContent: 'flex-end' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '350px' }}>
            <input
              type="text"
              placeholder="Find a product..."
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

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            <button
              onClick={() => onTabChange('parent')}
              className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'parent'
                  ? 'bg-blue-600 text-white shadow-md'
                  : `${themeClasses.text} ${isDarkMode ? 'bg-dark-bg-tertiary hover:bg-dark-bg-primary' : 'bg-gray-100 hover:bg-gray-200'}`
              }`}
            >
              Parent
            </button>
            <button
              onClick={() => onTabChange('child')}
              className={`px-6 py-2 rounded-lg font-medium text-sm transition-all ${
                activeTab === 'child'
                  ? 'bg-blue-600 text-white shadow-md'
                  : `${themeClasses.text} ${isDarkMode ? 'bg-dark-bg-tertiary hover:bg-dark-bg-primary' : 'bg-gray-100 hover:bg-gray-200'}`
              }`}
            >
              Child
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogHeader;

