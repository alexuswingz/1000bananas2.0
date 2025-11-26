import React, { useState, useRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import SortProductsFilterDropdown from './SortProductsFilterDropdown';

const SortProductsTable = () => {
  const { isDarkMode } = useTheme();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [lockedProductIds, setLockedProductIds] = useState(() => new Set());
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});

  // Sample data matching the image
  const [products, setProducts] = useState([
    {
      id: 1,
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      qty: 96,
      formula: 'F.Ultra Grow',
      productType: 'Liquid',
    },
    {
      id: 2,
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      qty: 96,
      formula: 'F.Indoor Plant Food',
      productType: 'Liquid',
    },
    {
      id: 3,
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      qty: 96,
      formula: 'F.Indoor Plant Food',
      productType: 'Liquid',
    },
    {
      id: 4,
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      qty: 96,
      formula: 'F.Indoor Plant Food',
      productType: 'Liquid',
    },
    {
      id: 5,
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      qty: 96,
      formula: 'F.Indoor Plant Food',
      productType: 'Liquid',
    },
    {
      id: 6,
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      qty: 96,
      formula: 'F.Indoor Plant Food',
      productType: 'Liquid',
    },
    {
      id: 7,
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      qty: 96,
      formula: 'F.Indoor Plant Food',
      productType: 'Liquid',
    },
    {
      id: 8,
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      qty: 96,
      formula: 'F.Indoor Plant Food',
      productType: 'Liquid',
    },
    {
      id: 9,
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      qty: 96,
      formula: 'F.Indoor Plant Food',
      productType: 'Liquid',
    },
  ]);

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

    const newProducts = [...products];
    const draggedItem = newProducts[draggedIndex];
    
    // Remove the dragged item
    newProducts.splice(draggedIndex, 1);
    
    // Insert it at the new position
    newProducts.splice(dropIndex, 0, draggedItem);
    
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
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={column.key === 'drag' ? undefined : 'group'}
                  style={{
                    padding: column.key === 'drag' ? '0 8px' : '12px 16px',
                    textAlign: column.key === 'drag' ? 'center' : 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: column.width,
                    whiteSpace: 'nowrap',
                    borderRight: column.key === 'drag' ? 'none' : '1px solid #FFFFFF',
                    height: '40px',
                    position: column.key === 'drag' ? 'static' : 'relative',
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
                      <span>{column.label}</span>
                      <img
                        src="/assets/Vector (1).png"
                        alt="Filter"
                        className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                        ref={(el) => {
                          if (el) {
                            filterIconRefs.current[column.key] = el;
                          }
                        }}
                        onClick={(e) => handleFilterClick(column.key, e)}
                        style={{ width: '12px', height: '12px', cursor: 'pointer' }}
                      />
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {products.map((product, index) => (
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
          onClose={() => setOpenFilterColumn(null)}
        />
      )}
    </div>
  );
};

export default SortProductsTable;

