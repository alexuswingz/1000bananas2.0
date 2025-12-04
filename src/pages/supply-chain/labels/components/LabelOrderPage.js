import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { labelsApi } from '../../../../services/supplyChainApi';

const LabelOrderPage = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const orderNumber = state.orderNumber || `PO-${new Date().toISOString().split('T')[0]}`;
  const supplier = state.supplier || { name: 'Richmark Label', logoSrc: '/assets/Logo1.png' };
  const mode = state.mode || 'create';
  const isCreateMode = mode === 'create';
  const isViewMode = mode === 'view' || mode === 'receive';
  const orderId = state.orderId || null;
  
  // Get lines from state or default empty
  const [allLines, setAllLines] = useState(state.lines || []);
  const [loadingLabels, setLoadingLabels] = useState(false);
  
  // Fetch labels from API on mount if creating new order
  useEffect(() => {
    if (!state.lines && isCreateMode) {
      const fetchLabels = async () => {
        try {
          setLoadingLabels(true);
          const response = await labelsApi.getInventory();
          if (response.success) {
            const transformed = response.data.map(label => ({
              id: label.id,
              brand: label.brand_name,
              product: label.product_name,
              size: label.bottle_size,
              labelSize: label.label_size,
              qty: 0,
              labelStatus: label.label_status || 'Up to Date',
              inventory: label.warehouse_inventory || 0,
              toOrder: 0,
              googleDriveLink: label.google_drive_link,
              added: false,
            }));
            setAllLines(transformed);
          }
        } catch (err) {
          console.error('Error fetching labels:', err);
        } finally {
          setLoadingLabels(false);
        }
      };
      fetchLabels();
    }
  }, [state.lines, isCreateMode]);

  // Navigation tab state - default to 'receivePO' when viewing, 'addProducts' when creating
  const [activeTab, setActiveTab] = useState(isViewMode ? 'receivePO' : 'addProducts');
  const [tableMode, setTableMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [csvExported, setCsvExported] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingQtyValue, setEditingQtyValue] = useState('');
  const qtyInputRef = useRef(null);
  
  // Checkbox selection state for partial orders
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [showPartialOrderModal, setShowPartialOrderModal] = useState(false);
  const [orderStatus, setOrderStatus] = useState(() => {
    // Initialize from state if available, otherwise default to 'Draft'
    return state.status || 'Draft';
  }); // Track order status: 'Draft', 'Received', 'Partially Received'
  
  // Focus and select input when editing starts
  useEffect(() => {
    if (editingRowId && qtyInputRef.current) {
      // Small delay to ensure the input is rendered
      setTimeout(() => {
        if (qtyInputRef.current) {
          qtyInputRef.current.focus();
          qtyInputRef.current.select();
        }
      }, 0);
    }
  }, [editingRowId]);
  
  // Edit and change tracking state
  const [originalOrder, setOriginalOrder] = useState(null); // Store original order for comparison
  const [originalOrderLines, setOriginalOrderLines] = useState([]); // Store original order lines with qty
  const [previousRecipients, setPreviousRecipients] = useState([]); // Store previous recipients
  const [isEditOrderMode, setIsEditOrderMode] = useState(false); // Track if we're editing an existing order
  const [isEditMode, setIsEditMode] = useState(false); // Track if we're editing an existing order (legacy)
  const [selectedRecipients, setSelectedRecipients] = useState([]); // Selected recipients for update
  const [newRecipientEmail, setNewRecipientEmail] = useState(''); // New recipient email input
  const [currentRecipients, setCurrentRecipients] = useState([]); // Current recipients list

  // Status dropdown state
  const [statusDropdownId, setStatusDropdownId] = useState(null);
  const statusButtonRefs = useRef({});
  const statusMenuRefs = useRef({});

  // Initialize order lines - items in view mode are already "added", new orders start with all items not added
  const [orderLines, setOrderLines] = useState([]);
  
  // Update orderLines when allLines changes
  useEffect(() => {
    if (allLines.length > 0) {
      setOrderLines(allLines.map((line, index) => {
        const updatedLine = { ...line, added: isViewMode };
        if (!isViewMode && !state.lines) {
          if (index === 0) updatedLine.size = '8oz';
          if (index === 1) updatedLine.size = 'Quart';
          if (index === 2) updatedLine.size = 'Gallon';
        }
        return updatedLine;
      }));
    }
  }, [allLines, isViewMode, state.lines]);

  // Get added items for summary
  const addedLines = useMemo(() => {
    return orderLines.filter((line) => line.added);
  }, [orderLines]);

  // Filter lines based on search
  const filteredLines = useMemo(() => {
    // In edit mode on receivePO tab, show only added items (the order items)
    // As users add more items, they will appear in receivePO
    let linesToFilter = orderLines;
    if (isEditOrderMode && activeTab === 'receivePO') {
      // Show only added items in receivePO when editing
      linesToFilter = orderLines.filter((line) => line.added);
    }
    
    if (!searchQuery.trim()) return linesToFilter;
    const query = searchQuery.toLowerCase();
    return linesToFilter.filter(
      (line) =>
        line.brand.toLowerCase().includes(query) ||
        line.product.toLowerCase().includes(query) ||
        line.size.toLowerCase().includes(query)
    );
  }, [orderLines, searchQuery, isEditOrderMode, activeTab]);

  // Calculate summary based on added items (or all lines in receivePO)
  const summary = useMemo(() => {
    // In receivePO tab, use all orderLines (or only added if in edit mode); otherwise use only added lines
    let linesToUse;
    if (activeTab === 'receivePO') {
      // In edit mode, show only added items; otherwise show all orderLines
      linesToUse = isEditOrderMode ? addedLines : orderLines;
    } else {
      linesToUse = addedLines;
    }
    const totalLabels = linesToUse.reduce((sum, line) => sum + (line.qty || 0), 0);
    
    // Get inventory data to find labelSize if not in line
    let inventoryData = [];
    try {
      const stored = window.localStorage.getItem('labelsInventory');
      inventoryData = stored ? JSON.parse(stored) : [];
    } catch {}
    
    // Calculate label size counts
    const size5x8 = linesToUse.reduce((sum, line) => {
      // Try to get labelSize from line, or find it in inventory by matching brand/product/size
      let labelSize = line.labelSize;
      if (!labelSize && inventoryData.length > 0) {
        const inventoryItem = inventoryData.find(
          inv => inv.brand === line.brand && 
                 inv.product === line.product && 
                 inv.size === line.size
        );
        labelSize = inventoryItem?.labelSize || '';
      }
      
      if (labelSize && labelSize.includes('5"') && labelSize.includes('8"')) {
        return sum + (line.qty || 0);
      }
      return sum;
    }, 0);
    
    const size5375x45 = linesToUse.reduce((sum, line) => {
      // Try to get labelSize from line, or find it in inventory by matching brand/product/size
      let labelSize = line.labelSize;
      if (!labelSize && inventoryData.length > 0) {
        const inventoryItem = inventoryData.find(
          inv => inv.brand === line.brand && 
                 inv.product === line.product && 
                 inv.size === line.size
        );
        labelSize = inventoryItem?.labelSize || '';
      }
      
      if (labelSize && labelSize.includes('5.375') && labelSize.includes('4.5')) {
        return sum + (line.qty || 0);
      }
      return sum;
    }, 0);
    
    // Calculate estimated cost (assuming $0.2045 per label based on $562.25 / 2750 labels)
    const estCost = totalLabels * 0.2045;
    
    return {
      products: linesToUse.length,
      totalLabels,
      estCost,
      size5x8,
      size5375x45,
    };
  }, [addedLines, orderLines, activeTab]);

  // Initialize edit mode and store original order
  useEffect(() => {
    if (isViewMode && orderId && state.lines) {
      setIsEditMode(true);
      // Set order status from state if available
      if (state.status) {
        setOrderStatus(state.status);
      }
      // Store original added lines for comparison
      const originalAdded = state.lines.filter(line => line.added !== false);
      setOriginalOrder({
        orderNumber,
        lines: originalAdded,
      });
      // Store original order lines with their quantities for edit tracking
      setOriginalOrderLines(state.lines.map(line => ({
        ...line,
        originalQty: line.qty,
        added: true, // Items in view mode are all "added" already
      })));
      // Load previous recipients from localStorage or state
      const storedRecipients = localStorage.getItem(`labelOrder_${orderId}_recipients`);
      if (storedRecipients) {
        const recipients = JSON.parse(storedRecipients);
        setPreviousRecipients(recipients);
        setCurrentRecipients(recipients);
      }
    }
  }, [isViewMode, orderId, orderNumber, state.lines, state.status]);

  // Handle Edit Order - load all inventory items and mark existing order items
  const handleEditOrder = () => {
    // Get all inventory items from localStorage
    let inventoryData = [];
    try {
      const stored = window.localStorage.getItem('labelsInventory');
      inventoryData = stored ? JSON.parse(stored) : [];
    } catch {}
    
    // If no inventory data, create default data (same as InventoryTable)
    if (inventoryData.length === 0) {
      inventoryData = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        status: i === 9 || i === 14 ? 'Needs Proofing' : 'Up to Date',
        brand: 'Total Pest Spray',
        product: 'Cherry Tree Fertilizer',
        size: 'Gallon',
        labelLink: 'https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view',
        labelSize: '5.375" x 4.5"',
        inventory: 25000,
      }));
    }
    
    // Get the original order items - use originalOrderLines if available, otherwise use state.lines
    // When viewing an order, state.lines contains ONLY the items that were in the order (saved as addedLines)
    // So all items in state.lines should be considered as "in the order"
    const originalOrderItems = originalOrderLines.length > 0 
      ? originalOrderLines.filter(line => line.added !== false) // Filter to only added items
      : (state.lines || []); // state.lines already contains only order items when viewing
    
    console.log('📦 Edit Order - Inventory loaded:', inventoryData.length, 'items');
    console.log('📋 Original order items (added only):', originalOrderItems.length, 'items');
    
    // Create a map of original order items by ID for quick lookup
    // Only match items that have the exact same ID as items in the original order
    const originalOrderItemsById = new Map();
    originalOrderItems.forEach(item => {
      if (item.id != null) {
        originalOrderItemsById.set(item.id, item);
      }
    });
    
    console.log('📋 Original order item IDs:', Array.from(originalOrderItemsById.keys()));
    
    // Map inventory items and mark items already in the order
    const allInventoryLines = inventoryData.map((inv) => {
      // Only match by ID - this ensures we only mark the exact items that were in the order
      const existingLine = originalOrderItemsById.get(inv.id);
      
      if (existingLine) {
        // This item was in the original order (matched by ID) - mark it as added
        return {
          id: inv.id,
          brand: inv.brand,
          product: inv.product,
          size: inv.size,
          qty: existingLine.qty || existingLine.originalQty || 0,
          labelStatus: inv.status,
          inventory: inv.inventory,
          toOrder: inv.inventory,
          labelSize: inv.labelSize,
          added: true, // Only items originally in the order are marked as added
          originalQty: existingLine.qty || existingLine.originalQty || 0,
          isOriginalItem: true,
        };
      }
      
      // This item was NOT in the original order - user must decide to add it
      return {
        id: inv.id,
        brand: inv.brand,
        product: inv.product,
        size: inv.size,
        qty: 2000, // Start with 2000 qty for new items in edit mode (user can adjust)
        labelStatus: inv.status,
        inventory: inv.inventory,
        toOrder: inv.inventory,
        labelSize: inv.labelSize,
        added: false, // New items are NOT added by default - user decides
        originalQty: 0,
        isOriginalItem: false,
      };
    });
    
    console.log('✅ All inventory lines prepared:', allInventoryLines.length, 'items');
    
    setOrderLines(allInventoryLines);
    setIsEditOrderMode(true);
    setActiveTab('addProducts'); // Switch to addProducts tab when editing order
  };

  // Handle Cancel Edit - restore original order lines
  const handleCancelEdit = () => {
    // Restore original order lines
    setOrderLines(originalOrderLines);
    setIsEditOrderMode(false);
    setActiveTab('addProducts'); // Stay on addProducts tab
  };

  // Handle Save Changes - show export modal for edited orders
  const handleSaveChanges = () => {
    // Get all added lines with their current quantities
    const editedLines = orderLines.filter((line) => line.added).map((line) => ({
      ...line,
      added: true,
    }));
    
    // Show export modal instead of directly navigating
    setShowExportModal(true);
    setCsvExported(false); // Reset export status when modal opens
  };

  // Calculate qty difference for display
  const getQtyDifference = (line) => {
    if (!isEditOrderMode) return null;
    
    // For original items, show the difference from original qty
    if (line.isOriginalItem) {
      const diff = line.qty - (line.originalQty || 0);
      if (diff === 0) return null;
      return diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString();
    }
    
    // For new items being added, show the quantity as "+qty"
    if (line.added && line.qty > 0) {
      return `+${line.qty.toLocaleString()}`;
    }
    
    return null;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId !== null) {
        setOpenMenuId(null);
      }
      if (statusDropdownId !== null) {
        const buttonRef = statusButtonRefs.current[statusDropdownId];
        const menuRef = statusMenuRefs.current[statusDropdownId];
        
        if (
          buttonRef &&
          menuRef &&
          !buttonRef.contains(event.target) &&
          !menuRef.contains(event.target)
        ) {
          setStatusDropdownId(null);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId, statusDropdownId]);

  // Detect changes between original and current order
  const detectChanges = useMemo(() => {
    if (!isEditMode || !originalOrder) {
      return { hasChanges: false, changes: [] };
    }

    const originalLines = originalOrder.lines || [];
    const currentLines = addedLines;
    
    const changes = [];
    
    // Find added items
    currentLines.forEach(currentLine => {
      const originalLine = originalLines.find(orig => 
        orig.id === currentLine.id && 
        orig.brand === currentLine.brand && 
        orig.product === currentLine.product && 
        orig.size === currentLine.size
      );
      
      if (!originalLine) {
        changes.push({
          type: 'ADDED',
          line: currentLine,
          change: `Added new item: ${currentLine.brand} - ${currentLine.product} (${currentLine.size}) - Qty: ${currentLine.qty}`,
        });
      } else if (originalLine.qty !== currentLine.qty) {
        changes.push({
          type: 'MODIFIED',
          line: currentLine,
          original: originalLine,
          change: `Quantity changed: ${currentLine.brand} - ${currentLine.product} (${currentLine.size}) from ${originalLine.qty} to ${currentLine.qty}`,
        });
      }
    });
    
    // Find removed items
    originalLines.forEach(originalLine => {
      const currentLine = currentLines.find(curr => 
        curr.id === originalLine.id && 
        curr.brand === originalLine.brand && 
        curr.product === originalLine.product && 
        curr.size === originalLine.size
      );
      
      if (!currentLine) {
        changes.push({
          type: 'REMOVED',
          line: originalLine,
          change: `Removed: ${originalLine.brand} - ${originalLine.product} (${originalLine.size}) - Qty: ${originalLine.qty}`,
        });
      }
    });
    
    return {
      hasChanges: changes.length > 0,
      changes,
    };
  }, [isEditMode, originalOrder, addedLines]);

  // Timeline calculation helpers
  const getTimelineData = (inventory, toOrder, index) => {
    const today = new Date('2025-11-11');
    const doiGoal = new Date('2026-04-13'); // Updated to 4/13/25 (April 2026)
    const totalDays = Math.ceil((doiGoal - today) / (1000 * 60 * 60 * 24)); // ~154 days
    
    // Based on the image, the bars show:
    // Row 1: green extends to ~30% (middle of Jan), blue fills to goal
    // Row 2: green extends to ~50% (middle of Feb), blue fills to goal  
    // Row 3: green extends to ~50% (middle of Feb), blue fills to goal with +5 indicator
    
    let inventoryPercent, orderPercent;
    if (index === 0) {
      // First row: green to middle of Jan (~30%)
      inventoryPercent = 30;
      orderPercent = 70; // Blue fills rest
    } else if (index === 1) {
      // Second row: green to middle of Feb (~50%)
      inventoryPercent = 50;
      orderPercent = 50;
    } else {
      // Third row: green to middle of Feb (~50%)
      inventoryPercent = 50;
      orderPercent = 50;
    }
    
    return {
      totalDays,
      inventoryPercent,
      orderPercent,
    };
  };

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
    inputBorder: isDarkMode ? 'border-dark-border-primary' : 'border-gray-300',
    inputText: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
  };

  const handleBack = () => {
    navigate('/dashboard/supply-chain/labels');
  };

  const handleAddProduct = (id) => {
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.id === id) {
          const newAdded = !line.added;
          // When adding an item in edit mode, set qty to 2000 if it's 0
          const newQty = (newAdded && isEditOrderMode && (line.qty === 0 || !line.qty)) ? 2000 : line.qty;
          return { ...line, added: newAdded, qty: newQty };
        }
        return line;
      })
    );
  };

  const handleQtyChange = (id, newQty) => {
    const numQty = parseInt(newQty) || 0;
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, qty: numQty } : line
      )
    );
  };

  const handleEditRow = (id, currentQty) => {
    const qtyValue = currentQty || 0;
    // Update state immediately - React will batch these updates
    setOpenMenuId(null);
    setEditingQtyValue(qtyValue.toString());
    setEditingRowId(id);
  };

  const handleDoneEditing = (id) => {
    const qtyValue = parseInt(editingQtyValue) || 0;
    handleQtyChange(id, qtyValue);
    setEditingRowId(null);
    setEditingQtyValue('');
  };

  const handleToggleMenu = (id) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleOpenExportModal = () => {
    setShowExportModal(true);
    setCsvExported(false); // Reset export status when modal opens
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

  // Handle receive button click - check if partial order
  const handleReceiveClick = () => {
    if (!isViewMode || !orderId) return;
    
    const totalItems = orderLines.length;
    const selectedCount = selectedItems.size;
    
    // If all items selected, receive normally
    if (selectedCount === totalItems) {
      handleCompleteOrder();
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
    setOrderStatus('Partially Received');
    setShowPartialOrderModal(false);
    
    // Update order status in OrdersTable
    if (orderId) {
      navigate('/dashboard/supply-chain/labels', {
        state: {
          partialOrderId: orderId,
          partialOrderNumber: orderNumber,
          selectedCount: selectedItems.size,
          totalCount: orderLines.length,
        },
        replace: false,
      });
    }
  };

  // Handle archive button click
  const handleArchiveOrder = () => {
    if (!orderId) return;
    
    navigate('/dashboard/supply-chain/labels', {
      state: {
        archiveOrderId: orderId,
        archiveOrderNumber: orderNumber,
        archiveOrderStatus: orderStatus,
      },
      replace: false,
    });
  };

  const handleCompleteOrder = async () => {
    // If viewing an order (on receivePO tab), mark as received via API
    if (isViewMode && orderId && activeTab === 'receivePO') {
      try {
        const response = await labelsApi.updateOrder(orderId, {
          status: 'received',
          actualDeliveryDate: new Date().toISOString().split('T')[0],
        });
        
        if (response.success) {
          setOrderStatus('Received');
          navigate('/dashboard/supply-chain/labels', {
            state: {
              receivedOrderId: orderId,
              receivedOrderNumber: orderNumber,
            },
            replace: false,
          });
        } else {
          alert(`Failed to update order: ${response.error}`);
        }
      } catch (err) {
        console.error('Error updating order:', err);
        alert('Failed to update order. Please try again.');
      }
      return;
    }
    
    // For new orders
    if (addedLines.length === 0) {
      alert('Please add at least one product to the order');
      return;
    }
    
    try {
      // Calculate totals
      const totalQuantity = addedLines.reduce((sum, line) => sum + (line.toOrder || 0), 0);
      const totalCost = addedLines.reduce((sum, line) => {
        const qty = line.toOrder || 0;
        const cost = line.costPerLabel || 0;
        return sum + (qty * cost);
      }, 0);

      // Create order via API
      const response = await labelsApi.createOrder({
        orderNumber: orderNumber,
        supplier: supplier.name,
        orderDate: new Date().toISOString().split('T')[0],
        totalQuantity: totalQuantity,
        totalCost: totalCost,
        status: 'pending',
        lines: addedLines.map(line => ({
          brand: line.brand,
          product: line.product,
          size: line.size,
          labelSize: line.labelSize,
          quantityOrdered: line.toOrder || 0,
          costPerLabel: line.costPerLabel || 0,
          lineTotal: (line.toOrder || 0) * (line.costPerLabel || 0),
          googleDriveLink: line.googleDriveLink,
        })),
      });

      if (response.success) {
        // Navigate back to labels page with success state
        navigate('/dashboard/supply-chain/labels', {
          state: {
            newLabelOrder: {
              orderNumber,
              supplierName: supplier.name,
              lines: addedLines,
              status: 'Submitted',
            },
          },
          replace: false,
        });
      } else {
        alert(`Failed to create order: ${response.error}`);
      }
    } catch (err) {
      console.error('Error creating label order:', err);
      alert('Failed to create order. Please try again.');
    }
  };

  const handleExportCSV = () => {
    // Generate CSV file
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `TPS_LabelOrder_${orderNumber}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCsvExported(true); // Mark CSV as exported
  };

  const handleAddRecipient = () => {
    if (newRecipientEmail.trim() && !currentRecipients.includes(newRecipientEmail.trim())) {
      const updatedRecipients = [...currentRecipients, newRecipientEmail.trim()];
      setCurrentRecipients(updatedRecipients);
      setNewRecipientEmail('');
    }
  };

  const handleRemoveRecipient = (email) => {
    setCurrentRecipients(currentRecipients.filter(r => r !== email));
    setSelectedRecipients(selectedRecipients.filter(r => r !== email));
  };

  const handleToggleRecipient = (email) => {
    if (selectedRecipients.includes(email)) {
      setSelectedRecipients(selectedRecipients.filter(r => r !== email));
    } else {
      setSelectedRecipients([...selectedRecipients, email]);
    }
  };

  const handleSendToRecipients = () => {
    // Generate CSV with changes
    const csvContent = generateCSV(true);
    
    // Send to selected recipients (in a real app, this would be an API call)
    selectedRecipients.forEach(email => {
      console.log(`Sending CSV to ${email}`);
      // In production, this would send an email with the CSV attachment
    });
    
    // Save recipients for future use
    if (orderId) {
      const allRecipients = [...new Set([...previousRecipients, ...currentRecipients])];
      localStorage.setItem(`labelOrder_${orderId}_recipients`, JSON.stringify(allRecipients));
      setPreviousRecipients(allRecipients);
    }
    
    alert(`CSV with changes has been sent to: ${selectedRecipients.join(', ')}`);
  };

  const handleDone = () => {
    // Save recipients if any were added
    if (currentRecipients.length > 0 && orderId) {
      const allRecipients = [...new Set([...previousRecipients, ...currentRecipients])];
      localStorage.setItem(`labelOrder_${orderId}_recipients`, JSON.stringify(allRecipients));
    }
    
    setShowExportModal(false);
    
    // If editing an order, navigate with edited order data
    if (isEditOrderMode && orderId) {
      const editedLines = orderLines.filter((line) => line.added).map((line) => ({
        ...line,
        added: true,
      }));
      
      navigate('/dashboard/supply-chain/labels', {
        state: {
          editedOrderId: orderId,
          editedOrderNumber: orderNumber,
          editedLines: editedLines,
        },
        replace: false,
      });
    } else {
      // For new orders, navigate with new order data
      // Set status to Draft if no products selected, otherwise Submitted
      const orderStatus = addedLines.length === 0 ? 'Draft' : 'Submitted';
      navigate('/dashboard/supply-chain/labels', {
        state: {
          newLabelOrder: {
            orderNumber: orderNumber,
            supplierName: supplier.name,
            lines: addedLines,
            status: orderStatus,
          },
        },
        replace: false,
      });
    }
  };

  const generateCSV = (includeChanges = true) => {
    const headers = ['Brand', 'Product', 'Size', 'Quantity'];
    
    // Add change indicator column if in edit mode and has changes
    if (isEditMode && detectChanges.hasChanges && includeChanges) {
      headers.push('Change Status');
    }
    
    const rows = addedLines.map(line => {
      const row = [
        line.brand,
        line.product,
        line.size,
        line.qty || 0,
      ];
      
      // Add change indicator if in edit mode
      if (isEditMode && detectChanges.hasChanges && includeChanges) {
        const change = detectChanges.changes.find(c => 
          c.line.id === line.id && 
          c.line.brand === line.brand && 
          c.line.product === line.product && 
          c.line.size === line.size
        );
        
        if (change) {
          if (change.type === 'ADDED') {
            row.push('NEW - Added');
          } else if (change.type === 'MODIFIED') {
            row.push(`MODIFIED - Qty changed from ${change.original.qty} to ${line.qty}`);
          } else {
            row.push('UNCHANGED');
          }
        } else {
          row.push('UNCHANGED');
        }
      }
      
      return row;
    });
    
    // Add change summary at the top if there are changes
    let csvRows = [];
    if (isEditMode && detectChanges.hasChanges && includeChanges) {
      csvRows.push('"CHANGE SUMMARY"');
      csvRows.push(`"Total Changes: ${detectChanges.changes.length}"`);
      detectChanges.changes.forEach(change => {
        csvRows.push(`"${change.change}"`);
      });
      csvRows.push(''); // Empty row separator
      csvRows.push('"ORDER DETAILS"');
      csvRows.push(''); // Empty row separator
    }
    
    csvRows.push(headers.join(','));
    csvRows.push(...rows.map(row => row.map(cell => `"${cell}"`).join(',')));
    
    return csvRows.join('\n');
  };

  // Handle status change
  const handleStatusChange = (lineId, newStatus) => {
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === lineId ? { ...line, labelStatus: newStatus } : line
      )
    );
    setStatusDropdownId(null);
  };

  const renderLabelStatus = (line) => {
    const status = line.labelStatus || 'Up to Date';
    const isUpToDate = status === 'Up to Date';

    return (
      <div className="relative">
            <button
          ref={(el) => (statusButtonRefs.current[line.id] = el)}
              type="button"
          className="inline-flex items-center justify-between h-6 w-[156px] py-1 px-3 rounded border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setStatusDropdownId(statusDropdownId === line.id ? null : line.id);
          }}
        >
                  <div className="flex items-center gap-2">
            {isUpToDate ? (
              <svg className="w-3.5 h-3.5" fill="#10B981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10B981"/>
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="#F97316" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="#F97316"/>
              </svg>
            )}
            <span className="text-gray-700">{status}</span>
                  </div>
          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {statusDropdownId === line.id && (
          <div
            ref={(el) => (statusMenuRefs.current[line.id] = el)}
            className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg text-xs z-50 min-w-[160px]"
          >
              <button
                type="button"
              className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                status === 'Up to Date' ? 'bg-gray-50' : ''
              }`}
              onClick={() => handleStatusChange(line.id, 'Up to Date')}
            >
              <svg className="w-3.5 h-3.5" fill="#10B981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10B981"/>
                  </svg>
              <span className="text-gray-700 font-medium">Up to Date</span>
              </button>
              <button
                type="button"
              className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                status === 'Needs Proofing' ? 'bg-gray-50' : ''
              }`}
              onClick={() => handleStatusChange(line.id, 'Needs Proofing')}
            >
              <svg className="w-3.5 h-3.5" fill="#F97316" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="#F97316"/>
                  </svg>
              <span className="text-gray-700 font-medium">Needs Proofing</span>
              </button>
          </div>
        )}
      </div>
    );
  };


  // Helper function to determine if a tab is completed
  const isTabCompleted = (tabName) => {
    const tabOrder = ['addProducts', 'submitPO', 'receivePO'];
    const activeIndex = tabOrder.indexOf(activeTab);
    const tabIndex = tabOrder.indexOf(tabName);
    return tabIndex < activeIndex;
  };

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
          {/* Left side - Back button and Order Info */}
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
                  LABEL ORDER #
              </div>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 400,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {orderNumber}
                  </div>
                  {/* Partially Received Status Badge */}
                  {isViewMode && orderStatus === 'Partially Received' && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      padding: '4px 12px',
                      height: '24px',
                    }}>
                      {/* Circular icon with bottom half filled orange */}
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: '1.5px solid #F97316',
                        position: 'relative',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}>
                        {/* Bottom half filled with orange */}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '50%',
                          backgroundColor: '#F97316',
                        }} />
                      </div>
                      <span style={{ 
                        fontSize: '14px', 
                        color: '#374151', 
                        fontWeight: 400,
                        lineHeight: '1',
                        whiteSpace: 'nowrap',
                      }}>
                        Partially Received
                      </span>
                    </div>
                  )}
                  {/* Archive Button - show when partially received, beside order number */}
                  {isViewMode && orderStatus === 'Partially Received' && (
                    <button
                      type="button"
                      onClick={handleArchiveOrder}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#007AFF',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#0056CC';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#007AFF';
                      }}
                    >
                      Archive
                    </button>
                  )}
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
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  {supplier.logoSrc && (
                    <img
                      src={supplier.logoSrc}
                      alt={supplier.logoAlt || `${supplier.name} logo`}
                      style={{
                        width: '24px',
                        height: '24px',
                        objectFit: 'contain',
                        objectPosition: 'center',
                      }}
                    />
                  )}
                  <div style={{ 
                    fontSize: '16px', 
                    fontWeight: 400,
                    color: isDarkMode ? '#FFFFFF' : '#000000',
                  }}>
                    {supplier.name}
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
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              aria-label="Settings"
            >
              <svg 
                style={{ width: '20px', height: '20px' }} 
                className={isDarkMode ? 'text-white' : 'text-gray-900'}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>
              </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '0px',
          borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
        }}>
                <button
                  type="button"
            onClick={() => setActiveTab('addProducts')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: activeTab === 'addProducts' ? '#007AFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
              backgroundColor: activeTab === 'addProducts' ? (isDarkMode ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)') : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'addProducts' ? '2px solid #007AFF' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {(isViewMode && orderId && !isEditOrderMode) || showExportModal || isEditOrderMode ? (
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                  </svg>
            )}
            <span>Add Products</span>
                </button>
                <button
                  type="button"
            onClick={() => !isViewMode && setActiveTab('submitPO')}
            disabled={isViewMode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: activeTab === 'submitPO' ? '#007AFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
              backgroundColor: activeTab === 'submitPO' ? (isDarkMode ? 'rgba(0, 122, 255, 0.1)' : 'rgba(0, 122, 255, 0.05)') : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'submitPO' ? '2px solid #007AFF' : '2px solid transparent',
              cursor: isViewMode ? 'not-allowed' : 'pointer',
              opacity: isViewMode ? 0.5 : 1,
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {(isViewMode && orderId && !isEditOrderMode) || showExportModal || isEditOrderMode ? (
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                  </svg>
            )}
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
            {(isViewMode && orderId && !isEditOrderMode) ? (
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            )}
            <span>Receive PO</span>
                </button>
              </div>
            </div>

      {/* Search bar - above table */}
      <div className="px-6 py-4 flex items-center justify-end" style={{ marginTop: '0' }}>
        {/* Legend and Search bar grouped together */}
        <div className="flex items-center gap-4">
          {/* Legend - show when creating or editing an order */}
          {(isCreateMode || isEditOrderMode) && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div 
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#22C55E',
                    borderRadius: '3px',
                    flexShrink: 0,
                  }}
                />
                <span style={{ 
                  color: isDarkMode ? '#D1D5DB' : '#374151',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '1.5',
                }}>
                  Inventory
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div 
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#2563EB',
                    borderRadius: '3px',
                    flexShrink: 0,
                  }}
                />
                <span style={{ 
                  color: isDarkMode ? '#D1D5DB' : '#374151',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '1.5',
                  whiteSpace: 'nowrap',
                }}>
                  # to Order
                </span>
              </div>
            </div>
          )}
          <div className="relative" style={{ maxWidth: '300px', width: '100%' }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-lg mx-6`} style={{ marginTop: '0' }}>
        <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <table
              style={{
              width: '100%',
              borderCollapse: 'collapse',
              borderSpacing: 0,
              margin: 0,
              padding: 0,
            }}
          >
            <thead className={themeClasses.headerBg}>
              <tr style={{ height: 'auto', minHeight: '40px', width: '100%', display: 'table-row' }}>
              {/* Checkbox column when viewing, LABEL STATUS when creating/editing */}
              {(isViewMode && !isEditOrderMode) ? (
                <th
                  className="text-xs font-bold text-white uppercase tracking-wider"
                  style={{
                    paddingTop: '12px',
                    paddingRight: '24px',
                    paddingBottom: '12px',
                    paddingLeft: '24px',
                    height: '40px',
                    maxHeight: '40px',
                    minHeight: '40px',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    borderRight: '1px solid white',
                    borderBottom: '1px solid #3C4656',
                    borderTopLeftRadius: '12px',
                    width: '72px',
                    verticalAlign: 'middle',
                    display: 'table-cell',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.size === orderLines.length && orderLines.length > 0}
                      onChange={handleSelectAll}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                      }}
                    />
                  </div>
                </th>
              ) : (
                <th
                  className="text-xs font-bold text-white uppercase tracking-wider"
                  style={{
                    paddingTop: '12px',
                    paddingRight: '16px',
                    paddingBottom: '12px',
                    paddingLeft: '16px',
                    height: '40px',
                    maxHeight: '40px',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    borderRight: '1px solid white',
                    borderTopLeftRadius: '12px',
                    width: '156px',
                    verticalAlign: 'middle',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <span>LABEL STATUS</span>
                    <img
                      src="/assets/Vector (1).png"
                      alt="Filter"
                      className="w-3 h-3 transition-opacity cursor-pointer opacity-0 group-hover:opacity-100"
                  />
                </div>
                </th>
              )}
              <th
                className="text-xs font-bold text-white uppercase tracking-wider"
                style={{
                  paddingTop: '12px',
                  paddingRight: '16px',
                  paddingBottom: '12px',
                  paddingLeft: '16px',
                  height: '40px',
                  maxHeight: '40px',
                  minHeight: '40px',
                  boxSizing: 'border-box',
                  textAlign: 'left',
                  borderRight: '1px solid white',
                  width: '142px',
                  verticalAlign: 'middle',
                  display: 'table-cell',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '10px' }}>
                  BRAND
                </div>
              </th>
              <th
                className="text-xs font-bold text-white uppercase tracking-wider"
                style={{
                  paddingTop: '12px',
                  paddingRight: '16px',
                  paddingBottom: '12px',
                  paddingLeft: '16px',
                  height: '40px',
                  maxHeight: '40px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  borderRight: '1px solid white',
                  width: '172px',
                  verticalAlign: 'middle',
                }}
              >
                PRODUCT
              </th>
              <th
                className="text-xs font-bold text-white uppercase tracking-wider"
                style={{
                  paddingTop: '12px',
                  paddingRight: '16px',
                  paddingBottom: '12px',
                  paddingLeft: '16px',
                  height: '40px',
                  maxHeight: '40px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  borderRight: '1px solid white',
                  width: '74px',
                  verticalAlign: 'middle',
                }}
              >
                SIZE
              </th>
              {/* ADD column - show in addProducts tab when creating new order or editing order */}
              {(activeTab === 'addProducts' && (!isViewMode || isEditOrderMode)) && (
              <th
                className="text-xs font-bold text-white uppercase tracking-wider relative"
                style={{
                  padding: '12px 16px',
                  height: '40px',
                  maxHeight: '40px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  borderRight: '1px solid white',
                  width: 120,
                  boxShadow: 'inset 4px 0 4px -2px rgba(0, 0, 0, 0.3)',
                  verticalAlign: 'middle',
                }}
              >
                ADD
              </th>
              )}
              <th
                className="text-xs font-bold text-white uppercase tracking-wider"
                style={{
                  paddingTop: '12px',
                  paddingRight: '16px',
                  paddingBottom: '12px',
                  paddingLeft: '16px',
                  height: '40px',
                  maxHeight: '40px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  borderRight: (activeTab === 'addProducts' && (!isViewMode || isEditOrderMode)) ? '1px solid white' : '1px solid #3C4656',
                  borderTopRightRadius: (activeTab === 'addProducts' && (!isViewMode || isEditOrderMode)) ? '0' : ((activeTab === 'submitPO' || activeTab === 'receivePO') && isViewMode) || (isViewMode && activeTab === 'addProducts' && !isEditOrderMode) ? '12px' : '0',
                  width: '139px',
                  verticalAlign: 'middle',
                }}
              >
                QTY
              </th>
              {/* TIMELINE column - show in addProducts tab when creating new order or editing order */}
              {(activeTab === 'addProducts' && (!isViewMode || isEditOrderMode)) && (
              <th
                className="text-xs font-bold text-white uppercase tracking-wider relative"
                style={{
                  paddingTop: '4px',
                  paddingRight: '16px',
                  paddingBottom: '8px',
                  paddingLeft: '16px',
                  height: '50px',
                  minHeight: '50px',
                  boxSizing: 'border-box',
                  textAlign: 'left',
                  verticalAlign: 'middle',
                  borderTopRightRadius: '12px',
                  borderRight: 'none',
                  minWidth: 400,
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                <div style={{ position: 'relative', width: '100%', height: '100%', paddingLeft: '24px', paddingRight: '24px' }}>
                  {/* Timeline line - white horizontal line at bottom */}
                  <div 
                    className="absolute bg-white" 
                    style={{ 
                      left: '24px', 
                      right: '24px', 
                      bottom: '8px',
                      height: '2px' 
                    }}
                  ></div>
                  
                  {/* Today label - both lines above the timeline */}
                  <div className="absolute" style={{ left: '24px', bottom: '8px', transform: 'translate(-50%, 0)' }}>
                    <div className="flex flex-col items-center" style={{ lineHeight: 1.2 }}>
                      <span className="text-[10px] text-white font-bold uppercase" style={{ lineHeight: 1.2, marginBottom: '2px' }}>Today</span>
                      <span className="text-[10px] text-white" style={{ lineHeight: 1.2, marginBottom: '10px' }}>11/11/25</span>
                      <div className="w-2 h-2 rounded-full bg-white" style={{ transform: 'translateY(1px)' }}></div>
                    </div>
                  </div>
                  
                  {/* Month labels - above the timeline */}
                  <div className="absolute" style={{ left: 'calc(24px + 20%)', bottom: '8px', transform: 'translate(-50%, 0)' }}>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-white uppercase" style={{ lineHeight: 1.2, marginBottom: '10px' }}>Dec</span>
                      <div className="w-2 h-2 rounded-full bg-white relative" style={{ border: '1px solid white', backgroundColor: 'transparent', transform: 'translateY(1px)' }}>
                        <div className="absolute inset-0.5 rounded-full" style={{ backgroundColor: '#2C3544' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute" style={{ left: 'calc(24px + 40%)', bottom: '8px', transform: 'translate(-50%, 0)' }}>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-white uppercase" style={{ lineHeight: 1.2, marginBottom: '10px' }}>Jan</span>
                      <div className="w-2 h-2 rounded-full bg-white relative" style={{ border: '1px solid white', backgroundColor: 'transparent', transform: 'translateY(1px)' }}>
                        <div className="absolute inset-0.5 rounded-full" style={{ backgroundColor: '#2C3544' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute" style={{ left: 'calc(24px + 60%)', bottom: '8px', transform: 'translate(-50%, 0)' }}>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-white uppercase" style={{ lineHeight: 1.2, marginBottom: '10px' }}>Feb</span>
                      <div className="w-2 h-2 rounded-full bg-white relative" style={{ border: '1px solid white', backgroundColor: 'transparent', transform: 'translateY(1px)' }}>
                        <div className="absolute inset-0.5 rounded-full" style={{ backgroundColor: '#2C3544' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute" style={{ left: 'calc(24px + 80%)', bottom: '8px', transform: 'translate(-50%, 0)' }}>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-white uppercase" style={{ lineHeight: 1.2, marginBottom: '10px' }}>Mar</span>
                      <div className="w-2 h-2 rounded-full bg-white relative" style={{ border: '1px solid white', backgroundColor: 'transparent', transform: 'translateY(1px)' }}>
                        <div className="absolute inset-0.5 rounded-full" style={{ backgroundColor: '#2C3544' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* DOI Goal label - both lines above the timeline */}
                  <div className="absolute" style={{ right: '24px', bottom: '8px', transform: 'translate(50%, 0)' }}>
                    <div className="flex flex-col items-center" style={{ lineHeight: 1.2 }}>
                      <div className="flex items-center gap-1" style={{ marginBottom: '2px' }}>
                        <span className="text-[10px] text-white font-bold uppercase" style={{ lineHeight: 1.2 }}>DOI Goal</span>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 3L4 5L6 3" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="text-[10px] text-white" style={{ lineHeight: 1.2, marginBottom: '10px' }}>4/13/25</span>
                      <div className="w-2 h-2 rounded-full bg-white" style={{ transform: 'translateY(1px)' }}></div>
                    </div>
                  </div>
                  
                  {/* Filter icon - far right, aligned with timeline */}
                  <div className="absolute" style={{ right: '16px', bottom: '8px', transform: 'translateY(50%)' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 1L8 3H4L6 1Z" fill="white"/>
                      <path d="M1 4H11" stroke="white" strokeWidth="1"/>
                    </svg>
                  </div>
                </div>
              </th>
              )}
              
              {/* Ellipsis column - show when viewing order */}
              {(isViewMode && !isEditOrderMode) && (
                <th
                  className="text-xs font-bold text-white uppercase tracking-wider"
                  style={{
                    paddingTop: '12px',
                    paddingRight: '16px',
                    paddingBottom: '12px',
                    paddingLeft: '16px',
                    height: '40px',
                    maxHeight: '40px',
                    minHeight: '40px',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    borderTopRightRadius: '12px',
                    width: '60px',
                    verticalAlign: 'middle',
                    display: 'table-cell',
                  }}
                >
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredLines.length === 0 ? (
              <tr>
                <td colSpan={
                  isViewMode 
                    ? (activeTab === 'addProducts' && isEditOrderMode ? 7 : (isViewMode && !isEditOrderMode ? 7 : 6))
                    : (activeTab === 'addProducts' ? 7 : 6)
                } className="px-6 py-6 text-center text-sm italic text-gray-400">
                  No items available.
                </td>
              </tr>
            ) : (
              filteredLines.map((line, index) => {
                const timelineData = (!isViewMode || isEditOrderMode) ? getTimelineData(line.inventory, line.toOrder, index) : null;
                const displayedRows = filteredLines;
                
                return (
                  <tr 
                    key={line.id}
                    className={`text-sm ${themeClasses.rowHover} transition-colors border-t`}
                    style={{
                      height: '32px',
                      maxHeight: '32px',
                      minHeight: '32px',
                      lineHeight: '32px',
                      borderTop: index === 0 ? 'none' : (isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid #e5e7eb'),
                    }}
                  >
                    {/* Checkbox when viewing, LABEL STATUS when creating/editing */}
                    {(isViewMode && !isEditOrderMode) ? (
                      <td style={{ paddingTop: '8px', paddingRight: '24px', paddingBottom: '8px', paddingLeft: '24px', height: '32px', maxHeight: '32px', minHeight: '32px', verticalAlign: 'middle', lineHeight: '1', boxSizing: 'border-box', width: '72px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(line.id)}
                          onChange={(e) => handleCheckboxChange(line.id, e.target.checked)}
                          style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer',
                          }}
                        />
                      </td>
                    ) : (
                      <td style={{ paddingTop: '8px', paddingRight: '16px', paddingBottom: '8px', paddingLeft: '16px', fontSize: '0.85rem', height: '32px', maxHeight: '32px', minHeight: '32px', verticalAlign: 'middle', lineHeight: '1', boxSizing: 'border-box', width: '156px', textAlign: 'left' }}>
                        {renderLabelStatus(line)}
                      </td>
                    )}

                    {/* BRAND */}
                    <td style={{ 
                      paddingTop: '8px',
                      paddingRight: '16px',
                      paddingBottom: '8px',
                      paddingLeft: '16px',
                      fontSize: '0.85rem', 
                      height: '32px', 
                      maxHeight: '32px', 
                      minHeight: '32px', 
                      verticalAlign: 'middle', 
                      lineHeight: '1', 
                      boxSizing: 'border-box',
                      width: '142px',
                      textAlign: 'left',
                    }} className={themeClasses.textPrimary}>
                      {line.brand}
                    </td>

                    {/* PRODUCT - blue clickable link */}
                    <td style={{ 
                      paddingTop: '8px',
                      paddingRight: '16px',
                      paddingBottom: '8px',
                      paddingLeft: '16px',
                      fontSize: '0.85rem', 
                      height: '32px', 
                      maxHeight: '32px', 
                      minHeight: '32px', 
                      verticalAlign: 'middle', 
                      lineHeight: '1', 
                      boxSizing: 'border-box',
                      width: '172px',
                      textAlign: 'left',
                    }}>
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
                        onClick={() => {
                          // Navigate to product detail if needed
                        }}
                      >
                        {line.product}
                      </button>
                    </td>

                    {/* SIZE */}
                    <td style={{ 
                      paddingTop: '8px',
                      paddingRight: '16px',
                      paddingBottom: '8px',
                      paddingLeft: '16px',
                      fontSize: '0.85rem', 
                      height: '32px', 
                      maxHeight: '32px', 
                      minHeight: '32px', 
                      verticalAlign: 'middle', 
                      lineHeight: '1', 
                      boxSizing: 'border-box',
                      width: '74px',
                      textAlign: 'left',
                    }} className={themeClasses.textSecondary}>
                      {line.size}
                    </td>

                    {/* ADD - only show in addProducts tab when creating new order or in edit order mode (not when viewing) */}
                    {(activeTab === 'addProducts' && (!isViewMode || isEditOrderMode)) && (
                    <td style={{ paddingTop: '8px', paddingRight: '16px', paddingBottom: '8px', paddingLeft: '16px', textAlign: 'center', height: '32px', maxHeight: '32px', minHeight: '32px', verticalAlign: 'middle', lineHeight: '1', boxShadow: 'inset 4px 0 8px -4px rgba(0, 0, 0, 0.15)', boxSizing: 'border-box', width: '120px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          // In view mode (not editing), don't allow toggling
                          if (isViewMode && !isEditOrderMode) return;
                          handleAddProduct(line.id);
                        }}
                        disabled={isViewMode && !isEditOrderMode}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: line.added ? '0' : '10px',
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
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          cursor: (isViewMode && !isEditOrderMode) ? 'default' : 'pointer',
                          transition: 'background-color 0.2s',
                          boxShadow: line.added ? '0 1px 3px 0 rgba(0, 0, 0, 0.2)' : 'none',
                          width: '72px',
                          height: '24px',
                          maxWidth: '72px',
                          maxHeight: '24px',
                          minWidth: '72px',
                          minHeight: '24px',
                          boxSizing: 'border-box',
                        }}
                        onMouseEnter={(e) => {
                          if (!(isViewMode && !isEditOrderMode)) {
                            e.target.style.backgroundColor = line.added ? '#16A34A' : '#2563EB';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!(isViewMode && !isEditOrderMode)) {
                            e.target.style.backgroundColor = line.added ? '#22C55E' : '#3B82F6';
                          }
                        }}
                      >
                        {!line.added && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7 1V13M1 7H13" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        )}
                        <span>{line.added ? 'Added' : 'Add'}</span>
                      </button>
                    </td>
                    )}

                    {/* QTY */}
                    <td style={{ 
                      paddingTop: '8px',
                      paddingRight: '16px',
                      paddingBottom: '8px',
                      paddingLeft: '16px',
                      textAlign: 'left', 
                      height: '32px', 
                      maxHeight: '32px', 
                      minHeight: '32px', 
                      verticalAlign: 'middle', 
                      lineHeight: '1', 
                      boxSizing: 'border-box',
                      width: '139px',
                    }}>
                      {((activeTab === 'submitPO' || activeTab === 'receivePO') && isViewMode) ? (
                        editingRowId === line.id ? (
                          <div
                      style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#F3F4F6',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              padding: '4px 12px',
                              minWidth: '120px',
                              height: '32px',
                              boxSizing: 'border-box',
                              position: 'relative',
                      }}
                    >
                      <input
                              ref={editingRowId === line.id ? qtyInputRef : null}
                              type="text"
                              inputMode="numeric"
                              value={editingRowId === line.id ? editingQtyValue : String(line.qty || 0)}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (editingRowId !== line.id) return;
                                const newValue = e.target.value.replace(/[^0-9]/g, '');
                                setEditingQtyValue(newValue);
                                const numValue = newValue === '' ? 0 : parseInt(newValue) || 0;
                                setOrderLines((prev) =>
                                  prev.map((l) =>
                                    l.id === line.id ? { ...l, qty: numValue } : l
                                  )
                                );
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              onFocus={(e) => {
                                e.stopPropagation();
                                e.target.select();
                              }}
                              onBlur={(e) => {
                                e.stopPropagation();
                                const value = parseInt(e.target.value) || 0;
                                handleQtyChange(line.id, value);
                                setEditingQtyValue(String(value));
                              }}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleDoneEditing(line.id);
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setEditingRowId(null);
                                  setEditingQtyValue('');
                                }
                              }}
                              style={{ 
                                color: '#000000', 
                                fontSize: '14px', 
                                fontWeight: 400,
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                border: 'none',
                                background: 'transparent',
                                width: '100%',
                                textAlign: 'center',
                                outline: 'none',
                                padding: 0,
                                margin: 0,
                                cursor: 'text',
                                WebkitAppearance: 'none',
                                MozAppearance: 'textfield',
                                pointerEvents: 'auto',
                                zIndex: 1000,
                              }}
                              autoFocus
                      />
                    </div>
                        ) : (
                    <div 
                      style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#F3F4F6',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              padding: '4px 12px',
                              minWidth: '80px',
                              height: '28px',
                              boxSizing: 'border-box',
                            }}
                          >
                            <span style={{ 
                              color: '#000000', 
                              fontSize: '14px', 
                              fontWeight: 400,
                              fontFamily: 'system-ui, -apple-system, sans-serif',
                            }}>
                              {line.qty ? line.qty.toLocaleString() : '0'}
                            </span>
                    </div>
                        )
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                    <div 
                      style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: editingRowId === line.id ? '#FFFBEB' : '#ffffff',
                            border: editingRowId === line.id ? '2px solid #F59E0B' : '1px solid #E5E7EB',
                            borderRadius: '8px',
                            paddingTop: editingRowId === line.id ? '3px' : '4px',
                            paddingRight: '6px',
                            paddingBottom: editingRowId === line.id ? '3px' : '4px',
                            paddingLeft: '6px',
                            boxShadow: editingRowId === line.id ? '0 0 0 3px rgba(245, 158, 11, 0.1)' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                            width: '107px',
                            height: '24px',
                            boxSizing: 'border-box',
                            transition: 'all 0.2s',
                          }}
                        >
                          <input
                            type="number"
                            value={line.qty || 0}
                            onChange={(e) => handleQtyChange(line.id, e.target.value)}
                            onBlur={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              handleQtyChange(line.id, value);
                            }}
                            readOnly={!isEditOrderMode}
                            style={{ 
                              color: editingRowId === line.id ? '#92400E' : '#000000', 
                              fontSize: '14px', 
                              fontWeight: editingRowId === line.id ? 500 : 400,
                              fontFamily: 'system-ui, -apple-system, sans-serif',
                              border: 'none',
                              background: 'transparent',
                              width: '100%',
                              textAlign: 'center',
                              outline: 'none',
                              padding: 0,
                              margin: 0,
                              MozAppearance: 'textfield',
                              cursor: isEditOrderMode ? 'text' : 'default',
                            }}
                            className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            min="0"
                          />
                    </div>
                          {/* Show qty difference in edit order mode */}
                          {isEditOrderMode && getQtyDifference(line) && (
                            <span 
                              style={{ 
                                color: getQtyDifference(line).startsWith('+') ? '#22C55E' : '#EF4444',
                                fontSize: '12px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {getQtyDifference(line)}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Timeline - show in addProducts tab when creating new order or editing order */}
                    {(activeTab === 'addProducts' && (!isViewMode || isEditOrderMode)) && (
                    <td style={{ paddingTop: '8px', paddingRight: '16px', paddingBottom: '8px', paddingLeft: '16px', width: '400px', height: '32px', maxHeight: '32px', minHeight: '32px', verticalAlign: 'middle', lineHeight: '1', boxSizing: 'border-box', position: 'relative', backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF' }}>
                      {timelineData && (
                    <div 
                      style={{
                            position: 'relative',
                            width: '100%',
                            height: '32px',
                            paddingLeft: '24px',
                            paddingRight: '24px',
                          }}
                        >
                          {/* Progress bar container - spans from Today to DOI Goal */}
                          <div
                            style={{
                              position: 'absolute',
                              left: '24px',
                              right: '24px',
                              bottom: '4px',
                              height: '14px',
                              display: 'flex',
                              borderRadius: '9999px',
                              overflow: 'hidden',
                            }}
                          >
                            {/* Green segment (Inventory) - rounded left end */}
                            <div
                              style={{
                                width: `${timelineData.inventoryPercent}%`,
                                backgroundColor: '#22C55E',
                                height: '100%',
                                borderRadius: timelineData.orderPercent > 0 ? '9999px 0 0 9999px' : '9999px',
                              }}
                            />
                            {/* Blue segment (# to Order) - rounded right end */}
                            <div
                              style={{
                                width: `${timelineData.orderPercent}%`,
                                backgroundColor: '#2563EB',
                                height: '100%',
                                borderRadius: timelineData.inventoryPercent > 0 ? '0 9999px 9999px 0' : '9999px',
                              }}
                            />
                          </div>

                          {/* +5 indicator - above Feb position (only for row 3) */}
                          {index === 2 && (
                            <div
                              style={{
                                position: 'absolute',
                                left: 'calc(24px + 60%)',
                                top: '2px',
                                transform: 'translateX(-50%)',
                                fontSize: '10px',
                                color: '#2563EB',
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              +5
                            </div>
                          )}

                          {/* Month markers with dashed lines - only dashed lines, no circles */}
                          <div className="absolute" style={{ left: 'calc(24px + 20%)', bottom: '8px', transform: 'translateX(-50%)' }}>
                            {/* Vertical dashed line above */}
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '8px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '1px',
                                height: '12px',
                                borderLeft: '1px dashed #9CA3AF',
                                opacity: 0.6,
                              }}
                            />
                          </div>
                          <div className="absolute" style={{ left: 'calc(24px + 40%)', bottom: '8px', transform: 'translateX(-50%)' }}>
                            {/* Vertical dashed line above */}
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '8px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '1px',
                                height: '12px',
                                borderLeft: '1px dashed #9CA3AF',
                                opacity: 0.6,
                              }}
                            />
                          </div>
                          <div className="absolute" style={{ left: 'calc(24px + 60%)', bottom: '8px', transform: 'translateX(-50%)' }}>
                            {/* Vertical dashed line above */}
                            <div
                              style={{
                                position: 'absolute',
                                bottom: '8px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '1px',
                                height: '12px',
                                borderLeft: '1px dashed #9CA3AF',
                                opacity: 0.6,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                    )}
                    
                    {/* Ellipsis menu - show when viewing order */}
                    {(isViewMode && !isEditOrderMode) && (
                      <td style={{ 
                        paddingTop: '8px', 
                        paddingRight: '16px', 
                        paddingBottom: '8px', 
                        paddingLeft: '16px', 
                        height: '32px', 
                        maxHeight: '32px', 
                        minHeight: '32px', 
                        verticalAlign: 'middle', 
                        lineHeight: '1', 
                        boxSizing: 'border-box', 
                        width: '60px',
                        textAlign: 'center',
                        position: 'relative',
                      }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleMenu(line.id);
                          }}
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
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="8" cy="4" r="1.5" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                            <circle cx="8" cy="8" r="1.5" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                            <circle cx="8" cy="12" r="1.5" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                          </svg>
                        </button>
                        
                        {/* Dropdown menu */}
                        {openMenuId === line.id && (
                          <div
                            ref={(el) => {
                              if (el) {
                                const menuRefs = statusMenuRefs.current || {};
                                menuRefs[line.id] = el;
                                statusMenuRefs.current = menuRefs;
                              }
                            }}
                            style={{
                              position: 'absolute',
                              right: '100%',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              marginRight: '8px',
                              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                              border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                              borderRadius: '6px',
                              boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
                              zIndex: 1000,
                              padding: '2px',
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Handle edit action
                                setOpenMenuId(null);
                              }}
                              style={{
                                width: '100%',
                                padding: '4px 8px',
                                textAlign: 'left',
                                background: 'transparent',
                                border: 'none',
                                color: isDarkMode ? '#F9FAFB' : '#111827',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                gap: '6px',
                                borderRadius: '4px',
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                              }}
                            >
                              {/* Pencil/Edit icon */}
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path 
                                  d="M11.333 2.667a1.333 1.333 0 0 1 1.886 0l.781.781a1.333 1.333 0 0 1 0 1.886l-8.5 8.5a1.333 1.333 0 0 1-.943.39H2.667a1.333 1.333 0 0 1-1.334-1.333v-1.608a1.333 1.333 0 0 1 .39-.943l8.5-8.5zm1.057 2.276l-.781-.781-8.5 8.5v.781h.781l8.5-8.5z" 
                                  fill={isDarkMode ? '#9CA3AF' : '#6B7280'}
                                />
                              </svg>
                              <span>Edit</span>
                            </button>
                          </div>
                        )}
                      </td>
                    )}

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
                    </div>

      {/* Legend */}
      {!isViewMode && (
      <div className="px-6 py-2 flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#00D084' }} />
          <span>Inventory</span>
                    </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#0066FF' }} />
          <span># to Order</span>
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
          {/* Summary Table - Show in addProducts, receivePO tabs, and edit mode */}
          {(activeTab === 'addProducts' || activeTab === 'receivePO' || isEditOrderMode) && (
            <div style={{ flex: 1 }}>
              <table
                style={{
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  backgroundColor: 'transparent',
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: '8px 16px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      PRODUCTS
                    </th>
                    <th
                      style={{
                        padding: '8px 16px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      TOTAL LABELS
                    </th>
                    <th
                      style={{
                        padding: '8px 16px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      EST COST
                    </th>
                    <th
                      style={{
                        padding: '8px 16px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      5" X 8"
                    </th>
                    <th
                      style={{
                        padding: '8px 16px',
                        textAlign: 'left',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      5.375" X 4.5"
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: isDarkMode ? '#F9FAFB' : '#1F2937',
                      }}
                    >
                      {summary.products}
                    </td>
                    <td
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: isDarkMode ? '#F9FAFB' : '#1F2937',
                      }}
                    >
                      {summary.totalLabels.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: isDarkMode ? '#F9FAFB' : '#1F2937',
                      }}
                    >
                      ${summary.estCost.toFixed(2)}
                    </td>
                    <td
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: isDarkMode ? '#F9FAFB' : '#1F2937',
                      }}
                    >
                      {summary.size5x8.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: isDarkMode ? '#F9FAFB' : '#1F2937',
                      }}
                    >
                      {summary.size5375x45.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Edit Order Mode Buttons */}
            {isEditOrderMode ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 text-xs font-semibold transition-colors"
                  style={{
                    backgroundColor: 'transparent',
                    color: '#6B7280',
                    padding: '8px 12px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  Cancel Edit
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="inline-flex items-center gap-2 text-xs font-semibold rounded-lg px-4 py-2 transition-colors"
                  style={{
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0056CC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#007AFF';
                  }}
                >
                  Save Changes
                </button>
              </>
            ) : (
              <>
                {/* View Mode - Edit Order button */}
                {isViewMode && !isEditOrderMode && (
                  <button
                    type="button"
                    onClick={handleEditOrder}
                    className="inline-flex items-center gap-2 text-xs font-semibold transition-colors"
                    style={{
                      backgroundColor: 'transparent',
                      color: '#6B7280',
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Order
                  </button>
                )}
                
                {/* Export button */}
                {!isViewMode && (
                  <button
                    type="button"
                    onClick={handleOpenExportModal}
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
                )}
                
                {/* Complete/Receive Order button */}
                <button
                  type="button"
                  onClick={isViewMode ? handleReceiveClick : handleCompleteOrder}
                  disabled={isViewMode && activeTab === 'receivePO' && selectedItems.size === 0}
                  className="inline-flex items-center gap-2 text-xs font-semibold rounded-lg px-4 py-2 transition-colors"
                  style={{
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                    cursor: (isViewMode && activeTab === 'receivePO' && selectedItems.size === 0) ? 'not-allowed' : 'pointer',
                    opacity: (isViewMode && activeTab === 'receivePO' && selectedItems.size === 0) ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!(isViewMode && activeTab === 'receivePO' && selectedItems.size === 0)) {
                      e.currentTarget.style.backgroundColor = '#0056CC';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(isViewMode && activeTab === 'receivePO' && selectedItems.size === 0)) {
                      e.currentTarget.style.backgroundColor = '#007AFF';
                    }
                  }}
                >
                  {activeTab === 'receivePO' ? 'Receive Order' : 'Complete Order'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              width: '480px',
              maxWidth: '90vw',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#000000', margin: 0 }}>
                Export Label Order
              </h2>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#6B7280" />
                </svg>
              </button>
                    </div>


            {/* File Display */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  backgroundColor: '#E0F2FE', // Light blue background
                  borderRadius: '8px',
                  border: '1px solid #007AFF',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                    fill="#007AFF"
                  />
                  <path d="M14 2V8H20" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span
                  style={{
                    color: '#007AFF',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  TPS_LabelOrder_{orderNumber}.csv
                </span>
              </div>
            </div>

            {/* Warning Message - Show when editing order with changes */}
            {isEditOrderMode && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '8px', 
                marginBottom: '24px',
              }}>
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  style={{ 
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                >
                  <circle cx="12" cy="12" r="10" fill="#F59E0B" />
                  <path 
                    d="M12 9V13M12 17H12.01" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span style={{ 
                  color: '#6B7280',
                  fontSize: '14px',
                  lineHeight: '1.5',
                }}>
                  You've saved label order changes. Please export and resubmit the PO before continuing.
                </span>
              </div>
            )}

            {/* Informational Message - Show when not editing */}
            {!isEditOrderMode && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '8px', 
                marginBottom: '24px',
              }}>
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  style={{ 
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                >
                  <circle cx="12" cy="12" r="10" fill="#2563EB" />
                  <path 
                    d="M12 16V12M12 8H12.01" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span style={{ 
                  color: '#374151',
                  fontSize: '14px',
                  lineHeight: '1.5',
                }}>
                  After submitting to your supplier, click Complete Order to finalize.
                </span>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleExportCSV}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'transparent',
                  color: '#007AFF',
                  border: 'none',
                  padding: '0',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  e.target.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.target.style.textDecoration = 'none';
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2">
                  <path d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Export as CSV
              </button>
              <button
                type="button"
                onClick={handleDone}
                disabled={isEditOrderMode && !csvExported}
                style={{
                  backgroundColor: (isEditOrderMode && csvExported) ? '#0066FF' : '#9CA3AF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: (isEditOrderMode && !csvExported) ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s',
                  opacity: (isEditOrderMode && !csvExported) ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!(isEditOrderMode && !csvExported)) {
                    e.target.style.backgroundColor = (isEditOrderMode && csvExported) ? '#0052CC' : '#6B7280';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(isEditOrderMode && !csvExported)) {
                    e.target.style.backgroundColor = (isEditOrderMode && csvExported) ? '#0066FF' : '#9CA3AF';
                  }
                }}
              >
                Done
              </button>
      </div>
          </div>
        </div>
      )}

      {/* Partial Order Confirmation Modal */}
      {showPartialOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" style={{ padding: '32px' }}>
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#FED7AA',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-4">
              Partial Order Confirmation
            </h2>

            {/* Message */}
            <p className="text-sm text-gray-600 text-center mb-8">
              You've selected {selectedItems.size} of {orderLines.length} items to receive. The remaining items will not be updated within your inventory.
            </p>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPartialOrderModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmPartialOrder}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
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

export default LabelOrderPage;

