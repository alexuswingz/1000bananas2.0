import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import SortFormulasFilterDropdown from '../../new-shipment/components/SortFormulasFilterDropdown';

const ManufacturingTable = ({ data = [], searchQuery = '', selectedShipment = '', activeSubTab = 'all' }) => {
  const { isDarkMode } = useTheme();
  const [statusDropdowns, setStatusDropdowns] = useState({});
  const [actionMenuId, setActionMenuId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, right: 0 });
  const actionButtonRefs = useRef({});
  const statusButtonRefs = useRef({});
  const filterIconRefs = useRef({});
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const [filters, setFilters] = useState({});
  const [volumes, setVolumes] = useState({});

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  // Sample data - replace with actual data from props
  const sampleData = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    status: 'Not Started',
    tpsShipNumber: '10-01-2025',
    type: 'AWD',
    formula: 'F.Ultra Grow',
    size: 'Barrel',
    qty: 1,
    tote: 'Clean',
    volume: 275,
    measure: 'Gallons',
  }));

  const tableData = data.length > 0 ? data : sampleData;

  // Filter data based on activeSubTab
  const filteredByType = tableData.filter((row) => {
    if (activeSubTab === 'all') {
      // Exclude AWD type from 'all' tab - it should only show in bottling
      return row.type !== 'AWD';
    }
    if (activeSubTab === 'bottling') {
      return row.type === 'Bottling' || row.type === 'AWD' || row.size?.includes('Bottle') || row.size?.includes('Gallon') || row.size === 'Barrel';
    }
    if (activeSubTab === 'bagging') {
      return row.type === 'Bagging' || row.size?.includes('Bag');
    }
    return true;
  });

  // Filter by search query
  const filteredBySearch = filteredByType.filter((row) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.tpsShipNumber?.toLowerCase().includes(query) ||
      row.type?.toLowerCase().includes(query) ||
      row.formula?.toLowerCase().includes(query) ||
      row.size?.toLowerCase().includes(query)
    );
  });

  // Apply column filters
  const applyConditionFilter = (value, conditionType, conditionValue, isNumeric = false) => {
    if (!conditionType) return true;
    
    const strValue = String(value || '').toLowerCase();
    const strCondition = String(conditionValue || '').toLowerCase();
    
    switch (conditionType) {
      case 'contains':
        return strValue.includes(strCondition);
      case 'notContains':
        return !strValue.includes(strCondition);
      case 'equals':
        if (isNumeric) {
          return Number(value) === Number(conditionValue);
        }
        return strValue === strCondition;
      case 'notEquals':
        if (isNumeric) {
          return Number(value) !== Number(conditionValue);
        }
        return strValue !== strCondition;
      case 'startsWith':
        return strValue.startsWith(strCondition);
      case 'endsWith':
        return strValue.endsWith(strCondition);
      case 'isEmpty':
        return !value || strValue === '';
      case 'isNotEmpty':
        return value && strValue !== '';
      case 'greaterThan':
        return Number(value) > Number(conditionValue);
      case 'lessThan':
        return Number(value) < Number(conditionValue);
      case 'greaterOrEqual':
        return Number(value) >= Number(conditionValue);
      case 'lessOrEqual':
        return Number(value) <= Number(conditionValue);
      default:
        return true;
    }
  };

  const filteredData = filteredBySearch.filter((row) => {
    // Apply column filters
    for (const columnKey of Object.keys(filters)) {
      const filter = filters[columnKey];
      const isNumericColumn = columnKey === 'qty' || columnKey === 'volume';
      
      // Apply value filters (checkbox selections)
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        const rowValue = row[columnKey];
        const matchesValue = filter.selectedValues.has(rowValue) || 
                            filter.selectedValues.has(String(rowValue));
        if (!matchesValue) return false;
      }
      
      // Apply condition filters
      if (filter.conditionType) {
        const matchesCondition = applyConditionFilter(
          row[columnKey],
          filter.conditionType,
          filter.conditionValue,
          isNumericColumn
        );
        if (!matchesCondition) return false;
      }
    }
    return true;
  });

  // Filter by selected shipment
  const finalData = selectedShipment
    ? filteredData.filter((row) => row.tpsShipNumber === selectedShipment)
    : filteredData;

  // Handle click outside status dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(statusDropdowns).forEach((rowId) => {
        const buttonElement = statusButtonRefs.current[rowId];
        if (buttonElement && !buttonElement.contains(event.target)) {
          const dropdown = document.querySelector(`[data-status-dropdown="${rowId}"]`);
          if (dropdown && !dropdown.contains(event.target)) {
            setStatusDropdowns((prev) => {
              const newState = { ...prev };
              delete newState[rowId];
              return newState;
            });
          }
        }
      });
    };

    if (Object.keys(statusDropdowns).length > 0) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [statusDropdowns]);

  // Handle click outside action menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuId) {
        const buttonElement = actionButtonRefs.current[actionMenuId];
        const clickedElement = event.target;
        
        if (buttonElement && !buttonElement.contains(clickedElement)) {
          const menuElement = document.querySelector('[data-action-menu-portal]');
          if (menuElement && !menuElement.contains(clickedElement)) {
            setActionMenuId(null);
          }
        }
      }
    };

    if (actionMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionMenuId]);

  const statusOptions = ['Not Started', 'In Progress', 'Completed', 'On Hold'];

  const handleStatusClick = (rowId, e) => {
    e.stopPropagation();
    setStatusDropdowns((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  const handleStatusSelect = (rowId, status) => {
    // TODO: Update status in backend
    console.log(`Updating status for row ${rowId} to ${status}`);
    setStatusDropdowns((prev) => {
      const newState = { ...prev };
      delete newState[rowId];
      return newState;
    });
  };

  const handleVolumeChange = (rowId, value) => {
    setVolumes((prev) => ({
      ...prev,
      [rowId]: value,
    }));
  };

  const handleFilterClick = (columnKey, e) => {
    e.stopPropagation();
    setOpenFilterColumn(openFilterColumn === columnKey ? null : columnKey);
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    if (openFilterColumn === null) return;
    const handleClickOutside = (event) => {
      const icon = filterIconRefs.current[openFilterColumn];
      if (icon && !icon.contains(event.target)) {
        const dropdown = document.querySelector(`[data-filter-dropdown="${openFilterColumn}"]`);
        if (dropdown && !dropdown.contains(event.target)) {
          setOpenFilterColumn(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openFilterColumn]);

  // Get unique values for a column
  const getColumnValues = (columnKey) => {
    const values = new Set();
    filteredBySearch.forEach(row => {
      const val = row[columnKey];
      if (val !== undefined && val !== null && val !== '') {
        values.add(val);
      }
    });
    // Sort values
    const sortedValues = Array.from(values).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
      }
      return String(a).localeCompare(String(b));
    });
    return sortedValues;
  };

  // Check if a column has active filters
  const hasActiveFilter = (columnKey) => {
    const filter = filters[columnKey];
    if (!filter) return false;
    
    // Handle both Set and Array for selectedValues
    const hasValues = filter.selectedValues && (
      (filter.selectedValues instanceof Set && filter.selectedValues.size > 0) ||
      (Array.isArray(filter.selectedValues) && filter.selectedValues.length > 0)
    );
    const hasCondition = filter.conditionType && filter.conditionType !== '';
    
    return hasValues || hasCondition;
  };

  const handleApplyFilter = (columnKey, filterData) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: filterData,
    }));
  };

  const columns = [
    { key: 'status', label: 'STATUS', width: '190px' },
    { key: 'tpsShipNumber', label: 'TPS SHIP #', width: '160px' },
    { key: 'type', label: 'TYPE', width: '130px' },
    { key: 'formula', label: 'FORMULA', width: '190px' },
    { key: 'size', label: 'SIZE', width: '150px' },
    { key: 'qty', label: 'QTY', width: '110px' },
    { key: 'tote', label: 'TOTE', width: '150px' },
    { key: 'volume', label: 'VOLUME', width: '150px' },
    { key: 'measure', label: 'MEASURE', width: '150px' },
    { key: 'notes', label: 'NOTES', width: '170px' },
  ];

  return (
    <>
      <div
        className={`w-full ${themeClasses.cardBg}`}
        style={{
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div
          className="bg-[#2C3544] border-b border-[#3C4656] w-full"
          style={{ height: '40px', borderRadius: '8px 8px 0 0' }}
        >
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: columns.map((col) => col.width).join(' '),
              gap: '0',
            }}
          >
            {columns.map((column, idx) => {
              const isActive = hasActiveFilter(column.key);
              return (
                <div
                  key={column.key}
                  className="h-full text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center group"
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    position: 'relative',
                    borderRight: idx < columns.length - 1 ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  }}
                >
                  <span
                    style={{
                      color: (isActive || openFilterColumn === column.key) ? '#007AFF' : '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {column.label}
                  </span>
                  <img
                    ref={(el) => {
                      if (el) filterIconRefs.current[column.key] = el;
                    }}
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity cursor-pointer ${
                      (isActive || openFilterColumn === column.key)
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                    onClick={(e) => handleFilterClick(column.key, e)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '12px',
                      height: '12px',
                      flexShrink: 0,
                      ...((isActive || openFilterColumn === column.key)
                        ? {
                            filter:
                              'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                          }
                        : undefined),
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Table body */}
        <div className="w-full">
          {finalData.length === 0 ? (
            <div
              className={`px-6 py-6 text-center text-sm ${themeClasses.textSecondary}`}
            >
              No data available.
            </div>
          ) : (
            finalData.map((row, index) => (
              <div
                key={row.id || index}
                className={`grid text-sm ${themeClasses.cardBg} ${themeClasses.rowHover}`}
                style={{
                  gridTemplateColumns: columns.map((col) => col.width).join(' '),
                  gap: '0',
                  borderBottom: '1px solid #e5e7eb',
                  height: '41px',
                }}
              >
                {/* STATUS */}
                <div
                  className="flex items-center justify-center relative"
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  <button
                    ref={(el) => {
                      if (el) statusButtonRefs.current[row.id] = el;
                    }}
                    onClick={(e) => handleStatusClick(row.id, e)}
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      maxWidth: '135px',
                      minHeight: '24px',
                      height: 'auto',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: '4px',
                      paddingTop: '4px',
                      paddingRight: '12px',
                      paddingBottom: '4px',
                      paddingLeft: '12px',
                      cursor: 'pointer',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)';
                    }}
                  >
                    <input
                      type="radio"
                      checked={false}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '14px',
                        height: '14px',
                        cursor: 'pointer',
                        margin: 0,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 400,
                        color: '#374151',
                        flex: 1,
                        textAlign: 'left',
                        lineHeight: '1',
                      }}
                    >
                      {row.status || 'Not Started'}
                    </span>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 12 12"
                      fill="none"
                      style={{ flexShrink: 0 }}
                    >
                      <path
                        d="M3 4.5L6 7.5L9 4.5"
                        stroke="#6B7280"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  {statusDropdowns[row.id] && (
                    <div
                      data-status-dropdown={row.id}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: '22px',
                        right: '22px',
                        zIndex: 1000,
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden',
                      }}
                    >
                      {statusOptions.map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusSelect(row.id, status)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 12px',
                            fontSize: '14px',
                            color: '#111827',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            borderBottom: status !== statusOptions[statusOptions.length - 1] ? '1px solid #E5E7EB' : 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F3F4F6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* TPS SHIP # */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {row.tpsShipNumber}
                </div>

                {/* TYPE */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {row.type}
                </div>

                {/* FORMULA */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {row.formula}
                </div>

                {/* SIZE */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {row.size}
                </div>

                {/* QTY */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {row.qty}
                </div>

                {/* TOTE */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {row.tote}
                </div>

                {/* VOLUME */}
                <div
                  className="flex items-center justify-center"
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  <input
                    type="text"
                    value={volumes[row.id] !== undefined ? volumes[row.id] : (row.volume || '')}
                    onChange={(e) => handleVolumeChange(row.id, e.target.value)}
                    style={{
                      width: '88px',
                      height: '24px',
                      backgroundColor: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      paddingTop: '4px',
                      paddingRight: '6px',
                      paddingBottom: '4px',
                      paddingLeft: '6px',
                      textAlign: 'center',
                      fontSize: '13px',
                      color: isDarkMode ? '#E5E7EB' : '#374151',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3B82F6';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }}
                  />
                </div>

                {/* MEASURE */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  {row.measure}
                </div>

                {/* NOTES */}
                <div
                  className="flex items-center justify-center relative"
                  style={{
                    paddingLeft: '22px',
                    paddingRight: '22px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', position: 'relative' }}>
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
                      <img
                        src="/assets/Vector (3).png"
                        alt="Notes"
                        style={{
                          width: '20px',
                          height: '16px',
                        }}
                      />
                    </button>
                    <button
                      ref={(el) => {
                        if (el) actionButtonRefs.current[row.id] = el;
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (actionMenuId === row.id) {
                          setActionMenuId(null);
                        } else {
                          const buttonElement = actionButtonRefs.current[row.id];
                          if (buttonElement) {
                            const rect = buttonElement.getBoundingClientRect();
                            setActionMenuPosition({
                              top: rect.bottom + window.scrollY + 4,
                              right: window.innerWidth - rect.right - window.scrollX,
                            });
                          }
                          setActionMenuId(row.id);
                        }
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        position: 'absolute',
                        right: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F3F4F6';
                        e.currentTarget.style.borderRadius = '4px';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <svg width="4" height="14" viewBox="0 0 4 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="2" cy="2" r="1.5" fill="#6B7280" />
                        <circle cx="2" cy="7" r="1.5" fill="#6B7280" />
                        <circle cx="2" cy="12" r="1.5" fill="#6B7280" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Menu Portal */}
      {actionMenuId && (() => {
        const selectedRow = finalData.find((r) => r.id === actionMenuId);
        if (!selectedRow) return null;

        return createPortal(
          <div
            data-action-menu-portal
            style={{
              position: 'fixed',
              top: `${actionMenuPosition.top}px`,
              right: `${actionMenuPosition.right}px`,
              zIndex: 10000,
              minWidth: '200px',
              padding: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                fontSize: '14px',
                fontWeight: 400,
                color: '#111827',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => {
                console.log('View details for:', selectedRow);
                setActionMenuId(null);
              }}
            >
              View Details
            </button>
            <button
              type="button"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                fontSize: '14px',
                fontWeight: 400,
                color: '#111827',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F3F4F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onClick={() => {
                console.log('Edit for:', selectedRow);
                setActionMenuId(null);
              }}
            >
              Edit
            </button>
          </div>,
          document.body
        );
      })()}

      {/* Filter Dropdown */}
      {openFilterColumn && filterIconRefs.current[openFilterColumn] && (
        <SortFormulasFilterDropdown
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          columnKey={openFilterColumn}
          availableValues={getColumnValues(openFilterColumn)}
          currentFilter={filters[openFilterColumn] || {}}
          currentSort={''}
          onApply={(filterData) => handleApplyFilter(openFilterColumn, filterData)}
          onClose={() => setOpenFilterColumn(null)}
        />
      )}
    </>
  );
};

export default ManufacturingTable;

