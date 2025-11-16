import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useProducts } from '../context/ProductsContext';
import { useCompany } from '../context/CompanyContext';
import { toast } from 'sonner';

const BulkUpload = ({ module, onClose, onSuccess }) => {
  const { isDarkMode } = useTheme();
  const { importFromCSV, exportToCSV, getProductsByModule } = useProducts();
  const { brands, salesAccounts } = useCompany();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);

    try {
      const text = await file.text();
      const result = importFromCSV(text);

      if (result.success) {
        toast.success(`Successfully imported ${result.count} products!`);
        onSuccess && onSuccess(result.products);
        onClose && onClose();
      } else {
        toast.error(`Import failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Error reading file: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `product,brand,account,status,module
Example Product 1,${brands[0]?.name || 'Brand Name'},${salesAccounts[0]?.name || 'Account Name'},pending,${module}
Example Product 2,${brands[0]?.name || 'Brand Name'},${salesAccounts[0]?.name || 'Account Name'},in_progress,${module}`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${module}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success('Template downloaded!');
  };

  const downloadExisting = () => {
    const moduleProducts = getProductsByModule(module);
    if (moduleProducts.length === 0) {
      toast.error('No products to export');
      return;
    }

    const csv = exportToCSV(moduleProducts);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${module}_products_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${moduleProducts.length} products!`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className={`${themeClasses.bg} rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${themeClasses.text}`}>Bulk Upload Products</h2>
          <button
            onClick={onClose}
            className={`${themeClasses.textSecondary} hover:text-red-500 transition-colors`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info */}
        <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'} border ${isDarkMode ? 'border-blue-500/20' : 'border-blue-200'}`}>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className={`text-sm ${themeClasses.text} font-medium mb-1`}>CSV Format Required</p>
              <p className={`text-xs ${themeClasses.textSecondary}`}>
                Your CSV should include columns: product, brand, account, status. Download the template below to get started.
              </p>
            </div>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={downloadTemplate}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border ${themeClasses.border} rounded-lg ${themeClasses.text} hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Download Template
          </button>
          <button
            onClick={downloadExisting}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border ${themeClasses.border} rounded-lg ${themeClasses.text} hover:bg-green-500 hover:text-white hover:border-green-500 transition-all`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Current
          </button>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-500/5'
              : `${themeClasses.border} ${file ? 'bg-green-500/5 border-green-500' : ''}`
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {!file ? (
            <>
              <svg
                className={`mx-auto w-12 h-12 ${themeClasses.textSecondary} mb-4`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className={`${themeClasses.text} font-medium mb-2`}>
                Drag and drop your CSV file here
              </p>
              <p className={`${themeClasses.textSecondary} text-sm mb-4`}>or</p>
              <label className="inline-block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleChange}
                  className="hidden"
                />
                <span className="cursor-pointer bg-blue-500 text-white px-6 py-2.5 rounded-lg hover:bg-blue-600 transition-colors inline-block">
                  Browse Files
                </span>
              </label>
            </>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-left">
                <p className={`${themeClasses.text} font-medium`}>{file.name}</p>
                <p className={`${themeClasses.textSecondary} text-sm`}>
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="ml-4 text-red-500 hover:text-red-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className={`flex-1 py-3 border ${themeClasses.border} rounded-lg ${themeClasses.text} hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors font-medium`}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 bg-gradient-to-r from-purple-500 to-orange-400 text-white py-3 rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload & Import'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;


