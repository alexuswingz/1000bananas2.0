import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const BottleOrderPage = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const orderNumber = state.orderNumber || '';
  const supplier = state.supplier || null;
  const mode = state.mode || 'create';
  const isReceiveMode = mode === 'receive';
  const orderId = state.orderId || null;
  const initialLines =
    state.lines ||
    [
      { id: 1, name: '8oz', supplierInventory: 'Auto Replenishment', unitsNeeded: 29120, qty: 29120, pallets: 4, selected: true },
      { id: 2, name: 'Quart', supplierInventory: 'Auto Replenishment', unitsNeeded: 5040, qty: 5040, pallets: 4, selected: true },
      { id: 3, name: 'Gallon', supplierInventory: 'Auto Replenishment', unitsNeeded: 768, qty: 768, pallets: 4, selected: true },
    ];

  const [orderLines, setOrderLines] = useState(initialLines);
  const [isReceiveConfirmOpen, setIsReceiveConfirmOpen] = useState(false);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
  };

  const handleBack = () => {
    navigate('/dashboard/supply-chain/bottles');
  };

  const handleCreateOrder = () => {
    // Send newly created order back to Bottles page via navigation state
    navigate('/dashboard/supply-chain/bottles', {
      state: {
        newBottleOrder: {
          orderNumber,
          supplierName: supplier.name,
        },
      },
    });
  };

  const handleReceiveComplete = () => {
    // Archive the order after receiving
    if (isReceiveMode && orderId) {
      navigate('/dashboard/supply-chain/bottles', {
        state: {
          receivedOrderId: orderId,
        },
      });
    } else {
      navigate('/dashboard/supply-chain/bottles');
    }
  };

  if (!supplier || !orderNumber) {
    // If this page is hit directly, just send user back to bottles
    handleBack();
    return null;
  }

  return (
    <div className={`p-8 ${themeClasses.pageBg}`}>
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
                  <div className="uppercase tracking-wide text-[10px] text-gray-400">Bottle Order #</div>
                  <div className="text-sm font-semibold text-gray-900">{orderNumber}</div>
                </div>
                <div className="flex flex-col items-start gap-1">
                  <div className="uppercase tracking-wide text-[10px] text-gray-400">Supplier</div>
                  <div className="flex items-center gap-2">
                    <img
                      src={supplier.logoSrc}
                      alt={supplier.logoAlt}
                      className="h-6 object-contain"
                    />
                    <span className="text-sm font-semibold text-gray-900">{supplier.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!isReceiveMode ? (
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg px-4 py-2 shadow-sm"
              onClick={handleCreateOrder}
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-white/60">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              Create Order
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg px-4 py-2 shadow-sm"
              onClick={() => {
                const allChecked = orderLines.every((line) => line.selected);
                if (allChecked) {
                  // Full receive – no partial popup
                  handleReceiveComplete();
                } else {
                  // Partial receive – show confirmation popup
                  setIsReceiveConfirmOpen(true);
                }
              }}
            >
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-white/60">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              Receive
            </button>
          )}
        </div>

        {/* Table */}
        <div className="px-6 py-4">
          <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="bg-[#1f2937] text-white text-[11px] font-semibold uppercase tracking-wide">
              <div
                className="grid items-center"
                style={{ gridTemplateColumns: '40px 2fr 2fr 1.5fr 1.2fr 1.2fr' }}
              >
                <div className="px-4 py-2 border-r border-gray-700 flex items-center justify-center">
                  <input type="checkbox" className="form-checkbox h-3 w-3 rounded border-gray-400" />
                </div>
                <div className="px-4 py-2 border-r border-gray-700 text-center">Packaging Name</div>
                <div className="px-4 py-2 border-r border-gray-700 text-center">Supplier Inventory</div>
                <div className="px-4 py-2 border-r border-gray-700 text-center">Units Needed</div>
                <div className="px-4 py-2 border-r border-gray-700 text-center">Qty</div>
                <div className="px-4 py-2 text-center">Pallets</div>
              </div>
            </div>

            {/* Table rows */}
            <div className="bg-white">
              {orderLines.map((line) => (
                <div
                  key={line.id}
                  className="grid items-center text-sm border-t border-gray-100"
                  style={{ gridTemplateColumns: '40px 2fr 2fr 1.5fr 1.2fr 1.2fr' }}
                >
                  <div className="px-4 py-2 flex items-center justify-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-3.5 w-3.5 rounded border-gray-400"
                      checked={line.selected}
                      onChange={(e) =>
                        setOrderLines((prev) =>
                          prev.map((l) =>
                            l.id === line.id ? { ...l, selected: e.target.checked } : l
                          )
                        )
                      }
                    />
                  </div>
                  <div className="px-4 py-2 text-sm text-gray-900">{line.name}</div>
                  <div className="px-4 py-2 text-xs text-gray-500">{line.supplierInventory}</div>
                  <div className="px-4 py-2 text-sm text-gray-900">
                    {line.unitsNeeded.toLocaleString()}
                  </div>
                  <div className="px-4 py-2">
                    <input
                      type="number"
                      className="w-full text-sm rounded-lg px-2 py-1 text-right bg-white shadow-inner border border-gray-200"
                      value={line.qty}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setOrderLines((prev) =>
                          prev.map((l) => (l.id === line.id ? { ...l, qty: val } : l))
                        );
                      }}
                    />
                  </div>
                  <div className="px-4 py-2">
                    <input
                      type="number"
                      className="w-full text-sm rounded-lg px-2 py-1 text-right bg-white shadow-inner border border-gray-200"
                      value={line.pallets}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setOrderLines((prev) =>
                          prev.map((l) => (l.id === line.id ? { ...l, pallets: val } : l))
                        );
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isReceiveMode && isReceiveConfirmOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md px-8 py-6 text-center">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Are you sure?</h2>
            <p className="text-xs text-gray-500 mb-6">
              Proceed with a partial delivery? Only received items will be updated in inventory.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                onClick={() => setIsReceiveConfirmOpen(false)}
              >
                Go Back
              </button>
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                onClick={() => {
                  setIsReceiveConfirmOpen(false);
                  handleReceiveComplete();
                }}
              >
                Complete Partial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BottleOrderPage;


