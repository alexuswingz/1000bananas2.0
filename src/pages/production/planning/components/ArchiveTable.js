import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const ArchiveTable = ({ rows = [] }) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#1C2634]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  const columnBorderColor = '#FFFFFF';

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumn !== null) {
        const filterIcon = filterIconRefs.current[openFilterColumn];
        const dropdown = filterDropdownRef.current;
        
        if (filterIcon && dropdown) {
          const isClickInsideIcon = filterIcon.contains(event.target);
          const isClickInsideDropdown = dropdown.contains(event.target);
          
          if (!isClickInsideIcon && !isClickInsideDropdown) {
            setOpenFilterColumn(null);
          }
        }
      }
    };

    if (openFilterColumn !== null) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterColumn]);

  // Handle filter icon click
  const handleFilterClick = (columnKey, e) => {
    e.stopPropagation();
    setOpenFilterColumn(openFilterColumn === columnKey ? null : columnKey);
  };

  // Sample data - all shipments with completed status
  const archiveRows = rows.length > 0 ? rows : [
    {
      id: 1,
      status: 'Received - AMZN',
      shipment: '2025.11.18 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrie',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'completed',
      sortProducts: 'completed',
      sortFormulas: 'completed',
    },
    {
      id: 2,
      status: 'Received - AMZN',
      shipment: '2025.11.18 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrie',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'completed',
      sortProducts: 'completed',
      sortFormulas: 'completed',
    },
    {
      id: 3,
      status: 'Received - AMZN',
      shipment: '2025.11.18 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrie',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'completed',
      sortProducts: 'completed',
      sortFormulas: 'completed',
    },
    {
      id: 4,
      status: 'Received - AMZN',
      shipment: '2025.11.18 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrie',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'completed',
      sortProducts: 'completed',
      sortFormulas: 'completed',
    },
    {
      id: 5,
      status: 'Received - AMZN',
      shipment: '2025.11.18 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrie',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'completed',
      sortProducts: 'completed',
      sortFormulas: 'completed',
    },
    {
      id: 6,
      status: 'Received - AMZN',
      shipment: '2025.11.18 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrie',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'completed',
      sortProducts: 'completed',
      sortFormulas: 'completed',
    },
    {
      id: 7,
      status: 'Received - AMZN',
      shipment: '2025.11.18 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrie',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'completed',
      sortProducts: 'completed',
      sortFormulas: 'completed',
    },
    {
      id: 8,
      status: 'Received - AMZN',
      shipment: '2025.11.18 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrie',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'completed',
      sortProducts: 'completed',
      sortFormulas: 'completed',
    },
    {
      id: 9,
      status: 'Received - AMZN',
      shipment: '2025.11.18 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrie',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'completed',
      sortProducts: 'completed',
      sortFormulas: 'completed',
    },
    {
      id: 10,
      status: 'Received - AMZN',
      shipment: '2025.11.18 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrie',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'completed',
      sortProducts: 'completed',
      sortFormulas: 'completed',
    },
    {
      id: 11,
      status: 'Received - AMZN',
      shipment: '2025.11.18 AWD',
      marketplace: 'Amazon',
      account: 'TPS Nutrie',
      addProducts: 'completed',
      formulaCheck: 'completed',
      labelCheck: 'completed',
      sortProducts: 'completed',
      sortFormulas: 'completed',
    },
  ];

  // Render status icon - green checkmark for Received
  const renderStatusIcon = (status) => {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" fill="#10B981" />
        <path
          d="M9 12l2 2 4-4"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // Render workflow status - always green (completed) for archive
  const renderWorkflowStatus = () => {
    return (
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '20px',
          backgroundColor: '#10B981',
          border: 'none',
          display: 'inline-block',
        }}
      />
    );
  };

  const handleShipmentClick = (row) => {
    navigate('/production/new-shipment', {
      state: {
        shipmentData: {
          shipmentName: row.shipment.split(' ')[0],
          shipmentType: row.shipment.split(' ')[1] || 'AWD',
          marketplace: row.marketplace,
          account: row.account,
        },
      },
    });
  };

  return (
    <div>
      <div
        className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl`}
        style={{ overflowX: 'hidden', position: 'relative' }}
      >
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
          <thead className={themeClasses.headerBg}>
            <tr>
              <th
                className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
                style={{
                  padding: '0.75rem 1rem',
                  width: '15%',
                  height: '40px',
                  backgroundColor: '#1C2634',
                  borderRight: `1px solid ${columnBorderColor}`,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ color: (openFilterColumn === 'status') ? '#3B82F6' : '#FFFFFF' }}>
                    STATUS
                  </span>
                  <img
                    ref={(el) => { if (el) filterIconRefs.current['status'] = el; }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity cursor-pointer ${
                      openFilterColumn === 'status'
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                    onClick={(e) => handleFilterClick('status', e)}
                    style={
                      openFilterColumn === 'status'
                        ? {
                            filter:
                              'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                          }
                        : undefined
                    }
                  />
                </div>
              </th>
              <th
                className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
                style={{
                  padding: '0.75rem 1rem',
                  width: '15%',
                  height: '40px',
                  backgroundColor: '#1C2634',
                  borderRight: `1px solid ${columnBorderColor}`,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ color: (openFilterColumn === 'shipment') ? '#3B82F6' : '#FFFFFF' }}>
                    SHIPMENT
                  </span>
                  <img
                    ref={(el) => { if (el) filterIconRefs.current['shipment'] = el; }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity cursor-pointer ${
                      openFilterColumn === 'shipment'
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                    onClick={(e) => handleFilterClick('shipment', e)}
                    style={
                      openFilterColumn === 'shipment'
                        ? {
                            filter:
                              'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                          }
                        : undefined
                    }
                  />
                </div>
              </th>
              <th
                className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
                style={{
                  padding: '0.75rem 1rem',
                  width: '12%',
                  height: '40px',
                  backgroundColor: '#1C2634',
                  borderRight: `1px solid ${columnBorderColor}`,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ color: (openFilterColumn === 'marketplace') ? '#3B82F6' : '#FFFFFF' }}>
                    MARKETPLACE
                  </span>
                  <img
                    ref={(el) => { if (el) filterIconRefs.current['marketplace'] = el; }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity cursor-pointer ${
                      openFilterColumn === 'marketplace'
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                    onClick={(e) => handleFilterClick('marketplace', e)}
                    style={
                      openFilterColumn === 'marketplace'
                        ? {
                            filter:
                              'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                          }
                        : undefined
                    }
                  />
                </div>
              </th>
              <th
                className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
                style={{
                  padding: '0.75rem 1rem',
                  width: '12%',
                  height: '40px',
                  backgroundColor: '#1C2634',
                  borderRight: `1px solid ${columnBorderColor}`,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ color: (openFilterColumn === 'account') ? '#3B82F6' : '#FFFFFF' }}>
                    ACCOUNT
                  </span>
                  <img
                    ref={(el) => { if (el) filterIconRefs.current['account'] = el; }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity cursor-pointer ${
                      openFilterColumn === 'account'
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                    onClick={(e) => handleFilterClick('account', e)}
                    style={
                      openFilterColumn === 'account'
                        ? {
                            filter:
                              'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                          }
                        : undefined
                    }
                  />
                </div>
              </th>
              <th
                className="text-center text-white uppercase tracking-wider group cursor-pointer"
                style={{
                  padding: '0.5rem 1rem',
                  width: '12%',
                  height: '40px',
                  backgroundColor: '#1C2634',
                  borderRight: `1px solid ${columnBorderColor}`,
                  boxSizing: 'border-box',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>ADD</span>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>PRODUCTS</span>
                </div>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['addProducts'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    openFilterColumn === 'addProducts'
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('addProducts', e)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '8px',
                    transform: 'translateY(-50%)',
                    ...(openFilterColumn === 'addProducts'
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined)
                  }}
                />
              </th>
              <th
                className="text-center text-white uppercase tracking-wider group cursor-pointer"
                style={{
                  padding: '0.5rem 1rem',
                  width: '12%',
                  height: '40px',
                  backgroundColor: '#1C2634',
                  borderRight: `1px solid ${columnBorderColor}`,
                  boxSizing: 'border-box',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>FORMULA</span>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>CHECK</span>
                </div>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['formulaCheck'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    openFilterColumn === 'formulaCheck'
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('formulaCheck', e)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '8px',
                    transform: 'translateY(-50%)',
                    ...(openFilterColumn === 'formulaCheck'
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined)
                  }}
                />
              </th>
              <th
                className="text-center text-white uppercase tracking-wider group cursor-pointer"
                style={{
                  padding: '0.5rem 1rem',
                  width: '12%',
                  height: '40px',
                  backgroundColor: '#1C2634',
                  borderRight: `1px solid ${columnBorderColor}`,
                  boxSizing: 'border-box',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>LABEL</span>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>CHECK</span>
                </div>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['labelCheck'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    openFilterColumn === 'labelCheck'
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('labelCheck', e)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '8px',
                    transform: 'translateY(-50%)',
                    ...(openFilterColumn === 'labelCheck'
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined)
                  }}
                />
              </th>
              <th
                className="text-center text-white uppercase tracking-wider group cursor-pointer"
                style={{
                  padding: '0.5rem 1rem',
                  width: '12%',
                  height: '40px',
                  backgroundColor: '#1C2634',
                  borderRight: `1px solid ${columnBorderColor}`,
                  boxSizing: 'border-box',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>SORT</span>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>PRODUCTS</span>
                </div>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['sortProducts'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    openFilterColumn === 'sortProducts'
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('sortProducts', e)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '8px',
                    transform: 'translateY(-50%)',
                    ...(openFilterColumn === 'sortProducts'
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined)
                  }}
                />
              </th>
              <th
                className="text-center text-white uppercase tracking-wider group cursor-pointer"
                style={{
                  padding: '0.5rem 1rem',
                  width: '12%',
                  height: '40px',
                  backgroundColor: '#1C2634',
                  borderRight: 'none',
                  boxSizing: 'border-box',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>SORT</span>
                  <span style={{ fontSize: '9px', fontWeight: 600 }}>FORMULAS</span>
                </div>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['sortFormulas'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    openFilterColumn === 'sortFormulas'
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('sortFormulas', e)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '8px',
                    transform: 'translateY(-50%)',
                    ...(openFilterColumn === 'sortFormulas'
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined)
                  }}
                />
              </th>
              <th
                className="text-center text-white uppercase tracking-wider"
                style={{
                  padding: '0.5rem 1rem',
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#1C2634',
                  boxSizing: 'border-box',
                }}
              >
              </th>
            </tr>
          </thead>
          <tbody
            className="divide-y"
            style={{ borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6' }}
          >
            {archiveRows.map((row) => (
              <tr
                key={row.id}
                style={{
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  height: '40px',
                }}
              >
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    verticalAlign: 'middle',
                    backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                    borderTop: '1px solid #E5E7EB',
                    height: '40px',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      border: '1px solid #E5E7EB',
                      backgroundColor: '#FFFFFF',
                      minWidth: '137px',
                      width: '100%',
                      maxWidth: '171.5px',
                      height: '24px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {renderStatusIcon(row.status)}
                    <span
                      style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: 500, 
                        color: '#151515',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.status || 'Received - AMZN'}
                    </span>
                    <svg
                      style={{ width: '0.85rem', height: '0.85rem', marginLeft: 'auto' }}
                      fill="none"
                      stroke="#9CA3AF"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </td>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    verticalAlign: 'middle',
                    backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                    borderTop: '1px solid #E5E7EB',
                    height: '40px',
                  }}
                >
                  <span
                    className={themeClasses.text}
                    style={{ fontSize: '0.875rem', fontWeight: 500, color: isDarkMode ? '#FFFFFF' : '#151515', cursor: 'pointer' }}
                    onClick={() => handleShipmentClick(row)}
                  >
                    {row.shipment || '2025.11.18 AWD'}
                  </span>
                </td>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    verticalAlign: 'middle',
                    backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                    borderTop: '1px solid #E5E7EB',
                    height: '40px',
                  }}
                >
                  <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                    {row.marketplace || 'Amazon'}
                  </span>
                </td>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    verticalAlign: 'middle',
                    backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                    borderTop: '1px solid #E5E7EB',
                    height: '40px',
                  }}
                >
                  <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                    {row.account || 'TPS Nutrie'}
                  </span>
                </td>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                    borderTop: '1px solid #E5E7EB',
                    height: '40px',
                  }}
                >
                  {renderWorkflowStatus()}
                </td>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                    borderTop: '1px solid #E5E7EB',
                    height: '40px',
                  }}
                >
                  {renderWorkflowStatus()}
                </td>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                    borderTop: '1px solid #E5E7EB',
                    height: '40px',
                  }}
                >
                  {renderWorkflowStatus()}
                </td>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                    borderTop: '1px solid #E5E7EB',
                    height: '40px',
                  }}
                >
                  {renderWorkflowStatus()}
                </td>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    verticalAlign: 'middle',
                    textAlign: 'center',
                    backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                    borderTop: '1px solid #E5E7EB',
                    height: '40px',
                  }}
                >
                  {renderWorkflowStatus()}
                </td>
                <td
                  style={{
                    padding: '0.75rem 1rem',
                    verticalAlign: 'middle',
                    backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                    borderTop: '1px solid #E5E7EB',
                    height: '40px',
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                    strokeWidth="2"
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Filter Dropdown */}
      {openFilterColumn !== null && (
        <FilterDropdown
          ref={filterDropdownRef}
          columnKey={openFilterColumn}
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          onClose={() => setOpenFilterColumn(null)}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Key */}
      <div
        style={{
          marginTop: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <span
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: isDarkMode ? '#E5E7EB' : '#374151',
          }}
        >
          Key:
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '20px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D1D5DB',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontSize: '14px',
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            Not Started
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '20px',
              backgroundColor: '#3B82F6',
              border: 'none',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontSize: '14px',
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            In Progress
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '20px',
              backgroundColor: '#10B981',
              border: 'none',
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontSize: '14px',
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            Completed
          </span>
        </div>
      </div>
    </div>
  );
};

// FilterDropdown Component
const FilterDropdown = React.forwardRef(({ columnKey, filterIconRef, onClose, isDarkMode }, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [filterField, setFilterField] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    if (filterIconRef) {
      const rect = filterIconRef.getBoundingClientRect();
      const dropdownWidth = 320;
      const dropdownHeight = 400;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = rect.left;
      let top = rect.bottom + 8;
      
      // Adjust if dropdown goes off right edge
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 16;
      }
      
      // Adjust if dropdown goes off bottom
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 8;
      }
      
      // Don't go off left edge
      if (left < 16) {
        left = 16;
      }
      
      // Don't go off top edge
      if (top < 16) {
        top = 16;
      }
      
      setPosition({ top, left });
    }
  }, [filterIconRef]);

  const handleClear = () => {
    setSortField('');
    setSortOrder('');
  };

  const handleReset = () => {
    setSortField('');
    setSortOrder('');
    setFilterField('');
    setFilterCondition('');
    setFilterValue('');
  };

  const handleApply = () => {
    // Apply filter logic here
    onClose();
  };

  const sortFields = [
    { value: 'status', label: 'Status' },
    { value: 'shipment', label: 'Shipment' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'account', label: 'Account' },
  ];

  const sortOrders = [
    { value: 'asc', label: 'Sort ascending (A to Z)', icon: 'A^Z' },
    { value: 'desc', label: 'Sort descending (Z to A)', icon: 'Z^A' },
  ];

  const filterFields = [
    { value: '', label: 'Select field' },
    { value: 'status', label: 'Status' },
    { value: 'shipment', label: 'Shipment' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'account', label: 'Account' },
    { value: 'addProducts', label: 'Add Products' },
    { value: 'formulaCheck', label: 'Formula Check' },
    { value: 'labelCheck', label: 'Label Check' },
    { value: 'sortProducts', label: 'Sort Products' },
    { value: 'sortFormulas', label: 'Sort Formulas' },
  ];

  const filterConditions = [
    { value: '', label: 'Select condition' },
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'lessThan', label: 'Less than' },
  ];

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '320px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid #E5E7EB',
        zIndex: 10000,
        padding: '16px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Sort by section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>
            Sort by:
          </label>
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#3B82F6',
              fontSize: '0.875rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Clear
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="">Select field</option>
            {sortFields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: sortOrder ? '1px solid #3B82F6' : '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="">Select order</option>
            {sortOrders.map((order) => (
              <option key={order.value} value={order.value}>
                {order.icon} {order.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter by condition section */}
      <div style={{ marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
          Filter by condition:
        </label>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: filterField ? '#374151' : '#9CA3AF',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {filterFields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          
          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: filterCondition ? '#374151' : '#9CA3AF',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {filterConditions.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </select>
          
          <input
            type="text"
            placeholder="Value here..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              backgroundColor: '#FFFFFF',
            }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
        <button
          type="button"
          onClick={handleReset}
          style={{
            padding: '8px 16px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            color: '#374151',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleApply}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
});

FilterDropdown.displayName = 'FilterDropdown';

export default ArchiveTable;

