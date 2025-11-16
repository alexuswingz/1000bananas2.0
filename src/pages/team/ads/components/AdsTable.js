import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import StatusIndicator from './StatusIndicator';
import Pagination from './Pagination';

const AdsTable = ({ 
  data, 
  totalItems,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onStatusClick 
}) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  const stages = [
    { key: 'phase1', label: 'PHASE 1' },
    { key: 'phase2', label: 'PHASE 2' },
    { key: 'phase3', label: 'PHASE 3' },
  ];

  const handleProductClick = (product) => {
    // Navigate to product detail page with only Essential Info tab
    navigate('/dashboard/products/catalog/detail', { 
      state: { 
        product: {
          ...product,
          brandFull: product.brand,
          marketplace: 'Amazon',
          salesAccount: product.account,
          country: 'U.S.',
          sizes: '8 fl oz, Quart, Gallon',
          type: 'Liquid',
          variations: ['8oz', 'Quart', 'Gallon'],
        },
        returnPath: '/dashboard/team/ads', // Return to Ads page when back button is clicked
        allowedTabs: ['essential'] // Only show Essential Info tab
      } 
    });
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
                style={{ padding: '0.5rem 1rem', width: '180px' }}
              >
                ACCOUNT
              </th>
              <th
                className="text-left text-xs font-bold text-white uppercase tracking-wider"
                style={{ padding: '0.5rem 1rem', width: '180px' }}
              >
                BRAND
              </th>
              <th
                className="text-left text-xs font-bold text-white uppercase tracking-wider"
                style={{ padding: '0.5rem 1rem', width: '250px' }}
              >
                PRODUCT
              </th>
              {stages.map((stage) => (
                <th
                  key={stage.key}
                  className="text-center text-xs font-bold text-white uppercase tracking-wider"
                  style={{ padding: '0.5rem 0.75rem', width: '120px' }}
                >
                  {stage.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y" style={{ borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6' }}>
            {data.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={`${themeClasses.rowHover} transition-colors duration-150`}
              >
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
                <td style={{ padding: '0.375rem 1rem', verticalAlign: 'middle' }}>
                  <button
                    onClick={() => handleProductClick(row)}
                    style={{ fontSize: '0.8125rem', fontWeight: '500', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    className="text-blue-500 hover:text-blue-600 hover:underline transition-all"
                  >
                    {row.product}
                  </button>
                </td>
                {stages.map((stage) => (
                  <td
                    key={stage.key}
                    style={{ padding: '0.375rem 0.75rem', verticalAlign: 'middle', textAlign: 'center' }}
                  >
                    <button
                      onClick={() => onStatusClick && onStatusClick(row.id, stage.key, row[stage.key])}
                      className="inline-flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                      style={{ background: 'none', border: 'none', padding: 0 }}
                    >
                      <StatusIndicator status={row[stage.key]} />
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
};

export default AdsTable;


