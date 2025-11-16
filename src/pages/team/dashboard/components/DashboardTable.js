import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import StatusIndicator from './StatusIndicator';
import Pagination from './Pagination';

const DashboardTable = ({ 
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

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  const stages = [
    { key: 'essentialInfo', label: 'ESSENT.\nINFO' },
    { key: 'form', label: 'FORM.' },
    { key: 'design', label: 'DESIGN' },
    { key: 'listing', label: 'LISTING' },
    { key: 'prod', label: 'PROD.' },
    { key: 'pack', label: 'PACK.' },
    { key: 'labels', label: 'LABELS' },
    { key: 'ads', label: 'ADS' },
  ];

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-lg`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Table */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
        <table style={{ width: '100%', minWidth: '1200px' }}>
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
                  style={{ padding: '0.5rem 0.75rem', width: '90px', whiteSpace: 'pre-line', lineHeight: '1.2' }}
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
                  <span style={{ fontSize: '0.8125rem', fontWeight: '500' }} className="text-blue-500 hover:text-blue-600 cursor-pointer">
                    {row.product}
                  </span>
                </td>
                {stages.map((stage) => (
                  <td
                    key={stage.key}
                    style={{ padding: '0.375rem 0.75rem', verticalAlign: 'middle', textAlign: 'center' }}
                  >
                    <button
                      onClick={() => onStatusClick && onStatusClick(row.id, stage.key, row[stage.key])}
                      className="inline-flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
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

      {/* Legend - Fixed at bottom */}
      <div className={`border-t ${themeClasses.border} px-6 py-3`} style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span className={`text-xs font-semibold ${themeClasses.text} uppercase tracking-wide`}>Key:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <StatusIndicator status="pending" size="sm" />
            <span className={`text-xs ${themeClasses.textSecondary}`}>Pending</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <StatusIndicator status="inProgress" size="sm" />
            <span className={`text-xs ${themeClasses.textSecondary}`}>In Progress</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <StatusIndicator status="completed" size="sm" />
            <span className={`text-xs ${themeClasses.textSecondary}`}>Completed</span>
          </div>
        </div>
      </div>

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

export default DashboardTable;

