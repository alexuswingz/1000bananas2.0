import React, { useState, useMemo, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import SortFormulasFilterDropdown from '../../../production/new-shipment/components/SortFormulasFilterDropdown';
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
  const location = useLocation();
  const isPlanningView = location.pathname.includes('planning');
  const dividerColor = isDarkMode ? '#3C4656' : '#E5E7EB';
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const [sortConfig, setSortConfig] = useState({ column: null, order: '' });
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);

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

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumn !== null) {
        const filterIcon = filterIconRefs.current[openFilterColumn];
        const dropdown = filterDropdownRef.current;
        const isClickInsideIcon = filterIcon?.contains(event.target);
        const isClickInsideDropdown = dropdown?.contains(event.target);
        if (!isClickInsideIcon && !isClickInsideDropdown) {
          setOpenFilterColumn(null);
        }
      }
    };

    if (openFilterColumn !== null) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterColumn]);

  const handleFilterClick = (columnKey, e) => {
    if (isPlanningView) return;
    e.stopPropagation();
    setOpenFilterColumn(openFilterColumn === columnKey ? null : columnKey);
  };

  // Filter bottles based on search query
  const filteredData = useMemo(() => {
    let data = bottles;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = bottles.filter((bottle) => bottle.name.toLowerCase().includes(query));
    }

    if (sortConfig.column && sortConfig.order) {
      data = [...data].sort((a, b) => {
        const getVal = (item) => {
          switch (sortConfig.column) {
            case 'name':
              return item.name || '';
            case 'warehouseInventory':
              return item.warehouseInventory ?? 0;
            case 'supplierInventory':
              return item.supplierInventory ?? 0;
            default:
              return item[sortConfig.column];
          }
        };
        const aVal = getVal(a);
        const bVal = getVal(b);

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.order === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return sortConfig.order === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }

    return data;
  }, [bottles, searchQuery, sortConfig]);

  const getColumnValues = (columnKey) => {
    const values = new Set();
    filteredData.forEach((bottle) => {
      switch (columnKey) {
        case 'name':
          values.add(bottle.name ?? '');
          break;
        case 'warehouseInventory':
          values.add(bottle.warehouseInventory ?? 0);
          break;
        case 'supplierInventory':
          values.add(bottle.supplierInventory ?? 0);
          break;
        default:
          break;
      }
    });
    return Array.from(values);
  };

  // Inline inventory editing (single row) - for both warehouse and supplier inventory
  const [editingBottleId, setEditingBottleId] = useState(null);
  const [editSupplierInv, setEditSupplierInv] = useState('');
  const [editWarehouseInv, setEditWarehouseInv] = useState('');

  // Bulk inventory editing (multiple rows)
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEdits, setBulkEdits] = useState({}); // { [id]: { warehouseInventory, supplierInventory } }

  // Action menu state
  const [actionMenuBottleId, setActionMenuBottleId] = useState(null);

  // Confirm overwrite modal state
  const [confirmData, setConfirmData] = useState(null); // { id, supplierInv, warehouseInv, name }

  // Calculate bulk unsaved count (for both warehouse and supplier inventory)
  const bulkUnsavedCount = useMemo(() => {
    if (!isBulkEditing) return 0;
    let count = 0;

    Object.entries(bulkEdits).forEach(([id, values]) => {
      const original = bottles.find((b) => b.id === Number(id));
      if (!original) return;
      const s = values.supplierInventory;
      const w = values.warehouseInventory;
      const supplierChanged = s !== undefined && Number(s) !== original.supplierInventory;
      const warehouseChanged = w !== undefined && Number(w) !== original.warehouseInventory;
      if (supplierChanged || warehouseChanged) count += 1;
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

  // Handle start edit (for both warehouse and supplier inventory)
  const handleStartEdit = (bottle) => {
    setEditingBottleId(bottle.id);
    setEditSupplierInv(String(bottle.supplierInventory ?? ''));
    setEditWarehouseInv(String(bottle.warehouseInventory ?? ''));
    setActionMenuBottleId(null);
  };

  // Handle save edit (updates both warehouse and supplier inventory)
  const handleSaveEdit = async (bottleId, supplierInv, warehouseInv, bottleName) => {
    try {
      const response = await bottlesApi.updateInventory(bottleId, {
        supplier_quantity: Number(supplierInv) || 0,
        warehouse_quantity: Number(warehouseInv) || 0,
      });

      if (response.success) {
        setBottles((prev) =>
          prev.map((b) =>
            b.id === bottleId
              ? {
                  ...b,
                  supplierInventory: Number(supplierInv) || 0,
                  warehouseInventory: Number(warehouseInv) || 0,
                }
              : b
          )
        );
        showSuccessToast(`${bottleName} Inventory updated`);
        setEditingBottleId(null);
        setEditSupplierInv('');
        setEditWarehouseInv('');
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
    setEditWarehouseInv('');
  };

  // Handle bulk edit save (updates both warehouse and supplier inventory)
  const handleBulkEditSave = async () => {
    const updates = [];
    
    bottles.forEach((b) => {
      const edits = bulkEdits[b.id];
      if (!edits) return;
      
      const nextSupplier =
        edits.supplierInventory !== undefined
          ? Number(edits.supplierInventory) || 0
          : b.supplierInventory;
      
      const nextWarehouse =
        edits.warehouseInventory !== undefined
          ? Number(edits.warehouseInventory) || 0
          : b.warehouseInventory;
      
      // Update if either supplier or warehouse inventory changed
      if (nextSupplier !== b.supplierInventory || nextWarehouse !== b.warehouseInventory) {
        updates.push({
          id: b.id,
          supplier_quantity: nextSupplier,
          warehouse_quantity: nextWarehouse,
        });
      }
    });

    try {
      await Promise.all(
        updates.map(update =>
          bottlesApi.updateInventory(update.id, {
            supplier_quantity: update.supplier_quantity,
            warehouse_quantity: update.warehouse_quantity,
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
              warehouseInventory: update.warehouse_quantity,
            };
          }
          return b;
        })
      );

      if (updates.length > 0) {
        showSuccessToast(`${updates.length} bottle(s) inventory updated`);
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
            {[
              { key: 'name', label: 'BOTTLE NAME' },
              { key: 'warehouseInventory', label: 'WAREHOUSE INVENTORY' },
              { key: 'supplierInventory', label: 'SUPPLIER INVENTORY' },
            ].map(({ key, label }, idx) => (
              <div
                key={label}
                className="h-full text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
                style={{
                  width: '253px',
                  minWidth: '253px',
                  height: '40px',
                  paddingTop: '12px',
                  paddingRight: '16px',
                  paddingBottom: '12px',
                  paddingLeft: '16px',
                  gap: '10px',
                  justifyContent: idx === 0 ? 'flex-start' : 'center',
                  textAlign: idx === 0 ? 'left' : 'center',
                  borderRight: `1px solid ${dividerColor}`,
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: idx === 0 ? 'flex-start' : 'center',
                    gap: '6px',
                    position: 'relative',
                    width: '100%',
                  }}
                >
                  <span style={{ color: openFilterColumn === key ? '#007AFF' : '#FFFFFF' }}>{label}</span>
                  {!isPlanningView && (
                    <img
                      ref={(el) => {
                        if (el) {
                          filterIconRefs.current[key] = el;
                        }
                      }}
                      src="/assets/Vector (1).png"
                      alt="Filter"
                      className={`w-3 h-3 transition-opacity cursor-pointer ${
                        openFilterColumn === key ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      onClick={(e) => handleFilterClick(key, e)}
                      style={{ 
                        width: '12px', 
                        height: '12px',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
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
                    minWidth: '253px',
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

                <div 
                  className="flex items-center justify-center" 
                  style={{ 
                    width: '253px',
                    minWidth: '253px',
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '16px',
                    paddingBottom: '12px',
                    paddingLeft: '16px',
                    gap: '10px',
                  }}
                >
                  {showInputs ? (
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                      <input
                        type="number"
                        value={isBulkRow 
                          ? (bulkEdits[bottle.id]?.warehouseInventory ?? bottle.warehouseInventory)
                          : editWarehouseInv
                        }
                        onChange={(e) => {
                          if (isBulkRow) {
                            handleBulkEditChange(bottle.id, 'warehouseInventory', e.target.value);
                          } else {
                            setEditWarehouseInv(e.target.value);
                          }
                        }}
                        className="w-28 rounded-full border border-blue-300 px-3 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                        style={{ maxWidth: '112px' }}
                      />
                    </div>
                  ) : (
                    <span 
                      className={themeClasses.textPrimary} 
                      style={{ 
                        fontSize: '14px', 
                        textAlign: 'center',
                        display: 'block',
                        width: '100%',
                      }}
                    >
                      {typeof bottle.warehouseInventory === 'number' ? bottle.warehouseInventory.toLocaleString() : bottle.warehouseInventory}
                    </span>
                  )}
                </div>

                <div 
                  className="flex items-center justify-center" 
                  style={{ 
                    width: '253px',
                    minWidth: '253px',
                    height: '40px',
                    paddingTop: '12px',
                    paddingRight: '16px',
                    paddingBottom: '12px',
                    paddingLeft: '16px',
                    gap: '10px',
                  }}
                >
                  {showInputs ? (
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
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
                        style={{ maxWidth: '112px' }}
                      />
                    </div>
                  ) : (
                    <span 
                      className={themeClasses.textPrimary} 
                      style={{ 
                        fontSize: '14px', 
                        textAlign: 'center',
                        display: 'block',
                        width: '100%',
                      }}
                    >
                      {typeof bottle.supplierInventory === 'number' ? bottle.supplierInventory.toLocaleString() : bottle.supplierInventory}
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
                          setConfirmData({
                            id: bottle.id,
                            supplierInv: editSupplierInv,
                            warehouseInv: editWarehouseInv,
                            name: bottle.name,
                          });
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

      {/* Filter Dropdown */}
      {(!isPlanningView && openFilterColumn !== null) && (
        <SortFormulasFilterDropdown
          ref={filterDropdownRef}
          columnKey={openFilterColumn}
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          availableValues={getColumnValues(openFilterColumn)}
          currentFilter={{}}
          currentSort={sortConfig.column === openFilterColumn ? sortConfig.order : ''}
          onApply={(data) => {
            if (data?.sortOrder) {
              setSortConfig({ column: openFilterColumn, order: data.sortOrder });
            } else {
              setSortConfig((prev) =>
                prev.column === openFilterColumn ? { column: null, order: '' } : prev
              );
            }
            if (!data?.__fromSortClick) {
              setOpenFilterColumn(null);
            }
          }}
          onClose={() => setOpenFilterColumn(null)}
        />
      )}

      {confirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[340px]">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 text-center">Are you sure?</h2>
            <p className="text-sm text-gray-700 text-center mb-4">
              This will overwrite the current inventory. Make sure your new count is accurate before confirming.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded"
                onClick={() => setConfirmData(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded shadow-sm hover:bg-blue-700"
                onClick={() => {
                  handleSaveEdit(confirmData.id, confirmData.supplierInv, confirmData.warehouseInv, confirmData.name);
                  setConfirmData(null);
                }}
              >
                Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

InventoryTable.displayName = 'InventoryTable';

export default InventoryTable;

