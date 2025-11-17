import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const InventoryTable = ({
  data,
  isBulkEditing,
  bulkEdits,
  editingClosureId,
  editWarehouseInv,
  editSupplierInv,
  onBulkEditChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditWarehouseInvChange,
  onEditSupplierInvChange,
}) => {
  const { isDarkMode } = useTheme();

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
            <th className="px-6 py-3 text-left">TYPE</th>
            <th className="px-6 py-3 text-left">PACKAGING NAME</th>
            <th className="px-6 py-3 text-left">WAREHOUSE INVENTORY</th>
            <th className="px-6 py-3 text-left">SUPPLIER INVENTORY</th>
          </tr>
        </thead>
        <tbody>
          {data.map((closure) => {
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
                        onBulkEditChange(closure.id, 'warehouseInventory', e.target.value)
                      }
                      className={`w-24 rounded border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                    />
                  ) : isEditing ? (
                    <input
                      type="number"
                      value={editWarehouseInv}
                      onChange={(e) => onEditWarehouseInvChange(e.target.value)}
                      onBlur={() => onSaveEdit(closure.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSaveEdit(closure.id);
                        if (e.key === 'Escape') onCancelEdit();
                      }}
                      autoFocus
                      className={`w-24 rounded border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${themeClasses.textPrimary}`}>{closure.warehouseInventory}</span>
                      <button
                        type="button"
                        onClick={() => onStartEdit(closure)}
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
                        onBulkEditChange(closure.id, 'supplierInventory', e.target.value)
                      }
                      className={`w-24 rounded border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                    />
                  ) : isEditing ? (
                    <input
                      type="number"
                      value={editSupplierInv}
                      onChange={(e) => onEditSupplierInvChange(e.target.value)}
                      onBlur={() => onSaveEdit(closure.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onSaveEdit(closure.id);
                        if (e.key === 'Escape') onCancelEdit();
                      }}
                      className={`w-24 rounded border ${themeClasses.inputBorder} ${themeClasses.inputBg} ${themeClasses.inputText} px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50`}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${themeClasses.textPrimary}`}>{closure.supplierInventory}</span>
                      <button
                        type="button"
                        onClick={() => onStartEdit(closure)}
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
    </div>
  );
};

export default InventoryTable;

