import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const Vine = ({ data }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  const vineEnrolled = data?.vine_enrolled || false;
  const vineNotes = data?.vine_notes || '';
  const vineDate = data?.vine_date || '';
  const hasVineData = vineEnrolled || vineNotes;

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
      <div className="px-6 py-4 flex items-center justify-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Vine</h2>
          {vineEnrolled ? (
            <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-xs font-medium flex items-center gap-1">
              <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Enrolled
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-600 text-xs font-medium">
              Not Enrolled
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pb-6">
        {hasVineData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Vine Status */}
            <div>
              <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>Enrollment Status</h3>
              <div className={`${themeClasses.inputBg} rounded-lg p-4`}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Product</label>
                    <div className={`text-sm font-medium ${themeClasses.text}`}>{data?.product || 'N/A'}</div>
                  </div>
                  <div>
                    <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Child ASIN</label>
                    <div className={`text-sm font-medium ${themeClasses.text}`}>{data?.child_asin || 'N/A'}</div>
                  </div>
                  {vineDate && (
                    <div>
                      <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Enrollment Date</label>
                      <div className={`text-sm font-medium ${themeClasses.text}`}>{vineDate}</div>
                    </div>
                  )}
                  <div>
                    <label className={`text-xs ${themeClasses.textSecondary} block mb-1`}>Units Sold (30 days)</label>
                    <div className={`text-sm font-medium ${themeClasses.text}`}>{data?.units_sold_30_days || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vine Notes */}
            {vineNotes && (
              <div>
                <h3 className={`text-sm font-semibold ${themeClasses.text} mb-3`}>Vine Notes</h3>
                <div className={`${themeClasses.inputBg} rounded-lg p-4`}>
                  <p className={`text-sm ${themeClasses.text} whitespace-pre-wrap`}>{vineNotes}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`${themeClasses.inputBg} rounded-lg p-8 text-center`}>
            <svg style={{ width: '4rem', height: '4rem', margin: '0 auto 1rem', color: '#9CA3AF' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <p className={`text-sm ${themeClasses.text} font-medium mb-2`}>No Vine Data Available</p>
            <p className={`text-xs ${themeClasses.textSecondary}`}>This product is not currently enrolled in the Amazon Vine program</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vine;


