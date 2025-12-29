import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ShipmentsTable = ({ shipments, activeFilters, onFilterToggle }) => {
  const { isDarkMode } = useTheme();
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ field: '', order: '' });
  const [sortedRowOrder, setSortedRowOrder] = useState(null); // Store sorted row IDs for one-time sort

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#1C2634]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  const columnBorderColor = isDarkMode ? 'rgba(55, 65, 81, 0.9)' : '#E5E7EB';

  const isFilterActive = (key) => {
    const hasFilter = filters[key] !== undefined;
    const hasSorting = sortConfig.field === key && sortConfig.order !== '';
    return hasFilter || hasSorting || activeFilters.includes(key);
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

  // Handle filter apply
  const handleApplyFilter = (filterConfig) => {
    // Prepare filter values to use for sorting (use new values from config if provided, otherwise current state)
    const filtersToUse = { ...filters };
    if (filterConfig.filterField && filterConfig.filterCondition && filterConfig.filterValue) {
      filtersToUse[filterConfig.filterField] = {
        condition: filterConfig.filterCondition,
        value: filterConfig.filterValue,
      };
    }
    
    // Update sort config
    if (filterConfig.sortField && filterConfig.sortOrder) {
      setSortConfig({ field: filterConfig.sortField, order: filterConfig.sortOrder });
      
      // Perform one-time sort and store the order
      let rowsToSort = [...shipments];
      
      // Apply filters
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
            case 'greaterThan':
              return rowValue > filterValue;
            case 'lessThan':
              return rowValue < filterValue;
            default:
              return true;
          }
        });
      });
      
      // Apply sorting
      rowsToSort.sort((a, b) => {
        // Special handling for date sorting
        if (filterConfig.sortField === 'shipmentDate' && a.shipmentDate && b.shipmentDate) {
          const aDate = new Date(a.shipmentDate);
          const bDate = new Date(b.shipmentDate);
          return filterConfig.sortOrder === 'asc' 
            ? aDate - bDate 
            : bDate - aDate;
        }
        
        const aVal = String(a[filterConfig.sortField] || '').toLowerCase();
        const bVal = String(b[filterConfig.sortField] || '').toLowerCase();
        
        if (filterConfig.sortOrder === 'asc') {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });
      
      // Store the sorted order (array of IDs)
      setSortedRowOrder(rowsToSort.map(row => row.id));
    } else {
      // If no sort is being applied, clear the sorted order (filters changed, need to re-sort)
      setSortedRowOrder(null);
    }
    
    // Update filters
    if (filterConfig.filterField && filterConfig.filterCondition && filterConfig.filterValue) {
      setFilters(prev => ({
        ...prev,
        [filterConfig.filterField]: {
          condition: filterConfig.filterCondition,
          value: filterConfig.filterValue,
        }
      }));
      // If filters changed but sort wasn't reapplied, clear sorted order
      if (!filterConfig.sortField || !filterConfig.sortOrder) {
        setSortedRowOrder(null);
      }
    }
  };

  // Handle filter reset
  const handleResetFilter = () => {
    setSortConfig({ field: '', order: '' });
    setSortedRowOrder(null); // Clear stored sorted order
    setFilters({});
  };

  // Apply filters and sorting to rows
  const getFilteredAndSortedRows = () => {
    let filteredRows = [...shipments];

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
          case 'greaterThan':
            return rowValue > filterValue;
          case 'lessThan':
            return rowValue < filterValue;
          default:
            return true;
        }
      });
    });

    // Apply sorting - use stored sorted order if available (one-time sort)
    if (sortedRowOrder && sortedRowOrder.length > 0) {
      // Create a map for quick lookup
      const rowMap = new Map(filteredRows.map(row => [row.id, row]));
      
      // Order rows according to stored sorted order
      const orderedRows = [];
      const remainingRows = [];
      
      sortedRowOrder.forEach(id => {
        if (rowMap.has(id)) {
          orderedRows.push(rowMap.get(id));
          rowMap.delete(id);
        }
      });
      
      // Add any rows that weren't in the original sorted order (new rows)
      rowMap.forEach(row => {
        remainingRows.push(row);
      });
      
      // Sort remaining rows by default (newest first if has date, otherwise by ID)
      remainingRows.sort((a, b) => {
        if (a.shipmentDate && b.shipmentDate) {
          const aDate = new Date(a.shipmentDate);
          const bDate = new Date(b.shipmentDate);
          return bDate - aDate; // Newest first
        }
        return (b.id || 0) - (a.id || 0);
      });
      
      // Combine: sorted rows first, then new rows
      filteredRows = [...orderedRows, ...remainingRows];
    } else if (sortConfig.field && sortConfig.order) {
      // If sort config exists but no stored order, apply sorting (shouldn't happen normally, but fallback)
      filteredRows.sort((a, b) => {
        // Special handling for date sorting
        if (sortConfig.field === 'shipmentDate' && a.shipmentDate && b.shipmentDate) {
          const aDate = new Date(a.shipmentDate);
          const bDate = new Date(b.shipmentDate);
          return sortConfig.order === 'asc' 
            ? aDate - bDate 
            : bDate - aDate;
        }
        
        const aVal = String(a[sortConfig.field] || '').toLowerCase();
        const bVal = String(b[sortConfig.field] || '').toLowerCase();
        
        if (sortConfig.order === 'asc') {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });
    } else {
      // Default sort by shipmentDate DESC (newest first) when no user sort is applied
      filteredRows.sort((a, b) => {
        if (a.shipmentDate && b.shipmentDate) {
          const aDate = new Date(a.shipmentDate);
          const bDate = new Date(b.shipmentDate);
          return bDate - aDate; // Newest first
        }
        // Fallback to ID if no timestamp
        return (b.id || 0) - (a.id || 0);
      });
    }

    return filteredRows;
  };

  const displayRows = getFilteredAndSortedRows();

  const columns = [
    { key: 'status', label: 'Status', width: 160, align: 'left' },
    { key: 'marketplace', label: 'Marketplace', width: 140, align: 'left' },
    { key: 'account', label: 'Account', width: 180, align: 'left' },
    { key: 'shipmentDate', label: 'Shipment #', width: 160, align: 'left' },
    { key: 'shipmentType', label: 'Shipment Type', width: 160, align: 'left' },
    { key: 'amznShipment', label: 'Amzn Shipment #', width: 200, align: 'left' },
    { key: 'amznRefId', label: 'Amzn Ref ID', width: 160, align: 'left' },
    { key: 'action', label: 'Action', width: 100, align: 'center' },
  ];

  return (
    <div
      className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl shadow-sm`}
      style={{ position: 'relative' }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
        }}
      >
        <thead className={themeClasses.headerBg}>
          <tr>
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
                  padding: '0.75rem 1rem',
                  width: `${col.width}px`,
                  borderRight:
                    index < columns.length - 1 ? `1px solid ${columnBorderColor}` : undefined,
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
                      color: (isFilterActive(col.key) || openFilterColumn === col.key) ? '#007AFF' : '#FFFFFF',
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
          className="divide-y"
          style={{ borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6' }}
        >
          {displayRows.map((row) => {
            const hasComment = row.formulaCheckComment || row.labelCheckComment;
            const statusColor = hasComment ? '#F59E0B' : (row.statusColor || '#10B981');

            return (
            <tr
              key={row.id}
              className={`${themeClasses.rowHover} transition-colors duration-150`}
            >
              {/* Status with badge and chevron */}
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    padding: '0.35rem 0.9rem',
                    borderRadius: '9999px',
                    border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                    backgroundColor: isDarkMode ? '#020617' : '#FFFFFF',
                    boxShadow: isDarkMode
                      ? '0 1px 2px rgba(0,0,0,0.6)'
                      : '0 1px 2px rgba(15,23,42,0.08)',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: isDarkMode ? '#F9FAFB' : '#151515',
                    minWidth: '170px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    {/* Status icon */}
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    <svg
                      style={{ width: '1rem', height: '1rem' }}
                        viewBox="0 0 24 24"
                        fill={statusColor}
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="12" cy="12" r="8" fill={statusColor} />
                      </svg>
                      {hasComment && (
                        <svg
                          style={{ width: '0.65rem', height: '0.65rem', position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                      )}
                    </div>
                    <span>{row.status}</span>
                  </span>
                  {/* Chevron */}
                  <svg
                    style={{ width: '0.85rem', height: '0.85rem' }}
                    fill="none"
                    stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
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
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.marketplace}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.account}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.shipmentDate}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.shipmentType}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.amznShipment}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.amznRefId}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  borderTop: '1px solid #E5E7EB',
                }}
              >
                <button
                  type="button"
                  className="hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src="/assets/Icons.png"
                    alt="Actions"
                    style={{ width: '1rem', height: '1rem', objectFit: 'contain' }}
                  />
                </button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Filter Dropdown */}
      {openFilterColumn && (
        <FilterDropdown
          ref={filterDropdownRef}
          columnKey={openFilterColumn}
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          onClose={() => setOpenFilterColumn(null)}
          onApply={handleApplyFilter}
          onReset={handleResetFilter}
          currentSort={sortConfig}
          currentFilters={filters}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

// FilterDropdown Component
const FilterDropdown = React.forwardRef(({ columnKey, filterIconRef, onClose, onApply, onReset, currentSort, currentFilters, isDarkMode }, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [sortField, setSortField] = useState(currentSort?.field || '');
  const [sortOrder, setSortOrder] = useState(currentSort?.order || '');
  
  // Initialize filter fields from current filters if they exist
  const existingFilter = currentFilters ? Object.entries(currentFilters)[0] : null;
  const [filterField, setFilterField] = useState(existingFilter ? existingFilter[0] : '');
  const [filterCondition, setFilterCondition] = useState(existingFilter ? existingFilter[1].condition : '');
  const [filterValue, setFilterValue] = useState(existingFilter ? existingFilter[1].value : '');

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

  const handleLocalReset = () => {
    setSortField('');
    setSortOrder('');
    setFilterField('');
    setFilterCondition('');
    setFilterValue('');
    if (onReset) {
      onReset();
    }
    onClose();
  };

  const handleLocalApply = () => {
    if (onApply) {
      const applyData = {
        sortField,
        sortOrder,
        filterField,
        filterCondition,
        filterValue,
      };
      onApply(applyData);
    }
    onClose();
  };

  const sortFields = [
    { value: 'status', label: 'Status' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'account', label: 'Account' },
    { value: 'shipmentDate', label: 'Shipment #' },
    { value: 'shipmentType', label: 'Shipment Type' },
    { value: 'amznShipment', label: 'Amzn Shipment #' },
    { value: 'amznRefId', label: 'Amzn Ref ID' },
  ];

  const sortOrders = [
    { value: 'asc', label: 'Sort ascending (A to Z)', icon: 'A^Z' },
    { value: 'desc', label: 'Sort descending (Z to A)', icon: 'Z^A' },
  ];

  const filterFields = [
    { value: '', label: 'Select field' },
    { value: 'status', label: 'Status' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'account', label: 'Account' },
    { value: 'shipmentDate', label: 'Shipment #' },
    { value: 'shipmentType', label: 'Shipment Type' },
    { value: 'amznShipment', label: 'Amzn Shipment #' },
    { value: 'amznRefId', label: 'Amzn Ref ID' },
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
          onClick={handleLocalReset}
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
          onClick={handleLocalApply}
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

export default ShipmentsTable;

