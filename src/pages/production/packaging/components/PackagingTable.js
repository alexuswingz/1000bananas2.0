import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import SortFormulasFilterDropdown from '../../new-shipment/components/SortFormulasFilterDropdown';

const PackagingTable = ({ data = [], onStartClick, searchQuery = '' }) => {
  const { isDarkMode } = useTheme();
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const [sortConfig, setSortConfig] = useState({ column: null, order: '' });
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);
  const [actionMenuId, setActionMenuId] = useState(null);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  // Sample data - replace with actual data from props
  const sampleData = [
    {
      id: 1,
      status: 'pending',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
      sku: 'HPINDOOR8OZ-F',
    },
    {
      id: 2,
      status: 'pending',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
      sku: 'HPINDOOR8OZ-F',
    },
    {
      id: 3,
      status: 'pending',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
      sku: 'HPINDOOR8OZ-F',
    },
  ];

  const tableData = data.length > 0 ? data : sampleData;

  useEffect(() => {
    if (openFilterColumn === null) return;
    const handleClickOutside = (event) => {
      const icon = filterIconRefs.current[openFilterColumn];
      const dropdown = filterDropdownRef.current;
      const inIcon = icon && icon.contains(event.target);
      const inDropdown = dropdown && dropdown.contains(event.target);
      const inFilterDropdown = event.target.closest && event.target.closest('[data-filter-dropdown]');
      if (!inIcon && !inDropdown && !inFilterDropdown) {
        setOpenFilterColumn(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openFilterColumn]);

  useEffect(() => {
    if (actionMenuId === null) return;
    const handleClickOutside = (event) => {
      if (!event.target.closest('.action-menu-container')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuId]);

  const handleFilterClick = (columnKey, e) => {
    e.stopPropagation();
    setOpenFilterColumn((prev) => (prev === columnKey ? null : columnKey));
  };

  const columns = [
    { key: 'status', label: 'STATUS', width: '140px', align: 'left' },
    { key: 'tpsShipNumber', label: 'TPS SHIP #', width: '140px', align: 'left' },
    { key: 'type', label: 'TYPE', width: '100px', align: 'left' },
    { key: 'brand', label: 'BRAND', width: '160px', align: 'left' },
    { key: 'product', label: 'PRODUCT', width: '200px', align: 'left', sortable: true },
    { key: 'size', label: 'SIZE', width: '120px', align: 'left' },
    { key: 'qty', label: 'QTY', width: '140px', align: 'right' },
    { key: 'caseNumber', label: 'CASE #', width: '100px', align: 'right' },
    { key: 'sku', label: 'SKU', width: '180px', align: 'left', sortable: true },
    { key: 'actions', label: '', width: '60px', align: 'right' },
  ];

  const getColumnValues = (columnKey) => {
    const values = new Set();
    tableData.forEach((row) => {
      if (row[columnKey] !== undefined) {
        values.add(row[columnKey]);
      }
    });
    return Array.from(values);
  };

  const filteredData = tableData.filter((row) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.product?.toLowerCase().includes(query) ||
      row.brand?.toLowerCase().includes(query) ||
      row.sku?.toLowerCase().includes(query) ||
      row.tpsShipNumber?.toLowerCase().includes(query)
    );
  });

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
              gridTemplateColumns: columns.slice(0, -1).map((col) => col.width).join(' ') + ' 1fr',
              gap: '0',
            }}
          >
            {columns.map((column, idx) => (
              <div
                key={column.key}
                className="h-full text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center group"
                style={{
                  paddingLeft: column.key === 'sku' ? '16px' : (column.key === 'actions' ? '4px' : '16px'),
                  paddingRight: column.key === 'sku' ? '4px' : (column.key === 'actions' ? '16px' : '16px'),
                  paddingTop: '12px',
                  paddingBottom: '12px',
                  position: 'relative',
                  borderRight: idx < columns.length - 1 && column.key !== 'actions' ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                }}
              >
                {column.key === 'actions' ? (
                  <div />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      width: '100%',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        color: openFilterColumn === column.key ? '#007AFF' : '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                      }}
                    >
                      {column.label}
                    </span>
                    {column.sortable && (
                      <img
                        ref={(el) => {
                          if (el) {
                            filterIconRefs.current[column.key] = el;
                          }
                        }}
                        src="/assets/Vector (1).png"
                        alt="Filter"
                        className={`w-3 h-3 transition-opacity cursor-pointer ${
                          openFilterColumn === column.key ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                        onClick={(e) => handleFilterClick(column.key, e)}
                        style={{ width: '12px', height: '12px', flexShrink: 0 }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Table body */}
        <div className="w-full">
          {filteredData.length === 0 ? (
            <div
              className={`px-6 py-6 text-center text-sm ${themeClasses.textSecondary}`}
            >
              No data available.
            </div>
          ) : (
            filteredData.map((row, index) => (
              <div
                key={row.id || index}
                className={`grid text-sm ${themeClasses.cardBg} ${themeClasses.rowHover}`}
                style={{
                  gridTemplateColumns: columns.slice(0, -1).map((col) => col.width).join(' ') + ' 1fr',
                  gap: '0',
                  borderBottom:
                    index === filteredData.length - 1
                      ? 'none'
                      : '1px solid #e5e7eb',
                  minHeight: '40px',
                }}
              >
                {/* STATUS */}
                <div
                  className="flex items-center justify-center"
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  <button
                    onClick={() => onStartClick && onStartClick(row)}
                    className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                    style={{ 
                      whiteSpace: 'nowrap',
                      borderRadius: '4px',
                    }}
                  >
                    Start
                  </button>
                </div>

                {/* TPS SHIP # */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  {row.tpsShipNumber}
                </div>

                {/* TYPE */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  {row.type}
                </div>

                {/* BRAND */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  {row.brand}
                </div>

                {/* PRODUCT */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  {row.product}
                </div>

                {/* SIZE */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  {row.size}
                </div>

                {/* QTY */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  <input
                    type="text"
                    defaultValue={row.qty?.toLocaleString() || ''}
                    className={`${themeClasses.inputBg} border border-gray-300 rounded px-2 py-1 text-sm`}
                    style={{
                      width: '100%',
                      maxWidth: '120px',
                      backgroundColor: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      textAlign: 'center',
                    }}
                  />
                </div>

                {/* CASE # */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  {row.caseNumber}
                </div>

                {/* SKU */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '4px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  {row.sku}
                </div>

                {/* ACTIONS */}
                <div
                  className="flex items-center justify-end relative action-menu-container"
                  style={{ 
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    paddingLeft: '4px',
                    paddingRight: '16px',
                  }}
                >
                  <button
                    onClick={() => setActionMenuId(actionMenuId === row.id ? null : row.id)}
                    className="rounded transition-colors"
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    style={{
                      color: '#6B7280',
                      padding: '4px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      backgroundColor: 'transparent',
                    }}
                  >
                    <svg width="4" height="14" viewBox="0 0 4 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="2" cy="2" r="1.5" fill="currentColor" />
                      <circle cx="2" cy="7" r="1.5" fill="currentColor" />
                      <circle cx="2" cy="12" r="1.5" fill="currentColor" />
                    </svg>
                  </button>
                  {actionMenuId === row.id && (
                    <div
                      className={`absolute right-4 top-9 z-20 w-32 ${themeClasses.cardBg} border ${themeClasses.border} rounded-md shadow-lg text-xs`}
                    >
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${themeClasses.textPrimary}`}
                        onClick={() => setActionMenuId(null)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600`}
                        onClick={() => setActionMenuId(null)}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Filter Dropdown */}
      {openFilterColumn !== null && (
        <SortFormulasFilterDropdown
          ref={filterDropdownRef}
          columnKey={openFilterColumn}
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          availableValues={getColumnValues(openFilterColumn)}
          currentFilter={{}}
          currentSort={sortConfig.column === openFilterColumn ? sortConfig.order : ''}
          onApply={(data) => {
            if (data?.sortOrder) {
              setSortConfig({ column: openFilterColumn, order: data.sortOrder });
            } else {
              setSortConfig((prev) =>
                prev.column === openFilterColumn ? { column: null, order: '' } : prev
              );
            }
            if (!data?.__fromSortClick) {
              setOpenFilterColumn(null);
            }
          }}
          onClose={() => setOpenFilterColumn(null)}
        />
      )}
    </>
  );
};

export default PackagingTable;
