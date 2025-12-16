import React from 'react';
import { useNavigate } from 'react-router-dom';

const LabelsHeader = ({ activeTab, onTabChange, search, onSearchChange, onNewOrderClick }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between" style={{ paddingBottom: '16px' }}>
      <div className="flex items-center space-x-4">
        {/* Home icon in dark pill */}
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1f2937] text-white shadow-sm">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10.5L12 4l9 6.5M5 10.5V20h5v-4h4v4h5v-9.5"
            />
          </svg>
        </div>
        
        {/* Title + tabs group */}
        <div className="flex items-center space-x-5">
          <h1 className="text-xl font-semibold text-gray-900">Labels</h1>
          
          {/* Tabs */}
          <div className="flex items-center rounded-full border border-gray-200 bg-white/70 dark:bg-dark-bg-tertiary p-1">
            {['inventory', 'orders', 'archive'].map((tab) => {
              const labelMap = {
                inventory: 'Inventory',
                orders: 'Orders',
                archive: 'Archive',
              };
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onTabChange(tab)}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white rounded-full shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  style={{ minWidth: 'fit-content' }}
                >
                  {labelMap[tab]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Search + Buttons */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Find an order..."
            className="w-full rounded-full border border-gray-300 px-9 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-sm"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {/* Dropdown caret */}
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        <button
          type="button"
          onClick={onNewOrderClick}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg px-5 py-2 shadow-md transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Order
        </button>
      </div>
    </div>
  );
};

export default LabelsHeader;

