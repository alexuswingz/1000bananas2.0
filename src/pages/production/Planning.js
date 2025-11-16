import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Planning = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('products');
  const [activeFilters, setActiveFilters] = useState([]);
  const [showNewShipmentModal, setShowNewShipmentModal] = useState(false);
  const [newShipment, setNewShipment] = useState({
    shipmentNumber: '',
    shipmentType: '',
    account: '',
    supplier: 'amazon',
  });

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

  const shipments = [
    {
      id: 1,
      status: 'Shipped',
      statusColor: '#7C3AED', // purple
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      shipmentDate: '2025-09-23',
      shipmentType: 'AWD',
      amznShipment: 'STAR-VTFU4AYC',
      amznRefId: '43WA0H1U',
    },
    {
      id: 2,
      status: 'Ready for Pickup',
      statusColor: '#10B981', // green
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      shipmentDate: '2025-09-23',
      shipmentType: 'AWD',
      amznShipment: 'STAR-VTFU4AYC',
      amznRefId: '43WA0H1U',
    },
    {
      id: 3,
      status: 'Packaging',
      statusColor: '#F59E0B', // amber
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      shipmentDate: '2025-09-23',
      shipmentType: 'AWD',
      amznShipment: 'STAR-VTFU4AYC',
      amznRefId: '43WA0H1U',
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
            className="bg-[#111827] text-white rounded-full text-sm font-medium hover:bg-black transition-colors"
            style={{ padding: '0.55rem 1.25rem', whiteSpace: 'nowrap' }}
            onClick={() => setShowNewShipmentModal(true)}
          >
            + New Shipment
          </button>
        </div>
      {/* New Shipment Modal */}
      {showNewShipmentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            className={`${themeClasses.cardBg} ${themeClasses.border}`}
            style={{
              width: 'min(900px, 92vw)',
              borderRadius: '0.75rem',
              boxShadow:
                '0 20px 40px rgba(15,23,42,0.35), 0 0 0 1px rgba(15,23,42,0.08)',
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderBottom: `1px solid ${isDarkMode ? '#111827' : '#E5E7EB'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2
                className={themeClasses.text}
                style={{ fontSize: '1rem', fontWeight: 600 }}
              >
                New Shipment
              </h2>
              <button
                type="button"
                onClick={() => setShowNewShipmentModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <svg
                  style={{ width: '1.1rem', height: '1.1rem' }}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 6L18 18M18 6L6 18"
                    stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              {/* Top form row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '1rem',
                }}
              >
                {/* Shipment # */}
                <div>
                  <label
                    className={themeClasses.textSecondary}
                    style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}
                  >
                    Shipment # <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={newShipment.shipmentNumber}
                    onChange={(e) =>
                      setNewShipment((prev) => ({
                        ...prev,
                        shipmentNumber: e.target.value,
                      }))
                    }
                    placeholder="Enter shipment # here..."
                    className={`${themeClasses.inputBg} ${themeClasses.text} ${themeClasses.border} border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500`}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                    }}
                  />
                </div>

                {/* Shipment Type */}
                <div>
                  <label
                    className={themeClasses.textSecondary}
                    style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}
                  >
                    Shipment Type <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div
                    className={`${themeClasses.inputBg} ${themeClasses.border} border rounded-lg`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.2rem 0.5rem 0.2rem 0.75rem',
                    }}
                  >
                    <select
                      value={newShipment.shipmentType}
                      onChange={(e) =>
                        setNewShipment((prev) => ({
                          ...prev,
                          shipmentType: e.target.value,
                        }))
                      }
                      className={`${themeClasses.inputBg} ${themeClasses.text} text-sm focus:outline-none flex-1`}
                      style={{
                        border: 'none',
                        padding: '0.35rem 0',
                        background: 'transparent',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                      }}
                    >
                      <option value="">Select Shipment Type</option>
                      <option value="AWD">AWD</option>
                      <option value="Direct">Direct</option>
                    </select>
                    <svg
                      style={{ width: '1rem', height: '1rem', marginLeft: '0.25rem' }}
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19 9L12 16L5 9"
                        stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Account */}
                <div>
                  <label
                    className={themeClasses.textSecondary}
                    style={{ fontSize: '0.75rem', fontWeight: 500, display: 'block', marginBottom: '0.25rem' }}
                  >
                    Account <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <div
                    className={`${themeClasses.inputBg} ${themeClasses.border} border rounded-lg`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.2rem 0.5rem 0.2rem 0.75rem',
                    }}
                  >
                    <select
                      value={newShipment.account}
                      onChange={(e) =>
                        setNewShipment((prev) => ({
                          ...prev,
                          account: e.target.value,
                        }))
                      }
                      className={`${themeClasses.inputBg} ${themeClasses.text} text-sm focus:outline-none flex-1`}
                      style={{
                        border: 'none',
                        padding: '0.35rem 0',
                        background: 'transparent',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                      }}
                    >
                      <option value="">Select Account</option>
                      <option value="tps-nutrients">TPS Nutrients</option>
                      <option value="green-earth">Green Earth Co</option>
                    </select>
                    <svg
                      style={{ width: '1rem', height: '1rem', marginLeft: '0.25rem' }}
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M19 9L12 16L5 9"
                        stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Supplier selector */}
              <div>
                <p
                  className={themeClasses.textSecondary}
                  style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.75rem' }}
                >
                  Supplier (Select one) <span style={{ color: '#EF4444' }}>*</span>
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  {[
                    {
                      id: 'amazon',
                      label: 'Amazon',
                      logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
                    },
                    {
                      id: 'walmart',
                      label: 'Walmart',
                      logo: '/assets/Walmart_logo_(2008).svg 1.png',
                    },
                  ].map((supplier) => {
                    const isSelected = newShipment.supplier === supplier.id;
                    return (
                      <button
                        key={supplier.id}
                        type="button"
                        onClick={() =>
                          setNewShipment((prev) => ({ ...prev, supplier: supplier.id }))
                        }
                        style={{
                          flex: '0 0 220px',
                          maxWidth: '220px',
                          minHeight: '170px',
                          borderRadius: '0.75rem',
                          border: `1px solid ${
                            isSelected
                              ? '#3B82F6'
                              : isDarkMode
                              ? '#1F2937'
                              : '#E5E7EB'
                          }`,
                          backgroundColor: isSelected
                            ? (isDarkMode ? 'rgba(37, 99, 235, 0.12)' : '#EFF6FF')
                            : (isDarkMode ? '#020617' : '#FFFFFF'),
                          boxShadow: isSelected
                            ? '0 0 0 1px rgba(59,130,246,0.4)'
                            : '0 1px 2px rgba(15,23,42,0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '1.5rem 1.25rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '120px',
                            height: '60px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '0.75rem',
                          }}
                        >
                          <img
                            src={supplier.logo}
                            alt={supplier.label}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                          />
                        </div>
                        <span
                          className={themeClasses.textSecondary}
                          style={{ fontSize: '0.8rem' }}
                        >
                          {supplier.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div
              style={{
                padding: '0.9rem 1.5rem',
                borderTop: `1px solid ${isDarkMode ? '#111827' : '#E5E7EB'}`,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => setShowNewShipmentModal(false)}
                className={themeClasses.textSecondary}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                  backgroundColor: isDarkMode ? '#020617' : '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !newShipment.shipmentNumber ||
                  !newShipment.shipmentType ||
                  !newShipment.account
                }
                style={{
                  padding: '0.5rem 1.1rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  backgroundColor:
                    !newShipment.shipmentNumber ||
                    !newShipment.shipmentType ||
                    !newShipment.account
                      ? '#D1D5DB'
                      : '#111827',
                  color:
                    !newShipment.shipmentNumber ||
                    !newShipment.shipmentType ||
                    !newShipment.account
                      ? '#9CA3AF'
                      : '#FFFFFF',
                  cursor:
                    !newShipment.shipmentNumber ||
                    !newShipment.shipmentType ||
                    !newShipment.account
                      ? 'not-allowed'
                      : 'pointer',
                }}
                onClick={() => {
                  if (
                    !newShipment.shipmentNumber ||
                    !newShipment.shipmentType ||
                    !newShipment.account
                  ) {
                    return;
                  }
                  setShowNewShipmentModal(false);
                  navigate('/dashboard/production/shipment/new');
                }}
              >
                Create New Shipment
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Content */}
      <div style={{ padding: '1rem 2rem 2rem 2rem' }}>
        {/* Products (Planning) tab */}
        {activeTab === 'products' && (
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
        )}

        {/* Shipments tab */}
        {activeTab === 'shipments' && (
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
                  {[
                    { key: 'status', label: 'Status', width: 160, align: 'left' },
                    { key: 'marketplace', label: 'Marketplace', width: 140, align: 'left' },
                    { key: 'account', label: 'Account', width: 180, align: 'left' },
                    { key: 'shipmentDate', label: 'Shipment #', width: 160, align: 'left' },
                    { key: 'shipmentType', label: 'Shipment Type', width: 160, align: 'left' },
                    { key: 'amznShipment', label: 'Amzn Shipment #', width: 200, align: 'left' },
                    { key: 'amznRefId', label: 'Amzn Ref ID', width: 160, align: 'left' },
                    { key: 'action', label: 'Action', width: 100, align: 'center' },
                  ].map((col, index) => (
                    <th
                      key={col.key}
                      className={`${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } text-xs font-bold text-white uppercase tracking-wider group cursor-pointer`}
                      onClick={() => toggleFilter(col.key)}
                      style={{
                        padding: '0.75rem 1rem',
                        width: `${col.width}px`,
                        borderRight:
                          index < 7 ? `1px solid ${columnBorderColor}` : undefined,
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
        )}

        {/* Archive tab */}
        {activeTab === 'archive' && (
          <div
            className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl shadow-sm`}
            style={{ padding: '2rem', minHeight: '200px' }}
          >
            <p className={themeClasses.textSecondary} style={{ fontSize: '0.875rem' }}>
              Archived shipments will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Planning;
