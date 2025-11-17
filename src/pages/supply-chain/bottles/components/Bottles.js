import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccessToast } from '../../../../utils/notifications';
import { useTheme } from '../../../../context/ThemeContext';
import OrdersTable from './OrdersTable';
import ArchivedOrdersTable from './ArchivedOrdersTable';

const Bottles = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('inventory');
  const [search, setSearch] = useState('');

  // New order / orders state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [orders, setOrders] = useState([]);

  // Bottle details modal state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState('core');
  const [selectedBottle, setSelectedBottle] = useState(null);

  // Delete confirmation modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [bottleToDelete, setBottleToDelete] = useState(null);

  // Row actions & settings
  const [actionMenuBottleId, setActionMenuBottleId] = useState(null);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  // Create bottle modal
  const [isCreateBottleOpen, setIsCreateBottleOpen] = useState(false);
  const [newBottleName, setNewBottleName] = useState('');
  const [newBottleWarehouseInv, setNewBottleWarehouseInv] = useState('');
  const [newBottleSupplierInv, setNewBottleSupplierInv] = useState('');
  const [newBottleImageLink, setNewBottleImageLink] = useState('');
  const [createBottleTab, setCreateBottleTab] = useState('core');
  const [createBottleSearch, setCreateBottleSearch] = useState('');

  // Inline inventory editing (single row)
  const [editingBottleId, setEditingBottleId] = useState(null);
  const [editWarehouseInv, setEditWarehouseInv] = useState('');
  const [editSupplierInv, setEditSupplierInv] = useState('');

  // Bulk inventory editing (multiple rows)
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEdits, setBulkEdits] = useState({}); // { [id]: { warehouseInventory, supplierInventory } }

  // Bottle details search
  const [detailsSearch, setDetailsSearch] = useState('');

  // Archived orders
  const [archivedOrders, setArchivedOrders] = useState(() => {
    try {
      const stored = window.localStorage.getItem('bottleArchivedOrders');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const getDetailsHighlightClass = (value) => {
    if (!detailsSearch) return '';
    const v = (value ?? '').toString().toLowerCase();
    const q = detailsSearch.toLowerCase();
    return v && v.includes(q) ? ' border-blue-400 ring-2 ring-blue-200' : '';
  };

  const getCreateHighlightClass = (value) => {
    if (!createBottleSearch) return '';
    const v = (value ?? '').toString().toLowerCase();
    const q = createBottleSearch.toLowerCase();
    return v && v.includes(q) ? ' border-blue-400 ring-2 ring-blue-200' : '';
  };

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

  const [bottles, setBottles] = useState(() => [
      
    { id: 2, name: 'Quart', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 3, name: 'Gallon', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 4, name: '3oz Spray Bottle', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 5, name: '6oz Spray Bottle', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 6, name: '16oz Square Cylinder Clear', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 7, name: '16oz Square Cylinder Spray White', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 8, name: '16oz Round Cylinder Spray Clear', warehouseInventory: 1000, supplierInventory: 1000 },
    { id: 9, name: '16oz Round Cylinder Spray White', warehouseInventory: 1000, supplierInventory: 1000 },
  ]);

  const filteredData = useMemo(() => {
    if (!search.trim()) return bottles;
    const query = search.toLowerCase();
    return bottles.filter((bottle) => bottle.name.toLowerCase().includes(query));
  }, [bottles, search]);

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
      const original = bottles.find((b) => b.id === Number(id));
      if (!original) return;
      const w = values.warehouseInventory;
      const s = values.supplierInventory;
      const changed =
        (w !== undefined && Number(w) !== original.warehouseInventory) ||
        (s !== undefined && Number(s) !== original.supplierInventory);
      if (changed) count += 1;
    });

    return count;
  }, [isBulkEditing, bulkEdits, bottles]);

  const archiveOrder = (order) => {
    setOrders((prev) => {
      const remaining = prev.filter((o) => o.id !== order.id);
      try {
        window.localStorage.setItem('bottleOrders', JSON.stringify(remaining));
      } catch {}
      return remaining;
    });

    setArchivedOrders((prev) => {
      const archivedOrder = { ...order, status: 'Draft' };
      const updated = [archivedOrder, ...prev];
      try {
        window.localStorage.setItem('bottleArchivedOrders', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setActiveTab('archive');
  };

  // Static bottle details data used in the details modal
  const bottleDetails = {
    '8oz Bottle': {
      core: {
        packagingName: '8oz Bottle',
        imageLink: 'https://drive.google.com/file/d/...',
        sizeOz: '8',
        shape: 'Rounded Tall Cylinder',
        color: 'White',
        threadType: 'Non-Ratchet',
        capSize: '38-400',
        material: 'HDPE',
        supplier: 'Rhino Container',
        packagingPart: '53243',
        description:
          'PB-8CW-38-PCI | 8oz Wht Cyl HDPE 22g 38/400 364/cs, 20cs/pllt (08D38AD)',
        brand: 'PlasTierly Containers',
      },
      supplier: {
        leadTimeWeeks: '10',
        moq: '25,000',
        unitsPerPallet: '25,000',
        unitsPerCase: '364',
        casesPerPallet: '20',
      },
      dimensions: {
        lengthIn: '2',
        widthIn: '2',
        heightIn: '6',
        weightLbs: '0.73',
        labelSize: '5” x 8”',
      },
      inventory: {
        orderStrategy: 'Manual',
        supplierInventory: '74,620',
        warehouseInventory: '2,160',
        maxWarehouseInventory: '22,500',
      },
    },
  };

  const openBottleDetails = (bottle) => {
    const details = bottleDetails[bottle.name] || null;
    setSelectedBottle({
      id: bottle.id,
      name: bottle.name,
      details,
    });
    setActiveDetailsTab('core');
    setIsDetailsOpen(true);
    setDetailsSearch('');
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

  // Load any saved bottle orders from localStorage when this page mounts
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('bottleOrders');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setOrders(parsed);
        }
      }
    } catch (err) {
      console.error('Failed to load bottle orders from localStorage', err);
    }
  }, []);

  // If we come back from the BottleOrderPage with a newly created order,
  // append it to the existing orders (both state and localStorage) and switch to Orders tab.
  useEffect(() => {
    const newOrderState = location.state && location.state.newBottleOrder;
    if (newOrderState) {
      const { orderNumber: newOrderNumber, supplierName } = newOrderState;

      const newOrder = {
        id: Date.now(),
        status: 'Draft',
        orderNumber: newOrderNumber,
        supplier: supplierName,
      };

      setOrders((prev) => {
        // Avoid duplicates (React StrictMode can run effects twice in dev)
        if (prev.some((o) => o.orderNumber === newOrderNumber && o.supplier === supplierName)) {
          return prev;
        }

        const updated = [newOrder, ...prev];
        try {
          window.localStorage.setItem('bottleOrders', JSON.stringify(updated));
        } catch (err) {
          console.error('Failed to save bottle orders to localStorage', err);
        }
        return updated;
      });

      setActiveTab('orders');

      // Clear state so we don't re-add if user refreshes
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // If we come back from receiving an order, archive it automatically
  useEffect(() => {
    const receivedOrderId = location.state && location.state.receivedOrderId;
    if (receivedOrderId) {
      const orderToArchive = orders.find((o) => o.id === receivedOrderId);
      if (orderToArchive) {
        archiveOrder(orderToArchive);
      }
      // Clear state so we don't re-archive if user refreshes
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate, orders]);

  const handleCreateOrder = () => {
    if (!orderNumber.trim() || !selectedSupplier) {
      return;
    }

    // Pre-populate line items for the second-step order details page
    const defaultLines = [
      { id: 1, name: '8oz', supplierInventory: 'Auto Replenishment', unitsNeeded: 29120, qty: 29120, pallets: 4, selected: true },
      { id: 2, name: 'Quart', supplierInventory: 'Auto Replenishment', unitsNeeded: 5040, qty: 5040, pallets: 4, selected: true },
      { id: 3, name: 'Gallon', supplierInventory: 'Auto Replenishment', unitsNeeded: 768, qty: 768, pallets: 4, selected: true },
    ];

    setIsNewOrderOpen(false);

    navigate('/dashboard/supply-chain/bottles/order', {
      state: {
        orderNumber: orderNumber.trim(),
        supplier: selectedSupplier,
        lines: defaultLines,
        mode: 'create',
      },
    });

    // keep values if user navigates back, so don't reset here
  };

  const renderInventoryTable = () => (
    <div
      className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-md`}
      style={{ overflow: 'hidden' }}
    >
      {/* Table header row */}
      <div className={themeClasses.headerBg}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: '2fr 1fr 1fr 120px',
          }}
        >
          {['Bottle Name', 'Warehouse Inventory', 'Supplier Inventory'].map((label, idx) => (
            <div
              key={label}
              className={`group px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] flex items-center justify-center gap-2 ${
                idx === 0 ? '' : ''
              }`}
            >
              <span>{label}</span>
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-white/70 hover:text-white"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4h18M7 10h10M10 16h4"
                  />
                </svg>
              </button>
            </div>
          ))}
          <div className="px-8 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
            Actions
          </div>
        </div>
      </div>

      {/* Table body */}
      <div>
        {filteredData.map((bottle, index) => {
          const isRowEditing = editingBottleId === bottle.id;
          const isBulkRow = isBulkEditing;
          const showInputs = isBulkRow || isRowEditing;

          const bulkValues = bulkEdits[bottle.id] || {};
          const warehouseValue = isBulkRow
            ? bulkValues.warehouseInventory ?? bottle.warehouseInventory
            : editWarehouseInv;
          const supplierValue = isBulkRow
            ? bulkValues.supplierInventory ?? bottle.supplierInventory
            : editSupplierInv;

  return (
            <div
              key={bottle.id}
              className={`grid text-sm ${themeClasses.rowHover} transition-colors`}
              style={{
                gridTemplateColumns: '2fr 1fr 1fr 120px',
                borderBottom:
                  index === filteredData.length - 1
                    ? 'none'
                    : isDarkMode
                    ? '1px solid rgba(75,85,99,0.3)'
                    : '1px solid #e5e7eb',
              }}
            >
              <button
                type="button"
                className="px-6 py-3 text-left font-semibold text-blue-500 hover:text-blue-400 underline-offset-2 hover:underline cursor-pointer"
                onClick={() => openBottleDetails(bottle)}
              >
                {bottle.name}
              </button>

              <div className="px-6 py-3 text-center">
                {showInputs ? (
                  <input
                    type="number"
                    value={warehouseValue}
                    onChange={(e) => {
                      if (isBulkRow) {
                        const value = e.target.value;
                        setBulkEdits((prev) => ({
                          ...prev,
                          [bottle.id]: {
                            ...prev[bottle.id],
                            warehouseInventory: value,
                          },
                        }));
                      } else {
                        setEditWarehouseInv(e.target.value);
                      }
                    }}
                    className="w-28 rounded-full border border-blue-300 px-3 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                ) : (
                  <span className={themeClasses.textPrimary}>{bottle.warehouseInventory}</span>
                )}
    </div>

              <div className="px-6 py-3 text-center">
                {showInputs ? (
                  <input
                    type="number"
                    value={supplierValue}
                    onChange={(e) => {
                      if (isBulkRow) {
                        const value = e.target.value;
                        setBulkEdits((prev) => ({
                          ...prev,
                          [bottle.id]: {
                            ...prev[bottle.id],
                            supplierInventory: value,
                          },
                        }));
                      } else {
                        setEditSupplierInv(e.target.value);
                      }
                    }}
                    className="w-28 rounded-full border border-blue-300 px-3 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                  />
                ) : (
                  <span className={themeClasses.textPrimary}>{bottle.supplierInventory}</span>
                )}
              </div>

              <div className="px-6 py-3 flex items-center justify-center relative">
                {isBulkRow ? (
                  // In bulk edit mode, row-level actions are disabled; use global bar instead
                  <span className="text-xs text-gray-400">Bulk editing</span>
                ) : isRowEditing ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
                      onClick={() => {
                        setEditingBottleId(null);
                        setEditWarehouseInv('');
                        setEditSupplierInv('');
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700"
                      onClick={() => {
                        setBottles((prev) =>
                          prev.map((b) =>
                            b.id === bottle.id
                              ? {
                                  ...b,
                                  warehouseInventory: Number(editWarehouseInv) || 0,
                                  supplierInventory: Number(editSupplierInv) || 0,
                                }
                              : b
                          )
                        );
                        showSuccessToast(`${bottle.name} Inventory updated`);
                        setEditingBottleId(null);
                      }}
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors"
                      onClick={() =>
                        setActionMenuBottleId((prev) => (prev === bottle.id ? null : bottle.id))
                      }
                      aria-label="More actions"
                    >
                      <span className={themeClasses.textSecondary}>⋮</span>
                    </button>

                    {actionMenuBottleId === bottle.id && (
                      <div className="absolute right-4 top-9 z-20 w-32 bg-white border border-gray-200 rounded-md shadow-lg text-xs">
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-blue-600"
                          onClick={() => {
                            setEditingBottleId(bottle.id);
                            setEditWarehouseInv(String(bottle.warehouseInventory ?? ''));
                            setEditSupplierInv(String(bottle.supplierInventory ?? ''));
                            setActionMenuBottleId(null);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600"
                          onClick={() => {
                            setBottleToDelete(bottle);
                            setIsDeleteOpen(true);
                            setActionMenuBottleId(null);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {filteredData.length === 0 && (
          <div className="px-6 py-6 text-center text-sm italic text-gray-400">
            No bottles match your search.
          </div>
        )}
      </div>

      {/* Bulk edit bar - inline under table */}
      {isBulkEditing && (
        <div className="flex items-center justify-center mt-4 mb-1">
          <div className="inline-flex items-center gap-4 bg-[#2C3544] text-white px-4 py-2 rounded-full shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full border border-blue-300 flex items-center justify-center bg-blue-600">
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"
                  />
                </svg>
              </span>
              <span className="text-xs font-medium">
                {bulkUnsavedCount > 0 ? `${bulkUnsavedCount} Unsaved Changes` : 'Bulk edit active'}
              </span>
            </div>

            <button
              type="button"
              className="px-3 py-1 text-xs font-medium text-gray-900 bg-white rounded-full hover:bg-gray-100"
              onClick={() => {
                setIsBulkEditing(false);
                setBulkEdits({});
              }}
            >
              Discard
            </button>
            <button
              type="button"
              className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50"
              disabled={bulkUnsavedCount === 0}
              onClick={() => {
                setBottles((prev) =>
                  prev.map((b) => {
                    const edits = bulkEdits[b.id];
                    if (!edits) return b;
                    const nextWarehouse =
                      edits.warehouseInventory !== undefined
                        ? Number(edits.warehouseInventory) || 0
                        : b.warehouseInventory;
                    const nextSupplier =
                      edits.supplierInventory !== undefined
                        ? Number(edits.supplierInventory) || 0
                        : b.supplierInventory;
                    return {
                      ...b,
                      warehouseInventory: nextWarehouse,
                      supplierInventory: nextSupplier,
                    };
                  })
                );
                if (bulkUnsavedCount > 0) {
                  showSuccessToast(`${bulkUnsavedCount} bottle(s) inventory updated`);
                }
                setIsBulkEditing(false);
                setBulkEdits({});
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );

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

    navigate('/dashboard/supply-chain/bottles/order', {
      state: {
        orderNumber: order.orderNumber,
        supplier: supplierMeta,
        mode: 'receive',
        orderId: order.id,
        // Existing orders don't persist custom lines yet; BottleOrderPage falls back to defaults.
      },
    });
  };

  // Order details page is now a separate route; no in-tab rendering here.

  return (
    <div className={`p-8 ${themeClasses.pageBg}`}>
      {/* Main card with header + tabs + search + table */}
      <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-lg`}>
        {/* Card header: title + tabs + search + actions */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{
            borderColor: isDarkMode ? '#374151' : '#e5e7eb',
          }}
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
              <h1 className={`text-xl font-semibold ${themeClasses.textPrimary}`}>Bottles</h1>

              {/* Tabs as pill group */}
              <div className={`flex items-center rounded-full border ${themeClasses.border} bg-white/70 dark:bg-dark-bg-tertiary`}>
                {['inventory', 'orders', 'archive'].map((tabKey, index) => {
                  const label =
                    tabKey === 'inventory' ? 'Inventory' : tabKey === 'orders' ? 'Orders' : 'Archive';
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
                      setIsBulkEditing(true);
                      setBulkEdits({});
                      setEditingBottleId(null);
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
                    Create new bottle
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

        {/* Card content */}
        <div className="p-6">
          {activeTab === 'inventory' && renderInventoryTable()}
          {activeTab === 'orders' && (
            <OrdersTable
              orders={filteredOrders}
              themeClasses={themeClasses}
              onViewOrder={handleViewOrder}
              onArchiveOrder={archiveOrder}
            />
          )}
          {activeTab === 'archive' && (
            <ArchivedOrdersTable archivedOrders={archivedOrders} themeClasses={themeClasses} />
          )}
        </div>
      </div>

      {/* New Bottle Order Modal */}
      {isNewOrderOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Bottle Order</h2>
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
            <div className="px-6 py-5 space-y-6 overflow-y-auto">
              {/* Order number */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Bottle Order #<span className="text-red-500">*</span>
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
                        className={`w-56 h-40 border rounded-xl flex flex-col items-center justify-center text-sm transition-all ${
                          isActive
                            ? 'border-blue-500 shadow-md bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                        }`}
                      >
                        <div className="w-24 h-16 mb-3 flex items-center justify-center">
                          <img
                            src={supplier.logoSrc}
                            alt={supplier.logoAlt}
                            className="max-h-16 max-w-full object-contain"
                          />
                        </div>
                        <span className="text-gray-800 font-medium">{supplier.name}</span>
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

      {/* Create New Bottle Modal */}
      {isCreateBottleOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-center pt-20 bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Create New Bottle</h2>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setIsCreateBottleOpen(false)}
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs + search */}
            <div className="px-6 pt-4 flex items-center justify-between gap-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
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
                      className={`px-4 py-1.5 text-xs font-medium rounded-full border ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
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
                  placeholder="Search bottle info..."
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

            {/* Content */}
            <div className="px-6 py-5 overflow-y-auto flex-1">
              {createBottleTab === 'core' && (
                <div className="space-y-4 min-h-[400px]">
                  <h3 className="text-sm font-semibold text-gray-900">Core Info</h3>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Bottle Name<span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newBottleName}
                        onChange={(e) => setNewBottleName(e.target.value)}
                        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500${getCreateHighlightClass(
                          newBottleName
                        )}`}
                        placeholder="Enter bottle name"
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
                      <label className="block text-xs font-medium text-gray-700 mb-1">Size (oz)</label>
                      <input
                        type="number"
                        value={newBottleWarehouseInv}
                        onChange={(e) => setNewBottleWarehouseInv(e.target.value)}
                        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500${getCreateHighlightClass(
                          newBottleWarehouseInv
                        )}`}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Shape</label>
                      <input
                        type="text"
                        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500${getCreateHighlightClass(
                          ''
                        )}`}
                        placeholder="Select Shape"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Select Color"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Thread Type</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Select Thread Type"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cap Size</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Select Cap Size"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Select Material"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Supplier</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Select Supplier"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Packaging Part #
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Packaging Part #"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Description"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Select Brand"
                      />
                    </div>
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
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Lead Time (Weeks)
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Lead Time"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">MOQ</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter MOQ"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Units per Pallet
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Units per Pallet"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Units per Case
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Units per Case"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Cases per Pallet
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Cases per Pallet"
                      />
                    </div>
                  </div>
                </div>
              )}

              {createBottleTab === 'dimensions' && (
                <div className="space-y-4 min-h-[400px]">
                  <h3 className="text-sm font-semibold text-gray-900">Dimensions</h3>
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Length (in)
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Length"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Width (in)
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Width"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Height (in)
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Height"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Weight (lbs) - Finished Good
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Weight"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Label Size
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Label Size"
                      />
                    </div>
                  </div>
                </div>
              )}

              {createBottleTab === 'inventory' && (
                <div className="space-y-4 min-h-[400px]">
                  <h3 className="text-sm font-semibold text-gray-900">Inventory</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Supplier Order Strategy
                      </label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Strategy"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Supplier Inventory
                      </label>
                      <input
                        type="number"
                        value={newBottleSupplierInv}
                        onChange={(e) => setNewBottleSupplierInv(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Supplier Inventory"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Warehouse Inventory
                      </label>
                      <input
                        type="number"
                        value={newBottleWarehouseInv}
                        onChange={(e) => setNewBottleWarehouseInv(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Warehouse Inventory"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Max Warehouse Inventory
                      </label>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        placeholder="Enter Max Inventory"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                onClick={() => setIsCreateBottleOpen(false)}
              >
                Cancel
              </button>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  onClick={() => {
                    // Placeholder for draft save; currently just closes
                    setIsCreateBottleOpen(false);
                  }}
                >
                  Save for Later
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                  disabled={!newBottleName.trim()}
                  onClick={() => {
                    const nextId = bottles.length ? Math.max(...bottles.map((b) => b.id)) + 1 : 1;
                    setBottles((prev) => [
                      ...prev,
                      {
                        id: nextId,
                        name: newBottleName.trim(),
                        warehouseInventory: Number(newBottleWarehouseInv) || 0,
                        supplierInventory: Number(newBottleSupplierInv) || 0,
                      },
                    ]);
                    setIsCreateBottleOpen(false);
                    setNewBottleImageLink('');
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Bottle Confirmation Modal */}
      {isDeleteOpen && bottleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col px-8 py-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10"
                  />
                </svg>
              </div>

              {/* Title */}
              <h2 className="text-base font-semibold text-gray-900">
                Delete {bottleToDelete.name}
              </h2>

              {/* Description */}
              <p className="text-xs text-gray-500">
                This will permanently delete the selected bottle. Deleted bottles cannot be
                recovered.
              </p>

              {/* Buttons */}
              <div className="flex w-full gap-3 mt-2">
                <button
                  type="button"
                  className="flex-1 px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                  onClick={() => {
                    setIsDeleteOpen(false);
                    setBottleToDelete(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-red-500 rounded-lg shadow-sm hover:bg-red-600"
                  onClick={() => {
                    setBottles((prev) => prev.filter((b) => b.id !== bottleToDelete.id));
                    setIsDeleteOpen(false);
                    setBottleToDelete(null);
                    // Close details modal if it was open for this bottle
                    if (selectedBottle && selectedBottle.id === bottleToDelete.id) {
                      setIsDetailsOpen(false);
                      setSelectedBottle(null);
                    }
                  }}
                >
                  Delete Bottle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottle Details Modal */}
      {isDetailsOpen && selectedBottle && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className={`${themeClasses.headerBg} flex items-center justify-between px-6 py-3`}>
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-white">
                  Bottle Details - {selectedBottle.name}
                </h2>
              </div>
              <button
                type="button"
                className="text-gray-300 hover:text-white"
                onClick={() => setIsDetailsOpen(false)}
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs + search */}
            <div className="px-6 pt-4 flex items-center justify-between gap-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                {['core', 'supplier', 'dimensions', 'inventory'].map((key) => {
                  const labelMap = {
                    core: 'Core Info',
                    supplier: 'Supplier Info',
                    dimensions: 'Dimensions',
                    inventory: 'Inventory',
                  };
                  const isActive = activeDetailsTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveDetailsTab(key)}
                      className={`px-4 py-1.5 text-xs font-medium rounded-full border ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
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
                  value={detailsSearch}
                  onChange={(e) => setDetailsSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const query = detailsSearch.trim().toLowerCase();
                      if (!query || !selectedBottle) return;
                      const details = bottleDetails[selectedBottle.name];
                      if (!details) return;

                      const sectionsInOrder = ['core', 'supplier', 'dimensions', 'inventory'];

                      for (const section of sectionsInOrder) {
                        const sectionData = details[section];
                        if (!sectionData) continue;
                        const hasMatch = Object.values(sectionData).some((val) =>
                          (val ?? '').toString().toLowerCase().includes(query)
                        );
                        if (hasMatch) {
                          setActiveDetailsTab(section);
                          break;
                        }
                      }
                    }
                  }}
                  placeholder="Search bottle info..."
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

            {/* Content */}
            <div className="px-6 py-5 overflow-y-auto min-h-[360px]">
              {activeDetailsTab === 'core' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Core Info</h3>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Packaging Name
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.core.packagingName || selectedBottle.name}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.core.packagingName || selectedBottle.name
                        )}`}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Bottle Image Link
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.core.imageLink || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.core.imageLink || ''
                        )}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Size (oz)
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.core.sizeOz || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.core.sizeOz || ''
                        )}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Shape</label>
                      <input
                        defaultValue={selectedBottle.details?.core.shape || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.core.shape || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                      <input
                        defaultValue={selectedBottle.details?.core.color || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.core.color || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Thread Type
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.core.threadType || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.core.threadType || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Cap Size
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.core.capSize || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.core.capSize || ''
                        )}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Material
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.core.material || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.core.material || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Supplier
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.core.supplier || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.core.supplier || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Packaging Part #
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.core.packagingPart || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.core.packagingPart || ''
                        )}`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Description
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.core.description || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.core.description || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Brand</label>
                      <input
                        defaultValue={selectedBottle.details?.core.brand || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.core.brand || ''
                        )}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeDetailsTab === 'supplier' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Supplier Info</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Lead Time (Weeks)
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.supplier.leadTimeWeeks || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.supplier.leadTimeWeeks || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">MOQ</label>
                      <input
                        defaultValue={selectedBottle.details?.supplier.moq || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.supplier.moq || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Units per Pallet
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.supplier.unitsPerPallet || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.supplier.unitsPerPallet || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Units per Case
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.supplier.unitsPerCase || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.supplier.unitsPerCase || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Cases per Pallet
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.supplier.casesPerPallet || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.supplier.casesPerPallet || ''
                        )}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeDetailsTab === 'dimensions' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Dimensions</h3>
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Length (in)
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.dimensions.lengthIn || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.dimensions.lengthIn || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Width (in)
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.dimensions.widthIn || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.dimensions.widthIn || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Height (in)
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.dimensions.heightIn || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.dimensions.heightIn || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Weight (lbs) - Finished Good
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.dimensions.weightLbs || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.dimensions.weightLbs || ''
                        )}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Label Size
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.dimensions.labelSize || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.dimensions.labelSize || ''
                        )}`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeDetailsTab === 'inventory' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900">Inventory</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Supplier Order Strategy
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.inventory.orderStrategy || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.inventory.orderStrategy || ''
                        )}`}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Supplier Inventory
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.inventory.supplierInventory || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.inventory.supplierInventory || ''
                        )}`}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Warehouse Inventory
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.inventory.warehouseInventory || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.inventory.warehouseInventory || ''
                        )}`}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Max Warehouse Inventory
                      </label>
                      <input
                        defaultValue={selectedBottle.details?.inventory.maxWarehouseInventory || ''}
                        className={`w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm${getDetailsHighlightClass(
                          selectedBottle.details?.inventory.maxWarehouseInventory || ''
                        )}`}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bottles;
