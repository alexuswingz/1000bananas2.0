import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ShipmentsTable = ({ shipments, activeFilters, onFilterToggle }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#2C3544]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  const columnBorderColor = isDarkMode ? 'rgba(55, 65, 81, 0.9)' : '#E5E7EB';

  const isFilterActive = (key) => activeFilters.includes(key);

  const columns = [
    { key: 'status', label: 'Status', width: 160, align: 'left' },
    { key: 'marketplace', label: 'Marketplace', width: 140, align: 'left' },
    { key: 'account', label: 'Account', width: 180, align: 'left' },
    { key: 'shipmentDate', label: 'Shipment #', width: 160, align: 'left' },
    { key: 'shipmentType', label: 'Shipment Type', width: 160, align: 'left' },
    { key: 'amznShipment', label: 'Amzn Shipment #', width: 200, align: 'left' },
    { key: 'amznRefId', label: 'Amzn Ref ID', width: 160, align: 'left' },
    { key: 'action', label: 'Action', width: 100, align: 'center' },
  ];

  return (
    <div
      className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl shadow-sm`}
      style={{ position: 'relative' }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
        }}
      >
        <thead className={themeClasses.headerBg}>
          <tr>
            {columns.map((col, index) => (
              <th
                key={col.key}
                className={`${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                } text-xs font-bold text-white uppercase tracking-wider group cursor-pointer`}
                onClick={() => onFilterToggle(col.key)}
                style={{
                  padding: '0.75rem 1rem',
                  width: `${col.width}px`,
                  borderRight:
                    index < columns.length - 1 ? `1px solid ${columnBorderColor}` : undefined,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      col.align === 'right'
                        ? 'flex-end'
                        : col.align === 'center'
                        ? 'center'
                        : 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      color: isFilterActive(col.key) ? '#007AFF' : '#FFFFFF',
                    }}
                  >
                    {col.label}
                  </span>
                  <img
                    src="/assets/Vector (1).png"
                    alt="Filter"
                    className={`w-3 h-3 transition-opacity ${
                      isFilterActive(col.key)
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                    style={
                      isFilterActive(col.key)
                        ? {
                            filter:
                              'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                          }
                        : undefined
                    }
                  />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody
          className="divide-y"
          style={{ borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6' }}
        >
          {shipments.map((row) => (
            <tr
              key={row.id}
              className={`${themeClasses.rowHover} transition-colors duration-150`}
            >
              {/* Status with badge and chevron */}
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                <button
                  type="button"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    padding: '0.35rem 0.9rem',
                    borderRadius: '9999px',
                    border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                    backgroundColor: isDarkMode ? '#020617' : '#FFFFFF',
                    boxShadow: isDarkMode
                      ? '0 1px 2px rgba(0,0,0,0.6)'
                      : '0 1px 2px rgba(15,23,42,0.08)',
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: isDarkMode ? '#F9FAFB' : '#111827',
                    minWidth: '170px',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    {/* Status icon */}
                    <svg
                      style={{ width: '1rem', height: '1rem' }}
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 7.5L12 3L20 7.5V16.5L12 21L4 16.5V7.5Z"
                        stroke={row.statusColor}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9.5 12.5L11 14L14.5 10.5"
                        stroke={row.statusColor}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>{row.status}</span>
                  </span>
                  {/* Chevron */}
                  <svg
                    style={{ width: '0.85rem', height: '0.85rem' }}
                    fill="none"
                    stroke={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {row.marketplace}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {row.account}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {row.shipmentDate}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {row.shipmentType}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {row.amznShipment}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {row.amznRefId}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                }}
              >
                <button
                  type="button"
                  className="hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src="/assets/Icons.png"
                    alt="Actions"
                    style={{ width: '1rem', height: '1rem', objectFit: 'contain' }}
                  />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ShipmentsTable;

