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
  const [tableMode, setTableMode] = useState(false);
  const [bottleInventoryData, setBottleInventoryData] = useState({});
  const [bottleForecastRequirements, setBottleForecastRequirements] = useState({});
  const [doiGoal, setDoiGoal] = useState(120); // Days of Inventory goal for forecasting
  const [safetyBuffer, setSafetyBuffer] = useState(85); // Safety buffer percentage (85% = leave 15% free space)
  const [showDoiDropdown, setShowDoiDropdown] = useState(false);
  const [showSafetyDropdown, setShowSafetyDropdown] = useState(false);
  
  // Initialize order lines - items in view mode are already "added", new orders start with all items not added
  const [orderLines, setOrderLines] = useState(() => {
    return allLines.map((line) => ({
      ...line,
      added: isViewMode, // In view mode, all passed lines are part of the order
    }));
  });
  
  // Fetch bottle inventory data and forecast requirements for calculations
  useEffect(() => {
    const fetchBottleData = async () => {
      try {
        // Fetch inventory data
        const inventoryResponse = await bottlesApi.getInventory();
        
        // Fetch forecast requirements using selected DOI goal and safety buffer
        const forecastData = await bottlesApi.getForecastRequirements(doiGoal, safetyBuffer / 100);
        
        if (inventoryResponse.success) {
          // Create a map with BOTH full names and short names as keys
          const dataMap = {};
          const forecastMap = {};
          const bottlesList = [];
          
          // Build forecast map by bottle name
          if (forecastData.success && forecastData.data) {
            forecastData.data.forEach(forecast => {
              forecastMap[forecast.bottle_name] = forecast;
            });
          }
          
          inventoryResponse.data.forEach((bottle, index) => {
            const forecast = forecastMap[bottle.bottle_name] || {};
            const recommendedQty = Math.round(forecast.recommended_order_qty || 0);
            
            // Calculate total daily sales rate from products using this bottle
            let totalDailySalesRate = 0;
            if (forecast.products_using_bottle && Array.isArray(forecast.products_using_bottle)) {
              totalDailySalesRate = forecast.products_using_bottle.reduce((sum, product) => {
                return sum + (product.daily_sales_rate || 0);
              }, 0);
            }
            
            // Calculate current DOI (Days of Inventory)
            // DOI = current_inventory / daily_sales_rate
            // Lower DOI = more urgent to order
            const currentInventory = bottle.warehouse_quantity || 0;
            const currentDOI = totalDailySalesRate > 0 
              ? Math.round(currentInventory / totalDailySalesRate)
              : currentInventory > 0 ? 999 : 0; // If no sales data but has inventory, put at end; if no inventory, prioritize
            
            const bottleData = {
              fullName: bottle.bottle_name,
              unitsPerPallet: bottle.units_per_pallet || 1,
              maxWarehouseInventory: bottle.max_warehouse_inventory,
              warehouseQuantity: bottle.warehouse_quantity || 0,
              supplierQuantity: bottle.supplier_quantity || 0,
              supplier: bottle.supplier || '',
              recommendedQty: recommendedQty,
              forecastedUnitsNeeded: forecast.forecasted_units_needed || 0,
              totalDailySalesRate: totalDailySalesRate,
              currentDOI: currentDOI,
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
              qty: recommendedQty, // Auto-populate with recommended quantity
              pallets: calculatePallets(recommendedQty, bottle.units_per_pallet || 1),
              added: false,
              inventoryPercentage: bottle.max_warehouse_inventory > 0 
                ? Math.round(((bottle.warehouse_quantity + recommendedQty) / bottle.max_warehouse_inventory) * 100)
                : 0,
              maxWarehouseInventory: bottle.max_warehouse_inventory,
              warehouseQuantity: bottle.warehouse_quantity || 0,
              unitsPerPallet: bottle.units_per_pallet || 1,
              recommendedQty: recommendedQty,
              totalDailySalesRate: totalDailySalesRate,
              currentDOI: currentDOI,
            });
          });
          
          setBottleInventoryData(dataMap);
          setBottleForecastRequirements(forecastMap);
          
          // Set order lines for create mode
          if (isCreateMode) {
            setOrderLines(bottlesList.map(line => ({
              ...line,
              added: false, // Start with nothing added
            })));
          }
        }
      } catch (err) {
        console.error('Error fetching bottle data:', err);
      }
    };
    
    if (isCreateMode) {
      fetchBottleData();
    }
  }, [isCreateMode, isViewMode, doiGoal, safetyBuffer]);
  
  // Ensure tab is set to receivePO when viewing an order
  useEffect(() => {
    if (isViewMode) {
      setActiveTab('receivePO');
    }
  }, [isViewMode]);

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
              const originalQty = item.quantity_ordered || 0;
              const receivedQty = item.quantity_received || 0;
              const qtyToReceive = originalQty - receivedQty; // Remaining to receive
              
              return {
                id: item.id,
                name: bottleInfo.fullName || bottleName,
                supplierInventory: bottleInfo.supplierQuantity || 0,
                qty: qtyToReceive, // Default to remaining quantity to receive
                initialQty: qtyToReceive, // Store initial receive quantity for comparison
                originalQty: originalQty, // Store original ordered quantity
                receivedQty: receivedQty, // Store already received quantity
                pallets: calculatePallets(qtyToReceive, bottleInfo.unitsPerPallet || 1),
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
  const [showQuantityChangedModal, setShowQuantityChangedModal] = useState(false);
  const [showInventoryConfirmModal, setShowInventoryConfirmModal] = useState(false);
  const [pendingSaveLineId, setPendingSaveLineId] = useState(null);
  
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

  // Filter and sort lines based on search query and active tab
  // Default sort: by DOI ascending (lowest DOI first = most urgent to order)
  const filteredLines = useMemo(() => {
    let linesToFilter = orderLines;
    
    // In receivePO tab when viewing, show only added items
    if (isViewMode && activeTab === 'receivePO') {
      linesToFilter = orderLines.filter((line) => line.added);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      linesToFilter = linesToFilter.filter((line) => 
        line.name.toLowerCase().includes(query) ||
        (line.supplierInventory && line.supplierInventory.toString().toLowerCase().includes(query))
      );
    }
    
    // Sort by DOI ascending (lowest DOI first = most urgent to order)
    // Products with lowest Days of Inventory should appear first
    return [...linesToFilter].sort((a, b) => {
      const doiA = a.currentDOI ?? 999;
      const doiB = b.currentDOI ?? 999;
      return doiA - doiB;
    });
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
          const recommendedQty = bottleData.recommendedQty || line.recommendedQty || 0;
          
          if (isAdding) {
            // When adding, use recommended quantity from forecast, or existing qty, or default to units per pallet
            const defaultQty = recommendedQty > 0 ? recommendedQty : (line.qty > 0 ? line.qty : unitsPerPallet);
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
            // When removing, restore the recommended quantity
            const restoreQty = recommendedQty > 0 ? recommendedQty : 0;
            return { 
              ...line, 
              added: false, 
              qty: restoreQty,
              pallets: calculatePallets(restoreQty, unitsPerPallet), 
              inventoryPercentage: 0 
            };
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
      // Try both fullName and name to get bottle data
      const bottleData = bottleInventoryData[line.fullName] || bottleInventoryData[line.name] || {};
      const currentWarehouseQty = bottleData.warehouseQuantity !== undefined 
        ? bottleData.warehouseQuantity 
        : (line.warehouseQuantity !== undefined ? line.warehouseQuantity : 0);
      
      const currentSupplierQty = bottleData.supplierQuantity !== undefined
        ? bottleData.supplierQuantity
        : (line.supplierInventory !== undefined 
          ? (typeof line.supplierInventory === 'number' 
            ? line.supplierInventory 
            : Number(String(line.supplierInventory).replace(/,/g, '')))
          : 0);
      
      setEditingLineId(lineId);
      setOriginalValues({
        qty: line.qty || 0,
        pallets: line.pallets || 0,
        warehouseQuantity: currentWarehouseQty,
        supplierQuantity: currentSupplierQty,
      });
      setEditedValues({
        qty: line.qty || 0,
        pallets: line.pallets || 0,
        warehouseQuantity: currentWarehouseQty !== undefined && currentWarehouseQty !== null ? String(currentWarehouseQty) : '',
        supplierQuantity: currentSupplierQty !== undefined && currentSupplierQty !== null ? String(currentSupplierQty) : '',
      });
      setEllipsisMenuId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingLineId(null);
    setOriginalValues({});
    setEditedValues({});
  };

  const handleDoneEdit = async (lineId) => {
    const line = orderLines.find(l => l.id === lineId);
    const newQty = editedValues.qty || 0;
    const originalQty = originalValues.qty || 0;
    const newWarehouseQty = Number(editedValues.warehouseQuantity) || 0;
    const originalWarehouseQty = Number(originalValues.warehouseQuantity) || 0;
    
    // Check if warehouse inventory was changed
    const warehouseChanged = newWarehouseQty !== originalWarehouseQty;
    
    // If warehouse inventory changed, show confirmation modal
    if (warehouseChanged) {
      setPendingSaveLineId(lineId);
      setShowInventoryConfirmModal(true);
      return;
    }
    
    // Otherwise, save immediately (including supplier inventory changes)
    await saveEditChanges(lineId);
  };

  const saveEditChanges = async (lineId) => {
    const line = orderLines.find(l => l.id === lineId);
    const newQty = editedValues.qty || 0;
    const originalQty = originalValues.qty || 0;
    const newWarehouseQty = Number(editedValues.warehouseQuantity) || 0;
    const originalWarehouseQty = Number(originalValues.warehouseQuantity) || 0;
    const newSupplierQty = Number(editedValues.supplierQuantity) || 0;
    const originalSupplierQty = Number(originalValues.supplierQuantity) || 0;
    
    // Check if quantity was actually changed
    const wasEdited = newQty !== originalQty;
    
    // Check if inventory was changed
    const warehouseChanged = newWarehouseQty !== originalWarehouseQty;
    const supplierChanged = newSupplierQty !== originalSupplierQty;
    
    // Update inventory if changed
    if (warehouseChanged || supplierChanged) {
      try {
        // Find inventory ID from API
        const inventoryResponse = await bottlesApi.getInventory();
        if (inventoryResponse.success) {
          const bottleName = line?.fullName || line?.name;
          const inventoryItem = inventoryResponse.data.find(
            item => item.bottle_name === bottleName
          );
          if (inventoryItem?.id) {
            // Send both warehouse and supplier quantities to match backend expectations
            await bottlesApi.updateInventory(inventoryItem.id, {
              warehouse_quantity: newWarehouseQty,
              supplier_quantity: newSupplierQty,
            });
            // Update local state
            setBottleInventoryData(prev => {
              const updated = { ...prev };
              if (line.name) {
                updated[line.name] = {
                  ...(prev[line.name] || {}),
                  warehouseQuantity: newWarehouseQty,
                  supplierQuantity: newSupplierQty,
                };
              }
              if (line.fullName) {
                updated[line.fullName] = {
                  ...(prev[line.fullName] || {}),
                  warehouseQuantity: newWarehouseQty,
                  supplierQuantity: newSupplierQty,
                };
              }
              return updated;
            });
          } else {
            console.error('Inventory item not found for:', bottleName);
            alert('Failed to find inventory item. Please try again.');
            return;
          }
        }
      } catch (error) {
        console.error('Error updating inventory:', error);
        alert('Failed to update inventory. Please try again.');
        return;
      }
    }
    
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === lineId
          ? {
              ...line,
              qty: editedValues.qty || 0,
              pallets: editedValues.pallets || 0,
              warehouseQuantity: newWarehouseQty,
            }
          : line
      )
    );
    
    // If quantity was changed, mark the order as edited in the database
    if (wasEdited && isViewMode && orderId) {
      try {
        await bottlesApi.updateOrder(lineId, {
          is_edited: true,
        });
      } catch (error) {
        console.error('Error marking order as edited:', error);
      }
    }
    
    setEditingLineId(null);
    setOriginalValues({});
    setEditedValues({});
    setShowInventoryConfirmModal(false);
    setPendingSaveLineId(null);
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
    
    // Check if any quantities have been changed from their initial values
    const hasQuantityChanges = orderLines.some(line => {
      const initialQty = line.initialQty || 0;
      const currentQty = line.qty || 0;
      return initialQty !== currentQty;
    });
    
    // If quantities changed, show quantity changed modal first
    if (hasQuantityChanges) {
      setShowQuantityChangedModal(true);
      return;
    }
    
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

  // Handle confirm quantity changed - proceed to next modal
  const handleConfirmQuantityChanged = () => {
    setShowQuantityChangedModal(false);
    
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
    
    // If no items selected, proceed to receive all
    setShowReceiveConfirmModal(true);
  };

  // Handle confirm partial order
  const handleConfirmPartialOrder = async () => {
    setShowPartialOrderModal(false);
    // Process the partial receive
    await handleCompleteOrder();
  };

  const validateCreateOrder = () => {
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
      return false;
    }
    
    // Validate: Check if any items have 0 quantity
    const zeroQtyItems = addedLines.filter(line => !line.qty || line.qty === 0);
    if (zeroQtyItems.length > 0) {
      alert('Cannot submit order with 0 quantity items!\n\nPlease remove items with 0 quantity or enter a valid quantity.');
      return false;
    }
    return true;
  };

  const createBottleOrder = async () => {
    if (!validateCreateOrder()) return false;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const batchOrderData = {
        order_number: orderNumber,
        supplier: supplier.name,
        order_date: today,
        expected_delivery_date: null,
        bottles: addedLines.map(line => ({
          bottle_name: line.fullName || line.name,
          quantity_ordered: line.qty || 0,
          cost_per_unit: null,
          total_cost: null,
          status: 'submitted',
          notes: `${line.qty} units (${line.pallets} pallets)`,
        })),
      };
      
      const response = await bottlesApi.createOrder(batchOrderData);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create order');
      }
      
      navigate('/dashboard/supply-chain/bottles', {
        state: {
          orderCreated: true,
          orderNumber: orderNumber,
          bottleCount: addedLines.length,
        },
        replace: false,
      });
      return true;
    } catch (err) {
      console.error('Error creating order:', err);
      alert(`Failed to create order: ${err.message}\n\nPlease try again.`);
      return false;
    }
  };

  const handleCompleteOrder = async () => {
    if (isViewMode && orderId && activeTab === 'receivePO') {
      // Receive the order - update each line item
      try {
        const today = new Date().toISOString().split('T')[0];
        const selectedLines = orderLines.filter(line => line.added && selectedItems.has(line.id));
        
        // If no items selected, select all
        const allAddedLines = orderLines.filter(line => line.added);
        const linesToReceive = selectedLines.length > 0 ? selectedLines : allAddedLines;
        
        if (linesToReceive.length === 0) {
          alert('No items to receive');
          return;
        }
        
        // Determine if this is a partial receive (not all items selected)
        const isPartialReceive = selectedLines.length > 0 && selectedLines.length < allAddedLines.length;
        
        // Update each line item to mark as received or partial
        for (const line of linesToReceive) {
          // Calculate total received: already received + new received
          const alreadyReceived = line.receivedQty || 0;
          const newReceived = line.qty || 0;
          const totalReceived = alreadyReceived + newReceived;
          const originalQty = line.originalQty || totalReceived;
          
          // Check if this line is fully received (total received equals original ordered)
          const isFullyReceived = totalReceived >= originalQty;
          
          const updateData = {
            quantity_received: totalReceived, // Total received (previous + new)
            bottle_name: line.name,
            status: (isPartialReceive || !isFullyReceived) ? 'partial' : 'received',
            actual_delivery_date: today,
          };
          
          await bottlesApi.updateOrder(line.id, updateData);
        }
        
        // Also mark unselected items as partial if this is a partial receive
        if (isPartialReceive) {
          const unselectedLines = allAddedLines.filter(line => !selectedItems.has(line.id));
          for (const line of unselectedLines) {
            const updateData = {
              quantity_received: line.receivedQty || 0,
              bottle_name: line.name,
              status: 'partial',
            };
            
            await bottlesApi.updateOrder(line.id, updateData);
          }
        }
        
        // Navigate back with success message
        navigate('/dashboard/supply-chain/bottles', {
          state: {
            receivedOrderId: orderId,
            receivedOrderNumber: orderNumber,
            isPartial: isPartialReceive,
          },
          replace: false,
        });
        return;
      } catch (error) {
        console.error('Error receiving order:', error);
        const errorMessage = error.message || 'Unknown error occurred';
        alert(`Failed to receive order: ${errorMessage}`);
        return;
      }
    }
    
    if (addedLines.length === 0) {
      return;
    }

    if (!validateCreateOrder()) return;
    setShowExportModal(true);
  };

  const getExportFileName = () => {
    const safeOrderName = orderNumber || 'BottleOrder';
    return `${safeOrderName}.csv`;
  };

  const handleExportCSV = () => {
    const csvContent = generateCSV();
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

  const handleDone = async () => {
    setShowExportModal(false);
    
    if (isCreateMode) {
      await createBottleOrder();
    }
  };

  if (!supplier || !orderNumber) {
    handleBack();
    return null;
  }

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`} style={{ paddingBottom: '24px' }}>
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
      </div>

      {/* Search bar and forecast controls - above table */}
      <div className="px-6 py-4 flex justify-between items-center" style={{ marginTop: '0' }}>
        {/* Forecast Controls */}
        {!isViewMode && (
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
      <div className={`${themeClasses.cardBg} border ${themeClasses.border} shadow-lg mx-6`} style={{ marginTop: '0', borderRadius: '8px', overflow: 'hidden' }}>
          <div className="overflow-x-auto" style={{ paddingRight: '0' }}>
            {/* Table Mode - Show different table structure for addProducts tab when tableMode is true */}
            {tableMode && activeTab === 'addProducts' && !isViewMode ? (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
                <thead className={themeClasses.headerBg} style={{ borderRadius: '8px 8px 0 0' }}>
                  <tr style={{ height: '40px', maxHeight: '40px' }}>
                    <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                      width: '50px',
                      minWidth: '50px',
                      maxWidth: '50px',
                      height: '40px',
                      padding: '0 12px',
                      textAlign: 'center',
                    }}>
                      <input
                        type="checkbox"
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        checked={filteredLines.length > 0 && filteredLines.every(l => l.added)}
                        onChange={() => {
                          const allSelected = filteredLines.every(l => l.added);
                          filteredLines.forEach(l => {
                            if (allSelected && l.added) {
                              handleAddProduct(l.id);
                            } else if (!allSelected && !l.added) {
                              handleAddProduct(l.id);
                            }
                          });
                        }}
                      />
                    </th>
                    <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                      width: '142px',
                      height: '40px',
                      paddingTop: '12px',
                      paddingRight: '16px',
                      paddingBottom: '12px',
                      paddingLeft: '16px',
                      textAlign: 'center',
                      borderRight: '2px solid #FFFFFF',
                      gap: '10px',
                    }}>
                      PACKAGING NAME
                    </th>
                    <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                      padding: '0 1rem', 
                      height: '40px', 
                      textAlign: 'center', 
                      borderRight: '2px solid #FFFFFF',
                      width: 200 
                    }}>
                      SUPPLIER INVENTORY
                    </th>
                    <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                      padding: '0 1rem', 
                      height: '40px', 
                      textAlign: 'center', 
                      borderRight: '2px solid #FFFFFF',
                      width: 180 
                    }}>
                      CURRENT INVENTORY
                    </th>
                    <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                      padding: '0 1rem', 
                      height: '40px', 
                      textAlign: 'center', 
                      borderRight: '2px solid #FFFFFF',
                      width: 180 
                    }}>
                      UNITS NEEDED
                    </th>
                    <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                      width: '142px',
                      height: '40px',
                      paddingTop: '12px',
                      paddingRight: '16px',
                      paddingBottom: '12px',
                      paddingLeft: '16px',
                      textAlign: 'center',
                      borderRight: '2px solid #FFFFFF',
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
                      gap: '10px',
                    }}>
                      PALLETS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLines.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-6 text-center text-sm italic text-gray-400">
                        No items available.
                      </td>
                    </tr>
                  ) : (
                    filteredLines.map((line, index) => {
                      return (
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
                          <td style={{ 
                            width: '50px',
                            minWidth: '50px',
                            maxWidth: '50px',
                            height: '40px',
                            padding: '0 12px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}>
                            <input 
                              type="checkbox" 
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                              checked={line.added || false}
                              onChange={() => handleAddProduct(line.id)}
                            />
                          </td>
                          <td style={{ 
                            height: '40px',
                            paddingTop: '12px',
                            paddingRight: '16px',
                            paddingBottom: '12px',
                            paddingLeft: '16px',
                            fontSize: '0.875rem',
                            verticalAlign: 'middle',
                            textAlign: 'left',
                          }} className={themeClasses.textPrimary}>
                            {line.fullName || line.name}
                          </td>
                          <td style={{ 
                            height: '40px',
                            paddingTop: '12px',
                            paddingRight: '16px',
                            paddingBottom: '12px',
                            paddingLeft: '16px',
                            fontSize: '0.875rem',
                            verticalAlign: 'middle',
                            textAlign: 'center',
                          }} className={themeClasses.textPrimary}>
                            {line.supplierInventory || 0}
                          </td>
                          <td style={{ 
                            height: '40px',
                            paddingTop: '12px',
                            paddingRight: '16px',
                            paddingBottom: '12px',
                            paddingLeft: '16px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}>
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
                          <td style={{ 
                            height: '40px',
                            paddingTop: '12px',
                            paddingRight: '16px',
                            paddingBottom: '12px',
                            paddingLeft: '16px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <input
                                type="number"
                                value={line.qty || ''}
                                onChange={(e) => handleQtyChange(line.id, e.target.value)}
                                style={{
                                  width: '120px',
                                  padding: '6px 12px',
                                  fontSize: '14px',
                                  textAlign: 'center',
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
                            paddingRight: '16px',
                            paddingBottom: '12px',
                            paddingLeft: '16px',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <input
                                type="number"
                                step="0.1"
                                value={line.pallets ? line.pallets.toFixed(1) : ''}
                                onChange={(e) => {
                                  const newPallets = parseFloat(e.target.value) || 0;
                                  handlePalletsChange(line.id, newPallets);
                                }}
                                style={{
                                  width: '120px',
                                  padding: '6px 12px',
                                  fontSize: '14px',
                                  textAlign: 'center',
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
                            padding: '0.65rem 1rem', 
                            height: '40px', 
                            verticalAlign: 'middle',
                            textAlign: 'center',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                              <div style={{ 
                                flex: 1, 
                                maxWidth: '300px',
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
                                          backgroundColor: '#DBEAFE',
                                          transition: 'width 0.3s',
                                        }} title={`Available: ${(maxInventory - currentInventory - orderQty).toLocaleString()} (${remainingPct}%)`}></div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
              <thead className={themeClasses.headerBg} style={{ borderRadius: '8px 8px 0 0' }}>
                <tr style={{ height: '40px', maxHeight: '40px' }}>
                  {/* Placeholder checkbox column to keep alignment with table mode when addProducts tab is active */}
                  {activeTab === 'addProducts' && !isViewMode && (
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                    width: '50px',
                    minWidth: '50px',
                    maxWidth: '50px',
                    height: '40px',
                    padding: '0 12px',
                    textAlign: 'center',
                  }}>
                  </th>
                  )}
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                    width: isViewMode && activeTab === 'receivePO' ? '250px' : (isViewMode ? '45%' : '142px'),
                    maxWidth: isViewMode && activeTab === 'receivePO' ? '250px' : undefined,
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: isViewMode && activeTab === 'receivePO' ? '8px' : '16px',
                    paddingBottom: '12px',
                    paddingLeft: '16px',
                    textAlign: 'center',
                    borderRight: '2px solid #FFFFFF',
                    gap: '10px',
                  }}>
                    PACKAGING NAME
                  </th>
                  {/* SUPPLIER INV column - only show in addProducts tab when creating new order (not viewing) */}
                  {(activeTab === 'addProducts' && !isViewMode) && (
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', height: '40px', textAlign: 'center', borderRight: '2px solid #FFFFFF', width: 200 }}>
                    SUPPLIER INV
                  </th>
                  )}
                  {/* ADD column - only show in addProducts tab when creating new order (not viewing) */}
                  {(activeTab === 'addProducts' && !isViewMode) && (
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', height: '40px', textAlign: 'center', width: 120 }}>
                    ADD
                  </th>
                  )}
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                    width: isViewMode && activeTab === 'receivePO' ? '140px' : (isViewMode ? '20%' : '142px'),
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: isViewMode && activeTab === 'receivePO' ? '8px' : '16px',
                    paddingBottom: '12px',
                    paddingLeft: isViewMode && activeTab === 'receivePO' ? '8px' : '16px',
                    textAlign: 'center',
                    borderRight: isViewMode && activeTab === 'receivePO' ? '1px solid #3C4656' : 'none',
                    gap: '10px',
                  }}>
                    QTY
                  </th>
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ 
                    width: isViewMode && activeTab === 'receivePO' ? 'auto' : (isViewMode ? '20%' : '142px'),
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: isViewMode && activeTab === 'receivePO' ? '16px' : '16px',
                    paddingBottom: '12px',
                    paddingLeft: isViewMode && activeTab === 'receivePO' ? '8px' : '16px',
                    textAlign: isViewMode && activeTab === 'receivePO' ? 'left' : 'center',
                    borderRight: isViewMode && activeTab === 'receivePO' ? 'none' : '2px solid #FFFFFF',
                    gap: '10px',
                  }}>
                    PALLETS
                  </th>
                  {/* Inventory columns removed in view mode */}
                  {/* INVENTORY PERCENTAGE column - only show in addProducts tab when creating new order (not viewing) */}
                  {(activeTab === 'addProducts' && !isViewMode) && (
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', height: '40px', textAlign: 'center', borderLeft: '2px solid #FFFFFF', width: 300 }}>
                    INVENTORY PERCENTAGE
                  </th>
                  )}
                  {/* Ellipsis column - show when viewing an order in receivePO tab */}
                  {isViewMode && activeTab === 'receivePO' && (
                  <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0', height: '40px', textAlign: 'center', width: 'auto', minWidth: '140px' }}>
                  </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredLines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={(isViewMode && activeTab === 'receivePO')
                        ? 4 // packaging, qty, pallets, ellipsis
                        : ((activeTab === 'addProducts' && !isViewMode) ? 7 : 4)}
                      className="px-6 py-6 text-center text-sm italic text-gray-400"
                    >
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
                      {/* Placeholder checkbox column to align with table mode when addProducts is active */}
                      {activeTab === 'addProducts' && !isViewMode && (
                      <td style={{ 
                        width: '50px',
                        minWidth: '50px',
                        maxWidth: '50px',
                        height: '40px',
                        padding: '0 12px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                      }}>
                      </td>
                      )}
                      <td style={{ 
                        width: isViewMode && activeTab === 'receivePO' ? '250px' : (isViewMode ? '45%' : '300px'),
                        maxWidth: isViewMode && activeTab === 'receivePO' ? '250px' : undefined,
                        height: '40px',
                        paddingTop: '12px',
                        paddingRight: isViewMode && activeTab === 'receivePO' ? '8px' : '16px',
                        paddingBottom: '12px',
                        paddingLeft: '16px',
                        fontSize: '0.85rem',
                        verticalAlign: 'middle',
                        gap: '10px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }} className={themeClasses.textPrimary} title={line.fullName || line.name}>
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
                        width: isViewMode && activeTab === 'receivePO' ? '140px' : (isViewMode ? '20%' : '142px'),
                        height: '40px',
                        paddingTop: '12px',
                        paddingRight: isViewMode && activeTab === 'receivePO' ? '8px' : '16px',
                        paddingBottom: '12px',
                        paddingLeft: isViewMode && activeTab === 'receivePO' ? '8px' : '16px',
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
                              <span style={{ 
                                fontSize: '14px', 
                                color: '#EF4444', 
                                fontWeight: 600,
                                marginLeft: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                minWidth: '40px',
                              }}>
                                {((editedValues.qty || 0) - (originalValues.qty || 0)) > 0 ? '+' : ''}{((editedValues.qty || 0) - (originalValues.qty || 0)).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <input
                              type="number"
                              value={line.qty || ''}
                              onChange={(e) => handleQtyChange(line.id, e.target.value)}
                              readOnly={isViewMode && activeTab === 'receivePO'}
                              title={line.recommendedQty > 0 ? `Forecast-based qty: ${line.recommendedQty.toLocaleString()} units (${doiGoal} day DOI)` : ''}
                              style={{
                                width: '100%',
                                maxWidth: '120px',
                                padding: '4px 8px',
                                fontSize: '14px',
                                textAlign: 'center',
                                border: `1px solid ${line.recommendedQty > 0 ? '#3B82F6' : '#D1D5DB'}`,
                                borderRadius: '8px',
                                backgroundColor: line.recommendedQty > 0 ? '#EFF6FF' : '#F3F4F6',
                                color: '#000000',
                                cursor: 'text',
                              }}
                            />
                            {line.recommendedQty > 0 && !line.added && (
                              <span 
                                title="Auto-calculated from product forecasts"
                                style={{ 
                                  position: 'absolute',
                                  top: '-6px',
                                  right: '-6px',
                                  backgroundColor: '#3B82F6',
                                  color: 'white',
                                  borderRadius: '50%',
                                  width: '16px',
                                  height: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  cursor: 'help'
                                }}
                              >
                                F
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ 
                        width: isViewMode && activeTab === 'receivePO' ? 'auto' : '142px',
                        height: '40px',
                        paddingTop: '12px',
                        paddingRight: isViewMode && activeTab === 'receivePO' ? '16px' : '16px',
                        paddingBottom: '12px',
                        paddingLeft: isViewMode && activeTab === 'receivePO' ? '8px' : '16px',
                        textAlign: isViewMode && activeTab === 'receivePO' ? 'left' : 'center',
                        verticalAlign: 'middle',
                        gap: '10px',
                      }}>
                        {editingLineId === line.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: isViewMode && activeTab === 'receivePO' ? 'flex-start' : 'center' }}>
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
                              <span style={{ 
                                fontSize: '14px', 
                                color: '#EF4444', 
                                fontWeight: 600,
                                marginLeft: '4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                minWidth: '50px',
                              }}>
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
                      {/* Inventory columns removed in view mode - hidden to match design */}
                      {/* Ellipsis column - show when viewing an order in receivePO tab */}
                      {isViewMode && activeTab === 'receivePO' && (
                      <td style={{ padding: '0', textAlign: 'center', height: '40px', verticalAlign: 'middle', position: 'relative', width: editingLineId === line.id ? '200px' : 'auto', minWidth: editingLineId === line.id ? '200px' : '140px', whiteSpace: 'nowrap' }}>
                        {editingLineId === line.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', paddingRight: '8px' }}>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                backgroundColor: '#FFFFFF',
                                color: '#374151',
                                border: '1px solid #D1D5DB',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                whiteSpace: 'nowrap',
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
                                whiteSpace: 'nowrap',
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
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%', height: '100%', paddingRight: '8px' }}>
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
                                  const menuWidth = 140;
                                  setEllipsisMenuPosition({
                                    top: rect.bottom + 4,
                                    left: rect.right - menuWidth,
                                  });
                                }}
                                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                style={{
                                  color: '#6B7280',
                                  backgroundColor: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                aria-label="Row actions"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
                                  <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                                  <circle cx="12" cy="18" r="1.5" fill="currentColor"/>
                                </svg>
                              </button>
                            </div>
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
                                  borderRadius: '20px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                  zIndex: 1000,
                                  padding: '4px 8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleStartEdit(line.id);
                                    setEllipsisMenuId(null);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    borderRadius: '20px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    color: '#3B82F6',
                                    transition: 'background-color 0.2s',
                                    whiteSpace: 'nowrap',
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

      {/* Quantity Changed Warning Modal */}
      {showQuantityChangedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowQuantityChangedModal(false)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md px-6 py-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center mb-4">
              <div className="mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 20h20L12 2z" fill="#F59E0B" stroke="#F59E0B" strokeWidth="2" strokeLinejoin="round"/>
                  <circle cx="12" cy="17" r="1" fill="white"/>
                  <line x1="12" y1="9" x2="12" y2="14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2" style={{ color: '#374151' }}>Bottle Amount Changed</h2>
            </div>
            <p className="text-sm text-gray-700 mb-6" style={{ color: '#374151', textAlign: 'center' }}>
              {(() => {
                const changedCount = orderLines.filter(line => {
                  const initialQty = line.initialQty || 0;
                  const currentQty = line.qty || 0;
                  return initialQty !== currentQty;
                }).length;
                return `${changedCount} item${changedCount > 1 ? 's have' : ' has had a'} quantity change${changedCount > 1 ? 's' : ''}. Please carefully review your order.`;
              })()}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowQuantityChangedModal(false)}
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
                onClick={handleConfirmQuantityChanged}
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
                Confirm & Receive
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div
              className="mb-6"
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                backgroundColor: '#F9FAFB',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <svg className="w-5 h-5" fill="#9333EA" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="4" width="12" height="16" rx="2" fill="#A855F7" />
                <rect x="9" y="16" width="6" height="2" rx="1" fill="#7C3AED" />
              </svg>
              <span className="text-sm font-medium" style={{ color: '#111827' }}>
                {getExportFileName()}
              </span>
            </div>

            {/* Information message */}
            <div className="flex items-start gap-3 mb-6">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="#3B82F6" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16h.01M12 12v-4" />
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
                  border: '1px solid #3B82F6',
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

      {/* Inventory Update Confirmation Modal */}
      {showInventoryConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => {
          setShowInventoryConfirmModal(false);
          setPendingSaveLineId(null);
        }}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md px-6 py-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ color: '#374151' }}>Are you sure?</h2>
            <p className="text-sm text-gray-700 mb-6" style={{ color: '#374151' }}>
              This will overwrite the current inventory. Make sure your new count is accurate before confirming.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowInventoryConfirmModal(false);
                  setPendingSaveLineId(null);
                }}
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
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingSaveLineId) {
                    saveEditChanges(pendingSaveLineId);
                  }
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
                Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BottleOrderPage;
