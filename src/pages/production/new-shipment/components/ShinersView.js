import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const ShinersView = () => {
  const { isDarkMode } = useTheme();
  const [expandedFormulas, setExpandedFormulas] = useState(new Set(['F.ULTRAGROW', 'F.ULTRABLOOM']));
  const [addedProducts, setAddedProducts] = useState(new Set(['F.ULTRAGROW-Cherry Tree Fer...']));
  // Track which specific column header filter is open (per-formula + column)
  const [openFilterIndex, setOpenFilterIndex] = useState(null); // e.g. "F.ULTRAGROW:brand"
  const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 });
  const filterRefs = useRef({});
  const filterModalRef = useRef(null);

  // Sample data matching the image
  const formulas = [
    {
      id: 'F.ULTRAGROW',
      formula: 'F.ULTRAGROW',
      size: '8oz',
      unitsAvailable: 240,
      unitsUsed: 240,
      products: [
        {
          id: 'F.ULTRAGROW-Cherry Tree Fer...',
          brand: 'TPS Plant Foods',
          product: 'Cherry Tree Fer...',
          size: '8oz',
          qty: 240,
          timeline: {
            purple: 20,
            green: 40,
            blue: 35,
            variance: 5,
          },
        },
        {
          id: 'F.ULTRAGROW-Monstera Plant...',
          brand: 'TPS Plant Foods',
          product: 'Monstera Plant...',
          size: '8oz',
          qty: 96,
          timeline: {
            purple: 15,
            green: 30,
            blue: 25,
            variance: 0,
          },
        },
        {
          id: 'F.ULTRAGROW-Indoor Plant Fo...',
          brand: 'TPS Plant Foods',
          product: 'Indoor Plant Fo...',
          size: '8oz',
          qty: 28,
          timeline: {
            purple: 10,
            green: 20,
            blue: 15,
            variance: -5,
          },
        },
      ],
    },
    {
      id: 'F.ULTRABLOOM',
      formula: 'F.ULTRABLOOM',
      size: 'Quart',
      unitsAvailable: 48,
      unitsUsed: 0,
      products: [
        {
          id: 'F.ULTRABLOOM-Cherry Tree Fer...',
          brand: 'TPS Plant Foods',
          product: 'Cherry Tree Fer...',
          size: 'Quart',
          qty: 240,
          timeline: {
            purple: 20,
            green: 40,
            blue: 35,
            variance: 5,
          },
        },
        {
          id: 'F.ULTRABLOOM-Daffodil Fertilizer',
          brand: 'TPS Plant Foods',
          product: 'Daffodil Fertilizer',
          size: 'Quart',
          qty: 96,
          timeline: {
            purple: 15,
            green: 30,
            blue: 25,
            variance: 0,
          },
        },
        {
          id: 'F.ULTRABLOOM-Tulip Fertilizer',
          brand: 'TPS Plant Foods',
          product: 'Tulip Fertilizer',
          size: 'Quart',
          qty: 28,
          timeline: {
            purple: 10,
            green: 20,
            blue: 15,
            variance: -5,
          },
        },
      ],
    },
    {
      id: 'F.WORMTEA',
      formula: 'F.WORMTEA',
      size: 'Quart',
      unitsAvailable: 240,
      unitsUsed: 0,
      products: [],
    },
    {
      id: 'F.SUCCULENT',
      formula: 'F.SUCCULENT',
      size: 'Gallon',
      unitsAvailable: 40,
      unitsUsed: 0,
      products: [],
    },
  ];

  const toggleFormula = (formulaId) => {
    setExpandedFormulas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(formulaId)) {
        newSet.delete(formulaId);
      } else {
        newSet.add(formulaId);
      }
      return newSet;
    });
  };

  const toggleAddProduct = (productId) => {
    setAddedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Position filter modal when it appears (align under filter icon similar to Sort Formulas)
  useEffect(() => {
    if (openFilterIndex !== null) {
      const updatePosition = () => {
        const filterButton = filterRefs.current[openFilterIndex];
        
        if (filterButton) {
          const rect = filterButton.getBoundingClientRect();
          const dropdownWidth = 320;   // match sort formulas dropdown width
          const dropdownHeight = 400;
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
          
          setFilterPosition({ top, left });
        }
      };

      updatePosition();

      return () => {
        // no-op cleanup; listeners not used
      };
    }
  }, [openFilterIndex]);

  // Close filter modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterIndex !== null) {
        const filterButton = filterRefs.current[openFilterIndex];
        const filterModal = filterModalRef.current;
        
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

  const renderTimeline = (timeline, index) => {
    // Calculate flex ratios based on the values
    const total = timeline.purple + timeline.green + timeline.blue;
    const purpleFlex = Math.round((timeline.purple / total) * 8);
    const greenFlex = Math.round((timeline.green / total) * 8);
    const blueFlex = Math.round((timeline.blue / total) * 8);

    return (
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
            style={{
              borderRadius: '9999px',
              backgroundColor: isDarkMode ? '#020617' : '#F3F4F6',
              overflow: 'hidden',
              height: '18px',
              display: 'flex',
              cursor: 'pointer',
            }}
          >
            <div style={{ flex: purpleFlex, backgroundColor: '#A855F7' }} />
            <div style={{ flex: greenFlex, backgroundColor: '#22C55E' }} />
            <div style={{ flex: blueFlex, backgroundColor: '#3B82F6' }} />
          </div>
          {timeline.variance !== 0 && (
            <span
              style={{
                position: 'absolute',
                right: timeline.variance > 0 ? '-18px' : '-18px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#007AFF',
              }}
            >
              {timeline.variance > 0 ? '+' : ''}{timeline.variance}
            </span>
          )}
        </div>
      </div>
    );
  };


  return (
    <>
      <div style={{
        marginTop: '1.25rem',
        marginBottom: '1.25rem',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {formulas.map((formula) => {
        const isExpanded = expandedFormulas.has(formula.id);
        return (
          <div
            key={formula.id}
            style={{
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              borderRadius: '12px',
              border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
              overflow: 'hidden',
              width: '100%',
            }}
          >
            {/* Formula Header */}
            <div
              onClick={() => toggleFormula(formula.id)}
              style={{
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#1F2937' : '#FFFFFF';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  FORMULA
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                }}>
                  {formula.formula}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  SIZE
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                }}>
                  {formula.size}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  UNITS AVAILABLE
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                }}>
                  {formula.unitsAvailable}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  UNITS USED
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                }}>
                  {formula.unitsUsed}
                </div>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  color: '#3B82F6',
                }}
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Expanded Content */}
            {isExpanded && formula.products.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                }}>
                  <thead style={{ backgroundColor: '#1C2634' }}>
                    <tr style={{ height: '40px', maxHeight: '40px' }}>
                      <th 
                        className="group"
                        style={{
                          padding: '0 1rem',
                          height: '40px',
                          maxHeight: '40px',
                          boxSizing: 'border-box',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderRight: '1px solid #FFFFFF',
                          width: '160px',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>BRAND</span>
                          <img
                            ref={(el) => {
                              if (el) filterRefs.current[`${formula.id}:brand`] = el;
                            }}
                            src="/assets/Vector (1).png"
                            alt="Filter"
                            className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                            style={{ 
                              width: '12px', 
                              height: '12px',
                              cursor: 'pointer',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const key = `${formula.id}:brand`;
                              setOpenFilterIndex(openFilterIndex === key ? null : key);
                            }}
                          />
                        </div>
                      </th>
                      <th 
                        className="group"
                        style={{
                          padding: '0 1rem',
                          height: '40px',
                          maxHeight: '40px',
                          boxSizing: 'border-box',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderRight: '1px solid #FFFFFF',
                          width: '200px',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>PRODUCT</span>
                          <img
                            ref={(el) => {
                              if (el) filterRefs.current[`${formula.id}:product`] = el;
                            }}
                            src="/assets/Vector (1).png"
                            alt="Filter"
                            className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                            style={{ 
                              width: '12px', 
                              height: '12px',
                              cursor: 'pointer',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const key = `${formula.id}:product`;
                              setOpenFilterIndex(openFilterIndex === key ? null : key);
                            }}
                          />
                        </div>
                      </th>
                      <th 
                        className="group"
                        style={{
                          padding: '0 1rem',
                          height: '40px',
                          maxHeight: '40px',
                          boxSizing: 'border-box',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderRight: '1px solid #FFFFFF',
                          width: '70px',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>SIZE</span>
                          <img
                            ref={(el) => {
                              if (el) filterRefs.current[`${formula.id}:size`] = el;
                            }}
                            src="/assets/Vector (1).png"
                            alt="Filter"
                            className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                            style={{ 
                              width: '12px', 
                              height: '12px',
                              cursor: 'pointer',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const key = `${formula.id}:size`;
                              setOpenFilterIndex(openFilterIndex === key ? null : key);
                            }}
                          />
                        </div>
                      </th>
                      <th 
                        className="group"
                        style={{
                          padding: '0 1rem',
                          height: '40px',
                          maxHeight: '40px',
                          boxSizing: 'border-box',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderRight: '1px solid #FFFFFF',
                          width: '120px',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <span>ADD</span>
                          <img
                            ref={(el) => {
                              if (el) filterRefs.current[`${formula.id}:add`] = el;
                            }}
                            src="/assets/Vector (1).png"
                            alt="Filter"
                            className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                            style={{ 
                              width: '12px', 
                              height: '12px',
                              cursor: 'pointer',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const key = `${formula.id}:add`;
                              setOpenFilterIndex(openFilterIndex === key ? null : key);
                            }}
                          />
                        </div>
                      </th>
                      <th 
                        className="group"
                        style={{
                          padding: '0 1rem',
                          height: '40px',
                          maxHeight: '40px',
                          boxSizing: 'border-box',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderRight: '1px solid #FFFFFF',
                          width: '120px',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <span>QTY</span>
                          <img
                            ref={(el) => {
                              if (el) filterRefs.current[`${formula.id}:qty`] = el;
                            }}
                            src="/assets/Vector (1).png"
                            alt="Filter"
                            className="w-3 h-3 transition-opacity opacity-0 group-hover:opacity-100"
                            style={{ 
                              width: '12px', 
                              height: '12px',
                              cursor: 'pointer',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const key = `${formula.id}:qty`;
                              setOpenFilterIndex(openFilterIndex === key ? null : key);
                            }}
                          />
                        </div>
                      </th>
                      <th 
                        className="group"
                        style={{
                          padding: '0 1rem',
                          height: '40px',
                          maxHeight: '40px',
                          boxSizing: 'border-box',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#FFFFFF',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          position: 'relative',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.6rem',
                          marginBottom: '2px',
                          paddingRight: '24px',
                          lineHeight: '1.2',
                        }}>
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
                            if (el) filterRefs.current[`${formula.id}:timeline`] = el;
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
                            const key = `${formula.id}:timeline`;
                            setOpenFilterIndex(openFilterIndex === key ? null : key);
                          }}
                        />
                        <div style={{
                          position: 'relative',
                          height: '18px',
                          marginTop: '-4px',
                        }}>
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
                                color: '#FFFFFF',
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
                    {formula.products.map((product, productIndex) => {
                      const isAdded = addedProducts.has(product.id);
                      return (
                        <tr
                          key={product.id}
                          style={{
                            height: '40px',
                            maxHeight: '40px',
                            borderTop: '1px solid #E5E7EB',
                          }}
                        >
                          <td style={{
                            padding: '0.65rem 1rem',
                            fontSize: '0.85rem',
                            height: '40px',
                            verticalAlign: 'middle',
                            color: isDarkMode ? '#E5E7EB' : '#374151',
                          }}>
                            {product.brand}
                          </td>
                          <td style={{
                            padding: '0.65rem 1rem',
                            fontSize: '0.85rem',
                            height: '40px',
                            verticalAlign: 'middle',
                          }}>
                            <button
                              type="button"
                              onClick={() => {}}
                              style={{
                                color: '#3B82F6',
                                cursor: 'pointer',
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                fontSize: '0.85rem',
                                textDecoration: 'none',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#2563EB';
                                e.currentTarget.style.textDecoration = 'underline';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#3B82F6';
                                e.currentTarget.style.textDecoration = 'none';
                              }}
                            >
                              {product.product}
                            </button>
                          </td>
                          <td style={{
                            padding: '0.65rem 1rem',
                            fontSize: '0.85rem',
                            height: '40px',
                            verticalAlign: 'middle',
                            color: isDarkMode ? '#9CA3AF' : '#6B7280',
                          }}>
                            {product.size}
                          </td>
                          <td style={{
                            padding: '0.65rem 1rem',
                            textAlign: 'center',
                            height: '40px',
                            verticalAlign: 'middle',
                            boxShadow: 'inset 4px 0 8px -4px rgba(0, 0, 0, 0.15)',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                              <button
                                type="button"
                                onClick={() => toggleAddProduct(product.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: isAdded ? '0' : '10px',
                                  width: '80px',
                                  height: '24px',
                                  borderRadius: '9999px',
                                  border: 'none',
                                  backgroundColor: isAdded ? '#10B981' : '#2563EB',
                                  color: '#FFFFFF',
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                  fontFamily: 'sans-serif',
                                  cursor: 'pointer',
                                  padding: 0,
                                  transition: 'background-color 0.2s',
                                  position: 'relative',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = isAdded ? '#059669' : '#1D4ED8';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = isAdded ? '#10B981' : '#2563EB';
                                }}
                              >
                                {!isAdded && (
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
                                <span style={{ whiteSpace: 'nowrap', textAlign: 'center' }}>{isAdded ? 'Added' : 'Add'}</span>
                              </button>
                            </div>
                          </td>
                          <td style={{
                            padding: '0.65rem 1rem',
                            textAlign: 'center',
                            height: '40px',
                            verticalAlign: 'middle',
                          }}>
                            <input
                              type="number"
                              value={product.qty}
                              readOnly
                              style={{
                                width: '80px',
                                height: '24px',
                                padding: '0 10px',
                                borderRadius: '6px',
                                border: '1px solid #D1D5DB',
                                backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                                color: isDarkMode ? '#E5E7EB' : '#374151',
                                fontSize: '0.85rem',
                                fontWeight: 400,
                                textAlign: 'center',
                                outline: 'none',
                                cursor: 'default',
                                boxSizing: 'border-box',
                              }}
                            />
                          </td>
                          <td style={{
                            padding: '0.65rem 1rem',
                            minWidth: '380px',
                            height: '40px',
                            verticalAlign: 'middle',
                            position: 'relative',
                          }}>
                            {renderTimeline(product.timeline, productIndex)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
        })}
      </div>

      {/* Filter Modal (single instance, anchored to the active header icon) */}
      {openFilterIndex &&
        createPortal(
          <div
            key={openFilterIndex}
            ref={filterModalRef}
            style={{
              position: 'fixed',
              top: `${filterPosition.top}px`,
              left: `${filterPosition.left}px`,
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '16px',
              width: '228px',
              boxSizing: 'border-box',
              boxShadow:
                '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
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
          </div>,
          document.body
        )}
    </>
  );
};

export default ShinersView;
