import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import ClosuresHeader from './ClosuresHeader';
import InventoryTable from './InventoryTable';
import OrdersTable from './OrdersTable';
import ArchivedOrdersTable from './ArchivedOrdersTable';
import NewOrderModal from './NewOrderModal';

const Closures = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('inventory');
  const [search, setSearch] = useState('');

  // New order state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  // Ref for archived orders table
  const archivedOrdersTableRef = useRef(null);


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


  const handleStatusChange = (orderId, newStatus) => {
    // This is handled by OrdersTable now, but keeping for compatibility
  };

  // Callback to switch to archive tab when order is archived (matching boxes/bottles pattern)
  const handleArchiveOrder = useCallback((order) => {
    setActiveTab('archive');
  }, []);

  // Ref for inventory table to trigger bulk edit
  const inventoryTableRef = useRef(null);

  const handleCreateOrder = () => {
    if (!orderNumber.trim() || !selectedSupplier) {
      return;
    }

    // Pre-populate line items for the order details page
    const defaultLines = [
      { id: 1, type: 'Cap', name: 'Aptar Pour', supplierInventory: 'Auto Replenishment', unitsNeeded: 61120, qty: 61120, pallets: 1, selected: false },
      { id: 2, type: 'Sprayer', name: '3oz Sprayer Top Down', supplierInventory: 'Auto Replenishment', unitsNeeded: 10000, qty: 10000, pallets: 1, selected: false },
      { id: 3, type: 'Sprayer', name: '6oz Sprayer Top Top Down', supplierInventory: 'Auto Replenishment', unitsNeeded: 10000, qty: 10000, pallets: 1, selected: false },
      { id: 4, type: 'Sprayer', name: '16oz Sprayer Trigger Foam', supplierInventory: 'Auto Replenishment', unitsNeeded: 8160, qty: 8160, pallets: 1, selected: false },
      { id: 5, type: 'Sprayer', name: '16oz Spray Trigger No-Foam', supplierInventory: 'Auto Replenishment', unitsNeeded: 8160, qty: 8160, pallets: 1, selected: false },
    ];

    setIsNewOrderOpen(false);

    navigate('/dashboard/supply-chain/closures/order', {
      state: {
        orderNumber: orderNumber.trim(),
        supplier: selectedSupplier,
        lines: defaultLines,
        mode: 'create',
      },
    });
  };

  const handleViewOrder = (order) => {
    const supplierMeta =
      suppliers.find((s) => s.name === order.supplier) ||
      suppliers[0] || {
        id: 'unknown',
        name: order.supplier,
        logoSrc: '',
        logoAlt: order.supplier,
      };

    // If order is from archive or has 'Received' status, use 'view' mode, otherwise 'receive'
    const mode = order.fromArchive || order.status === 'Received' ? 'view' : 'receive';

    navigate('/dashboard/supply-chain/closures/order', {
      state: {
        orderNumber: order.orderNumber,
        supplier: supplierMeta,
        mode,
        orderId: order.id,
        lines: order.lines || [],
      },
    });
  };

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`}>
      <div className="p-6">
        {/* Header */}
        <ClosuresHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          search={search}
          onSearchChange={setSearch}
          onNewOrderClick={() => setIsNewOrderOpen(true)}
        />

        {/* Content */}
        <div className={`rounded-lg shadow-sm ${themeClasses.cardBg} overflow-hidden`}>
          {activeTab === 'inventory' && (
            <InventoryTable
              ref={inventoryTableRef}
              searchQuery={search}
            />
          )}

          {activeTab === 'ordering' && (
            <OrdersTable
              searchQuery={search}
              themeClasses={themeClasses}
              onViewOrder={handleViewOrder}
              onArchiveOrder={handleArchiveOrder}
              onStatusChange={handleStatusChange}
              archivedOrdersRef={archivedOrdersTableRef}
              onNewOrderCreated={() => setActiveTab('ordering')}
            />
          )}

          {activeTab === 'archive' && (
            <ArchivedOrdersTable ref={archivedOrdersTableRef} themeClasses={themeClasses} onViewOrder={handleViewOrder} />
          )}
        </div>
      </div>

      {/* New Closure Order Modal */}
      <NewOrderModal
        isOpen={isNewOrderOpen}
        orderNumber={orderNumber}
        selectedSupplier={selectedSupplier}
        suppliers={suppliers}
        onClose={() => {
          setIsNewOrderOpen(false);
          setOrderNumber('');
          setSelectedSupplier(null);
        }}
        onOrderNumberChange={setOrderNumber}
        onSupplierSelect={setSelectedSupplier}
        onCreateOrder={handleCreateOrder}
      />
    </div>
  );
};

export default Closures;

