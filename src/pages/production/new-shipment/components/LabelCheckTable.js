import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { getShipmentProducts } from '../../../../services/productionApi';
import VarianceStillExceededModal from './VarianceStillExceededModal';

const LabelCheckTable = ({
  shipmentId,
  isRecountMode = false,
  varianceExceededRowIds = [],
  onExitRecountMode,
  onRowsDataChange,
  hideHeader = false,
}) => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const isPlanningView = location.pathname.includes('planning');
  // In viewing shipment (non-recount) hide column dropdown filters
  const disableFilters = !isRecountMode || isPlanningView;
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auto-expand table when in recount mode
  useEffect(() => {
    if (isRecountMode) {
      setIsExpanded(true);
    }
  }, [isRecountMode]);

  // Reset completed status for rows that need recount
  useEffect(() => {
    if (isRecountMode && varianceExceededRowIds.length > 0) {
      setCompletedRows(prev => {
        const newSet = new Set(prev);
        // Remove rows that need recount from completed set so they show "Start" again
        varianceExceededRowIds.forEach(id => {
          newSet.delete(id);
        });
        return newSet;
      });
    }
  }, [isRecountMode, varianceExceededRowIds]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState(null);
  const [fullRolls, setFullRolls] = useState(['', '', '']);
  const [partialWeights, setPartialWeights] = useState(['', '', '']);
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const [isStartPreviewOpen, setIsStartPreviewOpen] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [completedRows, setCompletedRows] = useState(new Set());
  const [completedRowStatus, setCompletedRowStatus] = useState({}); // id -> insufficient?: true/false
  const [isVarianceStillExceededOpen, setIsVarianceStillExceededOpen] = useState(false);
  const hideActionsDropdown = Boolean(shipmentId);
  const disableHeaderDropdown = true; // Always show label check products; no collapsible header
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);

  // Load label data from API
  useEffect(() => {
    if (shipmentId) {
      loadLabelData();
    }
  }, [shipmentId]);

  const loadLabelData = async () => {
    try {
      setLoading(true);
      const data = await getShipmentProducts(shipmentId);
      
      // Transform API data to match table format
      const formattedRows = data.map(product => ({
        id: product.id,
        brand: product.brand_name,
        product: product.product_name,
        size: product.size,
        quantity: product.labels_needed,
        lblCurrentInv: product.labels_available || 0,
        labelLocation: product.label_location,
        totalCount: '',
      }));
      
      setRows(formattedRows);
    } catch (error) {
      console.error('Error loading label data:', error);
      setRows([]); // Use empty array on error instead of dummy data
    } finally {
      setLoading(false);
    }
  };

  // Initialize rows state with empty array - only use real data from API
  const [rows, setRows] = useState([]);

  const columns = [
    { key: 'start', label: '', width: '100px' },
    { key: 'brand', label: 'BRAND', width: '150px' },
    { key: 'product', label: 'PRODUCT', width: '200px' },
    { key: 'size', label: 'SIZE', width: '100px' },
    { key: 'quantity', label: 'QUANTITY', width: '120px' },
    { key: 'lblCurrentInv', label: 'LBL CURRENT INV', width: '150px' },
    { key: 'labelLocation', label: 'LABEL LOCATION', width: '150px' },
  ];

  const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    return num.toLocaleString();
  };

  const handleStartClick = (row, index) => {
    setSelectedRow(row);
    setSelectedRowIndex(index);
    setIsStartPreviewOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsStartPreviewOpen(false);
    setSelectedRow(null);
    setSelectedRowIndex(null);
    setFullRolls(['', '', '']);
    setPartialWeights(['', '', '']);
  };

  const handleSave = () => {
    if (selectedRow && selectedRow.id) {
      const calculatedTotal = calculateTotalLabels();
      const labelsNeeded = selectedRow.quantity || 0;
      const discrepancy = calculatedTotal - labelsNeeded;
      const insufficient = calculatedTotal < labelsNeeded;
      
      // Check if variance exceeds threshold
      const varianceExceeds = checkVarianceExceeded(discrepancy, labelsNeeded);
      
      if (varianceExceeds) {
        // Show the variance still exceeded modal
        setIsVarianceStillExceededOpen(true);
        // Don't close the edit modal yet - user might want to go back and edit
        return;
      }
      
      // Save the calculated total (not discrepancy) for display
      // The discrepancy will be calculated as: totalCount - labelsNeeded
      const updatedRows = rows.map(row => 
        row.id === selectedRow.id 
          ? { ...row, totalCount: calculatedTotal }
          : row
      );
      setRows(updatedRows);
      
      // Mark the row as completed
      setCompletedRows(prev => new Set(prev).add(selectedRow.id));
      setCompletedRowStatus(prev => ({ ...prev, [selectedRow.id]: insufficient }));
      handleCloseModal();
    }
  };

  const handleVarianceGoBack = () => {
    // Close the variance modal but keep the edit modal open
    setIsVarianceStillExceededOpen(false);
  };

  const handleVarianceConfirm = () => {
    // User confirmed the variance - save the data and close both modals
    if (selectedRow && selectedRow.id) {
      const calculatedTotal = calculateTotalLabels();
      const labelsNeeded = selectedRow.quantity || 0;
      const insufficient = calculatedTotal < labelsNeeded;
      // Save the calculated total even though variance exceeds
      const updatedRows = rows.map(row => 
        row.id === selectedRow.id 
          ? { ...row, totalCount: calculatedTotal }
          : row
      );
      setRows(updatedRows);
      // Mark the row as completed (but it will need recount)
      setCompletedRows(prev => new Set(prev).add(selectedRow.id));
      setCompletedRowStatus(prev => ({ ...prev, [selectedRow.id]: insufficient }));
    }
    setIsVarianceStillExceededOpen(false);
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
    // Label Weight Calculation Formula:
    // - Each full roll = 1000 labels
    // - Each gram of partial roll = 10 labels
    const fullRollTotal = fullRolls.reduce((sum, roll) => {
      const numRolls = parseInt(roll) || 0;
      return sum + (numRolls * 1000); // Each roll = 1000 labels
    }, 0);
    
    const partialWeightTotal = partialWeights.reduce((sum, weight) => {
      const numGrams = parseFloat(weight) || 0;
      return sum + (numGrams * 10); // Each gram = 10 labels
    }, 0);
    
    return fullRollTotal + partialWeightTotal;
  };

  const calculateDiscrepancy = () => {
    if (!selectedRow) return 0;
    const calculatedTotal = calculateTotalLabels();
    // Compare against labels needed for shipment (not current inventory)
    const labelsNeeded = selectedRow.quantity || 0;
    return calculatedTotal - labelsNeeded;
  };

  const isInsufficientLabels = (() => {
    if (!selectedRow) return false;
    const counted = calculateTotalLabels();
    const needed = Number(selectedRow.quantity ?? 0) || 0;
    return counted < needed;
  })();

  // Check if variance exceeds threshold
  // Variance is the difference between calculated total and labels needed
  const checkVarianceExceeded = (discrepancy, labelsNeeded) => {
    const varianceThreshold = 10; // Minimum threshold in units
    const varianceThresholdPercent = 0.05; // 5% threshold
    
    const absVariance = Math.abs(discrepancy);
    const percentThreshold = Math.abs(labelsNeeded * varianceThresholdPercent);
    const threshold = Math.max(varianceThreshold, percentThreshold);
    
    return absVariance > threshold;
  };

  // Notify parent component when rows data changes
  useEffect(() => {
    if (onRowsDataChange) {
      onRowsDataChange(rows);
    }
  }, [rows, onRowsDataChange]);

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

  // Force expanded when dropdown is disabled
  useEffect(() => {
    if (disableHeaderDropdown && !isExpanded) {
      setIsExpanded(true);
    }
  }, [disableHeaderDropdown, isExpanded]);

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
      {!hideHeader && (
        <div
          onClick={disableHeaderDropdown ? undefined : () => setIsExpanded(!isExpanded)}
          style={{
            padding: '16px 24px',
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: disableHeaderDropdown ? 'default' : 'pointer',
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
          
          {!disableHeaderDropdown && (
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
          )}
        </div>
      )}

      {/* Expanded Table */}
      {(hideHeader || isExpanded) && (
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
                    {!disableFilters && column.key !== 'start' && (
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
                    {completedRows.has(row.id) ? (
                      <button
                        type="button"
                        disabled
                        style={{
                          height: '23px',
                          padding: '0 10px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: completedRowStatus[row.id] ? '#F59E0B' : '#22C55E',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'default',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap',
                          minWidth: '55px',
                        }}
                      >
                        Done
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartClick(row, index)}
                        style={{
                          height: '23px',
                          padding: '0 10px',
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
                          minWidth: '55px',
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
                    )}
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
                  Labels Needed: {formatNumber(selectedRow.quantity || 0)}
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
                {(() => {
                  const calculatedTotal = calculateTotalLabels();
                  const labelsNeeded = selectedRow.quantity || 0;
                  const discrepancy = calculatedTotal - labelsNeeded;
                  return discrepancy !== 0 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: discrepancy < 0 ? '#EF4444' : '#10B981',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}>
                      {discrepancy < 0 && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {discrepancy > 0 && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      <span>
                        {discrepancy > 0 ? '+' : ''}{discrepancy} {discrepancy < 0 ? 'Short' : 'Surplus'}
                      </span>
                    </div>
                  );
                })()}
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
                  backgroundColor: isInsufficientLabels ? '#F59E0B' : '#22C55E',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isInsufficientLabels ? '#D97706' : '#16A34A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isInsufficientLabels ? '#F59E0B' : '#22C55E';
                }}
              >
                Verify
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Start Preview Modal */}
      {isStartPreviewOpen && selectedRow && createPortal(
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
              backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
              borderRadius: '12px',
              width: '324px',
              padding: '24px',
              border: isDarkMode ? '1px solid #1F2937' : '1px solid #E5E7EB',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#E5E7EB' : '#111827' }}>
                  Label Check
                </h2>
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-label="Info"
                    onMouseEnter={() => setShowInfoTooltip(true)}
                    onMouseLeave={() => setShowInfoTooltip(false)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx="12" cy="12" r="10" stroke="#007AFF" strokeWidth="2" />
                    <path d="M12 10v6" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="12" cy="7" r="1" fill="#007AFF" />
                  </svg>
                  {showInfoTooltip && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '28px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '304px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0px 10px 24px rgba(0, 0, 0, 0.14)',
                        padding: '12px',
                        display: 'flex',
                        gap: '4px',
                        alignItems: 'flex-start',
                        zIndex: 10,
                        overflow: 'visible',
                      }}
                    >
                      {/* Tail */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 0,
                          height: 0,
                          borderLeft: '8px solid transparent',
                          borderRight: '8px solid transparent',
                          borderTop: '8px solid #FFFFFF',
                          filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.12))',
                        }}
                      />
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginTop: '2px' }}>
                        <rect x="5" y="3" width="14" height="18" rx="2" stroke="#007AFF" strokeWidth="2" />
                        <path d="M9 7h6" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" />
                        <path d="M9 11h6" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                          Label Confirmation
                        </span>
                        <span style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.4 }}>
                          Confirming that we have sufficient labels for this shipment. This is not a full label inventory, but a quick confirmation.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = isDarkMode ? '#FFFFFF' : '#111827'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280'; }}
              >
                ✕
              </button>
            </div>

            <div style={{
              border: isDarkMode ? '1px solid #1F2937' : '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '12px 16px',
              width: '276px',
              backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              alignSelf: 'center',
            }}>
              <div>
                <div style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '4px' }}>Product Name</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: isDarkMode ? '#E5E7EB' : '#111827' }}>
                  {selectedRow.product} ({selectedRow.size})
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '4px' }}>Label Location</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: isDarkMode ? '#E5E7EB' : '#111827' }}>
                  {selectedRow.labelLocation}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '4px' }}>Labels Needed</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: isDarkMode ? '#E5E7EB' : '#111827' }}>
                  {formatNumber(selectedRow.quantity)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{
                  height: '31px',
                  padding: '0 12px',
                  borderRadius: '4px',
                  width: '276px',
                  border: 'none',
                  backgroundColor: '#007AFF',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  alignSelf: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0056CC'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#007AFF'; }}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsStartPreviewOpen(false);
                  setIsModalOpen(true);
                }}
                style={{
                  height: '31px',
                  padding: '0 12px',
                  borderRadius: '4px',
                  width: '276px',
                  alignSelf: 'center',
                  border: '1px solid #D1D5DB',
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDarkMode ? '#1F2937' : '#F3F4F6'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isDarkMode ? '#111827' : '#FFFFFF'; }}
              >
                Count Labels
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Filter Dropdown */}
      {!disableFilters && openFilterColumn && filterIconRefs.current[openFilterColumn] && (
        <FilterDropdown
          ref={filterDropdownRef}
          columnKey={openFilterColumn}
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          onClose={() => setOpenFilterColumn(null)}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Variance Still Exceeded Modal */}
      <VarianceStillExceededModal
        isOpen={isVarianceStillExceededOpen}
        onClose={() => setIsVarianceStillExceededOpen(false)}
        onGoBack={handleVarianceGoBack}
        onConfirm={handleVarianceConfirm}
      />
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
      // Start a bit lower than before so the dropdown sits further under the icon
      let top = rect.bottom + 16;
      
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
        // Match Figma spec: top/bottom 12px, left/right 24px, horizontal gap handled in children
        padding: '12px 24px',
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





