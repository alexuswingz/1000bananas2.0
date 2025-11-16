import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const StatusIndicator = ({ status, size = 'md' }) => {
  const { isDarkMode } = useTheme();

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const statusConfig = {
    completed: {
      bgColor: 'bg-green-500',
      borderColor: 'border-green-500',
      label: 'Completed',
    },
    inProgress: {
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-500',
      label: 'In Progress',
    },
    pending: {
      bgColor: isDarkMode ? 'bg-transparent' : 'bg-white',
      borderColor: isDarkMode ? 'border-gray-500' : 'border-gray-300',
      label: 'Pending',
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div
      className={`${sizeClasses[size]} ${config.bgColor} ${config.borderColor} rounded-full`}
      style={{ border: '2px solid' }}
      title={config.label}
    />
  );
};

export default StatusIndicator;

