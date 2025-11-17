import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import { useProducts } from '../../context/ProductsContext';
import { useCompany } from '../../context/CompanyContext';
import SelectionFilters from './selection/components/SelectionFilters';
import SelectionTable from './selection/components/SelectionTable';
import BulkUpload from '../../components/BulkUpload';
import TemplateSelector from '../../components/TemplateSelector';
import SelectionAPI from '../../services/selectionApi';

const Selection = () => {
  const { isDarkMode } = useTheme();
  const { showDialog } = useDialog();
  const navigate = useNavigate();
  const { products, addProduct, updateProduct, deleteProduct, setProductVariations, setProductTabs, setActiveTemplate } = useProducts();
  const { getProductTemplate, statusWorkflows } = useCompany();
  
  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  const [tableData, setTableData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [newRow, setNewRow] = useState(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load products from backend
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await SelectionAPI.getAll();
      const formatted = data.map(p => ({
        id: p.id,
        status: p.status || 'contender',
        account: p.account || '',
        brand: p.brand || '',
        product: p.product || '',
        searchVol: p.searchVol || 0,
        actionType: p.actionType || 'launch',
      }));
      
      // Add new row if it exists
      if (newRow) {
        setTableData([newRow, ...formatted]);
      } else {
        setTableData(formatted);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    return tableData.filter((item) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const searchMatch = searchTerm === '' || 
        item.product.toLowerCase().includes(searchLower) ||
        item.account.toLowerCase().includes(searchLower) ||
        item.brand.toLowerCase().includes(searchLower);

      return searchMatch;
    });
  }, [tableData, searchTerm]);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleNewProduct = () => {
    // Check if there's already a new row
    if (newRow) {
      return; // Don't add another new row
    }

    // Show template selector first
    setShowTemplateSelector(true);
  };

  const handleTemplateSelected = (template) => {
    setSelectedTemplate(template);
    
    // Get the first status from custom workflow, or fallback
    const defaultStatus = statusWorkflows && statusWorkflows.length > 0 
      ? statusWorkflows.sort((a, b) => a.order - b.order)[0].id 
      : 'contender';
    
    const row = {
      id: `new-${Date.now()}`,
      status: defaultStatus,
      account: '',
      brand: '',
      product: '',
      searchVol: 0,
      actionType: 'launch',
      isNew: true,
      templateId: template?.id || null
    };
    setNewRow(row);
  };

  const handleActionClick = async (row) => {
    // Just navigate to form - don't update database yet
    // The form will handle marking as launched when user submits
    console.log('Launching product with row data:', row);
    console.log('Variations being passed:', row.variations);
    
    navigate('/dashboard/products/form', {
      state: {
        productId: row.id,
        productData: {
          id: row.id,
          account: row.account,
          brand: row.brand,
          product: row.product,
          searchVol: row.searchVol,
          status: row.status,
          variations: row.variations || [], // Pass variations data
          variationCount: row.variationCount || 0
        }
      }
    });
  };

  const handleStatusChange = async (rowId, newStatus) => {
    if (newRow && newRow.id === rowId) {
      setNewRow({ ...newRow, status: newStatus });
    } else {
      // Update in local state immediately for responsiveness
      setTableData(prev => prev.map(item => 
        item.id === rowId ? { ...item, status: newStatus } : item
      ));
      
      try {
        const existingRow = tableData.find(item => item.id === rowId);
        await SelectionAPI.update(rowId, { ...existingRow, status: newStatus });
        updateProduct(rowId, { status: newStatus });
      } catch (error) {
        console.error('Error updating status:', error);
        toast.error('Failed to update status');
        loadProducts(); // Reload on error
      }
    }
  };

  const handleAccountChange = async (rowId, newAccount) => {
    if (newRow && newRow.id === rowId) {
      setNewRow({ ...newRow, account: newAccount });
    } else {
      setTableData(prev => prev.map(item => 
        item.id === rowId ? { ...item, account: newAccount } : item
      ));
      
      try {
        const existingRow = tableData.find(item => item.id === rowId);
        await SelectionAPI.update(rowId, { ...existingRow, account: newAccount });
        updateProduct(rowId, { account: newAccount });
      } catch (error) {
        console.error('Error updating account:', error);
        toast.error('Failed to update account');
        loadProducts();
      }
    }
  };

  const handleBrandChange = async (rowId, newBrand) => {
    if (newRow && newRow.id === rowId) {
      setNewRow({ ...newRow, brand: newBrand });
    } else {
      setTableData(prev => prev.map(item => 
        item.id === rowId ? { ...item, brand: newBrand } : item
      ));
      
      try {
        const existingRow = tableData.find(item => item.id === rowId);
        await SelectionAPI.update(rowId, { ...existingRow, brand: newBrand });
        updateProduct(rowId, { brand: newBrand });
      } catch (error) {
        console.error('Error updating brand:', error);
        toast.error('Failed to update brand');
        loadProducts();
      }
    }
  };

  const handleProductChange = async (rowId, newProductName) => {
    if (newRow && newRow.id === rowId) {
      setNewRow({ ...newRow, product: newProductName });
    } else {
      setTableData(prev => prev.map(item => 
        item.id === rowId ? { ...item, product: newProductName } : item
      ));
      
      try {
        const existingRow = tableData.find(item => item.id === rowId);
        await SelectionAPI.update(rowId, { ...existingRow, product: newProductName });
        updateProduct(rowId, { product: newProductName });
      } catch (error) {
        console.error('Error updating product name:', error);
        toast.error('Failed to update product name');
        loadProducts();
      }
    }
  };

  const handleSearchVolChange = async (rowId, newSearchVol) => {
    if (newRow && newRow.id === rowId) {
      setNewRow({ ...newRow, searchVol: Number(newSearchVol) || 0 });
    } else {
      setTableData(prev => prev.map(item => 
        item.id === rowId ? { ...item, searchVol: Number(newSearchVol) || 0 } : item
      ));
      
      try {
        const existingRow = tableData.find(item => item.id === rowId);
        await SelectionAPI.update(rowId, { ...existingRow, searchVol: Number(newSearchVol) || 0 });
        updateProduct(rowId, { searchVol: Number(newSearchVol) || 0 });
      } catch (error) {
        console.error('Error updating search volume:', error);
        toast.error('Failed to update search volume');
        loadProducts();
      }
    }
  };

  const handleSaveNewRow = async (rowId) => {
    const row = newRow || tableData.find((item) => item.id === rowId);
    
    // Validate required fields
    if (!row.account || !row.brand || !row.product) {
      toast.error('Please fill in all required fields', {
        description: 'Account, Brand, and Product are required fields.',
      });
      return;
    }

    showDialog({
      title: 'Save Product',
      message: `Are you sure you want to save "${row.product}"? This will add the product to your selection.`,
      confirmText: 'Save Product',
      cancelText: 'Cancel',
      type: 'success',
      onConfirm: async () => {
        try {
          // Save to backend
          const savedProduct = await SelectionAPI.create({
            status: row.status,
            account: row.account,
            brand: row.brand,
            product: row.product,
            searchVol: row.searchVol,
            actionType: row.actionType,
            templateId: row.templateId
          });
          
          // Also add to local context for other modules
          const newProduct = addProduct({
            ...row,
            id: savedProduct.id,
            module: 'selection',
            isNew: false
          });
          
          // Apply template configuration if template was selected
          if (row.templateId && selectedTemplate) {
            const template = getProductTemplate(row.templateId) || selectedTemplate;
            if (template) {
              console.log('📝 Applying template config to product:', {
                productId: newProduct.id,
                templateName: template.name,
                variations: template.defaultVariations,
                variationType: template.variationType,
                enabledTabs: template.enabledTabs
              });
              
              // Set active template
              setActiveTemplate(newProduct.id, template.id);
              
              // Apply variations
              setProductVariations(newProduct.id, template.defaultVariations, template.variationType);
              
              // Apply enabled tabs (if any)
              if (template.enabledTabs && template.enabledTabs.length > 0) {
                console.log('✅ Setting product tabs:', template.enabledTabs);
                setProductTabs(newProduct.id, template.enabledTabs);
              } else {
                console.log('⚠️ No tabs configured in template - will show all tabs');
              }
            }
          }
          
          setNewRow(null);
          setSelectedTemplate(null);
          
          // Reload from backend
          await loadProducts();
          
          toast.success('Product saved successfully!', {
            description: `${row.product} has been added with ${selectedTemplate ? `"${selectedTemplate.name}" template` : 'default configuration'}.`,
          });
        } catch (error) {
          console.error('Error saving product:', error);
          toast.error('Failed to save product', {
            description: error.message
          });
        }
      },
    });
  };

  const handleCancelNewRow = (rowId) => {
    const row = newRow || tableData.find((item) => item.id === rowId);
    const hasData = row.account || row.brand || row.product || row.searchVol;

    if (hasData) {
      showDialog({
        title: 'Discard Changes',
        message: 'Are you sure you want to cancel? All unsaved changes will be lost.',
        confirmText: 'Discard',
        cancelText: 'Keep Editing',
        type: 'warning',
        onConfirm: () => {
          setNewRow(null);
          setSelectedTemplate(null);
          toast.info('Changes discarded', {
            description: 'The product was not saved.',
          });
        },
      });
    } else {
      setNewRow(null);
      setSelectedTemplate(null);
    }
  };

  const hasUnsavedRow = !!newRow;

  return (
    <div className={`min-h-screen ${themeClasses.bg} flex flex-col`}>
      <div style={{ padding: '2rem 2rem 0 2rem' }}>
        <SelectionFilters 
          onSearch={handleSearch} 
          onNewProduct={handleNewProduct}
          onBulkUpload={() => setShowBulkUpload(true)}
          hasUnsavedRow={hasUnsavedRow}
        />
      </div>
      <div style={{ flex: 1, padding: '0 2rem 2rem 2rem' }}>
        <SelectionTable 
          data={filteredData} 
          onActionClick={handleActionClick}
          onStatusChange={handleStatusChange}
          onAccountChange={handleAccountChange}
          onBrandChange={handleBrandChange}
          onProductChange={handleProductChange}
          onSearchVolChange={handleSearchVolChange}
          onSaveNewRow={handleSaveNewRow}
          onCancelNewRow={handleCancelNewRow}
        />
      </div>
      
      {showBulkUpload && (
        <BulkUpload
          module="selection"
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            setShowBulkUpload(false);
            toast.success('Products imported successfully!');
          }}
        />
      )}

      {showTemplateSelector && (
        <TemplateSelector
          onClose={() => setShowTemplateSelector(false)}
          onSelect={handleTemplateSelected}
        />
      )}
    </div>
  );
};

export default Selection;

