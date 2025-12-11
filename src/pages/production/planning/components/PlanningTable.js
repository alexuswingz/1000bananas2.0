import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const PlanningTable = ({ rows, activeFilters, onFilterToggle, onRowClick, onLabelCheckClick, onStatusCommentClick, onDeleteRow }) => {
  const { isDarkMode } = useTheme();
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ field: '', order: '' });
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const iconRefs = useRef({});
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [openActionMenu, setOpenActionMenu] = useState(null); // Track which row's menu is open
  const actionMenuRefs = useRef({});
  const actionMenuDropdownRef = useRef(null);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#1C2634]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  const columnBorderColor = isDarkMode ? 'rgba(55, 65, 81, 0.9)' : '#E5E7EB';

  const isFilterActive = (key) => {
    // Check if there's an active filter for this column or if sorting is applied
    const hasFilter = filters[key] !== undefined;
    const hasSorting = sortConfig.field === key && sortConfig.order !== '';
    return hasFilter || hasSorting || activeFilters.includes(key);
  };

  // Render status icon based on status
  const renderStatusIcon = (status) => {
    const statusLower = (status || 'Packaging').toLowerCase();
    switch (statusLower) {
      case 'packaging':
        // Planning icon image (reusing for Packaging)
        return (
          <img
            src="/assets/Planning icon.png"
            alt="Packaging"
            style={{
              width: '16px',
              height: '16px',
              objectFit: 'contain',
            }}
            onError={(e) => {
              // Fallback if image doesn't load - try URL encoded version
              e.target.src = '/assets/Planning%20icon.png';
            }}
          />
        );
      case 'ready for pickup':
        // Green box icon
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="6"
              y="6"
              width="12"
              height="12"
              rx="2"
              fill="#10B981"
            />
          </svg>
        );
      case 'shipped':
        // Purple truck icon
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1 3h15v13H1z"
              fill="#9333EA"
            />
            <path
              d="M16 8h4l3 4v5h-7V8z"
              fill="#9333EA"
            />
            <circle
              cx="6"
              cy="19"
              r="2.5"
              fill="#9333EA"
            />
            <circle
              cx="18"
              cy="19"
              r="2.5"
              fill="#9333EA"
            />
          </svg>
        );
      case 'received':
        // Green checkmark icon
        return (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="#10B981"
            />
            <path
              d="M9 12l2 2 4-4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  // Render status circle based on status
  const renderStatusCircle = (status, hasComment = false, commentText = '', rowId = null, commentData = {}, statusFieldName = null, row = null) => {
    const normalizedStatus = status?.toLowerCase();
    let circleColor;
    let borderStyle = 'none';

    switch (normalizedStatus) {
      case 'pending':
        circleColor = '#FFFFFF'; // White/transparent
        borderStyle = '1px solid #D1D5DB'; // Light gray outline
        break;
      case 'in progress':
        circleColor = '#3B82F6'; // Blue for in progress
        break;
      case 'completed':
        circleColor = '#10B981'; // Green
        break;
      default:
        circleColor = '#FFFFFF'; // Default to white (Pending)
        borderStyle = '1px solid #D1D5DB'; // Light gray outline
    }

    // Force orange when there's an outstanding comment on label or formula check
    // OR when status is pending (not completed) for label or formula check
    // But don't override if status is already completed (green)
    if ((statusFieldName === 'labelCheck' || statusFieldName === 'formulaCheck') && normalizedStatus !== 'completed') {
      if (hasComment || normalizedStatus === 'pending') {
        circleColor = '#F59E0B'; // Orange for comment/incomplete/pending
        borderStyle = 'none';
      }
    }

    // Create unique identifier for this status field in this row
    const uniqueCommentId = rowId && statusFieldName ? `${rowId}-${statusFieldName}` : null;
    const isHovered = hoveredCommentId === uniqueCommentId && hasComment && commentText;
    const { commentDate, commentUser, commentUserInitials } = commentData;
    const userName = commentUser || 'User';
    const userInitials = commentUserInitials || 'U';
    const date = commentDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const handleIconClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (hasComment && commentText && uniqueCommentId) {
        // If has comment, show tooltip
        if (hoveredCommentId === uniqueCommentId) {
          // If already showing, close it
          setHoveredCommentId(null);
        } else {
          // Calculate position and show tooltip
          const rect = e.currentTarget.getBoundingClientRect();
          setTooltipPos({
            top: rect.bottom + window.scrollY + 12,
            left: rect.left + rect.width / 2 + window.scrollX,
          });
          setHoveredCommentId(uniqueCommentId);
        }
      } else if (onStatusCommentClick && statusFieldName && row) {
        // If no comment, allow adding one by clicking the circle
        onStatusCommentClick(row, statusFieldName);
      }
    };

    return (
      <div 
        ref={(el) => { if (el && uniqueCommentId) iconRefs.current[uniqueCommentId] = el; }}
        style={{ 
          position: 'relative', 
          display: 'inline-block',
          cursor: (onStatusCommentClick && statusFieldName && row) || (hasComment && commentText) ? 'pointer' : 'default'
        }}
        onClick={handleIconClick}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '20px',
            backgroundColor: circleColor,
            border: borderStyle,
            display: 'inline-block',
          }}
        />
        {hasComment && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
        {isHovered && createPortal(
          <div
            data-comment-tooltip={uniqueCommentId}
            style={{
              position: 'fixed',
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.left}px`,
              transform: 'translateX(-50%)',
              width: '320px',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              padding: '16px',
              zIndex: 999999,
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: '1px solid #E5E7EB',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tooltip arrow pointing up */}
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: '8px solid #FFFFFF',
              }}
            />
            {/* Arrow border */}
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '9px solid transparent',
                borderRight: '9px solid transparent',
                borderBottom: '9px solid #E5E7EB',
                marginBottom: '-1px',
              }}
            />
            
            {/* Header with avatar, name, and date */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              marginBottom: '0',
              gap: '12px',
            }}>
              {/* Avatar */}
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {userInitials}
              </div>
              
              {/* Name, date, and comment text */}
              <div style={{ 
                flex: 1, 
                minWidth: 0,
              }}>
                {/* Name and date on same line */}
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexWrap: 'wrap',
                  marginBottom: '4px',
                }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#111827',
                    lineHeight: '1.4',
                  }}>
                    {userName}
                  </span>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 400, 
                    color: '#6B7280',
                    lineHeight: '1.4',
                  }}>
                    {date}
                  </span>
                </div>
                
                {/* Comment text below name/date */}
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 400, 
                  color: '#374151', 
                  lineHeight: '1.5', 
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                }}>
                  {commentText}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    if (hoveredCommentId) {
      const handleClickOutside = (e) => {
        // Check if click is outside the tooltip and icon
        const iconElement = iconRefs.current[hoveredCommentId];
        const tooltipElement = document.querySelector(`[data-comment-tooltip="${hoveredCommentId}"]`);
        
        if (iconElement && !iconElement.contains(e.target) && 
            tooltipElement && !tooltipElement.contains(e.target)) {
          setHoveredCommentId(null);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [hoveredCommentId]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumn !== null) {
        const filterIcon = filterIconRefs.current[openFilterColumn];
        const dropdown = filterDropdownRef.current;
        
        if (filterIcon && dropdown) {
          const isClickInsideIcon = filterIcon.contains(event.target);
          const isClickInsideDropdown = dropdown.contains(event.target);
          
          if (!isClickInsideIcon && !isClickInsideDropdown) {
            setOpenFilterColumn(null);
          }
        }
      }
    };

    if (openFilterColumn !== null) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterColumn]);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openActionMenu !== null) {
        const menuIcon = actionMenuRefs.current[openActionMenu];
        const dropdown = actionMenuDropdownRef.current;
        
        if (menuIcon && dropdown) {
          const isClickInsideIcon = menuIcon.contains(event.target);
          const isClickInsideDropdown = dropdown.contains(event.target);
          
          if (!isClickInsideIcon && !isClickInsideDropdown) {
            setOpenActionMenu(null);
          }
        }
      }
    };

    if (openActionMenu !== null) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openActionMenu]);

  // Handle filter icon click
  const handleFilterClick = (columnKey, e) => {
    e.stopPropagation();
    setOpenFilterColumn(openFilterColumn === columnKey ? null : columnKey);
  };

  // Handle filter apply
  const handleApplyFilter = (filterConfig) => {
    // Update sort config
    if (filterConfig.sortField && filterConfig.sortOrder) {
      setSortConfig({ field: filterConfig.sortField, order: filterConfig.sortOrder });
    }
    
    // Update filters
    if (filterConfig.filterField && filterConfig.filterCondition && filterConfig.filterValue) {
      setFilters(prev => ({
        ...prev,
        [filterConfig.filterField]: {
          condition: filterConfig.filterCondition,
          value: filterConfig.filterValue,
        }
      }));
    }
    
    setOpenFilterColumn(null);
  };

  // Handle filter reset
  const handleResetFilter = () => {
    setSortConfig({ field: '', order: '' });
    setFilters({});
  };

  // Apply filters and sorting to rows
  const getFilteredAndSortedRows = () => {
    let filteredRows = [...rows];

    // Apply filters
    Object.keys(filters).forEach(field => {
      const filter = filters[field];
      filteredRows = filteredRows.filter(row => {
        const value = row[field];
        const filterValue = filter.value.toLowerCase();
        const rowValue = String(value || '').toLowerCase();

        switch (filter.condition) {
          case 'equals':
            return rowValue === filterValue;
          case 'contains':
            return rowValue.includes(filterValue);
          case 'greaterThan':
            return rowValue > filterValue;
          case 'lessThan':
            return rowValue < filterValue;
          default:
            return true;
        }
      });
    });

    // Apply sorting
    if (sortConfig.field && sortConfig.order) {
      filteredRows.sort((a, b) => {
        // Special handling for timestamp sorting
        if (sortConfig.field === 'createdAt' && a.createdAt && b.createdAt) {
          const aDate = new Date(a.createdAt);
          const bDate = new Date(b.createdAt);
          return sortConfig.order === 'asc' 
            ? aDate - bDate 
            : bDate - aDate;
        }
        
        const aVal = String(a[sortConfig.field] || '').toLowerCase();
        const bVal = String(b[sortConfig.field] || '').toLowerCase();
        
        if (sortConfig.order === 'asc') {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });
    } else {
      // Default sort by created_at DESC (newest first) when no user sort is applied
      filteredRows.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          const aDate = new Date(a.createdAt);
          const bDate = new Date(b.createdAt);
          return bDate - aDate; // Newest first
        }
        // Fallback to ID if no timestamp
        return (b.id || 0) - (a.id || 0);
      });
    }

    return filteredRows;
  };

  const displayRows = getFilteredAndSortedRows();

  return (
    <>
      <div
        className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl`}
        style={{ overflowX: 'hidden', position: 'relative' }}
      >
        {/* Table with 100% width to fit container */}
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
        <thead className={themeClasses.headerBg}>
          <tr>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '0.75rem 1rem',
                width: '15%',
                height: '40px',
                backgroundColor: '#1C2634',
                borderRight: `1px solid ${columnBorderColor}`,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: (isFilterActive('status') || openFilterColumn === 'status') ? '#007AFF' : '#FFFFFF' }}>
                  STATUS
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['status'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('status') || openFilterColumn === 'status')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('status', e)}
                  style={
                    (isFilterActive('status') || openFilterColumn === 'status')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '0.75rem 1rem',
                width: '15%',
                height: '40px',
                backgroundColor: '#1C2634',
                borderRight: `1px solid ${columnBorderColor}`,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: (isFilterActive('shipment') || openFilterColumn === 'shipment') ? '#007AFF' : '#FFFFFF' }}>
                  SHIPMENT
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['shipment'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('shipment') || openFilterColumn === 'shipment')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('shipment', e)}
                  style={
                    (isFilterActive('shipment') || openFilterColumn === 'shipment')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '0.75rem 1rem',
                width: '12%',
                height: '40px',
                backgroundColor: '#1C2634',
                borderRight: `1px solid ${columnBorderColor}`,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: (isFilterActive('marketplace') || openFilterColumn === 'marketplace') ? '#007AFF' : '#FFFFFF' }}>
                  MARKETPLACE
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['marketplace'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('marketplace') || openFilterColumn === 'marketplace')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('marketplace', e)}
                  style={
                    (isFilterActive('marketplace') || openFilterColumn === 'marketplace')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
            <th
              className="text-left text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '0.75rem 1rem',
                width: '12%',
                height: '40px',
                borderRight: `1px solid ${columnBorderColor}`,
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: (isFilterActive('account') || openFilterColumn === 'account') ? '#007AFF' : '#FFFFFF' }}>
                  ACCOUNT
                </span>
                <img
                  ref={(el) => { if (el) filterIconRefs.current['account'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    (isFilterActive('account') || openFilterColumn === 'account')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('account', e)}
                  style={
                    (isFilterActive('account') || openFilterColumn === 'account')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined
                  }
                />
              </div>
            </th>
            <th
              className="text-center text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '0.5rem 1rem',
                width: '12%',
                height: '40px',
                backgroundColor: '#1C2634',
                borderRight: `1px solid #FFFFFF`,
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 600 }}>ADD</span>
                <span style={{ fontSize: '9px', fontWeight: 600 }}>PRODUCTS</span>
              </div>
              <img
                ref={(el) => { if (el) filterIconRefs.current['addProducts'] = el; }}
                src="/assets/Vector (1).png"
                alt="Filter"
                className={`w-3 h-3 transition-opacity cursor-pointer ${
                  (isFilterActive('addProducts') || openFilterColumn === 'addProducts')
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => handleFilterClick('addProducts', e)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '8px',
                  transform: 'translateY(-50%)',
                  ...((isFilterActive('addProducts') || openFilterColumn === 'addProducts')
                    ? {
                        filter:
                          'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                      }
                    : undefined)
                }}
              />
            </th>
            <th
              className="text-center text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '0.5rem 1rem',
                width: '12%',
                height: '40px',
                backgroundColor: '#1C2634',
                borderRight: `1px solid #FFFFFF`,
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 600 }}>FORMULA</span>
                <span style={{ fontSize: '9px', fontWeight: 600 }}>CHECK</span>
              </div>
                <img
                ref={(el) => { if (el) filterIconRefs.current['formulaCheck'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                  (isFilterActive('formulaCheck') || openFilterColumn === 'formulaCheck')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                onClick={(e) => handleFilterClick('formulaCheck', e)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '8px',
                  transform: 'translateY(-50%)',
                  ...((isFilterActive('formulaCheck') || openFilterColumn === 'formulaCheck')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                    : undefined)
                }}
                />
            </th>
            <th
              className="text-center text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '0.5rem 1rem',
                width: '12%',
                height: '40px',
                backgroundColor: '#1C2634',
                borderRight: `1px solid #FFFFFF`,
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 600 }}>LABEL</span>
                <span style={{ fontSize: '9px', fontWeight: 600 }}>CHECK</span>
              </div>
                <img
                ref={(el) => { if (el) filterIconRefs.current['labelCheck'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                  (isFilterActive('labelCheck') || openFilterColumn === 'labelCheck')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                onClick={(e) => handleFilterClick('labelCheck', e)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '8px',
                  transform: 'translateY(-50%)',
                  ...((isFilterActive('labelCheck') || openFilterColumn === 'labelCheck')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                    : undefined)
                }}
                />
            </th>
            <th
              className="text-center text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '0.5rem 1rem',
                width: '12%',
                height: '40px',
                backgroundColor: '#1C2634',
                borderRight: `1px solid #FFFFFF`,
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 600 }}>BOOK</span>
                <span style={{ fontSize: '9px', fontWeight: 600 }}>SHIPMENT</span>
              </div>
                <img
                ref={(el) => { if (el) filterIconRefs.current['bookShipment'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                  (isFilterActive('bookShipment') || openFilterColumn === 'bookShipment')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                onClick={(e) => handleFilterClick('bookShipment', e)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '8px',
                  transform: 'translateY(-50%)',
                  ...((isFilterActive('bookShipment') || openFilterColumn === 'bookShipment')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                    : undefined)
                }}
                />
            </th>
            <th
              className="text-center text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '0.5rem 1rem',
                width: '12%',
                height: '40px',
                backgroundColor: '#1C2634',
                borderRight: `1px solid #FFFFFF`,
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 600 }}>SORT</span>
                <span style={{ fontSize: '9px', fontWeight: 600 }}>PRODUCTS</span>
              </div>
                <img
                ref={(el) => { if (el) filterIconRefs.current['sortProducts'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                  (isFilterActive('sortProducts') || openFilterColumn === 'sortProducts')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                onClick={(e) => handleFilterClick('sortProducts', e)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '8px',
                  transform: 'translateY(-50%)',
                  ...((isFilterActive('sortProducts') || openFilterColumn === 'sortProducts')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                    : undefined)
                }}
                />
            </th>
            <th
              className="text-center text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '0.5rem 1rem',
                width: '12%',
                height: '40px',
                backgroundColor: '#1C2634',
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 600 }}>SORT</span>
                <span style={{ fontSize: '9px', fontWeight: 600 }}>FORMULAS</span>
              </div>
                <img
                ref={(el) => { if (el) filterIconRefs.current['sortFormulas'] = el; }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                  (isFilterActive('sortFormulas') || openFilterColumn === 'sortFormulas')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                onClick={(e) => handleFilterClick('sortFormulas', e)}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '8px',
                  transform: 'translateY(-50%)',
                  ...((isFilterActive('sortFormulas') || openFilterColumn === 'sortFormulas')
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                    : undefined)
                }}
                />
            </th>
            <th
              className="text-center text-white uppercase tracking-wider"
              style={{
                padding: '0.5rem 1rem',
                width: '40px',
                height: '40px',
                backgroundColor: '#1C2634',
                boxSizing: 'border-box',
              }}
            >
            </th>
          </tr>
        </thead>
        <tbody
          className="divide-y"
          style={{ borderColor: isDarkMode ? 'rgba(75, 85, 99, 0.3)' : '#f3f4f6' }}
        >
          {displayRows.map((row) => (
            <tr
              key={row.id}
              onClick={(e) => {
                // Don't navigate if clicking on label check cell
                if (e.target.closest('td') && e.target.closest('td').getAttribute('data-label-check-cell')) {
                  return;
                }
                if (onRowClick) onRowClick(row);
              }}
              style={{
                backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                height: '40px',
                cursor: 'pointer',
              }}
              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  borderTop: '1px solid #E5E7EB',
                  height: '40px',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#FFFFFF',
                    minWidth: '137px',
                    width: '100%',
                    maxWidth: '171.5px',
                    height: '24px',
                    boxSizing: 'border-box',
                  }}
                >
                  {renderStatusIcon(row.status)}
                  <span
                    style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 500, 
                      color: '#151515',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.status || 'Packaging'}
                  </span>
                  <svg
                    style={{ width: '0.85rem', height: '0.85rem', marginLeft: 'auto' }}
                    fill="none"
                    stroke="#9CA3AF"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  borderTop: '1px solid #E5E7EB',
                  height: '40px',
                }}
              >
                <span
                  className={themeClasses.text}
                  style={{ fontSize: '0.875rem', fontWeight: 500, color: isDarkMode ? '#FFFFFF' : '#151515' }}
                >
                  {row.shipment || '2025.11.18 AWD'}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  borderTop: '1px solid #E5E7EB',
                  height: '40px',
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.marketplace || 'Amazon'}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  borderTop: '1px solid #E5E7EB',
                  height: '40px',
                }}
              >
                <span className={themeClasses.textSecondary} style={{ fontSize: '0.875rem', color: isDarkMode ? '#FFFFFF' : '#151515' }}>
                  {row.account || 'TPS Nutrients'}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  borderTop: '1px solid #E5E7EB',
                  height: '40px',
                }}
              >
                {renderStatusCircle(
                  row.addProducts || 'pending',
                  !!row.addProductsComment,
                  row.addProductsCommentText || '',
                  row.id,
                  {
                    commentDate: row.addProductsCommentDate,
                    commentUser: row.addProductsCommentUser,
                    commentUserInitials: row.addProductsCommentUserInitials,
                  },
                  'addProducts',
                  row
                )}
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  borderTop: '1px solid #E5E7EB',
                  height: '40px',
                }}
              >
                {renderStatusCircle(
                  row.formulaCheck || 'pending',
                  !!row.formulaCheckComment,
                  row.formulaCheckCommentText || '',
                  row.id,
                  {
                    commentDate: row.formulaCheckCommentDate,
                    commentUser: row.formulaCheckCommentUser,
                    commentUserInitials: row.formulaCheckCommentUserInitials,
                  },
                  'formulaCheck',
                  row
                )}
              </td>
              <td
                data-label-check-cell="true"
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  borderTop: '1px solid #E5E7EB',
                  height: '40px',
                  cursor: onLabelCheckClick ? 'pointer' : 'default',
                  overflow: 'visible',
                  position: 'relative',
                }}
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (onLabelCheckClick) {
                    await onLabelCheckClick(row);
                  }
                }}
              >
                {renderStatusCircle(
                  row.labelCheck || 'pending', 
                  !!row.labelCheckComment, 
                  row.labelCheckCommentText || '', 
                  row.id,
                  {
                    commentDate: row.labelCheckCommentDate,
                    commentUser: row.labelCheckCommentUser,
                    commentUserInitials: row.labelCheckCommentUserInitials,
                  },
                  'labelCheck',
                  row
                )}
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  borderTop: '1px solid #E5E7EB',
                  height: '40px',
                }}
              >
                {renderStatusCircle(
                  row.bookShipment || 'pending',
                  !!row.bookShipmentComment,
                  row.bookShipmentCommentText || '',
                  row.id,
                  {
                    commentDate: row.bookShipmentCommentDate,
                    commentUser: row.bookShipmentCommentUser,
                    commentUserInitials: row.bookShipmentCommentUserInitials,
                  },
                  'bookShipment',
                  row
                )}
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  borderTop: '1px solid #E5E7EB',
                  height: '40px',
                }}
              >
                {renderStatusCircle(
                  row.sortProducts || 'pending',
                  !!row.sortProductsComment,
                  row.sortProductsCommentText || '',
                  row.id,
                  {
                    commentDate: row.sortProductsCommentDate,
                    commentUser: row.sortProductsCommentUser,
                    commentUserInitials: row.sortProductsCommentUserInitials,
                  },
                  'sortProducts',
                  row
                )}
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  borderTop: '1px solid #E5E7EB',
                  height: '40px',
                }}
              >
                {renderStatusCircle(
                  row.sortFormulas || 'pending',
                  !!row.sortFormulasComment,
                  row.sortFormulasCommentText || '',
                  row.id,
                  {
                    commentDate: row.sortFormulasCommentDate,
                    commentUser: row.sortFormulasCommentUser,
                    commentUserInitials: row.sortFormulasCommentUserInitials,
                  },
                  'sortFormulas',
                  row
                )}
              </td>
              <td
                style={{
                  padding: '0.75rem 1rem',
                  verticalAlign: 'middle',
                  backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
                  borderTop: '1px solid #E5E7EB',
                  height: '40px',
                  position: 'relative',
                }}
              >
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <svg
                    ref={(el) => { if (el) actionMenuRefs.current[row.id] = el; }}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                    strokeWidth="2"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenActionMenu(openActionMenu === row.id ? null : row.id);
                    }}
                  >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                  
                  {/* Action Menu Dropdown */}
                  {openActionMenu === row.id && (
                    <ActionMenuDropdown
                      ref={actionMenuDropdownRef}
                      row={row}
                      menuIconRef={actionMenuRefs.current[row.id]}
                      onClose={() => setOpenActionMenu(null)}
                      onDelete={() => {
                        if (onDeleteRow) {
                          onDeleteRow(row);
                        }
                        setOpenActionMenu(null);
                      }}
                      isDarkMode={isDarkMode}
                    />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Filter Dropdown */}
      {openFilterColumn !== null && (
        <FilterDropdown
          ref={filterDropdownRef}
          columnKey={openFilterColumn}
          filterIconRef={filterIconRefs.current[openFilterColumn]}
          onClose={() => setOpenFilterColumn(null)}
          onApply={handleApplyFilter}
          onReset={handleResetFilter}
          currentSort={sortConfig}
          currentFilters={filters}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
    
    {/* Key/Legend - Outside table container */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginTop: '24px',
      }}
    >
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: isDarkMode ? '#E5E7EB' : '#374151',
        }}
      >
        Key:
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '20px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            display: 'inline-block',
          }}
        />
        <span
          style={{
            fontSize: '14px',
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
          }}
        >
          Not Started
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '20px',
            backgroundColor: '#3B82F6',
            border: 'none',
            display: 'inline-block',
          }}
        />
        <span
          style={{
            fontSize: '14px',
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
          }}
        >
          In Progress
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '20px',
            backgroundColor: '#10B981',
            border: 'none',
            display: 'inline-block',
          }}
        />
        <span
          style={{
            fontSize: '14px',
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
          }}
        >
          Completed
        </span>
      </div>
    </div>
    </>
  );
};

