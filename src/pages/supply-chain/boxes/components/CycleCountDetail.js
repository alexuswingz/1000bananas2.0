import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { boxesApi } from '../../../../services/supplyChainApi';

const CycleCountDetail = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Get count data from location state or use default
  const countData = location.state?.countData || {
    id: 1,
    countId: 'CC-DC-1',
    type: 'Daily Count',
    initiatedBy: 'Current User',
    date: new Date().toISOString().split('T')[0],
    status: 'In Progress',
  };

  const countId = location.state?.countId || countData.id;

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

  // Inventory items for counting (loaded from API)
  const [countItems, setCountItems] = useState([]);

  // Fetch inventory items from API
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        const response = await boxesApi.getInventory();
        if (response.success) {
          // Transform API data to match our format
          const transformed = response.data.map(box => ({
            id: box.id,
            name: box.box_type || box.name,
            currentInv: box.warehouse_quantity || 0,
            totalCount: '', // User will fill this in
          }));
          setCountItems(transformed);
        }
      } catch (err) {
        console.error('Error fetching inventory:', err);
        alert('Failed to load inventory. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  const handleStartCount = (itemId) => {
    // Focus on the input field for that item
    const input = document.getElementById(`count-input-${itemId}`);
    if (input) input.focus();
  };

  const handleCountChange = (itemId, value) => {
    setCountItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, totalCount: value } : item
      )
    );
  };

  const handleCompleteCount = () => {
    // Validate that at least some items have been counted
    const countedItems = countItems.filter(item => item.totalCount && item.totalCount !== '');
    if (countedItems.length === 0) {
      alert('Please count at least one item before completing the cycle count.');
      return;
    }
    // Show confirmation modal
    setShowCompleteModal(true);
  };

  const handleConfirmComplete = async () => {
    try {
      // Get only items that have been counted
      const countedItems = countItems.filter(item => item.totalCount && item.totalCount !== '');
      
      console.log('Counted items:', countedItems);
      
      // Create cycle count lines
      const lines = countedItems.map(item => ({
        box_type: item.name,
        expected_quantity: item.currentInv,
        counted_quantity: parseInt(item.totalCount) || 0,
      }));
      
      console.log('Lines to send:', lines);

      // Update the cycle count with lines
      await boxesApi.updateCycleCount(countId, {
        status: 'draft',
        lines: lines,
      });

      // Complete the cycle count (this updates inventory)
      const response = await boxesApi.completeCycleCount(countId);
      
      if (response.success) {
        alert('Cycle count completed successfully! Inventory has been updated.');
        navigate('/dashboard/supply-chain/boxes/cycle-counts');
      } else {
        alert('Failed to complete cycle count: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error completing cycle count:', err);
      alert('Failed to complete cycle count. Please try again.');
    }
  };

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`}>
      <div className="p-6">
        {/* Back Button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard/supply-chain/boxes/cycle-counts')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Back to Cycle Counts</span>
          </button>
        </div>

        {/* Header Bar */}
        <div className={`${themeClasses.cardBg} rounded-lg border ${themeClasses.border} shadow-sm mb-6 p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Status Badge */}
              <div className={`inline-flex items-center gap-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} px-3 py-1.5 rounded-lg shadow-sm`}>
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L12 6M12 18L12 22M2 12L6 12M18 12L22 12M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" strokeLinecap="round" />
                </svg>
                <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>In Progress</span>
              </div>

              {/* COUNT ID */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${themeClasses.textSecondary} uppercase`}>COUNT ID</span>
                <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>{countData.countId}</span>
              </div>

              {/* COUNT TYPE */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${themeClasses.textSecondary} uppercase`}>COUNT TYPE</span>
                <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>{countData.type}</span>
              </div>

              {/* DATE CREATED */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${themeClasses.textSecondary} uppercase`}>DATE CREATED</span>
                <span className={`text-sm font-medium ${themeClasses.textPrimary}`}>{countData.date}</span>
                <svg className={`w-4 h-4 ${themeClasses.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <th className="text-xs font-bold text-white uppercase tracking-wider border-r border-white" style={{ padding: '0 1rem', textAlign: 'left', height: '40px', borderTopLeftRadius: '12px' }}>
                  BOX NAME
                </th>
                <th className="text-xs font-bold text-white uppercase tracking-wider border-r border-white" style={{ padding: '0 1rem', textAlign: 'center', height: '40px' }}>
                  CURRENT INV
                </th>
                <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', textAlign: 'left', height: '40px', borderTopRightRadius: '12px' }}>
                  TOTAL COUNT
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className={`px-6 py-6 text-center text-sm italic ${themeClasses.textSecondary}`}>
                    Loading inventory...
                  </td>
                </tr>
              ) : countItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className={`px-6 py-6 text-center text-sm italic ${themeClasses.textSecondary}`}>
                    No items to count.
                  </td>
                </tr>
              ) : (
              countItems.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={`${themeClasses.rowHover} transition-colors`}
                  style={{
                    borderBottom: index === countItems.length - 1 ? 'none' : (isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid #e5e7eb'),
                  }}
                >
                  {/* BOX NAME */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                    <span className={themeClasses.textPrimary} style={{ fontSize: '14px' }}>
                      {item.name}
                    </span>
                  </td>

                  {/* CURRENT INV */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                    <span className={themeClasses.textPrimary} style={{ fontSize: '14px' }}>
                      {item.currentInv.toLocaleString()}
                    </span>
                  </td>

                  {/* TOTAL COUNT */}
                  <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                    <input
                      id={`count-input-${item.id}`}
                      type="number"
                      value={item.totalCount}
                      onChange={(e) => handleCountChange(item.id, e.target.value)}
                      placeholder="Enter count"
                      className={`w-32 px-3 py-1.5 border ${themeClasses.border} rounded ${themeClasses.inputBg} ${themeClasses.textPrimary} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                      style={{ 
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                      }}
                      min="0"
                    />
                  </td>
                </tr>
              ))
              )}
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
              className={`${themeClasses.cardBg} rounded-lg`}
              style={{ 
                width: '400px', 
                padding: '24px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Title */}
              <h2 
                className={`text-lg font-semibold ${themeClasses.textPrimary} mb-3`}
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
                className={`text-sm ${themeClasses.textSecondary} mb-6`}
                style={{ 
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  lineHeight: '1.5',
                  textAlign: 'left',
                  marginBottom: '24px',
                }}
              >
                This will finalize the cycle count and lock in quantities.
              </p>
              
              {/* Modal Buttons */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className={`px-4 py-2 text-sm font-medium ${themeClasses.textPrimary} ${themeClasses.inputBg} border ${themeClasses.border} rounded-lg ${themeClasses.rowHover} transition`}
                  style={{ 
                    fontFamily: 'system-ui, -apple-system, sans-serif',
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

