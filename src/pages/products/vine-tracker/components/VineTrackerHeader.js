import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const VineTrackerHeader = ({ onSearch, onNewVineClick }) => {
  const { isDarkMode } = useTheme();
  const [searchValue, setSearchValue] = useState('');

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch && onSearch(value);
  };

  const handleClearSearch = () => {
    setSearchValue('');
    onSearch && onSearch('');
  };

  return (
    <div
      className={`${themeClasses.cardBg} ${themeClasses.border} border-b`}
      style={{
        padding: '1rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}
    >
      {/* Left: icon + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '9999px',
            backgroundColor: '#111827',
          }}
        >
          <img
            src="/assets/box.png"
            alt="Vine Tracker"
            style={{
              width: '22px',
              height: '22px',
              objectFit: 'contain',
            }}
            onError={(e) => {
              // Fallback if image doesn't load
              e.target.style.display = 'none';
            }}
          />
        </div>
        <h1 className={`text-xl font-semibold ${themeClasses.text}`}>Vine Tracker</h1>
      </div>

      {/* Right: search + filter + primary button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          width: '100%',
          maxWidth: '520px',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={handleSearchChange}
            className={`${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all`}
            style={{
              width: '100%',
              paddingLeft: '2.5rem',
              paddingRight: searchValue ? '2.5rem' : '1rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              borderRadius: '8px',
              boxSizing: 'border-box',
            }}
          />
          <svg
            className={themeClasses.textSecondary}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{
              position: 'absolute',
              left: '0.9rem',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '1rem',
              height: '1rem',
              pointerEvents: 'none',
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchValue && (
            <button
              type="button"
              onClick={handleClearSearch}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#9CA3AF';
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6B7280"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter icon */}
        <button
          type="button"
          style={{
            padding: '0.5rem',
            borderRadius: '8px',
            border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </button>

        {/* New Vine button */}
        <button
          className="bg-[#111827] text-white text-sm font-medium hover:bg-black transition-colors"
          style={{ padding: '0.55rem 1.25rem', whiteSpace: 'nowrap', borderRadius: '8px' }}
          onClick={onNewVineClick}
        >
          + New Vine
        </button>
      </div>
    </div>
  );
};

export default VineTrackerHeader;