// FilterDropdown Component
const FilterDropdown = React.forwardRef(({ columnKey, filterIconRef, onClose, onApply, onReset, currentSort, currentFilters, isDarkMode }, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [sortField, setSortField] = useState(currentSort?.field || '');
  const [sortOrder, setSortOrder] = useState(currentSort?.order || '');
  
  // Initialize filter fields from current filters if they exist
  const existingFilter = currentFilters ? Object.entries(currentFilters)[0] : null;
  const [filterField, setFilterField] = useState(existingFilter ? existingFilter[0] : '');
  const [filterCondition, setFilterCondition] = useState(existingFilter ? existingFilter[1].condition : '');
  const [filterValue, setFilterValue] = useState(existingFilter ? existingFilter[1].value : '');

  useEffect(() => {
    if (filterIconRef) {
      const rect = filterIconRef.getBoundingClientRect();
      const dropdownWidth = 320;
      const dropdownHeight = 400;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = rect.left;
      let top = rect.bottom + 8;
      
      // Adjust if dropdown goes off right edge
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 16;
      }
      
      // Adjust if dropdown goes off bottom
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 8;
      }
      
      // Don't go off left edge
      if (left < 16) {
        left = 16;
      }
      
      // Don't go off top edge
      if (top < 16) {
        top = 16;
      }
      
      setPosition({ top, left });
    }
  }, [filterIconRef]);

  const handleClear = () => {
    setSortField('');
    setSortOrder('');
  };

  const handleLocalReset = () => {
    setSortField('');
    setSortOrder('');
    setFilterField('');
    setFilterCondition('');
    setFilterValue('');
    if (onReset) {
      onReset();
    }
    onClose();
  };

  const handleLocalApply = () => {
    if (onApply) {
      onApply({
        sortField,
        sortOrder,
        filterField,
        filterCondition,
        filterValue,
      });
    }
    onClose();
  };

  const sortFields = [
    { value: 'status', label: 'Status' },
    { value: 'shipment', label: 'Shipment' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'account', label: 'Account' },
  ];

  const sortOrders = [
    { value: 'asc', label: 'Sort ascending (A to Z)', icon: 'A^Z' },
    { value: 'desc', label: 'Sort descending (Z to A)', icon: 'Z^A' },
  ];

  const filterFields = [
    { value: '', label: 'Select field' },
    { value: 'status', label: 'Status' },
    { value: 'shipment', label: 'Shipment' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'account', label: 'Account' },
    { value: 'addProducts', label: 'Add Products' },
    { value: 'formulaCheck', label: 'Formula Check' },
    { value: 'labelCheck', label: 'Label Check' },
    { value: 'bookShipment', label: 'Book Shipment' },
    { value: 'sortProducts', label: 'Sort Products' },
    { value: 'sortFormulas', label: 'Sort Formulas' },
  ];

  const filterConditions = [
    { value: '', label: 'Select condition' },
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'lessThan', label: 'Less than' },
  ];

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '320px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid #E5E7EB',
        zIndex: 10000,
        padding: '16px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Sort by section */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>
            Sort by:
          </label>
          <button
            type="button"
            onClick={handleClear}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#3B82F6',
              fontSize: '0.875rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Clear
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="">Select field</option>
            {sortFields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: sortOrder ? '1px solid #3B82F6' : '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <option value="">Select order</option>
            {sortOrders.map((order) => (
              <option key={order.value} value={order.value}>
                {order.icon} {order.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter by condition section */}
      <div style={{ marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
          Filter by condition:
        </label>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: filterField ? '#374151' : '#9CA3AF',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {filterFields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          
          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: filterCondition ? '#374151' : '#9CA3AF',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            {filterConditions.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </select>
          
          <input
            type="text"
            placeholder="Value here..."
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#374151',
              backgroundColor: '#FFFFFF',
            }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
        <button
          type="button"
          onClick={handleLocalReset}
          style={{
            padding: '8px 16px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            backgroundColor: '#FFFFFF',
            color: '#374151',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleLocalApply}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
});

FilterDropdown.displayName = 'FilterDropdown';

// ActionMenuDropdown Component
const ActionMenuDropdown = React.forwardRef(({ row, menuIconRef, onClose, onDelete, isDarkMode }, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (menuIconRef) {
      const rect = menuIconRef.getBoundingClientRect();
      const dropdownWidth = 150;
      const dropdownHeight = 50;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = rect.right + 8; // Position to the right of the icon
      let top = rect.top;
      
      // Adjust if dropdown goes off right edge
      if (left + dropdownWidth > viewportWidth) {
        left = rect.left - dropdownWidth - 8; // Position to the left instead
      }
      
      // Adjust if dropdown goes off bottom
      if (top + dropdownHeight > viewportHeight) {
        top = viewportHeight - dropdownHeight - 16;
      }
      
      // Don't go off left edge
      if (left < 16) {
        left = 16;
      }
      
      // Don't go off top edge
      if (top < 16) {
        top = 16;
      }
      
      setPosition({ top, left });
    }
  }, [menuIconRef]);

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '150px',
        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
        zIndex: 10001,
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm(`Are you sure you want to delete shipment "${row.shipment}"? This action cannot be undone.`)) {
            onDelete();
          }
        }}
        style={{
          padding: '8px 12px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#EF4444',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          transition: 'background-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        Delete
      </button>
    </div>,
    document.body
  );
});

ActionMenuDropdown.displayName = 'ActionMenuDropdown';

export default PlanningTable;