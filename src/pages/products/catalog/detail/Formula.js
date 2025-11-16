import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const Formula = ({ data }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  return (
    <div className={`${themeClasses.bg} rounded-xl border ${themeClasses.border} shadow-sm`}>
      <div className="px-6 py-4 flex items-center justify-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2 className={`text-lg font-semibold ${themeClasses.text}`}>Formula</h2>
          <span className="px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-xs font-medium flex items-center gap-1">
            <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Completed
          </span>
          <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 text-xs font-medium flex items-center gap-1">
            <svg style={{ width: '0.875rem', height: '0.875rem' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            MSDS
          </span>
        </div>
      </div>

      <div className={`px-6 pb-6 border-t ${themeClasses.border}`} style={{ paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Formula Name */}
          <div>
            <label className={`text-sm font-medium ${themeClasses.text} block mb-2`}>Formula Name</label>
            <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
              F UltraGrow
            </div>
          </div>

          {/* Guaranteed Analysis */}
          <div>
            <label className={`text-sm font-medium ${themeClasses.text} block mb-2`}>Guaranteed Analysis</label>
            <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
              Total Nitrogen (N) 3.8%, Available Phosphate (P2O5) 3.0%, Soluble Potash (K2O) 4.3%, Calcium (Ca) 2.1%, Magnesium (Mg) 0.73%, Iron (Fe) 0.1%, Manganese (Mn) 0.03%, Zinc (Zn) 0.03%, Copper (Cu) 0.03%, Boron (B) 0.02%, Copper (Cu) 0.01%
            </div>
          </div>

          {/* NPK */}
          <div>
            <label className={`text-sm font-medium ${themeClasses.text} block mb-2`}>NPK</label>
            <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
              3.8 - 3 - 5.1
            </div>
          </div>

          {/* Derived From */}
          <div>
            <label className={`text-sm font-medium ${themeClasses.text} block mb-2`}>Derived From</label>
            <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
              ammonium molybdate, potassium phosphate, potassium nitrate, calcium nitrate, magnesium nitrate, boric acid, copper sulfate, ferric sulfate, manganese sulfate, zinc sulfate
            </div>
          </div>

          {/* Storage / Warranty / Precautionary / Metals */}
          <div>
            <label className={`text-sm font-medium ${themeClasses.text} block mb-2`}>Storage / Warranty / Precautionary / Metals</label>
            <div className={`${themeClasses.inputBg} rounded-lg p-3 text-sm ${themeClasses.text}`}>
              Storage: Store in a cool and dark place. (40°F - 80°F). Keep out of direct sunlight. Warranty: We guarantee at TPS products for 12 months from date of purchase. However, useful life is up to 2 years when properly stored. This product is suitable for all climates, not for human or animal consumption.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Formula;


