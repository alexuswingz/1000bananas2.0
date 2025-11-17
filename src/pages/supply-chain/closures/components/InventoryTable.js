import React, { useState, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const InventoryTable = forwardRef(({
  searchQuery = '',
}, ref) => {
  const { isDarkMode } = useTheme();

  // Closures data - moved from Closures.js
  const [closures, setClosures] = useState(() => {
    try {
      const stored = window.localStorage.getItem('closureInventory');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // If parsing fails, use default data
    }
    // Default data
    return [
      { id: 1, type: 'Cap', name: 'Reliable', warehouseInventory: 1000, supplierInventory: 1000 },
      { id: 2, type: 'Cap', name: 'VENTED Berry', warehouseInventory: 1000, supplierInventory: 1000 },
      { id: 3, type: 'Cap', name: 'Berry Unvented', warehouseInventory: 1000, supplierInventory: 1000 },
      { id: 4, type: 'Cap', name: 'Aptar Pour', warehouseInventory: 1000, supplierInventory: 1000 },
      { id: 5, type: 'Sprayer', name: '3oz Sprayer Top Down', warehouseInventory: 1000, supplierInventory: 1000 },
      { id: 6, type: 'Sprayer', name: '6oz Sprayer Top Top Down', warehouseInventory: 1000, supplierInventory: 1000 },
      { id: 7, type: 'Sprayer', name: '16oz Sprayer Trigger Foam', warehouseInventory: 1000, supplierInventory: 1000 },
      { id: 8, type: 'Sprayer', name: '16oz Spray Trigger No-Foam', warehouseInventory: 1000, supplierInventory: 1000 },
    ];
  });

  // Persist closures to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('closureInventory', JSON.stringify(closures));
    } catch (err) {
      console.error('Failed to save closure inventory to localStorage', err);
    }
  }, [closures]);

  // Filter closures based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return closures;
    const query = searchQuery.toLowerCase();
    return closures.filter(
      (closure) =>
        closure.name.toLowerCase().includes(query) ||
        closure.type.toLowerCase().includes(query)
    );
  }, [closures, searchQuery]);

  // Inline inventory editing (single row)
  const [editingClosureId, setEditingClosureId] = useState(null);
  const [editWarehouseInv, setEditWarehouseInv] = useState('');
  const [editSupplierInv, setEditSupplierInv] = useState('');

  // Bulk inventory editing (multiple rows)
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEdits, setBulkEdits] = useState({}); // { [id]: { warehouseInventory, supplierInventory } }

  // Calculate bulk unsaved count
  const bulkUnsavedCount = useMemo(() => {
    if (!isBulkEditing) return 0;
    let count = 0;

    Object.entries(bulkEdits).forEach(([id, values]) => {
      const original = closures.find((c) => c.id === Number(id));
      if (!original) return;
      const w = values.warehouseInventory;
      const s = values.supplierInventory;
      const changed =
        (w !== undefined && Number(w) !== original.warehouseInventory) ||
        (s !== undefined && Number(s) !== original.supplierInventory);
      if (changed) count += 1;
    });

    return count;
  }, [isBulkEditing, bulkEdits, closures]);

  // Handle bulk edit change
  const handleBulkEditChange = (id, field, value) => {
    setBulkEdits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  // Handle start edit
  const handleStartEdit = (closure) => {
    setEditingClosureId(closure.id);
    setEditWarehouseInv(closure.warehouseInventory.toString());
    setEditSupplierInv(closure.supplierInventory.toString());
  };

  // Handle save edit
  const handleSaveEdit = (id) => {
    const warehouse = Number(editWarehouseInv) || 0;
    const supplier = Number(editSupplierInv) || 0;

    setClosures((prev) => {
      const updated = prev.map((c) =>
        c.id === id
          ? { ...c, warehouseInventory: warehouse, supplierInventory: supplier }
          : c
      );
      return updated;
    });

    setEditingClosureId(null);
    setEditWarehouseInv('');
    setEditSupplierInv('');
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingClosureId(null);
    setEditWarehouseInv('');
    setEditSupplierInv('');
  };

  // Handle bulk edit save
  const handleSaveBulkEdits = () => {
    setClosures((prev) => {
      const updated = prev.map((c) => {
        const edits = bulkEdits[c.id];
        if (!edits) return c;
        return {
          ...c,
          warehouseInventory:
            edits.warehouseInventory !== undefined
              ? Number(edits.warehouseInventory) || 0
              : c.warehouseInventory,
          supplierInventory:
            edits.supplierInventory !== undefined
              ? Number(edits.supplierInventory) || 0
              : c.supplierInventory,
        };
      });
      return updated;
    });

    setIsBulkEditing(false);
    setBulkEdits({});
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

  const themeClasses = {
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    bgPrimary: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
    inputBorder: isDarkMode ? 'border-dark-border-primary' : 'border-gray-300',
    inputText: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr
            className="text-xs font-semibold text-white"
            style={{ backgroundColor: '#2C3544' }}
          >
            <th className="px-6 py-3 text-left border-r-2 border-white">TYPE</th>
            <th className="px-6 py-3 text-left border-r-2 border-white">PACKAGING NAME</th>
            <th className="px-6 py-3 text-left border-r-2 border-white">WAREHOUSE INVENTORY</th>
            <th className="px-6 py-3 text-left">SUPPLIER INVENTORY</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.map((closure) => {
            const isEditing = editingClosureId === closure.id;
            const bulkEdit = bulkEdits[closure.id];

            return (
              <tr
                key={closure.id}
                className={`border-b ${themeClasses.border} ${themeClasses.rowHover} ${themeClasses.bgPrimary}`}
              >
                <td className={`px-6 py-3 text-sm ${themeClasses.textPrimary}`}>{closure.type}</td>
                <td className={`px-6 py-3 text-sm ${themeClasses.textPrimary}`}>{closure.name}</td>
                <td className="px-6 py-3">
                  {isBulkEditing ? (
                    <input
                      type="number"
                      value={
                        bulkEdit?.warehouseInventory !== undefined
                          ? bulkEdit.warehouseInventory
                          : closure.warehouseInventory
                      }
                      onChange={(e) =>
                        handleBulkEditChange(closure.id, 'warehouseInventory', e.target.value)
                      }
                      className={`w-24 rounded border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                    />
                  ) : isEditing ? (
                    <input
                      type="number"
                      value={editWarehouseInv ?? closure.warehouseInventory}
                      onChange={(e) => {
                        setEditWarehouseInv(e.target.value);
                      }}
                      onBlur={() => handleSaveEdit(closure.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEdit(closure.id);
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          handleCancelEdit();
                        }
                      }}
                      autoFocus
                      className={`w-24 rounded border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                      style={{ minWidth: '96px' }}
                      readOnly={false}
                      disabled={false}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${themeClasses.textPrimary}`}>{closure.warehouseInventory}</span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(closure)}
                        className={`${themeClasses.textSecondary} ${isDarkMode ? 'hover:text-dark-text-primary' : 'hover:text-gray-900'}`}
                        aria-label="Edit warehouse inventory"
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
                      className={`w-24 rounded border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                      style={{ minWidth: '96px' }}
                    />
                  ) : isEditing ? (
                    <input
                      type="number"
                      value={editSupplierInv !== undefined && editSupplierInv !== null && editSupplierInv !== '' ? editSupplierInv : closure.supplierInventory}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setEditSupplierInv(newValue);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onFocus={(e) => {
                        e.target.select();
                        e.stopPropagation();
                      }}
                      onBlur={() => {
                        handleSaveEdit(closure.id);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEdit(closure.id);
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          handleCancelEdit();
                        }
                      }}
                      className={`w-24 rounded border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-text`}
                      style={{ minWidth: '96px', pointerEvents: 'auto', zIndex: 10, position: 'relative' }}
                      tabIndex={0}
                      autoComplete="off"
                      data-testid="supplier-inventory-input"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${themeClasses.textPrimary}`}>{closure.supplierInventory}</span>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(closure)}
                        className={`${themeClasses.textSecondary} ${isDarkMode ? 'hover:text-dark-text-primary' : 'hover:text-gray-900'}`}
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
              </tr>
            );
          })}
        </tbody>
      </table>
      {isBulkEditing && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center gap-4">
          <span className="text-sm text-gray-600">
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
            onClick={handleSaveBulkEdits}
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

