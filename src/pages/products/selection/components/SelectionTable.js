import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, flexRender } from '@tanstack/react-table';
import { useTheme } from '../../../../context/ThemeContext';
import StatusDropdown from './StatusDropdown';
import AccountDropdown from './AccountDropdown';
import BrandDropdown from './BrandDropdown';
import ColumnFilter from './ColumnFilter';
import ActionButton from './ActionButton';
import Pagination from './Pagination';

const SelectionTable = ({ 
  data, 
  onActionClick, 
  onStatusChange, 
  onAccountChange, 
  onBrandChange, 
  onProductChange, 
  onSearchVolChange,
  onSaveNewRow,
  onCancelNewRow
}) => {
  const { isDarkMode } = useTheme();
  const [columnFilters, setColumnFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Use ref to store data for ColumnFilter without causing column recreation
  const dataRef = useRef(data);
  
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Calculate dynamic page size based on screen height
  useEffect(() => {
    const calculatePageSize = () => {
      // Viewport height minus header (approx 220px) minus pagination (approx 80px)
      const availableHeight = window.innerHeight - 300;
      // Row height is approximately 48px
      const rowHeight = 48;
      const calculatedPageSize = Math.max(5, Math.floor(availableHeight / rowHeight));
      setPageSize(calculatedPageSize);
      setCurrentPage(1); // Reset to first page when page size changes
    };

    calculatePageSize();
    window.addEventListener('resize', calculatePageSize);
    return () => window.removeEventListener('resize', calculatePageSize);
  }, []);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    rowBorder: isDarkMode ? 'border-dark-border-primary/50' : 'border-gray-100',
  };

  // Apply column filters
  const applyColumnFilter = (row, column, filter) => {
    if (!filter) return true;

    const value = row[column];
    const { condition, value: filterValue, selectedValues } = filter;

    // Filter by selected values
    if (selectedValues && selectedValues.length > 0) {
      if (!selectedValues.includes(value)) {
        return false;
      }
    }

    // Filter by condition
    if (condition && condition !== 'none') {
      const strValue = String(value).toLowerCase();
      const strFilterValue = String(filterValue).toLowerCase();

      switch (condition) {
        case 'isEmpty':
          return !value || String(value).trim() === '';
        case 'isNotEmpty':
          return value && String(value).trim() !== '';
        case 'textContains':
          return strValue.includes(strFilterValue);
        case 'textDoesNotContain':
          return !strValue.includes(strFilterValue);
        case 'textStartsWith':
          return strValue.startsWith(strFilterValue);
        case 'textEndsWith':
          return strValue.endsWith(strFilterValue);
        case 'textIsExactly':
          return strValue === strFilterValue;
        case 'greaterThan':
          return Number(value) > Number(filterValue);
        case 'greaterThanOrEqual':
          return Number(value) >= Number(filterValue);
        case 'lessThan':
          return Number(value) < Number(filterValue);
        case 'lessThanOrEqual':
          return Number(value) <= Number(filterValue);
        case 'isEqualTo':
          return value == filterValue;
        case 'isNotEqualTo':
          return value != filterValue;
        default:
          return true;
      }
    }

    return true;
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply all column filters
    Object.keys(columnFilters).forEach(column => {
      if (columnFilters[column]) {
        filtered = filtered.filter(row => applyColumnFilter(row, column, columnFilters[column]));
      }
    });

    // Apply sorting
    if (sortConfig.column && sortConfig.direction) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.column];
        const bVal = b[sortConfig.column];
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        
        if (sortConfig.direction === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return filtered;
  }, [data, columnFilters, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleColumnFilter = (column, filter) => {
    setColumnFilters(prev => {
      if (filter === null) {
        const { [column]: removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [column]: filter
      };
    });
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleSort = (column, direction) => {
    setSortConfig({ column, direction });
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'status',
        header: ({ table }) => (
          <div className="flex items-center justify-between gap-2">
            <span>STATUS</span>
            <ColumnFilter
              column="status"
              data={dataRef.current}
              onFilterChange={handleColumnFilter}
              onSort={handleSort}
            />
          </div>
        ),
            cell: ({ getValue, row }) => (
              <StatusDropdown
                value={getValue()}
                onChange={onStatusChange}
                rowId={row.original.id}
                isNew={row.original.isNew}
              />
            ),
        size: 180,
      },
      {
        accessorKey: 'account',
        header: ({ table }) => (
          <div className="flex items-center justify-between gap-2">
            <span>ACCOUNT</span>
            <ColumnFilter
              column="account"
              data={dataRef.current}
              onFilterChange={handleColumnFilter}
              onSort={handleSort}
            />
          </div>
        ),
        cell: ({ getValue, row }) => {
          if (row.original.isNew) {
            return (
              <AccountDropdown
                value={getValue()}
                onChange={onAccountChange}
                rowId={row.original.id}
                isNew={true}
              />
            );
          }
          return (
            <span style={{ fontSize: '0.8125rem', fontWeight: '500' }} className={themeClasses.text}>
              {getValue()}
            </span>
          );
        },
        size: 180,
      },
      {
        accessorKey: 'brand',
        header: ({ table }) => (
          <div className="flex items-center justify-between gap-2">
            <span>BRAND</span>
            <ColumnFilter
              column="brand"
              data={dataRef.current}
              onFilterChange={handleColumnFilter}
              onSort={handleSort}
            />
          </div>
        ),
        cell: ({ getValue, row }) => {
          if (row.original.isNew) {
            return (
              <BrandDropdown
                value={getValue()}
                onChange={onBrandChange}
                rowId={row.original.id}
                isNew={true}
              />
            );
          }
          return (
            <span style={{ fontSize: '0.8125rem', fontWeight: '500' }} className={themeClasses.text}>
              {getValue()}
            </span>
          );
        },
        size: 200,
      },
      {
        accessorKey: 'product',
        header: ({ table }) => (
          <div className="flex items-center justify-between gap-2">
            <span>PRODUCT</span>
            <ColumnFilter
              column="product"
              data={dataRef.current}
              onFilterChange={handleColumnFilter}
              onSort={handleSort}
            />
          </div>
        ),
        cell: ({ getValue, row }) => {
          if (row.original.isNew) {
            return (
              <input
                type="text"
                value={getValue() || ''}
                onChange={(e) => onProductChange(row.original.id, e.target.value)}
                placeholder="Enter product name..."
                className={`w-full rounded-md border ${isDarkMode ? 'bg-dark-bg-tertiary border-dark-border-primary text-dark-text-primary' : 'bg-white border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all`}
                style={{ 
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}
              />
            );
          }
          return (
            <span style={{ fontSize: '0.8125rem', fontWeight: '500' }} className={themeClasses.text}>
              {getValue()}
            </span>
          );
        },
        size: 280,
      },
      {
        accessorKey: 'searchVol',
        header: ({ table }) => (
          <div className="flex items-center justify-between gap-2">
            <span>SEARCH VOL</span>
            <ColumnFilter
              column="searchVol"
              data={dataRef.current}
              onFilterChange={handleColumnFilter}
              onSort={handleSort}
            />
          </div>
        ),
        cell: ({ getValue, row }) => {
          if (row.original.isNew) {
            return (
              <input
                type="number"
                value={getValue() || ''}
                onChange={(e) => onSearchVolChange(row.original.id, e.target.value)}
                placeholder="0"
                className={`w-full rounded-md border ${isDarkMode ? 'bg-dark-bg-tertiary border-dark-border-primary text-dark-text-primary' : 'bg-white border-gray-200 text-gray-900'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all`}
                style={{ 
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              />
            );
          }
          return (
            <span style={{ fontSize: '0.8125rem', fontWeight: '600' }} className={themeClasses.text}>
              {getValue().toLocaleString()}
            </span>
          );
        },
        size: 140,
      },
      {
        accessorKey: 'actionType',
        header: 'NEW PRODUCT FORM',
        cell: ({ row }) => {
          if (row.original.isNew) {
            return (
              <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                <button
                  onClick={() => onSaveNewRow(row.original.id)}
                  className="inline-flex items-center justify-center rounded-md transition-all duration-200 bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow"
                  style={{ 
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => onCancelNewRow(row.original.id)}
                  className={`inline-flex items-center justify-center rounded-md transition-all duration-200 border ${isDarkMode ? 'bg-transparent text-red-400 border-red-500/20 hover:bg-red-500/10' : 'bg-transparent text-red-600 border-red-200 hover:bg-red-50'} shadow-sm hover:shadow`}
                  style={{ 
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  Cancel
                </button>
              </div>
            );
          }
          return (
            <ActionButton
              type={row.original.actionType}
              onClick={() => onActionClick && onActionClick(row.original)}
            />
          );
        },
        size: 200,
      },
    ],
    [
      themeClasses.text, 
      onActionClick, 
      onStatusChange, 
      onAccountChange, 
      onBrandChange, 
      onProductChange, 
      onSearchVolChange,
      onSaveNewRow,
      onCancelNewRow,
      isDarkMode
    ]
  );

  const table = useReactTable({
    data: paginatedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-lg`} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Table - Scrollable Area */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', minHeight: 0 }}>
        <table style={{ width: '100%', minWidth: '800px' }}>
        {/* Header */}
        <thead className={themeClasses.headerBg} style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="text-left text-xs font-bold text-white uppercase tracking-wider"
                  style={{ 
                    width: header.getSize(),
                    padding: '0.5rem 1rem'
                  }}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>

        {/* Body */}
        <tbody className="divide-y" style={{ borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6' }}>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={`${themeClasses.rowHover} transition-colors duration-150`}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  style={{ 
                    width: cell.column.getSize(),
                    padding: '0.375rem 1rem',
                    verticalAlign: 'middle'
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

        {/* Empty State */}
        {filteredData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <svg
              className={`mx-auto h-12 w-12 ${themeClasses.textSecondary}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className={`mt-2 text-sm font-medium ${themeClasses.text}`}>
              {data.length === 0 ? 'No products' : 'No results found'}
            </h3>
            <p className={`mt-1 text-sm ${themeClasses.textSecondary}`}>
              {data.length === 0 
                ? 'Get started by creating a new product.'
                : 'Try adjusting your filters or search query.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Pagination - Fixed at Bottom */}
      {filteredData.length > 0 && (
        <div style={{ flexShrink: 0, borderTop: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}` }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredData.length}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </div>
  );
};

export default SelectionTable;

