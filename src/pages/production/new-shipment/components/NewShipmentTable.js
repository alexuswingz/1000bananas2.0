import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const NewShipmentTable = ({ rows, tableMode, onProductClick, qtyValues, onQtyChange, onAddedRowsChange }) => {
  const { isDarkMode } = useTheme();
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [addedRows, setAddedRows] = useState(new Set());
  const selectAllCheckboxRef = useRef(null);
  const [clickedQtyIndex, setClickedQtyIndex] = useState(null);
  const [hoveredQtyIndex, setHoveredQtyIndex] = useState(null);
  const qtyContainerRefs = useRef({});
  const popupRefs = useRef({});
  const qtyInputRefs = useRef({});
  const [openFilterIndex, setOpenFilterIndex] = useState(null);
  const filterRefs = useRef({});
  const filterModalRefs = useRef({});

  // Use local state if props not provided (for backward compatibility)
  const [internalQtyValues, setInternalQtyValues] = useState(() => {
    if (qtyValues) return null; // Use props if provided
    const initialValues = {};
    rows.forEach((row, index) => {
      initialValues[index] = ''; // Default to empty
    });
    return initialValues;
  });

  const effectiveQtyValues = qtyValues || internalQtyValues || {};
  const effectiveSetQtyValues = onQtyChange || setInternalQtyValues;

  // Update qtyValues when rows change (only if using internal state)
  useEffect(() => {
    if (!qtyValues && !onQtyChange && internalQtyValues) {
      const newValues = {};
      rows.forEach((row, index) => {
        newValues[index] = internalQtyValues[index] ?? ''; // Default to empty
      });
      setInternalQtyValues(newValues);
    }
  }, [rows.length]);

  // Check if all rows are selected
  const allSelected = useMemo(() => {
    return rows.length > 0 && selectedRows.size === rows.length;
  }, [rows.length, selectedRows.size]);

  // Check if some rows are selected (for indeterminate state)
  const someSelected = useMemo(() => {
    return selectedRows.size > 0 && selectedRows.size < rows.length;
  }, [selectedRows.size, rows.length]);

  // Set indeterminate state for select all checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  // Position popup when it appears
  useEffect(() => {
    if (clickedQtyIndex !== null) {
      const qtyContainer = qtyContainerRefs.current[clickedQtyIndex];
      const popup = popupRefs.current[clickedQtyIndex];
      
      if (qtyContainer && popup) {
        const rect = qtyContainer.getBoundingClientRect();
        const popupHeight = popup.offsetHeight || 200;
        const top = rect.top - popupHeight - 12;
        const left = rect.left + rect.width / 2;
        
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
        popup.style.transform = 'translateX(-50%)';
      }
    }
  }, [clickedQtyIndex]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clickedQtyIndex !== null) {
        const qtyContainer = qtyContainerRefs.current[clickedQtyIndex];
        const popup = popupRefs.current[clickedQtyIndex];
        
        // Check if click is outside both the QTY container and the popup
        if (qtyContainer && popup) {
          const isClickInsideQty = qtyContainer.contains(event.target);
          const isClickInsidePopup = popup.contains(event.target);
          
          // Only close if click is truly outside
          if (!isClickInsideQty && !isClickInsidePopup) {
            setClickedQtyIndex(null);
          }
        }
      }
    };

    if (clickedQtyIndex !== null) {
      // Use a timeout to add listener after current event cycle completes
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [clickedQtyIndex]);

  // Position filter modal when it appears
  useEffect(() => {
    if (openFilterIndex !== null) {
      const filterButton = filterRefs.current[openFilterIndex];
      const filterModal = filterModalRefs.current[openFilterIndex];
      
      if (filterButton && filterModal) {
        const rect = filterButton.getBoundingClientRect();
        const dropdownWidth = 228;
        const dropdownHeight = 265;
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
        
        filterModal.style.top = `${top}px`;
        filterModal.style.left = `${left}px`;
      }
    }
  }, [openFilterIndex]);

  // Close filter modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterIndex !== null) {
        const filterButton = filterRefs.current[openFilterIndex];
        const filterModal = filterModalRefs.current[openFilterIndex];
        
        if (filterButton && filterModal) {
          const isClickInsideButton = filterButton.contains(event.target);
          const isClickInsideModal = filterModal.contains(event.target);
          
          if (!isClickInsideButton && !isClickInsideModal) {
            setOpenFilterIndex(null);
          }
        }
      }
    };

    if (openFilterIndex !== null) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterIndex]);

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(new Set(rows.map(row => row.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  // Handle individual row checkbox
  const handleRowSelect = (rowId, e) => {
    const newSelected = new Set(selectedRows);
    if (e.target.checked) {
      newSelected.add(rowId);
    } else {
      newSelected.delete(rowId);
    }
    setSelectedRows(newSelected);
  };

  // Handle Add button click
  const handleAddClick = (row, index) => {
    const newAdded = new Set(addedRows);
    
    if (newAdded.has(row.id)) {
      // Remove from added - clear qty
      newAdded.delete(row.id);
      effectiveSetQtyValues(prev => ({
        ...prev,
        [index]: ''
      }));
    } else {
      // Add - don't auto-populate, let user type
      newAdded.add(row.id);
      // Only set if qtyValues[index] is undefined, otherwise keep existing value
      if (effectiveQtyValues[index] === undefined || effectiveQtyValues[index] === null) {
        effectiveSetQtyValues(prev => ({
          ...prev,
          [index]: ''
        }));
      }
    }
    setAddedRows(newAdded);
    // Notify parent component of added rows change
    if (onAddedRowsChange) {
      onAddedRowsChange(newAdded);
    }
  };

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#2C3544]',
  };

  if (!tableMode) {
    // Normal view with timeline
    return (
      <>
        <div
          className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl shadow-sm`}
          style={{ marginTop: '1.25rem' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
              }}
            >
              <thead className={themeClasses.headerBg}>
                <tr style={{ height: '40px', maxHeight: '40px' }}>
                  {['Brand', 'Product', 'Size', 'Add', 'Qty'].map((col, idx) => (
                    <th
                      key={col}
                      className="group text-xs font-bold text-white uppercase tracking-wider"
                      style={{
                        padding: '0 1rem',
                        height: '40px',
                        maxHeight: '40px',
                        lineHeight: '40px',
                        boxSizing: 'border-box',
                        textAlign: idx === 3 || idx === 4 ? 'center' : 'left',
                        borderRight: '1px solid #FFFFFF',
                        position: 'relative',
                        width:
                          idx === 0
                            ? 160
                            : idx === 1
                            ? 200
                            : idx === 2
                            ? 70
                            : idx === 3 || idx === 4
                            ? 120
                            : undefined,
                      }}
                    >
                      <span>{col}</span>
                      <img
                        ref={(el) => {
                          if (el) filterRefs.current[`normal-${idx}`] = el;
                        }}
                        src="/assets/Vector (1).png"
                        alt="Filter"
                        className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                        style={{ 
                          width: '12px', 
                          height: '12px',
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          cursor: 'pointer',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const filterKey = `normal-${idx}`;
                          setOpenFilterIndex(openFilterIndex === filterKey ? null : filterKey);
                        }}
                      />
                    </th>
                  ))}
                  <th
                    className="group text-xs font-bold text-white tracking-wider"
                    style={{
                      padding: '0 1rem',
                      height: '40px',
                      maxHeight: '40px',
                      boxSizing: 'border-box',
                      textAlign: 'left',
                      verticalAlign: 'middle',
                      overflow: 'hidden',
                      borderRight: '1px solid #FFFFFF',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.6rem',
                        marginBottom: '2px',
                        paddingRight: '24px',
                        lineHeight: '1.2',
                      }}
                    >
                      <div style={{ marginLeft: '20px' }}>
                        <div style={{ fontWeight: 600 }}>Today</div>
                        <div style={{ opacity: 0.85 }}>11/11/25</div>
                      </div>
                      <div style={{ textAlign: 'left', marginLeft: '40px' }}>
                        <div style={{ fontWeight: 600 }}>DOI Goal</div>
                        <div style={{ opacity: 0.85 }}>4/13/25</div>
                      </div>
                    </div>
                    <img
                      ref={(el) => {
                        if (el) filterRefs.current['doi-goal'] = el;
                      }}
                      src="/assets/Vector (1).png"
                      alt="Filter"
                      className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                      style={{ 
                        width: '12px', 
                        height: '12px',
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFilterIndex(openFilterIndex === 'doi-goal' ? null : 'doi-goal');
                      }}
                    />
                    <div
                      style={{
                        position: 'relative',
                        height: '18px',
                        marginTop: '-4px',
                      }}
                    >
                      {[
                        { label: 'Dec', left: '20%' },
                        { label: 'Jan', left: '40%' },
                        { label: 'Feb', left: '60%' },
                        { label: 'Mar', left: '80%' },
                      ].map((m) => (
                        <span
                          key={m.label}
                          style={{
                            position: 'absolute',
                            top: -14,
                            left: m.left,
                            transform: 'translateX(-50%)',
                            fontSize: '0.6rem',
                          }}
                        >
                          {m.label}
                        </span>
                      ))}
                      <div
                        style={{
                          position: 'absolute',
                          left: '6%',
                          right: '8%',
                          top: 10,
                          height: '2px',
                          backgroundColor: '#E5E7EB',
                          borderRadius: '9999px',
                        }}
                      />
                      {['6%', '24%', '42%', '60%', '78%', '92%'].map((left) => (
                        <span
                          key={left}
                          style={{
                            position: 'absolute',
                            left,
                            top: 10,
                            transform: 'translate(-50%, -50%)',
                            width: '8px',
                            height: '8px',
                            borderRadius: '9999px',
                            border: '2px solid #FFFFFF',
                            backgroundColor: '#FFFFFF',
                          }}
                        />
                      ))}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="border-t border-gray-200" style={{ height: '40px', maxHeight: '40px' }}>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', height: '40px', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }} className={themeClasses.text}>
                      {row.brand}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', height: '40px', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                      <button
                        type="button"
                        onClick={() => onProductClick(row)}
                        className="text-xs text-blue-500 hover:text-blue-600"
                        style={{ cursor: 'pointer' }}
                      >
                        {row.product}...
                      </button>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', height: '40px', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }} className={themeClasses.textSecondary}>
                      {row.size}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center', height: '40px', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB', boxShadow: 'inset 4px 0 8px -4px rgba(0, 0, 0, 0.15)' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                        <button
                          type="button"
                          onClick={() => handleAddClick(row, index)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: addedRows.has(row.id) ? '0' : '10px',
                            width: '80px',
                            height: '24px',
                            borderRadius: '9999px',
                            border: 'none',
                            backgroundColor: addedRows.has(row.id) ? '#10B981' : '#2563EB',
                            color: '#FFFFFF',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            fontFamily: 'sans-serif',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'background-color 0.2s',
                            position: 'relative',
                          }}
                        >
                          {!addedRows.has(row.id) && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '9.33px',
                                height: '9.33px',
                                color: '#FFFFFF',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                lineHeight: 1,
                                flexShrink: 0,
                              }}
                            >
                              +
                            </span>
                          )}
                          <span style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{addedRows.has(row.id) ? 'Added' : 'Add'}</span>
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center', height: '40px', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                      <input
                        type="number"
                        value={effectiveQtyValues[index] !== undefined && effectiveQtyValues[index] !== null && effectiveQtyValues[index] !== '' ? String(effectiveQtyValues[index]) : ''}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Allow empty string while typing, or parse the number
                          if (inputValue === '' || inputValue === '-') {
                            effectiveSetQtyValues(prev => ({
                              ...prev,
                              [index]: ''
                            }));
                          } else {
                            const numValue = parseInt(inputValue, 10);
                            if (!isNaN(numValue) && numValue >= 0) {
                              effectiveSetQtyValues(prev => ({
                                ...prev,
                                [index]: numValue
                              }));
                            }
                          }
                        }}
                        placeholder="0"
                        className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-md text-xs ${themeClasses.text}`}
                        style={{
                          padding: '0.25rem 0.5rem',
                          width: '90px',
                          textAlign: 'center',
                          cursor: 'text',
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.65rem 1rem', minWidth: '380px', height: '40px', verticalAlign: 'middle', borderTop: '1px solid #E5E7EB' }}>
                      <div
                        style={{
                          width: '86%',
                          margin: '0 auto',
                          transform: 'translateX(-7px)',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            bottom: '-8px',
                            left: 0,
                            borderLeft: `2px dashed ${isDarkMode ? '#9CA3AF' : '#9CA3AF'}`,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            bottom: '-8px',
                            right: 0,
                            borderRight: `2px dashed ${isDarkMode ? '#9CA3AF' : '#9CA3AF'}`,
                          }}
                        />
                        <div
                          style={{
                            marginRight: index === 2 ? '30px' : index === 0 ? '-30px' : 0,
                            position: 'relative',
                          }}
                        >
                          <div
                            onDoubleClick={() => onProductClick(row)}
                            style={{
                              borderRadius: '9999px',
                              backgroundColor: isDarkMode ? '#020617' : '#F3F4F6',
                              overflow: 'hidden',
                              height: '18px',
                              display: 'flex',
                              cursor: 'pointer',
                            }}
                            title="Double-click to view N-GOOS details"
                          >
                            <div style={{ flex: 2, backgroundColor: '#A855F7' }} />
                            <div style={{ flex: 3, backgroundColor: '#22C55E' }} />
                            <div style={{ flex: 3, backgroundColor: '#3B82F6' }} />
                          </div>
                          {index === 0 && (
                            <span
                              style={{
                                position: 'absolute',
                                right: '-18px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#007AFF',
                              }}
                            >
                              +5
                            </span>
                          )}
                          {index === 2 && (
                            <span
                              style={{
                                position: 'absolute',
                                right: '-18px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#007AFF',
                              }}
                            >
                              -5
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            padding: '0.5rem 1.5rem 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '1.5rem',
          }}
        >
          {[
            { label: 'FBA Avail.', color: '#A855F7' },
            { label: 'Total Inv.', color: '#22C55E' },
            { label: 'Forecast', color: '#3B82F6' },
          ].map((item) => (
            <div
              key={item.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
              className={themeClasses.textSecondary}
            >
              <span
                style={{
                  width: '0.75rem',
                  height: '0.75rem',
                  borderRadius: '9999px',
                  backgroundColor: item.color,
                }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* Filter Modals */}
        {['normal-0', 'normal-1', 'normal-2', 'normal-3', 'normal-4', 'doi-goal'].map((filterKey) => (
          openFilterIndex === filterKey && (
            <div
              key={filterKey}
              ref={(el) => {
                if (el) filterModalRefs.current[filterKey] = el;
              }}
              style={{
                position: 'fixed',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '16px',
                width: '228px',
                boxSizing: 'border-box',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: 10000,
                border: '1px solid #E5E7EB',
                pointerEvents: 'auto',
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
                    onClick={() => setOpenFilterIndex(null)}
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
                    <option value="fbaAvailable">FBA Available</option>
                    <option value="totalInventory">Total Inventory</option>
                    <option value="forecast">Forecast</option>
                    <option value="sales7">7 Day Sales</option>
                    <option value="sales30">30 Day Sales</option>
                  </select>
                  
                  <select
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
                    <option value="">Select order</option>
                    <option value="asc">A^Z Sort ascending (A to Z)</option>
                    <option value="desc">Z^A Sort descending (Z to A)</option>
                    <option value="numAsc">0^9 Sort ascending (0 to 9)</option>
                    <option value="numDesc">9^0 Sort descending (9 to 0)</option>
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
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#9CA3AF',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select field</option>
                    <option value="brand">Brand</option>
                    <option value="product">Product</option>
                    <option value="size">Size</option>
                    <option value="qty">Qty</option>
                  </select>
                  
                  <select
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#9CA3AF',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select condition</option>
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greaterThan">Greater than</option>
                    <option value="lessThan">Less than</option>
                  </select>
                  
                  <input
                    type="text"
                    placeholder="Value here..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                <button
                  type="button"
                  onClick={() => setOpenFilterIndex(null)}
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
                  onClick={() => setOpenFilterIndex(null)}
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
          )
        ))}
      </>
    );
  }

  // Table mode view
  return (
    <>
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      <div
      className={`${themeClasses.cardBg} ${themeClasses.border} border shadow-sm`}
      style={{ marginTop: '1.25rem', borderRadius: '6px', overflow: 'hidden' }}
    >
      <div style={{ 
        overflowX: 'auto', 
        overflowY: 'visible',
        width: '100%',
        WebkitOverflowScrolling: 'touch',
        position: 'relative',
      }}>
        <table
          style={{
            width: 'max-content',
            minWidth: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'fixed',
          }}
        >
          <thead className={themeClasses.headerBg}>
            <tr style={{ height: '40px', maxHeight: '40px' }}>
              {/* Sticky columns */}
              <th style={{ 
                padding: '0 0.75rem', 
                width: '40px', 
                minWidth: '40px',
                maxWidth: '40px',
                height: '40px',
                maxHeight: '40px',
                boxSizing: 'border-box',
                textAlign: 'center',
                position: 'sticky',
                left: 0,
                zIndex: 20,
                backgroundColor: '#1C2634',
                boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                borderTopLeftRadius: '6px',
                borderRight: '1px solid #FFFFFF',
              }}>
                <input 
                  type="checkbox" 
                  style={{ cursor: 'pointer' }}
                  checked={allSelected}
                  ref={selectAllCheckboxRef}
                  onChange={handleSelectAll}
                />
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '0 0.75rem', 
                  textAlign: 'center',
                  position: 'sticky',
                  left: '40px',
                  zIndex: 20,
                  backgroundColor: '#1C2634',
                  width: '150px',
                  minWidth: '150px',
                  maxWidth: '150px',
                  height: '40px',
                  maxHeight: '40px',
                  boxSizing: 'border-box',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  borderRight: '1px solid #FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>BRAND</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '0 0.75rem', 
                  textAlign: 'center',
                  position: 'sticky',
                  left: '190px',
                  zIndex: 20,
                  backgroundColor: '#1C2634',
                  width: '200px',
                  minWidth: '200px',
                  maxWidth: '200px',
                  height: '40px',
                  maxHeight: '40px',
                  boxSizing: 'border-box',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  borderRight: '1px solid #FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>PRODUCT</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '0 0.75rem', 
                  textAlign: 'center',
                  position: 'sticky',
                  left: '390px',
                  zIndex: 20,
                  backgroundColor: '#1C2634',
                  width: '120px',
                  minWidth: '120px',
                  maxWidth: '120px',
                  height: '40px',
                  maxHeight: '40px',
                  boxSizing: 'border-box',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  borderRight: '1px solid #FFFFFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>SIZE</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
                  />
                </div>
              </th>
              {/* Scrollable columns */}
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>QTY</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ position: 'relative', width: '100%' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                  }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      lineHeight: 1.1, 
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>INVENTORY</span>
                    <span style={{ 
                      fontSize: '0.6rem', 
                      fontWeight: 400, 
                      lineHeight: 1.1, 
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>FBA AVAILABLE (DAYS)</span>
                  </div>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      position: 'absolute',
                      right: '0',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ position: 'relative', width: '100%' }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                  }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      lineHeight: 1.1, 
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>INVENTORY</span>
                    <span style={{ 
                      fontSize: '0.6rem', 
                      fontWeight: 400, 
                      lineHeight: 1.1, 
                      color: '#FFFFFF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>TOTAL (DAYS)</span>
                  </div>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ 
                      width: '12px', 
                      height: '12px',
                      position: 'absolute',
                      right: '0',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>FORECAST</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>7 DAY SALES</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>30 DAY SALES</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>4 MONTH SALES</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
                  />
                </div>
              </th>
              <th 
                className="group"
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  maxHeight: '40px',
                  borderRight: '1px solid #FFFFFF',
                  boxSizing: 'border-box',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '12px',
                  lineHeight: '100%',
                  letterSpacing: '0%',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  backgroundColor: '#1C2634',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span>FORMULA</span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                    style={{ width: '12px', height: '12px' }}
                  />
                </div>
              </th>
              {/* Sticky three dots */}
              <th style={{ 
                padding: '0 1rem', 
                width: '40px',
                height: '40px',
                maxHeight: '40px',
                boxSizing: 'border-box',
                textAlign: 'center',
                position: 'sticky',
                right: 0,
                zIndex: 20,
                backgroundColor: '#1C2634',
                boxShadow: '-2px 0 4px rgba(0,0,0,0.1)',
                borderRight: '1px solid #FFFFFF',
                borderTopRightRadius: '6px',
              }}>
                <span style={{ color: '#FFFFFF', fontSize: '1rem' }}>⋮</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} style={{ height: '40px', maxHeight: '40px' }}>
                {/* Sticky columns */}
                <td style={{ 
                  padding: '0.65rem 0.75rem', 
                  textAlign: 'center',
                  position: 'sticky',
                  left: 0,
                  zIndex: 15,
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  width: '40px',
                  minWidth: '40px',
                  maxWidth: '40px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                  borderTop: '1px solid #E5E7EB',
                }}>
                  <input 
                    type="checkbox" 
                    style={{ cursor: 'pointer' }}
                    checked={selectedRows.has(row.id)}
                    onChange={(e) => handleRowSelect(row.id, e)}
                  />
                </td>
                <td style={{ 
                  padding: '0.65rem 0.75rem', 
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  position: 'sticky',
                  left: '40px',
                  zIndex: 15,
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  width: '150px',
                  minWidth: '150px',
                  maxWidth: '150px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {row.brand}
                </td>
                <td style={{ 
                  padding: '0.65rem 0.75rem', 
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  position: 'sticky',
                  left: '190px',
                  zIndex: 15,
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  height: '40px',
                  verticalAlign: 'middle',
                  width: '200px',
                  minWidth: '200px',
                  maxWidth: '200px',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                  borderTop: '1px solid #E5E7EB',
                }}>
                  <button
                    type="button"
                    onClick={() => onProductClick(row)}
                    className="text-xs text-blue-500 hover:text-blue-600"
                    style={{ textDecoration: 'underline', cursor: 'pointer', margin: '0 auto', display: 'block' }}
                  >
                    {row.product.length > 18 ? `${row.product.substring(0, 18)}...` : row.product}
                  </button>
                </td>
                <td style={{ 
                  padding: '0.65rem 0.75rem', 
                  fontSize: '0.85rem',
                  textAlign: 'center',
                  position: 'sticky',
                  left: '390px',
                  zIndex: 15,
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  width: '120px',
                  minWidth: '120px',
                  maxWidth: '120px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.textSecondary}>
                  {row.size}
                </td>
                {/* Scrollable columns */}
                <td style={{ 
                  padding: '12px 16px', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <div
                      ref={(el) => {
                        if (el) qtyContainerRefs.current[index] = el;
                      }}
                      onMouseEnter={() => setHoveredQtyIndex(index)}
                      onMouseLeave={() => setHoveredQtyIndex(null)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        padding: '4px 6px',
                        width: '107px',
                        height: '24px',
                        boxSizing: 'border-box',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <input
                        key={`qty-input-${index}`}
                        ref={(el) => {
                          if (el) qtyInputRefs.current[index] = el;
                        }}
                        type="number"
                        data-row-index={index}
                        value={effectiveQtyValues[index] !== undefined && effectiveQtyValues[index] !== null && effectiveQtyValues[index] !== '' ? String(effectiveQtyValues[index]) : (effectiveQtyValues[index] === '' ? '' : '0')}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          // Allow empty string while typing, or parse the number
                          if (inputValue === '' || inputValue === '-') {
                            effectiveSetQtyValues(prev => ({
                              ...prev,
                              [index]: ''
                            }));
                          } else {
                            const newValue = parseInt(inputValue, 10);
                            if (!isNaN(newValue)) {
                              effectiveSetQtyValues(prev => ({
                                ...prev,
                                [index]: newValue
                              }));
                            }
                          }
                        }}
                        onBlur={(e) => {
                          // Set default value if empty on blur
                          if (effectiveQtyValues[index] === '' || effectiveQtyValues[index] === null || effectiveQtyValues[index] === undefined) {
                            effectiveSetQtyValues(prev => ({
                              ...prev,
                              [index]: 0
                            }));
                          }
                          // Close popup if open when blurring
                          if (clickedQtyIndex === index) {
                            setClickedQtyIndex(null);
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const labelsAvailable = row.labelsAvailable || 180;
                          const labelsNeeded = effectiveQtyValues[index] ?? 0;
                          // Only show popup if labels needed exceed available
                          if (labelsNeeded > labelsAvailable) {
                            // Toggle popup: close if already open, open if closed
                            setClickedQtyIndex(clickedQtyIndex === index ? null : index);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#111827',
                          textAlign: 'center',
                          padding: 0,
                          margin: 0,
                          MozAppearance: 'textfield',
                          WebkitAppearance: 'none',
                        }}
                        onFocus={(e) => {
                          e.target.select();
                        }}
                        onWheel={(e) => {
                          e.target.blur();
                        }}
                      />
                      {hoveredQtyIndex === index && (
                        <div style={{
                          position: 'absolute',
                          right: '2px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0',
                          height: '20px',
                          width: '14px',
                        }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const currentQty = effectiveQtyValues[index] ?? 0;
                            const numQty = typeof currentQty === 'number' ? currentQty : (currentQty === '' || currentQty === null || currentQty === undefined ? 0 : parseInt(currentQty, 10) || 0);
                            
                            // Determine increment based on size
                            let increment = 0;
                            const size = row.size?.toLowerCase() || '';
                            if (size.includes('8oz')) {
                              increment = 60;
                            } else if (size.includes('quart')) {
                              increment = 12;
                            } else if (size.includes('gallon')) {
                              increment = 4;
                            }
                            
                            const newQty = Math.max(0, numQty + increment);
                            effectiveSetQtyValues(prev => ({
                              ...prev,
                              [index]: newQty
                            }));
                          }}
                          style={{
                            width: '100%',
                            height: '50%',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            margin: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F3F4F6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <svg
                            width="8"
                            height="8"
                            viewBox="0 0 8 8"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M4 2L6 5H2L4 2Z"
                              fill="#6B7280"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const currentQty = effectiveQtyValues[index] ?? 0;
                            const numQty = typeof currentQty === 'number' ? currentQty : (currentQty === '' || currentQty === null || currentQty === undefined ? 0 : parseInt(currentQty, 10) || 0);
                            
                            // Determine increment based on size
                            let increment = 0;
                            const size = row.size?.toLowerCase() || '';
                            if (size.includes('8oz')) {
                              increment = 60;
                            } else if (size.includes('quart')) {
                              increment = 12;
                            } else if (size.includes('gallon')) {
                              increment = 4;
                            }
                            
                            const newQty = Math.max(0, numQty - increment);
                            effectiveSetQtyValues(prev => ({
                              ...prev,
                              [index]: newQty
                            }));
                          }}
                          style={{
                            width: '100%',
                            height: '50%',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            margin: 0,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#F3F4F6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <svg
                            width="8"
                            height="8"
                            viewBox="0 0 8 8"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M4 6L2 3H6L4 6Z"
                              fill="#6B7280"
                            />
                          </svg>
                        </button>
                        </div>
                      )}
                      {(() => {
                        const labelsAvailable = row.labelsAvailable || 180;
                        const labelsNeeded = effectiveQtyValues[index] ?? 0;
                        // Only show exclamation if labels needed exceed available
                        if (labelsNeeded > labelsAvailable) {
                          return (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                backgroundColor: '#EF4444',
                                color: '#FFFFFF',
                                fontSize: '10px',
                                fontWeight: 700,
                                flexShrink: 0,
                                position: 'absolute',
                                right: '6px',
                              }}
                            >
                              !
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    {clickedQtyIndex === index && (() => {
                      const labelsAvailable = row.labelsAvailable || 180;
                      const labelsNeeded = effectiveQtyValues[index] ?? 0;
                      return labelsNeeded > labelsAvailable;
                    })() && (
                      <div
                        ref={(el) => {
                          if (el) popupRefs.current[index] = el;
                        }}
                        style={{
                          position: 'fixed',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          padding: '16px',
                          minWidth: '280px',
                          maxWidth: '320px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                          zIndex: 9999,
                          border: '1px solid #E5E7EB',
                          pointerEvents: 'auto',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          // Keep popup open when clicking inside it
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          // Prevent closing when clicking inside popup
                        }}
                        onMouseUp={(e) => {
                          e.stopPropagation();
                          // Prevent closing when clicking inside popup
                        }}
                      >
                        <div style={{ marginBottom: '12px' }}>
                          <h3 style={{
                            fontSize: '20px',
                            fontWeight: 700,
                            color: '#111827',
                            marginBottom: '8px',
                            lineHeight: '1.2',
                          }}>
                            Order exceeds available labels
                          </h3>
                          <p style={{
                            fontSize: '14px',
                            fontWeight: 400,
                            color: '#6B7280',
                            lineHeight: '1.4',
                          }}>
                            Labels Available: {row.labelsAvailable || 180}
                          </p>
                          <p style={{
                            fontSize: '14px',
                            fontWeight: 400,
                            color: '#6B7280',
                            lineHeight: '1.4',
                            marginTop: '4px',
                          }}>
                            Labels Needed: {effectiveQtyValues[index] ?? 0}
                          </p>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}>
                          <button
                            style={{
                              width: '175px',
                              height: '23px',
                              backgroundColor: '#3B82F6',
                              color: '#FFFFFF',
                              fontSize: '14px',
                              fontWeight: 600,
                              padding: 0,
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxSizing: 'border-box',
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#2563EB'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = '#3B82F6'}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              // Set QTY to available labels only (removes excess units)
                              const labelsAvailable = row.labelsAvailable || 180;
                              
                              // Update state - React will re-render with new value
                              effectiveSetQtyValues(prev => {
                                const updated = { ...prev };
                                updated[index] = labelsAvailable;
                                return updated;
                              });
                              
                              // Close the popup after updating (with small delay to prevent immediate outside click detection)
                              setTimeout(() => {
                                setClickedQtyIndex(null);
                              }, 200);
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              // Prevent the click outside handler from firing
                            }}
                            onMouseUp={(e) => {
                              e.stopPropagation();
                              // Prevent the click outside handler from firing
                            }}
                          >
                            Use Available
                          </button>
                        </div>
                        <div style={{
                          position: 'absolute',
                          bottom: '-8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '0',
                          height: '0',
                          borderLeft: '8px solid transparent',
                          borderRight: '8px solid transparent',
                          borderTop: '8px solid #FFFFFF',
                        }} />
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {index === 0 ? '12' : index === 1 ? '8' : '5'}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {index === 0 ? '32' : index === 1 ? '24' : '12'}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {index === 0 ? '240' : index === 1 ? '96' : '28'}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {index === 0 ? '34' : index === 1 ? '12' : '5'}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {index === 0 ? '145' : index === 1 ? '48' : '20'}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {index === 0 ? '580' : index === 1 ? '192' : '80'}
                </td>
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '0.85rem', 
                  textAlign: 'center', 
                  width: '143px',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  borderTop: '1px solid #E5E7EB',
                }} className={themeClasses.text}>
                  {index === 0 ? 'F.Ultra Bloom' : index === 1 ? 'F.Ultra Grow' : 'F.Fabric Heavy'}
                </td>
                {/* Sticky three dots */}
                <td style={{ 
                  padding: '0.65rem 1rem', 
                  textAlign: 'center',
                  position: 'sticky',
                  right: 0,
                  zIndex: 15,
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                  height: '40px',
                  verticalAlign: 'middle',
                  boxShadow: '-2px 0 4px rgba(0,0,0,0.1)',
                  borderTop: '1px solid #E5E7EB',
                }}>
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      cursor: 'pointer',
                      fontSize: '1rem',
                    }}
                  >
                    ⋮
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
};

export default NewShipmentTable;

