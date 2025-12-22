import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const PackagingArchiveTable = ({ data = [], searchQuery = '' }) => {
  const { isDarkMode } = useTheme();
  const [actionMenuId, setActionMenuId] = useState(null);
  const actionMenuRef = useRef(null);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  // Sample archive data matching the image
  const sampleArchiveData = [
    {
      id: 1,
      status: 'Done',
      dateComplete: '10-03-2025',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
    },
    {
      id: 2,
      status: 'Done',
      dateComplete: '10-03-2025',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
    },
    {
      id: 3,
      status: 'Done',
      dateComplete: '10-03-2025',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
    },
    {
      id: 4,
      status: 'Done',
      dateComplete: '10-03-2025',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
    },
    {
      id: 5,
      status: 'Done',
      dateComplete: '10-03-2025',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
    },
  ];

  const archiveData = data.length > 0 ? data : sampleArchiveData;

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

  const filteredData = archiveData.filter((row) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.product?.toLowerCase().includes(query) ||
      row.brand?.toLowerCase().includes(query) ||
      row.tpsShipNumber?.toLowerCase().includes(query) ||
      row.type?.toLowerCase().includes(query)
    );
  });

  const columns = [
    { key: 'status', label: 'STATUS', width: '140px' },
    { key: 'dateComplete', label: 'DATE COMPLETE', width: '140px' },
    { key: 'tpsShipNumber', label: 'TPS SHIP #', width: '140px' },
    { key: 'type', label: 'TYPE', width: '100px' },
    { key: 'brand', label: 'BRAND', width: '160px' },
    { key: 'product', label: 'PRODUCT', width: '200px' },
    { key: 'size', label: 'SIZE', width: '120px' },
    { key: 'qty', label: 'QTY', width: '140px' },
    { key: 'caseNumber', label: 'CASE #', width: '100px' },
    { key: 'actions', label: '', width: '60px' },
  ];

  return (
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
              className="h-full text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center"
              style={{
                paddingLeft: '16px',
                paddingRight: '16px',
                paddingTop: '12px',
                paddingBottom: '12px',
                position: 'relative',
                borderRight: idx < columns.length - 1 && column.key !== 'actions' ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
              }}
            >
              {column.key === 'actions' ? (
                <div />
              ) : (
                <span
                  style={{
                    color: '#FFFFFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}
                >
                  {column.label}
                </span>
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
            No archived data available.
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
                <span
                  className="text-xs font-semibold px-3 py-1 rounded"
                  style={{ 
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    borderRadius: '9999px',
                  }}
                >
                  {row.status || 'Done'}
                </span>
              </div>

              {/* DATE COMPLETE */}
              <div
                className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                style={{ 
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  paddingTop: '12px',
                  paddingBottom: '12px',
                }}
              >
                {row.dateComplete || '10-03-2025'}
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
                {row.tpsShipNumber || '10-01-2025'}
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
                {row.type || 'AWD'}
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
                {row.brand || 'TPS Plant Foods'}
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
                {row.product || 'Cherry Tree Fertilizer'}
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
                {row.size || '1 Gallon'}
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
                  defaultValue={row.qty?.toLocaleString() || '72,000'}
                  className={`${themeClasses.inputBg} border border-gray-300 rounded px-2 py-1 text-sm`}
                  style={{
                    width: '100%',
                    maxWidth: '120px',
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                  readOnly
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
                {row.caseNumber || 488}
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
  );
};

export default PackagingArchiveTable;
