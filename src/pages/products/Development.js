import React, { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import DevelopmentHeader from './development/components/DevelopmentHeader';
import DevelopmentTable from './development/components/DevelopmentTable';
import FilterDrawer from './development/components/FilterDrawer';
import DevelopmentAPI from '../../services/developmentApi';

const Development = () => {
  const { isDarkMode } = useTheme();
  const { showDialog } = useDialog();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load development data from backend
  useEffect(() => {
    loadDevelopmentData();
  }, []);

  const loadDevelopmentData = async () => {
    try {
      setLoading(true);
      const data = await DevelopmentAPI.getAll();
      setTableData(data);
    } catch (error) {
      console.error('Error loading development data:', error);
      toast.error('Failed to load development data', {
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Sample data (fallback)
  const initialData = [
    {
      id: '1',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      essentialInfo: 'completed',
      form: 'completed',
      design: 'completed',
      listing: 'completed',
      prod: 'completed',
      pack: 'completed',
      labels: 'completed',
      ads: 'completed',
    },
    {
      id: '2',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      essentialInfo: 'completed',
      form: 'inProgress',
      design: 'completed',
      listing: 'completed',
      prod: 'completed',
      pack: 'completed',
      labels: 'pending',
      ads: 'completed',
    },
    {
      id: '3',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      essentialInfo: 'completed',
      form: 'completed',
      design: 'inProgress',
      listing: 'completed',
      prod: 'completed',
      pack: 'inProgress',
      labels: 'inProgress',
      ads: 'pending',
    },
    {
      id: '4',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      essentialInfo: 'completed',
      form: 'completed',
      design: 'completed',
      listing: 'completed',
      prod: 'inProgress',
      pack: 'inProgress',
      labels: 'inProgress',
      ads: 'inProgress',
    },
    {
      id: '5',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      essentialInfo: 'completed',
      form: 'pending',
      design: 'completed',
      listing: 'inProgress',
      prod: 'inProgress',
      pack: 'inProgress',
      labels: 'pending',
      ads: 'pending',
    },
    {
      id: '6',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      essentialInfo: 'completed',
      form: 'completed',
      design: 'completed',
      listing: 'pending',
      prod: 'pending',
      pack: 'pending',
      labels: 'pending',
      ads: 'pending',
    },
    {
      id: '7',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      essentialInfo: 'completed',
      form: 'completed',
      design: 'pending',
      listing: 'pending',
      prod: 'pending',
      pack: 'pending',
      labels: 'pending',
      ads: 'pending',
    },
    {
      id: '8',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Pansy Fertilizer',
      essentialInfo: 'completed',
      form: 'completed',
      design: 'completed',
      listing: 'inProgress',
      prod: 'pending',
      pack: 'pending',
      labels: 'pending',
      ads: 'pending',
    },
    {
      id: '9',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Hydrangea Blue',
      essentialInfo: 'completed',
      form: 'inProgress',
      design: 'completed',
      listing: 'completed',
      prod: 'completed',
      pack: 'inProgress',
      labels: 'pending',
      ads: 'pending',
    },
    {
      id: '10',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Hydrangea Pink',
      essentialInfo: 'completed',
      form: 'completed',
      design: 'completed',
      listing: 'completed',
      prod: 'inProgress',
      pack: 'inProgress',
      labels: 'inProgress',
      ads: 'pending',
    },
    {
      id: '11',
      account: 'Green Earth Co',
      brand: 'Nature\'s Choice',
      product: 'Organic Rose Food',
      essentialInfo: 'completed',
      form: 'completed',
      design: 'inProgress',
      listing: 'pending',
      prod: 'pending',
      pack: 'pending',
      labels: 'pending',
      ads: 'pending',
    },
    {
      id: '12',
      account: 'Garden Masters',
      brand: 'ProGrow',
      product: 'All Purpose Plant Food',
      essentialInfo: 'completed',
      form: 'completed',
      design: 'completed',
      listing: 'completed',
      prod: 'completed',
      pack: 'completed',
      labels: 'completed',
      ads: 'inProgress',
    },
  ];

  const [developmentData, setDevelopmentData] = useState(initialData);

  // Update developmentData when tableData loads
  useEffect(() => {
    if (tableData.length > 0) {
      setDevelopmentData(tableData);
    }
  }, [tableData]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    sellerAccount: '',
    country: '',
    brandName: '',
    productType: '',
    size: '',
    descriptors: '',
    formula: ''
  });
  const filterButtonRef = useRef(null);

  // Filter data based on search and filters
  const filteredData = useMemo(() => {
    return developmentData.filter((item) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        item.product.toLowerCase().includes(searchLower) ||
        item.account.toLowerCase().includes(searchLower) ||
        item.brand.toLowerCase().includes(searchLower);

      // Apply other filters
      const matchesSellerAccount = !filters.sellerAccount || item.account === filters.sellerAccount;
      const matchesBrandName = !filters.brandName || item.brand === filters.brandName;
      // Note: Add more filter logic here as needed based on your data structure

      return matchesSearch && matchesSellerAccount && matchesBrandName;
    });
  }, [developmentData, searchTerm, filters]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const handleSearch = (term) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleFilterClick = () => {
    setIsFilterOpen(true);
  };

  const handleSortClick = () => {
    toast.info('Sort functionality coming soon!');
  };

  const handleApplyFilters = () => {
    setCurrentPage(1); // Reset to first page when filters are applied
  };

  const handleStatusClick = (rowId, stage, currentStatus) => {
    const statusOptions = ['pending', 'inProgress', 'completed'];
    const currentIndex = statusOptions.indexOf(currentStatus);
    const nextStatus = statusOptions[(currentIndex + 1) % statusOptions.length];

    const statusLabels = {
      pending: 'Pending',
      inProgress: 'In Progress',
      completed: 'Completed',
    };

    const stageLabels = {
      essentialInfo: 'Essential Info',
      form: 'Form',
      design: 'Design',
      listing: 'Listing',
      prod: 'Production',
      pack: 'Packaging',
      labels: 'Labels',
      ads: 'Ads',
    };

    showDialog({
      title: `Update ${stageLabels[stage]} Status`,
      message: `Change status from "${statusLabels[currentStatus]}" to "${statusLabels[nextStatus]}"?`,
      confirmText: 'Update',
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: () => {
        setDevelopmentData((prevData) =>
          prevData.map((item) =>
            item.id === rowId ? { ...item, [stage]: nextStatus } : item
          )
        );
        toast.success('Status updated!', {
          description: `${stageLabels[stage]} is now ${statusLabels[nextStatus]}.`,
        });
      },
    });
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg} flex flex-col`}>
      <div style={{ padding: '2rem 2rem 0 2rem' }}>
        <DevelopmentHeader 
          onSearch={handleSearch} 
          onFilterClick={handleFilterClick}
          onSortClick={handleSortClick}
          filterButtonRef={filterButtonRef}
        />
      </div>
      <div style={{ flex: 1, padding: '0 2rem 2rem 2rem' }}>
        <DevelopmentTable 
          data={paginatedData}
          totalItems={filteredData.length}
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          onStatusClick={handleStatusClick}
        />
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
        filters={filters}
        setFilters={setFilters}
        buttonRef={filterButtonRef}
      />
    </div>
  );
};

export default Development;
