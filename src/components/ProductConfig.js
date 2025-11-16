import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useProducts } from '../context/ProductsContext';
import { toast } from 'sonner';

const ProductConfig = ({ product, onClose, availableTabs }) => {
  const { isDarkMode } = useTheme();
  const { getProductConfig, setProductVariations, setProductTabs } = useProducts();
  
  const currentConfig = getProductConfig(product.id);
  
  const [variations, setVariations] = useState(currentConfig.variations.length > 0 ? currentConfig.variations : ['Default']);
  const [variationType, setVariationType] = useState(currentConfig.variationType || 'size');
  const [enabledTabs, setEnabledTabs] = useState(currentConfig.enabledTabs || []);
  const [newVariation, setNewVariation] = useState('');

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  const variationTypes = [
    { value: 'size', label: 'Size' },
    { value: 'color', label: 'Color' },
    { value: 'style', label: 'Style' },
    { value: 'flavor', label: 'Flavor' },
    { value: 'scent', label: 'Scent' },
    { value: 'material', label: 'Material' },
    { value: 'custom', label: 'Custom' }
  ];

  const handleAddVariation = () => {
    if (!newVariation.trim()) {
      toast.error('Please enter a variation name');
      return;
    }
    if (variations.includes(newVariation.trim())) {
      toast.error('This variation already exists');
      return;
    }
    setVariations([...variations, newVariation.trim()]);
    setNewVariation('');
  };

  const handleRemoveVariation = (index) => {
    if (variations.length === 1) {
      toast.error('Product must have at least one variation');
      return;
    }
    setVariations(variations.filter((_, i) => i !== index));
  };

  const handleToggleTab = (tabId) => {
    if (enabledTabs.includes(tabId)) {
      setEnabledTabs(enabledTabs.filter(id => id !== tabId));
    } else {
      setEnabledTabs([...enabledTabs, tabId]);
    }
  };

  const handleSave = () => {
    if (variations.length === 0) {
      toast.error('Please add at least one variation');
      return;
    }

    setProductVariations(product.id, variations, variationType);
    setProductTabs(product.id, enabledTabs);
    
    toast.success('Product configuration saved!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`${themeClasses.bg} rounded-2xl shadow-2xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${themeClasses.text}`}>
            Configure Product: {product.product}
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

        {/* Variations Section */}
        <div className="mb-8">
          <h3 className={`text-lg font-semibold ${themeClasses.text} mb-4`}>Product Variations</h3>
          
          {/* Variation Type */}
          <div className="mb-4">
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
              Variation Type
            </label>
            <select
              value={variationType}
              onChange={(e) => setVariationType(e.target.value)}
              className={`w-full px-4 py-2 border ${themeClasses.border} rounded-lg ${themeClasses.inputBg} ${themeClasses.text} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {variationTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <p className={`text-xs ${themeClasses.textSecondary} mt-1`}>
              e.g., Size: 8oz, Quart, Gallon | Color: Red, Blue, Green | Style: Classic, Modern
            </p>
          </div>

          {/* Current Variations */}
          <div className="mb-4">
            <label className={`block text-sm font-medium ${themeClasses.text} mb-2`}>
              Current Variations
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {variations.map((variation, index) => (
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
                placeholder={`Add ${variationType} (e.g., "32oz")`}
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

        {/* Tabs Configuration */}
        <div className="mb-6">
          <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Visible Tabs</h3>
          <p className={`text-sm ${themeClasses.textSecondary} mb-4`}>
            Select which tabs should be visible for this product. Leave all unchecked to show all tabs.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableTabs.map(tab => (
              <label
                key={tab.id}
                className={`flex items-center gap-2 p-3 border ${themeClasses.border} rounded-lg cursor-pointer transition-colors ${
                  enabledTabs.includes(tab.id) || enabledTabs.length === 0
                    ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500'
                    : 'hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary'
                }`}
              >
                <input
                  type="checkbox"
                  checked={enabledTabs.includes(tab.id)}
                  onChange={() => handleToggleTab(tab.id)}
                  className="w-4 h-4"
                />
                <span className={`text-sm ${themeClasses.text}`}>{tab.label}</span>
              </label>
            ))}
          </div>
          {enabledTabs.length === 0 && (
            <p className={`text-xs ${themeClasses.textSecondary} mt-2 italic`}>
              All tabs will be shown (default behavior)
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-6 border-t ${themeClasses.border}">
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
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductConfig;

