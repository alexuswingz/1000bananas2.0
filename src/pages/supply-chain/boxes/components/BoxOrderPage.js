import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';

const BoxOrderPage = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const orderNumber = state.orderNumber || new Date().toISOString().split('T')[0];
  const supplier = state.supplier || { name: 'Rhino Container', logoSrc: '/assets/rhino.png' };
  const mode = state.mode || 'receive';
  const isReceiveMode = mode === 'receive'; // Simple view (first image)
  const isCreateMode = mode === 'create'; // Detailed view (second image)
  const orderId = state.orderId || null;
  
  // Default box order lines with pallets - for receive mode
  const getInitialLines = () => {
    if (state.lines && state.lines.length > 0) {
      // If lines are provided, use them but ensure they have pallets
      // Transform box sizes to packaging names
      // Limit to first 3 items only
      const limitedLines = state.lines.slice(0, 3);
      
      return limitedLines.map((line, index) => {
        // Map box sizes to packaging names for both receive and create mode
        let packagingName = line.name;
        // If it's a box size format (e.g., "12 x 10 x 12"), map to packaging name
        if (line.name && line.name.includes('x')) {
          // Use first 3 items as packaging names
          const packagingNames = ['8oz', 'Quart', 'Gallon'];
          packagingName = packagingNames[index] || line.name;
        }
        
        return {
          ...line,
          name: packagingName,
          pallets: line.pallets || 4,
          selected: line.selected !== undefined ? line.selected : (index < 2), // First two checked by default
        };
      });
    }
    // Default data matching the second image - only 3 rows
    return [
      { id: 1, name: '8oz', qty: 29120, pallets: 4, selected: true },
      { id: 2, name: 'Quart', qty: 5040, pallets: 4, selected: true },
      { id: 3, name: 'Gallon', qty: 768, pallets: 4, selected: false },
    ];
  };

  const initialLines = getInitialLines();

  const [orderLines, setOrderLines] = useState(initialLines);

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
    navigate('/dashboard/supply-chain/boxes');
  };

  const handleQtyChange = (id, delta) => {
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === id
          ? { ...line, qty: Math.max(0, line.qty + delta) }
          : line
      )
    );
  };

  const handleQtyInputChange = (id, value) => {
    const numValue = Math.max(0, parseInt(value.replace(/,/g, '')) || 0);
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, qty: numValue } : line
      )
    );
  };

  const handlePalletsChange = (id, delta) => {
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === id
          ? { ...line, pallets: Math.max(0, (line.pallets || 0) + delta) }
          : line
      )
    );
  };

  const handlePalletsInputChange = (id, value) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, pallets: numValue } : line
      )
    );
  };

  const handleCheckboxChange = (id) => {
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, selected: !line.selected } : line
      )
    );
  };

  const handleSelectAll = () => {
    const allSelected = orderLines.every((line) => line.selected);
    setOrderLines((prev) =>
      prev.map((line) => ({ ...line, selected: !allSelected }))
    );
  };

  return (
    <div className={`min-h-screen p-8 ${themeClasses.pageBg}`}>
      <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-lg`}>
        {/* Header row */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
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
                <div>
                  <div className="uppercase tracking-wide text-[10px] text-gray-400">ORDER #</div>
                  <div className="text-sm font-semibold text-gray-900">{orderNumber}</div>
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

          {/* Receive button - only show in receive mode */}
          {isReceiveMode && (
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg px-4 py-2 shadow-sm"
              onClick={() => {
                // Handle receive action
                console.log('Receive clicked', orderLines.filter(line => line.selected));
                navigate('/dashboard/supply-chain/boxes');
              }}
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-white/60">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </span>
              + Receive
            </button>
          )}
          
          {/* Search bar - only show in create mode */}
          {isCreateMode && (
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-64 pl-10 pr-8 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                <svg
                  className="w-3 h-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
                <svg
                  className="w-3 h-3 text-gray-400 -mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-lg overflow-hidden">
          {/* Table header */}
          <div className={themeClasses.headerBg}>
            {isReceiveMode ? (
              // Receive view: PACKAGING NAME, QTY, PALLETS, checkbox
              <div
                className="grid"
                style={{
                  gridTemplateColumns: '2fr 1.2fr 1.2fr 40px',
                }}
              >
                <div className="px-4 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
                  PACKAGING NAME
                </div>
                <div className="px-4 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
                  QTY
                </div>
                <div className="px-4 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  PALLETS
                </div>
                <div className="px-4 py-3 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={orderLines.length > 0 && orderLines.every((line) => line.selected)}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    style={{
                      accentColor: '#2563EB',
                      borderColor: orderLines.length > 0 && orderLines.every((line) => line.selected) ? '#2563EB' : '#D1D5DB',
                      backgroundColor: orderLines.length > 0 && orderLines.every((line) => line.selected) ? '#2563EB' : 'white',
                    }}
                  />
                </div>
              </div>
            ) : (
              // Create/Ordering view: PACKAGING NAME, SUPPLIER INVENTORY, UNITS NEEDED, QTY, PALLETS, checkbox
              <div
                className="grid"
                style={{
                  gridTemplateColumns: '2fr 1.5fr 1.5fr 1.5fr 1.5fr 40px',
                }}
              >
                <div className="px-4 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
                  PACKAGING NAME
                </div>
                <div className="px-4 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
                  SUPPLIER INVENTORY
                </div>
                <div className="px-4 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656]">
                  UNITS NEEDED
                </div>
                <div className="px-4 py-3 text-xs font-bold text-white uppercase tracking-wider border-r border-[#3C4656] text-center">
                  QTY
                </div>
                <div className="px-4 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  PALLETS
                </div>
                <div className="px-4 py-3 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={orderLines.length > 0 && orderLines.every((line) => line.selected)}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    style={{
                      accentColor: '#2563EB',
                      borderColor: orderLines.length > 0 && orderLines.every((line) => line.selected) ? '#2563EB' : '#D1D5DB',
                      backgroundColor: orderLines.length > 0 && orderLines.every((line) => line.selected) ? '#2563EB' : 'white',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Table body */}
          <div className="bg-white">
            {orderLines.map((line, index) => (
              <div
                key={line.id}
                className="grid text-sm bg-white"
                style={{
                  gridTemplateColumns: isReceiveMode ? '2fr 1.2fr 1.2fr 40px' : '2fr 1.5fr 1.5fr 1.5fr 1.5fr 40px',
                  borderBottom:
                    index === orderLines.length - 1
                      ? 'none'
                      : '1px solid #e5e7eb',
                }}
              >
                {/* Packaging Name */}
                <div className="px-4 py-3 flex items-center">
                  <span className="text-gray-900">{line.name}</span>
                </div>

                {/* Supplier Inventory - only in create mode */}
                {isCreateMode && (
                  <div className="px-4 py-3 flex items-center">
                    <span className="text-gray-900">{line.supplierInventory || 'Auto'}</span>
                  </div>
                )}

                {/* Units Needed - only in create mode */}
                {isCreateMode && (
                  <div className="px-4 py-3 flex items-center">
                    <span className="text-gray-900">{line.unitsNeeded?.toLocaleString() || '0'}</span>
                  </div>
                )}

                {/* QTY */}
                <div className="px-4 py-3 flex items-center justify-center">
                  {isReceiveMode ? (
                    // Plain text display in receive mode - no input box
                    <span className="text-sm text-gray-900 text-center">
                      {line.qty?.toLocaleString() || '0'}
                    </span>
                  ) : (
                    // Rounded rectangular control with +/- buttons in create mode - all in one container, compact, no borders
                    <div className="flex items-center rounded-lg bg-gray-100 overflow-hidden" style={{ width: 'fit-content' }}>
                      <button
                        type="button"
                        onClick={() => handleQtyChange(line.id, -1)}
                        className="px-2 py-1.5 text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={line.qty || 0}
                        onChange={(e) => handleQtyInputChange(line.id, e.target.value)}
                        className="px-2 py-1.5 text-center border-0 bg-gray-100 text-gray-900 focus:outline-none focus:ring-0 text-sm"
                        style={{ width: '70px', minWidth: '70px' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleQtyChange(line.id, 1)}
                        className="px-2 py-1.5 text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* PALLETS - show in create mode with +/- buttons */}
                {isCreateMode && (
                  <div className="px-4 py-3 flex items-center justify-center">
                    <div className="flex items-center rounded-lg bg-gray-100 overflow-hidden" style={{ width: 'fit-content' }}>
                      <button
                        type="button"
                        onClick={() => handlePalletsChange(line.id, -1)}
                        className="px-2 py-1.5 text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={line.pallets || 0}
                        onChange={(e) => handlePalletsInputChange(line.id, e.target.value)}
                        className="px-2 py-1.5 text-center border-0 bg-gray-100 text-gray-900 focus:outline-none focus:ring-0 text-sm"
                        style={{ width: '50px', minWidth: '50px' }}
                      />
                      <button
                        type="button"
                        onClick={() => handlePalletsChange(line.id, 1)}
                        className="px-2 py-1.5 text-gray-600 hover:bg-gray-200 transition-colors flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* PALLETS - only in receive mode */}
                {isReceiveMode && (
                  <div className="px-4 py-3 flex items-center justify-center">
                    <span className="text-sm text-gray-900 text-center">
                      {line.pallets || '0'}
                    </span>
                  </div>
                )}

                {/* Checkbox */}
                <div className="px-4 py-3 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={line.selected || false}
                    onChange={() => handleCheckboxChange(line.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    style={{
                      accentColor: '#2563EB',
                      borderColor: line.selected ? '#2563EB' : '#D1D5DB',
                      backgroundColor: line.selected ? '#2563EB' : 'white',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoxOrderPage;

