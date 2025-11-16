import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const StatusBadge = ({ status }) => {
  const { isDarkMode } = useTheme();

  const statusConfig = {
    launched: {
      icon: '✓',
      text: 'Launched',
      bgColor: isDarkMode ? 'bg-green-500/10' : 'bg-green-50',
      textColor: isDarkMode ? 'text-green-400' : 'text-green-700',
      iconColor: isDarkMode ? 'text-green-400' : 'text-green-600',
      borderColor: isDarkMode ? 'border-green-500/20' : 'border-green-200',
    },
    inProgress: {
      icon: '⏳',
      text: 'In Progress',
      bgColor: isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50',
      textColor: isDarkMode ? 'text-blue-400' : 'text-blue-700',
      iconColor: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      borderColor: isDarkMode ? 'border-blue-500/20' : 'border-blue-200',
    },
    contender: {
      icon: '⭐',
      text: 'Contender',
      bgColor: isDarkMode ? 'bg-yellow-500/10' : 'bg-yellow-50',
      textColor: isDarkMode ? 'text-yellow-400' : 'text-yellow-700',
      iconColor: isDarkMode ? 'text-yellow-400' : 'text-yellow-600',
      borderColor: isDarkMode ? 'border-yellow-500/20' : 'border-yellow-200',
    },
    revisit: {
      icon: '🔄',
      text: 'Revisit',
      bgColor: isDarkMode ? 'bg-purple-500/10' : 'bg-purple-50',
      textColor: isDarkMode ? 'text-purple-400' : 'text-purple-700',
      iconColor: isDarkMode ? 'text-purple-400' : 'text-purple-600',
      borderColor: isDarkMode ? 'border-purple-500/20' : 'border-purple-200',
    },
    rejected: {
      icon: '✕',
      text: 'Rejected',
      bgColor: isDarkMode ? 'bg-red-500/10' : 'bg-red-50',
      textColor: isDarkMode ? 'text-red-400' : 'text-red-700',
      iconColor: isDarkMode ? 'text-red-400' : 'text-red-600',
      borderColor: isDarkMode ? 'border-red-500/20' : 'border-red-200',
    },
  };

  const config = statusConfig[status] || statusConfig.contender;

  return (
    <div 
      className={`inline-flex items-center rounded-md ${config.bgColor} border ${config.borderColor}`}
      style={{ gap: '0.375rem', padding: '0.25rem 0.5rem' }}
    >
      <span style={{ fontSize: '0.75rem', fontWeight: '500' }} className={config.iconColor}>{config.icon}</span>
      <span style={{ fontSize: '0.75rem', fontWeight: '500' }} className={config.textColor}>{config.text}</span>
    </div>
  );
};

export default StatusBadge;

