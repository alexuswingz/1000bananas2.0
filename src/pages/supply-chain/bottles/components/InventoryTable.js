import React, { useState, useMemo, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { showSuccessToast } from '../../../../utils/notifications';

const InventoryTable = forwardRef(({
  searchQuery = '',
  themeClasses,
  onBottleClick,
  onDeleteClick,
}, ref) => {
  const { isDarkMode } = useTheme();

  // Bottles data - moved from Bottles.js
  const [bottles, setBottles] = useState(() => {
    try {
      const stored = window.localStorage.getItem('bottlesInventory');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    // Default data
    return [
      { id: 1, name: '8oz Bottle', warehouseInventory: 1000, supplierInventory: 1000 },
      
      { id: 3, name: 'Gallon', warehouseInventory: 1000, supplierInventory: 1000 },
      { id: 4, name: '3oz Spray Bottle', warehouseInventory: 1000, supplierInventory: 1000 },
      { id: 5, name: '6oz Spray Bottle', warehouseInventory: 1000, supplierInventory: 1000 },
      { id: 6, name: '16oz Square Cylinder Clear', warehouseInventory: 1000, supplierInventory: 1000 },
      { id: 7, name: '16oz Square Cylinder Spray White', warehouseInventory: 1000, supplierInventory: 1000 },
      { id: 8, name: '16oz Round Cylinder Spray Clear', warehouseInventory: 1000, supplierInventory: 1000 },
      { id: 9, name: '16oz Round Cylinder Spray White', warehouseInventory: 1000, supplierInventory: 1000 },
    ];
  });

  // Persist bottles to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('bottlesInventory', JSON.stringify(bottles));
    } catch {}
  }, [bottles]);

  // Filter bottles based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return bottles;
    const query = searchQuery.toLowerCase();
    return bottles.filter((bottle) => bottle.name.toLowerCase().includes(query));
  }, [bottles, searchQuery]);

  // Inline inventory editing (single row)
  const [editingBottleId, setEditingBottleId] = useState(null);
  const [editWarehouseInv, setEditWarehouseInv] = useState('');
  const [editSupplierInv, setEditSupplierInv] = useState('');

  // Bulk inventory editing (multiple rows)
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEdits, setBulkEdits] = useState({}); // { [id]: { warehouseInventory, supplierInventory } }

  // Action menu state
  const [actionMenuBottleId, setActionMenuBottleId] = useState(null);

  // Calculate bulk unsaved count
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

  // Handle bulk edit change
  const handleBulkEditChange = (bottleId, field, value) => {
    setBulkEdits((prev) => ({
      ...prev,
      [bottleId]: {
        ...prev[bottleId],
        [field]: value,
      },
    }));
  };

  // Handle start edit
  const handleStartEdit = (bottle) => {
    setEditingBottleId(bottle.id);
    setEditWarehouseInv(String(bottle.warehouseInventory ?? ''));
    setEditSupplierInv(String(bottle.supplierInventory ?? ''));
    setActionMenuBottleId(null);
  };

  // Handle save edit
  const handleSaveEdit = (bottleId, warehouseInv, supplierInv, bottleName) => {
    setBottles((prev) =>
      prev.map((b) =>
        b.id === bottleId
          ? {
              ...b,
              warehouseInventory: Number(warehouseInv) || 0,
              supplierInventory: Number(supplierInv) || 0,
            }
          : b
      )
    );
    showSuccessToast(`${bottleName} Inventory updated`);
    setEditingBottleId(null);
    setEditWarehouseInv('');
    setEditSupplierInv('');
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingBottleId(null);
    setEditWarehouseInv('');
    setEditSupplierInv('');
  };

  // Handle bulk edit save
  const handleBulkEditSave = () => {
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
  };

  // Handle bulk edit discard
  const handleBulkEditDiscard = () => {
    setIsBulkEditing(false);
    setBulkEdits({});
  };

  // Handle action menu toggle
  const handleActionMenuToggle = (bottleId) => {
    setActionMenuBottleId((prev) => (prev === bottleId ? null : bottleId));
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    enableBulkEdit: () => setIsBulkEditing(true),
    addBottle: (bottle) => {
      setBottles((prev) => {
        const nextId = prev.length ? Math.max(...prev.map((b) => b.id)) + 1 : 1;
        return [...prev, { ...bottle, id: nextId }];
      });
    },
    deleteBottle: (bottleId) => {
      setBottles((prev) => {
        const updated = prev.filter((b) => b.id !== bottleId);
        // Persist to localStorage immediately
        try {
          window.localStorage.setItem('bottlesInventory', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
  }));

  return (
    <>
      <div
        className={`${themeClasses.cardBg} border ${themeClasses.border} shadow-md w-full`}
        style={{ overflow: 'hidden' }}
      >
        {/* Table header row */}
        <div 
          className={`${themeClasses.headerBg} border-b border-[#3C4656] w-full`}
          style={{ height: '40px' }}
        >
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: '2fr 1fr 1fr 120px',
            }}
          >
            {['BOTTLE NAME', 'WAREHOUSE INVENTORY', 'SUPPLIER INVENTORY'].map((label, idx) => (
              <div
                key={label}
                className={`group h-full text-xs font-bold text-white uppercase tracking-wider border-r-2 border-white flex items-center justify-center ${
                  idx === 0 ? 'pl-3 pr-1.5' : 'px-3'
                } gap-2`}
              >
                <span>{label}</span>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-white hover:text-white/80 flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle filter click
                    console.log(`Filter clicked for ${label}`);
                  }}
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
            <div className="px-3 h-full text-xs font-bold text-white uppercase tracking-wider text-center flex items-center justify-center">
              ACTIONS
            </div>
          </div>
        </div>

        {/* Table body */}
        <div
          className="w-full"
          style={{ minHeight: '360px' }}
        >
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
                  className="px-3 py-3 text-left font-semibold text-blue-500 hover:text-blue-400 underline-offset-2 hover:underline cursor-pointer"
                  onClick={() => onBottleClick(bottle)}
                >
                  {bottle.name}
                </button>

                <div className="px-3 py-3 text-center">
                  {showInputs ? (
                    <input
                      type="number"
                      value={warehouseValue}
                      onChange={(e) => {
                        if (isBulkRow) {
                          handleBulkEditChange(bottle.id, 'warehouseInventory', e.target.value);
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

                <div className="px-3 py-3 text-center">
                  {showInputs ? (
                    <input
                      type="number"
                      value={supplierValue}
                      onChange={(e) => {
                        if (isBulkRow) {
                          handleBulkEditChange(bottle.id, 'supplierInventory', e.target.value);
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

                <div className="px-3 py-3 flex items-center justify-center relative">
                  {isBulkRow ? (
                    <span className="text-xs text-gray-400">Bulk editing</span>
                  ) : isRowEditing ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-100"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700"
                        onClick={() => {
                          handleSaveEdit(bottle.id, editWarehouseInv, editSupplierInv, bottle.name);
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
                        onClick={() => handleActionMenuToggle(bottle.id)}
                        aria-label="More actions"
                      >
                        <span className={themeClasses.textSecondary}>⋮</span>
                      </button>

                      {actionMenuBottleId === bottle.id && (
                        <div className="absolute right-4 top-9 z-20 w-32 bg-white border border-gray-200 rounded-md shadow-lg text-xs">
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-blue-600"
                            onClick={() => handleStartEdit(bottle)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600"
                            onClick={() => {
                              if (onDeleteClick) {
                                onDeleteClick(bottle);
                              }
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
              onClick={handleBulkEditDiscard}
            >
              Discard
            </button>
            <button
              type="button"
              className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:opacity-50"
              disabled={bulkUnsavedCount === 0}
              onClick={handleBulkEditSave}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </>
  );
});

InventoryTable.displayName = 'InventoryTable';

export default InventoryTable;

