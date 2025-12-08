import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import SortProductsFilterDropdown from './SortProductsFilterDropdown';

const SortProductsTable = ({ shipmentProducts = [], shipmentType = 'AWD' }) => {
  const { isDarkMode } = useTheme();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [lockedProductIds, setLockedProductIds] = useState(() => new Set());
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({});

  // Transform shipment products into table format
  const [products, setProducts] = useState([]);

  // Update products when shipmentProducts prop changes
  useEffect(() => {
    if (shipmentProducts && shipmentProducts.length > 0) {
      const transformedProducts = shipmentProducts.map((product, index) => ({
        id: product.id || product.catalogId || index + 1,
        type: shipmentType,
        brand: product.brand || '',
        product: product.product || '',
        size: product.size || '',
        qty: product.qty || 0,
        formula: product.formula_name || product.formula || '',
        productType: 'Liquid', // Default to Liquid for fertilizers
      }));
      setProducts(transformedProducts);
    }
  }, [shipmentProducts, shipmentType]);

  const columns = [
    { key: 'drag', label: '', width: '50px' },
    { key: 'type', label: 'TYPE', width: '80px' },
    { key: 'brand', label: 'BRAND', width: '150px' },
    { key: 'product', label: 'PRODUCT', width: '200px' },
    { key: 'size', label: 'SIZE', width: '100px' },
    { key: 'qty', label: 'QTY', width: '80px' },
    { key: 'formula', label: 'FORMULA', width: '180px' },
    { key: 'productType', label: 'TYPE', width: '100px' },
    { key: 'notes', label: 'NOTES', width: '80px' },
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

    // Work with filtered products for display, but update the original products array
    const filteredList = filteredProducts;
    const draggedItem = filteredList[draggedIndex];
    const dropItem = filteredList[dropIndex];
    
    // Find these items in the original products array
    const draggedOriginalIndex = products.findIndex(p => p.id === draggedItem.id);
    const dropOriginalIndex = products.findIndex(p => p.id === dropItem.id);
    
    const newProducts = [...products];
    
    // Remove the dragged item
    newProducts.splice(draggedOriginalIndex, 1);
    
    // Find new position after removal
    const newDropIndex = newProducts.findIndex(p => p.id === dropItem.id);
    const insertIndex = draggedOriginalIndex < dropOriginalIndex ? newDropIndex + 1 : newDropIndex;
    
    // Insert it at the new position
    newProducts.splice(insertIndex, 0, draggedItem);
    
    setProducts(newProducts);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Locking a product means it will NOT be affected by filters,
  // but it can still be moved via drag & drop.
  const handleToggleLock = (productId) => {
    setLockedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const handleFilterClick = (columnKey, event) => {
    event.stopPropagation();
    setOpenFilterColumn((prev) => (prev === columnKey ? null : columnKey));
  };

  const handleApplyFilter = (columnKey, filterData) => {
    setFilters(prev => ({
      ...prev,
      [columnKey]: filterData,
    }));
    setSortConfig(prev => ({
      ...prev,
      [columnKey]: filterData.sortOrder,
    }));
    setOpenFilterColumn(null);
  };

  // Get unique values for a column (handles all data types)
  const getColumnValues = (columnKey) => {
    const values = new Set();
    products.forEach(product => {
      const val = product[columnKey];
      if (val !== undefined && val !== null && val !== '') {
        values.add(val);
      }
    });
    // Sort values - handle numbers and strings differently
    const sortedValues = Array.from(values).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
      }
      return String(a).localeCompare(String(b));
    });
    return sortedValues;
  };
  
  // Check if a column has active filters
  const hasActiveFilter = (columnKey) => {
    const filter = filters[columnKey];
    if (!filter) return false;
    
    const hasSort = sortConfig[columnKey];
    const hasValues = filter.selectedValues && filter.selectedValues.size > 0;
    const hasCondition = filter.conditionType && filter.conditionType !== '';
    
    return hasSort || hasValues || hasCondition;
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

  // Apply filters and sorting to products
  // Locked items maintain their positions and are not affected by filters/sorting
  // Unlocked items are filtered and sorted, filling in the gaps
  const getFilteredAndSortedProducts = () => {
    // Separate locked and unlocked products
    const lockedProducts = [];
    const unlockedProducts = [];
    
    products.forEach((product, index) => {
      if (lockedProductIds.has(product.id)) {
        lockedProducts.push({ product, originalIndex: index });
      } else {
        unlockedProducts.push(product);
      }
    });

    // Apply filters to unlocked products only
    let filteredUnlocked = [...unlockedProducts];
    
    Object.keys(filters).forEach(columnKey => {
      const filter = filters[columnKey];
      const isNumericColumn = columnKey === 'qty';
      
      // Apply value filters (checkbox selections)
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        filteredUnlocked = filteredUnlocked.filter(product => {
          const productValue = product[columnKey];
          // Check if value matches (handle both string and number comparisons)
          return filter.selectedValues.has(productValue) || 
                 filter.selectedValues.has(String(productValue));
        });
      }
      
      // Apply condition filters
      if (filter.conditionType) {
        filteredUnlocked = filteredUnlocked.filter(product => {
          return applyConditionFilter(
            product[columnKey],
            filter.conditionType,
            filter.conditionValue,
            isNumericColumn
          );
        });
      }
    });

    // Apply sorting to unlocked products only
    const sortColumn = Object.keys(sortConfig).find(key => sortConfig[key]);
    if (sortColumn && sortConfig[sortColumn]) {
      filteredUnlocked.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        // Handle numeric values
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig[sortColumn] === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        // Handle string values
        const aStr = String(aVal || '').toLowerCase();
        const bStr = String(bVal || '').toLowerCase();
        
        if (sortConfig[sortColumn] === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    // Rebuild the array: locked items at their original positions, unlocked items fill the rest
    const result = [];
    let unlockedIndex = 0;
    
    for (let i = 0; i < products.length; i++) {
      const lockedItem = lockedProducts.find(lp => lp.originalIndex === i);
      if (lockedItem) {
        result.push(lockedItem.product);
      } else if (unlockedIndex < filteredUnlocked.length) {
        result.push(filteredUnlocked[unlockedIndex]);
        unlockedIndex++;
      }
    }

    return result;
  };

  const filteredProducts = getFilteredAndSortedProducts();

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
            <tr style={{
              backgroundColor: '#1C2634',
              borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
              height: '40px',
            }}>
              {columns.map((column) => {
                const isActive = hasActiveFilter(column.key);
                return (
                <th
                  key={column.key}
                  className={column.key === 'drag' ? undefined : 'group'}
                  style={{
                    padding: column.key === 'drag' ? '0 8px' : '12px 16px',
                    textAlign: column.key === 'drag' ? 'center' : 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isActive ? '#3B82F6' : '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: column.width,
                    whiteSpace: 'nowrap',
                    borderRight: column.key === 'drag' ? 'none' : '1px solid #FFFFFF',
                    height: '40px',
                    position: column.key === 'drag' ? 'static' : 'relative',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  }}
                >
                  {column.key === 'drag' ? (
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
            {filteredProducts.length === 0 ? (
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
                  No products to sort. Add products to the shipment first.
                </td>
              </tr>
            ) : filteredProducts.map((product, index) => (
              <tr
                key={product.id}
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
                {(() => {
                  const isLocked = lockedProductIds.has(product.id);
                  return (
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

                    {/* Lock / Unlock icon beside hamburger */}
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => handleToggleLock(product.id)}
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
                  );
                })()}
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {product.type}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {product.brand}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {product.product}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {product.size}
                </td>
                <td style={{
                  padding: '0 16px',
                  height: '40px',
                }}>
                  <input
                    type="text"
                    value={product.qty}
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
                  {product.formula}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {product.productType}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Column Filter Dropdown */}
      {openFilterColumn && filterIconRefs.current[openFilterColumn] && (
        <SortProductsFilterDropdown
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          columnKey={openFilterColumn}
          availableValues={getColumnValues(openFilterColumn)}
          currentFilter={filters[openFilterColumn] || {}}
          currentSort={sortConfig[openFilterColumn] || ''}
          onApply={(filterData) => handleApplyFilter(openFilterColumn, filterData)}
          onClose={() => setOpenFilterColumn(null)}
        />
      )}
    </div>
  );
};

export default SortProductsTable;

