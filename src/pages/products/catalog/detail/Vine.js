import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const Vine = ({ data }) => {
  const { isDarkMode } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  const vineData = [
    {
      status: 'Completed',
      childAsin: 'B0FKM2VCG3 (Gallon)',
      launchDate: '08/10/2025',
      unitsEnrolled: 29,
      vineReviews: 11,
      starRating: 4.7,
    },
    {
      status: 'Completed',
      childAsin: 'B0FKM2VCG3 (Gallon)',
      launchDate: '08/04/2025',
      unitsEnrolled: 20,
      vineReviews: 7,
      starRating: 4.6,
    },
  ];

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:opacity-80 transition-opacity"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Vine</h2>
          <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-xs font-medium flex items-center gap-1">
            <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Completed
          </span>
          <button className="ml-auto mr-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            + New Variation
          </button>
        </div>
        <svg
          className={`${themeClasses.text} transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          style={{ width: '1.25rem', height: '1.25rem' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className={`border-t ${themeClasses.border}`} style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '800px' }}>
            {/* Header */}
            <thead className={themeClasses.headerBg}>
              <tr>
                <th className="text-left text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0.75rem 1rem' }}>STATUS</th>
                <th className="text-left text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0.75rem 1rem' }}>CHILD ASIN</th>
                <th className="text-left text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0.75rem 1rem' }}>LAUNCH DATE</th>
                <th className="text-left text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0.75rem 1rem' }}>UNITS ENROLLED</th>
                <th className="text-left text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0.75rem 1rem' }}>VINE REVIEWS</th>
                <th className="text-left text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0.75rem 1rem' }}>STAR RATING</th>
                <th className="text-left text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0.75rem 1rem' }}>NOTES</th>
                <th className="text-left text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0.75rem 1rem' }}>ACTIONS</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y" style={{ borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6' }}>
              {vineData.map((row, index) => (
                <tr key={index} className={`${themeClasses.rowHover} transition-colors duration-150`}>
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <svg style={{ width: '1rem', height: '1rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <span className={`text-sm ${themeClasses.text}`}>{row.childAsin}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <span className={`text-sm ${themeClasses.text}`}>{row.launchDate}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <span className={`text-sm ${themeClasses.text}`}>{row.unitsEnrolled}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <span className={`text-sm ${themeClasses.text}`}>{row.vineReviews}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <span className={`text-sm ${themeClasses.text}`}>{row.starRating}</span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <button className="text-blue-500 hover:text-blue-600">
                      <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                    <button className={`${themeClasses.text} hover:opacity-70`}>
                      <svg style={{ width: '1.25rem', height: '1.25rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Vine;

