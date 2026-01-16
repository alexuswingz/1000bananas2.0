import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useCompany } from '../../../context/CompanyContext';
import ManufacturingHeader from './components/ManufacturingHeader';
import ManufacturingTable from './components/ManufacturingTable';
import Sidebar from '../../../components/Sidebar';

const Manufacturing = () => {
  const { isDarkMode } = useTheme();
  const { company } = useCompany();
  const [activeTab, setActiveTab] = useState('active');
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShipment, setSelectedShipment] = useState('');
  const [showShipmentDropdown, setShowShipmentDropdown] = useState(false);
  const [isSortMode, setIsSortMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
  };

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const subTabs = [
    { id: 'all', label: 'All', count: 98 },
    { id: 'bottling', label: 'Bottling', count: 87 },
    { id: 'bagging', label: 'Bagging', count: 11 },
  ];

  const handleSortClick = () => {
    setIsSortMode(!isSortMode);
  };

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`}>
      {/* Mobile Top Navigation Bar */}
      {isMobile && (
        <div
          style={{
            backgroundColor: '#F9FAFB',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          {/* Hamburger Menu */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H21" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 6H21" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
              <path d="M3 18H21" stroke="#374151" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>

          {/* 1000 Bananas Title */}
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#9333EA',
              margin: 0,
            }}
          >
            {company?.name || '1000 Bananas'}
          </h1>

          {/* Notification Bell */}
          <button
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Header */}
      {isMobile ? (
        <>
          {/* Manufacturing Title Section */}
          <div
            style={{
              backgroundColor: '#F9FAFB',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1
                style={{
                  width: '142px',
                  height: '24px',
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#111827',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Manufacturing
              </h1>
              <button
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '-16px',
                }}
              >
                <img
                  src="/assets/Icon Button.png"
                  alt="Settings"
                  style={{ width: '24px', height: '24px' }}
                />
              </button>
            </div>

            {/* Active Queue / Archive Buttons */}
            <div 
              style={{ 
                display: 'flex',
                flexDirection: 'row',
                width: '142px',
                height: '28px',
                backgroundColor: '#E5E5E5',
                borderRadius: '24px',
                padding: '4px',
                position: 'relative',
                gap: 0,
                boxSizing: 'border-box',
              }}
            >
              {/* Sliding white background for selected tab */}
              <div
                style={{
                  position: 'absolute',
                  left: activeTab === 'active' ? '4px' : 'calc(50% + 2px)',
                  top: '4px',
                  bottom: '4px',
                  width: 'calc(50% - 4px)',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '20px',
                  transition: 'left 0.2s ease',
                  zIndex: 0,
                }}
              />
              <button
                onClick={() => setActiveTab('active')}
                style={{
                  flex: 1,
                  padding: '0 4px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: activeTab === 'active' ? '#007AFF' : '#8E8E93',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 1,
                  transition: 'color 0.2s ease',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Active Queue
              </button>
              <button
                onClick={() => setActiveTab('archive')}
                style={{
                  flex: 1,
                  padding: '0 4px',
                  borderRadius: '20px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: activeTab === 'archive' ? '#007AFF' : '#8E8E93',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 1,
                  transition: 'color 0.2s ease',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Archive
              </button>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderBottom: '1px solid #E5E7EB',
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 16px',
                  paddingRight: searchQuery ? '48px' : '16px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF',
                  fontSize: '14px',
                  color: '#111827',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '24px',
                    height: '24px',
                    minWidth: '24px',
                    minHeight: '24px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '4px',
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    zIndex: 2,
                    touchAction: 'manipulation',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#9CA3AF';
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#D1D5DB';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.borderColor = '#9CA3AF';
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                  onTouchEnd={(e) => {
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
            <button
              onClick={handleSortClick}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                backgroundColor: isSortMode ? '#E5E7EB' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke={isSortMode ? '#007AFF' : '#374151'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

        </>
      ) : (
        <ManufacturingHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onSearch={setSearchQuery}
          onSortClick={handleSortClick}
          isSortMode={isSortMode}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && isSidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
            }}
          />
          {/* Sidebar Drawer */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '280px',
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              zIndex: 9999,
              boxShadow: '2px 0 8px rgba(0, 0, 0, 0.15)',
              transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s ease',
              overflowY: 'auto',
            }}
          >
            {/* Close Button */}
            <div
              style={{
                padding: '12px 16px',
                borderBottom: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: isDarkMode ? '#F9FAFB' : '#111827',
                  margin: 0,
                }}
              >
                Menu
              </h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18" stroke={isDarkMode ? '#F9FAFB' : '#374151'} strokeWidth="2" strokeLinecap="round"/>
                  <path d="M6 6L18 18" stroke={isDarkMode ? '#F9FAFB' : '#374151'} strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            {/* Sidebar Content */}
            <div style={{ height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
              <Sidebar forceMobile={true} />
            </div>
          </div>
        </>
      )}


      {/* Main content */}
      <div style={{ padding: isMobile ? '0' : '2rem 2rem 0 2rem' }}>
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

