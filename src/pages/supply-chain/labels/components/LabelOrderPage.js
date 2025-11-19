import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';

const LabelOrderPage = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const orderNumber = state.orderNumber || '34113';
  const supplier = state.supplier || { name: 'TricorBraun', logoSrc: '/assets/tricorbraun.png' };
  const mode = state.mode || 'create';
  const isCreateMode = mode === 'create';
  const isViewMode = mode === 'view' || mode === 'receive';
  const orderId = state.orderId || null;
  
  // Get lines from state (saved order lines when viewing, or all inventory when creating)
  const allLines = state.lines || [
    { id: 1, brand: 'Total Pest Spray', product: 'Cherry Tree Fertilizer', size: 'Gallon', qty: 25000, status: 'Completed', inventory: 25000, toOrder: 25000, daysOfInv: 25000, sales7Day: 1200, sales30Day: 5000, sales4Month: 20000, lblSize: '5.375" x 4.5"', label: 'Label Link' },
    { id: 2, brand: 'Total Pest Spray', product: 'Cherry Tree Fertilizer', size: 'Gallon', qty: 25000, status: 'Completed', inventory: 25000, toOrder: 25000, daysOfInv: 25000, sales7Day: 1200, sales30Day: 5000, sales4Month: 20000, lblSize: '5.375" x 4.5"', label: 'Label Link' },
    { id: 3, brand: 'Total Pest Spray', product: 'Cherry Tree Fertilizer', size: 'Gallon', qty: 25000, status: 'Completed', inventory: 25000, toOrder: 25000, daysOfInv: 25000, sales7Day: 1200, sales30Day: 5000, sales4Month: 20000, lblSize: '5.375" x 4.5"', label: 'Label Link' },
    { id: 4, brand: 'Total Pest Spray', product: 'Cherry Tree Fertilizer', size: 'Gallon', qty: 25000, status: 'Completed', inventory: 25000, toOrder: 25000, daysOfInv: 25000, sales7Day: 1200, sales30Day: 5000, sales4Month: 20000, lblSize: '5.375" x 4.5"', label: 'Label Link' },
    { id: 5, brand: 'Total Pest Spray', product: 'Cherry Tree Fertilizer', size: 'Gallon', qty: 25000, status: 'Completed', inventory: 25000, toOrder: 25000, daysOfInv: 25000, sales7Day: 1200, sales30Day: 5000, sales4Month: 20000, lblSize: '5.375" x 4.5"', label: 'Label Link' },
    { id: 6, brand: 'Total Pest Spray', product: 'Cherry Tree Fertilizer', size: 'Gallon', qty: 25000, status: 'Completed', inventory: 25000, toOrder: 25000, daysOfInv: 25000, sales7Day: 1200, sales30Day: 5000, sales4Month: 20000, lblSize: '5.375" x 4.5"', label: 'Label Link' },
  ];

  // Initialize order lines
  // When viewing an existing order, all items are already selected (they're part of the order)
  // When creating a new order, all items start unselected
  const [orderLines, setOrderLines] = useState(() => {
    if (isViewMode && allLines.length > 0) {
      // When viewing, all items are part of the order (all selected)
      return allLines.map((line) => ({ ...line, selected: true }));
    }
    // When creating, all items start unselected
    return allLines.map((line) => ({ ...line, selected: false }));
  });

  // Get selected items for summary and order creation
  const selectedLines = useMemo(() => {
    return orderLines.filter((line) => line.selected);
  }, [orderLines]);

  // Calculate summary based on selected items
  const summary = useMemo(() => {
    const totalLabels = selectedLines.reduce((sum, line) => sum + (line.toOrder || line.qty || 0), 0);
    return {
      products: selectedLines.length,
      totalLabels,
      estCost: 0, // Can be calculated if cost data is available
    };
  }, [selectedLines]);

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

  const handleCheckboxChange = (id) => {
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, selected: !line.selected } : line
      )
    );
  };

  const handleSelectAll = () => {
    // In view mode, all items are already part of the order, so don't allow deselection
    if (isViewMode) {
      return;
    }
    const allSelected = orderLines.every((line) => line.selected);
    setOrderLines((prev) =>
      prev.map((line) => ({ ...line, selected: !allSelected }))
    );
  };

  const handleCreateOrder = () => {
    // Only include selected items in the order
    const selectedItems = orderLines.filter((line) => line.selected);
    
    if (selectedItems.length === 0) {
      // Show warning if no items selected
      return;
    }
    
    // Navigate back to Labels page with order data
    navigate('/dashboard/supply-chain/labels', {
      state: {
        newLabelOrder: {
          orderNumber: orderNumber,
          supplierName: supplier.name,
          lines: selectedItems,
        },
      },
      replace: false,
    });
  };

  return (
    <div className={`min-h-screen p-8 ${themeClasses.pageBg}`}>
      {/* Header row */}
      <div className="flex items-center justify-between px-6 py-4" style={{ marginBottom: '24px' }}>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-full hover:bg-gray-100"
              onClick={handleBack}
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </span>
              Back
            </button>

            <div className="flex flex-col gap-1 text-xs text-gray-500">
              <div className="flex items-center gap-8">
                <div style={{ width: '95px', height: 'fit-content', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className="uppercase tracking-wide text-[10px] text-gray-400">LABEL ORDER #</div>
                  <div className="text-sm font-semibold text-gray-900" style={{ height: '35px', display: 'flex', alignItems: 'center' }}>{orderNumber}</div>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="uppercase tracking-wide text-[10px] text-gray-400">SUPPLIER</div>
                  <div className="flex items-center gap-2">
                    {supplier.logoSrc && (
                      <img
                        src={supplier.logoSrc}
                        alt={supplier.name}
                        className="h-5 w-auto"
                      />
                    )}
                    <span className="text-sm font-semibold text-gray-900">{supplier.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Create Order button - only show in create mode */}
            {isCreateMode && (
              <button
                type="button"
                className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg px-4 py-2 shadow-sm"
                onClick={handleCreateOrder}
              >
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-white/60">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                Create Order
              </button>
            )}

            {/* Receive Order button - only show in view mode */}
            {isViewMode && (
              <button
                type="button"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg px-4 py-2 shadow-sm"
                onClick={() => {
                  // Navigate back with received order info
                  navigate('/dashboard/supply-chain/labels', {
                    state: {
                      receivedOrderId: orderId,
                      receivedOrderNumber: orderNumber,
                    },
                  });
                }}
              >
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-white/60">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                Receive Order
              </button>
            )}

            {/* Search bar - only show in view mode */}
            {isViewMode && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Find a shipment..."
                  className="w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            )}
          </div>
        </div>

      {/* Summary Bar */}
      <div className="px-6 py-3" style={{ marginTop: '24px', marginBottom: '16px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8 text-sm">
            <div>
              <span className="text-gray-600 font-medium">PRODUCTS </span>
              <span className="text-gray-900 font-semibold">{summary.products}</span>
            </div>
            <div>
              <span className="text-gray-600 font-medium">TOTAL LABELS </span>
              <span className="text-gray-900 font-semibold">{summary.totalLabels.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600 font-medium">EST COST </span>
              <span className="text-gray-900 font-semibold">${summary.estCost.toLocaleString()}</span>
            </div>
          </div>
          {/* Search bar - show in create mode */}
          {isCreateMode && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Find a shipment..."
                  className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ width: '336px' }}
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
              <div className="flex flex-col">
                <button
                  type="button"
                  className="p-1 hover:bg-gray-50 transition-colors"
                  aria-label="Move up"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="p-1 hover:bg-gray-50 transition-colors"
                  aria-label="Move down"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table - Show only selected items */}
      <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-lg`} style={{ marginTop: '16px' }}>
        <div className="overflow-x-auto">
          {/* Table header */}
          <div className={themeClasses.headerBg} style={{ position: 'relative' }}>
            <div
              className="grid"
              style={{
                gridTemplateColumns: '40px 200px 200px 120px 120px 150px 120px 120px 120px 120px 120px 120px 120px 120px',
                minWidth: '1790px',
              }}
            >
              {/* Checkbox - Sticky */}
              <div 
                className="px-6 py-3 flex items-center justify-center"
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 20,
                  backgroundColor: '#2C3544',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                }}
              >
                <input
                  type="checkbox"
                  checked={isViewMode ? true : (orderLines.length > 0 && orderLines.every((line) => line.selected))}
                  onChange={handleSelectAll}
                  disabled={isViewMode}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {/* BRAND - Sticky */}
              <div 
                className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]"
                style={{
                  position: 'sticky',
                  left: '40px',
                  zIndex: 19,
                  backgroundColor: '#2C3544',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                }}
              >
                BRAND
              </div>
              {/* PRODUCT - Sticky */}
              <div 
                className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]"
                style={{
                  position: 'sticky',
                  left: '240px',
                  zIndex: 19,
                  backgroundColor: '#2C3544',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                }}
              >
                PRODUCT
              </div>
              {/* SIZE - Sticky */}
              <div 
                className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]"
                style={{
                  position: 'sticky',
                  left: '440px',
                  zIndex: 19,
                  backgroundColor: '#2C3544',
                  boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                }}
              >
                SIZE
              </div>
              {/* QTY - Scrollable */}
              <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
                QTY
              </div>
              {/* STATUS - Scrollable */}
              <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
                STATUS
              </div>
              {/* INVENTORY - Scrollable */}
              <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
                INVENTORY
              </div>
              {/* # TO ORDER - Scrollable */}
              <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
                # TO ORDER
              </div>
              {/* DAYS OF INV - Scrollable */}
              <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
                DAYS OF INV
              </div>
              {/* 7 DAY SALES - Scrollable */}
              <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
                7 DAY SALES
              </div>
              {/* 30 DAY SALES - Scrollable */}
              <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
                30 DAY SALES
              </div>
              {/* 4 MONTH SALES - Scrollable */}
              <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
                4 MONTH SALES
              </div>
              {/* LBL SIZE - Scrollable */}
              <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
                LBL SIZE
              </div>
              {/* LABEL - Scrollable */}
              <div className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider">
                LABEL
              </div>
            </div>
          </div>

          {/* Table body - Show all items with checkboxes */}
          <div>
            {orderLines.length === 0 ? (
              <div className="px-6 py-6 text-center text-sm italic text-gray-400">
                No items available.
              </div>
            ) : (
              orderLines.map((line, index) => {
                const rowBg = isDarkMode ? '#111827' : '#FFFFFF';
                return (
                  <div
                    key={line.id}
                    className={`grid text-sm ${themeClasses.rowHover} transition-colors`}
                    style={{
                      gridTemplateColumns: '40px 200px 200px 120px 120px 150px 120px 120px 120px 120px 120px 120px 120px 120px',
                      minWidth: '1790px',
                      borderBottom:
                        index === orderLines.length - 1
                          ? 'none'
                          : isDarkMode
                          ? '1px solid rgba(75,85,99,0.3)'
                          : '1px solid #e5e7eb',
                    }}
                  >
                    {/* Checkbox - Sticky */}
                    <div 
                      className="px-6 py-3 flex items-center justify-center"
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 15,
                        backgroundColor: rowBg,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isViewMode ? true : (line.selected || false)}
                        onChange={() => handleCheckboxChange(line.id)}
                        disabled={isViewMode}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* BRAND - Sticky */}
                    <div 
                      className="px-6 py-3 flex items-center"
                      style={{
                        position: 'sticky',
                        left: '40px',
                        zIndex: 14,
                        backgroundColor: rowBg,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                      }}
                    >
                      <span className={themeClasses.textPrimary}>{line.brand}</span>
                    </div>

                    {/* PRODUCT - Sticky */}
                    <div 
                      className="px-6 py-3 flex items-center"
                      style={{
                        position: 'sticky',
                        left: '240px',
                        zIndex: 14,
                        backgroundColor: rowBg,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                      }}
                    >
                      <span className={themeClasses.textPrimary}>{line.product}</span>
                    </div>

                    {/* SIZE - Sticky */}
                    <div 
                      className="px-6 py-3 flex items-center"
                      style={{
                        position: 'sticky',
                        left: '440px',
                        zIndex: 14,
                        backgroundColor: rowBg,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                      }}
                    >
                      <span className={themeClasses.textPrimary}>{line.size}</span>
                    </div>

                    {/* QTY - Scrollable */}
                    <div className="px-6 py-3 flex items-center">
                      <span 
                        className="inline-flex items-center justify-center"
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          height: '24px',
                          minWidth: '70px',
                          fontSize: '0.875rem',
                          color: '#000000',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                        }}
                      >
                        {line.qty.toLocaleString()}
                      </span>
                    </div>

                    {/* STATUS - Scrollable */}
                    <div className="px-6 py-3 flex items-center">
                      <span 
                        className="inline-flex items-center justify-center gap-2"
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: '4px',
                          padding: '4px 12px',
                          height: '24px',
                          fontSize: '0.875rem',
                          color: '#374151',
                          fontWeight: 500,
                        }}
                      >
                        <svg className="w-3.5 h-3.5" fill="#10B981" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10B981"/>
                        </svg>
                        Completed
                      </span>
                    </div>

                    {/* INVENTORY - Scrollable */}
                    <div className="px-6 py-3 flex items-center">
                      <span className={themeClasses.textPrimary}>{line.inventory.toLocaleString()}</span>
                    </div>

                    {/* # TO ORDER - Scrollable */}
                    <div className="px-6 py-3 flex items-center">
                      <span className={themeClasses.textPrimary}>{line.toOrder.toLocaleString()}</span>
                    </div>

                    {/* DAYS OF INV - Scrollable */}
                    <div className="px-6 py-3 flex items-center">
                      <span className={themeClasses.textPrimary}>{line.daysOfInv.toLocaleString()}</span>
                    </div>

                    {/* 7 DAY SALES - Scrollable */}
                    <div className="px-6 py-3 flex items-center">
                      <span className={themeClasses.textPrimary}>{(line.sales7Day || 0).toLocaleString()}</span>
                    </div>

                    {/* 30 DAY SALES - Scrollable */}
                    <div className="px-6 py-3 flex items-center">
                      <span className={themeClasses.textPrimary}>{(line.sales30Day || 0).toLocaleString()}</span>
                    </div>

                    {/* 4 MONTH SALES - Scrollable */}
                    <div className="px-6 py-3 flex items-center">
                      <span className={themeClasses.textPrimary}>{(line.sales4Month || 0).toLocaleString()}</span>
                    </div>

                    {/* LBL SIZE - Scrollable */}
                    <div className="px-6 py-3 flex items-center">
                      <span className={themeClasses.textPrimary}>{line.lblSize || '-'}</span>
                    </div>

                    {/* LABEL - Scrollable */}
                    <div className="px-6 py-3 flex items-center">
                      <span className={themeClasses.textPrimary}>{line.label || '-'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelOrderPage;

