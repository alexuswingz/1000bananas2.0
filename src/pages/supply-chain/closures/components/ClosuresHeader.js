import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';

const ClosuresHeader = ({ activeTab, onTabChange, search, onSearchChange, onNewOrderClick, onCreateBottleClick }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);

  // Handle click outside to close settings menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isSettingsMenuOpen && !event.target.closest('.settings-menu-container')) {
        setIsSettingsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsMenuOpen]);

  const themeClasses = {
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
  };

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
        <h1 className="text-xl font-semibold text-gray-900">Closures</h1>
        
        {/* Tabs as pill group - matching bottles header */}
        <div className="flex items-center rounded-full border border-gray-200 bg-white/70 dark:bg-dark-bg-tertiary ml-4">
          {['inventory', 'ordering', 'archive'].map((tab, index) => {
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
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white font-semibold shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 font-medium'
                } ${index === 0 ? 'ml-1' : ''} ${index === 2 ? 'mr-1' : ''}`}
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

        {/* Settings button + menu */}
        {activeTab === 'inventory' && (
          <div className="relative settings-menu-container">
            <button
              type="button"
              className={`${themeClasses.inputBg} ${themeClasses.border} border rounded-full p-2 flex items-center justify-center hover:shadow-sm transition`}
              aria-label="Settings"
              onClick={() => setIsSettingsMenuOpen((prev) => !prev)}
            >
              <svg
                className={`${themeClasses.textSecondary} w-4 h-4`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.757.426 1.757 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.757-2.924 1.757-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.757-.426-1.757-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {isSettingsMenuOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-md shadow-lg text-xs z-30">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700"
                  onClick={() => {
                    setIsSettingsMenuOpen(false);
                    if (onCreateBottleClick) onCreateBottleClick();
                  }}
                >
                  <span className="text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </span>
                  Create new closure
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate('/dashboard/supply-chain/closures/cycle-counts')}
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg px-5 py-2 shadow-md transition"
        >
          Cycle Counts
        </button>
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

