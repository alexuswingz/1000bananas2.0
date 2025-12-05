import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import SortFormulasFilterDropdown from './SortFormulasFilterDropdown';

const SortFormulasTable = () => {
  const { isDarkMode } = useTheme();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const menuRefs = useRef({});
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [firstBatchQty, setFirstBatchQty] = useState(1);
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});

  // Sample data matching the image
  const [formulas, setFormulas] = useState([
    {
      id: 1,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 3,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 2,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 3,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 4,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 5,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 6,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 7,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 8,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 9,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
  ]);

  const columns = [
    { key: 'drag', label: '', width: '50px' },
    { key: 'formula', label: 'FORMULA', width: '150px' },
    { key: 'size', label: 'SIZE', width: '100px' },
    { key: 'qty', label: 'QTY', width: '80px' },
    { key: 'tote', label: 'TOTE', width: '100px' },
    { key: 'volume', label: 'VOLUME', width: '100px' },
    { key: 'measure', label: 'MEASURE', width: '120px' },
    { key: 'type', label: 'TYPE', width: '100px' },
    { key: 'notes', label: 'NOTES', width: '80px' },
    { key: 'menu', label: '', width: '50px' },
  ];

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      return;
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    const newFormulas = [...formulas];
    const draggedItem = newFormulas[draggedIndex];
    
    // Remove the dragged item
    newFormulas.splice(draggedIndex, 1);
    
    // Insert it at the new position
    newFormulas.splice(dropIndex, 0, draggedItem);
    
    setFormulas(newFormulas);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuIndex !== null) {
        const menuRef = menuRefs.current[openMenuIndex];
        const tdElement = menuRef?.parentElement;
        // Check if click is outside both the menu and its parent td
        if (tdElement && !tdElement.contains(event.target)) {
          setOpenMenuIndex(null);
        }
      }
    };

    if (openMenuIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuIndex]);

  const handleMenuClick = (e, index) => {
    e.stopPropagation();
    setOpenMenuIndex(openMenuIndex === index ? null : index);
  };

  const handleMenuAction = (action, formula) => {
    if (action === 'split') {
      setSelectedFormula(formula);
      setFirstBatchQty(1); // Always set first batch to 1
      setIsSplitModalOpen(true);
    }
    setOpenMenuIndex(null);
  };

  const handleCloseSplitModal = () => {
    setIsSplitModalOpen(false);
    setSelectedFormula(null);
    setFirstBatchQty(1);
  };

  const handleConfirmSplit = () => {
    if (!selectedFormula) return;
    
    // First quantity is always 1, second is the remaining
    const firstBatchQty = 1;
    const secondBatchQty = (selectedFormula.qty || 1) - firstBatchQty;
    
    // Find the index of the formula to split
    const formulaIndex = formulas.findIndex(f => f.id === selectedFormula.id);
    
    if (formulaIndex === -1) return;
    
    // Create two new formulas from the split
    const firstBatch = {
      ...selectedFormula,
      id: Date.now(), // New ID for first batch
      qty: firstBatchQty, // Always 1
      splitTag: '1/2', // Tag to indicate it's part of a split
      originalId: selectedFormula.id, // Keep reference to original
    };
    
    const secondBatch = {
      ...selectedFormula,
      id: Date.now() + 1, // New ID for second batch
      qty: secondBatchQty, // Remaining quantity
      splitTag: '2/2', // Tag to indicate it's part of a split
      originalId: selectedFormula.id, // Keep reference to original
    };
    
    // Replace the original formula with the two split formulas
    const newFormulas = [...formulas];
    newFormulas.splice(formulaIndex, 1, firstBatch, secondBatch);
    setFormulas(newFormulas);
    
    handleCloseSplitModal();
  };

  // Second batch quantity is always the remaining (total - 1)
  const secondBatchQty = selectedFormula ? (selectedFormula.qty || 1) - 1 : 0;

  const handleFilterClick = (columnKey, event) => {
    event.stopPropagation();
    setOpenFilterColumn((prev) => (prev === columnKey ? null : columnKey));
  };

  return (
    <div style={{
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
      overflow: 'hidden',
    }}>
      {/* Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}>
          {/* Header */}
          <thead>
            <tr
              style={{
                backgroundColor: '#1C2634',
                borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                height: '40px',
              }}
            >
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={
                    column.key === 'drag' || column.key === 'menu'
                      ? undefined
                      : 'group cursor-pointer'
                  }
                  style={{
                    padding:
                      column.key === 'drag' || column.key === 'menu' ? '0 8px' : '0 16px',
                    textAlign:
                      column.key === 'drag' || column.key === 'menu' ? 'center' : 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: column.width,
                    whiteSpace: 'nowrap',
                    borderRight:
                      column.key === 'drag' || column.key === 'menu'
                        ? 'none'
                        : '1px solid #FFFFFF',
                    height: '40px',
                    position:
                      column.key === 'drag' || column.key === 'menu' ? 'static' : 'relative',
                  }}
                >
                  {column.label}
                  {column.key !== 'drag' && column.key !== 'menu' && (
                    <img
                      ref={(el) => {
                        if (el) filterIconRefs.current[column.key] = el;
                      }}
                      src="/assets/Vector (1).png"
                      alt="Filter"
                      className={`w-3 h-3 transition-opacity cursor-pointer ${
                        openFilterColumn === column.key
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      }`}
                      onClick={(e) => handleFilterClick(column.key, e)}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        right: '8px',
                        transform: 'translateY(-50%)',
                        width: '12px',
                        height: '12px',
                        ...(openFilterColumn === column.key
                          ? {
                              filter:
                                'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                            }
                          : undefined),
                      }}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {formulas.map((formula, index) => (
              <tr
                key={formula.id}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                style={{
                  backgroundColor: draggedIndex === index
                    ? (isDarkMode ? '#4B5563' : '#E5E7EB')
                    : index % 2 === 0
                    ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                    : (isDarkMode ? '#1A1F2E' : '#F9FAFB'),
                  borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                  transition: 'background-color 0.2s',
                  height: '40px',
                  opacity: draggedIndex === index ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (draggedIndex !== index) {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (draggedIndex !== index) {
                    e.currentTarget.style.backgroundColor = index % 2 === 0
                      ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                      : (isDarkMode ? '#1A1F2E' : '#F9FAFB');
                  }
                }}
              >
                <td style={{
                  padding: '0 8px',
                  textAlign: 'center',
                  height: '40px',
                }}>
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      cursor: draggedIndex === index ? 'grabbing' : 'grab',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      width: 'fit-content',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="3" width="12" height="2" rx="1" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                      <rect x="2" y="7" width="12" height="2" rx="1" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                      <rect x="2" y="11" width="12" height="2" rx="1" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                    </svg>
                  </div>
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span>{formula.formula}</span>
                  {formula.splitTag && (
                    <img
                      src="/assets/split.png"
                      alt="Split"
                      style={{
                        width: 'auto',
                        height: '16px',
                        display: 'inline-block',
                      }}
                    />
                  )}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.size}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.qty}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.tote}
                </td>
                <td style={{
                  padding: '0 16px',
                  height: '40px',
                }}>
                  <input
                    type="text"
                    value={formula.volume}
                    readOnly
                    style={{
                      width: '107px',
                      height: '24px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                      color: isDarkMode ? '#E5E7EB' : '#374151',
                      fontSize: '14px',
                      fontWeight: 400,
                      textAlign: 'center',
                      outline: 'none',
                      cursor: 'default',
                      boxSizing: 'border-box',
                    }}
                  />
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.measure}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.type}
                </td>
                <td style={{
                  padding: '0 16px',
                  textAlign: 'center',
                  height: '40px',
                }}>
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#3B82F6">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8" fill="#3B82F6"/>
                      <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="2"/>
                      <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="2"/>
                      <polyline points="10 9 9 9 8 9" stroke="white" strokeWidth="2"/>
                    </svg>
                  </button>
                </td>
                <td style={{
                  padding: '0 8px',
                  textAlign: 'center',
                  height: '40px',
                  position: 'relative',
                }}>
                  <button
                    type="button"
                    onClick={(e) => handleMenuClick(e, index)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#E5E7EB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} strokeWidth="2">
                      <circle cx="12" cy="5" r="1" fill="currentColor"/>
                      <circle cx="12" cy="12" r="1" fill="currentColor"/>
                      <circle cx="12" cy="19" r="1" fill="currentColor"/>
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {openMenuIndex === index && (
                    <div
                      ref={(el) => { menuRefs.current[index] = el; }}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        right: '100%',
                        transform: 'translateY(-50%)',
                        marginRight: '-4px',
                        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        minWidth: '160px',
                        zIndex: 1000,
                        overflow: 'hidden',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleMenuAction('split', formula)}
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          color: isDarkMode ? '#E5E7EB' : '#374151',
                          fontSize: '14px',
                          fontWeight: 400,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 16 16" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                          style={{ flexShrink: 0 }}
                        >
                          {/* Vertical line */}
                          <line 
                            x1="8" 
                            y1="10" 
                            x2="8" 
                            y2="14" 
                            stroke="currentColor" 
                            strokeWidth="1.5" 
                            strokeLinecap="round"
                          />
                          {/* Left branch pointing up and left */}
                          <line 
                            x1="8" 
                            y1="10" 
                            x2="4.5" 
                            y2="6.5" 
                            stroke="currentColor" 
                            strokeWidth="1.5" 
                            strokeLinecap="round"
                          />
                          <polygon 
                            points="4.5,6.5 4,6 3.5,6.5" 
                            fill="currentColor"
                          />
                          {/* Right branch pointing up and right */}
                          <line 
                            x1="8" 
                            y1="10" 
                            x2="11.5" 
                            y2="6.5" 
                            stroke="currentColor" 
                            strokeWidth="1.5" 
                            strokeLinecap="round"
                          />
                          <polygon 
                            points="11.5,6.5 12,6 12.5,6.5" 
                            fill="currentColor"
                          />
                        </svg>
                        <span>Split Formula</span>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Column Filter Dropdown */}
      {openFilterColumn && filterIconRefs.current[openFilterColumn] && (
        <SortFormulasFilterDropdown
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          columnKey={openFilterColumn}
          onClose={() => setOpenFilterColumn(null)}
        />
      )}

      {/* Split Formula Volume Modal */}
      {isSplitModalOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={handleCloseSplitModal}
          >
            {/* Modal */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                width: '500px',
                maxWidth: '90vw',
                border: '1px solid #E5E7EB',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                zIndex: 10001,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ 
                padding: '16px 24px',
                borderBottom: '1px solid #E5E7EB',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                backgroundColor: '#1C2634',
              }}>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  margin: 0,
                }}>
                  Split Formula Volume
                </h2>
                <button
                  type="button"
                  onClick={handleCloseSplitModal}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    width: '24px',
                    height: '24px',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div style={{ 
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                padding: '24px',
              }}>
                {/* First Batch Quantity */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    First Batch Quantity (Tote)
                  </label>
                  <p style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    margin: '0 0 12px 0',
                  }}>
                    The first batch quantity is always 1.
                  </p>
                  <input
                    type="number"
                    min="1"
                    max="1"
                    value={1}
                    readOnly
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#F9FAFB',
                      color: '#6B7280',
                      fontSize: '14px',
                      fontWeight: 400,
                      outline: 'none',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Second Batch Quantity */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Second Batch Quantity (Tote)
                  </label>
                  <p style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    margin: '0 0 12px 0',
                  }}>
                    Auto-calculated from the first batch quantity.
                  </p>
                  <input
                    type="number"
                    value={secondBatchQty}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#F9FAFB',
                      color: '#6B7280',
                      fontSize: '14px',
                      fontWeight: 400,
                      outline: 'none',
                      cursor: 'not-allowed',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{ 
                padding: '16px 24px',
                borderTop: '1px solid #E5E7EB',
                display: 'flex', 
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#FFFFFF',
              }}>
                <button
                  type="button"
                  onClick={handleCloseSplitModal}
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
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSplit}
                  disabled={!selectedFormula || (selectedFormula?.qty || 1) <= 1}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: (!selectedFormula || (selectedFormula?.qty || 1) <= 1) ? '#9CA3AF' : '#3B82F6',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: (!selectedFormula || (selectedFormula?.qty || 1) <= 1) ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedFormula && (selectedFormula?.qty || 1) > 1) {
                      e.currentTarget.style.backgroundColor = '#2563EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFormula && (selectedFormula?.qty || 1) > 1) {
                      e.currentTarget.style.backgroundColor = '#3B82F6';
                    }
                  }}
                >
                  Confirm Split
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SortFormulasTable;

