import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const APlusContent = ({ data }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
      <div className="px-6 py-4 border-b ${themeClasses.border}">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>A+</h2>
          <span className="px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-600 text-xs font-medium">
            Not Started
          </span>
          <span className={`text-sm ${themeClasses.textSecondary}`}>0 Assets Completed</span>
        </div>
      </div>

      <div className="px-6 pb-6" style={{ paddingTop: '1.5rem' }}>
        <div>
          <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>Slide #1</h3>
          <button className="flex items-center gap-2 text-blue-500 hover:text-blue-600 text-sm">
            <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Create new Asset
            <span className={themeClasses.textSecondary}>(Add or Drop)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default APlusContent;

