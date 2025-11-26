import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const LabelCheckTable = ({ isRecountMode = false, varianceExceededRowIds = [], onExitRecountMode }) => {
  const { isDarkMode } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-expand table when in recount mode
  useEffect(() => {
    if (isRecountMode) {
      setIsExpanded(true);
    }
  }, [isRecountMode]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [fullRolls, setFullRolls] = useState(['', '', '']);
  const [partialWeights, setPartialWeights] = useState(['', '', '']);
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);

  // Sample data matching the image
  const [rows, setRows] = useState([
    {
      id: 1,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 1000,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 2,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 50,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 3,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 480,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 4,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 160,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 5,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 240,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 6,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 600,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 7,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 120,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 8,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 240,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 9,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 480,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 10,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 6480,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 11,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 300,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 12,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 240,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 13,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 120,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 14,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 300,
      lblCurrentInv: 1526,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
  ]);

  const columns = [
    { key: 'start', label: '', width: '100px' },
    { key: 'brand', label: 'BRAND', width: '150px' },
    { key: 'product', label: 'PRODUCT', width: '200px' },
    { key: 'size', label: 'SIZE', width: '100px' },
    { key: 'quantity', label: 'QUANTITY', width: '120px' },
    { key: 'lblCurrentInv', label: 'LBL CURRENT INV', width: '150px' },
    { key: 'labelLocation', label: 'LABEL LOCATION', width: '150px' },
    { key: 'totalCount', label: 'TOTAL COUNT', width: '120px' },
  ];

  const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    return num.toLocaleString();
  };

  const handleStartClick = (row, index) => {
    setSelectedRow(row);
    setSelectedRowIndex(index);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRow(null);
    setSelectedRowIndex(null);
    setFullRolls(['', '', '']);
    setPartialWeights(['', '', '']);
  };

  const handleSave = () => {
    if (selectedRowIndex !== null) {
      const discrepancy = calculateDiscrepancy();
      // Only save if there's a discrepancy (positive or negative)
      if (discrepancy !== 0) {
        const updatedRows = [...rows];
        updatedRows[selectedRowIndex] = {
          ...updatedRows[selectedRowIndex],
          totalCount: discrepancy,
        };
        setRows(updatedRows);
      }
    }
    handleCloseModal();
  };

  const handleAddRoll = () => {
    setFullRolls([...fullRolls, '']);
  };

  const handleAddWeight = () => {
    setPartialWeights([...partialWeights, '']);
  };

  const handleRollChange = (index, value) => {
    const newRolls = [...fullRolls];
    newRolls[index] = value;
    setFullRolls(newRolls);
  };

  const handleWeightChange = (index, value) => {
    const newWeights = [...partialWeights];
    newWeights[index] = value;
    setPartialWeights(newWeights);
  };

  const calculateTotalLabels = () => {
    // Calculate based on full rolls and partial weights
    const fullRollTotal = fullRolls.reduce((sum, roll) => {
      const num = parseInt(roll) || 0;
      return sum + num;
    }, 0);
    // Partial weights calculation would need conversion logic
    // For now, assuming partial weights need to be converted to labels
    const partialWeightTotal = partialWeights.reduce((sum, weight) => {
      const num = parseFloat(weight) || 0;
      // Placeholder: convert weight to labels (would need actual conversion formula)
      return sum + Math.floor(num / 10); // Example: 10g per label
    }, 0);
    return fullRollTotal + partialWeightTotal;
  };

  const calculateDiscrepancy = () => {
    if (!selectedRow) return 0;
    const calculatedTotal = calculateTotalLabels();
    const currentInventory = selectedRow.lblCurrentInv || 0;
    return calculatedTotal - currentInventory;
  };

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumn !== null) {
        const filterIcon = filterIconRefs.current[openFilterColumn];
        const dropdown = filterDropdownRef.current;
        
        if (filterIcon && dropdown) {
          const isClickInsideIcon = filterIcon.contains(event.target);
          const isClickInsideDropdown = dropdown.contains(event.target);
          
          if (!isClickInsideIcon && !isClickInsideDropdown) {
            setOpenFilterColumn(null);
          }
        }
      }
    };

    if (openFilterColumn !== null) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterColumn]);

  return (
    <div style={{
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
      overflow: 'hidden',
      width: '100%',
      marginBottom: '16px',
    }}>
      {/* Recount Mode Banner */}
      {isRecountMode && (
        <div style={{
          backgroundColor: '#FEF3C7',
          borderBottom: '1px solid #FCD34D',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
              <path d="M12 9v4M12 17h.01" />
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            </svg>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#92400E' }}>
              Recount Mode: Showing {varianceExceededRowIds.length} {varianceExceededRowIds.length === 1 ? 'product' : 'products'} with variance exceeded
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onExitRecountMode) {
                onExitRecountMode();
              }
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #F59E0B',
              backgroundColor: '#FFFFFF',
              color: '#92400E',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#FEF3C7';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            }}
          >
            Show All
          </button>
        </div>
      )}
      {/* Dropdown Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
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
          e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#FFFFFF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isDarkMode ? '#1F2937' : '#FFFFFF';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
          {/* Status Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            backgroundColor: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 400,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              {/* Radial spinner icon with 12 dashed lines */}
              <g stroke="#3B82F6" strokeWidth="2" strokeLinecap="round">
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 30) * (Math.PI / 180);
                  const x1 = 12 + 4 * Math.cos(angle);
                  const y1 = 12 + 4 * Math.sin(angle);
                  const x2 = 12 + 6 * Math.cos(angle);
                  const y2 = 12 + 6 * Math.sin(angle);
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      strokeDasharray="2 2"
                    />
                  );
                })}
              </g>
            </svg>
            <span style={{ color: '#000000' }}>In Progress</span>
          </div>

          {/* COUNT ID */}
          <div style={{
            fontSize: '14px',
            fontWeight: 400,
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
          }}>
            COUNT ID
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: isDarkMode ? '#E5E7EB' : '#111827',
          }}>
            CC-DC-1
          </div>

          {/* COUNT TYPE */}
          <div style={{
            fontSize: '14px',
            fontWeight: 400,
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
          }}>
            COUNT TYPE
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: isDarkMode ? '#E5E7EB' : '#111827',
          }}>
            Shipment Count
          </div>

          {/* DATE CREATED */}
          <div style={{
            fontSize: '14px',
            fontWeight: 400,
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
          }}>
            DATE CREATED
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: 700,
            color: isDarkMode ? '#E5E7EB' : '#111827',
          }}>
            2025-11-20
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

      {/* Expanded Table */}
      {isExpanded && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}>
            <thead style={{ backgroundColor: '#1C2634' }}>
              <tr style={{ height: '40px', maxHeight: '40px' }}>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={column.key !== 'start' ? 'group cursor-pointer' : ''}
                    style={{
                      padding: column.key === 'start' ? '0 8px' : '0 16px',
                      textAlign: column.key === 'start' ? 'center' : 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      width: column.width,
                      whiteSpace: 'nowrap',
                      borderRight: column.key === 'start' ? 'none' : '1px solid #FFFFFF',
                      height: '40px',
                      position: column.key !== 'start' ? 'relative' : 'static',
                    }}
                  >
                    {column.label}
                    {column.key !== 'start' && (
                      <img
                        ref={(el) => { if (el) filterIconRefs.current[column.key] = el; }}
                        src="/assets/Vector (1).png"
                        alt="Filter"
                        className={`w-3 h-3 transition-opacity cursor-pointer ${
                          openFilterColumn === column.key
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterColumn(openFilterColumn === column.key ? null : column.key);
                        }}
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
                            : undefined)
                        }}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {(isRecountMode 
                ? rows.filter(row => varianceExceededRowIds.includes(row.id))
                : rows
              ).map((row, index) => {
                // Find the original index for styling
                const originalIndex = rows.findIndex(r => r.id === row.id);
                return (
                <tr
                  key={row.id}
                  style={{
                    backgroundColor: originalIndex % 2 === 0
                      ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                      : (isDarkMode ? '#1A1F2E' : '#F9FAFB'),
                    borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                    transition: 'background-color 0.2s',
                    height: '40px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = originalIndex % 2 === 0
                      ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                      : (isDarkMode ? '#1A1F2E' : '#F9FAFB');
                  }}
                >
                  <td style={{
                    padding: '0 8px',
                    textAlign: 'center',
                    height: '40px',
                  }}>
                    <button
                      type="button"
                      onClick={() => handleStartClick(row, index)}
                      style={{
                        height: '24px',
                        padding: '0 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563EB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#3B82F6';
                      }}
                    >
                      Start
                    </button>
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {row.brand}
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {row.product}
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {row.size}
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {formatNumber(row.quantity)}
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {formatNumber(row.lblCurrentInv)}
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {row.labelLocation}
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {row.totalCount !== undefined && row.totalCount !== null && row.totalCount !== '' ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <span>{formatNumber(row.lblCurrentInv)}</span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: row.totalCount < 0 ? '#FEE2E2' : '#D1FAE5',
                          color: row.totalCount < 0 ? '#DC2626' : '#059669',
                        }}>
                          {row.totalCount > 0 ? '+' : ''}{row.totalCount}
                        </span>
                      </div>
                    ) : ''}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Label Inventory Modal */}
      {isModalOpen && selectedRow && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#1C2634',
              padding: '16px 24px',
              margin: '-24px -24px 24px -24px',
              borderRadius: '12px 12px 0 0',
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#E5E7EB',
                margin: 0,
              }}>
                Edit Label Inventory
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9CA3AF',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#9CA3AF';
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Product Information */}
            <div style={{
              backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
              borderRadius: '8px',
              border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              gap: '32px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginBottom: '4px',
                }}>
                  Product Name
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                }}>
                  {selectedRow.product} ({selectedRow.size})
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginBottom: '4px',
                }}>
                  Label Location
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                }}>
                  {selectedRow.labelLocation}
                </div>
              </div>
            </div>

            {/* Two Columns */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              marginBottom: '24px',
            }}>
              {/* Left Column: Full Roll Label Count */}
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                  marginBottom: '8px',
                }}>
                  Full Roll Label Count
                </h3>
                <p style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginBottom: '16px',
                }}>
                  Enter the quantity of complete, unused label rolls.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {fullRolls.map((roll, index) => (
                    <input
                      key={index}
                      type="text"
                      placeholder="Enter roll quantity..."
                      value={roll}
                      onChange={(e) => handleRollChange(index, e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                        backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                        color: isDarkMode ? '#E5E7EB' : '#111827',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={handleAddRoll}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: '#3B82F6',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '8px 0',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                    </svg>
                    Add Another Roll
                  </button>
                </div>
              </div>

              {/* Right Column: Partial Roll Weight */}
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                  marginBottom: '8px',
                }}>
                  Partial Roll Weight (g)
                </h3>
                <p style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  marginBottom: '16px',
                }}>
                  Enter the weight in grams for each partially used roll.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {partialWeights.map((weight, index) => (
                    <input
                      key={index}
                      type="text"
                      placeholder="Enter roll weight..."
                      value={weight}
                      onChange={(e) => handleWeightChange(index, e.target.value)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                        backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                        color: isDarkMode ? '#E5E7EB' : '#111827',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={handleAddWeight}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: '#3B82F6',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '8px 0',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                    </svg>
                    Add Another Weight
                  </button>
                </div>
              </div>
            </div>

            {/* Calculated Total Labels */}
            <div style={{
              backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
              borderRadius: '8px',
              border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                  marginBottom: '4px',
                }}>
                  Calculated Total Labels
                </h3>
                <p style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  margin: 0,
                }}>
                  Current Label Inventory: {formatNumber(selectedRow.lblCurrentInv)}
                </p>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '8px',
              }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                }}>
                  {calculateTotalLabels()}
                </div>
                {calculateDiscrepancy() !== 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: calculateDiscrepancy() < 0 ? '#EF4444' : '#10B981',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}>
                    {calculateDiscrepancy() < 0 && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {calculateDiscrepancy() > 0 && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    <span>
                      {calculateDiscrepancy() > 0 ? '+' : ''}{calculateDiscrepancy()} Discrepancy
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              paddingTop: '24px',
            }}>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                  backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#4B5563' : '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#FFFFFF';
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
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
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Filter Dropdown */}
      {openFilterColumn && filterIconRefs.current[openFilterColumn] && (
        <FilterDropdown
          ref={filterDropdownRef}
          columnKey={openFilterColumn}
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          onClose={() => setOpenFilterColumn(null)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

// FilterDropdown Component
const FilterDropdown = React.forwardRef(({ columnKey, filterIconRef, onClose, isDarkMode }, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [filterField, setFilterField] = useState('');
  const [filterCondition, setFilterCondition] = useState('');
  const [filterValue, setFilterValue] = useState('');

  useEffect(() => {
    if (filterIconRef) {
      const rect = filterIconRef.getBoundingClientRect();
      const dropdownWidth = 320;
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
      
      setPosition({ top, left });
    }
  }, [filterIconRef]);

  const handleClear = () => {
    setSortField('');
    setSortOrder('');
  };

  const handleReset = () => {
    setSortField('');
    setSortOrder('');
    setFilterField('');
    setFilterCondition('');
    setFilterValue('');
  };

  const handleApply = () => {
    // Apply filter logic here
    onClose();
  };

  const sortFields = [
    { value: 'brand', label: 'Brand' },
    { value: 'product', label: 'Product' },
    { value: 'size', label: 'Size' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'lblCurrentInv', label: 'LBL Current Inv' },
    { value: 'labelLocation', label: 'Label Location' },
    { value: 'totalCount', label: 'Total Count' },
  ];

  const sortOrders = [
    { value: 'asc', label: 'Sort ascending (A to Z)', icon: 'A^Z' },
    { value: 'desc', label: 'Sort descending (Z to A)', icon: 'Z^A' },
  ];

  const filterFields = [
    { value: '', label: 'Select field' },
    { value: 'brand', label: 'Brand' },
    { value: 'product', label: 'Product' },
    { value: 'size', label: 'Size' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'lblCurrentInv', label: 'LBL Current Inv' },
    { value: 'labelLocation', label: 'Label Location' },
    { value: 'totalCount', label: 'Total Count' },
  ];

  const filterConditions = [
    { value: '', label: 'Select condition' },
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'lessThan', label: 'Less than' },
  ];

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '320px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid #E5E7EB',
        zIndex: 10000,
        padding: '16px',
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
            onClick={handleClear}
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
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
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
            {sortFields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: sortOrder ? '1px solid #3B82F6' : '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="">Select order</option>
            {sortOrders.map((order) => (
              <option key={order.value} value={order.value}>
                {order.icon} {order.label}
              </option>
            ))}
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
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: filterField ? '#374151' : '#9CA3AF',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {filterFields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          
          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: filterCondition ? '#374151' : '#9CA3AF',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {filterConditions.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </select>
          
          <input
            type="text"
            placeholder="Value here..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              backgroundColor: '#FFFFFF',
            }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
        <button
          type="button"
          onClick={handleReset}
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
          onClick={handleApply}
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
  );
});

FilterDropdown.displayName = 'FilterDropdown';

export default LabelCheckTable;





