import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import PackagingHeader from './packaging/components/PackagingHeader';
import PackagingTable from './packaging/components/PackagingTable';
import PackagingArchiveTable from './packaging/components/PackagingArchiveTable';
import ProductInfoModal from './packaging/components/ProductInfoModal';
import QualityChecksModal from './packaging/components/QualityChecksModal';
import ProductionStartedModal from './packaging/components/ProductionStartedModal';

const Packaging = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('active');
  const [activeSubTab, setActiveSubTab] = useState('bottling');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShipment, setSelectedShipment] = useState('');
  const [showShipmentDropdown, setShowShipmentDropdown] = useState(false);
  const [showProductInfoModal, setShowProductInfoModal] = useState(false);
  const [showQualityChecksModal, setShowQualityChecksModal] = useState(false);
  const [showProductionStartedModal, setShowProductionStartedModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
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

  const handleStartClick = (row) => {
    setSelectedProduct(row);
    setShowProductInfoModal(true);
  };

  const handleBeginQC = () => {
    setShowProductInfoModal(false);
    setShowQualityChecksModal(true);
  };

  const handleStartProduction = () => {
    setShowQualityChecksModal(false);
    setShowProductionStartedModal(true);
  };

  const handleCloseProductionStarted = () => {
    setShowProductionStartedModal(false);
    setSelectedProduct(null);
  };

  const handlePause = () => {
    // Handle pause logic
    console.log('Production paused');
  };

  const handleMarkDone = () => {
    // Handle mark done logic
    console.log('Production marked as done');
    setShowProductionStartedModal(false);
    setSelectedProduct(null);
  };

  const handleCloseProductInfo = () => {
    setShowProductInfoModal(false);
    setSelectedProduct(null);
  };

  const handleCloseQualityChecks = () => {
    setShowQualityChecksModal(false);
    setSelectedProduct(null);
  };

  const handleSortClick = () => {
    setIsSortMode(!isSortMode);
  };

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`}>
      {/* Header */}
      <PackagingHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSearch={setSearchQuery}
        onSortClick={handleSortClick}
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
              className={`${isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white'} ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'} ${isDarkMode ? 'border-dark-border-primary' : 'border-gray-200'} border text-sm transition-all hover:shadow-sm`}
              style={{
                padding: '0.5rem 1rem',
                paddingRight: '2rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                whiteSpace: 'nowrap',
                minWidth: '150px',
                position: 'relative',
              }}
            >
              <span>{selectedShipment || 'Select Shipment'}</span>
              <svg
                className={isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  width: '1rem',
                  height: '1rem',
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
        {activeTab === 'archive' ? (
          <PackagingArchiveTable
            data={[]}
            searchQuery={searchQuery}
          />
        ) : (
          <PackagingTable
            data={[]}
            searchQuery={searchQuery}
            onStartClick={handleStartClick}
            isSortMode={isSortMode}
            onExitSortMode={() => setIsSortMode(false)}
          />
        )}
      </div>

      {/* Product Info Modal */}
      <ProductInfoModal
        isOpen={showProductInfoModal}
        onClose={handleCloseProductInfo}
        onBeginQC={handleBeginQC}
        productData={selectedProduct}
      />

      {/* Quality Checks Modal */}
      <QualityChecksModal
        isOpen={showQualityChecksModal}
        onClose={handleCloseQualityChecks}
        productData={selectedProduct}
        onStartProduction={handleStartProduction}
      />

      {/* Production Started Modal */}
      <ProductionStartedModal
        isOpen={showProductionStartedModal}
        onClose={handleCloseProductionStarted}
        productData={selectedProduct}
        onPause={handlePause}
        onMarkDone={handleMarkDone}
      />
    </div>
  );
};

export default Packaging;
