import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import SortFormulasFilterDropdown from '../../new-shipment/components/SortFormulasFilterDropdown';
import ProductionNotesModal from './ProductionNotesModal';

const PackagingTable = ({ data = [], onStartClick, searchQuery = '', isSortMode = false, onExitSortMode }) => {
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
  const [draggedRowIndex, setDraggedRowIndex] = useState(null);
  const [draggedOverRowIndex, setDraggedOverRowIndex] = useState(null);
  const [localTableData, setLocalTableData] = useState([]);
  const [originalTableData, setOriginalTableData] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  // Initialize local table data
  useEffect(() => {
    const initialData = data.length > 0 ? data : sampleData;
    setLocalTableData(initialData);
    setOriginalTableData(initialData);
  }, [data.length]);

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
    { key: 'status', label: 'STATUS', width: '140px', align: 'left' },
    { key: 'tpsShipNumber', label: 'TPS SHIP #', width: '140px', align: 'left' },
    { key: 'type', label: 'TYPE', width: '100px', align: 'left' },
    { key: 'brand', label: 'BRAND', width: '160px', align: 'left' },
    { key: 'product', label: 'PRODUCT', width: '200px', align: 'left', sortable: true },
    { key: 'size', label: 'SIZE', width: '120px', align: 'left' },
    { key: 'qty', label: 'QTY', width: '140px', align: 'right' },
    { key: 'caseNumber', label: 'CASE #', width: '100px', align: 'right' },
    { key: 'sku', label: 'SKU', width: '220px', align: 'left', sortable: true },
    { key: 'formula', label: 'FORMULA', width: '160px', align: 'left' },
    { key: 'labelLocation', label: 'LABEL LOCATION', width: '140px', align: 'left' },
    { key: 'cap', label: 'CAP', width: '120px', align: 'left' },
    { key: 'productType', label: 'TYPE', width: '100px', align: 'left' },
    { key: 'filter', label: 'FILTER', width: '100px', align: 'left' },
    { key: 'notes', label: 'NOTES', width: '100px', align: 'center' },
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
                  paddingLeft: column.key === 'actions' ? '4px' : '16px',
                  paddingRight: column.key === 'actions' ? '16px' : '16px',
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
                  opacity: draggedRowIndex === index ? 0.5 : 1,
                  backgroundColor: draggedOverRowIndex === index && isSortMode ? '#F3F4F6' : 'transparent',
                  cursor: isSortMode ? 'grab' : 'default',
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
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
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
                  ) : (
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
                  )}
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
                  className={`flex items-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                    justifyContent: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.sku}
                  </span>
                </div>

                {/* FORMULA */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  {row.formula || 'F.Indoor Plant Food'}
                </div>

                {/* LABEL LOCATION */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  {row.labelLocation || 'LBL-PLANT-218'}
                </div>

                {/* CAP */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  {row.cap || 'VENTED Berry'}
                </div>

                {/* TYPE (second instance - product type) */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  {row.productType || 'Liquid'}
                </div>

                {/* FILTER */}
                <div
                  className={`flex items-center justify-center ${themeClasses.textPrimary}`}
                  style={{ 
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '12px',
                    paddingBottom: '12px',
                  }}
                >
                  {row.filter || 'Metal'}
                </div>

                {/* NOTES */}
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
