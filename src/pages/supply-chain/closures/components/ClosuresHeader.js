import React from 'react';
import { useNavigate } from 'react-router-dom';

const ClosuresHeader = ({ activeTab, onTabChange, search, onSearchChange, onNewOrderClick }) => {
  const navigate = useNavigate();

  return (
    <div className="mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-gray-600 hover:text-gray-900"
          aria-label="Home"
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
        <h1 className="text-2xl font-bold text-gray-900">Closures</h1>
        
        {/* Tabs */}
        <div className="flex items-center gap-2 ml-4">
          {['inventory', 'ordering', 'archive'].map((tab) => {
            const labelMap = {
              inventory: 'Inventory',
              ordering: 'Ordering',
              archive: 'Archive',
            };
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                className={`px-4 py-2 text-sm font-medium rounded ${
                  isActive
                    ? 'bg-gray-200 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {labelMap[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search bar and New Order button */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Find an order..."
            className="w-64 rounded-full border border-gray-300 px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
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
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
            <svg
              className="w-3 h-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
            <svg
              className="w-3 h-3 text-gray-400 -mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        <button
          type="button"
          onClick={onNewOrderClick}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
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

export default ClosuresHeader;

