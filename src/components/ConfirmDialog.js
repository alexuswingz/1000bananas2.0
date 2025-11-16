import React, { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'info' }) => {
  const { isDarkMode } = useTheme();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    overlay: isDarkMode ? 'bg-black/60' : 'bg-black/40',
  };

  const typeConfig = {
    info: {
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      confirmBg: 'bg-blue-600 hover:bg-blue-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    warning: {
      iconBg: 'bg-yellow-500/10',
      iconColor: 'text-yellow-500',
      confirmBg: 'bg-yellow-600 hover:bg-yellow-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    danger: {
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      confirmBg: 'bg-red-600 hover:bg-red-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    success: {
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
      confirmBg: 'bg-green-600 hover:bg-green-700',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const config = typeConfig[type] || typeConfig.info;

  return (
    <div
      className={`fixed inset-0 ${themeClasses.overlay} flex items-center justify-center transition-opacity duration-300`}
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      <div
        className={`${themeClasses.bg} rounded-2xl shadow-2xl transform transition-all duration-300 scale-100`}
        style={{
          maxWidth: '28rem',
          width: '90%',
          animation: 'slideIn 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon */}
        <div style={{ padding: '2rem 2rem 1rem 2rem', textAlign: 'center' }}>
          <div
            className={`${config.iconBg} ${config.iconColor} mx-auto rounded-full flex items-center justify-center`}
            style={{
              width: '4rem',
              height: '4rem',
              marginBottom: '1.5rem',
            }}
          >
            {config.icon}
          </div>
          <h3 className={`text-xl font-bold ${themeClasses.text} mb-2`}>
            {title}
          </h3>
          <p className={`text-sm ${themeClasses.textSecondary} leading-relaxed`}>
            {message}
          </p>
        </div>

        {/* Actions */}
        <div
          className={`border-t ${themeClasses.border}`}
          style={{
            padding: '1.5rem 2rem',
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              isDarkMode
                ? 'bg-dark-bg-tertiary text-dark-text-primary hover:bg-dark-bg-primary'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } shadow-sm hover:shadow`}
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm text-white transition-all duration-200 ${config.confirmBg} shadow-md hover:shadow-lg`}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default ConfirmDialog;

