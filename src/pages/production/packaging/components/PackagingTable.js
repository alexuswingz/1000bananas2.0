import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import SortFormulasFilterDropdown from '../../new-shipment/components/SortFormulasFilterDropdown';
import ProductionNotesModal from './ProductionNotesModal';
import SplitProductModal from './SplitProductModal';

const PackagingTable = ({ data = [], onStartClick, onInProgressClick, searchQuery = '', isSortMode = false, onExitSortMode }) => {
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
  const [selectedProductForSplit, setSelectedProductForSplit] = useState(null);
  const [draggedRowIndex, setDraggedRowIndex] = useState(null);
  const [draggedOverRowIndex, setDraggedOverRowIndex] = useState(null);
  const [justMovedRowId, setJustMovedRowId] = useState(null);
  const [justMovedRowIndex, setJustMovedRowIndex] = useState(null);
  const [localTableData, setLocalTableData] = useState([]);
  const [originalTableData, setOriginalTableData] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [recentlyMovedRowId, setRecentlyMovedRowId] = useState(null);

  // Handle click outside action menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuId) {
        const buttonElement = actionButtonRefs.current[actionMenuId];
        const clickedElement = event.target;
        const menuElement = document.querySelector('[data-action-menu-portal]');
        
        // Check if click is inside the menu (including buttons)
        if (menuElement && menuElement.contains(clickedElement)) {
          // Don't close if clicking inside menu
          return;
        }
        
        // Check if click is outside both the menu and the button
        if (buttonElement && !buttonElement.contains(clickedElement)) {
          setActionMenuId(null);
        }
      }
    };

    if (actionMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
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
      sku: 'HPINDOOR8OZ-FBA-UPC-0123',
      formula: 'F.Indoor Plant Food',
      labelLocation: 'LBL-PLANT-218',
      cap: 'VENTED Berry',
      productType: 'Liquid',
      filter: 'Metal',
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
      sku: 'HPINDOOR8OZ-FBA-UPC-0123',
      formula: 'F.Indoor Plant Food',
      labelLocation: 'LBL-PLANT-218',
      cap: 'VENTED Berry',
      productType: 'Liquid',
      filter: 'Metal',
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
      sku: 'HPINDOOR8OZ-FBA-UPC-0123',
      formula: 'F.Indoor Plant Food',
      labelLocation: 'LBL-PLANT-218',
      cap: 'VENTED Berry',
      productType: 'Liquid',
      filter: 'Metal',
    },
  ];

  // Initialize local table data and update when data changes
  useEffect(() => {
    const initialData = data.length > 0 ? data : sampleData;
    setLocalTableData(initialData);
    // Only update originalTableData if we're not in sort mode to preserve sort changes
    if (!isSortMode) {
      setOriginalTableData(initialData);
    }
  }, [data, isSortMode]);

  const tableData = localTableData.length > 0 ? localTableData : (data.length > 0 ? data : sampleData);

  // Calculate unsaved changes count
  const getUnsavedChangesCount = () => {
    if (!isSortMode || originalTableData.length === 0 || localTableData.length === 0) return 0;
    
    let changes = 0;
    originalTableData.forEach((originalRow, originalIndex) => {
      const currentIndex = localTableData.findIndex(row => row.id === originalRow.id);
      if (currentIndex !== originalIndex) {
        changes++;
      }
    });
    return changes;
  };

  const unsavedChangesCount = getUnsavedChangesCount();

  // Reset to original order when sort mode is turned off (if there are unsaved changes)
  useEffect(() => {
    if (!isSortMode && originalTableData.length > 0 && localTableData.length > 0) {
      // Check if data has changed by comparing arrays
      const hasChanges = originalTableData.some((originalRow, originalIndex) => {
        const currentIndex = localTableData.findIndex(row => row.id === originalRow.id);
        return currentIndex !== originalIndex;
      });
      
      if (hasChanges) {
        // Revert to original order when sort mode is turned off
        setLocalTableData([...originalTableData]);
      }
    }
  }, [isSortMode]);

  // Handle save changes - show confirmation modal
  const handleSaveChanges = () => {
    setShowConfirmModal(true);
  };

  // Handle confirm save
  const handleConfirmSave = () => {
    // Update original data to match current order
    setOriginalTableData([...localTableData]);
    setShowConfirmModal(false);
    // TODO: Save to backend API here
    console.log('Saving order:', localTableData);
  };

  // Handle cancel confirmation
  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
  };

  // Handle cancel changes
  const handleCancelChanges = () => {
    // Revert to original order
    setLocalTableData([...originalTableData]);
    // Exit sort mode
    if (onExitSortMode) {
      onExitSortMode();
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    if (!isSortMode) return;
    setDraggedRowIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
    const rowElement = e.currentTarget;
    rowElement.style.opacity = '0.5';
    rowElement.style.cursor = 'grabbing';
  };

  const handleDragOver = (e, index) => {
    if (!isSortMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverRowIndex(index);
  };

  const handleDragLeave = () => {
    setDraggedOverRowIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    if (!isSortMode || draggedRowIndex === null) return;
    e.preventDefault();
    
    const newData = [...tableData];
    const draggedItem = newData[draggedRowIndex];
    newData.splice(draggedRowIndex, 1);
    newData.splice(dropIndex, 0, draggedItem);
    
    setLocalTableData(newData);
    
    // Highlight the row that was just moved
    const rowIdToHighlight = draggedItem.id;
    console.log('Highlighting row after move:', rowIdToHighlight, draggedItem, 'at new index:', dropIndex);
    
    // Set highlight immediately
    if (rowIdToHighlight) {
      setJustMovedRowId(rowIdToHighlight);
    }
    // Also use index as fallback
    setJustMovedRowIndex(dropIndex);
    
    // Clear the highlight after 2 seconds
    setTimeout(() => {
      console.log('Clearing highlight');
      setJustMovedRowId(null);
      setJustMovedRowIndex(null);
    }, 2000);
    
    setDraggedRowIndex(null);
    setDraggedOverRowIndex(null);
  };

  const handleDragEnd = (e) => {
    const rowElement = e.currentTarget;
    rowElement.style.opacity = '1';
    rowElement.style.cursor = 'grab';
    setDraggedRowIndex(null);
    setDraggedOverRowIndex(null);
  };

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
    { key: 'status', label: 'STATUS', minWidth: '50px', flex: '0.7', align: 'center' },
    { key: 'tpsShipNumber', label: 'TPS SHIP #', minWidth: '60px', flex: '0.8', align: 'center' },
    { key: 'type', label: 'TYPE', minWidth: '40px', flex: '0.5', align: 'center' },
    { key: 'brand', label: 'BRAND', minWidth: '60px', flex: '1.1', align: 'center' },
    { key: 'product', label: 'PRODUCT', minWidth: '80px', flex: '1.6', align: 'center', sortable: true },
    { key: 'size', label: 'SIZE', minWidth: '50px', flex: '0.6', align: 'center' },
    { key: 'qty', label: 'QTY', minWidth: '50px', flex: '0.7', align: 'center' },
    { key: 'caseNumber', label: 'CASE #', minWidth: '50px', flex: '0.6', align: 'center' },
    { key: 'sku', label: 'SKU', minWidth: '80px', flex: '2.2', align: 'center', sortable: true },
    { key: 'formula', label: 'FORMULA', minWidth: '60px', flex: '1.1', align: 'center' },
    { key: 'labelLocation', label: 'LABEL LOCATION', minWidth: '60px', flex: '1.0', align: 'center' },
    { key: 'cap', label: 'CAP', minWidth: '50px', flex: '0.6', align: 'center' },
    { key: 'productType', label: 'TYPE', minWidth: '40px', flex: '0.5', align: 'center' },
    { key: 'filter', label: 'FILTER', minWidth: '40px', flex: '0.5', align: 'center' },
    { key: 'notes', label: 'NOTES', minWidth: '40px', flex: '0.5', align: 'center' },
    { key: 'actions', label: '', minWidth: '25px', flex: '0.3', align: 'center' },
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
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        {/* Table header */}
        <div
          className="bg-[#2C3544] border-b border-[#3C4656] w-full"
          style={{ 
            height: '40px', 
            borderRadius: '8px 8px 0 0',
            width: '100%',
          }}
        >
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: columns.map((col) => {
                // Use minmax with fr units - allows columns to shrink below preferred but maintain minimum
                // At 90% zoom, columns can shrink more aggressively
                return `minmax(${col.minWidth}, ${col.flex}fr)`;
              }).join(' '),
              gap: '0',
              width: '100%',
              minWidth: '0', // Allow grid to shrink below content size
            }}
          >
            {columns.map((column, idx) => (
              <div
                key={column.key}
                className={`h-full text-xs font-bold text-white uppercase tracking-wider flex items-center group ${
                  column.align === 'right' ? 'justify-end' : column.align === 'center' ? 'justify-center' : 'justify-start'
                }`}
                style={{
                  paddingLeft: column.key === 'actions' ? '4px' : '6px',
                  paddingRight: column.key === 'actions' ? '6px' : '6px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  position: 'relative',
                  borderRight: idx < columns.length - 1 && column.key !== 'actions' ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
                }}
              >
                {column.key === 'actions' ? (
                  <div />
                ) : (
                  column.align === 'center' ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        justifyContent: 'center',
                        width: '100%',
                      }}
                    >
                      <span
                        style={{
                          color: openFilterColumn === column.key ? '#007AFF' : '#FFFFFF',
                          fontSize: '9px',
                          fontWeight: 700,
                          letterSpacing: '0.03em',
                          whiteSpace: 'nowrap',
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
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        width: '100%',
                        justifyContent: column.align === 'right' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <span
                        style={{
                          color: openFilterColumn === column.key ? '#007AFF' : '#FFFFFF',
                          fontSize: '9px',
                          fontWeight: 700,
                          letterSpacing: '0.03em',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
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
                  )
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
                className={`grid ${themeClasses.cardBg} ${themeClasses.rowHover}`}
                style={{
                  gridTemplateColumns: columns.map((col) => {
                    // Use minmax with fr units - allows columns to shrink below preferred but maintain minimum
                    // At 90% zoom, columns can shrink more aggressively
                    return `minmax(${col.minWidth}, ${col.flex}fr)`;
                  }).join(' '),
                  gap: '0',
                  borderBottom:
                    index === filteredData.length - 1
                      ? 'none'
                      : '1px solid #e5e7eb',
                  minHeight: '38px',
                  opacity: draggedRowIndex === index ? 0.4 : 1,
                  backgroundColor: justMovedRowId && (justMovedRowId === row.id || justMovedRowId === row.key || justMovedRowId === `row-${index}`)
                    ? '#BFDBFE' 
                    : draggedOverRowIndex === index && isSortMode 
                      ? '#E0F2FE' 
                      : justMovedRowIndex === index
                        ? '#BFDBFE'
                        : 'transparent',
                  border: draggedRowIndex === index 
                    ? '2px dashed #3B82F6' 
                    : draggedOverRowIndex === index && isSortMode 
                      ? '2px solid #3B82F6' 
                      : justMovedRowId && (justMovedRowId === row.id || justMovedRowId === row.key || justMovedRowId === `row-${index}`)
                        ? '2px solid #3B82F6'
                        : 'none',
                  boxShadow: draggedRowIndex === index 
                    ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
                    : draggedOverRowIndex === index && isSortMode 
                      ? '0 2px 8px rgba(59, 130, 246, 0.2)' 
                      : justMovedRowId && (justMovedRowId === row.id || justMovedRowId === row.key || justMovedRowId === `row-${index}`)
                        ? '0 2px 8px rgba(59, 130, 246, 0.3)'
                        : 'none',
                  transform: draggedRowIndex === index ? 'scale(0.98)' : 'scale(1)',
                  transition: draggedRowIndex === index || draggedOverRowIndex === index || (justMovedRowId && (justMovedRowId === row.id || justMovedRowId === row.key || justMovedRowId === `row-${index}`)) ? 'all 0.2s ease' : 'none',
                  cursor: isSortMode ? 'grab' : 'default',
                  width: '100%',
                  minWidth: '0', // Allow grid to shrink below content size
                  fontSize: '12px',
                  zIndex: draggedRowIndex === index ? 10 : draggedOverRowIndex === index ? 5 : justMovedRowIndex === index ? 3 : 1,
                }}
                draggable={isSortMode}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                {/* STATUS */}
                <div
                  className="flex items-center justify-center"
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                  }}
                >
                  {isSortMode ? (
                    <div
                      style={{
                        cursor: 'grab',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        userSelect: 'none',
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="2" y1="2" x2="10" y2="2" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
                        <line x1="2" y1="6" x2="10" y2="6" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
                        <line x1="2" y1="10" x2="10" y2="10" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                  ) : row.status === 'paused' ? (
                    <button
                      className="bg-gray-400 text-gray-800 text-xs font-semibold px-3 py-1 rounded hover:bg-gray-500 transition-colors"
                      style={{ 
                        whiteSpace: 'nowrap',
                        borderRadius: '4px',
                        cursor: 'default',
                      }}
                      disabled
                    >
                      Paused
                    </button>
                  ) : row.status === 'in_progress' ? (
                    <div
                      className="text-blue-600 text-xs font-semibold px-3 py-1 rounded"
                      style={{ 
                        whiteSpace: 'nowrap',
                        borderRadius: '4px',
                        backgroundColor: 'transparent',
                        border: '1px solid #3B82F6',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        if (onInProgressClick) {
                          onInProgressClick(row);
                        }
                      }}
                    >
                      In Progress
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (onStartClick) {
                          onStartClick(row);
                        }
                      }}
                      className="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                      style={{ 
                        whiteSpace: 'nowrap',
                        borderRadius: '4px',
                      }}
                    >
                      Start
                    </button>
                  )}
                </div>

                {/* TPS SHIP # */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.tpsShipNumber}
                </div>

                {/* TYPE */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.type}
                </div>

                {/* BRAND */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
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
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.product}
                </div>

                {/* SIZE */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.size}
                </div>

                {/* QTY */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                  }}
                >
                  <input
                    type="text"
                    defaultValue={row.qty?.toLocaleString() || ''}
                    className={`${themeClasses.inputBg} border border-gray-300 rounded px-2 py-1 text-sm`}
                    style={{
                      width: '100%',
                      maxWidth: '100px',
                      backgroundColor: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderRadius: '6px',
                      textAlign: 'center',
                      fontSize: '12px',
                      padding: '4px 6px',
                    }}
                  />
                </div>

                {/* CASE # */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.caseNumber}
                </div>

                {/* SKU */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.sku}
                </div>

                {/* FORMULA */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.formula || 'F.Indoor Plant Food'}
                </div>

                {/* LABEL LOCATION */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.labelLocation || 'LBL-PLANT-218'}
                </div>

                {/* CAP */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.cap || 'VENTED Berry'}
                </div>

                {/* TYPE (second instance - product type) */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.productType || 'Liquid'}
                </div>

                {/* FILTER */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {row.filter || 'Metal'}
                </div>

                {/* NOTES */}
                <div
                  className="flex items-center justify-center"
                  style={{ 
                    paddingLeft: '6px',
                    paddingRight: '6px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                  }}
                >
                  <button
                    onClick={() => setSelectedProductForNotes(row)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="2" width="12" height="12" rx="2" fill="#007AFF" />
                      <path d="M5 5h6M5 8h6M5 11h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
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
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Split Product clicked, row:', selectedRow);
                // Immediately set the product and close menu
                setSelectedProductForSplit(selectedRow);
                setActionMenuId(null);
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v8" />
                <path d="M8 11l4 4 4-4" />
                <path d="M8 11h8" />
                <path d="M6 19l6-6 6 6" />
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
                console.log('Mark as Floor Inv. (Shiners) clicked for:', selectedRow);
                setActionMenuId(null);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="12" height="16" rx="1" />
                <path d="M9 4v4M15 4v4" />
                <line x1="9" y1="12" x2="15" y2="12" />
              </svg>
              <span>Mark as Floor Inv. (Shiners)</span>
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
                // TODO: Implement mark as floor inventory - finished goods functionality
                console.log('Mark as Floor Inv. (Finished Goods) clicked for:', selectedRow);
                setActionMenuId(null);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#111827" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="12" height="16" rx="1" />
                <path d="M9 4v4M15 4v4" />
                <line x1="9" y1="12" x2="15" y2="12" />
              </svg>
              <span>Mark as Floor Inv. (Finished Goods)</span>
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

      {/* Split Product Modal */}
      {selectedProductForSplit && (
        <SplitProductModal
          isOpen={true}
          onClose={() => {
            console.log('Closing split product modal');
            setSelectedProductForSplit(null);
          }}
          product={selectedProductForSplit}
          onConfirm={(splitData) => {
            console.log('Split product confirmed, splitData:', splitData);
            const { firstBatchQty, secondBatchQty, product } = splitData;
            
            // Use current tableData to find the product
            const currentData = localTableData.length > 0 ? localTableData : (data.length > 0 ? data : sampleData);
            const productIndex = currentData.findIndex(row => row.id === product.id);
            
            console.log('Product index:', productIndex, 'Current data length:', currentData.length);
            
            if (productIndex !== -1) {
              // Create two new rows from the split
              const firstRow = {
                ...product,
                id: product.id, // Keep original ID for first batch
                status: 'paused', // First batch is paused
                qty: firstBatchQty,
              };
              
              // Generate a new ID for the second batch (using timestamp or incrementing)
              const maxId = Math.max(...currentData.map(r => r.id || 0), 0);
              const secondRow = {
                ...product,
                id: maxId + 1, // New ID for second batch
                status: 'pending', // Second batch is pending (shows Start button)
                qty: secondBatchQty,
              };
              
              console.log('First row:', firstRow);
              console.log('Second row:', secondRow);
              
              // Replace the original row with the two new rows
              const newTableData = [...currentData];
              newTableData.splice(productIndex, 1, firstRow, secondRow);
              
              console.log('New table data length:', newTableData.length);
              
              // Update both local and original data
              setLocalTableData(newTableData);
              setOriginalTableData(newTableData);
              
              // TODO: Save to backend API here
            } else {
              console.error('Product not found in table data');
            }
            
            setSelectedProductForSplit(null);
          }}
        />
      )}

      {/* Unsaved Changes Modal */}
      {isSortMode && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            backgroundColor: '#2C3544',
            borderRadius: '12px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            minWidth: '320px',
          }}
        >
          {/* Pencil Icon */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>

          {/* Unsaved Changes Text */}
          <span
            style={{
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              flex: 1,
            }}
          >
            {unsavedChangesCount} Unsaved Change{unsavedChangesCount !== 1 ? 's' : ''}
          </span>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleCancelChanges}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#FFFFFF',
                color: '#374151',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveChanges}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563EB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3B82F6';
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
          }}
          onClick={handleCancelConfirm}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '400px',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#111827',
                margin: '0 0 12px 0',
              }}
            >
              Are you sure?
            </h2>

            {/* Message */}
            <p
              style={{
                fontSize: '14px',
                color: '#6B7280',
                margin: '0 0 24px 0',
                lineHeight: '1.5',
              }}
            >
              Your changes will applied to the active queue.
            </p>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={handleCancelConfirm}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                Go back
              </button>
              <button
                onClick={handleConfirmSave}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                Confirm ({unsavedChangesCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PackagingTable;
