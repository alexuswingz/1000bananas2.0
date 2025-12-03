import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import OrdersTable from './OrdersTable';
import ArchivedOrdersTable from './ArchivedOrdersTable';
import InventoryTable from './InventoryTable';

const Boxes = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('inventory');
  const [search, setSearch] = useState('');

  // New order state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Row actions & settings
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

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
      name: 'ULINE',
      logoSrc: '/assets/box.png',
      logoAlt: 'ULINE logo',
    },
  ];

  const handleCreateOrder = () => {
    if (!orderNumber.trim() || !selectedSupplier) {
      return;
    }

    setIsNewOrderOpen(false);

    // Navigate to order page - BoxOrderPage will fetch boxes from API
    navigate('/dashboard/supply-chain/boxes/order', {
      state: {
        orderNumber: orderNumber.trim(),
        supplier: selectedSupplier,
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

    navigate('/dashboard/supply-chain/boxes/order', {
      state: {
        orderNumber: order.orderNumber,
        supplier: supplierMeta,
        mode: 'receive',
        orderId: order.id,
      },
    });
  };

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
              <h1 className={`text-xl font-semibold ${themeClasses.textPrimary}`}>Boxes</h1>

              {/* Tabs as pill group */}
              <div className={`flex items-center rounded-full border ${themeClasses.border} bg-white/70 dark:bg-dark-bg-tertiary`}>
                {['inventory', 'orders', 'archive'].map((tabKey, index) => {
                  const label =
                    tabKey === 'inventory' ? 'Inventory' : 
                    tabKey === 'orders' ? 'Orders' : 
                    'Archive';
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
                    Create new box
                  </button>
                </div>
              )}
            </div>

            {/* Cycle Counts button */}
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg px-5 py-2 shadow-md transition"
              onClick={() => navigate('/dashboard/supply-chain/boxes/cycle-counts')}
            >
              Cycle Counts
            </button>

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
          {activeTab === 'inventory' && (
            <InventoryTable
              ref={inventoryTableRef}
              searchQuery={search}
              themeClasses={themeClasses}
            />
          )}
          {/* Always render OrdersTable (hidden when not active) so state persists */}
          <div style={{ display: activeTab === 'orders' ? 'block' : 'none' }}>
            <OrdersTable
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
        </div>
      </div>

      {/* New Box Order Modal */}
      {isNewOrderOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Box Order</h2>
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
                  Box Order #<span className="text-red-500">*</span>
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
                        className={`w-56 h-40 rounded-lg flex flex-col overflow-hidden text-sm transition-all border ${
                          isActive
                            ? 'shadow-md bg-blue-50 border-blue-500'
                            : 'border-gray-200 hover:shadow-sm bg-white'
                        }`}
                      >
                        <div className={`flex-[2] flex items-center justify-center ${isActive ? 'bg-blue-50' : 'bg-white'}`}>
                          {supplier.logoSrc && (
                            <img
                              src={supplier.logoSrc}
                              alt={supplier.logoAlt}
                              className="max-h-full object-contain"
                              style={{ 
                                border: 'none !important', 
                                outline: 'none !important',
                                boxShadow: 'none !important',
                                borderWidth: '0 !important'
                              }}
                            />
                          )}
                        </div>
                        <div className={`flex-1 flex items-center justify-center ${isActive ? 'bg-blue-50' : 'bg-white'}`}>
                          <span className="text-gray-400 text-xs uppercase">ULINE</span>
                        </div>
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

      {/* Create New Box Modal */}
      {isCreateBottleOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: '#374151' }}>
              <h2 className="text-base font-semibold text-white">Create New Box</h2>
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
                  placeholder="Search box info..."
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

            {/* Content - Same structure as Closures, abbreviated for brevity */}
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
                  {/* Additional fields similar to Closures.js - Shape, Color, Thread Type, Cap Size, Material, Supplier, Packaging Part #, Description, Brand */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Shape</label>
                      <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Shape" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
                      <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Color" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Thread Type</label>
                      <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Thread Type" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Cap Size</label>
                      <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Cap Size" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                      <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Material" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Supplier</label>
                      <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Supplier" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Packaging Part #</label>
                      <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Packaging Part #" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                      <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Enter Description" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                      <input type="text" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500" placeholder="Select Brand" />
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

export default Boxes;
