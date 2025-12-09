import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import SortFormulasFilterDropdown from './SortFormulasFilterDropdown';

// Helper: Convert product size to gallons per unit
const sizeToGallons = (size) => {
  const sizeLower = (size || '').toLowerCase();
  if (sizeLower.includes('8oz') || sizeLower.includes('8 oz')) return 0.0625;
  if (sizeLower.includes('16oz') || sizeLower.includes('16 oz') || sizeLower.includes('pint')) return 0.125;
  if (sizeLower.includes('32oz') || sizeLower.includes('32 oz') || sizeLower.includes('quart')) return 0.25;
  if (sizeLower.includes('gallon') && !sizeLower.includes('5')) return 1.0;
  if (sizeLower.includes('5 gallon') || sizeLower.includes('5gallon')) return 5.0;
  return 0;
};

const GALLONS_PER_TOTE = 275;

const SortFormulasTable = ({ shipmentProducts = [] }) => {
  const { isDarkMode } = useTheme();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // { index: number, position: 'above' | 'below' }
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const menuRefs = useRef({});
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [firstBatchQty, setFirstBatchQty] = useState(1);
  const [openFilterColumns, setOpenFilterColumns] = useState(() => new Set());
  const filterIconRefs = useRef({});
  
  // Locking state
  const [lockedFormulaIds, setLockedFormulaIds] = useState(() => new Set());
  
  // Filter and sort state
  const [filters, setFilters] = useState({});
  // sortConfig is now an array of sort objects: [{column: 'formula', order: 'asc'}, {column: 'qty', order: 'desc'}]
  // The order in the array determines the sort priority (first = primary, second = secondary, etc.)
  const [sortConfig, setSortConfig] = useState([]);

  // Transform shipment products into formula data
  const [formulas, setFormulas] = useState([]);

  // Update formulas when shipmentProducts prop changes
  useEffect(() => {
    if (shipmentProducts && shipmentProducts.length > 0) {
      // Group products by formula and calculate total gallons needed
      const formulaMap = {};
      
      shipmentProducts.forEach((product) => {
        const formulaName = product.formula_name || product.formula || 'Unknown';
        const gallonsPerUnit = product.formulaGallonsPerUnit || sizeToGallons(product.size);
        const qty = product.qty || 0;
        const totalGallons = gallonsPerUnit * qty;
        
        if (!formulaMap[formulaName]) {
          formulaMap[formulaName] = {
            formula: formulaName,
            totalGallons: 0,
            products: [],
          };
        }
        formulaMap[formulaName].totalGallons += totalGallons;
        formulaMap[formulaName].products.push(product);
      });

      // Convert to array of formula objects for the table
      // Each row represents a formula with qty = number of totes needed
      const transformedFormulas = [];
      let idCounter = 1;

      Object.values(formulaMap).forEach((formulaData) => {
        const totesNeeded = Math.ceil(formulaData.totalGallons / GALLONS_PER_TOTE);
        
        // Skip formulas that don't need any totes
        if (totesNeeded <= 0) return;
        
        // Create one row per formula with qty = total totes needed
        // This allows split functionality when qty > 1
        transformedFormulas.push({
          id: idCounter++,
          formula: formulaData.formula,
          size: 'Tote',
          qty: totesNeeded, // Number of totes needed for this formula
          tote: 'Clean',
          volume: Math.round(formulaData.totalGallons * 100) / 100, // Total gallons needed
          measure: 'Gallon',
          type: 'Liquid',
        });
      });

      setFormulas(transformedFormulas);
    }
  }, [shipmentProducts]);

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

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Set a simple data transfer to enable drag
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || draggedIndex === index) {
      setDragOverIndex(null);
      setDropPosition(null);
      return;
    }
    
    setDragOverIndex(index);
    
    // Determine if we're in the top or bottom half of the row
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rowHeight = rect.height;
    const midpoint = rowHeight / 2;
    
    // If dragging from above, place below; if dragging from below, place above
    // But also consider mouse position within the row
    if (draggedIndex < index) {
      // Dragging down - place below the current row
      setDropPosition({ index, position: 'below' });
    } else if (draggedIndex > index) {
      // Dragging up - place above the current row
      setDropPosition({ index, position: 'above' });
    } else {
      // Use mouse position to determine
      setDropPosition({ index, position: y < midpoint ? 'above' : 'below' });
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDropPosition(null);
      return;
    }

    // Work with filtered formulas for display, but update the original formulas array
    const filteredList = filteredFormulas;
    const draggedItem = filteredList[draggedIndex];
    const dropItem = filteredList[dropIndex];
    
    // Find these items in the original formulas array
    const draggedOriginalIndex = formulas.findIndex(f => f.id === draggedItem.id);
    const dropOriginalIndex = formulas.findIndex(f => f.id === dropItem.id);
    
    const newFormulas = [...formulas];
    
    // Remove the dragged item
    newFormulas.splice(draggedOriginalIndex, 1);
    
    // Find new position after removal
    const newDropIndex = newFormulas.findIndex(f => f.id === dropItem.id);
    
    // Use drop position to determine insert index
    let insertIndex;
    if (dropPosition && dropPosition.index === dropIndex) {
      insertIndex = dropPosition.position === 'above' ? newDropIndex : newDropIndex + 1;
    } else {
      // Fallback to original logic
      insertIndex = draggedOriginalIndex < dropOriginalIndex ? newDropIndex + 1 : newDropIndex;
    }
    
    // Insert it at the new position
    newFormulas.splice(insertIndex, 0, draggedItem);
    
    // Clear drag states first for smooth transition
    setDragOverIndex(null);
    setDropPosition(null);
    
    // Small delay to allow drop line to fade out smoothly
    setTimeout(() => {
      setFormulas(newFormulas);
      setDraggedIndex(null);
    }, 50);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
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

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumns.size > 0) {
        // Check if click is on any filter icon
        const clickedOnFilterIcon = Object.values(filterIconRefs.current).some(ref => 
          ref && ref.contains(event.target)
        );
        
        // Check if click is inside any dropdown (they use portals, so we check by class or data attribute)
        // Since dropdowns are portals, we need to check if the click target is within a dropdown
        const clickedInsideDropdown = event.target.closest('[data-filter-dropdown]');
        
        if (!clickedOnFilterIcon && !clickedInsideDropdown) {
          setOpenFilterColumns(new Set());
        }
      }
    };

    if (openFilterColumns.size > 0) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterColumns]);

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
    
    // First quantity is always 1 tote, second is the remaining totes
    const originalQty = selectedFormula.qty || 1;
    const firstBatchQty = 1;
    const secondBatchQty = originalQty - firstBatchQty;
    
    // Calculate volume proportionally
    const totalVolume = selectedFormula.volume || 0;
    const volumePerTote = originalQty > 0 ? totalVolume / originalQty : 0;
    const firstBatchVolume = Math.round(volumePerTote * firstBatchQty * 100) / 100;
    const secondBatchVolume = Math.round(volumePerTote * secondBatchQty * 100) / 100;
    
    // Find the index of the formula to split
    const formulaIndex = formulas.findIndex(f => f.id === selectedFormula.id);
    
    if (formulaIndex === -1) return;
    
    // Create two new formulas from the split
    const firstBatch = {
      ...selectedFormula,
      id: Date.now(), // New ID for first batch
      qty: firstBatchQty, // Always 1 tote
      volume: firstBatchVolume, // Proportional volume
      splitTag: '1/2', // Tag to indicate it's part of a split
      originalId: selectedFormula.id, // Keep reference to original
    };
    
    const secondBatch = {
      ...selectedFormula,
      id: Date.now() + 1, // New ID for second batch
      qty: secondBatchQty, // Remaining totes
      volume: secondBatchVolume, // Proportional volume
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
  
  // Calculate volume per tote for display in modal
  const volumePerTote = selectedFormula && selectedFormula.qty > 0 
    ? Math.round((selectedFormula.volume / selectedFormula.qty) * 100) / 100 
    : 0;
  const firstBatchVolume = volumePerTote; // 1 tote
  const secondBatchVolume = Math.round(volumePerTote * secondBatchQty * 100) / 100;

  const handleFilterClick = (columnKey, event) => {
    event.stopPropagation();
    setOpenFilterColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
      return next;
    });
  };

  // Locking a formula means it will NOT be affected by filters
  const handleToggleLock = (formulaId) => {
    setLockedFormulaIds((prev) => {
      const next = new Set(prev);
      if (next.has(formulaId)) {
        next.delete(formulaId);
      } else {
        next.add(formulaId);
      }
      return next;
    });
  };

  const handleApplyFilter = (columnKey, filterData) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: filterData,
    }));
    
    // Update sort config: if sortOrder is set, add/update this column in the sort array
    // If sortOrder is empty, remove this column from the sort array
    setSortConfig(prev => {
      if (filterData.sortOrder) {
        // Check if this column already has a sort
        const existingIndex = prev.findIndex(sort => sort.column === columnKey);
        if (existingIndex >= 0) {
          // Update existing sort
          const newConfig = [...prev];
          newConfig[existingIndex] = { column: columnKey, order: filterData.sortOrder };
          return newConfig;
        } else {
          // Add new sort (appends to end, making it the lowest priority)
          return [...prev, { column: columnKey, order: filterData.sortOrder }];
        }
      } else {
        // Remove sort for this column
        return prev.filter(sort => sort.column !== columnKey);
      }
    });
    // Keep the dropdown open so user can continue configuring multiple filters
    // setOpenFilterColumn(null);
  };

  // Get unique values for a column
  const getColumnValues = (columnKey) => {
    const values = new Set();
    formulas.forEach(formula => {
      const val = formula[columnKey];
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

  // Get sort priority for a column (1 = primary, 2 = secondary, etc., or null if not sorted)
  const getSortPriority = (columnKey) => {
    const index = sortConfig.findIndex(sort => sort.column === columnKey);
    return index >= 0 ? index + 1 : null;
  };

  // Get sort order for a column
  const getSortOrder = (columnKey) => {
    const sort = sortConfig.find(sort => sort.column === columnKey);
    return sort ? sort.order : '';
  };

  // Check if a column has active filters (excludes sort - only checks for Filter by Values and Filter by Conditions)
  const hasActiveFilter = (columnKey) => {
    const filter = filters[columnKey];
    if (!filter) return false;
    
    // Only check for custom filters, not sort
    const hasValues = filter.selectedValues && filter.selectedValues.size > 0;
    const hasCondition = filter.conditionType && filter.conditionType !== '';
    
    return hasValues || hasCondition;
  };

  // Apply condition filter to a value
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

  // Apply filters and sorting to formulas
  // Locked items maintain their positions and are not affected by filters/sorting
  const getFilteredAndSortedFormulas = () => {
    // Separate locked and unlocked formulas
    const lockedFormulas = [];
    const unlockedFormulas = [];
    
    formulas.forEach((formula, index) => {
      if (lockedFormulaIds.has(formula.id)) {
        lockedFormulas.push({ formula, originalIndex: index });
      } else {
        unlockedFormulas.push(formula);
      }
    });

    // Apply filters to unlocked formulas only
    let filteredUnlocked = [...unlockedFormulas];
    
    Object.keys(filters).forEach(columnKey => {
      const filter = filters[columnKey];
      const isNumericColumn = columnKey === 'qty' || columnKey === 'volume';
      
      // Apply value filters (checkbox selections)
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        filteredUnlocked = filteredUnlocked.filter(formula => {
          const formulaValue = formula[columnKey];
          // Check if value matches (handle both string and number comparisons)
          return filter.selectedValues.has(formulaValue) || 
                 filter.selectedValues.has(String(formulaValue));
        });
      }
      
      // Apply condition filters
      if (filter.conditionType) {
        filteredUnlocked = filteredUnlocked.filter(formula => {
          return applyConditionFilter(
            formula[columnKey],
            filter.conditionType,
            filter.conditionValue,
            isNumericColumn
          );
        });
      }
    });

    // Apply hierarchical sorting to unlocked formulas only
    // Sort by each column in priority order (primary first, then secondary, etc.)
    if (sortConfig.length > 0) {
      filteredUnlocked.sort((a, b) => {
        // Try each sort level in order
        for (const sort of sortConfig) {
          const aVal = a[sort.column];
          const bVal = b[sort.column];
          
          let comparison = 0;
          
          // Handle numeric values
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            comparison = sort.order === 'asc' ? aVal - bVal : bVal - aVal;
          } else {
            // Handle string values
            const aStr = String(aVal || '').toLowerCase();
            const bStr = String(bVal || '').toLowerCase();
            
            if (sort.order === 'asc') {
              comparison = aStr.localeCompare(bStr);
            } else {
              comparison = bStr.localeCompare(aStr);
            }
          }
          
          // If values are different at this level, return the comparison
          // Otherwise, continue to the next sort level
          if (comparison !== 0) {
            return comparison;
          }
        }
        
        // If all sort levels are equal, maintain original order
        return 0;
      });
    }

    // Rebuild the array: locked items at their original positions, unlocked items fill the rest
    const result = [];
    let unlockedIndex = 0;
    
    for (let i = 0; i < formulas.length; i++) {
      const lockedItem = lockedFormulas.find(lf => lf.originalIndex === i);
      if (lockedItem) {
        result.push(lockedItem.formula);
      } else if (unlockedIndex < filteredUnlocked.length) {
        result.push(filteredUnlocked[unlockedIndex]);
        unlockedIndex++;
      }
    }

    return result;
  };

  const filteredFormulas = getFilteredAndSortedFormulas();

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
              {columns.map((column) => {
                const isActive = hasActiveFilter(column.key);
                return (
                <th
                  key={column.key}
                  className={
                    column.key === 'drag' || column.key === 'menu'
                      ? undefined
                      : 'group'
                  }
                  style={{
                    padding:
                      column.key === 'drag' || column.key === 'menu' ? '0 8px' : '12px 16px',
                    textAlign:
                      column.key === 'drag' || column.key === 'menu' ? 'center' : 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isActive ? '#3B82F6' : '#9CA3AF',
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
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  }}
                >
                  {column.key === 'drag' || column.key === 'menu' ? (
                    column.label
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {column.label}
                        {isActive && (
                          <span style={{ 
                            display: 'inline-block',
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%', 
                            backgroundColor: '#10B981',
                          }} />
                        )}
                      </span>
                      <img
                        src="/assets/Vector (1).png"
                        alt="Filter"
                        className={`w-3 h-3 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        ref={(el) => {
                          if (el) {
                            filterIconRefs.current[column.key] = el;
                          }
                        }}
                        onClick={(e) => handleFilterClick(column.key, e)}
                        style={{ 
                          width: '12px', 
                          height: '12px', 
                          cursor: 'pointer',
                          filter: isActive ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                        }}
                      />
                    </div>
                  )}
                </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {filteredFormulas.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length} 
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    fontSize: '14px',
                  }}
                >
                  No formulas to sort. Add products to the shipment first.
                </td>
              </tr>
            ) : filteredFormulas.map((formula, index) => {
              const isLocked = lockedFormulaIds.has(formula.id);
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;
              const showDropLineAbove = dropPosition && dropPosition.index === index && dropPosition.position === 'above';
              const showDropLineBelow = dropPosition && dropPosition.index === index && dropPosition.position === 'below';
              
              return (
              <React.Fragment key={formula.id}>
                {/* Drop line above the row */}
                {showDropLineAbove && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{
                        padding: 0,
                        height: '2px',
                        backgroundColor: '#3B82F6',
                        border: 'none',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: 0,
                          height: '2px',
                          backgroundColor: '#3B82F6',
                          boxShadow: '0 0 4px rgba(59, 130, 246, 0.6)',
                        }}
                      />
                    </td>
                  </tr>
                )}
                <tr
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  style={{
                    backgroundColor: isDragging
                      ? (isDarkMode ? '#4B5563' : '#E5E7EB')
                      : index % 2 === 0
                      ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                      : (isDarkMode ? '#1A1F2E' : '#F9FAFB'),
                    borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                    transition: isDragging ? 'none' : 'background-color 0.2s',
                    height: '40px',
                    opacity: isDragging ? 0.5 : 1,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    boxShadow: isDragging ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
                    zIndex: isDragging ? 1000 : 'auto',
                    position: isDragging ? 'relative' : 'static',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDragging && draggedIndex === null) {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDragging && draggedIndex === null) {
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
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        cursor: isDragging ? 'grabbing' : 'grab',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 'fit-content',
                        pointerEvents: 'none', // Prevent double drag events
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="3" width="12" height="2" rx="1" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                        <rect x="2" y="7" width="12" height="2" rx="1" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                        <rect x="2" y="11" width="12" height="2" rx="1" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                      </svg>
                    </div>

                    {/* Lock / Unlock icon beside hamburger */}
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleToggleLock(formula.id)}
                    >
                      {isLocked ? (
                        <img
                          src="/assets/lock.png"
                          alt="Lock"
                          style={{
                            width: '12px',
                            height: '15.75px',
                            display: 'block',
                            position: 'relative',
                            top: '0.75px',
                            left: '3px',
                          }}
                        />
                      ) : (
                        <img
                          src="/assets/unlock.png"
                          alt="Unlock"
                          style={{
                            width: '12px',
                            height: '15.75px',
                            display: 'block',
                            position: 'relative',
                            top: '0.75px',
                            left: '3px',
                          }}
                        />
                      )}
                    </div>
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
              {/* Drop line below the row */}
              {showDropLineBelow && (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{
                      padding: 0,
                      height: '2px',
                      backgroundColor: '#3B82F6',
                      border: 'none',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        height: '2px',
                        backgroundColor: '#3B82F6',
                        boxShadow: '0 0 4px rgba(59, 130, 246, 0.6)',
                      }}
                    />
                  </td>
                </tr>
              )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Column Filter Dropdowns - Multiple can be open at once */}
      {Array.from(openFilterColumns).map((columnKey) => {
        if (!filterIconRefs.current[columnKey]) return null;
        return (
          <SortFormulasFilterDropdown
            key={columnKey}
            filterIconRef={filterIconRefs.current[columnKey]}
            columnKey={columnKey}
            availableValues={getColumnValues(columnKey)}
            currentFilter={filters[columnKey] || {}}
            currentSort={getSortOrder(columnKey)}
            onApply={(filterData) => handleApplyFilter(columnKey, filterData)}
            onClose={() => {
              setOpenFilterColumns((prev) => {
                const next = new Set(prev);
                next.delete(columnKey);
                return next;
              });
            }}
          />
        );
      })}

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
                {/* Formula Info */}
                {selectedFormula && (
                  <div style={{
                    backgroundColor: '#F3F4F6',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                      {selectedFormula.formula}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>
                      Total: {selectedFormula.qty} tote{selectedFormula.qty > 1 ? 's' : ''} • {selectedFormula.volume} gallons
                    </div>
                  </div>
                )}

                {/* First Batch */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    First Batch
                  </label>
                  <p style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    margin: '0 0 12px 0',
                  }}>
                    The first batch is always 1 tote.
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>
                        Totes
                      </label>
                      <input
                        type="number"
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
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>
                        Volume (Gallons)
                      </label>
                      <input
                        type="text"
                        value={firstBatchVolume}
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
                  </div>
                </div>

                {/* Second Batch */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Second Batch
                  </label>
                  <p style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    margin: '0 0 12px 0',
                  }}>
                    The remaining totes after the split.
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>
                        Totes
                      </label>
                      <input
                        type="number"
                        value={secondBatchQty}
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
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>
                        Volume (Gallons)
                      </label>
                      <input
                        type="text"
                        value={secondBatchVolume}
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
                  </div>
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
