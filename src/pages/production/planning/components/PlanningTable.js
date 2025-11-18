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
    <div
      className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl shadow-sm`}
      style={{ overflowX: 'auto', position: 'relative' }}
    >
      {/* Use max-content so table matches exact column widths without extra empty space */}
      <table style={{ width: 'max-content', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead className={themeClasses.headerBg}>
          <tr>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '0.75rem 1rem',
                width: '180px',
                height: '40px',
                position: 'sticky',
                left: 0,
                zIndex: 20,
                backgroundColor: '#1C2634',
                borderRight: `1px solid ${columnBorderColor}`,
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
                <span style={{ color: (isFilterActive('brand') || openFilterColumn === 'brand') ? '#007AFF' : '#FFFFFF' }}>
                  Brand
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['brand'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('brand') || openFilterColumn === 'brand')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('brand', e)}
                  style={
                    (isFilterActive('brand') || openFilterColumn === 'brand')
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
                width: '220px',
                height: '40px',
                position: 'sticky',
                left: 180,
                zIndex: 20,
                backgroundColor: '#1C2634',
                borderRight: `1px solid ${columnBorderColor}`,
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
                <span style={{ color: (isFilterActive('product') || openFilterColumn === 'product') ? '#007AFF' : '#FFFFFF' }}>
                  Product
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['product'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('product') || openFilterColumn === 'product')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('product', e)}
                  style={
                    (isFilterActive('product') || openFilterColumn === 'product')
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
                width: '120px',
                height: '40px',
                position: 'sticky',
                left: 400,
                zIndex: 20,
                backgroundColor: '#1C2634',
                borderRight: `1px solid ${columnBorderColor}`,
                boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
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
                <span style={{ color: (isFilterActive('size') || openFilterColumn === 'size') ? '#007AFF' : '#FFFFFF' }}>
                  Size
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['size'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('size') || openFilterColumn === 'size')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('size', e)}
                  style={
                    (isFilterActive('size') || openFilterColumn === 'size')
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
                width: '150px',
                height: '40px',
                borderRight: `1px solid ${columnBorderColor}`,
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
                <span style={{ color: (isFilterActive('doiFba') || openFilterColumn === 'doiFba') ? '#007AFF' : '#FFFFFF' }}>
                  DOI FBA
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['doiFba'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('doiFba') || openFilterColumn === 'doiFba')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('doiFba', e)}
                  style={
                    (isFilterActive('doiFba') || openFilterColumn === 'doiFba')
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
                width: '150px',
                height: '40px',
                borderRight: `1px solid ${columnBorderColor}`,
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
                <span style={{ color: (isFilterActive('doiTotal') || openFilterColumn === 'doiTotal') ? '#007AFF' : '#FFFFFF' }}>
                  DOI Total
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['doiTotal'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('doiTotal') || openFilterColumn === 'doiTotal')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('doiTotal', e)}
                  style={
                    (isFilterActive('doiTotal') || openFilterColumn === 'doiTotal')
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
                width: '150px',
                height: '40px',
                borderRight: `1px solid ${columnBorderColor}`,
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
                <span
                  style={{ color: (isFilterActive('inventory') || openFilterColumn === 'inventory') ? '#007AFF' : '#FFFFFF' }}
                >
                  Inventory
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['inventory'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('inventory') || openFilterColumn === 'inventory')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('inventory', e)}
                  style={
                    (isFilterActive('inventory') || openFilterColumn === 'inventory')
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
                width: '150px',
                height: '40px',
                borderRight: `1px solid ${columnBorderColor}`,
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
                <span style={{ color: (isFilterActive('forecast') || openFilterColumn === 'forecast') ? '#007AFF' : '#FFFFFF' }}>
                  Forecast
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['forecast'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('forecast') || openFilterColumn === 'forecast')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('forecast', e)}
                  style={
                    (isFilterActive('forecast') || openFilterColumn === 'forecast')
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
                width: '160px',
                height: '40px',
                borderRight: `1px solid ${columnBorderColor}`,
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
                <span style={{ color: (isFilterActive('sales7') || openFilterColumn === 'sales7') ? '#007AFF' : '#FFFFFF' }}>
                  7 Day Sales
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['sales7'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('sales7') || openFilterColumn === 'sales7')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('sales7', e)}
                  style={
                    (isFilterActive('sales7') || openFilterColumn === 'sales7')
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
                width: '170px',
                height: '40px',
                borderRight: `1px solid ${columnBorderColor}`,
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
                <span style={{ color: (isFilterActive('sales30') || openFilterColumn === 'sales30') ? '#007AFF' : '#FFFFFF' }}>
                  30 Day Sales
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['sales30'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('sales30') || openFilterColumn === 'sales30')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('sales30', e)}
                  style={
                    (isFilterActive('sales30') || openFilterColumn === 'sales30')
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
                width: '190px',
                height: '40px',
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
                <span style={{ color: (isFilterActive('formula') || openFilterColumn === 'formula') ? '#007AFF' : '#FFFFFF' }}>
                  Formula
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['formula'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('formula') || openFilterColumn === 'formula')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('formula', e)}
                  style={
                    (isFilterActive('formula') || openFilterColumn === 'formula')
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
              className={`${themeClasses.rowHover} transition-colors duration-150`}
            >
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  zIndex: 10,
                  borderTop: '1px solid #E5E7EB',
                }}
              >
                <span
                  className={themeClasses.text}
                  style={{ fontSize: '0.875rem', fontWeight: 500, color: isDarkMode ? '#FFFFFF' : '#151515' }}
                >
                  {row.brand}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  position: 'sticky',
                  left: 180,
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  zIndex: 10,
                  borderTop: '1px solid #E5E7EB',
                }}
              >
                <button
                  className="text-sm font-medium hover:text-blue-700 truncate"
                  style={{ maxWidth: '220px', color: isDarkMode ? '#FFFFFF' : '#151515' }}
                >
                  {row.product}
                </button>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  position: 'sticky',
                  left: 400,
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  zIndex: 10,
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                  borderTop: '1px solid #E5E7EB',
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.size}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  borderTop: '1px solid #E5E7EB',
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.doiFba}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  borderTop: '1px solid #E5E7EB',
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.doiTotal}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  borderTop: '1px solid #E5E7EB',
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.inventory}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  borderTop: '1px solid #E5E7EB',
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.forecast}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  borderTop: '1px solid #E5E7EB',
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.sales7}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.sales30}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {/* Approximate days of coverage based on 30-day sales */}
                  {row.sales30 > 0
                    ? `${Math.round((row.inventory / row.sales30) * 30)} days`
                    : '—'}
                </span>
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
    { value: 'doiFba', label: 'DOI FBA' },
    { value: 'doiTotal', label: 'DOI Total' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'forecast', label: 'Forecast' },
    { value: 'sales7', label: '7 Day Sales' },
    { value: 'sales30', label: '30 Day Sales' },
  ];

  const sortOrders = [
    { value: 'asc', label: 'Sort ascending (A to Z)', icon: 'A^Z' },
    { value: 'desc', label: 'Sort descending (Z to A)', icon: 'Z^A' },
  ];

  const filterFields = [
    { value: '', label: 'Select field' },
    { value: 'brand', label: 'Brand' },
    { value: 'product', label: 'Product' },
    { value: 'size', label: 'Size' },
    { value: 'doiFba', label: 'DOI FBA' },
    { value: 'doiTotal', label: 'DOI Total' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'forecast', label: 'Forecast' },
    { value: 'sales7', label: '7 Day Sales' },
    { value: 'sales30', label: '30 Day Sales' },
    { value: 'formula', label: 'Formula' },
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

