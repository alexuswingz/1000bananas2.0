import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { showSuccessToast } from '../../../../utils/notifications';
import { useTheme } from '../../../../context/ThemeContext';
import OrdersTable from './OrdersTable';
import ArchivedOrdersTable from './ArchivedOrdersTable';
import InventoryTable from './InventoryTable';

const Bottles = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('inventory');
  const [search, setSearch] = useState('');
  
  // Handle order creation notification
  React.useEffect(() => {
    if (location.state?.orderCreated) {
      const { orderNumber, bottleCount } = location.state;
      showSuccessToast(`Order ${orderNumber} created successfully! ${bottleCount} bottle(s) ordered.`);
      setActiveTab('orders'); // Switch to orders tab
      
      // Clear the state
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  // New order state
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Bottle details modal state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState('core');
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [isEditingCoreInfo, setIsEditingCoreInfo] = useState(false);
  const [editedCoreInfo, setEditedCoreInfo] = useState({});
  const [isEditingSupplierInfo, setIsEditingSupplierInfo] = useState(false);
  const [editedSupplierInfo, setEditedSupplierInfo] = useState({});
  const [isEditingDimensionsInfo, setIsEditingDimensionsInfo] = useState(false);
  const [editedDimensionsInfo, setEditedDimensionsInfo] = useState({});

  // Delete confirmation modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [bottleToDelete, setBottleToDelete] = useState(null);

  // Row actions & settings
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  // Create bottle modal
  const [isCreateBottleOpen, setIsCreateBottleOpen] = useState(false);
  const [newBottleName, setNewBottleName] = useState('');
  const [newBottleWarehouseInv, setNewBottleWarehouseInv] = useState('');
  const [newBottleSupplierInv, setNewBottleSupplierInv] = useState('');
  const [newBottleImageLink, setNewBottleImageLink] = useState('');
  const [createBottleTab, setCreateBottleTab] = useState('core');
  const [createBottleSearch, setCreateBottleSearch] = useState('');


  // Bottle details search
  const [detailsSearch, setDetailsSearch] = useState('');

  // Refs for table components
  const inventoryTableRef = React.useRef(null);
  const archivedOrdersTableRef = React.useRef(null);

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

  const getSectionLockStyles = (isEditing) => ({
    pointerEvents: isEditing ? 'auto' : 'none',
    userSelect: isEditing ? 'auto' : 'none',
    opacity: isEditing ? 1 : 0.9,
  });

  const detailsInputStyle = { height: '41px' };


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
    // Use actual bottle data from API instead of static data
    const originalData = bottle._original || {};
    const details = {
      core: {
        packagingName: bottle.name,
        bottleName: bottle.name,
        imageLink: originalData.image_link || '',
        sizeOz: originalData.size_oz || '',
        shape: originalData.shape || '',
        color: originalData.color || '',
        threadType: originalData.thread_type || '',
        capSize: originalData.cap_size || '',
        material: originalData.material || '',
        supplier: bottle.supplier || '',
        packagingPart: originalData.packaging_part_number || '',
        description: originalData.description || '',
        brand: originalData.brand || '',
      },
      supplier: {
        leadTimeWeeks: bottle.leadTimeWeeks || 0,
        moq: bottle.moq || 0,
        unitsPerPallet: bottle.unitsPerPallet || 0,
        unitsPerCase: bottle.unitsPerCase || 0,
        casesPerPallet: bottle.casesPerPallet || 0,
      },
      dimensions: {
        lengthIn: originalData.length_in || '',
        widthIn: originalData.width_in || '',
        heightIn: originalData.height_in || '',
        weightLbs: originalData.weight_lbs || '',
        labelSize: originalData.label_size || '',
      },
      inventory: {
        orderStrategy: originalData.order_strategy || 'Manual',
        supplierInventory: bottle.supplierInventory || 0,
        warehouseInventory: bottle.warehouseInventory || 0,
        maxWarehouseInventory: originalData.max_warehouse_inventory || 0,
        bottlesPerMinute: originalData.bottles_per_minute || 0,
      }
    };
    
    setSelectedBottle({
      id: bottle.id,
      name: bottle.name,
      details,
      rawData: originalData,
    });
    setActiveDetailsTab('core');
    setIsDetailsOpen(true);
    setDetailsSearch('');
    setIsEditingCoreInfo(false);
    setEditedCoreInfo({});
    setIsEditingSupplierInfo(false);
    setEditedSupplierInfo({});
    setIsEditingDimensionsInfo(false);
    setEditedDimensionsInfo({});
  };

  const handleSaveCoreInfo = () => {
    if (!selectedBottle || !selectedBottle.details) return;
    
    // Update the bottleDetails with edited values
    const updatedDetails = {
      ...selectedBottle.details,
      core: {
        ...selectedBottle.details.core,
        ...editedCoreInfo,
      },
    };
    
    // Update the selectedBottle state
    setSelectedBottle({
      ...selectedBottle,
      details: updatedDetails,
    });
    
    // Update the static bottleDetails object
    bottleDetails[selectedBottle.name] = updatedDetails;
    
    setIsEditingCoreInfo(false);
    setEditedCoreInfo({});
    showSuccessToast('Core Info updated successfully');
  };

  const handleCancelCoreInfoEdit = () => {
    setIsEditingCoreInfo(false);
    setEditedCoreInfo({});
  };

  const handleSaveSupplierInfo = () => {
    if (!selectedBottle || !selectedBottle.details) return;
    
    const updatedDetails = {
      ...selectedBottle.details,
      supplier: {
        ...selectedBottle.details.supplier,
        ...editedSupplierInfo,
      },
    };
    
    setSelectedBottle({
      ...selectedBottle,
      details: updatedDetails,
    });
    
    bottleDetails[selectedBottle.name] = updatedDetails;
    
    setIsEditingSupplierInfo(false);
    setEditedSupplierInfo({});
    showSuccessToast('Supplier Info updated successfully');
  };

  const handleCancelSupplierInfoEdit = () => {
    setIsEditingSupplierInfo(false);
    setEditedSupplierInfo({});
  };

  const handleSaveDimensionsInfo = () => {
    if (!selectedBottle || !selectedBottle.details) return;
    
    const updatedDetails = {
      ...selectedBottle.details,
      dimensions: {
        ...selectedBottle.details.dimensions,
        ...editedDimensionsInfo,
      },
    };
    
    setSelectedBottle({
      ...selectedBottle,
      details: updatedDetails,
    });
    
    bottleDetails[selectedBottle.name] = updatedDetails;
    
    setIsEditingDimensionsInfo(false);
    setEditedDimensionsInfo({});
    showSuccessToast('Dimensions Info updated successfully');
  };

  const handleCancelDimensionsInfoEdit = () => {
    setIsEditingDimensionsInfo(false);
    setEditedDimensionsInfo({});
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

    setIsNewOrderOpen(false);

    navigate('/dashboard/supply-chain/bottles/order', {
      state: {
        orderNumber: orderNumber.trim(),
        supplier: selectedSupplier,
        mode: 'create',
      },
    });

    // keep values if user navigates back, so don't reset here
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

    // Use the order's ID
    const orderId = order.id;

    navigate('/dashboard/supply-chain/bottles/order', {
      state: {
        orderNumber: order.orderNumber,
        supplier: supplierMeta,
        mode: 'receive',
        orderId: orderId,
      },
    });
  };

  // Order details page is now a separate route; no in-tab rendering here.

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`} style={{ padding: '24px' }}>
      {/* Header section */}
      <div
        className="flex items-center justify-between"
        style={{
          paddingBottom: '16px',
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

              {/* Tabs */}
              <div className="flex items-center rounded-full border border-gray-200 bg-white/70 dark:bg-dark-bg-tertiary p-1">
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
                      className={`px-3 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-900 text-white rounded-full shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      style={{ minWidth: 'fit-content' }}
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
                    Create new bottle
                  </button>
                </div>
              )}
            </div>

            {/* Cycle Counts button */}
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg px-5 py-2 shadow-md transition"
              onClick={() => {
                // Navigate to cycle counts page
                navigate('/dashboard/supply-chain/bottles/cycle-counts');
              }}
            >
              Cycle Counts
            </button>

            {/* New Order button */}
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg px-5 py-2 shadow-md transition"
              onClick={() => setIsNewOrderOpen(true)}
            >
              + New Order
            </button>
          </div>
        </div>

      {/* Content section */}
      <div style={{ marginTop: '24px' }}>
        {activeTab === 'inventory' && (
          <InventoryTable
            ref={inventoryTableRef}
            searchQuery={search}
            themeClasses={themeClasses}
            onBottleClick={openBottleDetails}
            onDeleteClick={(bottle) => {
              setBottleToDelete(bottle);
              setIsDeleteOpen(true);
            }}
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: '#2C3544' }}>
              <h2 className="text-base font-semibold text-white">Create New Bottle</h2>
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
                    if (!inventoryTableRef.current) return;
                    inventoryTableRef.current.addBottle({
                        name: newBottleName.trim(),
                        warehouseInventory: Number(newBottleWarehouseInv) || 0,
                        supplierInventory: Number(newBottleSupplierInv) || 0,
                    });
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

      {/* Delete Bottle Confirmation Modal */}
      {isDeleteOpen && bottleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col px-8 py-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center">
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
              <h2 className="text-lg font-bold text-gray-900">
                Delete {bottleToDelete.name}
              </h2>

              {/* Description */}
              <p className="text-sm text-gray-500">
                This will permanently delete the selected bottle. Deleted bottles cannot be recovered.
              </p>

              {/* Buttons */}
              <div className="flex w-full gap-3 mt-2">
                <button
                  type="button"
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                  onClick={() => {
                    setIsDeleteOpen(false);
                    setBottleToDelete(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-lg shadow-sm hover:bg-red-600"
                  onClick={() => {
                    // Don't delete if it's the 8oz Bottle - just close the modal
                    if (bottleToDelete.name !== '8oz Bottle') {
                      if (inventoryTableRef.current) {
                        inventoryTableRef.current.deleteBottle(bottleToDelete.id);
                        showSuccessToast(`${bottleToDelete.name} deleted successfully`);
                      }
                    // Close details modal if it was open for this bottle
                    if (selectedBottle && selectedBottle.id === bottleToDelete.id) {
                      setIsDetailsOpen(false);
                      setSelectedBottle(null);
                    }
                    }
                    setIsDeleteOpen(false);
                    setBottleToDelete(null);
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div
            className="bg-white rounded-xl shadow-2xl w-[800px] my-auto flex flex-col"
            style={{ height: '524px' }}
          >
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
            <div className="px-6 pt-4 flex items-center justify-between gap-4">
              <div className="flex items-center rounded-lg bg-white border border-gray-200 p-1 gap-1 h-[32px]">
                {['core', 'supplier', 'dimensions', 'inventory'].map((key, index) => {
                  const labelMap = {
                    core: 'Core Info',
                    supplier: 'Supplier Info',
                    dimensions: 'Dimensions',
                    inventory: 'Inventory',
                  };
                  const isActive = activeDetailsTab === key;
                  const hasNotification = key === 'core' || key === 'dimensions';
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveDetailsTab(key)}
                      className={`px-4 py-1 text-xs font-medium transition-colors flex items-center gap-2 ${
                        isActive
                          ? 'bg-blue-600 text-white font-semibold rounded border border-blue-500/20 shadow-sm'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      <span>{labelMap[key]}</span>
                      {hasNotification && (
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="w-[280px] relative">
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
                  className="w-full h-[31px] rounded-[6px] border border-gray-300 p-2 pl-8 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
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
              {activeDetailsTab === 'core' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Core Info</h3>
                    {!isEditingCoreInfo && (
                      <button
                        type="button"
                        onClick={() => setIsEditingCoreInfo(true)}
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-medium"
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
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                        Edit Info
                      </button>
                    )}
                  </div>
                  <div style={getSectionLockStyles(isEditingCoreInfo)}>
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Packaging Name
                      </label>
                      <input
                        value={
                          isEditingCoreInfo
                            ? editedCoreInfo.packagingName !== undefined
                              ? editedCoreInfo.packagingName
                              : selectedBottle.details?.core.packagingName || selectedBottle.name
                            : selectedBottle.details?.core.packagingName || selectedBottle.name
                        }
                        onChange={(e) =>
                          setEditedCoreInfo({ ...editedCoreInfo, packagingName: e.target.value })
                        }
                        readOnly={!isEditingCoreInfo}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingCoreInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(
                          selectedBottle.details?.core.packagingName || selectedBottle.name
                        )}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Bottle Image Link
                      </label>
                      <input
                        value={
                          isEditingCoreInfo
                            ? editedCoreInfo.imageLink !== undefined
                              ? editedCoreInfo.imageLink
                              : selectedBottle.details?.core.imageLink || ''
                            : selectedBottle.details?.core.imageLink || ''
                        }
                        onChange={(e) =>
                          setEditedCoreInfo({ ...editedCoreInfo, imageLink: e.target.value })
                        }
                        readOnly={!isEditingCoreInfo}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingCoreInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(selectedBottle.details?.core.imageLink || '')}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Size (oz)
                      </label>
                      <input
                        value={
                          isEditingCoreInfo
                            ? editedCoreInfo.sizeOz !== undefined
                              ? editedCoreInfo.sizeOz
                              : selectedBottle.details?.core.sizeOz || ''
                            : selectedBottle.details?.core.sizeOz || ''
                        }
                        onChange={(e) =>
                          setEditedCoreInfo({ ...editedCoreInfo, sizeOz: e.target.value })
                        }
                        readOnly={!isEditingCoreInfo}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingCoreInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(selectedBottle.details?.core.sizeOz || '')}`}
                        style={detailsInputStyle}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Shape</label>
                      <input
                        value={
                          isEditingCoreInfo
                            ? editedCoreInfo.shape !== undefined
                              ? editedCoreInfo.shape
                              : selectedBottle.details?.core.shape || ''
                            : selectedBottle.details?.core.shape || ''
                        }
                        onChange={(e) =>
                          setEditedCoreInfo({ ...editedCoreInfo, shape: e.target.value })
                        }
                        readOnly={!isEditingCoreInfo}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingCoreInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(selectedBottle.details?.core.shape || '')}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                      <input
                        value={
                          isEditingCoreInfo
                            ? editedCoreInfo.color !== undefined
                              ? editedCoreInfo.color
                              : selectedBottle.details?.core.color || ''
                            : selectedBottle.details?.core.color || ''
                        }
                        onChange={(e) =>
                          setEditedCoreInfo({ ...editedCoreInfo, color: e.target.value })
                        }
                        readOnly={!isEditingCoreInfo}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingCoreInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(selectedBottle.details?.core.color || '')}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Thread Type
                      </label>
                      <input
                        value={
                          isEditingCoreInfo
                            ? editedCoreInfo.threadType !== undefined
                              ? editedCoreInfo.threadType
                              : selectedBottle.details?.core.threadType || ''
                            : selectedBottle.details?.core.threadType || ''
                        }
                        onChange={(e) =>
                          setEditedCoreInfo({ ...editedCoreInfo, threadType: e.target.value })
                        }
                        readOnly={!isEditingCoreInfo}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingCoreInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(selectedBottle.details?.core.threadType || '')}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Cap Size
                      </label>
                      <input
                        value={
                          isEditingCoreInfo
                            ? editedCoreInfo.capSize !== undefined
                              ? editedCoreInfo.capSize
                              : selectedBottle.details?.core.capSize || ''
                            : selectedBottle.details?.core.capSize || ''
                        }
                        onChange={(e) =>
                          setEditedCoreInfo({ ...editedCoreInfo, capSize: e.target.value })
                        }
                        readOnly={!isEditingCoreInfo}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingCoreInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(selectedBottle.details?.core.capSize || '')}`}
                        style={detailsInputStyle}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Material
                      </label>
                      <input
                        value={
                          isEditingCoreInfo
                            ? editedCoreInfo.material !== undefined
                              ? editedCoreInfo.material
                              : selectedBottle.details?.core.material || ''
                            : selectedBottle.details?.core.material || ''
                        }
                        onChange={(e) =>
                          setEditedCoreInfo({ ...editedCoreInfo, material: e.target.value })
                        }
                        readOnly={!isEditingCoreInfo}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingCoreInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(selectedBottle.details?.core.material || '')}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Supplier
                      </label>
                      <input
                        value={
                          isEditingCoreInfo
                            ? editedCoreInfo.supplier !== undefined
                              ? editedCoreInfo.supplier
                              : selectedBottle.details?.core.supplier || ''
                            : selectedBottle.details?.core.supplier || ''
                        }
                        onChange={(e) =>
                          setEditedCoreInfo({ ...editedCoreInfo, supplier: e.target.value })
                        }
                        readOnly={!isEditingCoreInfo}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingCoreInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(selectedBottle.details?.core.supplier || '')}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Packaging Part #
                      </label>
                      <input
                        value={
                          isEditingCoreInfo
                            ? editedCoreInfo.packagingPart !== undefined
                              ? editedCoreInfo.packagingPart
                              : selectedBottle.details?.core.packagingPart || ''
                            : selectedBottle.details?.core.packagingPart || ''
                        }
                        onChange={(e) =>
                          setEditedCoreInfo({ ...editedCoreInfo, packagingPart: e.target.value })
                        }
                        readOnly={!isEditingCoreInfo}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingCoreInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(selectedBottle.details?.core.packagingPart || '')}`}
                        style={detailsInputStyle}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Description
                      </label>
                      <input
                        value={
                          isEditingCoreInfo
                            ? editedCoreInfo.description !== undefined
                              ? editedCoreInfo.description
                              : selectedBottle.details?.core.description || ''
                            : selectedBottle.details?.core.description || ''
                        }
                        onChange={(e) =>
                          setEditedCoreInfo({ ...editedCoreInfo, description: e.target.value })
                        }
                        readOnly={!isEditingCoreInfo}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingCoreInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(selectedBottle.details?.core.description || '')}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Brand</label>
                      <input
                        value={
                          isEditingCoreInfo
                            ? editedCoreInfo.brand !== undefined
                              ? editedCoreInfo.brand
                              : selectedBottle.details?.core.brand || ''
                            : selectedBottle.details?.core.brand || ''
                        }
                        onChange={(e) =>
                          setEditedCoreInfo({ ...editedCoreInfo, brand: e.target.value })
                        }
                        readOnly={!isEditingCoreInfo}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingCoreInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(selectedBottle.details?.core.brand || '')}`}
                        style={detailsInputStyle}
                      />
                    </div>
                  </div>
                  </div>

                  {isEditingCoreInfo && (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={handleCancelCoreInfoEdit}
                        className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCoreInfo}
                        className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeDetailsTab === 'supplier' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Supplier Info</h3>
                    {!isEditingSupplierInfo && (
                      <button
                        type="button"
                        onClick={() => setIsEditingSupplierInfo(true)}
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-medium"
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
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                        Edit Info
                      </button>
                    )}
                  </div>
                  <div style={getSectionLockStyles(isEditingSupplierInfo)}>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Lead Time (Weeks)
                      </label>
                      <input
                        value={
                          isEditingSupplierInfo
                            ? editedSupplierInfo.leadTimeWeeks !== undefined
                              ? editedSupplierInfo.leadTimeWeeks
                              : selectedBottle.details?.supplier.leadTimeWeeks || ''
                            : selectedBottle.details?.supplier.leadTimeWeeks || ''
                        }
                        onChange={(e) =>
                          setEditedSupplierInfo({ ...editedSupplierInfo, leadTimeWeeks: e.target.value })
                        }
                        readOnly={!isEditingSupplierInfo}
                        placeholder={!selectedBottle.details?.supplier.leadTimeWeeks ? "Enter lead time" : ""}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingSupplierInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(
                          selectedBottle.details?.supplier.leadTimeWeeks || ''
                        )}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">MOQ</label>
                      <input
                        value={
                          isEditingSupplierInfo
                            ? editedSupplierInfo.moq !== undefined
                              ? editedSupplierInfo.moq
                              : selectedBottle.details?.supplier.moq || ''
                            : selectedBottle.details?.supplier.moq || ''
                        }
                        onChange={(e) =>
                          setEditedSupplierInfo({ ...editedSupplierInfo, moq: e.target.value })
                        }
                        readOnly={!isEditingSupplierInfo}
                        placeholder={!selectedBottle.details?.supplier.moq ? "Enter MOQ" : ""}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingSupplierInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(
                          selectedBottle.details?.supplier.moq || ''
                        )}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Units per Pallet
                      </label>
                      <input
                        value={
                          isEditingSupplierInfo
                            ? editedSupplierInfo.unitsPerPallet !== undefined
                              ? editedSupplierInfo.unitsPerPallet
                              : selectedBottle.details?.supplier.unitsPerPallet || ''
                            : selectedBottle.details?.supplier.unitsPerPallet || ''
                        }
                        onChange={(e) =>
                          setEditedSupplierInfo({ ...editedSupplierInfo, unitsPerPallet: e.target.value })
                        }
                        readOnly={!isEditingSupplierInfo}
                        placeholder={!selectedBottle.details?.supplier.unitsPerPallet ? "Enter units per pallet" : ""}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingSupplierInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(
                          selectedBottle.details?.supplier.unitsPerPallet || ''
                        )}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Units per Case
                      </label>
                      <input
                        value={
                          isEditingSupplierInfo
                            ? editedSupplierInfo.unitsPerCase !== undefined
                              ? editedSupplierInfo.unitsPerCase
                              : selectedBottle.details?.supplier.unitsPerCase || ''
                            : selectedBottle.details?.supplier.unitsPerCase || ''
                        }
                        onChange={(e) =>
                          setEditedSupplierInfo({ ...editedSupplierInfo, unitsPerCase: e.target.value })
                        }
                        readOnly={!isEditingSupplierInfo}
                        placeholder={!selectedBottle.details?.supplier.unitsPerCase ? "Enter units per case" : ""}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingSupplierInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(
                          selectedBottle.details?.supplier.unitsPerCase || ''
                        )}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Cases per Pallet
                      </label>
                      <input
                        value={
                          isEditingSupplierInfo
                            ? editedSupplierInfo.casesPerPallet !== undefined
                              ? editedSupplierInfo.casesPerPallet
                              : selectedBottle.details?.supplier.casesPerPallet || ''
                            : selectedBottle.details?.supplier.casesPerPallet || ''
                        }
                        onChange={(e) =>
                          setEditedSupplierInfo({ ...editedSupplierInfo, casesPerPallet: e.target.value })
                        }
                        readOnly={!isEditingSupplierInfo}
                        placeholder={!selectedBottle.details?.supplier.casesPerPallet ? "Enter cases per pallet" : ""}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingSupplierInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(
                          selectedBottle.details?.supplier.casesPerPallet || ''
                        )}`}
                        style={detailsInputStyle}
                      />
                    </div>
                  </div>
                  </div>

                  {isEditingSupplierInfo && (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={handleCancelSupplierInfoEdit}
                        className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveSupplierInfo}
                        className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeDetailsTab === 'dimensions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Dimensions</h3>
                    {!isEditingDimensionsInfo && (
                      <button
                        type="button"
                        onClick={() => setIsEditingDimensionsInfo(true)}
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-medium"
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
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                        Edit Info
                      </button>
                    )}
                  </div>
                  <div style={getSectionLockStyles(isEditingDimensionsInfo)}>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Length (in)
                      </label>
                      <input
                        value={
                          isEditingDimensionsInfo
                            ? editedDimensionsInfo.lengthIn !== undefined
                              ? editedDimensionsInfo.lengthIn
                              : selectedBottle.details?.dimensions.lengthIn || ''
                            : selectedBottle.details?.dimensions.lengthIn || ''
                        }
                        onChange={(e) =>
                          setEditedDimensionsInfo({ ...editedDimensionsInfo, lengthIn: e.target.value })
                        }
                        readOnly={!isEditingDimensionsInfo}
                        placeholder={!selectedBottle.details?.dimensions.lengthIn ? "Enter length" : ""}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingDimensionsInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(
                          selectedBottle.details?.dimensions.lengthIn || ''
                        )}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Width (in)
                      </label>
                      <input
                        value={
                          isEditingDimensionsInfo
                            ? editedDimensionsInfo.widthIn !== undefined
                              ? editedDimensionsInfo.widthIn
                              : selectedBottle.details?.dimensions.widthIn || ''
                            : selectedBottle.details?.dimensions.widthIn || ''
                        }
                        onChange={(e) =>
                          setEditedDimensionsInfo({ ...editedDimensionsInfo, widthIn: e.target.value })
                        }
                        readOnly={!isEditingDimensionsInfo}
                        placeholder={!selectedBottle.details?.dimensions.widthIn ? "Enter width" : ""}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingDimensionsInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(
                          selectedBottle.details?.dimensions.widthIn || ''
                        )}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Height (in)
                      </label>
                      <input
                        value={
                          isEditingDimensionsInfo
                            ? editedDimensionsInfo.heightIn !== undefined
                              ? editedDimensionsInfo.heightIn
                              : selectedBottle.details?.dimensions.heightIn || ''
                            : selectedBottle.details?.dimensions.heightIn || ''
                        }
                        onChange={(e) =>
                          setEditedDimensionsInfo({ ...editedDimensionsInfo, heightIn: e.target.value })
                        }
                        readOnly={!isEditingDimensionsInfo}
                        placeholder={!selectedBottle.details?.dimensions.heightIn ? "Enter height" : ""}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingDimensionsInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(
                          selectedBottle.details?.dimensions.heightIn || ''
                        )}`}
                        style={detailsInputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Weight (lbs) - Finished Good
                      </label>
                      <input
                        value={
                          isEditingDimensionsInfo
                            ? editedDimensionsInfo.weightLbs !== undefined
                              ? editedDimensionsInfo.weightLbs
                              : selectedBottle.details?.dimensions.weightLbs || ''
                            : selectedBottle.details?.dimensions.weightLbs || ''
                        }
                        onChange={(e) =>
                          setEditedDimensionsInfo({ ...editedDimensionsInfo, weightLbs: e.target.value })
                        }
                        readOnly={!isEditingDimensionsInfo}
                        placeholder={!selectedBottle.details?.dimensions.weightLbs ? "Enter weight" : ""}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingDimensionsInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(
                          selectedBottle.details?.dimensions.weightLbs || ''
                        )}`}
                        style={detailsInputStyle}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Label Size
                      </label>
                      <input
                        value={
                          isEditingDimensionsInfo
                            ? editedDimensionsInfo.labelSize !== undefined
                              ? editedDimensionsInfo.labelSize
                              : selectedBottle.details?.dimensions.labelSize || ''
                            : selectedBottle.details?.dimensions.labelSize || ''
                        }
                        onChange={(e) =>
                          setEditedDimensionsInfo({ ...editedDimensionsInfo, labelSize: e.target.value })
                        }
                        readOnly={!isEditingDimensionsInfo}
                        placeholder={!selectedBottle.details?.dimensions.labelSize ? "Enter label size" : ""}
                        className={`w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm ${
                          isEditingDimensionsInfo
                            ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500'
                            : ''
                        }${getDetailsHighlightClass(
                          selectedBottle.details?.dimensions.labelSize || ''
                        )}`}
                        style={detailsInputStyle}
                      />
                    </div>
                  </div>
                  </div>

                  {isEditingDimensionsInfo && (
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={handleCancelDimensionsInfoEdit}
                        className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDimensionsInfo}
                        className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}
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
                        style={detailsInputStyle}
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
                        style={detailsInputStyle}
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
                        style={detailsInputStyle}
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
                        style={detailsInputStyle}
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
