import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import SortFormulasFilterDropdown from '../../new-shipment/components/SortFormulasFilterDropdown';
import ProductionNotesModal from './ProductionNotesModal';

const PackagingTable = ({ data = [], onStartClick, searchQuery = '' }) => {
  const { isDarkMode } = useTheme();
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const [sortConfig, setSortConfig] = useState({ column: null, order: '' });
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, right: 0 });
  const actionButtonRefs = useRef({});
  const [selectedProductForNotes, setSelectedProductForNotes] = useState(null);
  const [productionNotes, setProductionNotes] = useState({}); // Map of product id to notes array

  // Handle click outside action menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuId) {
        const buttonElement = actionButtonRefs.current[actionMenuId];
        const clickedElement = event.target;
        
        // Check if click is outside both the menu and the button
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
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProductForNotes(row);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
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
                    ref={(el) => { if (el) actionButtonRefs.current[row.id] = el; }}
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
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Menu Portal - rendered outside overflow container */}
      {actionMenuId && (() => {
        const selectedRow = filteredData.find(r => r.id === actionMenuId);
        if (!selectedRow) return null;

        return createPortal(
          <div
            data-action-menu-portal
            style={{
              position: 'fixed',
              top: `${actionMenuPosition.top}px`,
              right: `${actionMenuPosition.right}px`,
              zIndex: 10000,
              minWidth: '240px',
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
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
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
                // TODO: Implement split product functionality
                console.log('Split Product clicked for:', selectedRow);
                setActionMenuId(null);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20" />
                <path d="M8 8l4-4 4 4M8 16l4 4 4-4" />
              </svg>
              <span>Split Product</span>
            </button>
            <button
              type="button"
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
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
                // TODO: Implement mark as floor inventory - shiners functionality
                console.log('Mark as Floor Inventory - Shiners clicked for:', selectedRow);
                setActionMenuId(null);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="12" rx="2" />
                <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
                <line x1="7" y1="13" x2="17" y2="13" />
              </svg>
              <span>Mark as Floor Inventory - Shiners</span>
            </button>
          </div>,
          document.body
        );
      })()}

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

      {/* Production Notes Modal */}
      {selectedProductForNotes && (
        <ProductionNotesModal
          isOpen={!!selectedProductForNotes}
          onClose={() => setSelectedProductForNotes(null)}
          product={selectedProductForNotes}
          notes={(() => {
            const productId = selectedProductForNotes.id;
            const existingNotes = productionNotes[productId] || [];
            
            // If no notes exist, add a default note
            if (existingNotes.length === 0) {
              const defaultNote = {
                text: `${selectedProductForNotes.product || 'Product'} isn't ready to be made. It'll take a couple days for the remaining raw materials to arrive.`,
                userName: 'Christian R.',
                userInitials: 'CR',
                date: 'Aug 20, 2025',
              };
              return [defaultNote];
            }
            
            return existingNotes;
          })()}
          onAddNote={(noteText) => {
            const productId = selectedProductForNotes.id;
            const userName = localStorage.getItem('userName') || 'User';
            const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            const newNote = {
              text: noteText,
              userName: userName,
              userInitials: userInitials,
              date: date,
            };

            setProductionNotes(prev => {
              const existingNotes = prev[productId] || [];
              
              // If this is the first note being added, include the default note
              if (existingNotes.length === 0) {
                const defaultNote = {
                  text: `${selectedProductForNotes.product || 'Product'} isn't ready to be made. It'll take a couple days for the remaining raw materials to arrive.`,
                  userName: 'Christian R.',
                  userInitials: 'CR',
                  date: 'Aug 20, 2025',
                };
                return {
                  ...prev,
                  [productId]: [defaultNote, newNote],
                };
              }
              
              // Otherwise, just add the new note to existing notes
              return {
                ...prev,
                [productId]: [...existingNotes, newNote],
              };
            });

            // TODO: Save to backend API here
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </>
  );
};

export default PackagingTable;
