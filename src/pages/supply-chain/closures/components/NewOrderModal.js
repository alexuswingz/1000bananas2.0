import React from 'react';

const NewOrderModal = ({
  isOpen,
  orderNumber,
  selectedSupplier,
  suppliers,
  onClose,
  onOrderNumberChange,
  onSupplierSelect,
  onCreateOrder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">New Closure Order</h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
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
              Closure Order #<span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter order number here..."
              value={orderNumber}
              onChange={(e) => onOrderNumberChange(e.target.value)}
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
                    onClick={() => onSupplierSelect(supplier)}
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
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-semibold text-white bg-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-60"
            onClick={onCreateOrder}
            disabled={!orderNumber.trim() || !selectedSupplier}
          >
            Create New Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewOrderModal;

