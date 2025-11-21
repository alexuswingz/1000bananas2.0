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
      id: 'rhino',
      name: 'Rhino Container',
      logoSrc: '/assets/rhino.png',
      logoAlt: 'Rhino Container logo',
    },
    {
      id: 'tricorbraun',
      name: 'TricorBraun',
      logoSrc: '/assets/tricorbraun.png',
      logoAlt: 'TricorBraun logo',
    },
  ];

  const handleCreateOrder = () => {
    if (!orderNumber.trim() || !selectedSupplier) {
      return;
    }

    // Get labels data from localStorage
    try {
      const stored = window.localStorage.getItem('labelsInventory');
      const labels = stored ? JSON.parse(stored) : [];
      
      // Pre-populate line items for the order details page
      const defaultLines = labels.map((label) => ({
        id: label.id,
        brand: label.brand,
        product: label.product,
        size: label.size,
        qty: label.inventory,
        status: label.status === 'Up to Date' ? 'Completed' : 'Pending',
        inventory: label.inventory,
        toOrder: label.inventory,
        daysOfInv: label.inventory,
      }));

      setIsNewOrderOpen(false);

      // Navigate to label order page
      navigate('/dashboard/supply-chain/labels/order', {
        state: {
          orderNumber: orderNumber.trim(),
          supplier: selectedSupplier,
          lines: defaultLines,
          mode: 'create',
        },
      });
    } catch (err) {
      console.error('Failed to load labels from localStorage', err);
    }
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
      },
    });
  };

  return (
    <div className={`p-8 ${themeClasses.pageBg}`}>
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Circular green checkmark icon */}
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
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#FFFFFF" />
              </svg>
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

      {/* Header: title + tabs + search + actions */}
      <div
        className="flex items-center justify-between px-6 py-4 mb-4"
      >
        {/* Left: Icon, title and tabs */}
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
            <h1 className={`text-xl font-semibold ${themeClasses.textPrimary}`}>Labels</h1>

            {/* Tabs as pill group - matching bottles header */}
            <div className={`flex items-center rounded-full border ${themeClasses.border} bg-white/70 dark:bg-dark-bg-tertiary`}>
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
                    if (inventoryTableRef.current) {
                      inventoryTableRef.current.enableBulkEdit();
                    }
                    setIsSettingsMenuOpen(false);
                  }}
                >
                  <span className="text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"
                      />
                    </svg>
                  </span>
                  Bulk edit
                </button>
              </div>
            )}
          </div>

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
                        onClick={() => setSelectedSupplier(supplier)}
                        className={`flex flex-col items-center justify-center rounded-xl border transition-all ${
                          isActive
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                        style={{
                          width: '176px',
                          height: '174px',
                          padding: '32px',
                          gap: '16px',
                          borderRadius: '12px',
                          borderWidth: '1px'
                        }}
                      >
                        {supplier.logoSrc && (
                          <img
                            src={supplier.logoSrc}
                            alt={supplier.logoAlt}
                            className="w-auto object-contain"
                            style={{ maxHeight: '60px' }}
                          />
                        )}
                        <span className="text-sm font-medium text-gray-900 text-center">{supplier.name}</span>
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
    </div>
  );
};

export default Labels;
