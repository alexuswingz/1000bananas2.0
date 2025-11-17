import React, { useState, useMemo, useEffect } from 'react';
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
  const [archivedOrders, setArchivedOrders] = useState(() => {
    try {
      const stored = window.localStorage.getItem('closureArchivedOrders');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Inline inventory editing (single row)
  const [editingClosureId, setEditingClosureId] = useState(null);
  const [editWarehouseInv, setEditWarehouseInv] = useState('');
  const [editSupplierInv, setEditSupplierInv] = useState('');

  // Bulk inventory editing (multiple rows)
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEdits, setBulkEdits] = useState({}); // { [id]: { warehouseInventory, supplierInventory } }

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

  const [closures, setClosures] = useState(() => [
    { id: 1, type: 'Cap', name: 'Reliable', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 2, type: 'Cap', name: 'VENTED Berry', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 3, type: 'Cap', name: 'Berry Unvented', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 4, type: 'Cap', name: 'Aptar Pour', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 5, type: 'Sprayer', name: '3oz Sprayer Top Down', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 6, type: 'Sprayer', name: '6oz Sprayer Top Top Down', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 7, type: 'Sprayer', name: '16oz Sprayer Trigger Foam', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 8, type: 'Sprayer', name: '16oz Spray Trigger No-Foam', warehouseInventory: 1000, supplierInventory: 1000 },
  ]);

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
          setOrders(parsed);
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
      const { orderNumber: newOrderNumber, supplierName } = newOrderState;

      const newOrder = {
        id: Date.now(),
        status: 'In Progress',
        orderNumber: newOrderNumber,
        supplier: supplierName,
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
          setArchivedOrders((archivedPrev) => {
            // Check if order already exists to prevent duplicates (React StrictMode can run effects twice)
            if (archivedPrev.some((o) => o.id === receivedOrderId)) {
              return archivedPrev;
            }
            const updated = [archivedOrder, ...archivedPrev];
            try {
              window.localStorage.setItem('closureArchivedOrders', JSON.stringify(updated));
            } catch (err) {
              console.error('Failed to update archived orders in localStorage', err);
            }
            return updated;
          });
          
          return remaining;
        });
        
        setActiveTab('archive');
      }
      
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const archiveOrder = (order) => {
    setOrders((prev) => {
      const remaining = prev.filter((o) => o.id !== order.id);
      try {
        window.localStorage.setItem('closureOrders', JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    setArchivedOrders((prev) => {
      // Check if order already exists to prevent duplicates
      if (prev.some((o) => o.id === order.id)) {
        return prev;
      }
      const archivedOrder = { ...order, status: 'Draft' };
      const updated = [archivedOrder, ...prev];
      try {
        window.localStorage.setItem('closureArchivedOrders', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setActiveTab('archive');
  };

  const filteredData = useMemo(() => {
    if (!search.trim()) return closures;
    const query = search.toLowerCase();
    return closures.filter(
      (closure) =>
        closure.name.toLowerCase().includes(query) ||
        closure.type.toLowerCase().includes(query)
    );
  }, [closures, search]);

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const query = search.toLowerCase();
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.supplier.toLowerCase().includes(query)
    );
  }, [orders, search]);

  const bulkUnsavedCount = useMemo(() => {
    if (!isBulkEditing) return 0;
    let count = 0;

    Object.entries(bulkEdits).forEach(([id, values]) => {
      const original = closures.find((c) => c.id === Number(id));
      if (!original) return;
      const w = values.warehouseInventory;
      const s = values.supplierInventory;
      const changed =
        (w !== undefined && Number(w) !== original.warehouseInventory) ||
        (s !== undefined && Number(s) !== original.supplierInventory);
      if (changed) count += 1;
    });

    return count;
  }, [isBulkEditing, bulkEdits, closures]);

  const handleStartEdit = (closure) => {
    setEditingClosureId(closure.id);
    setEditWarehouseInv(closure.warehouseInventory.toString());
    setEditSupplierInv(closure.supplierInventory.toString());
  };

  const handleSaveEdit = (id) => {
    const warehouse = Number(editWarehouseInv) || 0;
    const supplier = Number(editSupplierInv) || 0;

    setClosures((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, warehouseInventory: warehouse, supplierInventory: supplier }
          : c
      )
    );

    setEditingClosureId(null);
    setEditWarehouseInv('');
    setEditSupplierInv('');
  };

  const handleCancelEdit = () => {
    setEditingClosureId(null);
    setEditWarehouseInv('');
    setEditSupplierInv('');
  };

  const handleBulkEditChange = (id, field, value) => {
    setBulkEdits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSaveBulkEdits = () => {
    setClosures((prev) =>
      prev.map((c) => {
        const edits = bulkEdits[c.id];
        if (!edits) return c;
        return {
          ...c,
          warehouseInventory:
            edits.warehouseInventory !== undefined
              ? Number(edits.warehouseInventory) || 0
              : c.warehouseInventory,
          supplierInventory:
            edits.supplierInventory !== undefined
              ? Number(edits.supplierInventory) || 0
              : c.supplierInventory,
        };
      })
    );

    setBulkEdits({});
    setIsBulkEditing(false);
  };

  const handleDiscardBulkEdits = () => {
    setBulkEdits({});
    setIsBulkEditing(false);
  };

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

    navigate('/dashboard/supply-chain/closures/order', {
      state: {
        orderNumber: order.orderNumber,
        supplier: supplierMeta,
        mode: 'receive',
        orderId: order.id,
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
            <>
              <InventoryTable
                data={filteredData}
                isBulkEditing={isBulkEditing}
                bulkEdits={bulkEdits}
                editingClosureId={editingClosureId}
                editWarehouseInv={editWarehouseInv}
                editSupplierInv={editSupplierInv}
                onBulkEditChange={handleBulkEditChange}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onEditWarehouseInvChange={setEditWarehouseInv}
                onEditSupplierInvChange={setEditSupplierInv}
              />
              {isBulkEditing && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center gap-4">
                  <span className="text-sm text-gray-600">
                    {bulkUnsavedCount} Unsaved Changes
                  </span>
                  <button
                    type="button"
                    onClick={handleDiscardBulkEdits}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBulkEdits}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'ordering' && (
            <OrdersTable
              orders={filteredOrders}
              onViewOrder={handleViewOrder}
              onArchiveOrder={archiveOrder}
            />
          )}

          {activeTab === 'archive' && (
            <ArchivedOrdersTable archivedOrders={archivedOrders} themeClasses={themeClasses} />
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

