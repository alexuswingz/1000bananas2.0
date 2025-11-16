import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const TemplateSelector = ({ onClose, onSelect }) => {
  const { isDarkMode } = useTheme();
  const { productTemplates } = useCompany();
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    cardBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  const handleContinue = () => {
    if (!selectedTemplate) {
      toast.error('Please select a template');
      return;
    }
    onSelect(selectedTemplate);
    onClose();
  };

  const handleSkip = () => {
    onSelect(null);
    onClose();
  };

  const handleGoToSettings = () => {
    navigate('/dashboard/settings');
    onClose();
  };

  if (productTemplates.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
        <div 
          className={`${themeClasses.bg} rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-orange-400 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <h2 className={`text-2xl font-bold text-center ${themeClasses.text} mb-3`}>No Product Templates</h2>
          <p className={`text-center ${themeClasses.textSecondary} mb-6`}>
            You haven't created any product templates yet. Templates help standardize your product configurations with predefined variations and tabs.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleGoToSettings}
              className="w-full bg-gradient-to-r from-purple-500 to-orange-400 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all font-medium"
            >
              Create Template in Settings
            </button>
            <button
              onClick={handleSkip}
              className={`w-full px-6 py-3 rounded-lg border ${themeClasses.border} ${themeClasses.text} hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors font-medium`}
            >
              Continue Without Template
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`${themeClasses.bg} rounded-2xl shadow-2xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className={`text-2xl font-bold ${themeClasses.text}`}>Choose a Product Template</h2>
            <p className={`text-sm ${themeClasses.textSecondary} mt-1`}>
              Select a template to automatically configure variations and tabs for your new product
            </p>
          </div>
          <button
            onClick={onClose}
            className={`${themeClasses.textSecondary} hover:text-red-500 transition-colors`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {productTemplates.map(template => (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                selectedTemplate?.id === template.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-lg'
                  : `${themeClasses.border} ${themeClasses.cardBg} hover:border-blue-300 hover:shadow-md`
              }`}
            >
              {/* Selected Indicator */}
              {selectedTemplate?.id === template.id && (
                <div className="flex justify-end mb-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Template Info */}
              <h3 className={`text-lg font-bold ${themeClasses.text} mb-2`}>{template.name}</h3>
              {template.description && (
                <p className={`text-sm ${themeClasses.textSecondary} mb-4`}>{template.description}</p>
              )}

              {/* Template Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <svg className={`w-4 h-4 ${themeClasses.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className={themeClasses.text}>
                    <strong>{template.variationType.charAt(0).toUpperCase() + template.variationType.slice(1)}</strong> variations
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <svg className={`w-4 h-4 ${themeClasses.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className={themeClasses.text}>
                    <strong>{template.defaultVariations.length}</strong> default {template.variationType}(s)
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <svg className={`w-4 h-4 ${themeClasses.textSecondary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <span className={themeClasses.text}>
                    {template.enabledTabs.length === 0 ? 'All tabs enabled' : `${template.enabledTabs.length} tabs enabled`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t ${themeClasses.border}">
          <button
            onClick={handleSkip}
            className={`flex-1 py-3 border ${themeClasses.border} rounded-lg ${themeClasses.text} hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors font-medium`}
          >
            Skip (No Template)
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedTemplate}
            className={`flex-1 py-3 rounded-lg text-white font-medium transition-all ${
              selectedTemplate
                ? 'bg-gradient-to-r from-purple-500 to-orange-400 hover:shadow-lg'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Continue with Selected Template
          </button>
        </div>

        {/* Help Text */}
        <p className={`text-xs ${themeClasses.textSecondary} text-center mt-4`}>
          You can create more templates in <button onClick={handleGoToSettings} className="text-blue-500 hover:underline">Settings</button>
        </p>
      </div>
    </div>
  );
};

export default TemplateSelector;

