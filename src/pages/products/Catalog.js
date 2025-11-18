import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext';
import CatalogHeader from './catalog/components/CatalogHeader';
import CatalogTable from './catalog/components/CatalogTable';

const Catalog = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  const [catalogData, setCatalogData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('parent');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch catalog data from API based on active tab
  useEffect(() => {
    const fetchCatalogData = async () => {
      try {
        setLoading(true);
        const apiUrl = process.env.REACT_APP_API_URL || 'YOUR_API_GATEWAY_URL';
        
        // Fetch parent or child data based on active tab
        const endpoint = activeTab === 'parent' 
          ? `${apiUrl}/products/catalog`
          : `${apiUrl}/products/catalog/children`;
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch catalog data');
        }

        // Transform API data to match table format
        const transformedData = (result.data || []).map(item => ({
          id: item.id,
          marketplace: item.marketplace || 'Amazon',
          account: item.account || 'TPS Nutrients',
          brand: item.brand || 'TPS Plant Foods',
          product: item.product || 'Unknown Product',
        }));

        setCatalogData(transformedData);
      } catch (error) {
        console.error('Error fetching catalog data:', error);
        toast.error('Failed to load catalog data', {
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogData();
  }, [activeTab]);

  // Use API data or fallback to sample data
  const displayData = catalogData.length > 0 ? catalogData : [];
  
  // Sample data for Parent tab (fallback if API fails)
  const sampleParentData = [
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

  // Sample data for Child tab (fallback if API fails)
  const sampleChildData = [
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

  // Use real data from API, or fall back to sample data if API hasn't loaded yet
  const currentData = displayData.length > 0 
    ? displayData 
    : (activeTab === 'parent' ? sampleParentData : sampleChildData);

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
        productId: product.id, // Pass product ID for API calls
        returnPath: '/dashboard/products/catalog',
        isChildView: activeTab === 'child', // Pass whether this is from child tab
        specificChildId: activeTab === 'child' ? product.id : null // If child, pass the specific child ID
        // No allowedTabs restriction - show all tabs
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
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading catalog data...</div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default Catalog;
