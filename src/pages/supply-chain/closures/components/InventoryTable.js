import React, { useState, useMemo, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import SortFormulasFilterDropdown from '../../../production/new-shipment/components/SortFormulasFilterDropdown';
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

  // Create theme classes object with fallbacks
  const effectiveThemeClasses = themeClasses || {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  // Closures data - fetch from API
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inline inventory editing (single row) - only for supplier inventory
  const [editingClosureId, setEditingClosureId] = useState(null);
  const [editSupplierInv, setEditSupplierInv] = useState('');

  // Bulk inventory editing (multiple rows)
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEdits, setBulkEdits] = useState({}); // { [id]: { warehouseInventory, supplierInventory } }

  // Action menu state
  const [actionMenuClosureId, setActionMenuClosureId] = useState(null);

  // Header filter state (match bottles behavior)
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const [sortConfig, setSortConfig] = useState({ column: null, order: '' });
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);

  useEffect(() => {
    if (openFilterColumn === null) return;
    const handleClickOutside = (event) => {
      const icon = filterIconRefs.current[openFilterColumn];
      const dropdown = filterDropdownRef.current;
      const inIcon = icon && icon.contains(event.target);
      const inDropdown = dropdown && dropdown.contains(event.target);
      if (!inIcon && !inDropdown) setOpenFilterColumn(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilterColumn]);

  const handleFilterClick = (columnKey, e) => {
    e.stopPropagation();
    setOpenFilterColumn((prev) => (prev === columnKey ? null : columnKey));
  };

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

  // Close action menu when clicking outside
  useEffect(() => {
    if (actionMenuClosureId === null) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest('.action-menu-container')) {
        setActionMenuClosureId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuClosureId]);

  // Filter closures based on search query
  const filteredData = useMemo(() => {
    let data = closures;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      data = closures.filter((closure) => closure.name.toLowerCase().includes(query));
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
  }, [closures, searchQuery, sortConfig]);

  const getColumnValues = (columnKey) => {
    const values = new Set();
    filteredData.forEach((closure) => {
      switch (columnKey) {
        case 'name':
          values.add(closure.name ?? '');
          break;
        case 'warehouseInventory':
          values.add(closure.warehouseInventory ?? 0);
          break;
        case 'supplierInventory':
          values.add(closure.supplierInventory ?? 0);
          break;
        default:
          break;
      }
    });
    return Array.from(values);
  };

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

  // Handle action menu toggle
  const handleActionMenuToggle = (closureId) => {
    setActionMenuClosureId((prev) => (prev === closureId ? null : closureId));
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
              gridTemplateColumns: '253px 253px 253px 1fr',
              gap: '0',
            }}
          >
            {[
              { key: 'name', label: 'CLOSURE NAME' },
              { key: 'warehouseInventory', label: 'WAREHOUSE INVENTORY' },
              { key: 'supplierInventory', label: 'SUPPLIER INVENTORY' },
            ].map(({ key, label }, idx) => (
              <div
                key={label}
                className="h-full text-xs font-bold text-white uppercase tracking-wider flex items-center group"
                style={{
                  width: '253px',
                  height: '40px',
                  paddingTop: '12px',
                  paddingRight: '16px',
                  paddingBottom: '12px',
                  paddingLeft: '16px',
                  gap: '10px',
                  justifyContent: idx === 0 ? 'flex-start' : 'center',
                  textAlign: idx === 0 ? 'left' : 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: idx === 0 ? 'space-between' : 'center',
                    gap: '0.5rem',
                    width: '100%',
                  }}
                >
                  <span style={{ color: openFilterColumn === key ? '#007AFF' : '#FFFFFF' }}>{label}</span>
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
                    style={{ width: '12px', height: '12px' }}
                  />
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
            <div className={`px-6 py-6 text-center text-sm ${effectiveThemeClasses.textSecondary}`}>
              Loading inventory...
            </div>
          ) : error ? (
            <div className="px-6 py-6 text-center text-sm text-red-500">
              Error: {error}
            </div>
          ) : filteredData.length === 0 ? (
            <div className={`px-6 py-6 text-center text-sm italic ${effectiveThemeClasses.textSecondary}`}>
              No closures match your search.
            </div>
          ) : (
            filteredData.map((closure, index) => {
            const isRowEditing = editingClosureId === closure.id;
            const isBulkRow = isBulkEditing;
            const showInputs = isBulkRow || isRowEditing;

            const bulkValues = bulkEdits[closure.id] || {};
            const supplierValue = isBulkRow
              ? bulkValues.supplierInventory ?? closure.supplierInventory
              : editSupplierInv;

            return (
              <div
                key={closure.id}
                className={`grid text-sm ${effectiveThemeClasses.cardBg}`}
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
                    onClick={() => onClosureClick && onClosureClick(closure)}
                    style={{
                      fontSize: '14px',
                    }}
                  >
                    {closure.name}
                  </button>
                </div>

                <div 
                  className="flex items-center justify-center" 
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
                  {/* Warehouse inventory is read-only - updated automatically when orders are received */}
                  <span 
                    className={effectiveThemeClasses.textPrimary} 
                    title="Warehouse inventory is updated automatically when orders are received" 
                    style={{ 
                      fontSize: '14px', 
                        textAlign: 'center',
                      display: 'block',
                      width: '100%',
                    }}
                  >
                    {typeof closure.warehouseInventory === 'number' ? closure.warehouseInventory.toLocaleString() : closure.warehouseInventory}
                  </span>
                </div>

                <div 
                  className="flex items-center justify-center" 
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
                          handleBulkEditChange(closure.id, 'supplierInventory', e.target.value);
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
                        textAlign: 'center',
                        display: 'block',
                        width: '100%',
                      }}
                    >
                      {typeof closure.supplierInventory === 'number' ? closure.supplierInventory.toLocaleString() : closure.supplierInventory}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end relative action-menu-container" style={{ paddingTop: '12px', paddingBottom: '12px', paddingRight: '16px' }}>
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
                          handleSaveEdit(closure.id, editSupplierInv, closure.name);
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
                        onClick={() => handleActionMenuToggle(closure.id)}
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

                      {actionMenuClosureId === closure.id && (
                        <div className={`absolute right-4 top-9 z-20 w-32 ${effectiveThemeClasses.cardBg} border ${effectiveThemeClasses.border} rounded-md shadow-lg text-xs`}>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-blue-600"
                            onClick={() => handleStartEdit(closure)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600"
                            onClick={() => {
                              if (onDeleteClick) {
                                onDeleteClick(closure);
                              }
                              setActionMenuClosureId(null);
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

      {openFilterColumn !== null && (
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
    </>
  );
});

InventoryTable.displayName = 'InventoryTable';

export default InventoryTable;
