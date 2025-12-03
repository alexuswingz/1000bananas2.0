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
    // Map the simple supplier name on the order back to the full supplier meta
    const supplierMeta =
      suppliers.find((s) => s.name === order.supplier) ||
      suppliers[0] || {
        id: 'unknown',
        name: order.supplier,
        logoSrc: '',
        logoAlt: order.supplier,
      };

    // Use the first line item's ID for fetching order details
    const orderId = order.lineItems && order.lineItems.length > 0 
      ? order.lineItems[0].id 
      : order.id;

    navigate('/dashboard/supply-chain/closures/order', {
      state: {
        orderNumber: order.orderNumber,
        supplier: supplierMeta,
        mode: 'receive',
        orderId: orderId,
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
          onCreateBottleClick={() => setIsCreateBottleOpen(true)}
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

      {/* Create New Closure Modal */}
      {isCreateBottleOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: '#374151' }}>
              <h2 className="text-base font-semibold text-white">Create New Closure</h2>
              <button
                type="button"
                className="text-gray-300 hover:text-white"
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
                  placeholder="Search closure info..."
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
                  onClick={() => {
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

export default Closures;

