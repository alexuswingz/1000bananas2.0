import React, { useState, useMemo, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { showSuccessToast } from '../../../../utils/notifications';
import { calculatePallets } from '../../../../utils/palletCalculations';
import { boxesApi, transformInventoryData, transformToBackendFormat } from '../../../../services/supplyChainApi';

// Helper function to format box size with spaces (e.g., "12x10x12" -> "12 x 10 x 12")
const formatBoxSize = (boxSize) => {
  if (!boxSize) return boxSize;
  // Check if it's already formatted or if it matches the pattern "numberxnumberxnumber"
  if (boxSize.includes(' x ')) return boxSize; // Already formatted
  // Replace 'x' with ' x ' (with spaces)
  return boxSize.replace(/x/gi, ' x ');
};

const InventoryTable = forwardRef(({
  searchQuery = '',
  themeClasses,
  onBoxClick,
  onDeleteClick,
}, ref) => {
  const { isDarkMode } = useTheme();

  // Create theme classes object with fallbacks
  const effectiveThemeClasses = themeClasses || {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  // Boxes data - fetch from API
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inline inventory editing (single row) - only for supplier inventory
  const [editingBoxId, setEditingBoxId] = useState(null);
  const [editSupplierInv, setEditSupplierInv] = useState('');

  // Bulk inventory editing (multiple rows)
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEdits, setBulkEdits] = useState({}); // { [id]: { supplierInventory } }

  // Action menu state
  const [actionMenuBoxId, setActionMenuBoxId] = useState(null);

  // Fetch boxes from API on mount
  useEffect(() => {
    const fetchBoxes = async () => {
      try {
        setLoading(true);
        const response = await boxesApi.getInventory();
        if (response.success) {
          const transformed = transformInventoryData(response);
          setBoxes(transformed);
        } else {
          setError(response.error || 'Failed to load inventory');
        }
      } catch (err) {
        console.error('Error fetching boxes:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBoxes();
  }, []);

  // Close action menu when clicking outside
  useEffect(() => {
    if (actionMenuBoxId === null) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest('.action-menu-container')) {
        setActionMenuBoxId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuBoxId]);

  // Filter boxes based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return boxes;
    const query = searchQuery.toLowerCase();
    return boxes.filter((box) => box.name.toLowerCase().includes(query));
  }, [boxes, searchQuery]);

  // Calculate bulk unsaved count (only for supplier inventory)
  const bulkUnsavedCount = useMemo(() => {
    if (!isBulkEditing) return 0;
    let count = 0;

    Object.entries(bulkEdits).forEach(([id, values]) => {
      const original = boxes.find((b) => b.id === Number(id));
      if (!original) return;
      const s = values.supplierInventory;
      const changed = s !== undefined && Number(s) !== original.supplierInventory;
      if (changed) count += 1;
    });

    return count;
  }, [isBulkEditing, bulkEdits, boxes]);

  // Handle bulk edit change
  const handleBulkEditChange = (boxId, field, value) => {
    setBulkEdits((prev) => ({
      ...prev,
      [boxId]: {
        ...prev[boxId],
        [field]: value,
      },
    }));
  };

  // Handle start edit (only for supplier inventory)
  const handleStartEdit = (box) => {
    setEditingBoxId(box.id);
    setEditSupplierInv(String(box.supplierInventory ?? ''));
    setActionMenuBoxId(null);
  };

  // Handle save edit (only updates supplier inventory, warehouse is read-only)
  const handleSaveEdit = async (boxId, supplierInv, boxName) => {
    try {
      const response = await boxesApi.updateInventory(boxId, {
        supplier_quantity: Number(supplierInv) || 0,
        // warehouse_quantity is not updated - it's read-only and updated automatically when orders are received
      });

      if (response.success) {
        setBoxes((prev) =>
          prev.map((b) =>
            b.id === boxId
              ? {
                  ...b,
                  supplierInventory: Number(supplierInv) || 0,
                }
              : b
          )
        );
        showSuccessToast(`${boxName} Supplier inventory updated`);
        setEditingBoxId(null);
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
    setEditingBoxId(null);
    setEditSupplierInv('');
  };

  // Handle bulk edit save (only updates supplier inventory)
  const handleBulkEditSave = async () => {
    const updates = [];
    
    boxes.forEach((b) => {
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
          boxesApi.updateInventory(update.id, {
            supplier_quantity: update.supplier_quantity,
            // warehouse_quantity is not updated - it's read-only
          })
        )
      );

      setBoxes((prev) =>
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
        showSuccessToast(`${updates.length} box(es) supplier inventory updated`);
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

  // Handle action menu toggle
  const handleActionMenuToggle = (boxId) => {
    setActionMenuBoxId((prev) => (prev === boxId ? null : boxId));
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
        <div className="text-gray-500">Loading boxes...</div>
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
    <>
      <div
        className={`w-full ${effectiveThemeClasses.cardBg}`}
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
              gridTemplateColumns: '300px 280px 280px 1fr',
              gap: '0',
            }}
          >
            {['BOX SIZE', 'WAREHOUSE INVENTORY', 'SUPPLIER INVENTORY'].map((label, idx) => (
              <div
                key={label}
                className={`h-full text-xs font-bold text-white uppercase tracking-wider flex items-center`}
                style={{
                  width: idx === 0 ? '300px' : '280px',
                  height: '40px',
                  paddingTop: '12px',
                  paddingRight: '24px',
                  paddingBottom: '12px',
                  paddingLeft: '24px',
                  gap: '10px',
                  justifyContent: idx === 0 ? 'flex-start' : 'flex-end',
                  textAlign: idx === 0 ? 'left' : 'right',
                }}
              >
                <span>{label}</span>
              </div>
            ))}
            <div className="h-full flex items-center justify-end" style={{ paddingRight: '24px' }}>
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
            <div className={`px-6 py-6 text-center text-sm ${effectiveThemeClasses.textSecondary}`}>
              Loading inventory...
            </div>
          ) : error ? (
            <div className="px-6 py-6 text-center text-sm text-red-500">
              Error: {error}
            </div>
          ) : filteredData.length === 0 ? (
            <div className={`px-6 py-6 text-center text-sm italic ${effectiveThemeClasses.textSecondary}`}>
              No boxes match your search.
            </div>
          ) : (
            filteredData.map((box, index) => {
            const isRowEditing = editingBoxId === box.id;
            const isBulkRow = isBulkEditing;
            const showInputs = isBulkRow || isRowEditing;

            const bulkValues = bulkEdits[box.id] || {};
            const supplierValue = isBulkRow
              ? bulkValues.supplierInventory ?? box.supplierInventory
              : editSupplierInv;

            return (
              <div
                key={box.id}
                className={`grid text-sm ${effectiveThemeClasses.cardBg}`}
                style={{
                  gridTemplateColumns: '300px 280px 280px 1fr',
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
                    width: '300px',
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '24px',
                    paddingBottom: '12px',
                    paddingLeft: '24px',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    className="text-left text-blue-600 hover:text-blue-700 underline cursor-pointer font-normal"
                    onClick={() => onBoxClick && onBoxClick(box)}
                    style={{
                      fontSize: '14px',
                    }}
                  >
                    {formatBoxSize(box.name)}
                  </button>
                </div>

                <div 
                  className="flex items-center justify-end" 
                  style={{ 
                    width: '280px',
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '24px',
                    paddingBottom: '12px',
                    paddingLeft: '24px',
                    gap: '10px',
                  }}
                >
                  {/* Warehouse inventory is read-only - updated automatically when orders are received */}
                  <span 
                    className={effectiveThemeClasses.textPrimary} 
                    title="Warehouse inventory is updated automatically when orders are received" 
                    style={{ 
                      fontSize: '14px', 
                      textAlign: 'right',
                      display: 'block',
                      width: '100%',
                    }}
                  >
                    {typeof box.warehouseInventory === 'number' ? box.warehouseInventory.toLocaleString() : box.warehouseInventory}
                  </span>
                </div>

                <div 
                  className="flex items-center justify-end" 
                  style={{ 
                    width: '280px',
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '24px',
                    paddingBottom: '12px',
                    paddingLeft: '24px',
                    gap: '10px',
                  }}
                >
                  {showInputs ? (
                    <input
                      type="number"
                      value={supplierValue}
                      onChange={(e) => {
                        if (isBulkRow) {
                          handleBulkEditChange(box.id, 'supplierInventory', e.target.value);
                        } else {
                          setEditSupplierInv(e.target.value);
                        }
                      }}
                      className="w-28 rounded-full border border-blue-300 px-3 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                    />
                  ) : (
                    <span 
                      className={effectiveThemeClasses.textPrimary} 
                      style={{ 
                        fontSize: '14px', 
                        textAlign: 'right',
                        display: 'block',
                        width: '100%',
                      }}
                    >
                      {typeof box.supplierInventory === 'number' ? box.supplierInventory.toLocaleString() : box.supplierInventory}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end relative action-menu-container" style={{ paddingTop: '12px', paddingBottom: '12px', paddingRight: '24px' }}>
                  {isBulkRow ? (
                    <span className={`text-xs ${effectiveThemeClasses.textSecondary}`}>Bulk editing</span>
                  ) : isRowEditing ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={`px-3 py-1 text-xs font-medium ${effectiveThemeClasses.textPrimary} ${effectiveThemeClasses.inputBg} border ${effectiveThemeClasses.border} rounded-full ${effectiveThemeClasses.rowHover}`}
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700"
                        onClick={() => {
                          handleSaveEdit(box.id, editSupplierInv, box.name);
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
                        onClick={() => handleActionMenuToggle(box.id)}
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

                      {actionMenuBoxId === box.id && (
                        <div className={`absolute right-4 top-9 z-20 w-32 ${effectiveThemeClasses.cardBg} border ${effectiveThemeClasses.border} rounded-md shadow-lg text-xs`}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-blue-600"
                            onClick={() => handleStartEdit(box)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600"
                            onClick={() => {
                              if (onDeleteClick) {
                                onDeleteClick(box);
                              }
                              setActionMenuBoxId(null);
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
              <span className="text-xs font-medium">{bulkUnsavedCount} Unsaved Changes</span>
            </div>
            <button
              type="button"
              onClick={handleDiscardBulkEdits}
              className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleBulkEditSave}
              className="px-3 py-1 text-xs font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
            >
              Save All
            </button>
          </div>
        </div>
      )}
    </>
  );
});

InventoryTable.displayName = 'InventoryTable';

export default InventoryTable;
