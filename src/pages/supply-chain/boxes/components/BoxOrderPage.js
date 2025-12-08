import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { calculatePallets } from '../../../../utils/palletCalculations';
import { boxesApi, transformInventoryData } from '../../../../services/supplyChainApi';

const BoxOrderPage = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const orderNumber = state.orderNumber || '';
  const supplier = state.supplier || null;
  const mode = state.mode || 'create';
  const isCreateMode = mode === 'create';
  const isViewMode = mode === 'view' || mode === 'receive';
  const isReceiveMode = mode === 'receive';
  const orderId = state.orderId || null;

  // Navigation tab state
  const [activeTab, setActiveTab] = useState(() => {
    // Automatically set to receivePO when viewing an order
    return (mode === 'view' || mode === 'receive') ? 'receivePO' : 'addProducts';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch available boxes from API
  const [availableBoxes, setAvailableBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLines, setOrderLines] = useState([]);
  const [isReceiveConfirmOpen, setIsReceiveConfirmOpen] = useState(false);
  const [tableMode, setTableMode] = useState(true);
  const [doiGoal, setDoiGoal] = useState(120); // Days of Inventory goal for forecasting
  const [safetyBuffer, setSafetyBuffer] = useState(85); // Safety buffer percentage
  const [showDoiDropdown, setShowDoiDropdown] = useState(false);
  const [showSafetyDropdown, setShowSafetyDropdown] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  // Fetch order details if viewing/receiving existing order
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (isReceiveMode && orderId) {
        try {
          setLoading(true);
          const response = await boxesApi.getOrder(orderId);
          if (response.success) {
            const orderData = response.data;
            
            // Handle multiple order lines
            const lines = orderData.lines || [];
            const orderLines = lines.map((line, index) => {
              const originalQty = line.quantity_ordered || 0;
              const receivedQty = line.quantity_received || 0;
              const qtyToReceive = originalQty - receivedQty; // Remaining to receive
              const calculatedPallets = calculatePallets(
                qtyToReceive,
                line.units_per_pallet || 1
              );
              return {
                id: line.id || index + 1,
                orderId: line.id,
                name: line.box_type || 'Unknown Box',
                boxType: line.box_type || 'Unknown Box',
                qty: qtyToReceive, // Default to remaining quantity
                originalQty: originalQty, // Store original ordered quantity
                receivedQty: receivedQty, // Store already received quantity
                pallets: calculatedPallets,
                unitsPerPallet: line.units_per_pallet || 1,
                supplier: line.supplier,
                selected: qtyToReceive > 0, // Auto-select if there's remaining to receive
              };
            });
            
            console.log('Loaded order lines:', orderLines);
            setOrderLines(orderLines);
          }
        } catch (err) {
          console.error('Error fetching order details:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchOrderDetails();
  }, [isReceiveMode, orderId]);

  // Fetch boxes and forecast requirements on mount for create mode
  useEffect(() => {
    const fetchBoxes = async () => {
      if (!isReceiveMode) {
        try {
          setLoading(true);
          const response = await boxesApi.getInventory();
          const forecastData = await boxesApi.getForecastRequirements(doiGoal, safetyBuffer / 100);
          
          console.log('RAW API RESPONSE:', response);
          console.log('FORECAST DATA:', forecastData);
          
          if (response.success) {
            const boxes = transformInventoryData(response);
            
            // Build forecast map by box type
            const forecastMap = {};
            if (forecastData.success && forecastData.data) {
              forecastData.data.forEach(forecast => {
                forecastMap[forecast.box_type] = forecast;
              });
            }
            
            console.log('Fetched boxes from API:', boxes.length, boxes);
            setAvailableBoxes(boxes);
            
            // Create lines for ALL boxes with forecast-based quantities
            const allBoxLines = boxes.map((box, index) => {
              const forecast = forecastMap[box.name] || {};
              const recommendedQty = Math.round(forecast.recommended_order_qty || 0);
              const calculatedPallets = calculatePallets(recommendedQty, box.unitsPerPallet || 1);
              
              // Calculate total daily sales rate from products using this box
              let totalDailySalesRate = 0;
              if (forecast.products_using_box && Array.isArray(forecast.products_using_box)) {
                totalDailySalesRate = forecast.products_using_box.reduce((sum, product) => {
                  return sum + (product.daily_sales_rate || 0);
                }, 0);
              }
              
              // Calculate current DOI (Days of Inventory)
              // DOI = current_inventory / daily_sales_rate
              // Lower DOI = more urgent to order
              const currentInventory = forecast.current_inventory || 0;
              const currentDOI = totalDailySalesRate > 0 
                ? Math.round(currentInventory / totalDailySalesRate)
                : currentInventory > 0 ? 999 : 0; // If no sales data but has inventory, put at end; if no inventory, prioritize
              
              console.log(`Creating line for ${box.name}:`, {
                unitsPerPallet: box.unitsPerPallet,
                recommendedQty,
                forecastedNeeded: forecast.forecasted_cases_needed,
                currentInventory: forecast.current_inventory,
                calculatedPallets,
                currentDOI
              });
              
              return {
                id: index + 1,
                name: box.name,
                boxType: box.name,
                unitsNeeded: recommendedQty,
                qty: 0, // Start with 0, will be set when user clicks Add
                pallets: 0, // Start with 0, will be calculated when user clicks Add
                unitsPerPallet: box.unitsPerPallet || 1,
                supplier: box.supplier,
                supplierInventory: box.supplierInventory || 0,
                maxInventory: box.maxInventory || 0,
                currentInventory: currentInventory,
                totalDailySalesRate: totalDailySalesRate,
                currentDOI: currentDOI,
                selected: false, // Start unselected
                recommendedQty: recommendedQty,
                forecastedCasesNeeded: Math.round(forecast.forecasted_cases_needed || 0),
                added: false, // Default to not added - user must click Add button
              };
            });
            
            // Sort by DOI ascending (lowest DOI first = most urgent to order)
            allBoxLines.sort((a, b) => {
              const doiA = a.currentDOI ?? 999;
              const doiB = b.currentDOI ?? 999;
              return doiA - doiB;
            });
            
            console.log('Created order lines (sorted by DOI):', allBoxLines.length, allBoxLines);
            setOrderLines(allBoxLines);
          }
        } catch (err) {
          console.error('Error fetching boxes:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchBoxes();
  }, [isReceiveMode, doiGoal, safetyBuffer]);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
  };

  const handleBack = () => {
    navigate('/dashboard/supply-chain/boxes');
  };

  const handleAddProduct = (lineId) => {
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.id === lineId) {
          const isAdding = !line.added;
          return {
            ...line,
            added: isAdding,
            selected: isAdding,
            qty: isAdding ? (line.recommendedQty || 0) : 0,
            pallets: isAdding ? calculatePallets(line.recommendedQty || 0, line.unitsPerPallet || 1) : 0,
          };
        }
        return line;
      })
    );
  };

  const handleCreateOrder = async () => {
    try {
      const selectedLines = orderLines.filter(l => l.added && l.qty > 0);
      const timestamp = Date.now();
      
      // Create separate order for each box type
      for (let i = 0; i < selectedLines.length; i++) {
        const line = selectedLines[i];
        const orderData = {
          order_number: `${orderNumber}-${timestamp}-${i + 1}`,
          box_type: line.boxType,
          supplier: supplier.name,
          order_date: new Date().toISOString().split('T')[0],
          quantity_ordered: line.qty,
          cost_per_unit: 0,
          total_cost: 0,
          status: 'pending',
          notes: `${line.qty} units (${line.pallets} pallets)`,
        };

        await boxesApi.createOrder(orderData);
      }
      
      navigate('/dashboard/supply-chain/boxes', {
        state: {
          newBoxOrder: {
            orderNumber,
            supplierName: supplier.name,
          },
        },
      });
    } catch (err) {
      console.error('Error creating order:', err);
      alert(`Failed to create order: ${err.message}`);
    }
  };


  const handleRemoveLine = (lineId) => {
    setOrderLines(prev => prev.filter(l => l.id !== lineId));
  };

  // Handle checkbox selection
  const handleCheckboxChange = (lineId, checked) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(lineId);
      } else {
        newSet.delete(lineId);
      }
      return newSet;
    });
  };

  // Handle select all checkbox
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(new Set(orderLines.map(line => line.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  // Calculate summary
  const summary = useMemo(() => {
    const linesToUse = isViewMode && activeTab === 'receivePO' ? orderLines : orderLines.filter(line => line.added);
    const totalQty = linesToUse.reduce((sum, line) => sum + (line.qty || 0), 0);
    const totalPallets = linesToUse.reduce((sum, line) => sum + (line.pallets || 0), 0);
    const units = totalQty; // Units is the same as total qty
    
    return {
      totalQty,
      totalPallets,
      units,
    };
  }, [orderLines, isViewMode, activeTab]);

  // Handle receive button click - check if partial order
  const handleReceiveClick = () => {
    if (!isViewMode || !orderId) return;
    
    const totalItems = orderLines.length;
    const selectedCount = selectedItems.size;
    
    // If all items selected, show confirmation modal
    if (selectedCount === totalItems && totalItems > 0) {
      setIsReceiveConfirmOpen(true);
      return;
    }
    
    // If some items selected, show partial order modal
    if (selectedCount > 0 && selectedCount < totalItems) {
      setIsReceiveConfirmOpen(true);
      return;
    }
    
    // If no items selected, do nothing
  };

  const handleReceiveComplete = async (isPartial = false) => {
    try {
      const selectedLines = orderLines.filter(l => selectedItems.has(l.id));
      
      if (selectedLines.length === 0) {
        alert('Please select at least one line to receive');
        return;
      }
      
      // Validate quantities before processing
      for (const line of selectedLines) {
        const alreadyReceived = line.receivedQty || 0;
        const newReceived = line.qty || 0;
        const totalReceived = alreadyReceived + newReceived;
        const originalQty = line.originalQty || 0;
        
        if (totalReceived > originalQty) {
          alert(`Cannot receive ${totalReceived} units for ${line.boxType}. Maximum is ${originalQty} units (${alreadyReceived} already received, ${originalQty - alreadyReceived} remaining).`);
          return;
        }
        
        if (newReceived <= 0) {
          alert(`Please enter a valid quantity greater than 0 for ${line.boxType}`);
          return;
        }
      }
      
      // Update each received line
      for (const line of selectedLines) {
        const lineOrderId = line.orderId || orderId;
        
        // Calculate total received: already received + new received
        const alreadyReceived = line.receivedQty || 0;
        const newReceived = line.qty || 0;
        const totalReceived = alreadyReceived + newReceived;
        
        // Determine if this is partial (total received < original ordered)
        const originalQty = line.originalQty || totalReceived;
        const isLinePartial = totalReceived < originalQty;
        
        // Update order with total received quantity
        await boxesApi.updateOrder(lineOrderId, {
          box_type: line.boxType,
          status: isLinePartial ? 'partial' : 'received',
          actual_delivery_date: new Date().toISOString().split('T')[0],
          quantity_received: totalReceived, // Total received (previous + new)
        });
      }
      
      // Check if any lines were not selected or quantities reduced (partial receive)
      const unselectedLines = orderLines.filter(l => !l.selected);
      const hasUnselected = unselectedLines.length > 0;
      const hasReducedQty = selectedLines.some(l => {
        const totalReceived = (l.receivedQty || 0) + (l.qty || 0);
        return totalReceived < (l.originalQty || 0);
      });
      
      navigate('/dashboard/supply-chain/boxes', {
        state: {
          receivedOrderId: orderId,
          isPartial: isPartial || hasUnselected || hasReducedQty,
        },
      });
    } catch (err) {
      console.error('Error receiving order:', err);
      alert(`Failed to receive order: ${err.message}`);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDoiDropdown && !event.target.closest('.doi-dropdown-container')) {
        setShowDoiDropdown(false);
      }
      if (showSafetyDropdown && !event.target.closest('.safety-dropdown-container')) {
        setShowSafetyDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDoiDropdown, showSafetyDropdown]);

  if (!supplier || !orderNumber) {
    // If this page is hit directly, just send user back to boxes
    handleBack();
    return null;
  }

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`} style={{ paddingBottom: '100px' }}>
      {/* Header Section */}
      <div style={{ 
        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
        padding: '16px 24px',
        borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
      }}>
        {/* Top Row - Back button and Order Info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <button
              type="button"
              onClick={handleBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                border: isDarkMode ? '1px solid #4B5563' : '1px solid #E5E7EB',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: '8px 16px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#4B5563' : '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#FFFFFF';
              }}
            >
              <svg 
                style={{ width: '16px', height: '16px' }} 
                className={isDarkMode ? 'text-white' : 'text-gray-900'}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 400,
                color: isDarkMode ? '#FFFFFF' : '#000000',
              }}>
                Back
              </span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ 
                  fontSize: '10px', 
                  fontWeight: 400,
                  letterSpacing: '0.05em',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  BOXES ORDER #
                </div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 400,
                  color: isDarkMode ? '#FFFFFF' : '#000000',
                }}>
                  {orderNumber}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ 
                  fontSize: '10px', 
                  fontWeight: 400,
                  letterSpacing: '0.05em',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  SUPPLIER
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={supplier.logoSrc}
                    alt={supplier.logoAlt}
                    style={{ height: '24px', objectFit: 'contain' }}
                  />
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: 400,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {supplier.name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Table Mode Toggle and Settings */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Table Mode Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 500, 
                color: isDarkMode ? '#FFFFFF' : '#000000',
              }}>
                Table Mode
              </span>
              <button
                type="button"
                onClick={() => setTableMode(!tableMode)}
                style={{
                  width: '48px',
                  height: '28px',
                  borderRadius: '14px',
                  backgroundColor: tableMode ? '#007AFF' : (isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'),
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s',
                  padding: 0,
                }}
                aria-label="Toggle Table Mode"
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    position: 'absolute',
                    top: '2px',
                    left: tableMode ? '22px' : '2px',
                    transition: 'left 0.2s',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  }}
                />
              </button>
            </div>

            {/* Settings Button */}
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
              }}
              aria-label="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="2" fill="currentColor"/>
                <line x1="12" y1="2" x2="12" y2="8"/>
                <line x1="12" y1="16" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="8" y2="12"/>
                <line x1="16" y1="12" x2="22" y2="12"/>
                <line x1="4.343" y1="4.343" x2="8.485" y2="8.485"/>
                <line x1="15.515" y1="15.515" x2="19.657" y2="19.657"/>
                <line x1="19.657" y1="4.343" x2="15.515" y2="8.485"/>
                <line x1="8.485" y1="15.515" x2="4.343" y2="19.657"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        {isViewMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
            <button
              type="button"
              disabled
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: '2px solid transparent',
                cursor: 'not-allowed',
                opacity: 0.7,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" fill="#22C55E"/>
              </svg>
              <span>Add Products</span>
            </button>
            <button
              type="button"
              disabled
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: '2px solid transparent',
                cursor: 'not-allowed',
                opacity: 0.7,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" fill="#22C55E"/>
              </svg>
              <span>Submit PO</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('receivePO')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: activeTab === 'receivePO' ? '#007AFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                backgroundColor: activeTab === 'receivePO' ? (isDarkMode ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)') : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'receivePO' ? '2px solid #007AFF' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {activeTab === 'receivePO' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" fill="#007AFF"/>
                  <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
              )}
              <span>Receive PO</span>
            </button>
          </div>
        )}
      </div>

      {/* Search bar and forecast controls - above table */}
        <div className="px-6 py-4 flex justify-between items-center" style={{ marginTop: '0' }}>
          {/* Forecast Controls */}
          {!isReceiveMode && (
            <div className="flex items-center gap-6" style={{ flex: 1 }}>
              {/* DOI Goal Selector */}
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '14px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                  Forecast Period:
                </span>
              <div className="relative doi-dropdown-container">
                <button
                  type="button"
                  onClick={() => setShowDoiDropdown(!showDoiDropdown)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors"
                  style={{
                    backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                    color: isDarkMode ? '#F9FAFB' : '#000000',
                    borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{doiGoal} Days</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showDoiDropdown && (
                  <div 
                    className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border z-50"
                    style={{ minWidth: '180px', borderColor: '#E5E7EB' }}
                  >
                    {[30, 60, 90, 120, 150, 180].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => {
                          setDoiGoal(days);
                          setShowDoiDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                        style={{
                          fontSize: '14px',
                          color: doiGoal === days ? '#3B82F6' : '#374151',
                          fontWeight: doiGoal === days ? 600 : 400,
                          backgroundColor: doiGoal === days ? '#EFF6FF' : 'transparent',
                        }}
                      >
                        {days} Days {days === 120 && '(Recommended)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Safety Buffer Selector */}
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '14px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                Capacity Target:
              </span>
              <div className="relative safety-dropdown-container">
                <button
                  type="button"
                  onClick={() => setShowSafetyDropdown(!showSafetyDropdown)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors"
                  style={{
                    backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
                    color: isDarkMode ? '#F9FAFB' : '#000000',
                    borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: 500 }}>{safetyBuffer}%</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showSafetyDropdown && (
                  <div 
                    className="absolute top-full mt-1 left-0 bg-white rounded-lg shadow-lg border z-50"
                    style={{ minWidth: '200px', borderColor: '#E5E7EB' }}
                  >
                    {[70, 75, 80, 85, 90, 95, 100].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setSafetyBuffer(pct);
                          setShowSafetyDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                        style={{
                          fontSize: '14px',
                          color: safetyBuffer === pct ? '#3B82F6' : '#374151',
                          fontWeight: safetyBuffer === pct ? 600 : 400,
                          backgroundColor: safetyBuffer === pct ? '#EFF6FF' : 'transparent',
                        }}
                      >
                        {pct}% {pct === 85 && '(Recommended)'} {pct === 100 && '(Full)'} {pct < 80 && '(Conservative)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Search Bar */}
        <div className="relative" style={{ maxWidth: '300px', width: '100%', marginLeft: 'auto', marginRight: '24px' }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: isDarkMode ? '#374151' : '#FFFFFF',
              color: isDarkMode ? '#F9FAFB' : '#000000',
              borderColor: isDarkMode ? '#4B5563' : '#D1D5DB',
            }}
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <svg
            className="absolute right-3 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Table - Show in all tabs */}
      <div className={`${themeClasses.cardBg} border ${themeClasses.border} shadow-lg mx-6`} style={{ marginTop: '0', borderRadius: '8px', overflow: 'hidden' }}>
        <div className="overflow-x-auto">
          {/* Table Mode - Show different table structure for addProducts tab when tableMode is true */}
          {tableMode && activeTab === 'addProducts' && !isViewMode ? (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead style={{ backgroundColor: '#2C3544', borderRadius: '8px 8px 0 0' }}>
                <tr style={{ height: '40px', maxHeight: '40px' }}>
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', height: '40px', textAlign: 'center', borderRight: '1px solid #3C4656', width: 50 }}>
                    <input 
                      type="checkbox" 
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      checked={orderLines.length > 0 && orderLines.every(l => l.added)}
                      onChange={(e) => {
                        setOrderLines(prev => prev.map(line => ({ ...line, added: e.target.checked })));
                      }}
                    />
                  </th>
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '24px',
                    paddingBottom: '12px',
                    paddingLeft: '24px',
                    textAlign: 'left',
                    borderRight: '1px solid #3C4656',
                  }}>
                    PACKAGING NAME
                  </th>
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '24px',
                    paddingBottom: '12px',
                    paddingLeft: '24px',
                    textAlign: 'left',
                    borderRight: '1px solid #3C4656',
                  }}>
                    SUPPLIER INVENTORY
                  </th>
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '24px',
                    paddingBottom: '12px',
                    paddingLeft: '24px',
                    textAlign: 'right',
                    borderRight: '1px solid #3C4656',
                  }}>
                    CURRENT INVENTORY
                  </th>
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '24px',
                    paddingBottom: '12px',
                    paddingLeft: '24px',
                    textAlign: 'right',
                    borderRight: '1px solid #3C4656',
                  }}>
                    UNITS NEEDED
                  </th>
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '24px',
                    paddingBottom: '12px',
                    paddingLeft: '24px',
                    textAlign: 'right',
                    borderRight: '1px solid #3C4656',
                  }}>
                    QTY
                  </th>
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '24px',
                    paddingBottom: '12px',
                    paddingLeft: '24px',
                    textAlign: 'right',
                  }}>
                    PALLETS
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-6 text-center text-sm italic text-gray-400">
                      Loading boxes...
                    </td>
                  </tr>
                ) : orderLines.filter(line => {
                    if (!searchQuery.trim()) return true;
                    const query = searchQuery.toLowerCase();
                    return line.name?.toLowerCase().includes(query);
                  }).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-6 text-center text-sm italic text-gray-400">
                      No items available.
                    </td>
                  </tr>
                ) : (
                  orderLines
                    .filter(line => {
                      if (!searchQuery.trim()) return true;
                      const query = searchQuery.toLowerCase();
                      return line.name?.toLowerCase().includes(query);
                    })
                    .map((line) => {
                      const currentInventory = line.currentInventory || 0;
                      const unitsNeeded = line.forecastedUnitsNeeded || line.recommendedQty || 0;
                      
                      return (
                        <tr 
                          key={line.id}
                          style={{
                            borderTop: '1px solid #e5e7eb',
                          }}
                        >
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', height: '40px', verticalAlign: 'middle' }}>
                            <input 
                              type="checkbox" 
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                              checked={line.added || false}
                              onChange={(e) => {
                                setOrderLines(prev => prev.map(l => 
                                  l.id === line.id ? { ...l, added: e.target.checked } : l
                                ));
                              }}
                            />
                          </td>
                          <td style={{ 
                            height: '40px',
                            paddingTop: '12px',
                            paddingRight: '24px',
                            paddingBottom: '12px',
                            paddingLeft: '24px',
                            fontSize: '0.875rem',
                            verticalAlign: 'middle',
                            textAlign: 'left',
                          }} className={themeClasses.textPrimary}>
                            {line.name}
                          </td>
                          <td style={{ 
                            height: '40px',
                            paddingTop: '12px',
                            paddingRight: '24px',
                            paddingBottom: '12px',
                            paddingLeft: '24px',
                            fontSize: '0.875rem',
                            verticalAlign: 'middle',
                            textAlign: 'left',
                          }} className={themeClasses.textPrimary}>
                            Auto Replenishment
                          </td>
                          <td style={{ 
                            height: '40px',
                            paddingTop: '12px',
                            paddingRight: '24px',
                            paddingBottom: '12px',
                            paddingLeft: '24px',
                            fontSize: '0.875rem',
                            verticalAlign: 'middle',
                            textAlign: 'right',
                          }} className={themeClasses.textPrimary}>
                            {currentInventory.toLocaleString()}
                          </td>
                          <td style={{ 
                            height: '40px',
                            paddingTop: '12px',
                            paddingRight: '24px',
                            paddingBottom: '12px',
                            paddingLeft: '24px',
                            fontSize: '0.875rem',
                            verticalAlign: 'middle',
                            textAlign: 'right',
                          }} className={themeClasses.textPrimary}>
                            {unitsNeeded.toLocaleString()}
                          </td>
                          <td style={{ 
                            height: '40px',
                            paddingTop: '12px',
                            paddingRight: '24px',
                            paddingBottom: '12px',
                            paddingLeft: '24px',
                            textAlign: 'right',
                            verticalAlign: 'middle',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <input
                                type="number"
                                value={line.qty || ''}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  const unitsPerPallet = line.unitsPerPallet || 1;
                                  const newPallets = calculatePallets(val, unitsPerPallet);
                                  setOrderLines((prev) =>
                                    prev.map((l) => {
                                      if (l.id === line.id) {
                                        return { ...l, qty: val, pallets: newPallets };
                                      }
                                      return l;
                                    })
                                  );
                                }}
                                style={{
                                  width: '120px',
                                  padding: '6px 12px',
                                  fontSize: '14px',
                                  textAlign: 'right',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '6px',
                                  backgroundColor: '#FFFFFF',
                                  color: '#000000',
                                  cursor: 'text',
                                }}
                              />
                            </div>
                          </td>
                          <td style={{ 
                            height: '40px',
                            paddingTop: '12px',
                            paddingRight: '24px',
                            paddingBottom: '12px',
                            paddingLeft: '24px',
                            textAlign: 'right',
                            verticalAlign: 'middle',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <input
                                type="number"
                                step="0.1"
                                value={line.pallets ? line.pallets.toFixed(1) : ''}
                                readOnly
                                style={{
                                  width: '120px',
                                  padding: '6px 12px',
                                  fontSize: '14px',
                                  textAlign: 'right',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '6px',
                                  backgroundColor: '#F3F4F6',
                                  color: '#6B7280',
                                  cursor: 'default',
                                }}
                                title="Auto-calculated from quantity"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead style={{ backgroundColor: '#2C3544', borderRadius: '8px 8px 0 0' }}>
              <tr style={{ height: '40px', maxHeight: '40px' }}>
                {/* Checkbox column - show when viewing an order in receivePO tab */}
                {isViewMode && activeTab === 'receivePO' && (
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', height: '40px', textAlign: 'center', borderRight: '1px solid #3C4656', width: 50 }}>
                    <input
                      type="checkbox"
                      style={{ cursor: 'pointer' }}
                      checked={selectedItems.size === orderLines.length && orderLines.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                )}
                <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                  padding: '0 1rem', 
                  height: '40px', 
                  textAlign: 'left', 
                  borderRight: '1px solid #3C4656',
                  width: isViewMode && activeTab === 'receivePO' ? 300 : 350
                }}>
                  PACKAGING NAME
                </th>
                {/* SUPPLIER INV column - only show in addProducts tab when creating new order (not viewing) */}
                {(activeTab === 'addProducts' && !isViewMode) && (
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', height: '40px', textAlign: 'left', borderRight: '1px solid #3C4656', width: 200 }}>
                    SUPPLIER INV
                  </th>
                )}
                {/* ADD column - only show in addProducts tab when creating new order (not viewing) */}
                {(activeTab === 'addProducts' && !isViewMode) && (
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', height: '40px', textAlign: 'center', borderRight: '1px solid #3C4656', width: 120 }}>
                    ADD
                  </th>
                )}
                <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                  padding: '0 1rem', 
                  height: '40px', 
                  textAlign: 'center', 
                  borderRight: '1px solid #3C4656',
                  width: 150
                }}>
                  QTY
                </th>
                <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                  padding: '0 1rem', 
                  height: '40px', 
                  textAlign: 'center', 
                  borderRight: '1px solid #3C4656',
                  width: 120
                }}>
                  PALLETS
                </th>
                {/* INVENTORY PERCENTAGE column - only show in addProducts tab when creating new order (not viewing) */}
                {(activeTab === 'addProducts' && !isViewMode) && (
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', height: '40px', textAlign: 'left', width: 300 }}>
                    INVENTORY PERCENTAGE
                  </th>
                )}
                {/* Ellipsis column - show when viewing an order in receivePO tab */}
                {isViewMode && activeTab === 'receivePO' && (
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', height: '40px', textAlign: 'center', width: 50 }}>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={(isViewMode && activeTab === 'receivePO') ? 4 : ((activeTab === 'addProducts' && !isViewMode) ? 6 : 4)} className="px-6 py-6 text-center text-sm italic text-gray-400">
                    Loading boxes...
                  </td>
                </tr>
              ) : orderLines.filter(line => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return line.name?.toLowerCase().includes(query);
                }).length === 0 ? (
                <tr>
                  <td colSpan={(isViewMode && activeTab === 'receivePO') ? 4 : ((activeTab === 'addProducts' && !isViewMode) ? 6 : 4)} className="px-6 py-6 text-center text-sm italic text-gray-400">
                    No items available.
                  </td>
                </tr>
              ) : (
                orderLines
                  .filter(line => {
                    if (!searchQuery.trim()) return true;
                    const query = searchQuery.toLowerCase();
                    return line.name?.toLowerCase().includes(query);
                  })
                  .map((line) => {
                    const inventoryPercentage = line.maxInventory > 0 
                      ? Math.round((line.currentInventory / line.maxInventory) * 100) 
                      : 0;
                    
                    return (
                      <tr key={line.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        {/* Checkbox - show when viewing an order in receivePO tab */}
                        {isViewMode && activeTab === 'receivePO' && (
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', height: '40px', verticalAlign: 'middle' }}>
                            <input
                              type="checkbox"
                              style={{ cursor: 'pointer' }}
                              checked={selectedItems.has(line.id)}
                              onChange={(e) => handleCheckboxChange(line.id, e.target.checked)}
                            />
                          </td>
                        )}
                        <td style={{ 
                          padding: '0.65rem 1rem', 
                          fontSize: '0.85rem', 
                          height: '40px', 
                          verticalAlign: 'middle' 
                        }} className={themeClasses.textPrimary}>
                          {line.name}
                        </td>
                        {/* SUPPLIER INV - only show in addProducts tab when creating new order (not viewing) */}
                        {(activeTab === 'addProducts' && !isViewMode) && (
                          <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', height: '40px', verticalAlign: 'middle' }} className={themeClasses.textPrimary}>
                            {line.supplierInventory?.toLocaleString() || 'Auto Replenishment'}
                          </td>
                        )}
                        {/* ADD button - only show in addProducts tab when creating new order (not viewing) */}
                        {(activeTab === 'addProducts' && !isViewMode) && (
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', height: '40px', verticalAlign: 'middle' }}>
                            <button
                              type="button"
                              onClick={() => handleAddProduct(line.id)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                width: '100%',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s',
                                backgroundColor: line.added ? '#22C55E' : '#007AFF',
                                color: '#FFFFFF',
                              }}
                            >
                              {line.added ? (
                                <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                  Added
                                </>
                              ) : (
                                <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                  </svg>
                                  Add
                                </>
                              )}
                            </button>
                          </td>
                        )}
                        <td style={{ 
                          padding: '0.65rem 1rem', 
                          fontSize: '0.85rem', 
                          height: '40px', 
                          verticalAlign: 'middle' 
                        }}>
                          <input
                            type="number"
                            min="0"
                            max={isReceiveMode && line.originalQty ? (line.originalQty - (line.receivedQty || 0)) : undefined}
                            disabled={!line.added && !isReceiveMode}
                            className={`w-full text-sm px-2 py-1 text-center bg-white shadow-inner rounded-none border ${
                              !isReceiveMode && line.recommendedQty > 0 
                                ? 'border-2 border-blue-500 ring-1 ring-blue-200' 
                                : 'border-gray-200'
                            } ${!line.added && !isReceiveMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                            value={line.qty}
                            onChange={(e) => {
                              if (!line.added && !isReceiveMode) return;
                              
                              const val = Number(e.target.value) || 0;
                              
                              if (isReceiveMode && line.originalQty) {
                                const maxQty = line.originalQty - (line.receivedQty || 0);
                                const clampedVal = Math.min(val, maxQty);
                                
                                if (val > maxQty) {
                                  alert(`Cannot receive more than ${maxQty} units (${line.originalQty} ordered - ${line.receivedQty || 0} already received)`);
                                }
                                
                                const finalVal = clampedVal;
                                const unitsPerPallet = line.unitsPerPallet || 1;
                                const newPallets = calculatePallets(finalVal, unitsPerPallet);
                                
                                setOrderLines((prev) =>
                                  prev.map((l) => {
                                    if (l.id === line.id) {
                                      return { ...l, qty: finalVal, pallets: newPallets };
                                    }
                                    return l;
                                  })
                                );
                              } else {
                                const unitsPerPallet = line.unitsPerPallet || 1;
                                const newPallets = calculatePallets(val, unitsPerPallet);
                                
                                setOrderLines((prev) =>
                                  prev.map((l) => {
                                    if (l.id === line.id) {
                                      return { ...l, qty: val, pallets: newPallets };
                                    }
                                    return l;
                                  })
                                );
                              }
                            }}
                          />
                        </td>
                        <td style={{ 
                          padding: '0.65rem 1rem', 
                          fontSize: '0.85rem', 
                          height: '40px', 
                          verticalAlign: 'middle',
                          textAlign: 'center'
                        }} className={themeClasses.textPrimary}>
                          {line.pallets.toFixed(2)}
                        </td>
                        {/* INVENTORY PERCENTAGE - only show in addProducts tab when creating new order (not viewing) */}
                        {(activeTab === 'addProducts' && !isViewMode) && (
                          <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', height: '40px', verticalAlign: 'middle' }}>
                            <div style={{ width: '100%', height: '24px', backgroundColor: '#E5E7EB', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                              <div 
                                style={{ 
                                  width: `${Math.min(inventoryPercentage, 100)}%`, 
                                  height: '100%', 
                                  backgroundColor: '#22C55E',
                                  transition: 'width 0.3s ease'
                                }}
                              />
                              <div style={{ 
                                position: 'absolute', 
                                top: '50%', 
                                left: '50%', 
                                transform: 'translate(-50%, -50%)', 
                                fontSize: '11px', 
                                fontWeight: 600,
                                color: inventoryPercentage > 50 ? '#FFFFFF' : '#1F2937'
                              }}>
                                {inventoryPercentage}%
                              </div>
                            </div>
                          </td>
                        )}
                        {/* Ellipsis - show when viewing an order in receivePO tab */}
                        {isViewMode && activeTab === 'receivePO' && (
                          <td style={{ padding: '0.65rem 1rem', textAlign: 'center', height: '40px', verticalAlign: 'middle' }}>
                            <button
                              type="button"
                              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                              style={{
                                color: '#6B7280',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              aria-label="Row actions"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
                                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                                <circle cx="12" cy="18" r="1.5" fill="currentColor"/>
                              </svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Footer - Sticky */}
      <div
        className="fixed bottom-0 left-64 right-0 z-50"
        style={{ 
          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
          borderTop: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
          padding: '16px 24px',
        }}
      >
        <div className="flex items-center justify-between gap-6">
          {/* Summary - Left side */}
          {(activeTab === 'addProducts' || activeTab === 'receivePO') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: 500, color: isDarkMode ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PALETTES
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : '#1F2937' }}>
                  {summary.totalPallets.toFixed(1)}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: 500, color: isDarkMode ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  TOTAL BOXES
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : '#1F2937' }}>
                  {summary.totalQty.toLocaleString()}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '11px', fontWeight: 500, color: isDarkMode ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  UNITS
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : '#1F2937' }}>
                  {summary.units.toLocaleString()}
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons - Right side */}
          <div className="flex items-center gap-3">
            {/* Export button */}
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: 'transparent',
                color: '#3B82F6',
                padding: '8px 12px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              Export
            </button>
            
            {/* Edit Order button - only show when viewing */}
            {isViewMode && activeTab === 'receivePO' && (
              <button
                type="button"
                onClick={() => {
                  // Handle edit order - could navigate or set edit mode
                }}
                className="inline-flex items-center gap-2 text-xs font-semibold rounded-lg px-4 py-2 transition-colors"
                style={{
                  backgroundColor: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Order
              </button>
            )}
            
            {/* Receive Order / Complete Order button */}
            <button
              type="button"
              onClick={isViewMode && activeTab === 'receivePO' ? handleReceiveClick : handleCreateOrder}
              disabled={!isViewMode && orderLines.filter(l => l.added && l.qty > 0).length === 0}
              className="inline-flex items-center gap-2 text-xs font-semibold rounded-lg px-4 py-2 transition-colors"
              style={{
                backgroundColor: (isViewMode || orderLines.filter(l => l.added && l.qty > 0).length > 0) ? '#007AFF' : (isDarkMode ? '#374151' : '#D1D5DB'),
                color: '#FFFFFF',
                cursor: (isViewMode || orderLines.filter(l => l.added && l.qty > 0).length > 0) ? 'pointer' : 'not-allowed',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {activeTab === 'receivePO' ? 'Receive Order' : 'Complete Order'}
            </button>
          </div>
        </div>
      </div>

      {isReceiveMode && isReceiveConfirmOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md px-8 py-6 text-center">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Are you sure?</h2>
            <p className="text-xs text-gray-500 mb-6">
              Proceed with a partial delivery? Only received items will be updated in inventory.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                onClick={() => setIsReceiveConfirmOpen(false)}
              >
                Go Back
              </button>
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                onClick={() => {
                  setIsReceiveConfirmOpen(false);
                  handleReceiveComplete(true);
                }}
              >
                Complete Partial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoxOrderPage;
