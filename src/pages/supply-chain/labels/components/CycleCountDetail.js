import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';

const CycleCountDetail = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  
  // Get count data from location state or use default
  const countData = location.state?.countData || {
    id: 1,
    countId: 'CC-DC-1',
    type: 'Daily Count',
    initiatedBy: 'Christian R.',
    date: '2025-11-20',
    status: 'In Progress',
  };

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  // Sample inventory items for counting
  const [countItems, setCountItems] = useState([
    {
      id: 1,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
    {
      id: 2,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
    {
      id: 3,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
    {
      id: 4,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
    {
      id: 5,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
    {
      id: 6,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
    {
      id: 7,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
    {
      id: 8,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
    {
      id: 9,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
    {
      id: 10,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
    {
      id: 11,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
    {
      id: 12,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
    {
      id: 13,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
    {
      id: 14,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      currentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '10000',
    },
  ]);

  const handleStartCount = (itemId) => {
    // TODO: Implement count functionality
    console.log('Start count for item:', itemId);
  };

  const handleCountChange = (itemId, value) => {
    setCountItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, totalCount: value } : item
      )
    );
  };

  const handleCompleteCount = () => {
    // Show confirmation modal
    setShowCompleteModal(true);
  };

  const handleConfirmComplete = () => {
    // TODO: Implement complete count functionality
    console.log('Complete count confirmed');
    // Update cycle count status to completed
    // Navigate back to cycle counts page
    navigate('/dashboard/supply-chain/labels/cycle-counts');
  };

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`}>
      <div className="p-6">
        {/* Header Bar */}
        <div className={`${themeClasses.cardBg} rounded-lg border ${themeClasses.border} shadow-sm mb-6 p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-lg shadow-sm">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L12 6M12 18L12 22M2 12L6 12M18 12L22 12M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" strokeLinecap="round" />
                </svg>
                <span className="text-sm font-medium text-gray-900">In Progress</span>
              </div>

              {/* COUNT ID */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">COUNT ID</span>
                <span className="text-sm font-medium text-gray-900">{countData.countId}</span>
              </div>

              {/* COUNT TYPE */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">COUNT TYPE</span>
                <span className="text-sm font-medium text-gray-900">{countData.type}</span>
              </div>

              {/* DATE CREATED */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">DATE CREATED</span>
                <span className="text-sm font-medium text-gray-900">{countData.date}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-lg overflow-hidden`}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead className={themeClasses.headerBg}>
              <tr>
                <th className="text-xs font-bold text-white uppercase tracking-wider border-r border-white" style={{ padding: '0 1rem', textAlign: 'left', height: '40px', width: '100px' }}>
                </th>
                <th className="text-xs font-bold text-white uppercase tracking-wider border-r border-white" style={{ padding: '0 1rem', textAlign: 'left', height: '40px' }}>
                  BRAND
                </th>
                <th className="text-xs font-bold text-white uppercase tracking-wider border-r border-white" style={{ padding: '0 1rem', textAlign: 'left', height: '40px' }}>
                  PRODUCT
                </th>
                <th className="text-xs font-bold text-white uppercase tracking-wider border-r border-white" style={{ padding: '0 1rem', textAlign: 'left', height: '40px' }}>
                  SIZE
                </th>
                <th className="text-xs font-bold text-white uppercase tracking-wider border-r border-white" style={{ padding: '0 1rem', textAlign: 'left', height: '40px' }}>
                  LBL CURRENT INV
                </th>
                <th className="text-xs font-bold text-white uppercase tracking-wider border-r border-white" style={{ padding: '0 1rem', textAlign: 'left', height: '40px' }}>
                  LABEL LOCATION
                </th>
                <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', textAlign: 'left', height: '40px' }}>
                  TOTAL COUNT
                </th>
              </tr>
            </thead>
            <tbody>
              {countItems.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {/* Start Button */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                    <button
                      type="button"
                      onClick={() => handleStartCount(item.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 px-4 rounded text-sm transition"
                    >
                      Start
                    </button>
                  </td>

                  {/* BRAND */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                    <span className={themeClasses.textPrimary} style={{ fontSize: '14px' }}>
                      {item.brand}
                    </span>
                  </td>

                  {/* PRODUCT */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                    <span className={themeClasses.textPrimary} style={{ fontSize: '14px' }}>
                      {item.product}
                    </span>
                  </td>

                  {/* SIZE */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                    <span className={themeClasses.textPrimary} style={{ fontSize: '14px' }}>
                      {item.size}
                    </span>
                  </td>

                  {/* LBL CURRENT INV */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                    <span className={themeClasses.textPrimary} style={{ fontSize: '14px' }}>
                      {item.currentInv.toLocaleString()}
                    </span>
                  </td>

                  {/* LABEL LOCATION */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                    <span className={themeClasses.textPrimary} style={{ fontSize: '14px' }}>
                      {item.labelLocation}
                    </span>
                  </td>

                  {/* TOTAL COUNT */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                    <span className={themeClasses.textPrimary} style={{ fontSize: '14px' }}>
                      {item.totalCount ? parseInt(item.totalCount).toLocaleString() : ''}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Complete Count Button */}
        <div className="flex justify-end mt-6">
          <button
            type="button"
            onClick={handleCompleteCount}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg text-sm transition"
          >
            Complete Count
          </button>
        </div>

        {/* Complete Cycle Count Confirmation Modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} onClick={() => setShowCompleteModal(false)}>
            <div 
              className="bg-white rounded-lg"
              style={{ 
                width: '400px', 
                padding: '24px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Title */}
              <h2 
                className="text-lg font-semibold text-gray-900 mb-3"
                style={{ 
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textAlign: 'left',
                  marginBottom: '12px'
                }}
              >
                Complete Cycle Count?
              </h2>
              
              {/* Modal Text */}
              <p 
                className="text-sm text-gray-700 mb-6"
                style={{ 
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  lineHeight: '1.5',
                  textAlign: 'left',
                  marginBottom: '24px',
                  color: '#374151'
                }}
              >
                This will finalize the cycle count and lock in quantities.
              </p>
              
              {/* Modal Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition"
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    borderColor: '#D1D5DB',
                    borderRadius: '8px'
                  }}
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmComplete}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:bg-blue-700 transition"
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    backgroundColor: '#2563EB',
                    borderRadius: '8px'
                  }}
                >
                  Complete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CycleCountDetail;

