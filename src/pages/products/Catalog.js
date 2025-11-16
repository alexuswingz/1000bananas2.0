import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext';
import { useProducts } from '../../context/ProductsContext';
import CatalogHeader from './catalog/components/CatalogHeader';
import CatalogTable from './catalog/components/CatalogTable';

const Catalog = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { products } = useProducts();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  // Get catalog products from ProductsContext
  const catalogProducts = useMemo(() => {
    return products
      .filter(p => p.module === 'catalog')
      .map(p => {
        // Shorten product name for table display
        const fullProductName = p.product || p.productName || 'Unknown Product';
        const shortName = fullProductName.split(',')[0].trim(); // Take text before first comma
        
        return {
          id: p.id,
          marketplace: p.marketplace || 'Amazon',
          account: p.account || 'Amazon US',
          brand: p.brand || 'TPS Nutrients',
          product: shortName, // Shortened for table
          fullProduct: fullProductName, // Keep full name
          asin: p.asin || '',
          sku: p.sku || '',
          images: p.images || [],
          mainImage: p.mainImage || '',
          description: p.description || '',
          price: p.price || '',
          quantity: p.quantity || p.totalQuantity || '',
          // Pass all additional details
          ...p
        };
      });
  }, [products]);

  // Sample data for Parent tab
  const parentData = catalogProducts.length > 0 ? catalogProducts : [
    {
      id: '1',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Nutrients',
      product: 'Cherry Tree Fertilizer',
    },
    {
      id: '2',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Nutrients',
      product: 'TPS Nutrients',
    },
    {
      id: '3',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Nutrients',
      product: 'TPS Nutrients',
    },
    {
      id: '4',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Nutrients',
      product: 'TPS Nutrients',
    },
    {
      id: '5',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Nutrients',
      product: 'TPS Nutrients',
    },
    {
      id: '6',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Nutrients',
      product: 'TPS Nutrients',
    },
    {
      id: '7',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Nutrients',
      product: 'TPS Nutrients',
    },
    {
      id: '8',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Nutrients',
      product: 'TPS Nutrients',
    },
    {
      id: '9',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Nutrients',
      product: 'TPS Nutrients',
    },
    {
      id: '10',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Nutrients',
      product: 'TPS Nutrients',
    },
    {
      id: '11',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Nutrients',
      product: 'TPS Nutrients',
    },
    {
      id: '12',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Nutrients',
      product: 'TPS Nutrients',
    },
  ];

  // Sample data for Child tab
  const childData = [
    {
      id: '1',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer - 8oz',
    },
    {
      id: '2',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer - 16oz',
    },
    {
      id: '3',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer - 32oz',
    },
    {
      id: '4',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Pansy Fertilizer - 8oz',
    },
    {
      id: '5',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Pansy Fertilizer - 16oz',
    },
    {
      id: '6',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Hydrangea Blue - 8oz',
    },
    {
      id: '7',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Hydrangea Blue - 16oz',
    },
    {
      id: '8',
      marketplace: 'Amazon',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Hydrangea Pink - 8oz',
    },
  ];

  const [activeTab, setActiveTab] = useState('parent');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Get data based on active tab
  const currentData = activeTab === 'parent' ? parentData : childData;

  // Filter data based on search
  const filteredData = useMemo(() => {
    return currentData.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return searchTerm === '' || 
        item.product.toLowerCase().includes(searchLower) ||
        item.marketplace.toLowerCase().includes(searchLower) ||
        item.account.toLowerCase().includes(searchLower) ||
        item.brand.toLowerCase().includes(searchLower);
    });
  }, [currentData, searchTerm]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  const handleProductClick = (product) => {
    navigate('/dashboard/products/catalog/detail', {
      state: { 
        product,
        returnPath: '/dashboard/products/catalog', // Return to Catalog page when back button is clicked
        allowedTabs: ['essential', 'stock', 'slides', 'label-copy', 'label', 'images', 'aplus', 'pdpSetup', 'website', 'listing', 'vine', 'formula'] // Exclude finishedGoods
      }
    });
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg} flex flex-col`}>
      <div style={{ padding: '2rem 2rem 0 2rem' }}>
        <CatalogHeader 
          onSearch={handleSearch}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      </div>
      <div style={{ flex: 1, padding: '0 2rem 2rem 2rem' }}>
        <CatalogTable 
          data={paginatedData}
          totalItems={filteredData.length}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onProductClick={handleProductClick}
        />
      </div>
    </div>
  );
};

export default Catalog;
