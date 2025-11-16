import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import AdsHeader from './ads/components/AdsHeader';
import AdsTable from './ads/components/AdsTable';

const Ads = () => {
  const { isDarkMode } = useTheme();
  const { showDialog } = useDialog();

  const themeClasses = {
    bg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  // Sample data
  const initialData = [
    {
      id: '1',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      phase1: 'completed',
      phase2: 'completed',
      phase3: 'pending',
    },
    {
      id: '2',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Pansy Fertilizer',
      phase1: 'completed',
      phase2: 'completed',
      phase3: 'inProgress',
    },
    {
      id: '3',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Hydrangea Blue',
      phase1: 'completed',
      phase2: 'completed',
      phase3: 'pending',
    },
    {
      id: '4',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Hydrangea Pink',
      phase1: 'completed',
      phase2: 'completed',
      phase3: 'pending',
    },
    {
      id: '5',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Rose Food',
      phase1: 'completed',
      phase2: 'completed',
      phase3: 'pending',
    },
    {
      id: '6',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Tulip Fertilizer',
      phase1: 'completed',
      phase2: 'completed',
      phase3: 'pending',
    },
    {
      id: '7',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Orchid Food',
      phase1: 'completed',
      phase2: 'completed',
      phase3: 'completed',
    },
    {
      id: '8',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Cactus Fertilizer',
      phase1: 'completed',
      phase2: 'completed',
      phase3: 'completed',
    },
  ];

  const [adsData, setAdsData] = useState(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter data based on search
  const filteredData = useMemo(() => {
    return adsData.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return searchTerm === '' || 
        item.product.toLowerCase().includes(searchLower) ||
        item.account.toLowerCase().includes(searchLower) ||
        item.brand.toLowerCase().includes(searchLower);
    });
  }, [adsData, searchTerm]);

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
      phase1: 'Phase 1',
      phase2: 'Phase 2',
      phase3: 'Phase 3',
    };

    showDialog({
      title: `Update ${stageLabels[stage]} Status`,
      message: `Change status from "${statusLabels[currentStatus]}" to "${statusLabels[nextStatus]}"?`,
      confirmText: 'Update',
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: () => {
        setAdsData((prevData) =>
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
        <AdsHeader onSearch={handleSearch} />
      </div>
      <div style={{ flex: 1, padding: '0 2rem 2rem 2rem' }}>
        <AdsTable 
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
    </div>
  );
};

export default Ads;
