import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const PlanningHeader = ({ activeTab, onTabChange, onNewShipmentClick, onSearch }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  const shipmentsTabs = [
    { id: 'shipments', label: 'Shipments' },
    { id: 'archive', label: 'Archive' },
  ];

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
                d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4"
              />
            </svg>
          </div>
          <h1 className={`text-xl font-semibold ${themeClasses.text}`}>Planning</h1>
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
          {shipmentsTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
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

      {/* Right: search + settings + primary button */}
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
            placeholder="Find a shipment..."
            onChange={(e) => onSearch && onSearch(e.target.value)}
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

        {/* New Shipment button */}
        <button
          className="bg-[#111827] text-white text-sm font-medium hover:bg-black transition-colors"
          style={{ padding: '0.55rem 1.25rem', whiteSpace: 'nowrap', borderRadius: '8px' }}
          onClick={onNewShipmentClick}
        >
          + New Shipment
        </button>
      </div>
    </div>
  );
};

export default PlanningHeader;

