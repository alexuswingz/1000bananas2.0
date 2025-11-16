import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import Pagination from './Pagination';

const CatalogTable = ({ 
  data,
  totalItems,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onProductClick
}) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-lg`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Table */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
        <table style={{ width: '100%', minWidth: '800px' }}>
          {/* Header */}
          <thead className={themeClasses.headerBg} style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th
                className="text-left text-xs font-bold text-white uppercase tracking-wider"
                style={{ padding: '0.5rem 1rem', width: '200px' }}
              >
                MARKETPLACE
              </th>
              <th
                className="text-left text-xs font-bold text-white uppercase tracking-wider"
                style={{ padding: '0.5rem 1rem', width: '200px' }}
              >
                ACCOUNT
              </th>
              <th
                className="text-left text-xs font-bold text-white uppercase tracking-wider"
                style={{ padding: '0.5rem 1rem', width: '200px' }}
              >
                BRAND
              </th>
              <th
                className="text-left text-xs font-bold text-white uppercase tracking-wider"
                style={{ padding: '0.5rem 1rem', width: '300px' }}
              >
                PRODUCT
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y" style={{ borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6' }}>
            {data.map((row) => (
              <tr
                key={row.id}
                className={`${themeClasses.rowHover} transition-colors duration-150`}
              >
                <td style={{ padding: '0.375rem 1rem', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: '500' }} className={themeClasses.text}>
                    {row.marketplace}
                  </span>
                </td>
                <td style={{ padding: '0.375rem 1rem', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: '500' }} className={themeClasses.text}>
                    {row.account}
                  </span>
                </td>
                <td style={{ padding: '0.375rem 1rem', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: '500' }} className={themeClasses.text}>
                    {row.brand}
                  </span>
                </td>
                <td style={{ padding: '0.5rem 1rem', verticalAlign: 'middle' }}>
                  <button
                    onClick={() => onProductClick && onProductClick(row)}
                    className="text-blue-500 hover:text-blue-600 cursor-pointer transition-colors"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left' }}
                  >
                    {/* Product Image */}
                    {row.mainImage || row.images?.[0] ? (
                      <img
                        src={row.mainImage || row.images[0]}
                        alt={row.product}
                        style={{
                          width: '40px',
                          height: '40px',
                          objectFit: 'contain',
                          borderRadius: '0.375rem',
                          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '0.375rem',
                        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <svg style={{ width: '1.25rem', height: '1.25rem' }} className={themeClasses.textSecondary} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {/* Product Name */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: '500' }}>
                        {row.product}
                      </span>
                      {row.asin && (
                        <span style={{ fontSize: '0.6875rem', color: isDarkMode ? '#9ca3af' : '#6b7280' }}>
                          ASIN: {row.asin}
                        </span>
                      )}
                    </div>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {data.length === 0 && (
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
            No products found
          </h3>
          <p className={`mt-1 text-sm ${themeClasses.textSecondary}`}>
            Try adjusting your search query.
          </p>
        </div>
      )}

      {/* Pagination - Fixed at bottom */}
      {totalItems > 0 && (
        <div style={{ flexShrink: 0, borderTop: `1px solid ${isDarkMode ? '#374151' : '#e5e7eb'}` }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </div>
  );
};

export default CatalogTable;

