import React, { useState, useMemo, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { showSuccessToast } from '../../../../utils/notifications';
import { calculatePallets } from '../../../../utils/palletCalculations';
import { bottlesApi, transformInventoryData, transformToBackendFormat } from '../../../../services/supplyChainApi';

const InventoryTable = forwardRef(({
  searchQuery = '',
  themeClasses,
  onBottleClick,
  onDeleteClick,
}, ref) => {
  const { isDarkMode } = useTheme();

  // Bottles data - fetch from API
  const [bottles, setBottles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch bottles from API on mount
  useEffect(() => {
    const fetchBottles = async () => {
      try {
        setLoading(true);
        const response = await bottlesApi.getInventory();
        if (response.success) {
          const transformed = transformInventoryData(response);
          setBottles(transformed);
        } else {
          setError(response.error || 'Failed to load inventory');
        }
      } catch (err) {
        console.error('Error fetching bottles:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBottles();
  }, []);

  // Filter bottles based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return bottles;
    const query = searchQuery.toLowerCase();
    return bottles.filter((bottle) => bottle.name.toLowerCase().includes(query));
  }, [bottles, searchQuery]);

  // Inline inventory editing (single row) - only for supplier inventory
  const [editingBottleId, setEditingBottleId] = useState(null);
  const [editSupplierInv, setEditSupplierInv] = useState('');

  // Bulk inventory editing (multiple rows)
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEdits, setBulkEdits] = useState({}); // { [id]: { warehouseInventory, supplierInventory } }

  // Action menu state
  const [actionMenuBottleId, setActionMenuBottleId] = useState(null);

  // Calculate bulk unsaved count (only for supplier inventory)
  const bulkUnsavedCount = useMemo(() => {
    if (!isBulkEditing) return 0;
    let count = 0;

    Object.entries(bulkEdits).forEach(([id, values]) => {
      const original = bottles.find((b) => b.id === Number(id));
      if (!original) return;
      const s = values.supplierInventory;
      const changed = s !== undefined && Number(s) !== original.supplierInventory;
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

  // Handle start edit (only for supplier inventory)
  const handleStartEdit = (bottle) => {
    setEditingBottleId(bottle.id);
    setEditSupplierInv(String(bottle.supplierInventory ?? ''));
    setActionMenuBottleId(null);
  };

  // Handle save edit (only updates supplier inventory, warehouse is read-only)
  const handleSaveEdit = async (bottleId, supplierInv, bottleName) => {
    try {
      const response = await bottlesApi.updateInventory(bottleId, {
        supplier_quantity: Number(supplierInv) || 0,
        // warehouse_quantity is not updated - it's read-only and updated automatically when orders are received
      });

      if (response.success) {
        setBottles((prev) =>
          prev.map((b) =>
            b.id === bottleId
              ? {
                  ...b,
                  supplierInventory: Number(supplierInv) || 0,
                }
              : b
          )
        );
        showSuccessToast(`${bottleName} Supplier inventory updated`);
        setEditingBottleId(null);
        setEditSupplierInv('');
      } else {
        throw new Error(response.error || 'Failed to update');
      }
    } catch (err) {
      console.error('Error updating inventory:', err);
      alert(`Failed to update: ${err.message}`);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingBottleId(null);
    setEditSupplierInv('');
  };

  // Handle bulk edit save (only updates supplier inventory)
  const handleBulkEditSave = async () => {
    const updates = [];
    
    bottles.forEach((b) => {
      const edits = bulkEdits[b.id];
      if (!edits) return;
      
      const nextSupplier =
        edits.supplierInventory !== undefined
          ? Number(edits.supplierInventory) || 0
          : b.supplierInventory;
      
      // Only update if supplier inventory changed (warehouse is read-only)
      if (nextSupplier !== b.supplierInventory) {
        updates.push({
          id: b.id,
          supplier_quantity: nextSupplier,
        });
      }
    });

    try {
      await Promise.all(
        updates.map(update =>
          bottlesApi.updateInventory(update.id, {
            supplier_quantity: update.supplier_quantity,
            // warehouse_quantity is not updated - it's read-only
          })
        )
      );

      setBottles((prev) =>
        prev.map((b) => {
          const update = updates.find(u => u.id === b.id);
          if (update) {
            return {
              ...b,
              supplierInventory: update.supplier_quantity,
            };
          }
          return b;
        })
      );

      if (updates.length > 0) {
        showSuccessToast(`${updates.length} bottle(s) supplier inventory updated`);
      }
      setIsBulkEditing(false);
      setBulkEdits({});
    } catch (err) {
      console.error('Error bulk updating:', err);
      alert(`Failed to update: ${err.message}`);
    }
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
        className={`w-full ${themeClasses.cardBg}`}
        style={{ 
          borderRadius: '8px',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}
      >
        {/* Table header row */}
        <div 
          className="bg-[#2C3544] border-b border-[#3C4656] w-full"
          style={{ height: '40px', borderRadius: '8px 8px 0 0' }}
        >
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: '253px 253px 253px 1fr',
              gap: '0',
            }}
          >
            {['BOTTLE NAME', 'WAREHOUSE INVENTORY', 'SUPPLIER INVENTORY'].map((label, idx) => (
              <div
                key={label}
                className={`h-full text-xs font-bold text-white uppercase tracking-wider flex items-center`}
                style={{
                  width: '253px',
                  height: '40px',
                  paddingTop: '12px',
                  paddingRight: '16px',
                  paddingBottom: '12px',
                  paddingLeft: '16px',
                  gap: '10px',
                  textAlign: 'left',
                }}
              >
                <span>{label}</span>
              </div>
            ))}
            <div className="h-full flex items-center justify-end" style={{ paddingRight: '16px' }}>
              {/* Empty space for ellipsis icon */}
            </div>
          </div>
        </div>

        {/* Table body */}
        <div
          className="w-full"
          style={{ minHeight: '360px' }}
        >
          {loading ? (
            <div className={`px-6 py-6 text-center text-sm ${themeClasses.textSecondary}`}>
              Loading inventory...
            </div>
          ) : error ? (
            <div className="px-6 py-6 text-center text-sm text-red-500">
              Error: {error}
            </div>
          ) : filteredData.length === 0 ? (
            <div className={`px-6 py-6 text-center text-sm italic ${themeClasses.textSecondary}`}>
              No bottles match your search.
            </div>
          ) : (
            filteredData.map((bottle, index) => {
            const isRowEditing = editingBottleId === bottle.id;
            const isBulkRow = isBulkEditing;
            const showInputs = isBulkRow || isRowEditing;

            const bulkValues = bulkEdits[bottle.id] || {};
            const supplierValue = isBulkRow
              ? bulkValues.supplierInventory ?? bottle.supplierInventory
              : editSupplierInv;

            return (
              <div
                key={bottle.id}
                className={`grid text-sm ${themeClasses.cardBg}`}
                style={{
                  gridTemplateColumns: '253px 253px 253px 1fr',
                  gap: '0',
                  borderBottom:
                    index === filteredData.length - 1
                      ? 'none'
                      : '1px solid #e5e7eb',
                  minHeight: '40px',
                  borderRadius: index === filteredData.length - 1 ? '0 0 8px 8px' : '0',
                }}
              >
                <div 
                  className="flex items-center" 
                  style={{ 
                    width: '253px',
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '16px',
                    paddingBottom: '12px',
                    paddingLeft: '16px',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    className="text-left text-blue-600 hover:text-blue-700 underline cursor-pointer font-normal"
                    onClick={() => onBottleClick(bottle)}
                    style={{
                      fontSize: '14px',
                    }}
                  >
                    {bottle.name}
                  </button>
                </div>

                <div className="px-3 py-3 text-center">
                  {/* Warehouse inventory is read-only - updated automatically when orders are received */}
                  <span className={themeClasses.textPrimary} title="Warehouse inventory is updated automatically when orders are received">
                    {bottle.warehouseInventory}
                  </span>
                </div>

                <div 
                  className="flex items-center justify-start" 
                  style={{ 
                    width: '253px',
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '16px',
                    paddingBottom: '12px',
                    paddingLeft: '16px',
                    gap: '10px',
                  }}
                >
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
                    <span className={`${themeClasses.textPrimary} text-left`} style={{ fontSize: '14px' }}>
                      {bottle.supplierInventory.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end relative" style={{ paddingTop: '12px', paddingBottom: '12px', paddingRight: '16px' }}>
                  {isBulkRow ? (
                    <span className={`text-xs ${themeClasses.textSecondary}`}>Bulk editing</span>
                  ) : isRowEditing ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`px-3 py-1 text-xs font-medium ${themeClasses.textPrimary} ${themeClasses.inputBg} border ${themeClasses.border} rounded-full ${themeClasses.rowHover}`}
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700"
                        onClick={() => {
                          handleSaveEdit(bottle.id, editSupplierInv, bottle.name);
                        }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="rounded transition-colors"
                        onClick={() => handleActionMenuToggle(bottle.id)}
                        aria-label="More actions"
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        style={{
                          color: '#6B7280',
                          padding: '4px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          backgroundColor: 'transparent',
                        }}
                      >
                        <svg width="4" height="14" viewBox="0 0 4 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="2" cy="2" r="1.5" fill="currentColor" />
                          <circle cx="2" cy="7" r="1.5" fill="currentColor" />
                          <circle cx="2" cy="12" r="1.5" fill="currentColor" />
                        </svg>
                      </button>

                      {actionMenuBottleId === bottle.id && (
                        <div className={`absolute right-4 top-9 z-20 w-32 ${themeClasses.cardBg} border ${themeClasses.border} rounded-md shadow-lg text-xs`}>
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
          }))}
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
              className={`px-3 py-1 text-xs font-medium ${themeClasses.textPrimary} ${themeClasses.inputBg} rounded-full ${themeClasses.rowHover}`}
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

