import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { calculatePallets } from '../../../../utils/palletCalculations';
import { closuresApi, transformInventoryData } from '../../../../services/supplyChainApi';

const ClosureOrderPage = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const orderNumber = state.orderNumber || '';
  const supplier = state.supplier || null;
  const mode = state.mode || 'create';
  const isReceiveMode = mode === 'receive';
  const orderId = state.orderId || null;

  // Fetch available closures from API
  const [availableClosures, setAvailableClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLines, setOrderLines] = useState([]);
  const [isReceiveConfirmOpen, setIsReceiveConfirmOpen] = useState(false);
  const [showAddClosureModal, setShowAddClosureModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [tableMode, setTableMode] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return isReceiveMode ? 'receivePO' : 'addProducts';
  });
  const [doiGoal, setDoiGoal] = useState(120); // Days of Inventory goal for forecasting
  const [safetyBuffer, setSafetyBuffer] = useState(85); // Safety buffer percentage
  const [showDoiDropdown, setShowDoiDropdown] = useState(false);
  const [showSafetyDropdown, setShowSafetyDropdown] = useState(false);
  const [actionMenuLineId, setActionMenuLineId] = useState(null);

  // Fetch order details if viewing/receiving existing order
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (isReceiveMode && orderId) {
        try {
          setLoading(true);
          const response = await closuresApi.getOrder(orderId);
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
                name: line.closure_name || 'Unknown Closure',
                closureName: line.closure_name || 'Unknown Closure',
                qty: qtyToReceive, // Default to remaining quantity
                originalQty: originalQty, // Store original ordered quantity
                receivedQty: receivedQty, // Store already received quantity
                pallets: calculatedPallets,
                unitsPerPallet: line.units_per_pallet || 1,
                unitsPerCase: line.units_per_case,
                casesPerPallet: line.cases_per_pallet,
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

  // Fetch closures and forecast requirements on mount for create mode
  useEffect(() => {
    const fetchClosures = async () => {
      if (!isReceiveMode) {
        try {
          setLoading(true);
          const response = await closuresApi.getInventory();
          const forecastData = await closuresApi.getForecastRequirements(doiGoal, safetyBuffer / 100);
          
          console.log('RAW API RESPONSE:', response);
          console.log('FORECAST DATA:', forecastData);
          
          if (response.success) {
            const closures = transformInventoryData(response);
            
            // Build forecast map by closure name
            const forecastMap = {};
            if (forecastData.success && forecastData.data) {
              forecastData.data.forEach(forecast => {
                forecastMap[forecast.closure_name] = forecast;
              });
            }
            
            console.log('Fetched closures from API:', closures.length, closures);
            setAvailableClosures(closures);
            
            // Create lines for ALL closures with forecast-based quantities (no mock data)
            const allClosureLines = closures.map((closure, index) => {
              const forecast = forecastMap[closure.name] || {};
              const recommendedQty = Math.round(forecast.recommended_order_qty || 0);
              const calculatedPallets = calculatePallets(recommendedQty, closure.unitsPerPallet || 1);
              
              // Calculate total daily sales rate from products using this closure
              let totalDailySalesRate = 0;
              if (forecast.products_using_closure && Array.isArray(forecast.products_using_closure)) {
                totalDailySalesRate = forecast.products_using_closure.reduce((sum, product) => {
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
              
              console.log(`Creating line for ${closure.name}:`, {
                unitsPerPallet: closure.unitsPerPallet,
                recommendedQty,
                forecastedNeeded: forecast.forecasted_units_needed,
                currentInventory: forecast.current_inventory,
                calculatedPallets,
                currentDOI,
                closureData: closure
              });
              
              // Get max inventory from closure data (check multiple possible field names)
              const maxInventory = closure.maxWarehouseInventory || closure.maxInventory || closure.max_warehouse_inventory || closure.max_quantity || 0;
              
              return {
                id: index + 1,
                name: closure.name,
                closureName: closure.name,
                unitsNeeded: recommendedQty,
                qty: recommendedQty,
                pallets: calculatedPallets,
                unitsPerPallet: closure.unitsPerPallet || 1,
                unitsPerCase: closure.unitsPerCase,
                casesPerPallet: closure.casesPerPallet,
                supplier: closure.supplier,
                selected: recommendedQty > 0, // Auto-select only if forecast suggests ordering
                added: false, // Track if closure is added to order
                recommendedQty: recommendedQty,
                forecastedUnitsNeeded: Math.round(forecast.forecasted_units_needed || 0),
                currentInventory: currentInventory,
                totalDailySalesRate: totalDailySalesRate,
                currentDOI: currentDOI,
                maxInventory: maxInventory,
              };
            });
            
            // Sort by DOI ascending (lowest DOI first = most urgent to order)
            allClosureLines.sort((a, b) => {
              const doiA = a.currentDOI ?? 999;
              const doiB = b.currentDOI ?? 999;
              return doiA - doiB;
            });
            
            console.log('Created order lines (sorted by DOI):', allClosureLines.length, allClosureLines);
            setOrderLines(allClosureLines);
          }
        } catch (err) {
          console.error('Error fetching closures:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchClosures();
  }, [isReceiveMode, doiGoal, safetyBuffer]);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
  };

  const handleBack = () => {
    navigate('/dashboard/supply-chain/closures');
  };

  const handleCompleteOrder = () => {
    const addedLines = orderLines.filter(l => l.added);
    if (addedLines.length === 0) {
      alert('Please add at least one closure to the order');
      return;
    }
    setShowExportModal(true);
  };

  const handleDone = async () => {
    try {
      const addedLines = orderLines.filter(l => l.added);
      const timestamp = Date.now();
      
      // Create separate order for each closure type
      for (let i = 0; i < addedLines.length; i++) {
        const line = addedLines[i];
        const orderData = {
          order_number: `${orderNumber}-${timestamp}-${i + 1}`,
          closure_name: line.closureName,
          supplier: supplier.name,
          order_date: new Date().toISOString().split('T')[0],
          quantity_ordered: line.qty,
          cost_per_unit: 0,
          total_cost: 0,
          status: 'submitted',
          notes: `${line.qty} units (${line.pallets} pallets)`,
        };

        await closuresApi.createOrder(orderData);
      }
      
      navigate('/dashboard/supply-chain/closures', {
        state: {
          newClosureOrder: {
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

  const getExportFileName = () => {
    if (orderNumber) {
      return `${orderNumber}.csv`;
    }
    const today = new Date().toISOString().split('T')[0];
    return `TPS_ClosureOrder_${today}.csv`;
  };

  const handleExportCSV = () => {
    const addedLines = orderLines.filter(l => l.added);
    const headers = ['Closure Name', 'Qty', 'Pallets'];
    const rows = addedLines.map(line => [
      line.name,
      line.qty || 0,
      line.pallets || 0,
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', getExportFileName());
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddClosure = (closure) => {
    const nextId = orderLines.length ? Math.max(...orderLines.map(l => l.id)) + 1 : 1;
    const defaultQty = closure.unitsPerPallet || 1000;
    const newLine = {
      id: nextId,
      name: closure.name,
      closureName: closure.name,
      unitsNeeded: defaultQty,
      qty: defaultQty,
      pallets: calculatePallets(defaultQty, closure.unitsPerPallet || 1),
      unitsPerPallet: closure.unitsPerPallet || 1,
      unitsPerCase: closure.unitsPerCase,
      casesPerPallet: closure.casesPerPallet,
      supplier: closure.supplier,
      selected: true,
    };
    setOrderLines([...orderLines, newLine]);
    setShowAddClosureModal(false);
  };

  const handleRemoveLine = (lineId) => {
    setOrderLines(prev => prev.filter(l => l.id !== lineId));
  };

  // Calculate summary
  const summary = useMemo(() => {
    const addedLines = orderLines.filter(line => line.added);
    const totalQty = addedLines.reduce((sum, line) => sum + (line.qty || 0), 0);
    const totalPallets = addedLines.reduce((sum, line) => sum + (line.pallets || 0), 0);
    const units = totalQty; // Units is the same as total qty for closures
    
    return {
      totalQty,
      totalPallets,
      units,
      addedCount: addedLines.length,
    };
  }, [orderLines]);

  const handleAddProduct = (lineId) => {
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.id === lineId) {
          return { ...line, added: !line.added };
        }
        return line;
      })
    );
  };

  const handleQtyChange = (lineId, value) => {
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.id === lineId) {
          let qty = Number(value) || 0;
          const unitsPerPallet = line.unitsPerPallet || 1;
          const maxInventory = line.maxInventory || 0;
          const currentInventory = line.currentInventory || 0;
          
          // Calculate max allowed quantity to order
          const maxAllowedQty = maxInventory > 0 ? Math.max(0, maxInventory - currentInventory) : Infinity;
          
          // Limit quantity to max allowed
          if (maxInventory > 0 && qty > maxAllowedQty) {
            alert(`Cannot exceed max warehouse capacity!\n\nCurrent Inventory: ${currentInventory.toLocaleString()} units\nMax Capacity: ${maxInventory.toLocaleString()} units\nAvailable Space: ${maxAllowedQty.toLocaleString()} units\n\nQuantity has been limited to ${maxAllowedQty.toLocaleString()} units.`);
            qty = maxAllowedQty;
          }
          
          // Auto-calculate pallets
          const pallets = calculatePallets(qty, unitsPerPallet);
          
          // Calculate inventory percentage: (current + qty) / max * 100
          const inventoryPercentage = maxInventory > 0 
            ? Math.round(((currentInventory + qty) / maxInventory) * 100)
            : 0;
          
          return { 
            ...line, 
            qty, 
            pallets: parseFloat(pallets.toFixed(2)),
            inventoryPercentage 
          };
        }
        return line;
      })
    );
  };

  const handleReceiveComplete = async (isPartial = false) => {
    try {
      const selectedLines = orderLines.filter(l => l.selected);
      
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
          alert(`Cannot receive ${totalReceived} units for ${line.closureName}. Maximum is ${originalQty} units (${alreadyReceived} already received, ${originalQty - alreadyReceived} remaining).`);
          return;
        }
        
        if (newReceived <= 0) {
          alert(`Please enter a valid quantity greater than 0 for ${line.closureName}`);
          return;
        }
      }
      
      // Check if any lines were not selected (partial receive)
      const unselectedLines = orderLines.filter(l => !l.selected);
      const hasUnselected = unselectedLines.length > 0;
      
      // Update each received line
      for (const line of selectedLines) {
        const lineOrderId = line.orderId || orderId;
        
        // Calculate total received: already received + new received
        const alreadyReceived = line.receivedQty || 0;
        const newReceived = line.qty || 0;
        const totalReceived = alreadyReceived + newReceived;
        
        // Determine if this is partial (total received < original ordered OR not all items selected)
        const originalQty = line.originalQty || totalReceived;
        const isLinePartial = totalReceived < originalQty || isPartial || hasUnselected;
        
        // Update order with total received quantity
        await closuresApi.updateOrder(lineOrderId, {
          closure_name: line.closureName,
          status: isLinePartial ? 'partial' : 'received',
          actual_delivery_date: new Date().toISOString().split('T')[0],
          quantity_received: totalReceived, // Total received (previous + new)
        });
      }
      
      // If there are unselected lines and this is a partial order, ensure they maintain partial status
      // This ensures the order group correctly shows as 'partial' in the orders table
      if (isPartial || hasUnselected) {
        for (const line of unselectedLines) {
          const lineOrderId = line.orderId || orderId;
          // Keep unselected lines with partial status to reflect the order group correctly
          // Only update status if it's not already received
          if (line.status !== 'received') {
            await closuresApi.updateOrder(lineOrderId, {
              closure_name: line.closureName,
              status: 'partial', // Mark as partial since not all items were received
            });
          }
        }
      }
      
      navigate('/dashboard/supply-chain/closures', {
        state: {
          receivedOrderId: orderId,
          isPartial: isPartial || hasUnselected,
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
      if (actionMenuLineId && !event.target.closest('.action-menu-container')) {
        setActionMenuLineId(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDoiDropdown, showSafetyDropdown, actionMenuLineId]);

  if (!supplier || !orderNumber) {
    // If this page is hit directly, just send user back to closures
    handleBack();
    return null;
  }

  return (
    <div className={`p-8 ${themeClasses.pageBg}`}>
      <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-lg`}>
        {/* Header row */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-full hover:bg-gray-100"
              onClick={handleBack}
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </span>
              Back
            </button>

            <div className="flex flex-col gap-1 text-xs text-gray-500">
              <div className="flex items-center gap-8">
                <div>
                  <div className="uppercase tracking-wide text-[10px] text-gray-400">Closure Order #</div>
                  <div className="text-sm font-semibold text-gray-900">{orderNumber}</div>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="uppercase tracking-wide text-[10px] text-gray-400">Supplier</div>
                  <div className="flex items-center gap-2">
                    <img
                      src={supplier.logoSrc}
                      alt={supplier.logoAlt}
                      className="h-6 object-contain"
                    />
                    <span className="text-sm font-semibold text-gray-900">{supplier.name}</span>
                  </div>
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
                color: '#007AFF',
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.4-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"/>
                </svg>
              </button>
            </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0', borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB' }}>
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
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            )}
            <span>Receive PO</span>
          </button>
        </div>

        {/* Forecast Controls - Only show in create mode */}
        {!isReceiveMode && (
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-6">
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
          </div>
        )}

        {/* Search bar - only in receive mode */}
        {isReceiveMode && (
          <div className="px-6 py-4 flex justify-end">
            <div className="relative" style={{ width: '300px' }}>
              <input
                type="text"
                placeholder="Search..."
                className="w-full px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                style={{ fontSize: '14px' }}
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="px-6 py-4">
          <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Receive PO View - Show when in receive mode */}
            {isReceiveMode && activeTab === 'receivePO' ? (
              <div>
                {/* Receive PO Table Header */}
                <div className="bg-[#1f2937] text-white text-xs font-bold uppercase tracking-wider" style={{ borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
                  <div className="grid items-center" style={{ gridTemplateColumns: '60px 2fr 1fr 1fr 60px' }}>
                    <div className="px-4 py-3 border-r border-white/20 text-center">
                      <input 
                        type="checkbox" 
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        checked={orderLines.length > 0 && orderLines.every(l => l.selected)}
                        onChange={(e) => {
                          setOrderLines(prev => prev.map(line => ({ ...line, selected: e.target.checked })));
                        }}
                      />
                    </div>
                    <div className="px-4 py-3 border-r border-white/20 text-left">PACKAGING NAME</div>
                    <div className="px-4 py-3 border-r border-white/20 text-center">QTY</div>
                    <div className="px-4 py-3 pr-4 text-center" style={{ gridColumn: '4 / 6' }}>PALLETS</div>
                  </div>
                </div>
                
                {/* Receive PO Table Rows */}
                <div className="bg-white">
                  {loading ? (
                    <div className="px-4 py-6 text-center text-gray-500">Loading order...</div>
                  ) : orderLines.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500">No items in this order</div>
                  ) : (
                    orderLines.map((line, index) => {
                      // Format QTY with commas
                      const formatQty = (val) => {
                        if (!val && val !== 0) return '';
                        const num = parseInt(val);
                        return isNaN(num) ? '' : num.toLocaleString();
                      };
                      
                      // Handle input change with comma parsing
                      const handleQtyInputChange = (e) => {
                        const rawValue = e.target.value.replace(/,/g, '');
                        const numValue = parseInt(rawValue) || 0;
                        handleQtyChange(line.id, numValue);
                      };
                      
                      return (
                        <div
                          key={line.id}
                          className="grid items-center text-sm border-t border-gray-200"
                          style={{ gridTemplateColumns: '60px 2fr 1fr 1fr 60px' }}
                        >
                          <div className="px-4 py-3 flex items-center justify-center">
                            <input 
                              type="checkbox" 
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                              checked={line.selected || false}
                              onChange={(e) => {
                                setOrderLines(prev => prev.map(l => 
                                  l.id === line.id ? { ...l, selected: e.target.checked } : l
                                ));
                              }}
                            />
                          </div>
                          <div className="px-4 py-3 text-sm text-gray-900">{line.name}</div>
                          <div className="px-4 py-3">
                            <input
                              type="text"
                              min="0"
                              max={line.originalQty ? (line.originalQty - (line.receivedQty || 0)) : undefined}
                              className="w-full text-sm px-3 py-2 text-center rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                              style={{ 
                                backgroundColor: '#F9FAFB',
                                borderRadius: '6px',
                              }}
                              value={formatQty(line.qty)}
                              onChange={handleQtyInputChange}
                              placeholder="0"
                            />
                          </div>
                          <div className="px-4 py-3">
                            <input
                              type="text"
                              className="w-full text-sm px-3 py-2 text-center rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                              style={{ 
                                backgroundColor: '#F9FAFB',
                                borderRadius: '6px',
                              }}
                              value={line.pallets ? line.pallets.toFixed(1) : ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const unitsPerPallet = line.unitsPerPallet || 1;
                                const qty = val * unitsPerPallet;
                                handleQtyChange(line.id, qty);
                              }}
                              placeholder="0.0"
                            />
                          </div>
                          <div className="px-4 py-3 flex items-center justify-center relative action-menu-container">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuLineId(actionMenuLineId === line.id ? null : line.id);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '4px',
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="5" r="1" fill="#6B7280" />
                                <circle cx="12" cy="12" r="1" fill="#6B7280" />
                                <circle cx="12" cy="19" r="1" fill="#6B7280" />
                              </svg>
                            </button>
                            {actionMenuLineId === line.id && (
                              <div
                                className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 action-menu-container"
                                style={{ minWidth: '120px' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                  onClick={() => {
                                    setActionMenuLineId(null);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 border-t border-gray-200"
                                  onClick={() => {
                                    handleRemoveLine(line.id);
                                    setActionMenuLineId(null);
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : tableMode && !isReceiveMode ? (
              <div>
                {/* Table Mode Header */}
            <div className="bg-[#1f2937] text-white text-[11px] font-semibold uppercase tracking-wide">
                  <div className="grid items-center" style={{ gridTemplateColumns: '50px 2fr 1.5fr 1.2fr 1.2fr 1.2fr 1.2fr' }}>
                    <div className="px-4 py-2 border-r border-gray-700 text-center">
                      <input 
                        type="checkbox" 
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        checked={orderLines.length > 0 && orderLines.every(l => l.selected)}
                        onChange={(e) => {
                          setOrderLines(prev => prev.map(line => ({ ...line, selected: e.target.checked })));
                        }}
                      />
                    </div>
                    <div className="px-4 py-2 border-r border-gray-700 text-left">Closure Name</div>
                    <div className="px-4 py-2 border-r border-gray-700 text-left">Supplier Inventory</div>
                    <div className="px-4 py-2 border-r border-gray-700 text-right">Current Inventory</div>
                    <div className="px-4 py-2 border-r border-gray-700 text-right">Units Needed</div>
                    <div className="px-4 py-2 border-r border-gray-700 text-right">QTY</div>
                    <div className="px-4 py-2 text-right">Pallets</div>
                  </div>
                </div>
                
                {/* Table Mode Rows */}
                <div className="bg-white">
                  {loading ? (
                    <div className="px-4 py-6 text-center text-gray-500">Loading closures...</div>
                  ) : orderLines.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500">No closures available</div>
                  ) : (
                    orderLines.map((line) => (
                      <div
                        key={line.id}
                        className="grid items-center text-sm border-t border-gray-100"
                        style={{ gridTemplateColumns: '50px 2fr 1.5fr 1.2fr 1.2fr 1.2fr 1.2fr' }}
                      >
                        <div className="px-4 py-2 flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            checked={line.selected || false}
                            onChange={(e) => {
                              setOrderLines(prev => prev.map(l => 
                                l.id === line.id ? { ...l, selected: e.target.checked } : l
                              ));
                            }}
                          />
                        </div>
                        <div className="px-4 py-2 text-sm text-gray-900">{line.name}</div>
                        <div className="px-4 py-2 text-sm text-gray-900">Auto Replenishment</div>
                        <div className="px-4 py-2 text-sm text-gray-900 text-right">{(line.currentInventory || 0).toLocaleString()}</div>
                        <div className="px-4 py-2 text-sm text-gray-900 text-right">{(line.forecastedUnitsNeeded || 0).toLocaleString()}</div>
                        <div className="px-4 py-2">
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <input
                              type="number"
                              min="0"
                              value={line.qty}
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
                        </div>
                        <div className="px-4 py-2">
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
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                {/* Standard View Header */}
                <div className="bg-[#1f2937] text-white text-xs font-bold uppercase tracking-wider">
              <div
                className="grid items-center"
                    style={{ gridTemplateColumns: '2fr 1.5fr 120px 1.2fr 1.2fr 300px' }}
                  >
                    <div className="px-4 py-2 border-r border-gray-700 text-left">PACKAGING NAME</div>
                    <div className="px-4 py-2 border-r border-gray-700 text-left">SUPPLIER INV</div>
                    <div className="px-4 py-2 border-r border-gray-700 text-center">ADD</div>
                    <div className="px-4 py-2 border-r border-gray-700 text-right">QTY</div>
                    <div className="px-4 py-2 border-r border-gray-700 text-right">PALLETS</div>
                    <div className="px-4 py-2 text-left">INVENTORY PERCENTAGE</div>
              </div>
            </div>

                {/* Standard View Rows */}
            <div className="bg-white">
              {loading ? (
                <div className="px-4 py-6 text-center text-gray-500">Loading closures...</div>
              ) : orderLines.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500">No closures available</div>
              ) : (
                orderLines.map((line) => {
                  const inventoryPercentage = line.maxInventory > 0 && line.currentInventory !== undefined
                    ? Math.round(((line.currentInventory + (line.qty || 0)) / line.maxInventory) * 100)
                    : 0;
                  
                  return (
                <div
                  key={line.id}
                  className="grid items-center text-sm border-t border-gray-100"
                    style={{ gridTemplateColumns: '2fr 1.5fr 120px 1.2fr 1.2fr 300px' }}
                >
                  <div className="px-4 py-2 text-sm text-gray-900">{line.name}</div>
                    <div className="px-4 py-2 text-sm text-gray-900">Auto Replenishment</div>
                    <div className="px-4 py-2 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleAddProduct(line.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          backgroundColor: line.added ? '#22C55E' : '#3B82F6',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          paddingLeft: '12px',
                          paddingRight: '12px',
                          paddingTop: '4px',
                          paddingBottom: '4px',
                          fontSize: '14px',
                          fontWeight: 400,
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        {line.added ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 13l4 4L19 7"/>
                            </svg>
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 5v14M5 12h14"/>
                            </svg>
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  <div className="px-4 py-2 relative">
                    {!isReceiveMode && line.recommendedQty > 0 && (
                      <div 
                        className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center z-10"
                        title="Forecast-based quantity"
                      >
                        F
                      </div>
                    )}
                    <input
                      type="number"
                      min="0"
                      max={isReceiveMode && line.originalQty ? (line.originalQty - (line.receivedQty || 0)) : undefined}
                        className={`w-full text-sm px-2 py-1 text-right bg-white shadow-inner rounded border-gray-200 ${
                        !isReceiveMode && line.recommendedQty > 0 
                          ? 'border-2 border-blue-500 ring-1 ring-blue-200' 
                            : 'border'
                      }`}
                      value={line.qty}
                        onChange={(e) => handleQtyChange(line.id, e.target.value)}
                      />
                    </div>
                    <div className="px-4 py-2">
                      <input
                        type="number"
                        step="0.1"
                        value={line.pallets ? line.pallets.toFixed(1) : ''}
                      onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const unitsPerPallet = line.unitsPerPallet || 1;
                          const qty = val * unitsPerPallet;
                          handleQtyChange(line.id, qty);
                        }}
                        className="w-full text-sm px-2 py-1 text-right bg-white shadow-inner rounded border border-gray-200"
                      />
                    </div>
                    <div style={{ padding: '0.65rem 1rem', height: '40px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                        <div style={{ 
                          flex: 1, 
                          height: '20px', 
                          backgroundColor: '#E5E7EB', 
                          borderRadius: '4px',
                          overflow: 'hidden',
                          position: 'relative',
                          display: 'flex',
                        }}>
                          {(() => {
                            const maxInventory = line.maxInventory || 0;
                            const currentInventory = line.currentInventory || 0;
                            const orderQty = line.qty || 0;
                            
                            // If no max is set, show bars with relative proportions based on current + order
                            if (!maxInventory || maxInventory === 0) {
                              const total = currentInventory + orderQty;
                              if (total === 0) {
                                // Empty bar when no inventory or order
                                return null;
                              }
                              
                              const currentPct = total > 0 ? (currentInventory / total) * 100 : 0;
                              const orderPct = total > 0 ? (orderQty / total) * 100 : 0;
                              
                              return (
                                <>
                                  {/* Current inventory - Dark Green */}
                                  {currentPct > 0 && (
                                    <div style={{
                                      width: `${currentPct}%`,
                                      height: '100%',
                                      backgroundColor: '#059669',
                                      transition: 'width 0.3s',
                                    }} title={`Current: ${currentInventory.toLocaleString()}`}></div>
                                  )}
                                  {/* Order quantity - Yellow/Orange */}
                                  {orderPct > 0 && (
                                    <div style={{
                                      width: `${orderPct}%`,
                                      height: '100%',
                                      backgroundColor: '#F59E0B',
                                      transition: 'width 0.3s',
                                    }} title={`Order: ${orderQty.toLocaleString()}`}></div>
                                  )}
                                </>
                              );
                            }
                            
                            const currentPct = Math.round((currentInventory / maxInventory) * 100);
                            const orderPct = Math.round((orderQty / maxInventory) * 100);
                            const totalPct = currentPct + orderPct;
                            const remainingPct = Math.max(0, 100 - totalPct);
                            
                            return (
                              <>
                                {/* Current inventory - Dark Green */}
                                {currentPct > 0 && (
                                  <div style={{
                                    width: `${Math.min(100, currentPct)}%`,
                                    height: '100%',
                                    backgroundColor: '#059669',
                                    transition: 'width 0.3s',
                                  }} title={`Current: ${currentInventory.toLocaleString()} (${currentPct}%)`}></div>
                                )}
                                {/* Order quantity - Yellow/Orange */}
                                {orderPct > 0 && (
                                  <div style={{
                                    width: `${Math.min(100 - currentPct, orderPct)}%`,
                                    height: '100%',
                                    backgroundColor: totalPct > 100 ? '#EF4444' : '#F59E0B',
                                    transition: 'width 0.3s, background-color 0.3s',
                                  }} title={`Order: ${orderQty.toLocaleString()} (${orderPct}%)`}></div>
                                )}
                                {/* Remaining space - Blue */}
                                {remainingPct > 0 && totalPct <= 100 && (
                                  <div style={{
                                    width: `${remainingPct}%`,
                                    height: '100%',
                                    backgroundColor: '#3B82F6',
                                    transition: 'width 0.3s',
                                  }} title={`Available: ${(maxInventory - currentInventory - orderQty).toLocaleString()}`}></div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <span style={{ 
                          fontSize: '12px', 
                          fontWeight: 500, 
                          color: (inventoryPercentage || 0) > 100 ? '#EF4444' : themeClasses.textPrimary, 
                          minWidth: '40px' 
                        }}>
                          {(() => {
                            const maxInventory = line.maxInventory || 0;
                            return (!maxInventory || maxInventory === 0) ? '-' : `${inventoryPercentage || 0}%`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>
          )}
        </div>
        </div>

      {/* Footer - Sticky */}
      <div 
        className="fixed bottom-0 left-64 right-0 z-50"
        style={{ 
          backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6',
          borderTop: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
          padding: '16px 24px',
        }}
      >
        <div className="flex items-center justify-between gap-6">
          {/* Summary - Left side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: isDarkMode ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                PALLETS
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : '#1F2937' }}>
                {isReceiveMode 
                  ? orderLines.reduce((sum, line) => sum + (parseFloat(line.pallets) || 0), 0).toFixed(1)
                  : summary.totalPallets.toFixed(1)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: isDarkMode ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                TOTAL BOXES
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : '#1F2937' }}>
                {isReceiveMode 
                  ? orderLines.reduce((sum, line) => sum + (parseInt(line.qty) || 0), 0).toLocaleString()
                  : summary.totalQty.toLocaleString()}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 500, color: isDarkMode ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                UNITS
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: isDarkMode ? '#F9FAFB' : '#1F2937' }}>
                {isReceiveMode 
                  ? orderLines.reduce((sum, line) => sum + (parseInt(line.qty) || 0), 0).toLocaleString()
                  : summary.units.toLocaleString()}
              </div>
            </div>
          </div>
          
          {/* Action Buttons - Right side */}
          <div className="flex items-center gap-3">
              {/* Legend - only in create mode */}
              {!isReceiveMode && (
                <div style={{ 
                  backgroundColor: '#F3F4F6',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  gap: '16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: '#059669', 
                      borderRadius: '2px' 
                    }}></div>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>
                      Total Inv.
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      backgroundColor: '#3B82F6', 
                      borderRadius: '2px' 
                    }}></div>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>
                      # to Order
                    </span>
                  </div>
                </div>
              )}

              {/* Buttons - different for create vs receive mode */}
              {isReceiveMode ? (
                <>
                  {/* Export button */}
                  <button
                    type="button"
                    onClick={handleExportCSV}
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
                  
                  {/* Edit Order button */}
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-xs font-semibold rounded-lg px-4 py-2 transition-colors"
                    style={{
                      backgroundColor: '#374151',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#1F2937';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#374151';
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Order
                  </button>
                  
                  {/* Receive Order button */}
                  <button
                    type="button"
                    onClick={() => {
                      const selectedLines = orderLines.filter(l => l.selected);
                      if (selectedLines.length === 0) {
                        alert('Please select at least one item to receive');
                        return;
                      }
                      // Check if all items are selected
                      const allSelected = orderLines.length === selectedLines.length;
                      if (!allSelected) {
                        // Show partial order confirmation modal
                        setIsReceiveConfirmOpen(true);
                      } else {
                        // All items selected, proceed directly
                        handleReceiveComplete(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 text-xs font-semibold rounded-lg px-4 py-2 transition-colors"
                    style={{
                      backgroundColor: '#007AFF',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0051D5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#007AFF';
                    }}
                  >
                    Receive Order
                  </button>
                </>
              ) : (
                <>
                  {/* Export button */}
                  <button
                    type="button"
                    onClick={handleExportCSV}
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
                  
                  {/* Complete Order button */}
                  <button
                    type="button"
                    onClick={handleCompleteOrder}
                    className="inline-flex items-center gap-2 text-xs font-semibold rounded-lg px-4 py-2 transition-colors"
                    style={{
                      backgroundColor: '#007AFF',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#0051D5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#007AFF';
                    }}
                  >
                    Complete Order
                  </button>
                </>
              )}
                  </div>
                    </div>
                  </div>
                  </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowExportModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md px-6 py-6" onClick={(e) => e.stopPropagation()}>
            {/* Header with title and close button */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900" style={{ color: '#374151' }}>Export Closure Order</h2>
                    <button
                      type="button"
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                    </button>
                  </div>

            {/* File display area */}
            <div className="mb-6" style={{
              border: '1px solid #3B82F6',
              borderRadius: '8px',
              backgroundColor: '#E0F2FE',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <svg className="w-6 h-6" fill="#3B82F6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="#3B82F6"/>
                <path d="M14 2v6h6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm font-medium" style={{ color: '#3B82F6' }}>
                {getExportFileName()}
              </span>
                </div>

            {/* Information message */}
            <div className="flex items-start gap-3 mb-6">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" fill="#3B82F6"/>
                  <text x="12" y="17" textAnchor="middle" fill="white" fontSize="14" fontWeight="600" fontFamily="Arial, sans-serif">i</text>
                </svg>
              </div>
              <p className="text-sm text-gray-700" style={{ color: '#374151' }}>
                After submitting to your supplier, click Complete Order to finalize.
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                onClick={() => {
                  handleExportCSV();
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{
                  backgroundColor: '#3B82F6',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                Export as CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  handleDone();
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{
                  backgroundColor: '#3B82F6',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }}
              >
                Done
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Add Closure Modal */}
      {showAddClosureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Closure to Order</h2>
            </div>
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-2">
                {availableClosures.map((closure) => {
                  const alreadyAdded = orderLines.some(l => l.name === closure.name);
                  return (
                    <button
                      key={closure.id}
                      type="button"
                      className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                        alreadyAdded 
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                      }`}
                      onClick={() => !alreadyAdded && handleAddClosure(closure)}
                      disabled={alreadyAdded}
                    >
                      <div className="font-semibold text-sm">{closure.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {closure.unitsPerPallet} units/pallet • {closure.supplier}
                        {alreadyAdded && ' • Already added'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                onClick={() => setShowAddClosureModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isReceiveMode && isReceiveConfirmOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md px-8 py-6 text-center">
            {/* Orange Warning Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Partial Order Confirmation</h2>
            
            <div className="text-sm text-gray-700 mb-6 space-y-2">
              <p>
                You've selected {orderLines.filter(l => l.selected).length} of {orderLines.length} items to receive.
              </p>
              <p>
                The remaining items will not be updated within your inventory.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={() => setIsReceiveConfirmOpen(false)}
              >
                Go Back
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => {
                  setIsReceiveConfirmOpen(false);
                  handleReceiveComplete(true);
                }}
              >
                Confirm & Receive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClosureOrderPage;
