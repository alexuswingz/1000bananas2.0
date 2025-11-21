import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';

const LabelOrderPage = () => {
  const { isDarkMode } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const orderNumber = state.orderNumber || '2025-09-23';
  const supplier = state.supplier || { name: 'Richmark Label', logoSrc: '/assets/tricorbraun.png' };
  const mode = state.mode || 'create';
  const isCreateMode = mode === 'create';
  const isViewMode = mode === 'view' || mode === 'receive';
  const orderId = state.orderId || null;
  
  // Get lines from state (saved order lines when viewing, or all inventory when creating)
  const allLines = state.lines || [
    { id: 1, brand: 'TPS Plant F...', product: 'Cherry Tree...', size: '8oz', qty: 2000, labelStatus: 'Up to Date', inventory: 15000, toOrder: 5000 },
    { id: 2, brand: 'TPS Plant F...', product: 'Cherry Tree...', size: 'Quart', qty: 500, labelStatus: 'Needs Proofing', inventory: 8000, toOrder: 3000 },
    { id: 3, brand: 'TPS Plant F...', product: 'Cherry Tree...', size: 'Gallon', qty: 250, labelStatus: 'Needs Proofing', inventory: 5000, toOrder: 2000 },
  ];

  // Navigation tab state
  const [activeTab, setActiveTab] = useState('addProducts');
  const [tableMode, setTableMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Edit and change tracking state
  const [originalOrder, setOriginalOrder] = useState(null); // Store original order for comparison
  const [previousRecipients, setPreviousRecipients] = useState([]); // Store previous recipients
  const [isEditMode, setIsEditMode] = useState(false); // Track if we're editing an existing order
  const [selectedRecipients, setSelectedRecipients] = useState([]); // Selected recipients for update
  const [newRecipientEmail, setNewRecipientEmail] = useState(''); // New recipient email input
  const [currentRecipients, setCurrentRecipients] = useState([]); // Current recipients list

  // Initialize order lines - all items are available for selection
  const [orderLines, setOrderLines] = useState(() => {
    return allLines.map((line, index) => {
      const updatedLine = { ...line, added: false };
      // Ensure first 3 rows have correct sizes
      if (index === 0) updatedLine.size = '8oz';
      if (index === 1) updatedLine.size = 'Quart';
      if (index === 2) updatedLine.size = 'Gallon';
      return updatedLine;
    });
  });

  // Get added items for summary
  const addedLines = useMemo(() => {
    return orderLines.filter((line) => line.added);
  }, [orderLines]);

  // Filter lines based on search
  const filteredLines = useMemo(() => {
    if (!searchQuery.trim()) return orderLines;
    const query = searchQuery.toLowerCase();
    return orderLines.filter(
      (line) =>
        line.brand.toLowerCase().includes(query) ||
        line.product.toLowerCase().includes(query) ||
        line.size.toLowerCase().includes(query)
    );
  }, [orderLines, searchQuery]);

  // Calculate summary based on added items
  const summary = useMemo(() => {
    const totalLabels = addedLines.reduce((sum, line) => sum + (line.qty || 0), 0);
    return {
      products: addedLines.length,
      totalLabels,
      estCost: 0,
    };
  }, [addedLines]);

  // Initialize edit mode and store original order
  useEffect(() => {
    if (isViewMode && orderId && state.lines) {
      setIsEditMode(true);
      // Store original added lines for comparison
      const originalAdded = state.lines.filter(line => line.added !== false);
      setOriginalOrder({
        orderNumber,
        lines: originalAdded,
      });
      // Load previous recipients from localStorage or state
      const storedRecipients = localStorage.getItem(`labelOrder_${orderId}_recipients`);
      if (storedRecipients) {
        const recipients = JSON.parse(storedRecipients);
        setPreviousRecipients(recipients);
        setCurrentRecipients(recipients);
      }
    }
  }, [isViewMode, orderId, orderNumber, state.lines]);

  // Detect changes between original and current order
  const detectChanges = useMemo(() => {
    if (!isEditMode || !originalOrder) {
      return { hasChanges: false, changes: [] };
    }

    const originalLines = originalOrder.lines || [];
    const currentLines = addedLines;
    
    const changes = [];
    
    // Find added items
    currentLines.forEach(currentLine => {
      const originalLine = originalLines.find(orig => 
        orig.id === currentLine.id && 
        orig.brand === currentLine.brand && 
        orig.product === currentLine.product && 
        orig.size === currentLine.size
      );
      
      if (!originalLine) {
        changes.push({
          type: 'ADDED',
          line: currentLine,
          change: `Added new item: ${currentLine.brand} - ${currentLine.product} (${currentLine.size}) - Qty: ${currentLine.qty}`,
        });
      } else if (originalLine.qty !== currentLine.qty) {
        changes.push({
          type: 'MODIFIED',
          line: currentLine,
          original: originalLine,
          change: `Quantity changed: ${currentLine.brand} - ${currentLine.product} (${currentLine.size}) from ${originalLine.qty} to ${currentLine.qty}`,
        });
      }
    });
    
    // Find removed items
    originalLines.forEach(originalLine => {
      const currentLine = currentLines.find(curr => 
        curr.id === originalLine.id && 
        curr.brand === originalLine.brand && 
        curr.product === originalLine.product && 
        curr.size === originalLine.size
      );
      
      if (!currentLine) {
        changes.push({
          type: 'REMOVED',
          line: originalLine,
          change: `Removed: ${originalLine.brand} - ${originalLine.product} (${originalLine.size}) - Qty: ${originalLine.qty}`,
        });
      }
    });
    
    return {
      hasChanges: changes.length > 0,
      changes,
    };
  }, [isEditMode, originalOrder, addedLines]);

  // Timeline calculation helpers
  const getTimelineData = (inventory, toOrder) => {
    const today = new Date('2025-11-11');
    const doiGoal = new Date('2025-12-05');
    const totalDays = Math.ceil((doiGoal - today) / (1000 * 60 * 60 * 24));
    
    // Calculate proportions based on inventory and order quantities
    // Assuming a daily consumption rate, calculate how many days each covers
    const dailyRate = 100; // Simplified daily consumption
    const inventoryDays = Math.min(totalDays, Math.floor(inventory / dailyRate));
    const orderDays = Math.min(totalDays - inventoryDays, Math.floor(toOrder / dailyRate));
    
    // Calculate percentages for visual representation
    const totalCoverage = inventoryDays + orderDays;
    const inventoryPercent = totalCoverage > 0 ? (inventoryDays / totalDays) * 100 : 0;
    const orderPercent = totalCoverage > 0 ? (orderDays / totalDays) * 100 : 0;
    
    // Ensure percentages don't exceed 100% and maintain visual balance
    const maxPercent = Math.min(100, inventoryPercent + orderPercent);
    const scale = maxPercent > 0 ? 100 / maxPercent : 1;
    
    return {
      totalDays,
      inventoryDays,
      orderDays,
      inventoryPercent: Math.min(100, inventoryPercent * scale),
      orderPercent: Math.min(100 - inventoryPercent * scale, orderPercent * scale),
    };
  };

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    headerBg: isDarkMode ? 'bg-[#2C3544]' : 'bg-[#2C3544]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
    inputBorder: isDarkMode ? 'border-dark-border-primary' : 'border-gray-300',
    inputText: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
  };

  const handleBack = () => {
    navigate('/dashboard/supply-chain/labels');
  };

  const handleAddProduct = (id) => {
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, added: !line.added } : line
      )
    );
  };

  const handleQtyChange = (id, newQty) => {
    const numQty = parseInt(newQty) || 0;
    setOrderLines((prev) =>
      prev.map((line) =>
        line.id === id ? { ...line, qty: numQty } : line
      )
    );
  };

  const handleCompleteOrder = () => {
    if (addedLines.length === 0) {
      return;
    }
    
    setShowExportModal(true);
  };

  const handleExportCSV = () => {
    // Generate CSV file
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `TPS_LabelOrder_${orderNumber}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddRecipient = () => {
    if (newRecipientEmail.trim() && !currentRecipients.includes(newRecipientEmail.trim())) {
      const updatedRecipients = [...currentRecipients, newRecipientEmail.trim()];
      setCurrentRecipients(updatedRecipients);
      setNewRecipientEmail('');
    }
  };

  const handleRemoveRecipient = (email) => {
    setCurrentRecipients(currentRecipients.filter(r => r !== email));
    setSelectedRecipients(selectedRecipients.filter(r => r !== email));
  };

  const handleToggleRecipient = (email) => {
    if (selectedRecipients.includes(email)) {
      setSelectedRecipients(selectedRecipients.filter(r => r !== email));
    } else {
      setSelectedRecipients([...selectedRecipients, email]);
    }
  };

  const handleSendToRecipients = () => {
    // Generate CSV with changes
    const csvContent = generateCSV(true);
    
    // Send to selected recipients (in a real app, this would be an API call)
    selectedRecipients.forEach(email => {
      console.log(`Sending CSV to ${email}`);
      // In production, this would send an email with the CSV attachment
    });
    
    // Save recipients for future use
    if (orderId) {
      const allRecipients = [...new Set([...previousRecipients, ...currentRecipients])];
      localStorage.setItem(`labelOrder_${orderId}_recipients`, JSON.stringify(allRecipients));
      setPreviousRecipients(allRecipients);
    }
    
    alert(`CSV with changes has been sent to: ${selectedRecipients.join(', ')}`);
  };

  const handleDone = () => {
    // Save recipients if any were added
    if (currentRecipients.length > 0 && orderId) {
      const allRecipients = [...new Set([...previousRecipients, ...currentRecipients])];
      localStorage.setItem(`labelOrder_${orderId}_recipients`, JSON.stringify(allRecipients));
    }
    
    setShowExportModal(false);
    navigate('/dashboard/supply-chain/labels', {
      state: {
        newLabelOrder: {
          orderNumber: orderNumber,
          supplierName: supplier.name,
          lines: addedLines,
        },
      },
      replace: false,
    });
  };

  const generateCSV = (includeChanges = true) => {
    const headers = ['Brand', 'Product', 'Size', 'Quantity'];
    
    // Add change indicator column if in edit mode and has changes
    if (isEditMode && detectChanges.hasChanges && includeChanges) {
      headers.push('Change Status');
    }
    
    const rows = addedLines.map(line => {
      const row = [
        line.brand,
        line.product,
        line.size,
        line.qty || 0,
      ];
      
      // Add change indicator if in edit mode
      if (isEditMode && detectChanges.hasChanges && includeChanges) {
        const change = detectChanges.changes.find(c => 
          c.line.id === line.id && 
          c.line.brand === line.brand && 
          c.line.product === line.product && 
          c.line.size === line.size
        );
        
        if (change) {
          if (change.type === 'ADDED') {
            row.push('NEW - Added');
          } else if (change.type === 'MODIFIED') {
            row.push(`MODIFIED - Qty changed from ${change.original.qty} to ${line.qty}`);
          } else {
            row.push('UNCHANGED');
          }
        } else {
          row.push('UNCHANGED');
        }
      }
      
      return row;
    });
    
    // Add change summary at the top if there are changes
    let csvRows = [];
    if (isEditMode && detectChanges.hasChanges && includeChanges) {
      csvRows.push('"CHANGE SUMMARY"');
      csvRows.push(`"Total Changes: ${detectChanges.changes.length}"`);
      detectChanges.changes.forEach(change => {
        csvRows.push(`"${change.change}"`);
      });
      csvRows.push(''); // Empty row separator
      csvRows.push('"ORDER DETAILS"');
      csvRows.push(''); // Empty row separator
    }
    
    csvRows.push(headers.join(','));
    csvRows.push(...rows.map(row => row.map(cell => `"${cell}"`).join(',')));
    
    return csvRows.join('\n');
  };

  const renderLabelStatus = (status) => {
    // Always render something - if status is missing, show a default
    const statusValue = String(status || '').trim();
    const normalizedStatus = statusValue.toLowerCase();
    
    // Check for "Up to Date" status (case-insensitive, handles variations)
    if (normalizedStatus === 'up to date' || normalizedStatus === 'uptodate' || statusValue === 'Up to Date' || statusValue.includes('Up to Date') || statusValue.includes('up to date')) {
      return (
        <div 
          key={`status-badge-up-to-date-${statusValue}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            paddingTop: '4px',
            paddingRight: '12px',
            paddingBottom: '4px',
            paddingLeft: '12px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            boxSizing: 'border-box',
            width: '150px',
            height: '24px',
            lineHeight: '1',
            margin: 0,
            position: 'relative',
            zIndex: 10,
            visibility: 'visible',
            opacity: 1,
          }}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ 
              flexShrink: 0, 
              display: 'block',
              width: '16px',
              height: '16px',
              margin: 0,
            }}
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#10B981"/>
          </svg>
          <span style={{ 
            fontSize: '14px', 
            color: '#374151', 
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', 
            fontWeight: 400, 
            lineHeight: '16px', 
            whiteSpace: 'nowrap',
            margin: 0,
            padding: 0,
            display: 'inline-block',
            verticalAlign: 'middle',
          }}>
            Up to Date
          </span>
        </div>
      );
    } else if (normalizedStatus === 'needs proofing' || normalizedStatus === 'needsproofing' || statusValue === 'Needs Proofing') {
      return (
        <div 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            paddingTop: '4px',
            paddingRight: '12px',
            paddingBottom: '4px',
            paddingLeft: '12px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            boxSizing: 'border-box',
            width: '150px',
            height: '24px',
            lineHeight: '1',
            margin: 0,
            position: 'relative',
            zIndex: 10,
            visibility: 'visible',
            opacity: 1,
          }}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ 
              flexShrink: 0, 
              display: 'block',
              width: '16px',
              height: '16px',
              margin: 0,
            }}
          >
            <circle cx="12" cy="12" r="10" stroke="#F97316" strokeWidth="2" fill="none"/>
            <path d="M12 8v4M12 16h.01" stroke="#F97316" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span style={{ 
            fontSize: '14px', 
            color: '#374151', 
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', 
            fontWeight: 400, 
            lineHeight: '16px', 
            whiteSpace: 'nowrap',
            margin: 0,
            padding: 0,
            display: 'inline-block',
            verticalAlign: 'middle',
          }}>
            Needs Proofing
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-900">{statusValue || 'Unknown'}</span>
        </div>
      );
    }
  };

  // Helper function to determine if a tab is completed
  const isTabCompleted = (tabName) => {
    const tabOrder = ['addProducts', 'submitPO', 'receivePO'];
    const activeIndex = tabOrder.indexOf(activeTab);
    const tabIndex = tabOrder.indexOf(tabName);
    return tabIndex < activeIndex;
  };

  return (
    <div className={`min-h-screen p-8 ${themeClasses.pageBg}`} style={{ paddingBottom: '100px' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 2rem' }}>
        {/* Left side - Back button and Order Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleBack}
            style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#4B5563' : '#E5E7EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
            }}
          >
            <svg 
              style={{ width: '28px', height: '28px' }} 
              className={isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div className={`uppercase tracking-wide text-[10px] ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-400'}`}>
                LABEL ORDER #
              </div>
              <div className={`text-sm font-semibold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                {orderNumber}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div className={`uppercase tracking-wide text-[10px] ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-400'}`}>
                SUPPLIER
              </div>
              <div className={`text-sm font-semibold ${isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'}`}>
                {supplier.name}
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Settings */}
        <button
          type="button"
          style={{
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? '#4B5563' : '#E5E7EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
          }}
          aria-label="Settings"
        >
          <svg 
            style={{ width: '20px', height: '20px' }} 
            className={isDarkMode ? 'text-dark-text-primary' : 'text-gray-900'} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Separator */}
      <div className="border-t border-gray-200 mx-6"></div>

      {/* Navigation Tabs */}
      <div className={`${themeClasses.cardBg} border-b ${themeClasses.border}`}>
        <div className="flex items-center justify-between px-6">
          <div className="flex items-center gap-0">
            <button
              type="button"
              onClick={() => setActiveTab('addProducts')}
              className="flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all whitespace-nowrap"
              style={{
                color: activeTab === 'addProducts' ? '#3B82F6' : '#9CA3AF',
                backgroundColor: activeTab === 'addProducts' ? '#EFF6FF' : 'transparent',
                borderBottom: activeTab === 'addProducts' ? '2px solid #3B82F6' : 'none',
              }}
            >
              {/* Green circle for completed steps */}
              {isTabCompleted('addProducts') && (
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    flexShrink: 0,
                  }}
                />
              )}
              {/* White circle with outline for active step */}
              {activeTab === 'addProducts' && (
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #6B7280',
                    flexShrink: 0,
                  }}
                />
              )}
              <span>Add Products</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('submitPO')}
              className="flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all whitespace-nowrap"
              style={{
                color: activeTab === 'submitPO' ? '#3B82F6' : '#9CA3AF',
                backgroundColor: activeTab === 'submitPO' ? '#EFF6FF' : 'transparent',
                borderBottom: activeTab === 'submitPO' ? '2px solid #3B82F6' : 'none',
              }}
            >
              {/* Green circle for completed steps */}
              {isTabCompleted('submitPO') && (
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    flexShrink: 0,
                  }}
                />
              )}
              {/* White circle with outline for active step */}
              {activeTab === 'submitPO' && (
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #6B7280',
                    flexShrink: 0,
                  }}
                />
              )}
              <span>Submit PO</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('receivePO')}
              className="flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all whitespace-nowrap"
              style={{
                color: activeTab === 'receivePO' ? '#3B82F6' : '#9CA3AF',
                backgroundColor: activeTab === 'receivePO' ? '#EFF6FF' : 'transparent',
                borderBottom: activeTab === 'receivePO' ? '2px solid #3B82F6' : 'none',
              }}
            >
              {/* Green circle for completed steps */}
              {isTabCompleted('receivePO') && (
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    flexShrink: 0,
                  }}
                />
              )}
              {/* White circle with outline for active step */}
              {activeTab === 'receivePO' && (
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #6B7280',
                    flexShrink: 0,
                  }}
                />
              )}
              <span>Receive PO</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search bar - above table */}
      <div className="px-6 py-3 flex justify-end" style={{ marginTop: '16px' }}>
        <div className="relative" style={{ maxWidth: '300px', width: '100%' }}>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Table */}
      <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-lg`} style={{ marginTop: '16px' }}>
        <div className="overflow-x-auto">
          <table
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
            }}
          >
            <thead className={themeClasses.headerBg}>
              <tr style={{ height: '40px', maxHeight: '40px' }}>
              <th
                className="text-xs font-bold text-white uppercase tracking-wider"
                style={{
                  padding: '0 1rem',
                  height: '40px',
                  maxHeight: '40px',
                  lineHeight: '40px',
                  boxSizing: 'border-box',
                  textAlign: 'left',
                  borderRight: '1px solid #3C4656',
                  width: 220,
                }}
              >
                LABEL STATUS
              </th>
              <th
                className="text-xs font-bold text-white uppercase tracking-wider"
                style={{
                  padding: '0 1rem',
                  height: '40px',
                  maxHeight: '40px',
                  lineHeight: '40px',
                  boxSizing: 'border-box',
                  textAlign: 'left',
                  borderRight: '1px solid #3C4656',
                  width: 200,
                }}
              >
                BRAND
              </th>
              <th
                className="text-xs font-bold text-white uppercase tracking-wider"
                style={{
                  padding: '0 1rem',
                  height: '40px',
                  maxHeight: '40px',
                  lineHeight: '40px',
                  boxSizing: 'border-box',
                  textAlign: 'left',
                  borderRight: '1px solid #3C4656',
                  width: 200,
                }}
              >
                PRODUCT
              </th>
              <th
                className="text-xs font-bold text-white uppercase tracking-wider"
                style={{
                  padding: '0 1rem',
                  height: '40px',
                  maxHeight: '40px',
                  lineHeight: '40px',
                  boxSizing: 'border-box',
                  textAlign: 'left',
                  borderRight: '1px solid #3C4656',
                  width: 120,
                }}
              >
                SIZE
              </th>
              <th
                className="text-xs font-bold text-white uppercase tracking-wider relative"
                style={{
                  padding: '0 1rem',
                  height: '40px',
                  maxHeight: '40px',
                  lineHeight: '40px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  borderRight: '1px solid #3C4656',
                  width: 120,
                  boxShadow: 'inset 4px 0 4px -2px rgba(0, 0, 0, 0.3)',
                }}
              >
                ADD
              </th>
              <th
                className="text-xs font-bold text-white uppercase tracking-wider"
                style={{
                  padding: '0 1rem',
                  height: '40px',
                  maxHeight: '40px',
                  lineHeight: '40px',
                  boxSizing: 'border-box',
                  textAlign: 'center',
                  borderRight: '1px solid #3C4656',
                  width: 150,
                }}
              >
                QTY
              </th>
              <th
                className="text-xs font-bold text-white uppercase tracking-wider relative"
                style={{
                  padding: '0 1rem',
                  height: '40px',
                  maxHeight: '40px',
                  boxSizing: 'border-box',
                  textAlign: 'left',
                  verticalAlign: 'middle',
                  overflow: 'hidden',
                  position: 'relative',
                  minWidth: 400,
                }}
              >
                <div className="absolute inset-0" style={{ height: '40px', maxHeight: '40px' }}>
                  {/* Today label (top left) */}
                  <div className="absolute" style={{ left: '24px', top: '2px' }}>
                    <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
                      <span className="text-[9px] text-white" style={{ lineHeight: 1.1 }}>Today</span>
                      <span className="text-[9px] text-white mt-0.5" style={{ lineHeight: 1.1 }}>11/11/25</span>
                    </div>
                  </div>
                  
                  {/* DOI Goal label (top right) */}
                  <div className="absolute" style={{ right: '24px', top: '2px' }}>
                    <div className="flex flex-col items-end" style={{ lineHeight: 1.2 }}>
                      <span className="text-[9px] text-white" style={{ lineHeight: 1.1 }}>DOI Goal</span>
                      <span className="text-[9px] text-white mt-0.5" style={{ lineHeight: 1.1 }}>5/13/25</span>
                    </div>
                  </div>
                  
                  {/* Timeline line - thick white line in lower half */}
                  <div 
                    className="absolute bg-white" 
                    style={{ 
                      left: '24px', 
                      right: '24px', 
                      bottom: '6px',
                      height: '2px' 
                    }}
                  ></div>
                  
                  {/* Today marker (left) - solid white circle */}
                  <div className="absolute" style={{ left: '24px', bottom: '5px' }}>
                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                  </div>
                  
                  {/* Month markers - white circles with dark centers, evenly spaced */}
                  <div className="absolute" style={{ left: 'calc(24px + 20%)', bottom: '5px', transform: 'translateX(-50%)' }}>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-white mb-0.5" style={{ lineHeight: 1 }}>Dec</span>
                      <div className="w-2 h-2 rounded-full bg-white relative">
                        <div className="absolute inset-0.5 rounded-full" style={{ backgroundColor: '#2C3544' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute" style={{ left: 'calc(24px + 40%)', bottom: '5px', transform: 'translateX(-50%)' }}>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-white mb-0.5" style={{ lineHeight: 1 }}>Jan</span>
                      <div className="w-2 h-2 rounded-full bg-white relative">
                        <div className="absolute inset-0.5 rounded-full" style={{ backgroundColor: '#2C3544' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute" style={{ left: 'calc(24px + 60%)', bottom: '5px', transform: 'translateX(-50%)' }}>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-white mb-0.5" style={{ lineHeight: 1 }}>Feb</span>
                      <div className="w-2 h-2 rounded-full bg-white relative">
                        <div className="absolute inset-0.5 rounded-full" style={{ backgroundColor: '#2C3544' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="absolute" style={{ left: 'calc(24px + 80%)', bottom: '5px', transform: 'translateX(-50%)' }}>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-white mb-0.5" style={{ lineHeight: 1 }}>Mar</span>
                      <div className="w-2 h-2 rounded-full bg-white relative">
                        <div className="absolute inset-0.5 rounded-full" style={{ backgroundColor: '#2C3544' }}></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* DOI Goal marker (right) - solid white circle */}
                  <div className="absolute" style={{ right: '24px', bottom: '5px' }}>
                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLines.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-6 text-center text-sm italic text-gray-400">
                  No items available.
                </td>
              </tr>
            ) : (
              filteredLines.slice(0, 3).map((line, index) => {
                const timelineData = getTimelineData(line.inventory, line.toOrder);
                const displayedRows = filteredLines.slice(0, 3);
                
                return (
                  <tr 
                    key={line.id}
                    className={`text-sm ${themeClasses.rowHover} transition-colors border-t`}
                    style={{
                      height: '40px',
                      maxHeight: '40px',
                      minHeight: '40px',
                      lineHeight: '40px',
                      borderTop: index === 0 ? 'none' : (isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid #e5e7eb'),
                    }}
                  >
                    {/* LABEL STATUS */}
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', height: '40px', maxHeight: '40px', minHeight: '40px', verticalAlign: 'middle', lineHeight: '1', boxSizing: 'border-box' }}>
                      {renderLabelStatus(
                        index === 0 ? 'Up to Date' : 
                        index === 1 || index === 2 ? 'Needs Proofing' : 
                        line.labelStatus
                      )}
                    </td>

                    {/* BRAND */}
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', height: '40px', maxHeight: '40px', minHeight: '40px', verticalAlign: 'middle', lineHeight: '1', boxSizing: 'border-box' }} className={themeClasses.textPrimary}>
                      {line.brand}
                    </td>

                    {/* PRODUCT */}
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', height: '40px', maxHeight: '40px', minHeight: '40px', verticalAlign: 'middle', lineHeight: '1', boxSizing: 'border-box' }}>
                      <button
                        type="button"
                        className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
                        onClick={() => {
                          // Navigate to product detail if needed
                        }}
                      >
                        {line.product}
                      </button>
                    </td>

                    {/* SIZE */}
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', height: '40px', maxHeight: '40px', minHeight: '40px', verticalAlign: 'middle', lineHeight: '1', boxSizing: 'border-box' }} className={themeClasses.textSecondary}>
                      {line.size}
                    </td>

                    {/* ADD */}
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center', height: '40px', maxHeight: '40px', minHeight: '40px', verticalAlign: 'middle', lineHeight: '1', boxShadow: 'inset 4px 0 8px -4px rgba(0, 0, 0, 0.15)', boxSizing: 'border-box' }}>
                      <button
                        type="button"
                        onClick={() => handleAddProduct(line.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          backgroundColor: line.added ? '#22C55E' : '#3B82F6',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          paddingLeft: '12px',
                          paddingRight: '12px',
                          paddingTop: '4px',
                          paddingBottom: '4px',
                          fontSize: '14px',
                          fontWeight: 400,
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                          boxShadow: line.added ? '0 1px 2px 0 rgba(0, 0, 0, 0.1)' : 'none',
                          width: '72px',
                          height: '24px',
                          maxWidth: '72px',
                          maxHeight: '24px',
                          minWidth: '72px',
                          minHeight: '24px',
                          boxSizing: 'border-box',
                          lineHeight: '1',
                          overflow: 'hidden',
                          margin: 0,
                          verticalAlign: 'middle',
                        }}
                        onMouseEnter={(e) => {
                          if (!line.added) {
                            e.target.style.backgroundColor = '#2563EB';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = line.added ? '#22C55E' : '#3B82F6';
                        }}
                      >
                        {line.added ? (
                          <span style={{ color: '#ffffff', lineHeight: '1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Added</span>
                        ) : (
                          <>
                            <svg 
                              width="16" 
                              height="16" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{ color: '#ffffff', flexShrink: 0, display: 'block' }}
                            >
                              <path d="M12 4v16m8-8H4" />
                            </svg>
                            <span style={{ color: '#ffffff', lineHeight: '1', whiteSpace: 'nowrap' }}>Add</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* QTY */}
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center', height: '40px', maxHeight: '40px', minHeight: '40px', verticalAlign: 'middle', lineHeight: '1', boxSizing: 'border-box' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#ffffff',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          paddingTop: '4px',
                          paddingRight: '6px',
                          paddingBottom: '4px',
                          paddingLeft: '6px',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                          width: '107px',
                          height: '24px',
                          boxSizing: 'border-box',
                        }}
                      >
                        <input
                          type="number"
                          value={line.qty || 0}
                          onChange={(e) => handleQtyChange(line.id, e.target.value)}
                          onBlur={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            handleQtyChange(line.id, value);
                          }}
                          style={{ 
                            color: '#000000', 
                            fontSize: '14px', 
                            fontWeight: 400,
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            border: 'none',
                            background: 'transparent',
                            width: '100%',
                            textAlign: 'center',
                            outline: 'none',
                            padding: 0,
                            margin: 0,
                            MozAppearance: 'textfield',
                          }}
                          className="[&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          min="0"
                        />
                      </div>
                    </td>

                    {/* Timeline */}
                    <td style={{ padding: '0.65rem 1rem', minWidth: '380px', height: '40px', maxHeight: '40px', minHeight: '40px', verticalAlign: 'middle', lineHeight: '1', boxSizing: 'border-box' }}>
                      <div
                        style={{
                          width: '86%',
                          margin: '0 auto',
                          transform: 'translateX(-7px)',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            bottom: '-8px',
                            left: 0,
                            borderLeft: `2px dashed ${isDarkMode ? '#9CA3AF' : '#9CA3AF'}`,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            bottom: '-8px',
                            right: 0,
                            borderRight: `2px dashed ${isDarkMode ? '#9CA3AF' : '#9CA3AF'}`,
                          }}
                        />
                        <div
                          style={{
                            marginRight: index === 2 ? '30px' : index === 0 ? '-30px' : 0,
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              borderRadius: '9999px',
                              backgroundColor: isDarkMode ? '#020617' : '#F3F4F6',
                              overflow: 'hidden',
                              height: '18px',
                              display: 'flex',
                            }}
                          >
                            {timelineData.inventoryPercent > 0 && (
                              <div style={{ 
                                width: `${timelineData.inventoryPercent}%`,
                                backgroundColor: '#10B981',
                                minWidth: timelineData.inventoryPercent > 0 ? '2px' : '0',
                              }} />
                            )}
                            {timelineData.orderPercent > 0 && (
                              <div style={{ 
                                width: `${timelineData.orderPercent}%`,
                                backgroundColor: '#3B82F6',
                                minWidth: timelineData.orderPercent > 0 ? '2px' : '0',
                              }} />
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-2 flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }} />
          <span>Inventory</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3B82F6' }} />
          <span># to Order</span>
        </div>
      </div>

      {/* Footer - Sticky */}
      <div 
        className="fixed bottom-0 left-64 right-0 flex items-center justify-between bg-white border-t border-b border-gray-200 z-50"
        style={{ 
          padding: '16px 24px',
        }}
      >
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-gray-600 font-medium text-xs uppercase tracking-wide">PRODUCTS</span>
            <span className="text-gray-900 font-bold text-xl mt-1" style={{ color: '#1e293b' }}>{summary.products}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-600 font-medium text-xs uppercase tracking-wide">TOTAL LABELS</span>
            <span className="text-gray-900 font-bold text-xl mt-1" style={{ color: '#1e293b' }}>{summary.totalLabels.toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-600 font-medium text-xs uppercase tracking-wide">EST COST</span>
            <span className="text-gray-900 font-bold text-xl mt-1" style={{ color: '#1e293b' }}>${summary.estCost.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg px-4 py-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
          <button
            type="button"
            onClick={handleCompleteOrder}
            disabled={addedLines.length === 0}
            className="inline-flex items-center gap-2 text-xs font-semibold rounded-lg px-4 py-2 transition-colors"
            style={{
              backgroundColor: addedLines.length > 0 ? '#007AFF' : '#D1D5DB',
              color: addedLines.length > 0 ? '#FFFFFF' : '#374151',
              cursor: addedLines.length > 0 ? 'pointer' : 'not-allowed',
              opacity: addedLines.length > 0 ? 1 : 0.6,
            }}
            onMouseEnter={(e) => {
              if (addedLines.length > 0) {
                e.target.style.backgroundColor = '#0056CC';
              }
            }}
            onMouseLeave={(e) => {
              if (addedLines.length > 0) {
                e.target.style.backgroundColor = '#007AFF';
              } else {
                e.target.style.backgroundColor = '#D1D5DB';
              }
            }}
          >
            Complete Order
          </button>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '24px',
              width: '480px',
              maxWidth: '90vw',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#000000', margin: 0 }}>
                Export Label Order
              </h2>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#6B7280" />
                </svg>
              </button>
            </div>

            {/* Change Summary (if in edit mode with changes) */}
            {isEditMode && detectChanges.hasChanges && (
              <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#FEF3C7', borderRadius: '8px', border: '1px solid #FCD34D' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400E', marginBottom: '8px' }}>
                  Changes Detected ({detectChanges.changes.length})
                </div>
                <div style={{ fontSize: '12px', color: '#78350F' }}>
                  {detectChanges.changes.slice(0, 3).map((change, idx) => (
                    <div key={idx} style={{ marginBottom: '4px' }}>• {change.change}</div>
                  ))}
                  {detectChanges.changes.length > 3 && (
                    <div>... and {detectChanges.changes.length - 3} more changes</div>
                  )}
                </div>
              </div>
            )}

            {/* File Display */}
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                    stroke="#007AFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M14 2V8H20" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleExportCSV();
                  }}
                  style={{
                    color: '#007AFF',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  TPS_LabelOrder_{orderNumber}.csv
                </a>
              </div>
            </div>

            {/* Recipient Management */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#000000', marginBottom: '12px' }}>
                Share with Recipients
              </div>
              
              {/* Add New Recipient */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={newRecipientEmail}
                  onChange={(e) => setNewRecipientEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddRecipient();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddRecipient}
                  style={{
                    backgroundColor: '#007AFF',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Add
                </button>
              </div>

              {/* Previous Recipients (if in edit mode with changes) */}
              {isEditMode && detectChanges.hasChanges && previousRecipients.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>
                    Send Update To Previous Recipients:
                  </div>
                  {previousRecipients.map((email) => (
                    <div key={email} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(email)}
                        onChange={() => handleToggleRecipient(email)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '14px', color: '#374151', flex: 1 }}>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(email)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Current Recipients List */}
              {currentRecipients.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '8px' }}>
                    Recipients:
                  </div>
                  {currentRecipients.map((email) => (
                    <div key={email} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '8px', backgroundColor: '#F9FAFB', borderRadius: '6px' }}>
                      <span style={{ fontSize: '14px', color: '#374151', flex: 1 }}>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(email)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Send Update Button (if in edit mode with changes and recipients selected) */}
              {isEditMode && detectChanges.hasChanges && selectedRecipients.length > 0 && (
                <button
                  type="button"
                  onClick={handleSendToRecipients}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Send Update to {selectedRecipients.length} Recipient{selectedRecipients.length > 1 ? 's' : ''}
                </button>
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={handleExportCSV}
                style={{
                  backgroundColor: '#007AFF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0056CC'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#007AFF'}
              >
                Export as CSV
              </button>
              <button
                type="button"
                onClick={handleDone}
                style={{
                  backgroundColor: '#007AFF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#0056CC'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#007AFF'}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelOrderPage;

