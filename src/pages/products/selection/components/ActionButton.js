import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ActionButton = ({ type, onClick }) => {
  const { isDarkMode } = useTheme();

  const buttonConfig = {
    completed: {
      text: 'Completed',
      bgColor: 'transparent',
      textColor: isDarkMode ? 'text-green-400' : 'text-green-600',
      hoverColor: isDarkMode ? 'hover:bg-green-500/10' : 'hover:bg-green-50',
      borderColor: isDarkMode ? 'border-green-500/20' : 'border-green-200',
      showArrow: true,
    },
    launch: {
      text: 'Launch',
      bgColor: isDarkMode ? 'bg-blue-600' : 'bg-blue-500',
      textColor: 'text-white',
      hoverColor: isDarkMode ? 'hover:bg-blue-700' : 'hover:bg-blue-600',
      borderColor: 'border-transparent',
      showArrow: false,
    },
    inProgress: {
      text: 'In Progress',
      bgColor: 'transparent',
      textColor: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      hoverColor: isDarkMode ? 'hover:bg-blue-500/10' : 'hover:bg-blue-50',
      borderColor: isDarkMode ? 'border-blue-500/20' : 'border-blue-200',
      showArrow: true,
    },
  };

  const config = buttonConfig[type] || buttonConfig.launch;

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md transition-all duration-200 border ${config.bgColor} ${config.textColor} ${config.hoverColor} ${config.borderColor} shadow-sm hover:shadow`}
      style={{ 
        gap: '0.375rem',
        padding: '0.25rem 0.75rem',
        fontSize: '0.75rem',
        fontWeight: '500'
      }}
    >
      {config.text}
      {config.showArrow && (
        <svg style={{ width: '0.75rem', height: '0.75rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
};

export default ActionButton;

