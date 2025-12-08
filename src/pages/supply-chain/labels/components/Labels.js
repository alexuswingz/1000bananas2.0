import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import InventoryTable from './InventoryTable';
import OrdersTable from './OrdersTable';
import ArchivedOrdersTable from './ArchivedOrdersTable';

const Labels = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('inventory'); // Default to 'inventory' tab
  const [search, setSearch] = useState('');

  // New order state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  // Row actions & settings
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const [isLabelsSettingsModalOpen, setIsLabelsSettingsModalOpen] = useState(false);
  const [doiGoal, setDoiGoal] = useState('196');
  const [showDoiTooltip, setShowDoiTooltip] = useState(false);

  // Create bottle modal state
  const [isCreateBottleOpen, setIsCreateBottleOpen] = useState(false);
  const [newBottleName, setNewBottleName] = useState('');
  const [newBottleWarehouseInv, setNewBottleWarehouseInv] = useState('');
  const [newBottleSupplierInv, setNewBottleSupplierInv] = useState('');
  const [newBottleImageLink, setNewBottleImageLink] = useState('');
  const [createBottleTab, setCreateBottleTab] = useState('core');
  const [createBottleSearch, setCreateBottleSearch] = useState('');

  const getCreateHighlightClass = (value) => {
    if (!createBottleSearch) return '';
    const v = (value ?? '').toString().toLowerCase();
    const q = createBottleSearch.toLowerCase();
    return v && v.includes(q) ? ' border-blue-400 ring-2 ring-blue-200' : '';
  };

  // Refs for table components
  const inventoryTableRef = React.useRef(null);
  const archivedOrdersTableRef = React.useRef(null);
  const ordersTableRef = React.useRef(null);

  // Notification state
  const [notification, setNotification] = useState(null);

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

  const suppliers = [
    {
      id: 'logo1',
      name: 'Richmark Label',
      logoSrc: '/assets/Logo1.png',
      logoAlt: 'Richmark Label logo',
    },
  ];

  const handleCreateOrder = () => {
    if (!orderNumber.trim() || !selectedSupplier) {
      return;
    }

    setIsNewOrderOpen(false);

    // Navigate to label order page - LabelOrderPage will fetch labels from API
    navigate('/dashboard/supply-chain/labels/order', {
      state: {
        orderNumber: orderNumber.trim(),
        supplier: selectedSupplier,
        mode: 'create',
      },
    });
  };

  // Handle new order from LabelOrderPage
  useEffect(() => {
    const newOrderState = location.state && location.state.newLabelOrder;
    if (newOrderState) {
      const { orderNumber: newOrderNumber } = newOrderState;
      
      // Show green banner notification (matching received order style)
      setNotification({
        message: `${newOrderNumber} label order complete`,
        type: 'success',
      });

      // Auto-dismiss notification after 5 seconds
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      
      // Switch to orders tab
      setActiveTab('orders');
      
      // Clear navigation state
      if (window.history && window.history.replaceState) {
        window.history.replaceState({ ...location.state, newLabelOrder: null }, '');
      }

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Handle received order from LabelOrderPage
  useEffect(() => {
    const receivedOrderId = location.state && location.state.receivedOrderId;
    const receivedOrderNumber = location.state && location.state.receivedOrderNumber;
    
    if (receivedOrderId && receivedOrderNumber) {
      // Show green banner notification (matching the image style)
      setNotification({
        message: `${receivedOrderNumber} label order received`,
        type: 'success',
      });

      // Auto-dismiss notification after 5 seconds
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);

      // Switch to archive tab
      setActiveTab('archive');

      // Clear navigation state
      if (window.history && window.history.replaceState) {
        window.history.replaceState({ ...location.state, receivedOrderId: null, receivedOrderNumber: null }, '');
      }

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Handle partial order from LabelOrderPage
  useEffect(() => {
    const partialOrderId = location.state && location.state.partialOrderId;
    const partialOrderNumber = location.state && location.state.partialOrderNumber;
    const selectedCount = location.state && location.state.selectedCount;
    const totalCount = location.state && location.state.totalCount;
    
    if (partialOrderId && partialOrderNumber) {
      // Update order status to "Partially Received" in OrdersTable
      if (ordersTableRef.current && ordersTableRef.current.updateOrder) {
        ordersTableRef.current.updateOrder(partialOrderId, {
          status: 'Partially Received',
        });
      }

      // Show notification
      setNotification({
        message: `${partialOrderNumber} label order partially received (${selectedCount} of ${totalCount} items)`,
        type: 'success',
      });

      // Auto-dismiss notification after 5 seconds
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);

      // Clear navigation state
      if (window.history && window.history.replaceState) {
        window.history.replaceState({ ...location.state, partialOrderId: null, partialOrderNumber: null, selectedCount: null, totalCount: null }, '');
      }

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Handle archive order from LabelOrderPage
  useEffect(() => {
    const archiveOrderId = location.state && location.state.archiveOrderId;
    const archiveOrderNumber = location.state && location.state.archiveOrderNumber;
    const archiveOrderStatus = location.state && location.state.archiveOrderStatus;
    
    if (archiveOrderId && archiveOrderNumber) {
      // Archive the order
      if (ordersTableRef.current && ordersTableRef.current.archiveOrder) {
        const order = ordersTableRef.current.getOrderById(archiveOrderId);
        if (order) {
          ordersTableRef.current.archiveOrder({
            ...order,
            status: archiveOrderStatus || 'Partially Received',
          });
        }
      }

      // Switch to archive tab
      setActiveTab('archive');

      // Clear navigation state
      if (window.history && window.history.replaceState) {
        window.history.replaceState({ ...location.state, archiveOrderId: null, archiveOrderNumber: null, archiveOrderStatus: null }, '');
      }
    }
  }, [location.state]);

  // Handle edited order from LabelOrderPage
  useEffect(() => {
    const editedOrderId = location.state && location.state.editedOrderId;
    const editedOrderNumber = location.state && location.state.editedOrderNumber;
    const editedLines = location.state && location.state.editedLines;
    
    if (editedOrderId && editedOrderNumber && editedLines) {
      // Update the order in ordersTableRef and mark it as edited
      if (ordersTableRef.current && ordersTableRef.current.updateOrder) {
        ordersTableRef.current.updateOrder(editedOrderId, {
          lines: editedLines,
          isEdited: true, // Mark order as edited
        });
      }
      
      // Show green banner notification with edit icon
      setNotification({
        message: `${editedOrderNumber} label order edited`,
        type: 'edit',
      });

      // Auto-dismiss notification after 5 seconds
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);

      // Switch to orders tab
      setActiveTab('orders');

      // Clear navigation state
      if (window.history && window.history.replaceState) {
        window.history.replaceState({ ...location.state, editedOrderId: null, editedOrderNumber: null, editedLines: null }, '');
      }

      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const handleViewOrder = (order) => {
    // Map the simple supplier name on the order back to the full supplier meta
    const supplierMeta =
      suppliers.find((s) => s.name === order.supplier) ||
      suppliers[0] || {
        id: 'unknown',
        name: order.supplier,
        logoSrc: '',
        logoAlt: order.supplier,
      };

    navigate('/dashboard/supply-chain/labels/order', {
      state: {
        orderNumber: order.orderNumber,
        supplier: supplierMeta,
        mode: 'view',
        orderId: order.id,
        lines: order.lines || [], // Pass the saved lines data
        status: order.status || 'Draft', // Pass the order status
      },
    });
  };

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`} style={{ padding: '24px' }}>
      {/* Green notification popup - for create new order and receive order */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: '#F0FDF4', // Very light green background
            borderRadius: '12px',
            paddingTop: '8px',
            paddingRight: '12px',
            paddingBottom: '8px',
            paddingLeft: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', // Subtle drop shadow
            gap: '24px',
            maxWidth: '317px',
            width: 'fit-content',
            height: '36px',
            boxSizing: 'border-box',
            pointerEvents: 'auto', // Ensure notification itself is clickable
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Circular icon - checkmark for success, pencil for edit */}
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#22C55E', // Vibrant green
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {notification.type === 'edit' ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#FFFFFF" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#FFFFFF" />
                </svg>
              )}
            </div>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 400,
                color: '#16A34A', // Medium green text
                fontFamily: 'system-ui, -apple-system, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              {notification.message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280', // Dark gray
              flexShrink: 0,
            }}
            aria-label="Dismiss notification"
            onMouseEnter={(e) => {
              e.target.style.color = '#4B5563';
            }}
            onMouseLeave={(e) => {
              e.target.style.color = '#6B7280';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex items-center justify-between" style={{ paddingBottom: '16px' }}>
        <div className="flex items-center space-x-4">
          {/* Home icon in dark pill */}
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1f2937] text-white shadow-sm">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10.5L12 4l9 6.5M5 10.5V20h5v-4h4v4h5v-9.5"
              />
            </svg>
          </div>
          
          {/* Title + tabs group */}
          <div className="flex items-center space-x-5">
            <h1 className="text-xl font-semibold text-gray-900">Labels</h1>
            
            {/* Tabs as pill group */}
            <div className="flex items-center rounded-full border border-gray-200 bg-white/70 dark:bg-dark-bg-tertiary">
            {['inventory', 'orders', 'archive'].map((tabKey, index) => {
              const labelMap = {
                inventory: 'Inventory',
                orders: 'Orders',
                archive: 'Archive',
              };
              const label = labelMap[tabKey];
              const isActive = activeTab === tabKey;

              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white font-semibold shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 font-medium'
                  } ${index === 0 ? 'ml-1' : ''} ${index === 2 ? 'mr-1' : ''}`}
                >
                  {label}
                </button>
              );
            })}
            </div>
          </div>
        </div>

        {/* Right: Search + Settings + New Order */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative w-80">
            <input
              type="text"
              placeholder="Find an order..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${themeClasses.inputBg} ${themeClasses.textPrimary} ${themeClasses.border} border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all pl-9 pr-9 py-1.5 w-full shadow-sm`}
            />
            <svg
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${themeClasses.textSecondary}`}
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
            {/* Dropdown caret */}
            <svg
              className={`absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 ${themeClasses.textSecondary}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Settings button + menu */}
          <div className="relative">
            <button
              type="button"
              className={`${themeClasses.inputBg} ${themeClasses.border} border rounded-full p-2 flex items-center justify-center hover:shadow-sm transition`}
              aria-label="Settings"
              onClick={() => setIsSettingsMenuOpen((prev) => !prev)}
            >
              <svg
                className={`${themeClasses.textSecondary} w-4 h-4`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.757.426 1.757 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.757-2.924 1.757-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.757-.426-1.757-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {isSettingsMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg text-xs z-30">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700"
                  onClick={() => {
                    setIsLabelsSettingsModalOpen(true);
                    setIsSettingsMenuOpen(false);
                  }}
                >
                  <span className="text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.757.426 1.757 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.757-2.924 1.757-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.757-.426-1.757-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.572-1.065z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  Settings
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700"
                  onClick={() => {
                    setIsSettingsMenuOpen(false);
                    setIsCreateBottleOpen(true);
                    setNewBottleName('');
                    setNewBottleWarehouseInv('');
                    setNewBottleSupplierInv('');
                    setCreateBottleTab('core');
                  }}
                >
                  <span className="text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                  Create new label
                </button>
              </div>
            )}
          </div>

          {/* Cycle Counts button - only show in inventory tab */}
          {activeTab === 'inventory' && (
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg px-5 py-2 shadow-md transition"
              onClick={() => navigate('/dashboard/supply-chain/labels/cycle-counts')}
            >
              Cycle Counts
            </button>
          )}
          
          {/* New Order button */}
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg px-5 py-2 shadow-md transition"
            onClick={() => setIsNewOrderOpen(true)}
          >
            <span className="flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </span>
            New Order
          </button>
        </div>
      </div>

      {/* Table container */}
      {activeTab === 'inventory' && (
        <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-lg overflow-hidden`}>
          <InventoryTable
            ref={inventoryTableRef}
            searchQuery={search}
            themeClasses={themeClasses}
          />
        </div>
      )}
      {/* Always render OrdersTable (hidden when not active) so state persists */}
      <div style={{ display: activeTab === 'orders' ? 'block' : 'none' }}>
        <OrdersTable
          ref={ordersTableRef}
          searchQuery={search}
          themeClasses={themeClasses}
          onViewOrder={handleViewOrder}
          onArchiveOrder={() => setActiveTab('archive')}
          onNewOrderCreated={() => setActiveTab('orders')}
          archivedOrdersRef={archivedOrdersTableRef}
        />
      </div>
      {/* Always render ArchivedOrdersTable (hidden when not active) so ref is available */}
      <div style={{ display: activeTab === 'archive' ? 'block' : 'none' }}>
        <ArchivedOrdersTable ref={archivedOrdersTableRef} themeClasses={themeClasses} />
      </div>
      
      {/* New Label Order Modal */}
      {isNewOrderOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div 
            className="bg-white shadow-2xl flex flex-col overflow-hidden" 
            style={{ 
              width: '800px', 
              height: '460px', 
              borderRadius: '12px',
              border: '1px solid #E5E7EB'
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Label Order</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => {
                  setIsNewOrderOpen(false);
                  setOrderNumber('');
                  setSelectedSupplier(null);
                }}
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1" style={{ minHeight: 0 }}>
              {/* Order number */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Label Order #<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter order number here..."
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Supplier (Select one)<span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-4">
                  {suppliers.map((supplier) => {
                    const isActive = selectedSupplier?.id === supplier.id;
                    return (
                      <button
                        key={supplier.id}
                        type="button"
                        onClick={() => {
                          setSelectedSupplier(supplier);
                        }}
                        className="flex flex-col items-center justify-center rounded-xl transition-all bg-white"
                        style={{
                          width: '176px',
                          height: '174px',
                          padding: '8px',
                          gap: '0px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          border: 'none',
                          boxShadow: isActive ? '0 0 0 3px #2563eb' : '0 0 0 0px transparent'
                        }}
                      >
                        {supplier.logoSrc && (
                          <img
                            src={supplier.logoSrc}
                            alt={supplier.logoAlt}
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'contain',
                              objectPosition: 'center'
                            }}
                          />
                        )}
                        {supplier.name && (
                          <span className="text-sm font-medium text-gray-900 text-center">{supplier.name}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                onClick={() => {
                  setIsNewOrderOpen(false);
                  setOrderNumber('');
                  setSelectedSupplier(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-white bg-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-60"
                onClick={handleCreateOrder}
                disabled={!orderNumber.trim() || !selectedSupplier}
              >
                Create New Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Labels Settings Modal */}
      {isLabelsSettingsModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center" 
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} 
          onClick={() => setIsLabelsSettingsModalOpen(false)}
        >
          <div 
            className="bg-white rounded-lg"
            style={{ 
              width: '420px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                Labels Settings
              </h2>
              <button
                type="button"
                onClick={() => setIsLabelsSettingsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition"
                aria-label="Close"
                style={{ padding: '4px' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5">
              {/* DOI Goal Input - Two Column Layout */}
              <div className="mb-5">
                <div className="flex items-center justify-between gap-4">
                  {/* Left Column: Label and Info Icon */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                      DOI Goal
                    </label>
                    <div 
                      className="relative"
                      onMouseEnter={() => setShowDoiTooltip(true)}
                      onMouseLeave={() => setShowDoiTooltip(false)}
                    >
                      <svg 
                        className="w-4 h-4 text-gray-600 cursor-help" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                        />
                      </svg>
                      
                      {/* Tooltip */}
                      {showDoiTooltip && (
                        <div 
                          className="absolute left-0 bottom-full mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10"
                          style={{ 
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            fontFamily: 'system-ui, -apple-system, sans-serif'
                          }}
                        >
                          <h3 className="text-sm font-semibold text-gray-900 mb-2">
                            DOI Goal = Days of Inventory Goal
                          </h3>
                          <p className="text-sm text-gray-700 mb-2" style={{ lineHeight: '1.5' }}>
                            Your total label DOI combines three pieces: days of finished goods at Amazon, days of raw labels in your warehouse, and the days covered by the labels you plan to order.
                          </p>
                          <p className="text-sm text-gray-700" style={{ lineHeight: '1.5' }}>
                            Simply put: Total DOI = Amazon + warehouse + your next label order
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Right Column: Input Field */}
                  <div className="flex-1" style={{ maxWidth: '180px' }}>
                    <input
                      type="number"
                      value={doiGoal}
                      onChange={(e) => setDoiGoal(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{ 
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        borderRadius: '8px'
                      }}
                      placeholder="196"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setIsLabelsSettingsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    borderRadius: '8px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // TODO: Save DOI Goal
                    console.log('Save DOI Goal:', doiGoal);
                    setIsLabelsSettingsModalOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg transition"
                  style={{ 
                    backgroundColor: '#9CA3AF',
                    borderRadius: '8px',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create New Label Modal */}
      {isCreateBottleOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: '#374151' }}>
              <h2 className="text-base font-semibold text-white">Create New Label</h2>
              <button
                type="button"
                className="text-gray-300 hover:text-white"
                onClick={() => {
                  setIsCreateBottleOpen(false);
                  setNewBottleName('');
                  setNewBottleWarehouseInv('');
                  setNewBottleSupplierInv('');
                  setNewBottleImageLink('');
                  setCreateBottleTab('core');
                  setCreateBottleSearch('');
                }}
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs + search */}
            <div className="px-6 pt-4 flex items-center justify-between gap-4 border-b border-gray-200">
              <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
                {['core', 'supplier', 'dimensions', 'inventory'].map((key) => {
                  const labelMap = {
                    core: 'Core Info',
                    supplier: 'Supplier Info',
                    dimensions: 'Dimensions',
                    inventory: 'Inventory',
                  };
                  const isActive = createBottleTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCreateBottleTab(key)}
                      className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {labelMap[key]}
                    </button>
                  );
                })}
              </div>

              <div className="w-64 relative">
                <input
                  type="text"
                  value={createBottleSearch}
                  onChange={(e) => setCreateBottleSearch(e.target.value)}
                  placeholder="Search label info..."
                  className="w-full rounded-full border border-gray-300 px-8 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                />
                <svg
                  className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2"
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

            {/* Content - Same structure as Closures and Boxes */}
            <div className="px-6 py-5 overflow-y-auto flex-1">
              {createBottleTab === 'core' && (
                <div className="space-y-4 min-h-[400px]">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">Core Info</h3>
                    <span className="text-[11px] text-gray-400">* Indicates required field</span>
                  </div>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Packaging Name<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newBottleName}
                        onChange={(e) => setNewBottleName(e.target.value)}
                        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500${getCreateHighlightClass(
                          newBottleName
                        )}`}
                        placeholder="Enter Packaging Name"
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Bottle Image Link
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={newBottleImageLink}
                          onChange={(e) => setNewBottleImageLink(e.target.value)}
                          className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500${getCreateHighlightClass(
                            newBottleImageLink
                          )}`}
                          placeholder=""
                        />
                        {!newBottleImageLink && (
                          <button
                            type="button"
                            className="absolute inset-0 flex items-center justify-center text-sm font-medium text-blue-600 pointer-events-auto"
                            onClick={() => {
                              window.open(
                                'https://drive.google.com/drive/u/0/my-drive',
                                '_blank',
                                'noopener,noreferrer'
                              );
                            }}
                          >
                            Add Google Drive Link
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Size (oz)<span className="text-red-500">*</span>
                      </label>
                      <select
                        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white${getCreateHighlightClass(
                          ''
                        )}`}
                        defaultValue=""
                      >
                        <option value="" disabled>Select...</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Shape</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Shape" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Color</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Color" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Thread Type</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Thread Type" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Cap Size</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Cap Size" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Material</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Material" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Supplier</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Supplier" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Packaging Part #</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Packaging Part #" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Description</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Description" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Brand</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Brand" /></div>
                  </div>
                </div>
              )}

              {createBottleTab === 'supplier' && (
                <div className="space-y-4 min-h-[400px]">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">Supplier Info</h3>
                    <span className="text-[11px] text-gray-400">* Indicates required field</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Lead Time (Weeks)</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Lead Time" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">MOQ</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter MOQ" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Units per Pallet</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Units per Pallet" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Units per Case</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Units per Case" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Cases per Pallet</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Cases per Pallet" /></div>
                  </div>
                </div>
              )}

              {createBottleTab === 'dimensions' && (
                <div className="space-y-4 min-h-[400px]">
                  <h3 className="text-sm font-semibold text-gray-900">Dimensions</h3>
                  <div className="grid grid-cols-5 gap-4">
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Length (in)</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Length" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Width (in)</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Width" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Height (in)</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Height" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Weight (lbs) - Finished Good</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Weight" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Label Size</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Label Size" /></div>
                  </div>
                </div>
              )}

              {createBottleTab === 'inventory' && (
                <div className="space-y-4 min-h-[400px]">
                  <h3 className="text-sm font-semibold text-gray-900">Inventory</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Supplier Order Strategy</label><input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Strategy" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Supplier Inventory</label><input type="number" value={newBottleSupplierInv} onChange={(e) => setNewBottleSupplierInv(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Supplier Inventory" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Warehouse Inventory</label><input type="number" value={newBottleWarehouseInv} onChange={(e) => setNewBottleWarehouseInv(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Warehouse Inventory" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Max Warehouse Inventory</label><input type="number" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Max Inventory" /></div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                onClick={() => {
                  setIsCreateBottleOpen(false);
                  setNewBottleName('');
                  setNewBottleWarehouseInv('');
                  setNewBottleSupplierInv('');
                  setNewBottleImageLink('');
                  setCreateBottleTab('core');
                  setCreateBottleSearch('');
                }}
              >
                Cancel
              </button>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  onClick={() => setIsCreateBottleOpen(false)}
                >
                  Save for Later
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                  disabled={!newBottleName.trim()}
                  onClick={() => {
                    // TODO: Add bottle creation logic
                    setIsCreateBottleOpen(false);
                    setNewBottleName('');
                    setNewBottleWarehouseInv('');
                    setNewBottleSupplierInv('');
                    setNewBottleImageLink('');
                    setCreateBottleTab('core');
                    setCreateBottleSearch('');
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Labels;
