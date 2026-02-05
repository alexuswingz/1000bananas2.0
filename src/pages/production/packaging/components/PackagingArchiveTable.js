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
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Table header */}
      <div
        style={{ 
          backgroundColor: '#111827',
          width: '100%',
        }}
      >
        <div
          className="grid h-full"
          style={{
            gridTemplateColumns: columns.slice(0, -1).map((col) => col.width).join(' ') + ' 1fr',
            gap: '0',
            width: '100%',
            minWidth: '0',
          }}
        >
          {columns.map((column, idx) => (
            <div
              key={column.key}
              className="h-full text-xs font-bold uppercase tracking-wider flex items-center justify-center"
              style={{
                padding: '0.75rem 1.25rem',
                position: 'relative',
                borderRight: 'none',
                boxSizing: 'border-box',
              }}
            >
              {column.key === 'actions' ? (
                <div />
              ) : (
                <span
                  style={{
                    color: '#9CA3AF',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
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
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#9CA3AF',
            }}
          >
            No archived data available.
          </div>
        ) : (
          filteredData.map((row, index) => (
            <React.Fragment key={row.id || index}>
              {/* Separator line above each row */}
              <div
                style={{
                  marginLeft: '1.25rem',
                  marginRight: '1.25rem',
                  height: '1px',
                  backgroundColor: '#374151',
                }}
              />
              <div
                className="grid hover:bg-gray-800 transition-colors"
                style={{
                  gridTemplateColumns: columns.slice(0, -1).map((col) => col.width).join(' ') + ' 1fr',
                  gap: '0',
                  borderBottom: 'none',
                  minHeight: '60px',
                  backgroundColor: '#111827',
                  width: '100%',
                  minWidth: '0',
                  fontSize: '12px',
                }}
              >
              {/* STATUS */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
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
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.dateComplete || '10-03-2025'}
              </div>

              {/* TPS SHIP # */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.tpsShipNumber || '10-01-2025'}
              </div>

              {/* TYPE */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.type || 'AWD'}
              </div>

              {/* BRAND */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.brand || 'TPS Plant Foods'}
              </div>

              {/* PRODUCT */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.product || 'Cherry Tree Fertilizer'}
              </div>

              {/* SIZE */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.size || '1 Gallon'}
              </div>

              {/* QTY */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                }}
              >
                <input
                  type="text"
                  defaultValue={row.qty?.toLocaleString() || '72,000'}
                  style={{
                    width: '100%',
                    maxWidth: '120px',
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#FFFFFF',
                    padding: '0.5rem',
                    fontSize: '12px',
                  }}
                  readOnly
                />
              </div>

              {/* CASE # */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.caseNumber || 488}
              </div>

              {/* ACTIONS */}
              <div
                className="flex items-center justify-end relative action-menu-container"
                style={{ 
                  padding: '0.75rem 1.25rem',
                }}
              >
                <button
                  onClick={() => setActionMenuId(actionMenuId === row.id ? null : row.id)}
                  className="rounded transition-colors"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#374151'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  style={{
                    color: '#9CA3AF',
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
                    className="absolute right-4 top-9 z-20 w-32 bg-gray-800 border border-gray-700 rounded-md shadow-lg text-xs"
                  >
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 text-white"
                      onClick={() => setActionMenuId(null)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-700 text-red-400"
                      onClick={() => setActionMenuId(null)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
};

export default PackagingArchiveTable;
