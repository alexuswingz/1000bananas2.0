import React, { useState, useMemo, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { showSuccessToast } from '../../../../utils/notifications';
import { calculatePallets } from '../../../../utils/palletCalculations';
import { closuresApi, transformInventoryData, transformToBackendFormat } from '../../../../services/supplyChainApi';

const InventoryTable = forwardRef(({
  searchQuery = '',
  themeClasses,
  onClosureClick,
  onDeleteClick,
}, ref) => {
  const { isDarkMode } = useTheme();

  // Closures data - fetch from API
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch closures from API on mount
  useEffect(() => {
    const fetchClosures = async () => {
      try {
        setLoading(true);
        const response = await closuresApi.getInventory();
        if (response.success) {
          const transformed = transformInventoryData(response);
          setClosures(transformed);
        } else {
          setError(response.error || 'Failed to load inventory');
        }
      } catch (err) {
        console.error('Error fetching closures:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClosures();
  }, []);

  // Filter closures based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return closures;
    const query = searchQuery.toLowerCase();
    return closures.filter((closure) => closure.name.toLowerCase().includes(query));
  }, [closures, searchQuery]);

  // Inline inventory editing (single row) - only for supplier inventory
  const [editingClosureId, setEditingClosureId] = useState(null);
  const [editSupplierInv, setEditSupplierInv] = useState('');

  // Bulk inventory editing (multiple rows)
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEdits, setBulkEdits] = useState({}); // { [id]: { warehouseInventory, supplierInventory } }

  // Action menu state
  const [actionMenuClosureId, setActionMenuClosureId] = useState(null);

  // Calculate bulk unsaved count (only for supplier inventory)
  const bulkUnsavedCount = useMemo(() => {
    if (!isBulkEditing) return 0;
    let count = 0;

    Object.entries(bulkEdits).forEach(([id, values]) => {
      const original = closures.find((c) => c.id === Number(id));
      if (!original) return;
      const s = values.supplierInventory;
      const changed = s !== undefined && Number(s) !== original.supplierInventory;
      if (changed) count += 1;
    });

    return count;
  }, [isBulkEditing, bulkEdits, closures]);

  // Handle bulk edit change
  const handleBulkEditChange = (closureId, field, value) => {
    setBulkEdits((prev) => ({
      ...prev,
      [closureId]: {
        ...prev[closureId],
        [field]: value,
      },
    }));
  };

  // Handle start edit (only for supplier inventory)
  const handleStartEdit = (closure) => {
    setEditingClosureId(closure.id);
    setEditSupplierInv(String(closure.supplierInventory ?? ''));
    setActionMenuClosureId(null);
  };

  // Handle save edit (only updates supplier inventory, warehouse is read-only)
  const handleSaveEdit = async (closureId, supplierInv, closureName) => {
    try {
      const response = await closuresApi.updateInventory(closureId, {
        supplier_quantity: Number(supplierInv) || 0,
        // warehouse_quantity is not updated - it's read-only and updated automatically when orders are received
      });

      if (response.success) {
        setClosures((prev) =>
          prev.map((c) =>
            c.id === closureId
              ? {
                  ...c,
                  supplierInventory: Number(supplierInv) || 0,
                }
              : c
          )
        );
        showSuccessToast(`${closureName} Supplier inventory updated`);
        setEditingClosureId(null);
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
    setEditingClosureId(null);
    setEditSupplierInv('');
  };

  // Handle bulk edit save (only updates supplier inventory)
  const handleBulkEditSave = async () => {
    const updates = [];
    
    closures.forEach((c) => {
      const edits = bulkEdits[c.id];
      if (!edits) return;
      
      const nextSupplier =
        edits.supplierInventory !== undefined
          ? Number(edits.supplierInventory) || 0
          : c.supplierInventory;
      
      // Only update if supplier inventory changed (warehouse is read-only)
      if (nextSupplier !== c.supplierInventory) {
        updates.push({
          id: c.id,
          supplier_quantity: nextSupplier,
        });
      }
    });

    try {
      await Promise.all(
        updates.map(update =>
          closuresApi.updateInventory(update.id, {
            supplier_quantity: update.supplier_quantity,
            // warehouse_quantity is not updated - it's read-only
          })
        )
      );

      setClosures((prev) =>
        prev.map((c) => {
          const update = updates.find(u => u.id === c.id);
          if (update) {
            return {
              ...c,
              supplierInventory: update.supplier_quantity,
            };
          }
          return c;
        })
      );

      if (updates.length > 0) {
        showSuccessToast(`${updates.length} closure(s) supplier inventory updated`);
      }
      setIsBulkEditing(false);
      setBulkEdits({});
    } catch (err) {
      console.error('Error bulk updating:', err);
      alert(`Failed to update: ${err.message}`);
    }
  };

  // Handle bulk edit discard
  const handleDiscardBulkEdits = () => {
    setBulkEdits({});
    setIsBulkEditing(false);
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    startBulkEdit: () => setIsBulkEditing(true),
    isBulkEditing: isBulkEditing,
    bulkUnsavedCount: bulkUnsavedCount,
  }));

  const tableThemeClasses = {
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    bgPrimary: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
    inputBorder: isDarkMode ? 'border-dark-border-primary' : 'border-gray-300',
    inputText: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading closures...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr
            className="text-xs font-semibold text-white"
            style={{ backgroundColor: '#2C3544' }}
          >
            <th className="px-6 py-3 text-left border-r-2 border-white">PACKAGING NAME</th>
            <th className="px-6 py-3 text-left border-r-2 border-white">WAREHOUSE INVENTORY</th>
            <th className="px-6 py-3 text-left border-r-2 border-white">SUPPLIER INVENTORY</th>
            <th className="px-6 py-3 text-left">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((closure) => {
            const isEditing = editingClosureId === closure.id;
            const bulkEdit = bulkEdits[closure.id];

            return (
              <tr
                key={closure.id}
                className={`border-b ${tableThemeClasses.border} ${tableThemeClasses.rowHover} ${tableThemeClasses.bgPrimary}`}
              >
                <td className={`px-6 py-3 text-sm ${tableThemeClasses.textPrimary}`}>
                  {onClosureClick ? (
                    <button
                      onClick={() => onClosureClick(closure)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {closure.name}
                    </button>
                  ) : (
                    closure.name
                  )}
                </td>
                <td className="px-6 py-3">
                  {/* Warehouse inventory is read-only - updated automatically when orders are received */}
                  <span className={`text-sm ${tableThemeClasses.textPrimary}`} title="Warehouse inventory is updated automatically when orders are received">
                    {closure.warehouseInventory}
                  </span>
                </td>
                <td className="px-6 py-3">
                  {isBulkEditing ? (
                    <input
                      type="number"
                      value={
                        bulkEdit?.supplierInventory !== undefined
                          ? bulkEdit.supplierInventory
                          : closure.supplierInventory
                      }
                      onChange={(e) =>
                        handleBulkEditChange(closure.id, 'supplierInventory', e.target.value)
                      }
                      className={`w-24 rounded border ${tableThemeClasses.inputBorder} ${tableThemeClasses.inputBg} ${tableThemeClasses.inputText} px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                    />
                  ) : isEditing ? (
                    <input
                      type="number"
                      value={editSupplierInv !== undefined && editSupplierInv !== null && editSupplierInv !== '' ? editSupplierInv : closure.supplierInventory}
                      onChange={(e) => {
                        setEditSupplierInv(e.target.value);
                      }}
                      onBlur={() => handleSaveEdit(closure.id, editSupplierInv, closure.name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEdit(closure.id, editSupplierInv, closure.name);
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          handleCancelEdit();
                        }
                      }}
                      autoFocus
                      className={`w-24 rounded border ${tableThemeClasses.inputBorder} ${tableThemeClasses.inputBg} ${tableThemeClasses.inputText} px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${tableThemeClasses.textPrimary}`}>{closure.supplierInventory}</span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(closure)}
                        className={`${tableThemeClasses.textSecondary} ${isDarkMode ? 'hover:text-dark-text-primary' : 'hover:text-gray-900'}`}
                        aria-label="Edit supplier inventory"
                      >
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
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    {onDeleteClick && (
                      <button
                        onClick={() => onDeleteClick(closure)}
                        className="text-red-600 hover:text-red-800"
                        aria-label="Delete closure"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {isBulkEditing && (
        <div className={`px-6 py-4 border-t ${tableThemeClasses.border} flex items-center justify-center gap-4`}>
          <span className={`text-sm ${tableThemeClasses.textSecondary}`}>
            {bulkUnsavedCount} Unsaved Changes
          </span>
          <button
            type="button"
            onClick={handleDiscardBulkEdits}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleBulkEditSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
});

InventoryTable.displayName = 'InventoryTable';

export default InventoryTable;
