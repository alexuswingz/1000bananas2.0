import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const BottlesHeader = ({
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  onNewOrderClick,
  isSettingsMenuOpen,
  onSettingsMenuToggle,
  onBulkEditClick,
  onCreateBottleClick,
  themeClasses,
}) => {
  const { isDarkMode } = useTheme();

  return (
    <div
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{
        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
      }}
    >
      {/* Left: Icon, title and tabs */}
      <div className="flex items-center space-x-4">
        {/* Home icon in dark pill */}
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1f2937] text-white shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <h1 className={`text-xl font-semibold ${themeClasses.textPrimary}`}>Bottles</h1>

          {/* Tabs as pill group */}
          <div className={`flex items-center rounded-full border ${themeClasses.border} bg-white/70 dark:bg-dark-bg-tertiary`}>
            {['inventory', 'orders', 'archive'].map((tabKey, index) => {
              const label = tabKey === 'inventory' ? 'Inventory' : tabKey === 'orders' ? 'Orders' : 'Archive';
              const isActive = activeTab === tabKey;

              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => onTabChange(tabKey)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white font-semibold shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 font-medium'
                  } ${index === 0 ? 'ml-1' : ''} ${index === 2 ? 'mr-1' : ''}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Search + Settings + New Order */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative w-80">
          <input
            type="text"
            placeholder="Find an order..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`${themeClasses.inputBg} ${themeClasses.textPrimary} ${themeClasses.border} border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all pl-9 pr-9 py-1.5 w-full shadow-sm`}
          />
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${themeClasses.textSecondary}`}
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
            className={`absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 ${themeClasses.textSecondary}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Settings button + menu */}
        <div className="relative">
          <button
            type="button"
            className={`${themeClasses.inputBg} ${themeClasses.border} border rounded-full p-2 flex items-center justify-center hover:shadow-sm transition`}
            aria-label="Settings"
            onClick={onSettingsMenuToggle}
          >
            <svg className={`${themeClasses.textSecondary} w-4 h-4`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                onClick={onBulkEditClick}
              >
                <span className="text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z"
                    />
                  </svg>
                </span>
                Bulk edit
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-gray-700"
                onClick={onCreateBottleClick}
              >
                <span className="text-gray-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                Create new bottle
              </button>
            </div>
          )}
        </div>

        {/* New Order button */}
        <button
          type="button"
          className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg px-5 py-2 shadow-md transition"
          onClick={onNewOrderClick}
        >
          <span className="flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </span>
          New Order
        </button>
      </div>
    </div>
  );
};

export default BottlesHeader;

