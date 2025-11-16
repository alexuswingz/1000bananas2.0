import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useTheme } from '../../context/ThemeContext';
import { useDialog } from '../../context/DialogContext';
import ListingHeader from './listing/components/ListingHeader';
import ListingTable from './listing/components/ListingTable';

const Listing = () => {
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
      essentialInfo: 'completed',
      slides: 'completed',
      aplus: 'completed',
      listingSetup: 'completed',
      pdpSetup: 'completed',
      vine: 'completed',
    },
    {
      id: '2',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Pansy Fertilizer',
      essentialInfo: 'completed',
      slides: 'inProgress',
      aplus: 'completed',
      listingSetup: 'completed',
      pdpSetup: 'completed',
      vine: 'pending',
    },
    {
      id: '3',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Hydrangea Blue',
      essentialInfo: 'completed',
      slides: 'completed',
      aplus: 'inProgress',
      listingSetup: 'completed',
      pdpSetup: 'inProgress',
      vine: 'inProgress',
    },
    {
      id: '4',
      account: 'TPS Nutrients',
      brand: 'TPS Plant Foods',
      product: 'Hydrangea Pink',
      essentialInfo: 'completed',
      slides: 'completed',
      aplus: 'completed',
      listingSetup: 'inProgress',
      pdpSetup: 'inProgress',
      vine: 'inProgress',
    },
    {
      id: '5',
      account: 'Green Earth Co',
      brand: 'Nature\'s Choice',
      product: 'Organic Rose Food',
      essentialInfo: 'completed',
      slides: 'pending',
      aplus: 'inProgress',
      listingSetup: 'inProgress',
      pdpSetup: 'pending',
      vine: 'pending',
    },
    {
      id: '6',
      account: 'Green Earth Co',
      brand: 'Nature\'s Choice',
      product: 'Eco Blend',
      essentialInfo: 'completed',
      slides: 'completed',
      aplus: 'pending',
      listingSetup: 'pending',
      pdpSetup: 'pending',
      vine: 'pending',
    },
    {
      id: '7',
      account: 'Garden Masters',
      brand: 'ProGrow',
      product: 'All Purpose Plant Food',
      essentialInfo: 'completed',
      slides: 'completed',
      aplus: 'pending',
      listingSetup: 'pending',
      pdpSetup: 'pending',
      vine: 'pending',
    },
    {
      id: '8',
      account: 'Garden Masters',
      brand: 'ProGrow',
      product: 'Advanced Nutrients',
      essentialInfo: 'completed',
      slides: 'completed',
      aplus: 'inProgress',
      listingSetup: 'pending',
      pdpSetup: 'pending',
      vine: 'pending',
    },
  ];

  const [listingData, setListingData] = useState(initialData);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter data based on search
  const filteredData = useMemo(() => {
    return listingData.filter((item) => {
      const searchLower = searchTerm.toLowerCase();
      return searchTerm === '' || 
        item.product.toLowerCase().includes(searchLower) ||
        item.account.toLowerCase().includes(searchLower) ||
        item.brand.toLowerCase().includes(searchLower);
    });
  }, [listingData, searchTerm]);

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
      essentialInfo: 'Essential Info',
      slides: 'Slides',
      aplus: 'A+ Content',
      listingSetup: 'Listing Setup',
      pdpSetup: 'PDP Setup',
      vine: 'Vine',
    };

    showDialog({
      title: `Update ${stageLabels[stage]} Status`,
      message: `Change status from "${statusLabels[currentStatus]}" to "${statusLabels[nextStatus]}"?`,
      confirmText: 'Update',
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: () => {
        setListingData((prevData) =>
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
        <ListingHeader onSearch={handleSearch} />
      </div>
      <div style={{ flex: 1, padding: '0 2rem 2rem 2rem' }}>
        <ListingTable 
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

export default Listing;
