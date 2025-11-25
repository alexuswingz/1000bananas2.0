import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import CycleCountsTable from './CycleCountsTable';

const CycleCounts = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [isCycleCountModalOpen, setIsCycleCountModalOpen] = useState(false);
  const cycleCountsTableRef = useRef(null);

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

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Home icon - simple outlined */}
            <button
              type="button"
              onClick={() => navigate('/dashboard/supply-chain/labels')}
              className="text-gray-600 hover:text-gray-900"
              aria-label="Back to Labels"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </button>
            
            <h1 className="text-xl font-semibold text-gray-900">Cycle Counts</h1>
          </div>

          {/* Right: New Cycle Count button */}
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg px-5 py-2 shadow-md transition"
            onClick={() => setIsCycleCountModalOpen(true)}
          >
            <span className="flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </span>
            New Cycle Count
          </button>
        </div>

        {/* Cycle Counts Table */}
        <CycleCountsTable 
          ref={cycleCountsTableRef}
          themeClasses={themeClasses}
        />

        {/* Cycle Count Modal */}
        {isCycleCountModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40" onClick={() => setIsCycleCountModalOpen(false)}>
            <div 
              className="bg-white shadow-2xl flex flex-col overflow-hidden" 
              style={{ 
                width: '900px', 
                maxHeight: '90vh',
                borderRadius: '12px',
                border: '1px solid #E5E7EB'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">New Cycle Count</h2>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600"
                  onClick={() => setIsCycleCountModalOpen(false)}
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal body - 3 cards */}
              <div className="px-6 py-6 flex gap-6 justify-center">
                {/* Daily Count Card */}
                <div className="flex flex-col items-center bg-white border border-gray-200 rounded-lg p-6" style={{ width: '240px' }}>
                  <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Daily Count</h3>
                  <p className="text-sm text-gray-500 text-center mb-4">A quick, daily task to count a random selection of items.</p>
                  <button
                    type="button"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition"
                    onClick={() => {
                      setIsCycleCountModalOpen(false);
                      if (cycleCountsTableRef.current && cycleCountsTableRef.current.createCount) {
                        cycleCountsTableRef.current.createCount('Daily Count');
                      }
                    }}
                  >
                    Create
                  </button>
                </div>

                {/* Shipment Count Card */}
                <div className="flex flex-col items-center bg-white border border-gray-200 rounded-lg p-6 relative" style={{ width: '240px' }}>
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Shipment Count</h3>
                  <p className="text-sm text-gray-500 text-center mb-4">A complete count of all items in an upcoming shipment.</p>
                  <button
                    type="button"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition"
                    onClick={() => {
                      setIsCycleCountModalOpen(false);
                      if (cycleCountsTableRef.current && cycleCountsTableRef.current.createCount) {
                        cycleCountsTableRef.current.createCount('Shipment Check');
                      }
                    }}
                  >
                    Create
                  </button>
                </div>

                {/* Full Count Card */}
                <div className="flex flex-col items-center bg-white border border-gray-200 rounded-lg p-6" style={{ width: '240px' }}>
                  <div className="w-16 h-16 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Full Count</h3>
                  <p className="text-sm text-gray-500 text-center mb-4">A comprehensive count of every item in your inventory.</p>
                  <button
                    type="button"
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition"
                    onClick={() => {
                      setIsCycleCountModalOpen(false);
                      if (cycleCountsTableRef.current && cycleCountsTableRef.current.createCount) {
                        cycleCountsTableRef.current.createCount('Full Count');
                      }
                    }}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CycleCounts;

