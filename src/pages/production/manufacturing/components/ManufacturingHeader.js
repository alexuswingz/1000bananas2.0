import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ManufacturingHeader = ({ activeTab, onTabChange, onSearch, onSortClick, isSortMode = false }) => {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  const tabs = [
    { id: 'active', label: 'Current List' },
    { id: 'archive', label: 'Archive' },
  ];

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (onSearch) {
      onSearch(value);
    }
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
      {/* Left: icon + title + tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Icon + title */}
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
            <svg
              style={{ width: '22px', height: '22px', color: 'white' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h1 className={`text-xl font-semibold ${themeClasses.text}`}>Manufacturing</h1>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'inline-flex',
            gap: '8px',
            borderRadius: '8px',
            padding: '4px',
            border: '1px solid #EAEAEA',
          }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange && onTabChange(tab.id)}
                style={{
                  padding: '4px 12px',
                  fontSize: '14px',
                  fontWeight: 400,
                  borderRadius: '4px',
                  border: isActive ? '1px solid #EAEAEA' : 'none',
                  transition: 'all 0.2s ease',
                  backgroundColor: isActive
                    ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                    : 'transparent',
                  color: isActive
                    ? (isDarkMode ? '#FFFFFF' : '#374151')
                    : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  height: '23px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Settings + Sort + Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        {/* Sort Button - Hidden when in sort mode */}
        {!isSortMode && (
          <button
            onClick={onSortClick}
            style={{
              backgroundColor: '#FCD34D',
              width: '73px',
              height: '24px',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: 'none',
              gap: '10px',
              padding: '0',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            <svg
              style={{ width: '14px', height: '14px', color: '#111827', flexShrink: 0 }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 20 12"
              strokeWidth={2.5}
              strokeLinecap="round"
            >
              {/* Top bar - longest */}
              <line x1="2" y1="2" x2="14" y2="2" />
              {/* Middle bar - shorter */}
              <line x1="2" y1="6" x2="10" y2="6" />
              {/* Bottom bar - shortest */}
              <line x1="2" y1="10" x2="7" y2="10" />
            </svg>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#111827', lineHeight: '1', whiteSpace: 'nowrap' }}>
              Sort
            </span>
          </button>
        )}

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative', width: '264px' }}>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                height: '32px',
                paddingLeft: '2.5rem',
                paddingRight: '8px',
                paddingTop: '8px',
                paddingBottom: '8px',
                borderRadius: '6px',
                border: '1px solid #E5E7EB',
                backgroundColor: '#FFFFFF',
                fontSize: '14px',
                color: isDarkMode ? '#E5E7EB' : '#111827',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <svg
              fill="none"
              stroke="#9CA3AF"
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
          </div>
          {/* Arrow buttons - outside search bar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              alignItems: 'center',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{ color: '#9CA3AF', cursor: 'pointer' }}
            >
              <path
                d="M3 8L6 5L9 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{ color: '#9CA3AF', cursor: 'pointer' }}
            >
              <path
                d="M3 4L6 7L9 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManufacturingHeader;

