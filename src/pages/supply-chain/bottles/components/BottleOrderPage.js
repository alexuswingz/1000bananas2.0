import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { calculatePallets } from '../../../../utils/palletCalculations';
import { bottlesApi, transformInventoryData } from '../../../../services/supplyChainApi';

const BottleOrderPage = () => {
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

  // Get lines from state or default (will be replaced by API data)
  const allLines = state.lines || [];

  // Navigation tab state
  const [activeTab, setActiveTab] = useState(() => {
    // Automatically set to receivePO when viewing an order
    return (mode === 'view' || mode === 'receive') ? 'receivePO' : 'addProducts';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [bottleInventoryData, setBottleInventoryData] = useState({});
  
  // Initialize order lines - items in view mode are already "added", new orders start with all items not added
  const [orderLines, setOrderLines] = useState(() => {
    return allLines.map((line) => ({
      ...line,
      added: isViewMode, // In view mode, all passed lines are part of the order
    }));
  });
  
  // Fetch bottle inventory data for calculations
  useEffect(() => {
    const fetchBottleData = async () => {
      try {
        const response = await bottlesApi.getInventory();
        if (response.success) {
          // Create a map with BOTH full names and short names as keys
          const dataMap = {};
          const bottlesList = [];
          
          response.data.forEach((bottle, index) => {
            const bottleData = {
              fullName: bottle.bottle_name,
              unitsPerPallet: bottle.units_per_pallet || 1,
              maxWarehouseInventory: bottle.max_warehouse_inventory,
              warehouseQuantity: bottle.warehouse_quantity || 0,
              supplierQuantity: bottle.supplier_quantity || 0,
              supplier: bottle.supplier || '',
            };
            
            // Store by full name
            dataMap[bottle.bottle_name] = bottleData;
            
            // Extract short name (first part before space, or full name if no space)
            const shortName = bottle.bottle_name.split(' ')[0] || bottle.bottle_name;
            
            // Store by short name too
            dataMap[shortName] = bottleData;
            
            // Always create bottle line items for ALL bottles
            bottlesList.push({
              id: index + 1,
              name: shortName,
              fullName: bottle.bottle_name,
              supplierInventory: bottle.supplier_quantity ? bottle.supplier_quantity.toLocaleString() : 'N/A',
              supplier: bottle.supplier || '',
              qty: 0,
              pallets: 0,
              added: false,
              inventoryPercentage: 0,
              maxWarehouseInventory: bottle.max_warehouse_inventory,
              warehouseQuantity: bottle.warehouse_quantity || 0,
              unitsPerPallet: bottle.units_per_pallet || 1,
            });
          });
          
          setBottleInventoryData(dataMap);
          
          // Set order lines for create mode
          if (isCreateMode) {
            setOrderLines(bottlesList.map(line => ({
              ...line,
              added: false, // Start with nothing added
            })));
          }
        }
      } catch (err) {
        console.error('Error fetching bottle inventory:', err);
      }
    };
    
    if (isCreateMode) {
      fetchBottleData();
    }
  }, [isCreateMode, isViewMode]);
  
  // Ensure tab is set to receivePO when viewing an order
  useEffect(() => {
    if (isViewMode) {
      setActiveTab('receivePO');
    }
  }, [isViewMode]);

  // Fetch actual order details when viewing an order
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (isViewMode && orderId) {
        try {
          const response = await bottlesApi.getOrder(orderId);
          console.log('Fetched order response:', response);
          if (response.success && response.data) {
            const order = response.data;
            console.log('Order data:', order);
            console.log('Order lines:', order.lines);
            
            // Get all bottles inventory for reference
            const inventoryResponse = await bottlesApi.getInventory();
            const bottleInventoryData = {};
            
            if (inventoryResponse.success) {
              inventoryResponse.data.forEach((bottle) => {
                const fullName = bottle.bottle_name;
                const shortName = fullName.split(' ')[0]; // e.g., "8oz"
                
                const bottleData = {
                  fullName: fullName,
                  unitsPerPallet: bottle.units_per_pallet || 1,
                  maxWarehouseInventory: bottle.max_warehouse_inventory,
                  warehouseQuantity: bottle.warehouse_quantity || 0,
                  supplierQuantity: bottle.supplier_quantity || 0,
                  supplier: bottle.supplier || '',
                };
                
                // Store with both full name and short name as keys
                bottleInventoryData[fullName] = bottleData;
                bottleInventoryData[shortName] = bottleData;
              });
            }
            
            // Transform order lines to match the expected format
            const orderLinesFormatted = (order.lines || []).map(item => {
              const bottleName = item.bottle_name;
              const bottleInfo = bottleInventoryData[bottleName] || {};
              
              return {
                id: item.id,
                name: bottleInfo.fullName || bottleName,
                supplierInventory: bottleInfo.supplierQuantity || 0,
                qty: item.quantity_ordered || 0,
                pallets: calculatePallets(item.quantity_ordered || 0, bottleInfo.unitsPerPallet || 1),
                added: true, // Mark as added since it's from the order
                maxWarehouseInventory: bottleInfo.maxWarehouseInventory,
                warehouseQuantity: bottleInfo.warehouseQuantity || 0,
                unitsPerPallet: bottleInfo.unitsPerPallet || 1,
              };
            });
            
            console.log('Order lines formatted:', orderLinesFormatted);
            setOrderLines(orderLinesFormatted);
          }
        } catch (error) {
          console.error('Error fetching order details:', error);
          alert('Failed to load order details. Please try again.');
        }
      }
    };
    
    fetchOrderDetails();
  }, [isViewMode, orderId]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showReceiveConfirmModal, setShowReceiveConfirmModal] = useState(false);
  const [showPartialOrderModal, setShowPartialOrderModal] = useState(false);
  const [showAddBottleModal, setShowAddBottleModal] = useState(false);
  
  // Checkbox selection state for partial orders
  const [selectedItems, setSelectedItems] = useState(new Set());
  
  // Edit mode state for individual rows
  const [editingLineId, setEditingLineId] = useState(null);
  const [originalValues, setOriginalValues] = useState({});
  const [editedValues, setEditedValues] = useState({});
  const [ellipsisMenuId, setEllipsisMenuId] = useState(null);
  const ellipsisMenuRefs = useRef({});
  const ellipsisButtonRefs = useRef({});
  const [ellipsisMenuPosition, setEllipsisMenuPosition] = useState({ top: 0, left: 0 });

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  // Filter lines based on search query and active tab
  const filteredLines = useMemo(() => {
    let linesToFilter = orderLines;
    
    // In receivePO tab when viewing, show only added items
    if (isViewMode && activeTab === 'receivePO') {
      linesToFilter = orderLines.filter((line) => line.added);
    }
    
    if (!searchQuery.trim()) return linesToFilter;
    const query = searchQuery.toLowerCase();
    return linesToFilter.filter((line) => 
      line.name.toLowerCase().includes(query) ||
      line.supplierInventory.toLowerCase().includes(query)
    );
  }, [orderLines, searchQuery, isViewMode, activeTab]);

  // Get added lines
  const addedLines = useMemo(() => {
    return orderLines.filter((line) => line.added);
  }, [orderLines]);

  // Calculate summary
  const summary = useMemo(() => {
    const linesToUse = activeTab === 'receivePO' && isViewMode ? orderLines : addedLines;
    const totalQty = linesToUse.reduce((sum, line) => sum + (line.qty || 0), 0);
    const totalPallets = linesToUse.reduce((sum, line) => sum + (line.pallets || 0), 0);
    const units = totalQty; // Units is the same as total qty
    
    return {
      totalQty,
      totalPallets,
      units,
    };
  }, [addedLines, orderLines, activeTab, isViewMode]);

  const handleBack = () => {
    navigate('/dashboard/supply-chain/bottles');
  };

  const handleAddProduct = (lineId) => {
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.id === lineId) {
          const isAdding = !line.added;
          
          // Get bottle data for calculations
          const bottleData = bottleInventoryData[line.name] || {};
          const unitsPerPallet = bottleData.unitsPerPallet || line.unitsPerPallet || 1;
          const maxInventory = bottleData.maxWarehouseInventory || line.maxWarehouseInventory || 0;
          const currentInventory = bottleData.warehouseQuantity || line.warehouseQuantity || 0;
          
          if (isAdding) {
            // When adding, set a default quantity if needed
            const defaultQty = line.qty > 0 ? line.qty : unitsPerPallet;
            const pallets = calculatePallets(defaultQty, unitsPerPallet);
            const inventoryPercentage = maxInventory > 0 
              ? Math.round(((currentInventory + defaultQty) / maxInventory) * 100)
              : 0;
            
            return { 
              ...line, 
              added: true, 
              qty: defaultQty,
              pallets: parseFloat(pallets.toFixed(2)), 
              inventoryPercentage,
              maxWarehouseInventory: maxInventory,
              warehouseQuantity: currentInventory,
              unitsPerPallet: unitsPerPallet,
            };
          } else {
            // When removing
            return { ...line, added: false, qty: 0, pallets: 0, inventoryPercentage: 0 };
          }
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
          const bottleData = bottleInventoryData[line.name] || {};
          const unitsPerPallet = bottleData.unitsPerPallet || 1;
          const maxInventory = bottleData.maxWarehouseInventory || 0;
          const currentInventory = bottleData.warehouseQuantity || 0;
          
          // Calculate max allowed quantity to order
          const maxAllowedQty = maxInventory > 0 ? Math.max(0, maxInventory - currentInventory) : Infinity;
          
          // Limit quantity to max allowed
          if (maxInventory > 0 && qty > maxAllowedQty) {
            alert(`Cannot exceed max warehouse capacity!\n\nCurrent Inventory: ${currentInventory.toLocaleString()} units\nMax Capacity: ${maxInventory.toLocaleString()} units\nAvailable Space: ${maxAllowedQty.toLocaleString()} units\n\nQuantity has been limited to ${maxAllowedQty.toLocaleString()} units.`);
            qty = maxAllowedQty;
          }
          
          // Auto-calculate pallets using utility function
          const pallets = calculatePallets(qty, unitsPerPallet);
          
          // Calculate inventory percentage: (current + qty) / max * 100
          // This shows what % of warehouse will be filled after this order
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

  const handlePalletsChange = (lineId, value) => {
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, pallets: Number(value) || 0 } : line
      )
    );
  };

  // Handle edit mode for individual rows
  const handleStartEdit = (lineId) => {
    const line = orderLines.find(l => l.id === lineId);
    if (line) {
      setEditingLineId(lineId);
      setOriginalValues({
        qty: line.qty || 0,
        pallets: line.pallets || 0,
      });
      setEditedValues({
        qty: line.qty || 0,
        pallets: line.pallets || 0,
      });
      setEllipsisMenuId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingLineId(null);
    setOriginalValues({});
    setEditedValues({});
  };

  const handleDoneEdit = (lineId) => {
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
              ...line,
              qty: editedValues.qty || 0,
              pallets: editedValues.pallets || 0,
            }
          : line
      )
    );
    setEditingLineId(null);
    setOriginalValues({});
    setEditedValues({});
  };

  const handleEditQtyChange = (lineId, delta) => {
    setEditedValues((prev) => ({
      ...prev,
      qty: Math.max(0, (prev.qty || 0) + delta),
    }));
  };

  const handleEditPalletsChange = (lineId, delta) => {
    setEditedValues((prev) => ({
      ...prev,
      pallets: Math.max(0, (prev.pallets || 0) + delta),
    }));
  };

  // Handle ellipsis menu positioning
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ellipsisMenuId) {
        const menuElement = ellipsisMenuRefs.current[ellipsisMenuId];
        const buttonElement = event.target.closest('[data-ellipsis-button]');
        
        if (menuElement && !menuElement.contains(event.target) && buttonElement?.dataset.ellipsisButton !== ellipsisMenuId) {
          setEllipsisMenuId(null);
        }
      }
    };

    if (ellipsisMenuId) {
      const buttonElement = ellipsisButtonRefs.current[ellipsisMenuId];
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        setEllipsisMenuPosition({
          top: rect.bottom + 4,
          left: rect.left,
        });
      }
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ellipsisMenuId]);

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

  // Handle receive button click - check if partial order
  const handleReceiveClick = () => {
    if (!isViewMode || !orderId) return;
    
    const totalItems = orderLines.length;
    const selectedCount = selectedItems.size;
    
    // If all items selected, show confirmation modal
    if (selectedCount === totalItems && totalItems > 0) {
      setShowReceiveConfirmModal(true);
      return;
    }
    
    // If some items selected, show partial order modal
    if (selectedCount > 0 && selectedCount < totalItems) {
      setShowPartialOrderModal(true);
      return;
    }
    
    // If no items selected, do nothing
  };

  // Handle confirm partial order
  const handleConfirmPartialOrder = () => {
    setShowPartialOrderModal(false);
    navigate('/dashboard/supply-chain/bottles', {
      state: {
        receivedOrderId: orderId,
        receivedOrderNumber: orderNumber,
        isPartial: true,
      },
      replace: false,
    });
  };

  const handleCompleteOrder = async () => {
    if (isViewMode && orderId && activeTab === 'receivePO') {
      // Receive the order - update each line item
      try {
        const today = new Date().toISOString().split('T')[0];
        const selectedLines = orderLines.filter(line => line.added && selectedItems.has(line.id));
        
        // If no items selected, select all
        const linesToReceive = selectedLines.length > 0 ? selectedLines : orderLines.filter(line => line.added);
        
        if (linesToReceive.length === 0) {
          alert('No items to receive');
          return;
        }
        
        // Update each line item to mark as received
        for (const line of linesToReceive) {
          const updateData = {
            quantity_received: line.qty,
            bottle_name: line.name,
            status: 'received',
            actual_delivery_date: today,
          };
          
          await bottlesApi.updateOrder(line.id, updateData);
        }
        
        // Navigate back with success message
        navigate('/dashboard/supply-chain/bottles', {
          state: {
            receivedOrderId: orderId,
            receivedOrderNumber: orderNumber,
          },
          replace: false,
        });
        return;
      } catch (error) {
        console.error('Error receiving order:', error);
        alert('Failed to receive order: ' + error.message);
        return;
      }
    }
    
    if (addedLines.length === 0) {
      return;
    }
    
    // Validate: Check if any items exceed max warehouse capacity
    const overCapacityItems = addedLines.filter(line => {
      const bottleData = bottleInventoryData[line.name] || {};
      const maxInventory = bottleData.maxWarehouseInventory || 0;
      const currentInventory = bottleData.warehouseQuantity || 0;
      const inventoryPercentage = maxInventory > 0 
        ? Math.round(((currentInventory + (line.qty || 0)) / maxInventory) * 100)
        : 0;
      return inventoryPercentage > 100;
    });
    
    if (overCapacityItems.length > 0) {
      const itemNames = overCapacityItems.map(item => {
        const bottleData = bottleInventoryData[item.name] || {};
        const maxInventory = bottleData.maxWarehouseInventory || 0;
        const currentInventory = bottleData.warehouseQuantity || 0;
        const percentage = maxInventory > 0 
          ? Math.round(((currentInventory + (item.qty || 0)) / maxInventory) * 100)
          : 0;
        return `• ${item.name}: ${percentage}% (exceeds 100%)`;
      }).join('\n');
      
      alert(`Cannot submit order!\n\nThe following items exceed max warehouse capacity:\n\n${itemNames}\n\nPlease reduce quantities before submitting.`);
      return;
    }
    
    // Validate: Check if any items have 0 quantity
    const zeroQtyItems = addedLines.filter(line => !line.qty || line.qty === 0);
    if (zeroQtyItems.length > 0) {
      alert('Cannot submit order with 0 quantity items!\n\nPlease remove items with 0 quantity or enter a valid quantity.');
      return;
    }
    
    // Create order via API - batch creation for all bottles
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Prepare batch order data with all bottles
      const batchOrderData = {
        order_number: orderNumber,
        supplier: supplier.name,
        order_date: today,
        expected_delivery_date: null,
        bottles: addedLines.map(line => ({
          bottle_name: line.fullName || line.name, // Use full name for database
          quantity_ordered: line.qty || 0,
          cost_per_unit: null,
          total_cost: null,
          status: 'pending',
          notes: `${line.qty} units (${line.pallets} pallets)`,
        })),
      };
      
      const response = await bottlesApi.createOrder(batchOrderData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create order');
      }
      
      // Navigate back with success message
      navigate('/dashboard/supply-chain/bottles', {
        state: {
          orderCreated: true,
          orderNumber: orderNumber,
          bottleCount: addedLines.length,
        },
        replace: false,
      });
    } catch (err) {
      console.error('Error creating order:', err);
      alert(`Failed to create order: ${err.message}\n\nPlease try again.`);
    }
  };

  const handleExportCSV = () => {
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    // Format filename as TPS_BottleOrder_YYYY-MM-DD.csv
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `TPS_BottleOrder_${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getExportFileName = () => {
    const today = new Date().toISOString().split('T')[0];
    return `TPS_BottleOrder_${today}.csv`;
  };

  const generateCSV = () => {
    const headers = ['Packaging Name', 'Supplier Inventory', 'Qty', 'Pallets'];
    const rows = addedLines.map(line => [
      line.name,
      line.supplierInventory,
      line.qty || 0,
      line.pallets || 0,
    ]);
    
    return [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  };

  const handleDone = () => {
    setShowExportModal(false);
    
    if (isCreateMode) {
      navigate('/dashboard/supply-chain/bottles', {
        state: {
          newBottleOrder: {
            orderNumber: orderNumber,
            supplierName: supplier.name,
            lines: addedLines,
          },
        },
        replace: false,
      });
    }
  };

  if (!supplier || !orderNumber) {
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
                  BOTTLE ORDER #
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

        </div>

        {/* Tabs */}
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

          {/* Legend - only show when not in view mode */}
          {!isViewMode && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px', marginRight: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#22C55E', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>Inventory</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#3B82F6', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}># to Order</span>
            </div>
            
            {/* Add bottle button */}
            {!isReceiveMode && (
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
                <button
                  type="button"
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  onClick={() => setShowAddBottleModal(true)}
                >
                  <span className="text-lg">+</span> Add Bottle
                </button>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* Search bar - above table */}
      <div className="px-6 py-4 flex justify-end" style={{ marginTop: '0' }}>
        <div className="relative" style={{ maxWidth: '300px', width: '100%' }}>
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
      {(
        <div className={`${themeClasses.cardBg} border ${themeClasses.border} shadow-lg mx-6`} style={{ marginTop: '0', borderRadius: '8px', overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead className={themeClasses.headerBg} style={{ borderRadius: '8px 8px 0 0' }}>
                <tr style={{ height: '40px', maxHeight: '40px' }}>
                  {/* Checkbox column - show when viewing an order in receivePO tab */}
                  {isViewMode && activeTab === 'receivePO' && (
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', height: '40px', textAlign: 'center', borderRight: '1px solid #3C4656', width: 50 }}>
                    <input 
                      type="checkbox" 
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      checked={selectedItems.size === orderLines.length && orderLines.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  )}
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                    width: '142px',
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '16px',
                    paddingBottom: '12px',
                    paddingLeft: '16px',
                    textAlign: 'left',
                    borderRight: '1px solid #3C4656',
                    gap: '10px',
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
                    width: '142px',
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '16px',
                    paddingBottom: '12px',
                    paddingLeft: '16px',
                    textAlign: 'center',
                    borderRight: '1px solid #3C4656',
                    gap: '10px',
                  }}>
                    QTY
                  </th>
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                    width: '142px',
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '16px',
                    paddingBottom: '12px',
                    paddingLeft: '16px',
                    textAlign: 'center',
                    borderRight: (isViewMode && activeTab === 'receivePO') ? '1px solid #3C4656' : '1px solid #3C4656',
                    gap: '10px',
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
                {filteredLines.length === 0 ? (
                  <tr>
                    <td colSpan={(isViewMode && activeTab === 'receivePO') ? 4 : ((activeTab === 'addProducts' && !isViewMode) ? 6 : 4)} className="px-6 py-6 text-center text-sm italic text-gray-400">
                      No items available.
                    </td>
                  </tr>
                ) : (
                  filteredLines.map((line, index) => (
                    <tr 
                      key={line.id}
                      className={`text-sm ${themeClasses.rowHover} transition-colors border-t`}
                      style={{
                        height: '40px',
                        maxHeight: '40px',
                        minHeight: '40px',
                        borderTop: index === 0 ? 'none' : (isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid #e5e7eb'),
                      }}
                    >
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
                        width: '300px',
                        height: '40px',
                        paddingTop: '12px',
                        paddingRight: '16px',
                        paddingBottom: '12px',
                        paddingLeft: '16px',
                        fontSize: '0.85rem',
                        verticalAlign: 'middle',
                        gap: '10px',
                      }} className={themeClasses.textPrimary}>
                        {line.fullName || line.name}
                      </td>
                      {/* SUPPLIER INV - only show in addProducts tab when creating new order (not viewing) */}
                      {(activeTab === 'addProducts' && !isViewMode) && (
                      <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', height: '40px', verticalAlign: 'middle' }} className={themeClasses.textPrimary}>
                        {line.supplierInventory}
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
                      </td>
                      )}
                      <td style={{ 
                        width: '142px',
                        height: '40px',
                        paddingTop: '12px',
                        paddingRight: '16px',
                        paddingBottom: '12px',
                        paddingLeft: '16px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        gap: '10px',
                      }}>
                        {editingLineId === line.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F3F4F6', borderRadius: '8px', padding: '2px' }}>
                              <button
                                type="button"
                                onClick={() => handleEditQtyChange(line.id, -1)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  color: '#6B7280',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M5 12h14"/>
                                </svg>
                              </button>
                              <input
                                type="number"
                                value={editedValues.qty || 0}
                                onChange={(e) => setEditedValues(prev => ({ ...prev, qty: Number(e.target.value) || 0 }))}
                                style={{
                                  width: '80px',
                                  padding: '4px 8px',
                                  fontSize: '14px',
                                  textAlign: 'center',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  color: '#000000',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleEditQtyChange(line.id, 1)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  color: '#6B7280',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 5v14M5 12h14"/>
                                </svg>
                              </button>
                            </div>
                            {((editedValues.qty || 0) !== (originalValues.qty || 0)) && (
                              <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: 500 }}>
                                {((editedValues.qty || 0) - (originalValues.qty || 0)) > 0 ? '+' : ''}{((editedValues.qty || 0) - (originalValues.qty || 0)).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <input
                            type="number"
                            value={line.qty || ''}
                            onChange={(e) => handleQtyChange(line.id, e.target.value)}
                            readOnly={isViewMode && activeTab === 'receivePO'}
                            style={{
                              width: '100%',
                              maxWidth: '120px',
                              padding: '4px 8px',
                              fontSize: '14px',
                              textAlign: 'center',
                              border: '1px solid #D1D5DB',
                              borderRadius: '8px',
                              backgroundColor: '#F3F4F6',
                              color: '#000000',
                              cursor: 'text',
                            }}
                          />
                        )}
                      </td>
                      <td style={{ 
                        width: '142px',
                        height: '40px',
                        paddingTop: '12px',
                        paddingRight: '16px',
                        paddingBottom: '12px',
                        paddingLeft: '16px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        gap: '10px',
                      }}>
                        {editingLineId === line.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F3F4F6', borderRadius: '8px', padding: '2px' }}>
                              <button
                                type="button"
                                onClick={() => handleEditPalletsChange(line.id, -0.1)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  color: '#6B7280',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M5 12h14"/>
                                </svg>
                              </button>
                              <input
                                type="number"
                                step="0.1"
                                value={editedValues.pallets || 0}
                                onChange={(e) => setEditedValues(prev => ({ ...prev, pallets: Number(e.target.value) || 0 }))}
                                style={{
                                  width: '80px',
                                  padding: '4px 8px',
                                  fontSize: '14px',
                                  textAlign: 'center',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  color: '#000000',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleEditPalletsChange(line.id, 0.1)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  color: '#6B7280',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#E5E7EB';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M12 5v14M5 12h14"/>
                                </svg>
                              </button>
                            </div>
                            {(editedValues.pallets || 0) !== (originalValues.pallets || 0) && (
                              <span style={{ fontSize: '12px', color: '#EF4444', fontWeight: 500 }}>
                                {((editedValues.pallets || 0) - (originalValues.pallets || 0)) > 0 ? '+' : ''}{((editedValues.pallets || 0) - (originalValues.pallets || 0)).toFixed(1)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              maxWidth: '120px',
                              padding: '4px 8px',
                              fontSize: '14px',
                              textAlign: 'center',
                              border: '1px solid #D1D5DB',
                              borderRadius: '8px',
                              backgroundColor: (line.added || (isViewMode && activeTab === 'receivePO')) ? '#E5E7EB' : '#F3F4F6',
                              color: (line.added || (isViewMode && activeTab === 'receivePO')) ? '#000000' : '#9CA3AF',
                              cursor: 'default',
                            }}
                            title="Auto-calculated from quantity"
                          >
                            {(line.pallets || 0).toFixed(2)}
                          </div>
                        )}
                      </td>
                      {/* INVENTORY PERCENTAGE - only show in addProducts tab when creating new order (not viewing) */}
                      {(activeTab === 'addProducts' && !isViewMode) && (
                      <td style={{ padding: '0.65rem 1rem', height: '40px', verticalAlign: 'middle' }}>
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
                              const bottleData = bottleInventoryData[line.name] || {};
                              const maxInventory = bottleData.maxWarehouseInventory;
                              const currentInventory = bottleData.warehouseQuantity || 0;
                              const orderQty = line.qty || 0;
                              
                              // If no max is set, show unlimited/unrestricted indicator
                              if (!maxInventory || maxInventory === 0) {
                                return (
                                  <div style={{ 
                                    width: '100%', 
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px', 
                                    color: '#9CA3AF',
                                    fontStyle: 'italic'
                                  }}>
                                    Unlimited
                                  </div>
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
                            color: (line.inventoryPercentage || 0) > 100 ? '#EF4444' : themeClasses.textPrimary, 
                            minWidth: '40px' 
                          }}>
                            {(() => {
                              const bottleData = bottleInventoryData[line.name] || {};
                              const maxInventory = bottleData.maxWarehouseInventory;
                              return (!maxInventory || maxInventory === 0) ? '-' : `${line.inventoryPercentage || 0}%`;
                            })()}
                          </span>
                        </div>
                      </td>
                      )}
                      {/* Ellipsis column - show when viewing an order in receivePO tab */}
                      {isViewMode && activeTab === 'receivePO' && (
                      <td style={{ padding: '0.65rem 1rem', textAlign: 'center', height: '40px', verticalAlign: 'middle', position: 'relative' }}>
                        {editingLineId === line.id ? (
                          <button
                            type="button"
                            onClick={() => handleDoneEdit(line.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              backgroundColor: '#3B82F6',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
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
                            Done
                          </button>
                        ) : (
                          <>
                            <button
                              ref={(el) => {
                                if (el) ellipsisButtonRefs.current[line.id] = el;
                              }}
                              type="button"
                              data-ellipsis-button={line.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEllipsisMenuId(ellipsisMenuId === line.id ? null : line.id);
                                const rect = e.currentTarget.getBoundingClientRect();
                                setEllipsisMenuPosition({
                                  top: rect.bottom + 4,
                                  left: rect.left,
                                });
                              }}
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
                            {ellipsisMenuId === line.id && (
                              <div
                                ref={(el) => {
                                  if (el) ellipsisMenuRefs.current[line.id] = el;
                                }}
                                style={{
                                  position: 'fixed',
                                  top: ellipsisMenuPosition.top,
                                  left: ellipsisMenuPosition.left,
                                  backgroundColor: '#FFFFFF',
                                  border: '1px solid #E5E7EB',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                  zIndex: 1000,
                                  minWidth: '120px',
                                  padding: '4px',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(line.id)}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: '#374151',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                  <span>Edit</span>
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                  PALLETS
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
            
            {/* Receive Order button */}
            <button
              type="button"
              onClick={isViewMode && activeTab === 'receivePO' ? handleReceiveClick : handleCompleteOrder}
              disabled={!isViewMode && addedLines.length === 0}
              className="inline-flex items-center gap-2 text-xs font-semibold rounded-lg px-4 py-2 transition-colors"
              style={{
                backgroundColor: (isViewMode || addedLines.length > 0) ? '#007AFF' : (isDarkMode ? '#374151' : '#D1D5DB'),
                color: '#FFFFFF',
                cursor: (isViewMode || addedLines.length > 0) ? 'pointer' : 'not-allowed',
                opacity: (isViewMode || addedLines.length > 0) ? 1 : 0.6,
              }}
              onMouseEnter={(e) => {
                if (isViewMode || addedLines.length > 0) {
                  e.currentTarget.style.backgroundColor = '#0056CC';
                }
              }}
              onMouseLeave={(e) => {
                if (isViewMode || addedLines.length > 0) {
                  e.currentTarget.style.backgroundColor = '#007AFF';
                } else {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#D1D5DB';
                }
              }}
            >
              {activeTab === 'receivePO' ? 'Receive Order' : 'Complete Order'}
            </button>
          </div>
        </div>
        </div>

      {/* Receive Confirmation Modal */}
      {showReceiveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowReceiveConfirmModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md px-6 py-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ color: '#374151' }}>Receive Bottle Order</h2>
            <p className="text-sm text-gray-700 mb-6" style={{ color: '#374151' }}>
              You're about to confirm this bottle order. Continue?
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowReceiveConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReceiveConfirmModal(false);
                  handleCompleteOrder();
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
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Order Confirmation Modal */}
      {showPartialOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPartialOrderModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md px-6 py-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center mb-4">
              <div className="mb-4">
                <img src="/assets/risk.png" alt="Warning" className="w-12 h-12" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ color: '#374151' }}>Partial Order Confirmation</h2>
            </div>
            <p className="text-sm text-gray-700 mb-2" style={{ color: '#374151', textAlign: 'center' }}>
              You've selected {selectedItems.size} of {orderLines.length} items to receive.
            </p>
            <p className="text-sm text-gray-700 mb-6" style={{ color: '#374151', textAlign: 'center' }}>
              The remaining items will not be updated within your inventory.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPartialOrderModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmPartialOrder}
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
                Confirm & Recieve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partial Order Confirmation Modal */}
      {showPartialOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPartialOrderModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md px-6 py-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center mb-4">
              <div className="mb-4">
                <img src="/assets/risk.png" alt="Warning" className="w-12 h-12" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ color: '#374151' }}>Partial Order Confirmation</h2>
            </div>
            <p className="text-sm text-gray-700 mb-2" style={{ color: '#374151', textAlign: 'center' }}>
              You've selected {selectedItems.size} of {orderLines.length} items to receive.
            </p>
            <p className="text-sm text-gray-700 mb-6" style={{ color: '#374151', textAlign: 'center' }}>
              The remaining items will not be updated within your inventory.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPartialOrderModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmPartialOrder}
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
                Confirm & Recieve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowExportModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md px-6 py-6" onClick={(e) => e.stopPropagation()}>
            {/* Header with title and close button */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900" style={{ color: '#374151' }}>Export Bottle Order</h2>
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

      {/* Add Bottle Modal */}
      {showAddBottleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAddBottleModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Bottles to Order</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowAddBottleModal(false)}
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search box */}
            <div className="px-6 pt-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search bottles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Modal body - scrollable list of bottles */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-2">
                {orderLines
                  .filter(line => {
                    if (!searchQuery.trim()) return true;
                    const query = searchQuery.toLowerCase();
                    return line.fullName?.toLowerCase().includes(query) || 
                           line.name?.toLowerCase().includes(query);
                  })
                  .map((line) => {
                    const isAlreadyAdded = line.added;
                    return (
                  <div 
                    key={line.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition ${
                      isAlreadyAdded 
                        ? 'border-gray-200 bg-gray-50 opacity-60' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900">{line.fullName || line.name}</h3>
                        {isAlreadyAdded && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Added
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {(() => {
                          const bottleData = bottleInventoryData[line.name] || {};
                          const currentInv = bottleData.warehouseQuantity || 0;
                          const maxInv = bottleData.maxWarehouseInventory || 0;
                          const supplier = bottleData.supplier || line.supplier || 'N/A';
                          return `Current: ${currentInv.toLocaleString()} | Max: ${maxInv > 0 ? maxInv.toLocaleString() : 'Unlimited'} | Supplier: ${supplier}`;
                        })()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAlreadyAdded) {
                          handleAddProduct(line.id);
                        }
                      }}
                      disabled={isAlreadyAdded}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                        isAlreadyAdded
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                      }`}
                    >
                      {isAlreadyAdded ? 'Already Added' : '+ Add Row'}
                    </button>
                  </div>
                  );
                })}
                {orderLines.filter(line => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return line.fullName?.toLowerCase().includes(query) || 
                         line.name?.toLowerCase().includes(query);
                }).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery ? 'No bottles match your search.' : 'No bottles available.'}
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowAddBottleModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BottleOrderPage;
