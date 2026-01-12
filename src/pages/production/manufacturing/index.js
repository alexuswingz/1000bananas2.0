import React, { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import ManufacturingHeader from './components/ManufacturingHeader';
import ManufacturingTable from './components/ManufacturingTable';

const Manufacturing = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('active');
  const [activeSubTab, setActiveSubTab] = useState('bottling');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShipment, setSelectedShipment] = useState('');
  const [showShipmentDropdown, setShowShipmentDropdown] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
  };

  const subTabs = [
    { id: 'all', label: 'All' },
    { id: 'bottling', label: 'Bottling' },
    { id: 'bagging', label: 'Bagging' },
  ];

  const handleSortClick = () => {
    setIsSortMode(!isSortMode);
  };

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`}>
      {/* Header */}
      <ManufacturingHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSearch={setSearchQuery}
        onSortClick={handleSortClick}
        isSortMode={isSortMode}
      />

      {/* Sub-navigation tabs - only show for active tab */}
      {activeTab === 'active' && (
      <div
          className={`${themeClasses.pageBg}`}
          style={{
            padding: '1rem 2rem',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            {subTabs.map((tab) => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  style={{
                    padding: '0.5rem 0',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#2563EB' : themeClasses.textSecondary,
                    borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: 'none',
                    borderTop: 'none',
                    borderLeft: 'none',
                    borderRight: 'none',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Select Shipment Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowShipmentDropdown(!showShipmentDropdown)}
              style={{
                width: '142px',
                height: '24px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '4px',
                padding: '0',
                paddingLeft: '10px',
                paddingRight: '10px',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                whiteSpace: 'nowrap',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#D1D5DB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
              }}
            >
              <span style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                width: '94px',
                height: '15px',
                textAlign: 'left',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '13px',
                fontWeight: 400,
                color: '#374151',
                lineHeight: '1',
              }}>
                {selectedShipment || 'Select Shipment'}
              </span>
              <svg
                style={{
                  width: '10px',
                  height: '10px',
                  color: '#374151',
                  flexShrink: 0,
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showShipmentDropdown && (
              <div
                className={`${isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white'} ${isDarkMode ? 'border-dark-border-primary' : 'border-gray-200'} border shadow-lg rounded-md`}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '0.25rem',
                  zIndex: 50,
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                <button
                  onClick={() => {
                    setSelectedShipment('');
                    setShowShipmentDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'} hover:bg-gray-50 dark:hover:bg-gray-700`}
                >
                  All Shipments
                </button>
                {/* Add more shipment options here */}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ padding: '2rem 2rem 0 2rem' }}>
        <ManufacturingTable
          data={[]}
          searchQuery={searchQuery}
          selectedShipment={selectedShipment}
          activeSubTab={activeSubTab}
          isSortMode={isSortMode}
          onExitSortMode={() => setIsSortMode(false)}
        />
      </div>
    </div>
  );
};

export default Manufacturing;

