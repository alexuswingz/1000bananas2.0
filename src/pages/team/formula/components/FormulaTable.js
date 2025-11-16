import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import Pagination from './Pagination';

const FormulaTable = ({ 
  data, 
  totalItems,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onNewFormula, 
  onEditFormula, 
  onViewMSDS 
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with New Formula Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className={`text-2xl font-bold ${themeClasses.text}`}>Formula Dashboard</h1>
        <button
          onClick={onNewFormula}
          className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          style={{
            padding: '0.625rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Formula
        </button>
      </div>

      {/* Table */}
      <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-lg`} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
          <table style={{ width: '100%' }}>
            {/* Header */}
            <thead className={themeClasses.headerBg} style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th 
                  className="text-left text-xs font-bold text-white uppercase tracking-wider"
                  style={{ padding: '0.5rem 1rem', width: '300px' }}
                >
                  ACCOUNT
                </th>
                <th 
                  className="text-left text-xs font-bold text-white uppercase tracking-wider"
                  style={{ padding: '0.5rem 1rem' }}
                >
                  FORMULA
                </th>
                <th 
                  className="text-left text-xs font-bold text-white uppercase tracking-wider"
                  style={{ padding: '0.5rem 1rem', width: '150px' }}
                >
                  MSDS
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y" style={{ borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6' }}>
            {data.map((row, index) => (
              <tr
                key={row.id}
                className={`${themeClasses.rowHover} transition-colors duration-150`}
              >
                {/* Account */}
                <td style={{ padding: '0.375rem 1rem', verticalAlign: 'middle' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: '500' }} className={themeClasses.text}>
                    {row.account}
                  </span>
                </td>

                {/* Formula with Edit Icon */}
                <td style={{ padding: '0.375rem 1rem', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: '500' }} className={themeClasses.text}>
                      {row.formulaName}
                    </span>
                    <button
                      onClick={() => onEditFormula(row)}
                      className={`${themeClasses.textSecondary} hover:${themeClasses.text} transition-colors`}
                      style={{ padding: '0.25rem' }}
                      title="Edit formula"
                    >
                      <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </td>

                {/* MSDS View Button */}
                <td style={{ padding: '0.375rem 1rem', verticalAlign: 'middle' }}>
                  <button
                    onClick={() => onViewMSDS(row)}
                    className="bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                    style={{
                      padding: '0.375rem 0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}
                  >
                    <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                    </svg>
                    View
                  </button>
                </td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {data.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p className={themeClasses.textSecondary}>No formulas found. Click "+ New Formula" to create one.</p>
          </div>
        )}

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
    </div>
  );
};

export default FormulaTable;

