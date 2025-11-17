import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const PlanningTable = ({ rows, activeFilters, onFilterToggle }) => {
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

  return (
    <div
      className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl shadow-sm`}
      style={{ overflowX: 'auto', position: 'relative' }}
    >
      {/* Use max-content so table matches exact column widths without extra empty space */}
      <table style={{ width: 'max-content', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead className={themeClasses.headerBg}>
          <tr>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              onClick={() => onFilterToggle('brand')}
              style={{
                padding: '0.75rem 1rem',
                width: '180px',
                position: 'sticky',
                left: 0,
                zIndex: 20,
                backgroundColor: '#2C3544',
                borderRight: `1px solid ${columnBorderColor}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: isFilterActive('brand') ? '#007AFF' : '#FFFFFF' }}>
                  Brand
                </span>
                <img
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity ${
                    isFilterActive('brand')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={
                    isFilterActive('brand')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              onClick={() => onFilterToggle('product')}
              style={{
                padding: '0.75rem 1rem',
                width: '220px',
                position: 'sticky',
                left: 180,
                zIndex: 20,
                backgroundColor: '#2C3544',
                borderRight: `1px solid ${columnBorderColor}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: isFilterActive('product') ? '#007AFF' : '#FFFFFF' }}>
                  Product
                </span>
                <img
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity ${
                    isFilterActive('product')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={
                    isFilterActive('product')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              onClick={() => onFilterToggle('size')}
              style={{
                padding: '0.75rem 1rem',
                width: '120px',
                position: 'sticky',
                left: 400,
                zIndex: 20,
                backgroundColor: '#2C3544',
                borderRight: `1px solid ${columnBorderColor}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: isFilterActive('size') ? '#007AFF' : '#FFFFFF' }}>
                  Size
                </span>
                <img
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity ${
                    isFilterActive('size')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={
                    isFilterActive('size')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              onClick={() => onFilterToggle('doiFba')}
              style={{
                padding: '0.75rem 1rem',
                width: '150px',
                borderRight: `1px solid ${columnBorderColor}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: isFilterActive('doiFba') ? '#007AFF' : '#FFFFFF' }}>
                  DOI FBA
                </span>
                <img
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity ${
                    isFilterActive('doiFba')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={
                    isFilterActive('doiFba')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              onClick={() => onFilterToggle('doiTotal')}
              style={{
                padding: '0.75rem 1rem',
                width: '150px',
                borderRight: `1px solid ${columnBorderColor}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: isFilterActive('doiTotal') ? '#007AFF' : '#FFFFFF' }}>
                  DOI Total
                </span>
                <img
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity ${
                    isFilterActive('doiTotal')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={
                    isFilterActive('doiTotal')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              onClick={() => onFilterToggle('inventory')}
              style={{
                padding: '0.75rem 1rem',
                width: '150px',
                borderRight: `1px solid ${columnBorderColor}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span
                  style={{ color: isFilterActive('inventory') ? '#007AFF' : '#FFFFFF' }}
                >
                  Inventory
                </span>
                <img
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity ${
                    isFilterActive('inventory')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={
                    isFilterActive('inventory')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              onClick={() => onFilterToggle('forecast')}
              style={{
                padding: '0.75rem 1rem',
                width: '150px',
                borderRight: `1px solid ${columnBorderColor}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: isFilterActive('forecast') ? '#007AFF' : '#FFFFFF' }}>
                  Forecast
                </span>
                <img
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity ${
                    isFilterActive('forecast')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={
                    isFilterActive('forecast')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              onClick={() => onFilterToggle('sales7')}
              style={{
                padding: '0.75rem 1rem',
                width: '160px',
                borderRight: `1px solid ${columnBorderColor}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: isFilterActive('sales7') ? '#007AFF' : '#FFFFFF' }}>
                  7 Day Sales
                </span>
                <img
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity ${
                    isFilterActive('sales7')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={
                    isFilterActive('sales7')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              onClick={() => onFilterToggle('sales30')}
              style={{
                padding: '0.75rem 1rem',
                width: '170px',
                borderRight: `1px solid ${columnBorderColor}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: isFilterActive('sales30') ? '#007AFF' : '#FFFFFF' }}>
                  30 Day Sales
                </span>
                <img
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity ${
                    isFilterActive('sales30')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={
                    isFilterActive('sales30')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              onClick={() => onFilterToggle('formula')}
              style={{
                padding: '0.75rem 1rem',
                width: '190px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: isFilterActive('formula') ? '#007AFF' : '#FFFFFF' }}>
                  Formula
                </span>
                <img
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity ${
                    isFilterActive('formula')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  style={
                    isFilterActive('formula')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
          </tr>
        </thead>
        <tbody
          className="divide-y"
          style={{ borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6' }}
        >
          {rows.map((row) => (
            <tr
              key={row.id}
              className={`${themeClasses.rowHover} transition-colors duration-150`}
            >
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  zIndex: 10,
                }}
              >
                <span
                  className={themeClasses.text}
                  style={{ fontSize: '0.875rem', fontWeight: 500 }}
                >
                  {row.brand}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  position: 'sticky',
                  left: 180,
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  zIndex: 10,
                }}
              >
                <button
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 truncate"
                  style={{ maxWidth: '220px' }}
                >
                  {row.product}
                </button>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  position: 'sticky',
                  left: 400,
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  zIndex: 10,
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {row.size}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {row.doiFba}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {row.doiTotal}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {row.inventory}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {row.forecast}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {row.sales7}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {row.sales30}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
                  {/* Approximate days of coverage based on 30-day sales */}
                  {row.sales30 > 0
                    ? `${Math.round((row.inventory / row.sales30) * 30)} days`
                    : '—'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlanningTable;

