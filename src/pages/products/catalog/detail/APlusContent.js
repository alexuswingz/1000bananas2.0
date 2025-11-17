import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const APlusContent = ({ data }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  // A+ modules from API
  const modules = [
    { label: 'Module 1', url: data?.aplus_module_1, key: 'module1' },
    { label: 'Module 2', url: data?.aplus_module_2, key: 'module2' },
    { label: 'Module 3', url: data?.aplus_module_3, key: 'module3' },
    { label: 'Module 4', url: data?.aplus_module_4, key: 'module4' }
  ].filter(module => module.url);

  const completedCount = modules.length;
  const hasContent = completedCount > 0;

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
      <div className={`px-6 py-4 border-b ${themeClasses.border}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>A+ Content</h2>
          {hasContent ? (
            <>
              <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-xs font-medium flex items-center gap-1">
                <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Completed
              </span>
              <span className={`text-sm ${themeClasses.textSecondary}`}>{completedCount} Module{completedCount !== 1 ? 's' : ''}</span>
            </>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-600 text-xs font-medium">
              No Content
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pb-6" style={{ paddingTop: '1.5rem' }}>
        {hasContent ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
            {modules.map((module) => (
              <div key={module.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{
                  aspectRatio: '16/9',
                  border: `2px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <img 
                    src={module.url} 
                    alt={module.label}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      padding: '8px'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'none', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <svg style={{ width: '3rem', height: '3rem' }} className={themeClasses.textSecondary} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className={`text-xs ${themeClasses.textSecondary}`}>Module unavailable</span>
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="white" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span className={`text-sm font-medium ${themeClasses.text}`}>{module.label}</span>
                  <span className={`text-xs ${themeClasses.textSecondary}`}>A+ Content Module</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <a 
                    href={module.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 text-center text-xs px-3 py-1.5 border border-blue-500 text-blue-500 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    View
                  </a>
                  <button className={`flex-1 text-xs px-3 py-1.5 border ${themeClasses.border} ${themeClasses.text} rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}>
                    Replace
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`${themeClasses.inputBg} rounded-lg p-8 text-center`}>
            <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem' }} className={themeClasses.textSecondary} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <p className={`text-sm ${themeClasses.text} font-medium mb-2`}>No A+ Content Yet</p>
            <p className={`text-xs ${themeClasses.textSecondary}`}>Upload A+ content modules to enhance your product listing</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default APlusContent;

