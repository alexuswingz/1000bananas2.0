import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';

const MobileHeader = ({ onMenuClick, onNotificationsClick }) => {
  const { isDarkMode } = useTheme();
  const { company } = useCompany();
  const navigate = useNavigate();

  const handleNotificationsClick = () => {
    if (onNotificationsClick) {
      onNotificationsClick();
    } else {
      navigate('/dashboard/notifications');
    }
  };

  return (
    <div className={`md:hidden fixed top-0 left-0 right-0 z-50 ${isDarkMode ? 'bg-dark-bg-primary' : 'bg-white'}`}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Hamburger Menu Icon */}
        <button
          onClick={onMenuClick}
          className="p-2"
          aria-label="Toggle menu"
          style={{ marginLeft: '-8px' }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        {/* 1000 Bananas Text */}
        <div className="flex-1 flex justify-center">
          <h1 className="text-xl font-bold" style={{ color: '#9333EA', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            1000 Bananas
          </h1>
        </div>

        {/* Bell Icon */}
        <button
          onClick={handleNotificationsClick}
          className="p-2"
          aria-label="Notifications"
          style={{ marginRight: '-8px' }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </button>
      </div>

      {/* Gray Line Below */}
      <div className={`h-px ${isDarkMode ? 'bg-dark-border-primary' : 'bg-gray-200'}`}></div>
    </div>
  );
};

export default MobileHeader;

