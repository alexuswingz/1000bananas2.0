import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import SortFormulasFilterDropdown from '../../new-shipment/components/SortFormulasFilterDropdown';
import ProductionNotesModal from './ProductionNotesModal';
import SplitProductModal from './SplitProductModal';
import LogUnitsProducedModal from './LogUnitsProducedModal';

const PackagingTable = ({ data = [], onStartClick, onInProgressClick, searchQuery = '', isSortMode = false, onExitSortMode, onSetIsFromUnmarkShiners, onProductNotes, onMoreDetails }) => {
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedShinersProductToMove, setSelectedShinersProductToMove] = useState(null);
  const [selectedShinersProductToStart, setSelectedShinersProductToStart] = useState(null);
  const [isFromUnmarkShiners, setIsFromUnmarkShiners] = useState(false);
  const [showMarkAsShinersModal, setShowMarkAsShinersModal] = useState(false);
  const [selectedProductForMarkShiners, setSelectedProductForMarkShiners] = useState(null);
  const [selectedProductForLogUnits, setSelectedProductForLogUnits] = useState(null);
  const [showMarkAsFinishedGoodsModal, setShowMarkAsFinishedGoodsModal] = useState(false);
  const [selectedProductForMarkFinishedGoods, setSelectedProductForMarkFinishedGoods] = useState(null);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    { key: 'status', label: 'STATUS', minWidth: '140px', flex: '1.1', align: 'center' },
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
      {/* Desktop View */}
      {!isMobile && (
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
                  opacity: draggedRowIndex === index ? 0.4 : (row.status === 'moved_s' || row.status === 'moved_fg') ? 0.6 : 1,
                  backgroundColor: row.status === 'moved_s' || row.status === 'moved_fg'
                    ? '#F3F4F6'
                    : justMovedRowId && (justMovedRowId === row.id || justMovedRowId === row.key || justMovedRowId === `row-${index}`)
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
                    minWidth: '120px',
                    width: '100%',
                    boxSizing: 'border-box',
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
                  ) : row.status === 'done' ? (
                    <button
                      className="bg-green-500 text-white text-xs font-semibold px-2.5 py-1 rounded"
                      style={{ 
                        whiteSpace: 'nowrap',
                        borderRadius: '4px',
                        cursor: 'default',
                        backgroundColor: '#10B981',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      disabled
                    >
                      Done
                    </button>
                  ) : row.status === 'moved_s' ? (
                    <button
                      className="text-gray-800 text-xs font-semibold px-2.5 py-1 rounded"
                      style={{ 
                        whiteSpace: 'nowrap',
                        borderRadius: '4px',
                        cursor: 'default',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        border: '1px solid #E5E7EB',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      disabled
                    >
                      Moved (Shiners)
                    </button>
                  ) : row.status === 'moved_fg' ? (
                    <button
                      className="text-gray-800 text-xs font-semibold px-2.5 py-1 rounded"
                      style={{ 
                        whiteSpace: 'nowrap',
                        borderRadius: '4px',
                        cursor: 'default',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        border: '1px solid #E5E7EB',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      disabled
                      title="Moved (Finished Goods)"
                    >
                      Moved (Finished Goods)
                    </button>
                  ) : row.isShiners && row.status === 'paused' ? (
                    <button
                      onClick={() => {
                        setSelectedShinersProductToStart(row);
                      }}
                      className="text-white text-xs font-semibold px-2.5 py-1 rounded"
                      style={{ 
                        whiteSpace: 'nowrap',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: '#F97316',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      Start
                    </button>
                  ) : row.status === 'paused' ? (
                    <button
                      className="text-gray-800 text-xs font-semibold px-2.5 py-1 rounded"
                      style={{ 
                        whiteSpace: 'nowrap',
                        borderRadius: '4px',
                        cursor: 'default',
                        backgroundColor: '#FFFFFF',
                        color: '#374151',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                        border: '1px solid #E5E7EB',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      disabled
                    >
                      Paused
                    </button>
                  ) : row.status === 'in_progress' ? (
                    <div
                      className="text-blue-600 text-xs font-semibold px-2.5 py-1 rounded"
                      style={{ 
                        whiteSpace: 'nowrap',
                        borderRadius: '4px',
                        backgroundColor: 'transparent',
                        border: '1px solid #3B82F6',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
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
                      className="bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded hover:bg-blue-700 transition-colors"
                      style={{ 
                        whiteSpace: 'nowrap',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
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
                    gap: '4px',
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.product}
                  </span>
                  {row.isSplit && (
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="#007AFF" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                      title="Split Product"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  )}
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
      )}

      {/* Mobile View */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '0 16px',
            paddingLeft: '16px',
            paddingRight: '16px',
            alignItems: 'stretch',
          }}
        >
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
                data-mobile-card
                style={{
                  width: '100%',
                  minHeight: 'auto',
                  padding: '16px',
                  gap: '16px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  backgroundColor: row.status === 'moved_s' || row.status === 'moved_fg'
                    ? '#F3F4F6'
                    : isDarkMode ? '#1F2937' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  opacity: (row.status === 'moved_s' || row.status === 'moved_fg') ? 0.6 : 1,
                }}
              >
                {/* Three-dot menu button */}
                <button
                  ref={(el) => {
                    if (el) actionButtonRefs.current[row.id] = el;
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const buttonRect = e.currentTarget.getBoundingClientRect();
                    const cardElement = e.currentTarget.closest('[data-mobile-card]');
                    const cardRect = cardElement?.getBoundingClientRect();
                    
                    const menuWidth = 264;
                    const menuHeight = 260; // Updated for 5 menu items in mobile
                    
                    let menuTop = buttonRect.bottom + 8;
                    let menuLeft = cardRect ? cardRect.left + 16 : 16;
                    
                    const maxTop = window.innerHeight - menuHeight - 16;
                    if (menuTop > maxTop) {
                      menuTop = Math.max(buttonRect.top - menuHeight - 8, 60);
                    }
                    
                    const maxLeft = window.innerWidth - menuWidth - 16;
                    if (menuLeft > maxLeft) {
                      menuLeft = maxLeft;
                    }
                    
                    menuTop = Math.max(menuTop, 60);
                    menuLeft = Math.max(menuLeft, 16);
                    
                    const menuRight = window.innerWidth - (menuLeft + menuWidth);
                    
                    setActionMenuPosition({ top: menuTop, right: menuRight });
                    setActionMenuId(row.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '24px',
                    height: '24px',
                    padding: '0',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="4" r="1.5" fill={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                    <circle cx="10" cy="10" r="1.5" fill={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                    <circle cx="10" cy="16" r="1.5" fill={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                  </svg>
                </button>

                {/* Card Content - Image + Details */}
                <div style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'flex-start' }}>
                  {/* Product Image Container */}
                  {row.productImage && (
                    <div 
                      style={{ 
                        flexShrink: 0,
                        position: 'relative',
                        width: '120px',
                        height: '160px',
                        borderRadius: '8px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={row.productImage}
                        alt={row.product}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      {/* Chain/Link Icon - Show when product is split */}
                      {row.isSplit && (
                        <svg 
                          width="14" 
                          height="14" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="#007AFF" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            zIndex: 2,
                            flexShrink: 0,
                          }}
                          title="Split Product"
                        >
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      )}
                      {/* Expand Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onMoreDetails) {
                            onMoreDetails(row);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '24px',
                          height: '24px',
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          border: '1px solid #E5E7EB',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          padding: 0,
                          zIndex: 2,
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Product Info */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0, padding: 0, margin: 0 }}>
                    {/* Title and Subtitle */}
                    <div style={{ display: 'block', position: 'relative', paddingRight: '32px', paddingLeft: 0, paddingTop: 0, paddingBottom: 0, margin: 0, width: '100%' }}>
                      <h3
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: isDarkMode ? '#F9FAFB' : '#111827',
                          margin: 0,
                          padding: 0,
                          marginBottom: '4px',
                          lineHeight: '1.3',
                          textAlign: 'left',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          width: '100%',
                          wordBreak: 'break-word',
                        }}
                      >
                        {row.product || 'N/A'}
                      </h3>
                      <p
                        style={{
                          fontSize: '14px',
                          fontWeight: 400,
                          color: isDarkMode ? '#9CA3AF' : '#6B7280',
                          margin: 0,
                          padding: 0,
                          textAlign: 'left',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          width: '100%',
                        }}
                      >
                        {row.brand || 'N/A'} • {row.size || 'N/A'}
                      </p>
                    </div>

                    {/* Product Details List */}
                    <div
                      style={{
                        display: 'block',
                        fontSize: '14px',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        width: '100%',
                        padding: 0,
                        margin: 0,
                      }}
                    >
                      <div style={{ textAlign: 'left', lineHeight: '1.5', width: '100%', display: 'block', marginBottom: '12px', padding: 0, marginLeft: 0, marginRight: 0, marginTop: 0 }}>
                        <span style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 400, display: 'inline' }}>Formula: </span>
                        <span style={{ color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 700, display: 'inline' }}>{row.formula || 'N/A'}</span>
                      </div>
                      <div style={{ textAlign: 'left', lineHeight: '1.5', width: '100%', display: 'block', marginBottom: '12px', padding: 0, marginLeft: 0, marginRight: 0 }}>
                        <span style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 400, display: 'inline' }}>TPS Ship #: </span>
                        <span style={{ color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 700, display: 'inline' }}>{row.tpsShipNumber || 'N/A'}</span>
                      </div>
                      {row.labelLocation && (
                        <div style={{ textAlign: 'left', lineHeight: '1.5', width: '100%', display: 'block', marginBottom: '12px', padding: 0, marginLeft: 0, marginRight: 0 }}>
                          <span style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 400, display: 'inline' }}>Label Location: </span>
                          <span style={{ color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 700, display: 'inline' }}>{row.labelLocation}</span>
                        </div>
                      )}
                      <div style={{ textAlign: 'left', lineHeight: '1.5', width: '100%', display: 'block', marginBottom: '12px', padding: 0, marginLeft: 0, marginRight: 0 }}>
                        <span style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 400, display: 'inline' }}>QTY: </span>
                        <span style={{ color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 700, display: 'inline' }}>{row.qty ? row.qty.toLocaleString() : 'N/A'}</span>
                      </div>
                      {row.caseNumber && (
                        <div style={{ textAlign: 'left', lineHeight: '1.5', width: '100%', display: 'block', marginBottom: '0', padding: 0, marginLeft: 0, marginRight: 0 }}>
                          <span style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 400, display: 'inline' }}>Case #: </span>
                          <span style={{ color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 700, display: 'inline' }}>{row.caseNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => {
                    // Don't allow clicking if status is done, moved_s, or moved_fg
                    if (row.status === 'done' || row.status === 'moved_s' || row.status === 'moved_fg') {
                      return;
                    }
                    // Check if this is a shiners item that is paused - should show Start Item Marked as Shiners modal
                    if (row.isShiners && row.status === 'paused') {
                      setSelectedShinersProductToStart(row);
                    } else if (row.status === 'in_progress') {
                      if (onInProgressClick) {
                        onInProgressClick(row);
                      }
                    } else {
                      if (onStartClick) {
                        onStartClick(row);
                      }
                    }
                  }}
                  disabled={row.status === 'done' || row.status === 'moved_s' || row.status === 'moved_fg'}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: row.status === 'moved_s' || row.status === 'moved_fg' ? '#F3F4F6' :
                                    row.isShiners && row.status === 'paused' ? '#F97316' :
                                    row.status === 'paused' ? '#F3F4F6' :
                                    row.status === 'in_progress' ? '#3B82F6' :
                                    row.status === 'done' ? '#10B981' :
                                    row.isShiners ? '#F97316' : '#3B82F6',
                    color: (row.status === 'moved_s' || row.status === 'moved_fg' || row.status === 'paused') ? '#6B7280' : '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: (row.status === 'done' || row.status === 'moved_s' || row.status === 'moved_fg') ? 'default' : 'pointer',
                    padding: '0',
                    margin: '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (row.status !== 'done' && row.status !== 'moved_s' && row.status !== 'moved_fg') {
                      e.currentTarget.style.opacity = '0.9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {row.status === 'moved_s' ? 'Moved (Shiners)' :
                   row.status === 'moved_fg' ? 'Moved (FG)' :
                   row.isShiners && row.status === 'paused' ? 'Start' :
                   row.status === 'paused' ? 'Paused' :
                   row.status === 'in_progress' ? 'In Progress' :
                   row.status === 'done' ? 'Done' :
                   row.isShiners ? 'Start' : 'Start'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

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
              minWidth: '264px',
              maxWidth: 'calc(100vw - 32px)',
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
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (selectedRow.isShiners) {
                  // Unmark as shiners
                  console.log('Unmark as Shiners clicked for:', selectedRow);
                  const updatedData = localTableData.map(r => 
                    r.id === selectedRow.id 
                      ? { ...r, isShiners: false, status: r.status === 'paused' ? 'pending' : r.status }
                      : r
                  );
                  setLocalTableData(updatedData);
                  setOriginalTableData(updatedData);
                  setActionMenuId(null);
                } else {
                  // Mark as shiners
                  console.log('Mark as Floor Inv. (Shiners) MOUSEDOWN for:', selectedRow);
                  setSelectedProductForMarkShiners(selectedRow);
                  setShowMarkAsShinersModal(true);
                  setTimeout(() => {
                    setActionMenuId(null);
                  }, 100);
                }
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {selectedRow.isShiners ? (
                  <>
                    <path d="M20 6L9 17l-5-5" />
                  </>
                ) : (
                  <>
                    <rect x="6" y="4" width="12" height="16" rx="1" />
                    <path d="M9 4v4M15 4v4" />
                    <line x1="9" y1="12" x2="15" y2="12" />
                  </>
                )}
              </svg>
              <span>{selectedRow.isShiners ? 'Unmark as Shiners' : 'Mark as Floor Inv. (Shiners)'}</span>
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
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Mark as Floor Inv. (Finished Goods) clicked for:', selectedRow);
                setSelectedProductForMarkFinishedGoods(selectedRow);
                setShowMarkAsFinishedGoodsModal(true);
                setTimeout(() => {
                  setActionMenuId(null);
                }, 100);
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#111827" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="12" height="16" rx="1" />
                <path d="M9 4v4M15 4v4" />
                <line x1="9" y1="12" x2="15" y2="12" />
              </svg>
              <span>Mark as Floor Inv. (Finished Goods)</span>
            </button>

            {/* Desktop-only: Log Units Produced */}
            {!isMobile && (
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
                  
                  console.log('Log Units Produced MOUSEDOWN for:', selectedRow);
                  setSelectedProductForLogUnits(selectedRow);
                  setTimeout(() => {
                    setActionMenuId(null);
                  }, 100);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111827" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <span>Log Units Produced</span>
              </button>
            )}
            
            {/* Mobile-only options */}
            {isMobile && (
              <>
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
                    console.log('Product Notes clicked for:', selectedRow);
                    if (onProductNotes) {
                      onProductNotes(selectedRow);
                    }
                    setActionMenuId(null);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span>Product Notes</span>
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
                    console.log('More Details clicked for:', selectedRow);
                    if (onMoreDetails) {
                      onMoreDetails(selectedRow);
                    }
                    setActionMenuId(null);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>More Details</span>
                </button>
              </>
            )}
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
              // Determine if original product was "Done"
              const originalStatus = product.status || 'pending';
              const isDoneStatus = originalStatus === 'done';
              
              // Create split group ID to link the two products
              const splitGroupId = isDoneStatus ? Date.now() : null;
              
              // Create two new rows from the split
              const firstRow = {
                ...product,
                id: product.id, // Keep original ID for first batch
                status: isDoneStatus ? 'done' : 'paused', // Keep "Done" if original was done
                qty: firstBatchQty,
                isSplit: true, // Mark as split product
                splitGroupId: splitGroupId, // Link to second batch
              };
              
              // Generate a new ID for the second batch (using timestamp or incrementing)
              const maxId = Math.max(...currentData.map(r => r.id || 0), 0);
              const secondRow = {
                ...product,
                id: maxId + 1, // New ID for second batch
                status: isDoneStatus ? 'done' : 'pending', // Keep "Done" if original was done
                qty: secondBatchQty,
                isSplit: true, // Mark as split product
                splitGroupId: splitGroupId, // Link to first batch
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

      {/* Log Units Produced Modal */}
      {selectedProductForLogUnits && (
        <LogUnitsProducedModal
          isOpen={true}
          onClose={() => {
            setSelectedProductForLogUnits(null);
          }}
          productData={selectedProductForLogUnits}
          onConfirm={(unitsProduced) => {
            console.log('Units produced logged:', unitsProduced);
            // Update the product with units produced
            const currentData = localTableData.length > 0 ? localTableData : (data.length > 0 ? data : sampleData);
            const updatedData = currentData.map(row => 
              row.id === selectedProductForLogUnits.id 
                ? { 
                    ...row, 
                    unitsProduced, 
                    remainingQty: (row.qty || 0) - unitsProduced,
                    status: 'paused' 
                  }
                : row
            );
            
            setLocalTableData(updatedData);
            setOriginalTableData(updatedData);
            setSelectedProductForLogUnits(null);
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

      {/* Mark Units as Shiners Modal */}
      {selectedShinersProductToMove && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          onClick={() => setSelectedShinersProductToMove(null)}
        >
          <div
            style={{
              width: isMobile ? '343px' : '683px',
              minHeight: isMobile ? '212px' : '260px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              borderWidth: '1px',
              overflow: 'visible',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              padding: isMobile ? '16px' : '28px 24px 24px 24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Content Section */}
            <div style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '14px', alignItems: 'center', textAlign: 'center', flexShrink: 1, minHeight: 0 }}>
              {/* Warning Icon */}
              <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                <div
                  style={{
                    width: isMobile ? '32px' : '48px',
                    height: isMobile ? '32px' : '48px',
                    borderRadius: '50%',
                    backgroundColor: '#F97316',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width={isMobile ? '16' : '24'} height={isMobile ? '16' : '24'} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h2 style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: '700', color: '#111827', margin: 0, lineHeight: '1.3', flexShrink: 0 }}>
                Are you sure?
              </h2>

              {/* Body Text */}
              <div style={{ maxWidth: isMobile ? '100%' : '580px', textAlign: 'center', width: '100%', flexShrink: 1, minHeight: 0 }}>
                <p style={{ fontSize: isMobile ? '13px' : '15px', color: '#111827', margin: 0, lineHeight: '1.4', marginBottom: isMobile ? '6px' : '8px', textAlign: 'center' }}>
                  These units will no longer be included in this shipment and moved to floor inventory.
                </p>
                <p style={{ fontSize: isMobile ? '13px' : '15px', color: '#111827', margin: 0, lineHeight: '1.4', textAlign: 'center' }}>
                  Amazon will treat them as false inbound inventory for this shipment type.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div
              style={{
                padding: 0,
                marginTop: isMobile ? '12px' : '16px',
                display: 'flex',
                gap: isMobile ? '8px' : '12px',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => setSelectedShinersProductToMove(null)}
                style={{
                  width: isMobile ? '147.5px' : '309.5px',
                  height: isMobile ? '23px' : '40px',
                  padding: isMobile ? '4px 12px' : '0',
                  borderRadius: isMobile ? '4px' : '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#111827',
                  fontSize: isMobile ? '14px' : '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  console.log('Confirm clicked for shiners:', selectedShinersProductToMove);
                  // Update the row status to moved_s (Moved Shiners)
                  const updatedData = localTableData.map(r => 
                    r.id === selectedShinersProductToMove.id 
                      ? { ...r, isShiners: true, status: 'moved_s' }
                      : r
                  );
                  console.log('Updated data:', updatedData);
                  setLocalTableData(updatedData);
                  setOriginalTableData(updatedData); // Also update original data to persist changes
                  setSelectedShinersProductToMove(null);
                }}
                style={{
                  width: isMobile ? '147.5px' : '309.5px',
                  height: isMobile ? '23px' : '40px',
                  padding: isMobile ? '4px 12px' : '0',
                  borderRadius: isMobile ? '4px' : '8px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: isMobile ? '14px' : '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1D4ED8';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Start Item Marked as Shiners Modal */}
      {selectedShinersProductToStart && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          onClick={() => setSelectedShinersProductToStart(null)}
        >
          <div
            style={{
              width: isMobile ? '343px' : '380px',
              minHeight: isMobile ? 'auto' : '220px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              overflow: 'hidden',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Content Section */}
            <div style={{ padding: '32px 24px 24px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              {/* Warning Icon */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#FEF3C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0, lineHeight: '1.4' }}>
                Start Item Marked as Shiners?
              </h3>

              {/* Body Text */}
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: '1.6' }}>
                This line item is currently marked as shiners. Starting it will unmark the status.
              </p>
            </div>

            {/* Buttons */}
            <div style={{ padding: '0 24px 24px 24px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setSelectedShinersProductToStart(null)}
                style={{
                  width: isMobile ? '147.5px' : '159.5px',
                  height: isMobile ? '23px' : '31px',
                  padding: 0,
                  borderRadius: '4px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
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
                onClick={() => {
                  console.log('Unmark Shiners & Start clicked for:', selectedShinersProductToStart);
                  // Unmark as shiners and start production
                  const updatedData = localTableData.map(r => 
                    r.id === selectedShinersProductToStart.id 
                      ? { ...r, isShiners: false, status: 'pending' }
                      : r
                  );
                  setLocalTableData(updatedData);
                  setOriginalTableData(updatedData);
                  
                  setIsFromUnmarkShiners(true);
                  if (onSetIsFromUnmarkShiners) {
                    onSetIsFromUnmarkShiners(true);
                  }
                  if (onStartClick) {
                    onStartClick(selectedShinersProductToStart);
                  }
                  setSelectedShinersProductToStart(null);
                }}
                style={{
                  width: isMobile ? '147.5px' : '159.5px',
                  height: isMobile ? '23px' : '31px',
                  padding: 0,
                  borderRadius: '4px',
                  border: '1px solid #0066FF',
                  backgroundColor: '#0066FF',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0052CC';
                  e.currentTarget.style.borderColor = '#0052CC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#0066FF';
                  e.currentTarget.style.borderColor = '#0066FF';
                }}
              >
                Unmark Shiners & Start
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mark as Floor Inv. (Shiners) Confirmation Modal */}
      {console.log('Rendering check - showMarkAsShinersModal:', showMarkAsShinersModal, 'selectedProductForMarkShiners:', selectedProductForMarkShiners)}
      {(showMarkAsShinersModal && selectedProductForMarkShiners) && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
          }}
          onClick={() => {
            setShowMarkAsShinersModal(false);
            setSelectedProductForMarkShiners(null);
          }}
        >
          <div
            style={{
              width: isMobile ? '343px' : '480px',
              minHeight: isMobile ? '159px' : '260px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              borderWidth: '1px',
              overflow: 'visible',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              padding: isMobile ? '16px' : '32px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon and Title Section */}
            <div style={{ padding: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '20px', flexShrink: 0 }}>
              {/* Warning Icon */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: isMobile ? '40px' : '56px',
                    height: isMobile ? '40px' : '56px',
                    borderRadius: '50%',
                    backgroundColor: '#F97316',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width={isMobile ? '20' : '28'} height={isMobile ? '20' : '28'} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <h2 style={{ fontSize: isMobile ? '16px' : '22px', fontWeight: '700', color: '#111827', margin: 0, lineHeight: '1.3', textAlign: 'center' }}>
                Mark and Move to Shiner Inventory?
              </h2>

              {/* Body Text */}
              <div style={{ textAlign: 'left', paddingLeft: 0 }}>
                <p style={{ fontSize: isMobile ? '14px' : '16px', color: '#111827', fontWeight: '400', margin: 0, lineHeight: '1.4', textAlign: 'left' }}>
                  {selectedProductForMarkShiners?.product} ({selectedProductForMarkShiners?.size}) • {selectedProductForMarkShiners?.qty?.toLocaleString()} Units
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div
              style={{
                padding: 0,
                marginTop: isMobile ? '16px' : '16px',
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => {
                  console.log('Mark as Shiners (first button) clicked');
                  // Just mark as shiners without moving
                  const updatedData = localTableData.map(r => 
                    r.id === selectedProductForMarkShiners.id 
                      ? { ...r, isShiners: true, status: 'paused' }
                      : r
                  );
                  setLocalTableData(updatedData);
                  setOriginalTableData(updatedData); // Also update original data to persist changes
                  setShowMarkAsShinersModal(false);
                  setSelectedProductForMarkShiners(null);
                }}
                style={{
                  width: isMobile ? '147.5px' : '200px',
                  height: isMobile ? '40px' : '40px',
                  padding: 0,
                  borderRadius: '8px',
                  border: '1px solid #2563EB',
                  backgroundColor: '#FFFFFF',
                  color: '#2563EB',
                  fontSize: isMobile ? '14px' : '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#EFF6FF';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  console.log('Mark as Shiners & Move confirmed for:', selectedProductForMarkShiners);
                  // Set the selected product to show the next modal
                  setSelectedShinersProductToMove(selectedProductForMarkShiners);
                  setShowMarkAsShinersModal(false);
                  setSelectedProductForMarkShiners(null);
                }}
                style={{
                  width: isMobile ? '147.5px' : '200px',
                  height: isMobile ? '40px' : '40px',
                  padding: 0,
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: isMobile ? '14px' : '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1D4ED8';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Confirm & Move
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mark as Finished Goods Modal */}
      {(showMarkAsFinishedGoodsModal && selectedProductForMarkFinishedGoods) && createPortal(
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
            padding: '16px',
          }}
          onClick={() => {
            setShowMarkAsFinishedGoodsModal(false);
            setSelectedProductForMarkFinishedGoods(null);
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: isMobile ? '12px' : '12px',
              width: isMobile ? '343px' : '90%',
              maxWidth: isMobile ? '343px' : '440px',
              height: isMobile ? '186px' : 'auto',
              padding: isMobile ? '16px' : '0',
              border: isMobile ? '1px solid #E5E7EB' : 'none',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
              display: isMobile ? 'flex' : 'block',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '24px' : '0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon and Title */}
            <div style={{ padding: isMobile ? '0' : '32px 24px 24px', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </div>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#111827',
                  margin: '0 0 12px 0',
                }}
              >
                Mark Units as Finished Goods & Move?
              </h2>
              <p
                style={{
                  fontSize: '14px',
                  color: '#6B7280',
                  margin: 0,
                  lineHeight: '1.5',
                }}
              >
                You're marking the following units as finished goods: {selectedProductForMarkFinishedGoods?.product} ({selectedProductForMarkFinishedGoods?.size}) • {selectedProductForMarkFinishedGoods?.qty?.toLocaleString()} Units
              </p>
            </div>

            {/* Buttons */}
            <div
              style={{
                padding: isMobile ? '0' : '24px',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                borderTop: isMobile ? 'none' : '1px solid #E5E7EB',
              }}
            >
              <button
                onClick={() => {
                  setShowMarkAsFinishedGoodsModal(false);
                  setSelectedProductForMarkFinishedGoods(null);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
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
                onClick={() => {
                  console.log('Mark as Finished Goods & Move confirmed for:', selectedProductForMarkFinishedGoods);
                  
                  // Check if this is a split product (has splitGroupId)
                  const isSplitProduct = selectedProductForMarkFinishedGoods?.splitGroupId;
                  const currentData = localTableData.length > 0 ? localTableData : (data.length > 0 ? data : sampleData);
                  
                  let updatedData = [...currentData];
                  
                  if (isSplitProduct) {
                    // Find all products in the split group
                    const splitGroupId = selectedProductForMarkFinishedGoods.splitGroupId;
                    const splitProducts = updatedData.filter(r => r.splitGroupId === splitGroupId);
                    
                    if (splitProducts.length === 2) {
                      // Find indices of all split products
                      const splitIndices = splitProducts.map(product => 
                        updatedData.findIndex(r => r.id === product.id)
                      ).sort((a, b) => a - b);
                      
                      const firstIndex = splitIndices[0];
                      const secondIndex = splitIndices[1];
                      const clickedProductIndex = updatedData.findIndex(r => r.id === selectedProductForMarkFinishedGoods.id);
                      
                      // Update all split products
                      updatedData = updatedData.map((r, index) => {
                        if (r.splitGroupId === splitGroupId) {
                          if (index === clickedProductIndex) {
                            // The clicked product becomes "moved_fg"
                            return { ...r, status: 'moved_fg', isSplit: false, splitGroupId: null };
                          } else if (index === firstIndex) {
                            // First product (by table order) → status: 'paused'
                            return { ...r, status: 'paused', isSplit: false, splitGroupId: null };
                          } else if (index === secondIndex) {
                            // Second product → status: 'pending' (Start)
                            return { ...r, status: 'pending', isSplit: false, splitGroupId: null };
                          }
                        }
                        return r;
                      });
                    }
                  } else {
                    // Not a split product - just mark as moved_fg
                    updatedData = updatedData.map(r =>
                      r.id === selectedProductForMarkFinishedGoods.id
                        ? { ...r, status: 'moved_fg' }
                        : r
                    );
                  }
                  
                  // Update state
                  setLocalTableData(updatedData);
                  setOriginalTableData(updatedData);
                  
                  setShowMarkAsFinishedGoodsModal(false);
                  setSelectedProductForMarkFinishedGoods(null);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#1D4ED8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
              >
                Mark as Finished Goods & Move
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default PackagingTable;
