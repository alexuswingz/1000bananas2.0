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
    { id: 'products', label: 'Products' },
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
          className={`${themeClasses.border}`}
          style={{
            display: 'inline-flex',
            borderRadius: '9999px',
            padding: '0.125rem',
            borderWidth: 1,
            backgroundColor: isDarkMode ? '#111827' : '#F9FAFB',
          }}
        >
          {shipmentsTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  padding: '0.35rem 0.9rem',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  borderRadius: '9999px',
                  transition: 'all 0.15s ease',
                  backgroundColor: isActive
                    ? isDarkMode
                      ? '#111827'
                      : 'white'
                    : 'transparent',
                  color: isActive
                    ? isDarkMode
                      ? '#E5E7EB'
                      : '#111827'
                    : '#6B7280',
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
            className={`${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all`}
            style={{
              width: '100%',
              paddingLeft: '2.5rem',
              paddingRight: '1rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
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

        {/* Settings icon */}
        <button
          className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-full flex items-center justify-center`}
          style={{
            width: '36px',
            height: '36px',
          }}
        >
          <svg
            className={themeClasses.textSecondary}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ width: '1rem', height: '1rem' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l.7 2.153a1 1 0 00.95.69h2.262c.969 0 1.371 1.24.588 1.81l-1.834 1.333a1 1 0 00-.364 1.118l.7 2.153c.3.922-.755 1.688-1.538 1.118l-1.834-1.333a1 1 0 00-1.175 0l-1.834 1.333c-.783.57-1.838-.197-1.538-1.118l.7-2.153a1 1 0 00-.364-1.118L4.45 7.58c-.783-.57-.38-1.81.588-1.81h2.262a1 1 0 00.95-.69l.7-2.153z"
            />
          </svg>
        </button>

        {/* New Shipment button */}
        <button
          className="bg-[#111827] text-white rounded-full text-sm font-medium hover:bg-black transition-colors"
          style={{ padding: '0.55rem 1.25rem', whiteSpace: 'nowrap' }}
          onClick={onNewShipmentClick}
        >
          + New Shipment
        </button>
      </div>
    </div>
  );
};

export default PlanningHeader;

