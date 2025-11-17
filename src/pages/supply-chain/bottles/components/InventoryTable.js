import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { showSuccessToast } from '../../../../utils/notifications';

const InventoryTable = ({
  data,
  isBulkEditing,
  bulkEdits,
  bulkUnsavedCount,
  editingBottleId,
  editWarehouseInv,
  editSupplierInv,
  actionMenuBottleId,
  themeClasses,
  onBottleClick,
  onBulkEditChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditWarehouseInvChange,
  onEditSupplierInvChange,
  onActionMenuToggle,
  onEditClick,
  onDeleteClick,
  onBulkEditDiscard,
  onBulkEditSave,
}) => {
  const { isDarkMode } = useTheme();

  return (
    <>
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
          {data.map((bottle, index) => {
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
                    index === data.length - 1
                      ? 'none'
                      : isDarkMode
                      ? '1px solid rgba(75,85,99,0.3)'
                      : '1px solid #e5e7eb',
                }}
              >
                <button
                  type="button"
                  className="px-6 py-3 text-left font-semibold text-blue-500 hover:text-blue-400 underline-offset-2 hover:underline cursor-pointer"
                  onClick={() => onBottleClick(bottle)}
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
                          onBulkEditChange(bottle.id, 'warehouseInventory', e.target.value);
                        } else {
                          onEditWarehouseInvChange(e.target.value);
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
                          onBulkEditChange(bottle.id, 'supplierInventory', e.target.value);
                        } else {
                          onEditSupplierInvChange(e.target.value);
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
                    <span className="text-xs text-gray-400">Bulk editing</span>
                  ) : isRowEditing ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
                        onClick={onCancelEdit}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700"
                        onClick={() => {
                          onSaveEdit(bottle.id, editWarehouseInv, editSupplierInv, bottle.name);
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
                        onClick={() => onActionMenuToggle(bottle.id)}
                        aria-label="More actions"
                      >
                        <span className={themeClasses.textSecondary}>⋮</span>
                      </button>

                      {actionMenuBottleId === bottle.id && (
                        <div className="absolute right-4 top-9 z-20 w-32 bg-white border border-gray-200 rounded-md shadow-lg text-xs">
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-blue-600"
                            onClick={() => onEditClick(bottle)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600"
                            onClick={() => onDeleteClick(bottle)}
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

          {data.length === 0 && (
            <div className="px-6 py-6 text-center text-sm italic text-gray-400">
              No bottles match your search.
            </div>
          )}
        </div>
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
              onClick={onBulkEditDiscard}
            >
              Discard
            </button>
            <button
              type="button"
              className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50"
              disabled={bulkUnsavedCount === 0}
              onClick={onBulkEditSave}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryTable;

