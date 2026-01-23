import React, { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import VineTrackerHeader from './components/VineTrackerHeader';
import SummaryCards from './components/SummaryCards';
import VineTrackerTable from './components/VineTrackerTable';

const VineTracker = () => {
  const { isDarkMode } = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const [vineProducts, setVineProducts] = useState([
    {
      id: 1,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
      brand: 'TPS Nutrients',
      size: '8oz',
      asin: 'B0C73TDZCQ',
      launchDate: 'Jan 15, 2026',
      claimed: 12,
      enrolled: 30,
      imageUrl: null,
    },
    {
      id: 2,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
      brand: 'TPS Nutrients',
      size: '8oz',
      asin: 'B0C73TDZCQ',
      launchDate: 'Jan 15, 2026',
      claimed: 12,
      enrolled: 30,
      imageUrl: null,
    },
    {
      id: 3,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
      brand: 'TPS Nutrients',
      size: '8oz',
      asin: 'B0C73TDZCQ',
      launchDate: 'Jan 15, 2026',
      claimed: 12,
      enrolled: 30,
      imageUrl: null,
    },
    {
      id: 4,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
      brand: 'TPS Nutrients',
      size: '8oz',
      asin: 'B0C73TDZCQ',
      launchDate: 'Jan 15, 2026',
      claimed: 12,
      enrolled: 30,
      imageUrl: null,
    },
    {
      id: 5,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
      brand: 'TPS Nutrients',
      size: '8oz',
      asin: 'B0C73TDZCQ',
      launchDate: 'Jan 15, 2026',
      claimed: 12,
      enrolled: 30,
      imageUrl: null,
    },
    {
      id: 6,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: 'Hydrangea Fertilizer for Acid Loving Plants, Liquid Plant Food 8 oz (250mL)',
      brand: 'TPS Nutrients',
      size: '8oz',
      asin: 'B0C73TDZCQ',
      launchDate: 'Jan 15, 2026',
      claimed: 12,
      enrolled: 30,
      imageUrl: null,
    },
  ]);
  const [loading, setLoading] = useState(false);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    // TODO: Implement search functionality
  };

  const handleNewVine = () => {
    // Create a new empty row
    const newRow = {
      id: `new-${Date.now()}`,
      status: 'Awaiting Reviews',
      statusColor: '#3B82F6',
      productName: '',
      brand: '',
      size: '',
      asin: '',
      launchDate: '',
      claimed: 0,
      enrolled: 0,
      imageUrl: null,
      isNew: true,
    };
    
    // Add new row to the beginning of the array
    setVineProducts(prev => [newRow, ...prev]);
  };

  const handleUpdateRow = (updatedRow) => {
    // Update the row in the vineProducts array
    setVineProducts(prev => 
      prev.map(p => p.id === updatedRow.id ? updatedRow : p)
    );
  };

  // Calculate summary card values
  const calculateSummaryValues = () => {
    const activeVineProducts = vineProducts.filter(p => p.status !== 'archived').length;
    const totalUnitsClaimed = vineProducts.reduce((sum, p) => sum + (p.claimed || 0), 0);
    
    // Calculate recent claims (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentClaims = vineProducts.filter(p => {
      if (!p.lastClaimDate) return false;
      const claimDate = new Date(p.lastClaimDate);
      return claimDate >= sevenDaysAgo;
    }).reduce((sum, p) => sum + (p.recentClaims || 0), 0);
    
    // Calculate claim rate
    const totalEnrolled = vineProducts.reduce((sum, p) => sum + (p.enrolled || 0), 0);
    const claimRate = totalEnrolled > 0 ? Math.round((totalUnitsClaimed / totalEnrolled) * 100) : 0;

    return {
      activeVineProducts,
      totalUnitsClaimed,
      recentClaims,
      claimRate,
    };
  };

  const summaryValues = calculateSummaryValues();

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`}>
      <VineTrackerHeader
        onSearch={handleSearch}
        onNewVineClick={handleNewVine}
      />

      {/* Content */}
      <div style={{ padding: '1rem 2rem 2rem 2rem' }}>
        {loading && <div style={{ textAlign: 'center', padding: '2rem' }}>Loading vine products...</div>}
        {!loading && (
          <>
            <SummaryCards values={summaryValues} />
            <VineTrackerTable
              rows={vineProducts}
              searchValue={searchValue}
              onUpdateRow={handleUpdateRow}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default VineTracker;

