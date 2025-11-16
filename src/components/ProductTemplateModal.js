import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'sonner';

const ProductTemplateModal = ({ template, onClose, onSave }) => {
  const { isDarkMode } = useTheme();
  
  const [templateData, setTemplateData] = useState({
    name: '',
    description: '',
    variationType: 'size',
    defaultVariations: ['Default'],
    enabledTabs: [],
    ...template
  });
  
  const [newVariation, setNewVariation] = useState('');

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  const variationTypes = [
    { value: 'size', label: 'Size', example: '8oz, Quart, Gallon' },
    { value: 'color', label: 'Color', example: 'Red, Blue, Green' },
    { value: 'style', label: 'Style', example: 'Modern, Classic, Rustic' },
    { value: 'flavor', label: 'Flavor', example: 'Vanilla, Chocolate, Strawberry' },
    { value: 'scent', label: 'Scent', example: 'Lavender, Rose, Citrus' },
    { value: 'material', label: 'Material', example: 'Cotton, Polyester, Silk' },
    { value: 'custom', label: 'Custom', example: 'Your custom type' }
  ];

  const allTabs = [
    { id: 'essential', label: 'Essential Info' },
    { id: 'stock', label: 'Stock Image' },
    { id: 'slides', label: 'Slides' },
    { id: 'label-copy', label: 'Label Copy' },
    { id: 'label', label: 'Label' },
    { id: 'images', label: 'Product Images' },
    { id: 'aplus', label: 'A+ Content' },
    { id: 'finishedGoods', label: 'Finished Goods Specs' },
    { id: 'pdpSetup', label: 'PDP Setup' },
    { id: 'website', label: 'Website' },
    { id: 'listing', label: 'Listing Setup' },
    { id: 'vine', label: 'Vine' },
    { id: 'formula', label: 'Formula' },
  ];

  const handleAddVariation = () => {
    if (!newVariation.trim()) {
      toast.error('Please enter a variation name');
      return;
    }
    if (templateData.defaultVariations.includes(newVariation.trim())) {
      toast.error('This variation already exists');
      return;
    }
    setTemplateData({
      ...templateData,
      defaultVariations: [...templateData.defaultVariations, newVariation.trim()]
    });
    setNewVariation('');
  };

  const handleRemoveVariation = (index) => {
    if (templateData.defaultVariations.length === 1) {
      toast.error('Template must have at least one variation');
      return;
    }
    setTemplateData({
      ...templateData,
      defaultVariations: templateData.defaultVariations.filter((_, i) => i !== index)
    });
  };

  const handleToggleTab = (tabId) => {
    if (templateData.enabledTabs.includes(tabId)) {
      setTemplateData({
        ...templateData,
        enabledTabs: templateData.enabledTabs.filter(id => id !== tabId)
      });
    } else {
      setTemplateData({
        ...templateData,
        enabledTabs: [...templateData.enabledTabs, tabId]
      });
    }
  };

  const handleSave = () => {
    if (!templateData.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (templateData.defaultVariations.length === 0) {
      toast.error('Please add at least one variation');
      return;
    }

    onSave(templateData);
    toast.success(template ? 'Template updated!' : 'Template created!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`${themeClasses.bg} rounded-2xl shadow-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${themeClasses.text}`}>
            {template ? 'Edit' : 'Create'} Product Template
          </h2>
          <button
            onClick={onClose}
            className={`${themeClasses.textSecondary} hover:text-red-500 transition-colors`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Template Info */}
        <div className="mb-6">
          <h3 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>Template Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Template Name *
              </label>
              <input
                type="text"
                value={templateData.name}
                onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
                placeholder="e.g., Liquid Products, Apparel, Furniture"
                className={`w-full px-4 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
                Description (Optional)
              </label>
              <input
                type="text"
                value={templateData.description}
                onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
                placeholder="Brief description of this product type"
                className={`w-full px-4 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
          </div>
        </div>

        {/* Variation Configuration */}
        <div className="mb-6">
          <h3 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>Variation Configuration</h3>
          
          {/* Variation Type */}
          <div className="mb-4">
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
              Variation Type *
            </label>
            <select
              value={templateData.variationType}
              onChange={(e) => setTemplateData({ ...templateData, variationType: e.target.value })}
              className={`w-full px-4 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {variationTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} (e.g., {type.example})
                </option>
              ))}
            </select>
          </div>

          {/* Default Variations */}
          <div className="mb-4">
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
              Default Variations *
            </label>
            <p className={`text-xs ${themeClasses.textSecondary} mb-3`}>
              These variations will be automatically added to new products using this template
            </p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {templateData.defaultVariations.map((variation, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 px-3 py-1.5 ${themeClasses.inputBg} border ${themeClasses.border} rounded-lg`}
                >
                  <span className={`text-sm ${themeClasses.text}`}>{variation}</span>
                  <button
                    onClick={() => handleRemoveVariation(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Variation */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newVariation}
                onChange={(e) => setNewVariation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddVariation()}
                placeholder={`Add ${templateData.variationType}`}
                className={`flex-1 px-4 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <button
                onClick={handleAddVariation}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Tab Configuration */}
        <div className="mb-6">
          <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Default Visible Tabs</h3>
          <p className={`text-sm ${themeClasses.textSecondary} mb-4`}>
            Select which tabs should be visible by default. Leave all unchecked to show all tabs.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allTabs.map(tab => (
              <label
                key={tab.id}
                className={`flex items-center gap-2 p-3 border ${themeClasses.border} rounded-lg cursor-pointer transition-colors ${
                  templateData.enabledTabs.includes(tab.id) || templateData.enabledTabs.length === 0
                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500'
                    : 'hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary'
                }`}
              >
                <input
                  type="checkbox"
                  checked={templateData.enabledTabs.includes(tab.id)}
                  onChange={() => handleToggleTab(tab.id)}
                  className="w-4 h-4"
                />
                <span className={`text-sm ${themeClasses.text}`}>{tab.label}</span>
              </label>
            ))}
          </div>
          {templateData.enabledTabs.length === 0 && (
            <p className={`text-xs ${themeClasses.textSecondary} mt-2 italic`}>
              All tabs will be shown (default behavior)
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t ${themeClasses.border}">
          <button
            onClick={onClose}
            className={`flex-1 py-3 border ${themeClasses.border} rounded-lg ${themeClasses.text} hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors font-medium`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-purple-500 to-orange-400 text-white py-3 rounded-lg hover:shadow-lg transition-all font-medium"
          >
            {template ? 'Update' : 'Create'} Template
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductTemplateModal;

