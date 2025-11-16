import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const DesignHeader = ({ onSearch }) => {
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </div>
        <h1 className={`text-2xl font-bold ${themeClasses.text}`}>Design Dashboard</h1>
      </div>

      {/* Right side - Search */}
      <div style={{ position: 'relative', flex: 1, maxWidth: '400px', minWidth: '250px' }}>
        <input
          type="text"
          placeholder="Search products..."
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
    </div>
  );
};

export default DesignHeader;


