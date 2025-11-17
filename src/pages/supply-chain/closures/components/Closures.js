import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  const [orders, setOrders] = useState([]);
  
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

  // Load orders from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('closureOrders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out the two sample orders: "514413413" and "43145"
          const cleaned = parsed.filter((order) => 
            order.orderNumber !== '514413413' && order.orderNumber !== '43145'
          );
          // Update localStorage with cleaned data if any were removed
          if (cleaned.length !== parsed.length) {
            window.localStorage.setItem('closureOrders', JSON.stringify(cleaned));
          }
          setOrders(cleaned);
        }
      }
    } catch (err) {
      console.error('Failed to load closure orders from localStorage', err);
    }
  }, []);

  // Handle new order from order page
  useEffect(() => {
    const newOrderState = location.state && location.state.newClosureOrder;
    if (newOrderState) {
      const { orderNumber: newOrderNumber, supplierName, lines } = newOrderState;

      const newOrder = {
        id: Date.now(),
        status: 'In Progress',
        orderNumber: newOrderNumber,
        supplier: supplierName,
        lines: lines || [], // Save only the selected items
      };

      setOrders((prev) => {
        // Avoid duplicates
        if (prev.some((o) => o.orderNumber === newOrderNumber && o.supplier === supplierName)) {
          return prev;
        }

        const updated = [newOrder, ...prev];
        try {
          window.localStorage.setItem('closureOrders', JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save closure orders to localStorage', err);
        }
        return updated;
      });

      setActiveTab('ordering');
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // Handle received order (partial or full)
  useEffect(() => {
    const receivedOrderId = location.state && location.state.receivedOrderId;
    const isPartial = location.state && location.state.isPartial;
    
    if (receivedOrderId) {
      if (isPartial) {
        // Partial receive - update status and keep in ordering
        setOrders((prev) => {
          const updated = prev.map((order) => {
            if (order.id === receivedOrderId) {
              return {
                ...order,
                status: 'Partial',
              };
            }
            return order;
          });
          
          try {
            window.localStorage.setItem('closureOrders', JSON.stringify(updated));
          } catch (err) {
            console.error('Failed to update closure orders in localStorage', err);
          }
          
          return updated;
        });
        
        setActiveTab('ordering');
      } else {
        // Full receive - move to archive
        setOrders((prev) => {
          const orderToArchive = prev.find((o) => o.id === receivedOrderId);
          if (!orderToArchive) return prev;
          
          const remaining = prev.filter((o) => o.id !== receivedOrderId);
          try {
            window.localStorage.setItem('closureOrders', JSON.stringify(remaining));
          } catch (err) {
            console.error('Failed to update closure orders in localStorage', err);
          }
          
          // Add to archived orders with "Received" status
          const archivedOrder = { ...orderToArchive, status: 'Received' };
          if (archivedOrdersTableRef && archivedOrdersTableRef.current) {
            archivedOrdersTableRef.current.addArchivedOrder(archivedOrder);
          }
          
          return remaining;
        });
        
        setActiveTab('archive');
      }
      
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const handleStatusChange = (orderId, newStatus) => {
    setOrders((prev) => {
      const updated = prev.map((o) =>
        o.id === orderId ? { ...o, status: newStatus } : o
      );
      try {
        window.localStorage.setItem('closureOrders', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const archiveOrder = (order) => {
    setOrders((prev) => {
      const remaining = prev.filter((o) => o.id !== order.id);
      try {
        window.localStorage.setItem('closureOrders', JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    // Add to archived orders
    if (archivedOrdersTableRef && archivedOrdersTableRef.current) {
      archivedOrdersTableRef.current.addArchivedOrder({ ...order, status: order.status || 'Draft' });
    }

    setActiveTab('archive');
  };


  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const query = search.toLowerCase();
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.supplier.toLowerCase().includes(query)
    );
  }, [orders, search]);

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
              orders={filteredOrders}
              onViewOrder={handleViewOrder}
              onArchiveOrder={archiveOrder}
              onStatusChange={handleStatusChange}
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

