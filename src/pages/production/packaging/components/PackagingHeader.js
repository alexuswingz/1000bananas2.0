import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const PackagingHeader = ({ activeTab, onTabChange, onSearch, onSortClick, selectedShipment, onShipmentChange }) => {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showShipmentDropdown, setShowShipmentDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);

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
          <h1 className={`text-xl font-semibold ${themeClasses.text}`}>Packaging</h1>
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
                    ? (isDarkMode ? '#FFFFFF' : '#111827')
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

      {/* Right: Settings + Sort + Search + Dropdowns */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        {/* Settings Icon */}
        <button
          style={{
            padding: '0.5rem',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: 'transparent',
            border: 'none',
          }}
          onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <img
            src="/assets/Vector.png"
            alt="Settings"
            style={{ width: '1.25rem', height: '1.25rem' }}
          />
        </button>

        {/* Sort Button */}
        <button
          onClick={onSortClick}
          style={{
            backgroundColor: '#FCD34D',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: 'none',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          <svg
            style={{ width: '1rem', height: '1rem', color: '#111827' }}
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
          <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
            Sort
          </span>
        </button>

        {/* Search */}
        <div style={{ position: 'relative', width: '200px' }}>
          <input
            type="text"
            placeholder="Q Search..."
            value={searchQuery}
            onChange={handleSearchChange}
            className={`${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all`}
            style={{
              width: '100%',
              paddingLeft: '2.5rem',
              paddingRight: '1rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
              borderRadius: '8px',
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

        {/* Up/Down Arrow Icon */}
        <div style={{ position: 'relative' }}>
          <button
            className={`${themeClasses.inputBg} ${themeClasses.text} transition-all hover:shadow-sm`}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
            }}
          >
            <svg
              className={themeClasses.textSecondary}
              style={{ width: '1rem', height: '1rem' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 16 16"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Up arrow */}
              <path d="M4 6l4-4 4 4" />
              {/* Down arrow */}
              <path d="M4 10l4 4 4-4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackagingHeader;
