import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const Planning = () => {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('products');
  const [activeFilters, setActiveFilters] = useState([]);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#2C3544]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  const shipmentsTabs = [
    { id: 'products', label: 'Products' },
    { id: 'shipments', label: 'Shipments' },
    { id: 'archive', label: 'Archive' },
  ];

  const rows = [
    {
      id: 1,
      brand: 'Total Pest Spray',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      doiFba: 12,
      doiTotal: 32,
      inventory: 20,
      forecast: 20,
      sales7: 20,
      sales30: 20,
    },
    {
      id: 2,
      brand: 'Total Pest Spray',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      doiFba: 12,
      doiTotal: 32,
      inventory: 20,
      forecast: 20,
      sales7: 20,
      sales30: 20,
    },
    {
      id: 3,
      brand: 'Total Pest Spray',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      doiFba: 12,
      doiTotal: 32,
      inventory: 20,
      forecast: 20,
      sales7: 20,
      sales30: 20,
    },
    {
      id: 4,
      brand: 'Total Pest Spray',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      doiFba: 12,
      doiTotal: 32,
      inventory: 20,
      forecast: 20,
      sales7: 20,
      sales30: 20,
    },
    {
      id: 5,
      brand: 'Total Pest Spray',
      product: 'Cherry Tree Fertilizer',
      size: 'Gallon',
      doiFba: 12,
      doiTotal: 32,
      inventory: 20,
      forecast: 20,
      sales7: 20,
      sales30: 20,
    },
  ];

  const columnBorderColor = isDarkMode ? 'rgba(55, 65, 81, 0.9)' : '#E5E7EB';

  const toggleFilter = (key) => {
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const isFilterActive = (key) => activeFilters.includes(key);

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`}>
      {/* Header bar */}
      <div
        className={`${themeClasses.cardBg} ${themeClasses.border} border-b`}
        style={{
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Left: icon + title + tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Icon + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '9999px',
                backgroundColor: '#111827',
              }}
            >
              <svg
                style={{ width: '22px', height: '22px', color: 'white' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4"
                />
              </svg>
            </div>
            <h1 className={`text-xl font-semibold ${themeClasses.text}`}>Planning</h1>
          </div>

          {/* Tabs */}
          <div
            className={`${themeClasses.border}`}
            style={{
              display: 'inline-flex',
              borderRadius: '9999px',
              padding: '0.125rem',
              borderWidth: 1,
              backgroundColor: isDarkMode ? '#111827' : '#F9FAFB',
            }}
          >
            {shipmentsTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '0.35rem 0.9rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    borderRadius: '9999px',
                    transition: 'all 0.15s ease',
                    backgroundColor: isActive
                      ? isDarkMode
                        ? '#111827'
                        : 'white'
                      : 'transparent',
                    color: isActive
                      ? isDarkMode
                        ? '#E5E7EB'
                        : '#111827'
                      : '#6B7280',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: search + settings + primary button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            width: '100%',
            maxWidth: '520px',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Find a shipment..."
              className={`${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all`}
              style={{
                width: '100%',
                paddingLeft: '2.5rem',
                paddingRight: '1rem',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem',
              }}
            />
            <svg
              className={themeClasses.textSecondary}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{
                position: 'absolute',
                left: '0.9rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '1rem',
                height: '1rem',
              }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Settings icon */}
          <button
            className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-full flex items-center justify-center`}
            style={{
              width: '36px',
              height: '36px',
            }}
          >
            <svg
              className={themeClasses.textSecondary}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ width: '1rem', height: '1rem' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l.7 2.153a1 1 0 00.95.69h2.262c.969 0 1.371 1.24.588 1.81l-1.834 1.333a1 1 0 00-.364 1.118l.7 2.153c.3.922-.755 1.688-1.538 1.118l-1.834-1.333a1 1 0 00-1.175 0l-1.834 1.333c-.783.57-1.838-.197-1.538-1.118l.7-2.153a1 1 0 00-.364-1.118L4.45 7.58c-.783-.57-.38-1.81.588-1.81h2.262a1 1 0 00.95-.69l.7-2.153z"
              />
            </svg>
          </button>

          {/* New Shipment button */}
          <button
            className="bg-[#111827] text-white rounded-full text-sm font-medium"
            style={{ padding: '0.55rem 1.25rem', whiteSpace: 'nowrap' }}
          >
            + New Shipment
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: '1rem 2rem 2rem 2rem' }}>
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
                   onClick={() => toggleFilter('brand')}
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
                   onClick={() => toggleFilter('product')}
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
                   onClick={() => toggleFilter('size')}
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
                   onClick={() => toggleFilter('doiFba')}
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
                   onClick={() => toggleFilter('doiTotal')}
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
                   onClick={() => toggleFilter('inventory')}
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
                   onClick={() => toggleFilter('forecast')}
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
                   onClick={() => toggleFilter('sales7')}
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
                   onClick={() => toggleFilter('sales30')}
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
                   onClick={() => toggleFilter('formula')}
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
      </div>
    </div>
  );
};

export default Planning;
