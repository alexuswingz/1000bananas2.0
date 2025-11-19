import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const PlanningTable = ({ rows, activeFilters, onFilterToggle }) => {
  const { isDarkMode } = useTheme();
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

  const columnBorderColor = isDarkMode ? 'rgba(55, 65, 81, 0.9)' : '#E5E7EB';

  const isFilterActive = (key) => activeFilters.includes(key);

  // Render status icon based on status
  const renderStatusIcon = (status) => {
    const statusLower = (status || 'Packaging').toLowerCase();
    switch (statusLower) {
      case 'packaging':
        // Planning icon image (reusing for Packaging)
        return (
          <img
            src="/assets/Planning icon.png"
            alt="Packaging"
            style={{
              width: '16px',
              height: '16px',
              objectFit: 'contain',
            }}
            onError={(e) => {
              // Fallback if image doesn't load - try URL encoded version
              e.target.src = '/assets/Planning%20icon.png';
            }}
          />
        );
      case 'ready for pickup':
        // Green box icon
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="6"
              y="6"
              width="12"
              height="12"
              rx="2"
              fill="#10B981"
            />
          </svg>
        );
      case 'shipped':
        // Purple truck icon
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 3h15v13H1z"
              fill="#9333EA"
            />
            <path
              d="M16 8h4l3 4v5h-7V8z"
              fill="#9333EA"
            />
            <circle
              cx="6"
              cy="19"
              r="2.5"
              fill="#9333EA"
            />
            <circle
              cx="18"
              cy="19"
              r="2.5"
              fill="#9333EA"
            />
          </svg>
        );
      case 'received':
        // Green checkmark icon
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="#10B981"
            />
            <path
              d="M9 12l2 2 4-4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  // Render status circle based on status
  const renderStatusCircle = (status) => {
    let circleColor;
    let borderStyle = 'none';
    
    switch (status?.toLowerCase()) {
      case 'pending':
        circleColor = '#FFFFFF'; // White/transparent
        borderStyle = '1px solid #D1D5DB'; // Light gray outline
        break;
      case 'in progress':
        circleColor = '#3B82F6'; // Blue
        break;
      case 'completed':
        circleColor = '#10B981'; // Green
        break;
      default:
        circleColor = '#FFFFFF'; // Default to white (Pending)
        borderStyle = '1px solid #D1D5DB'; // Light gray outline
    }

    return (
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '20px',
          backgroundColor: circleColor,
          border: borderStyle,
          display: 'inline-block',
        }}
      />
    );
  };

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

  return (
    <>
      <div
        className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl`}
        style={{ overflowX: 'hidden', position: 'relative' }}
      >
        {/* Table with 100% width to fit container */}
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
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
                <span style={{ color: (isFilterActive('status') || openFilterColumn === 'status') ? '#007AFF' : '#FFFFFF' }}>
                  STATUS
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['status'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('status') || openFilterColumn === 'status')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('status', e)}
                  style={
                    (isFilterActive('status') || openFilterColumn === 'status')
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
                <span style={{ color: (isFilterActive('shipment') || openFilterColumn === 'shipment') ? '#007AFF' : '#FFFFFF' }}>
                  SHIPMENT
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['shipment'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('shipment') || openFilterColumn === 'shipment')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('shipment', e)}
                  style={
                    (isFilterActive('shipment') || openFilterColumn === 'shipment')
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
                <span style={{ color: (isFilterActive('marketplace') || openFilterColumn === 'marketplace') ? '#007AFF' : '#FFFFFF' }}>
                  MARKETPLACE
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['marketplace'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('marketplace') || openFilterColumn === 'marketplace')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('marketplace', e)}
                  style={
                    (isFilterActive('marketplace') || openFilterColumn === 'marketplace')
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
                <span style={{ color: (isFilterActive('account') || openFilterColumn === 'account') ? '#007AFF' : '#FFFFFF' }}>
                  ACCOUNT
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['account'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('account') || openFilterColumn === 'account')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('account', e)}
                  style={
                    (isFilterActive('account') || openFilterColumn === 'account')
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
                width: '10%',
                height: '40px',
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
                <span style={{ color: (isFilterActive('rawmat') || openFilterColumn === 'rawmat') ? '#007AFF' : '#FFFFFF' }}>
                  RAWMAT
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['rawmat'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('rawmat') || openFilterColumn === 'rawmat')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('rawmat', e)}
                  style={
                    (isFilterActive('rawmat') || openFilterColumn === 'rawmat')
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
                width: '10%',
                height: '40px',
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
                <span style={{ color: (isFilterActive('labels') || openFilterColumn === 'labels') ? '#007AFF' : '#FFFFFF' }}>
                  LABELS
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['labels'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('labels') || openFilterColumn === 'labels')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('labels', e)}
                  style={
                    (isFilterActive('labels') || openFilterColumn === 'labels')
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
                width: '13%',
                height: '40px',
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
                <span style={{ color: (isFilterActive('packagingOrder') || openFilterColumn === 'packagingOrder') ? '#007AFF' : '#FFFFFF' }}>
                  PACKAGING ORDER
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['packagingOrder'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('packagingOrder') || openFilterColumn === 'packagingOrder')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('packagingOrder', e)}
                  style={
                    (isFilterActive('packagingOrder') || openFilterColumn === 'packagingOrder')
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
                width: '13%',
                height: '40px',
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
                <span style={{ color: (isFilterActive('manOrder') || openFilterColumn === 'manOrder') ? '#007AFF' : '#FFFFFF' }}>
                  MAN. ORDER
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['manOrder'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('manOrder') || openFilterColumn === 'manOrder')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('manOrder', e)}
                  style={
                    (isFilterActive('manOrder') || openFilterColumn === 'manOrder')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody
          className="divide-y"
          style={{ borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6' }}
        >
          {rows.map((row) => (
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
                    {row.status || 'Packaging'}
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
                  style={{ fontSize: '0.875rem', fontWeight: 500, color: isDarkMode ? '#FFFFFF' : '#151515' }}
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
                  {row.account || 'TPS Nutrients'}
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
                {renderStatusCircle(row.rawmat)}
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
                {renderStatusCircle(row.labels)}
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
                {renderStatusCircle(row.packagingOrder)}
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
                {renderStatusCircle(row.manOrder)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
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
    </div>
    
    {/* Key/Legend - Outside table container */}
    <div
      style={{
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        marginTop: '1rem',
      }}
      className={themeClasses.cardBg}
    >
      <span
        style={{
          fontSize: '0.875rem',
          fontWeight: 500,
          color: isDarkMode ? '#FFFFFF' : '#151515',
        }}
      >
        Key:
      </span>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '20px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
          }}
        />
        <span
          style={{
            fontSize: '0.875rem',
            color: isDarkMode ? '#FFFFFF' : '#151515',
          }}
        >
          Pending
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '20px',
            backgroundColor: '#3B82F6',
          }}
        />
        <span
          style={{
            fontSize: '0.875rem',
            color: isDarkMode ? '#FFFFFF' : '#151515',
          }}
        >
          In Progress
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '20px',
            backgroundColor: '#10B981',
          }}
        />
        <span
          style={{
            fontSize: '0.875rem',
            color: isDarkMode ? '#FFFFFF' : '#151515',
          }}
        >
          Completed
        </span>
      </div>
    </div>
    </>
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
    { value: 'rawmat', label: 'Raw Materials' },
    { value: 'labels', label: 'Labels' },
    { value: 'packagingOrder', label: 'Packaging Order' },
    { value: 'manOrder', label: 'Manufacturing Order' },
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

export default PlanningTable;
