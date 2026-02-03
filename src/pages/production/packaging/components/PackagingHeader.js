import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const PackagingHeader = ({ activeTab, onTabChange, onSearch, onSortClick, selectedShipment, onShipmentChange, onGenerateClosingReport, onViewReportHistory }) => {
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showShipmentDropdown, setShowShipmentDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const settingsButtonRef = useRef(null);
  const settingsDropdownRef = useRef(null);
  const filterButtonRef = useRef(null);
  const filterDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSettingsDropdown) {
        const isOutsideButton = settingsButtonRef.current && !settingsButtonRef.current.contains(event.target);
        const isOutsideDropdown = settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target);
        
        if (isOutsideButton && isOutsideDropdown) {
          setShowSettingsDropdown(false);
        }
      }
      
      if (showFilterDropdown) {
        const isOutsideButton = filterButtonRef.current && !filterButtonRef.current.contains(event.target);
        const isOutsideDropdown = filterDropdownRef.current && !filterDropdownRef.current.contains(event.target);
        
        if (isOutsideButton && isOutsideDropdown) {
          setShowFilterDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsDropdown, showFilterDropdown]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ shipment: true, formula: false, status: false });
  const [selectedFilters, setSelectedFilters] = useState({
    shipment: ['F.All Clean'],
    formula: [],
    status: []
  });

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  const filterOptions = {
    shipment: ['F.All Clean', 'F.All Insect Repel', 'F.Animal Repel', 'F.Ant Out'],
    formula: ['F.Ultra Grow', 'F.Indoor Plant Food', 'F.Outdoor Blend'],
    status: ['Pending', 'In Progress', 'Done', 'Paused']
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleFilter = (category, value) => {
    setSelectedFilters(prev => {
      const current = prev[category];
      if (current.includes(value)) {
        return { ...prev, [category]: current.filter(item => item !== value) };
      } else {
        return { ...prev, [category]: [...current, value] };
      }
    });
  };

  const resetFilters = () => {
    setSelectedFilters({ shipment: [], formula: [], status: [] });
  };

  const applyFilters = () => {
    // Apply filters logic here
    setShowFilterModal(false);
  };

  const desktopTabs = [
    { id: 'active', label: 'Active Queue' },
    { id: 'archive', label: 'Archive' },
  ];

  const mobileTabs = [
    { id: 'active', label: 'Active Queue' },
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
      className={`${themeClasses.cardBg} ${themeClasses.border} border-b md:pt-0 pt-0 md:px-8 md:py-4 px-3 py-2`}
      style={{ marginTop: '16px' }}
    >
      {/* Desktop Layout - Original horizontal layout */}
      <div className="hidden md:flex" style={{ alignItems: 'center', justifyContent: 'space-between', gap: '1rem', width: '100%' }}>
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

          {/* Desktop Tabs */}
          <div
            style={{
              display: 'inline-flex',
              gap: '8px',
              borderRadius: '8px',
              padding: '4px',
              border: '1px solid #EAEAEA',
            }}
          >
            {desktopTabs.map((tab) => {
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
          <div style={{ position: 'relative' }}>
            <button
              ref={settingsButtonRef}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowSettingsDropdown(!showSettingsDropdown);
              }}
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

            {/* Settings Dropdown Menu */}
            {showSettingsDropdown && (
              <div
                ref={settingsDropdownRef}
                style={{
                  position: window.innerWidth < 768 ? 'fixed' : 'absolute',
                  top: window.innerWidth < 768 
                    ? (settingsButtonRef.current?.getBoundingClientRect()?.bottom || 60) + 8
                    : '100%',
                  right: window.innerWidth < 768 ? '16px' : '0',
                  marginTop: window.innerWidth < 768 ? '0' : '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  zIndex: 99999,
                  minWidth: '200px',
                  overflow: 'visible',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    console.log('Export Page clicked');
                    setShowSettingsDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#374151',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Export Page
                </button>

                {/* Separator */}
                <div style={{ height: '1px', backgroundColor: '#E5E7EB', margin: '0' }} />

                <button
                  onClick={() => {
                    console.log('Generate Closing Report clicked');
                    if (onGenerateClosingReport) {
                      onGenerateClosingReport();
                    }
                    setShowSettingsDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#374151',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  Generate Closing Report
                </button>

                <button
                  onClick={() => {
                    console.log('View Report History clicked');
                    setShowSettingsDropdown(false);
                    if (onViewReportHistory) {
                      onViewReportHistory();
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '14px',
                    color: '#374151',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  View Report History
                </button>
              </div>
            )}
          </div>

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

          {/* Filter Button */}
          <div style={{ position: 'relative' }}>
            <button
              ref={filterButtonRef}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowFilterDropdown(!showFilterDropdown);
              }}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1F2937' : '#FFFFFF';
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

            {/* Filter Dropdown Menu */}
            {showFilterDropdown && (
              <div
                ref={filterDropdownRef}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  zIndex: 99999,
                  minWidth: '280px',
                  maxWidth: '320px',
                  maxHeight: '500px',
                  overflowY: 'auto',
                  padding: '12px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    paddingBottom: '12px',
                    borderBottom: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                  }}
                >
                  <h3 style={{ fontSize: '14px', fontWeight: '600', color: isDarkMode ? '#FFFFFF' : '#111827', margin: 0 }}>
                    Filter Options
                  </h3>
                  <button
                    onClick={resetFilters}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#3B82F6',
                      fontSize: '12px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      padding: '4px 8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    Reset All
                  </button>
                </div>

                {/* Shipment Section */}
                <div style={{ marginBottom: '16px' }}>
                  <button
                    onClick={() => toggleSection('shipment')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      background: 'none',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: isDarkMode ? '#FFFFFF' : '#111827',
                      cursor: 'pointer',
                    }}
                  >
                    <span>Shipment</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                      strokeWidth="2"
                      style={{
                        transform: expandedSections.shipment ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedSections.shipment && (
                    <div style={{ paddingLeft: '8px', marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <button
                          onClick={() => setSelectedFilters(prev => ({ ...prev, shipment: filterOptions.shipment }))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#3B82F6',
                            fontSize: '12px',
                            cursor: 'pointer',
                            padding: '2px 4px',
                          }}
                        >
                          Select all
                        </button>
                        <button
                          onClick={() => setSelectedFilters(prev => ({ ...prev, shipment: [] }))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isDarkMode ? '#9CA3AF' : '#6B7280',
                            fontSize: '12px',
                            cursor: 'pointer',
                            padding: '2px 4px',
                          }}
                        >
                          Clear all
                        </button>
                      </div>
                      {filterOptions.shipment.map(option => (
                        <label
                          key={option}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '6px 0',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFilters.shipment.includes(option)}
                            onChange={() => toggleFilter('shipment', option)}
                            style={{
                              width: '16px',
                              height: '16px',
                              marginRight: '8px',
                              cursor: 'pointer',
                              accentColor: '#3B82F6',
                            }}
                          />
                          <span style={{ fontSize: '13px', color: isDarkMode ? '#D1D5DB' : '#374151' }}>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Formula Section */}
                <div style={{ marginBottom: '16px', borderTop: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`, paddingTop: '12px' }}>
                  <button
                    onClick={() => toggleSection('formula')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      background: 'none',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: isDarkMode ? '#FFFFFF' : '#111827',
                      cursor: 'pointer',
                    }}
                  >
                    <span>Formula</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                      strokeWidth="2"
                      style={{
                        transform: expandedSections.formula ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedSections.formula && (
                    <div style={{ paddingLeft: '8px', marginTop: '8px' }}>
                      {filterOptions.formula.map(option => (
                        <label
                          key={option}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '6px 0',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFilters.formula.includes(option)}
                            onChange={() => toggleFilter('formula', option)}
                            style={{
                              width: '16px',
                              height: '16px',
                              marginRight: '8px',
                              cursor: 'pointer',
                              accentColor: '#3B82F6',
                            }}
                          />
                          <span style={{ fontSize: '13px', color: isDarkMode ? '#D1D5DB' : '#374151' }}>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Section */}
                <div style={{ borderTop: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`, paddingTop: '12px' }}>
                  <button
                    onClick={() => toggleSection('status')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      background: 'none',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: isDarkMode ? '#FFFFFF' : '#111827',
                      cursor: 'pointer',
                    }}
                  >
                    <span>Status</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                      strokeWidth="2"
                      style={{
                        transform: expandedSections.status ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    >
                      <path d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedSections.status && (
                    <div style={{ paddingLeft: '8px', marginTop: '8px' }}>
                      {filterOptions.status.map(option => (
                        <label
                          key={option}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '6px 0',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFilters.status.includes(option)}
                            onChange={() => toggleFilter('status', option)}
                            style={{
                              width: '16px',
                              height: '16px',
                              marginRight: '8px',
                              cursor: 'pointer',
                              accentColor: '#3B82F6',
                            }}
                          />
                          <span style={{ fontSize: '13px', color: isDarkMode ? '#D1D5DB' : '#374151' }}>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Apply Button */}
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}` }}>
                  <button
                    onClick={() => {
                      applyFilters();
                      setShowFilterDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 16px',
                      backgroundColor: '#3B82F6',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563EB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#3B82F6';
                    }}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>

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

      {/* Mobile Layout - Stacked vertically */}
      <div className="md:hidden flex flex-col w-full gap-2" style={{ padding: '0', width: '100%', marginTop: '1rem' }}>
        {/* Top Row: Title + Settings Icon + Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', width: '100%', flexWrap: 'nowrap', overflow: 'hidden' }}>
          {/* Left: Title + Settings Icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 1, minWidth: 0 }}>
            {/* Title only - no icon box */}
            <h1 
              className={themeClasses.text} 
              style={{ 
                margin: 0,
                fontFamily: 'Inter',
                fontWeight: 600,
                fontSize: '18px',
                lineHeight: '100%',
                letterSpacing: '0%',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Packaging
            </h1>

            {/* Settings Icon - immediately after Packaging text */}
            <button
              style={{
                padding: '0.4rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                backgroundColor: 'transparent',
                border: 'none',
                flexShrink: 0,
                minWidth: '28px',
                minHeight: '28px',
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
                src="/assets/Vector (2).png"
                alt="Settings"
                style={{ width: '1rem', height: '1rem', display: 'block' }}
              />
            </button>
          </div>

          {/* Right: Active Queue and Archive Tabs */}
          <div
            style={{
              display: 'inline-flex',
              gap: '0',
              width: '130px',
              height: '28px',
              borderRadius: '24px',
              padding: '3px',
              border: 'none',
              backgroundColor: '#E0E0E0',
              opacity: 1,
              flexShrink: 0,
            }}
          >
            {mobileTabs.map((tab, index) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange && onTabChange(tab.id)}
                  style={{
                    padding: '3px 6px',
                    fontSize: '10px',
                    fontWeight: 500,
                    fontFamily: 'Inter, sans-serif',
                    borderRadius: '20px',
                    border: 'none',
                    transition: 'all 0.2s ease',
                    backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                    color: isActive ? '#007AFF' : '#6B7280',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: isActive ? '0 1px 2px 0 rgba(0, 0, 0, 0.1)' : 'none',
                    height: '100%',
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Row - Below Packaging */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Search..."
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

          {/* Filter Button */}
          <button
            onClick={() => setShowFilterModal(true)}
            className={`${themeClasses.inputBg} ${themeClasses.text} transition-all hover:shadow-sm`}
            style={{
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
              minWidth: '40px',
              height: '40px',
            }}
          >
            <svg
              className={themeClasses.textSecondary}
              style={{ width: '1.25rem', height: '1.25rem' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

      </div>

      {/* Filter Modal - Mobile */}
      {showFilterModal && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowFilterModal(false)}
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
          {/* Bottom Sheet */}
          <div
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#FFFFFF',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '85vh',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Drag Handle */}
            <div
              style={{
                padding: '8px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '4px',
                  backgroundColor: '#D1D5DB',
                  borderRadius: '2px',
                }}
              />
            </div>
            {/* Header */}
            <div
              style={{
                padding: '16px',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              Filter Options
            </h2>
            <button
              onClick={resetFilters}
              style={{
                background: 'none',
                border: 'none',
                color: '#3B82F6',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Reset All
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {/* Shipment Section */}
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={() => toggleSection('shipment')}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  background: 'none',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#111827',
                  cursor: 'pointer',
                }}
              >
                <span>Shipment</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6B7280"
                  strokeWidth="2"
                  style={{
                    transform: expandedSections.shipment ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                >
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.shipment && (
                <div style={{ paddingLeft: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <button
                      onClick={() => setSelectedFilters(prev => ({ ...prev, shipment: filterOptions.shipment }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3B82F6',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Select all
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedFilters(prev => ({ ...prev, shipment: [] }))}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#6B7280',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Clear all
                      </button>
                      <span style={{ color: '#9CA3AF', fontSize: '12px' }}>323 results</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <input
                      type="text"
                      placeholder=""
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: '#FFFFFF',
                      }}
                    />
                  </div>
                  {filterOptions.shipment.map(option => (
                    <label
                      key={option}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 0',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFilters.shipment.includes(option)}
                        onChange={() => toggleFilter('shipment', option)}
                        style={{
                          width: '18px',
                          height: '18px',
                          marginRight: '12px',
                          cursor: 'pointer',
                          accentColor: '#3B82F6',
                        }}
                      />
                      <span style={{ fontSize: '14px', color: '#374151' }}>{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Formula Section */}
            <div style={{ marginBottom: '16px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
              <button
                onClick={() => toggleSection('formula')}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  background: 'none',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#111827',
                  cursor: 'pointer',
                }}
              >
                <span>Formula</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6B7280"
                  strokeWidth="2"
                  style={{
                    transform: expandedSections.formula ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                >
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.formula && (
                <div style={{ paddingLeft: '8px' }}>
                  {filterOptions.formula.map(option => (
                    <label
                      key={option}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 0',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFilters.formula.includes(option)}
                        onChange={() => toggleFilter('formula', option)}
                        style={{
                          width: '18px',
                          height: '18px',
                          marginRight: '12px',
                          cursor: 'pointer',
                          accentColor: '#3B82F6',
                        }}
                      />
                      <span style={{ fontSize: '14px', color: '#374151' }}>{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Status Section */}
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
              <button
                onClick={() => toggleSection('status')}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  background: 'none',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#111827',
                  cursor: 'pointer',
                }}
              >
                <span>Status</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#6B7280"
                  strokeWidth="2"
                  style={{
                    transform: expandedSections.status ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                >
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedSections.status && (
                <div style={{ paddingLeft: '8px' }}>
                  {filterOptions.status.map(option => (
                    <label
                      key={option}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 0',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFilters.status.includes(option)}
                        onChange={() => toggleFilter('status', option)}
                        style={{
                          width: '18px',
                          height: '18px',
                          marginRight: '12px',
                          cursor: 'pointer',
                          accentColor: '#3B82F6',
                        }}
                      />
                      <span style={{ fontSize: '14px', color: '#374151' }}>{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer - Apply Button */}
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid #E5E7EB',
            }}
          >
            <button
              onClick={applyFilters}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Apply Filters
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
};

export default PackagingHeader;

