import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const DashboardHeader = ({ onSearch, onFilterClick, onSortClick, filterButtonRef }) => {
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <h1 className={`text-2xl font-bold ${themeClasses.text}`}>Dashboard</h1>
      </div>

      {/* Right side - Search, Filter, and Sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '600px' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
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

        {/* Filter Button */}
        <button
          ref={filterButtonRef}
          onClick={onFilterClick}
          className={`${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-xl transition-all shadow-sm hover:shadow-md`}
          style={{
            padding: '0.625rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter
        </button>

        {/* Sort Button */}
        <button
          onClick={onSortClick}
          className={`${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-xl transition-all shadow-sm hover:shadow-md`}
          style={{
            padding: '0.625rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
          </svg>
          Sort
        </button>
      </div>
    </div>
  );
};

export default DashboardHeader;

