import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const VineTrackerTable = ({ rows, searchValue, onUpdateRow, onAddNewRow }) => {
  const { isDarkMode } = useTheme();
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ field: '', order: '' });
  const [sortedRowOrder, setSortedRowOrder] = useState(null);
  const [productSearchValue, setProductSearchValue] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [openProductDropdownId, setOpenProductDropdownId] = useState(null);
  const [productDropdownSearchValue, setProductDropdownSearchValue] = useState('');
  const productInputRefs = useRef({});

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#334155]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  const columnBorderColor = isDarkMode ? 'rgba(55, 65, 81, 0.9)' : '#E5E7EB';

  const isFilterActive = (key) => {
    const hasFilter = filters[key] !== undefined;
    const hasSorting = sortConfig.field === key && sortConfig.order !== '';
    return hasFilter || hasSorting;
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
      
      // Close product dropdown when clicking outside
      if (showProductDropdown && !event.target.closest('[data-product-dropdown]')) {
        setShowProductDropdown(false);
      }
      
      // Close product dropdown for new rows when clicking outside
      if (openProductDropdownId !== null) {
        const dropdownElement = document.getElementById(`product-dropdown-${openProductDropdownId}`);
        const triggerElement = productInputRefs.current[openProductDropdownId];
        
        if (triggerElement && dropdownElement) {
          const isClickInsideTrigger = triggerElement.contains(event.target);
          const isClickInsideDropdown = dropdownElement.contains(event.target);
          
          if (!isClickInsideTrigger && !isClickInsideDropdown) {
            setOpenProductDropdownId(null);
            setProductDropdownSearchValue('');
          }
        } else if (triggerElement) {
          const isClickInsideTrigger = triggerElement.contains(event.target);
          if (!isClickInsideTrigger) {
            setOpenProductDropdownId(null);
            setProductDropdownSearchValue('');
          }
        }
      }
    };

    if (openFilterColumn !== null || showProductDropdown || openProductDropdownId !== null) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterColumn, showProductDropdown, openProductDropdownId]);

  // Handle filter icon click
  const handleFilterClick = (columnKey, e) => {
    e.stopPropagation();
    setOpenFilterColumn(openFilterColumn === columnKey ? null : columnKey);
  };

  // Handle filter apply
  const handleApplyFilter = (filterConfig) => {
    const filtersToUse = { ...filters };
    if (filterConfig.filterField && filterConfig.filterCondition && filterConfig.filterValue) {
      filtersToUse[filterConfig.filterField] = {
        condition: filterConfig.filterCondition,
        value: filterConfig.filterValue,
      };
    }
    
    if (filterConfig.sortField && filterConfig.sortOrder) {
      setSortConfig({ field: filterConfig.sortField, order: filterConfig.sortOrder });
      
      let rowsToSort = [...rows];
      
      Object.keys(filtersToUse).forEach(field => {
        const filter = filtersToUse[field];
        rowsToSort = rowsToSort.filter(row => {
          const value = row[field];
          const filterValue = filter.value.toLowerCase();
          const rowValue = String(value || '').toLowerCase();

          switch (filter.condition) {
            case 'equals':
              return rowValue === filterValue;
            case 'contains':
              return rowValue.includes(filterValue);
            case 'startsWith':
              return rowValue.startsWith(filterValue);
            case 'endsWith':
              return rowValue.endsWith(filterValue);
            default:
              return true;
          }
        });
      });

      const numeric = ['claimed', 'enrolled'].includes(filterConfig.sortField);
      
      rowsToSort.sort((a, b) => {
        let aVal = a[filterConfig.sortField];
        let bVal = b[filterConfig.sortField];

        if (numeric) {
          const aNum = Number(aVal) || 0;
          const bNum = Number(bVal) || 0;
          return filterConfig.sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
        }

        const aStr = String(aVal ?? '').toLowerCase();
        const bStr = String(bVal ?? '').toLowerCase();
        return filterConfig.sortOrder === 'asc'
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
      
      const sortedIds = rowsToSort.map(row => row.id);
      setSortedRowOrder(sortedIds);
    }
    
    setFilters(filtersToUse);
    setOpenFilterColumn(null);
  };

  // Handle filter reset
  const handleResetFilter = (columnKey) => {
    const newFilters = { ...filters };
    delete newFilters[columnKey];
    setFilters(newFilters);
    
    if (sortConfig.field === columnKey) {
      setSortConfig({ field: '', order: '' });
      setSortedRowOrder(null);
    }
  };

  // Get filtered and sorted rows
  const getFilteredAndSortedRows = () => {
    let filteredRows = [...rows];

    // Apply search filter
    if (searchValue) {
      const searchLower = searchValue.toLowerCase();
      filteredRows = filteredRows.filter(row => {
        return (
          (row.productName || '').toLowerCase().includes(searchLower) ||
          (row.brand || '').toLowerCase().includes(searchLower) ||
          (row.asin || '').toLowerCase().includes(searchLower) ||
          (row.status || '').toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply filters
    Object.keys(filters).forEach(field => {
      const filter = filters[field];
      filteredRows = filteredRows.filter(row => {
        const value = row[field];
        const filterValue = filter.value.toLowerCase();
        const rowValue = String(value || '').toLowerCase();

        switch (filter.condition) {
          case 'equals':
            return rowValue === filterValue;
          case 'contains':
            return rowValue.includes(filterValue);
          case 'startsWith':
            return rowValue.startsWith(filterValue);
          case 'endsWith':
            return rowValue.endsWith(filterValue);
          default:
            return true;
        }
      });
    });

    // Apply sorting
    if (sortedRowOrder) {
      const sortedMap = new Map(sortedRowOrder.map((id, index) => [id, index]));
      filteredRows.sort((a, b) => {
        const aIndex = sortedMap.get(a.id) ?? Infinity;
        const bIndex = sortedMap.get(b.id) ?? Infinity;
        return aIndex - bIndex;
      });
    }

    return filteredRows;
  };

  const displayRows = getFilteredAndSortedRows();

  const columns = [
    { key: 'status', label: 'STATUS', width: 200, align: 'left' },
    { key: 'productName', label: 'PRODUCT NAME', width: 400, align: 'left' },
    { key: 'launchDate', label: 'LAUNCH DATE', width: 150, align: 'left' },
    { key: 'claimed', label: 'CLAIMED', width: 120, align: 'center' },
    { key: 'enrolled', label: 'ENROLLED', width: 120, align: 'center' },
    { key: 'action', label: 'ACTIONS', width: 100, align: 'center' },
  ];

  return (
    <div
      className="border rounded-xl"
      style={{ 
        overflowX: 'hidden',
        overflowY: 'visible',
        position: 'relative',
        backgroundColor: '#111827',
        borderColor: '#111827',
        borderWidth: '1px',
        borderStyle: 'solid',
        minHeight: 'auto',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'auto', display: 'table' }}>
        <thead style={{ backgroundColor: '#111827' }}>
          <tr style={{ borderBottom: '1px solid #374151', height: 'auto' }}>
            {columns.map((col, index) => (
              <th
                key={col.key}
                className={`${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                } text-xs font-bold text-white uppercase tracking-wider group cursor-pointer`}
                style={{
                  padding: '1rem 1rem',
                  width: `${col.width}px`,
                  height: 'auto',
                  backgroundColor: '#111827',
                  borderRight: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      col.align === 'right'
                        ? 'flex-end'
                        : col.align === 'center'
                        ? 'center'
                        : 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      color: (isFilterActive(col.key) || openFilterColumn === col.key) ? '#007AFF' : '#9CA3AF',
                    }}
                  >
                    {col.label}
                  </span>
                  {col.key !== 'action' && (
                    <img
                      ref={(el) => { if (el) filterIconRefs.current[col.key] = el; }}
                      src="/assets/Vector (1).png"
                      alt="Filter"
                      className={`w-3 h-3 transition-opacity cursor-pointer ${
                        (isFilterActive(col.key) || openFilterColumn === col.key)
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                      onClick={(e) => handleFilterClick(col.key, e)}
                      style={
                        (isFilterActive(col.key) || openFilterColumn === col.key)
                          ? {
                              filter:
                                'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                            }
                          : undefined
                      }
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          style={{ borderColor: '#374151', display: 'table-row-group' }}
        >
          {displayRows.length === 0 ? (
            <tr style={{ backgroundColor: '#111827' }}>
              <td colSpan={columns.length} style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', backgroundColor: '#111827' }}>
                No vine products found
              </td>
            </tr>
          ) : (
            displayRows.map((row) => {
              const statusColor = row.statusColor || '#3B82F6';
              const isNewRow = row.isNew;
              
              return (
                <tr
                  key={row.id}
                  style={{
                    backgroundColor: '#111827',
                    height: 'auto',
                    minHeight: '40px',
                    position: 'relative',
                    display: 'table-row',
                  }}
                >
                  {/* STATUS */}
                  <td
                    style={{
                      padding: '0.75rem 1.25rem',
                      verticalAlign: 'middle',
                      backgroundColor: '#111827',
                      borderTop: 'none',
                      height: 'auto',
                      minHeight: '40px',
                      display: 'table-cell',
                    }}
                  >
                    {isNewRow ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: '#374151',
                          minWidth: '137px',
                          width: '100%',
                          maxWidth: '171.5px',
                          height: '32px',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                        }}
                      >
                        <svg
                          style={{ width: '1rem', height: '1rem' }}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={statusColor}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2v20M12 2L8 6l4-4 4 4M12 22l-4-4 4 4 4-4M2 12h20M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" />
                        </svg>
                        <span
                          style={{ 
                            fontSize: '0.875rem', 
                            fontWeight: 500, 
                            color: '#FFFFFF',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row.status || 'Awaiting Reviews'}
                        </span>
                        <svg
                          style={{ width: '0.85rem', height: '0.85rem', marginLeft: 'auto' }}
                          fill="none"
                          stroke="#FFFFFF"
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
                    ) : (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: '#374151',
                          minWidth: '137px',
                          width: '100%',
                          maxWidth: '171.5px',
                          height: '24px',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                        }}
                      >
                        {/* Status icon - snowflake */}
                        <svg
                          style={{ width: '1rem', height: '1rem' }}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={statusColor}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2v20M12 2L8 6l4-4 4 4M12 22l-4-4 4 4 4-4M2 12h20M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" />
                        </svg>
                        <span
                          style={{ 
                            fontSize: '0.875rem', 
                            fontWeight: 500, 
                            color: '#FFFFFF',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row.status || 'Awaiting Reviews'}
                        </span>
                        <svg
                          style={{ width: '0.85rem', height: '0.85rem', marginLeft: 'auto' }}
                          fill="none"
                          stroke="#FFFFFF"
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
                    )}
                  </td>

                  {/* PRODUCT NAME */}
                  <td
                    style={{
                      padding: '0.75rem 1.25rem',
                      verticalAlign: 'middle',
                      backgroundColor: '#111827',
                      borderTop: 'none',
                      height: 'auto',
                      minHeight: '40px',
                      display: 'table-cell',
                      position: 'relative',
                    }}
                    onClick={(e) => {
                      // Don't trigger row expansion when clicking on product dropdown
                      if (e.target.closest('[data-product-dropdown-trigger]') || e.target.closest('[data-product-dropdown-main]')) {
                        e.stopPropagation();
                      }
                    }}
                  >
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', width: '100%' }}
                    >
                      {/* Product Image - Hide for new rows */}
                      {!isNewRow && (
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          minWidth: '40px', 
                          borderRadius: '4px', 
                          overflow: 'hidden', 
                          backgroundColor: '#374151', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          flexShrink: 0,
                        }}>
                          {row.imageUrl || row.image ? (
                            <img 
                              src={row.imageUrl || row.image} 
                              alt={row.productName} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                              onError={(e) => { 
                                e.target.style.display = 'none'; 
                              }} 
                            />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#9CA3AF', fontSize: '10px' }}>
                              No img
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Product Info */}
                      {isNewRow ? (
                        // Input field with dropdown for new rows
                        <div style={{ position: 'relative', flex: 1, minWidth: 0, cursor: 'pointer' }}>
                          <div style={{ position: 'relative', width: '100%', maxWidth: '800px' }}>
                            <input
                              ref={(el) => { if (el) productInputRefs.current[row.id] = el; }}
                              type="text"
                              value={row.productName || ''}
                              placeholder="Select Product"
                              readOnly
                              onFocus={() => setOpenProductDropdownId(row.id)}
                              onClick={() => setOpenProductDropdownId(row.id)}
                              style={{
                                width: '100%',
                                padding: '6px 32px 6px 12px',
                                borderRadius: '4px',
                                border: '1px solid #374151',
                                borderWidth: '1px',
                                backgroundColor: '#374151',
                                color: row.productName ? '#FFFFFF' : '#9CA3AF',
                                fontSize: '0.875rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                                whiteSpace: 'nowrap',
                                overflow: 'visible',
                                textOverflow: 'clip',
                                cursor: 'pointer',
                              }}
                            />
                            <svg
                              style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: '0.85rem',
                                height: '0.85rem',
                                pointerEvents: 'none',
                              }}
                              fill="none"
                              stroke="#FFFFFF"
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
                          
                          {/* Product Dropdown */}
                          {openProductDropdownId === row.id && productInputRefs.current[row.id] && (
                            <div
                              id={`product-dropdown-${row.id}`}
                              style={{
                                position: 'fixed',
                                top: (productInputRefs.current[row.id]?.getBoundingClientRect()?.bottom || 0) + 4 + 'px',
                                left: (productInputRefs.current[row.id]?.getBoundingClientRect()?.left || 0) + 'px',
                                width: (productInputRefs.current[row.id]?.getBoundingClientRect()?.width || 800) + 'px',
                                height: '392px',
                                backgroundColor: '#111827',
                                border: '1px solid #374151',
                                borderRadius: '4px',
                                borderWidth: '1px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                zIndex: 9999,
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Search Input */}
                              <div style={{ 
                                padding: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#1F2937',
                                borderBottom: '1px solid #374151',
                                flexShrink: 0,
                              }}>
                                <div style={{ position: 'relative', width: (productInputRefs.current[row.id] ? (productInputRefs.current[row.id].getBoundingClientRect().width - 24) + 'px' : '549px'), height: '28px', margin: '0 auto' }}>
                                  <svg
                                    style={{
                                      position: 'absolute',
                                      left: '12px',
                                      top: '50%',
                                      transform: 'translateY(-50%)',
                                      width: '16px',
                                      height: '16px',
                                      pointerEvents: 'none',
                                    }}
                                    fill="none"
                                    stroke="#9CA3AF"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                  </svg>
                                  <input
                                    type="text"
                                    value={productDropdownSearchValue}
                                    onChange={(e) => setProductDropdownSearchValue(e.target.value)}
                                    placeholder="Search..."
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      padding: '6px 12px',
                                      paddingLeft: '38px',
                                      borderRadius: '4px',
                                      border: '1px solid #374151',
                                      borderWidth: '1px',
                                      backgroundColor: '#374151',
                                      color: '#FFFFFF',
                                      fontSize: '0.875rem',
                                      outline: 'none',
                                      boxSizing: 'border-box',
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              
                              {/* Product Options */}
                              <div style={{ 
                                backgroundColor: '#111827',
                                flex: 1,
                                overflowY: 'auto',
                                minHeight: 0,
                                position: 'relative',
                                display: 'block',
                              }}>
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                  <div
                                    key={i}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const selectedProduct = {
                                        productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
                                        brand: 'TPS Nutrients',
                                        size: '8oz',
                                        asin: 'B0C73TDZCQ',
                                      };
                                      if (onUpdateRow) {
                                        onUpdateRow({ ...row, ...selectedProduct });
                                      }
                                      setOpenProductDropdownId(null);
                                      setProductDropdownSearchValue('');
                                    }}
                                    style={{
                                      padding: '14px 12px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '12px',
                                      cursor: 'pointer',
                                      borderBottom: i < 6 ? '1px solid #1F2937' : 'none',
                                      backgroundColor: 'transparent',
                                      transition: 'background-color 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1F2937'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <div style={{ 
                                      width: '48px', 
                                      height: '48px', 
                                      borderRadius: '6px', 
                                      backgroundColor: '#374151', 
                                      flexShrink: 0,
                                      overflow: 'hidden',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}>
                                      <div style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        backgroundColor: '#FFFFFF',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }}>
                                        <div style={{ 
                                          width: '40px', 
                                          height: '40px', 
                                          backgroundColor: '#E5E7EB',
                                          borderRadius: '4px',
                                        }} />
                                      </div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ 
                                        fontSize: '0.875rem', 
                                        fontWeight: 500,
                                        color: '#FFFFFF', 
                                        marginBottom: '4px', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap',
                                        lineHeight: '1.4',
                                      }}>
                                        Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)
                                      </div>
                                      <div style={{ 
                                        fontSize: '0.75rem', 
                                        color: '#9CA3AF',
                                        lineHeight: '1.4',
                                      }}>
                                        TPS Nutrients • 8oz • B0C73TDZCQ
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        // Normal display for existing rows
                        <div 
                          style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '4px', 
                            flex: 1, 
                            minWidth: 0,
                          }}
                        >
                          <span 
                            style={{ 
                              fontSize: '0.875rem', 
                              fontWeight: 500, 
                              color: '#FFFFFF',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {row.productName || 'N/A'}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                            {row.brand || 'N/A'} • {row.size || 'N/A'} • {row.asin || 'N/A'}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* LAUNCH DATE */}
                  <td
                    style={{
                      padding: '0.75rem 1.25rem',
                      verticalAlign: 'middle',
                      textAlign: 'center',
                      backgroundColor: '#111827',
                      borderTop: 'none',
                      height: 'auto',
                      minHeight: '40px',
                      display: 'table-cell',
                    }}
                  >
                    {isNewRow ? (
                      <input
                        type="text"
                        value={row.launchDate || ''}
                        placeholder="MM/DD/YYYY"
                        onChange={(e) => {
                          if (onUpdateRow) {
                            onUpdateRow({ ...row, launchDate: e.target.value });
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid #374151',
                          backgroundColor: '#374151',
                          color: '#FFFFFF',
                          fontSize: '0.875rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.875rem', color: '#FFFFFF' }}>
                        {row.launchDate || 'N/A'}
                      </span>
                    )}
                  </td>

                  {/* CLAIMED */}
                  <td
                    style={{
                      padding: '0.75rem 1.25rem',
                      verticalAlign: 'middle',
                      textAlign: 'center',
                      backgroundColor: '#111827',
                      borderTop: 'none',
                      height: 'auto',
                      minHeight: '40px',
                      display: 'table-cell',
                    }}
                  >
                    {isNewRow ? (
                      <input
                        type="number"
                        value={row.claimed || 0}
                        onChange={(e) => {
                          if (onUpdateRow) {
                            onUpdateRow({ ...row, claimed: parseInt(e.target.value) || 0 });
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid #374151',
                          backgroundColor: '#374151',
                          color: '#FFFFFF',
                          fontSize: '0.875rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.875rem', color: '#FFFFFF' }}>
                        {row.claimed || 0}
                      </span>
                    )}
                  </td>

                  {/* ENROLLED */}
                  <td
                    style={{
                      padding: '0.75rem 1.25rem',
                      verticalAlign: 'middle',
                      textAlign: 'center',
                      backgroundColor: '#111827',
                      borderTop: 'none',
                      height: 'auto',
                      minHeight: '40px',
                      display: 'table-cell',
                    }}
                  >
                    {isNewRow ? (
                      <input
                        type="number"
                        value={row.enrolled || 0}
                        onChange={(e) => {
                          if (onUpdateRow) {
                            onUpdateRow({ ...row, enrolled: parseInt(e.target.value) || 0 });
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: '1px solid #374151',
                          backgroundColor: '#374151',
                          color: '#FFFFFF',
                          fontSize: '0.875rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: '0.875rem', color: '#FFFFFF' }}>
                        {row.enrolled || 0}
                      </span>
                    )}
                  </td>

                  {/* ACTIONS */}
                  <td
                    style={{
                      padding: '0.75rem 1.25rem',
                      verticalAlign: 'middle',
                      textAlign: 'center',
                      backgroundColor: '#111827',
                      borderTop: 'none',
                      height: 'auto',
                      minHeight: '40px',
                      display: 'table-cell',
                    }}
                  >
                    {isNewRow ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateRow) {
                            // Remove isNew flag and save the row
                            const savedRow = { ...row, isNew: false };
                            onUpdateRow(savedRow);
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: '#3B82F6',
                          color: '#FFFFFF',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          boxSizing: 'border-box',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3B82F6'}
                      >
                        Create
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {/* Plus icon */}
                        <button
                          type="button"
                          data-no-expand
                          className="hover:bg-gray-800 transition-colors"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '9999px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: 'transparent',
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                        
                        {/* Three dots icon */}
                        <button
                          type="button"
                          data-no-expand
                          className="hover:bg-gray-800 transition-colors"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '9999px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: 'transparent',
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      
      {/* Filter Dropdown - Simplified version */}
      {openFilterColumn && (
        <div
          ref={filterDropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
            borderRadius: '8px',
            padding: '12px',
            minWidth: '200px',
            zIndex: 1000,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '8px' }}>
            Filter options coming soon
          </div>
          <button
            onClick={() => setOpenFilterColumn(null)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              color: isDarkMode ? '#F9FAFB' : '#111827',
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default VineTrackerTable;

