import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import ShipmentDetailsModal from './ShipmentDetailsModal';
import { getProductsInventory } from '../../../../services/productionApi';
import tpsForecastApi from '../../../../services/tpsForecastApi';

const PlanningTable = ({ rows, activeFilters, onFilterToggle, onRowClick, onLabelCheckClick, onStatusCommentClick, onStatusClick, onDeleteRow, onUpdateShipment, doiSettingsFromParent }) => {
  const { isDarkMode } = useTheme();
  const [openFilterColumn, setOpenFilterColumn] = useState(null);
  const filterIconRefs = useRef({});
  const filterDropdownRef = useRef(null);
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ field: '', order: '' });
  const [sortedRowOrder, setSortedRowOrder] = useState(null); // Store sorted row IDs for one-time sort
  const [addProductsFilterValues, setAddProductsFilterValues] = useState(new Set(['completed', 'pending', 'in progress'])); // Default: both Added and Not Added checked
  const [hoveredCommentId, setHoveredCommentId] = useState(null);
  const iconRefs = useRef({});
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [openActionMenu, setOpenActionMenu] = useState(null); // Track which row's menu is open
  const actionMenuRefs = useRef({});
  const actionMenuDropdownRef = useRef(null);
  const [showShipmentDetailsModal, setShowShipmentDetailsModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [requiredDOI, setRequiredDOI] = useState(130); // Required DOI filter (will be loaded from API)
  const [doiSettings, setDoiSettings] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track if this is the initial load

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#1C2634]',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
  };

  const columnBorderColor = isDarkMode ? 'rgba(55, 65, 81, 0.9)' : '#E5E7EB';

  // Load DOI settings from API on initial mount (only if not provided by parent)
  useEffect(() => {
    const loadDoiSettings = async () => {
      // If parent provides actual DOI settings (not null), don't load from API
      // Parent starts with null, so we load from API on initial mount
      if (doiSettingsFromParent && doiSettingsFromParent.amazon_doi_goal) {
        return;
      }
      
      try {
        // Use the same API URL as tpsForecastApi
        const USE_LOCAL_API = false;
        const LOCAL_API_URL = 'http://127.0.0.1:8000';
        const RAILWAY_API_URL = 'https://web-production-015c7.up.railway.app';
        const FORECAST_API_URL = USE_LOCAL_API ? LOCAL_API_URL : RAILWAY_API_URL;
        
        const response = await fetch(`${FORECAST_API_URL}/settings/doi`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const settings = {
            amazon_doi_goal: data.amazon_doi_goal || 93,
            inbound_lead_time: data.inbound_lead_time || 30,
            manufacture_lead_time: data.manufacture_lead_time || 7,
          };
          setDoiSettings(settings);
          // Calculate total required DOI: amazon_doi_goal + inbound_lead_time + manufacture_lead_time
          const totalRequiredDOI = settings.amazon_doi_goal + settings.inbound_lead_time + settings.manufacture_lead_time;
          setRequiredDOI(totalRequiredDOI);
        } else {
          // API returned error, use defaults
          const defaultSettings = {
            amazon_doi_goal: 93,
            inbound_lead_time: 30,
            manufacture_lead_time: 7,
          };
          setDoiSettings(defaultSettings);
          setRequiredDOI(130);
        }
      } catch (error) {
        console.error('Failed to load DOI settings:', error);
        // Use defaults if API fails
        const defaultSettings = {
          amazon_doi_goal: 93,
          inbound_lead_time: 30,
          manufacture_lead_time: 7,
        };
        setDoiSettings(defaultSettings);
        setRequiredDOI(130);
      }
    };
    loadDoiSettings();
  }, [doiSettingsFromParent]);

  // Handle DOI settings from parent (when user changes DOI in header popover)
  useEffect(() => {
    if (doiSettingsFromParent) {
      console.log('DOI settings received from parent:', doiSettingsFromParent);
      setDoiSettings(doiSettingsFromParent);
      const totalRequiredDOI = 
        (doiSettingsFromParent.amazon_doi_goal || 93) + 
        (doiSettingsFromParent.inbound_lead_time || 30) + 
        (doiSettingsFromParent.manufacture_lead_time || 7);
      setRequiredDOI(totalRequiredDOI);
    }
  }, [doiSettingsFromParent]);

  // Load products from Railway API - uses cached values by default, or recalculates instantly when DOI changes
  useEffect(() => {
    const loadProductsForDashboard = async () => {
      if (!doiSettings) return;
      
      setProductsLoading(true);
      try {
        let data;
        
        // If user has changed DOI settings (not initial load), use recalculate-doi endpoint for instant accurate results
        // Otherwise, use cached endpoint with default DOI values
        if (!isInitialLoad && doiSettingsFromParent) {
          console.log('Recalculating forecasts with new DOI settings (instant + accurate):', doiSettingsFromParent);
          data = await tpsForecastApi.getAllForecasts({
            amazon_doi_goal: doiSettingsFromParent.amazon_doi_goal,
            inbound_lead_time: doiSettingsFromParent.inbound_lead_time,
            manufacture_lead_time: doiSettingsFromParent.manufacture_lead_time,
          });
        } else {
          console.log('Loading cached forecasts (default DOI values)...');
          data = await tpsForecastApi.getAllForecasts();
        }
        
        setProducts(data.products || []);
        console.log('Loaded products for dashboard:', (data.products || []).length, 'source:', data.source);
        
        // Mark initial load as complete
        if (isInitialLoad) {
          setIsInitialLoad(false);
        }
      } catch (error) {
        console.error('Failed to load products for dashboard:', error);
      } finally {
        setProductsLoading(false);
      }
    };
    
    loadProductsForDashboard();
  }, [doiSettings, isInitialLoad, doiSettingsFromParent]);

  const isFilterActive = (key) => {
    // Check if there's an active filter for this column or if sorting is applied
    const hasFilter = filters[key] !== undefined;
    const hasSorting = sortConfig.field === key && sortConfig.order !== '';
    // For addProducts, check if filter values are not default (both checked)
    if (key === 'addProducts') {
      const defaultValues = new Set(['completed', 'pending', 'in progress']);
      const isDefault = addProductsFilterValues.size === defaultValues.size && 
        [...addProductsFilterValues].every(v => defaultValues.has(v));
      return !isDefault || hasFilter || hasSorting || activeFilters.includes(key);
    }
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
    // Base status from row field - normalize to lowercase and trim whitespace
    const baseStatus = (status || 'pending').toLowerCase().trim();
    
    let normalizedStatus = baseStatus;
    const workflowStatus = row?.workflowStatus; // e.g. 'label_check', 'formula_check', 'book_shipment', 'sort_products', 'sort_formulas'
    
    // FIRST: If status is "completed", always keep it as completed (comments don't override completion)
    // This must be checked FIRST to ensure completed status takes priority
    if (baseStatus === 'completed') {
      normalizedStatus = 'completed';
    }
    // SECOND: Check if it should be incomplete (only if not already completed)
    else {
      let shouldBeIncomplete = false;
      
      // Check if has comment (indicates incomplete, but only if not explicitly completed)
      if (hasComment && commentText) {
        shouldBeIncomplete = true;
      }
      
      // If it should be incomplete, override any other status
      if (shouldBeIncomplete) {
        normalizedStatus = 'incomplete';
      }
    }
    
    // THIRD: Apply workflow logic to determine "in progress" (only if not completed and not incomplete)
    if (normalizedStatus !== 'completed' && normalizedStatus !== 'incomplete' && workflowStatus) {
      // Derive "in progress" from the shipment's current workflow status
      // so that when you're actively working a step in New Shipment, Planning shows it as blue.
      if (
        (statusFieldName === 'addProducts' && workflowStatus === 'add_products') ||
        (statusFieldName === 'labelCheck' && workflowStatus === 'label_check') ||
        (statusFieldName === 'formulaCheck' && workflowStatus === 'formula_check') ||
        (statusFieldName === 'bookShipment' && workflowStatus === 'book_shipment') ||
        (statusFieldName === 'sortProducts' && workflowStatus === 'sort_products') ||
        (statusFieldName === 'sortFormulas' && workflowStatus === 'sort_formulas')
      ) {
        normalizedStatus = 'in progress';
      }
    }
    
    // Show comment icon if there's a comment (comments are now preserved even when completed)
    const shouldShowComment = hasComment && commentText;
    
    let circleColor;
    let borderStyle = 'none';

    // Special handling for addProducts: light blue when pending, regular blue when completed
    const isAddProducts = statusFieldName === 'addProducts';
    
    switch (normalizedStatus) {
      case 'pending':
        if (isAddProducts) {
          circleColor = '#3B82F6'; // Blue filled for addProducts pending (in progress)
          borderStyle = 'none';
        } else {
          circleColor = 'transparent'; // Transparent for pending
          borderStyle = '1px solid #FFFFFF'; // White outline
        }
        break;
      case 'in progress':
        circleColor = '#3B82F6'; // Blue filled for in progress
        borderStyle = 'none';
        break;
      case 'completed':
        circleColor = '#10B981'; // Green filled for completed
        borderStyle = 'none';
        break;
      case 'incomplete':
        circleColor = '#F59E0B'; // Orange filled for incomplete
        borderStyle = 'none';
        break;
      default:
        if (isAddProducts) {
          circleColor = '#3B82F6'; // Blue filled for addProducts default
          borderStyle = 'none';
        } else {
          circleColor = 'transparent'; // Default to transparent (Pending)
          borderStyle = '1px solid #FFFFFF'; // White outline
        }
    }

    // Status priority: Incomplete (orange) > Completed (green) > In Progress (blue) > Pending (white)
    // The incomplete check is now done at the beginning of the function, so we don't need to check again here

    // Create unique identifier for this status field in this row
    const uniqueCommentId = rowId && statusFieldName ? `${rowId}-${statusFieldName}` : null;
    const isHovered = hoveredCommentId === uniqueCommentId && shouldShowComment && commentText;
    const { commentDate, commentUser, commentUserInitials } = commentData;
    const userName = commentUser || 'User';
    const userInitials = commentUserInitials || 'U';
    const date = commentDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const handleIconClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // If has comment, show tooltip first (comments take priority over navigation)
      if (hasComment && commentText && uniqueCommentId) {
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
        return; // Don't navigate if there's a comment to show
      }
      
      // If status is completed and no comment, navigate to that section
      if (normalizedStatus === 'completed' && onStatusClick && rowId && statusFieldName && row) {
        onStatusClick(row, statusFieldName);
        return;
      }
    };

    // Determine if circle should be clickable (completed status, incomplete status, or has comment)
    const isClickable = normalizedStatus === 'completed' || normalizedStatus === 'incomplete' || (shouldShowComment && commentText);
    
    const handleIconHover = (e) => {
      // Show tooltip on hover if there's a comment
      if (hasComment && commentText && uniqueCommentId) {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltipPos({
          top: rect.bottom + window.scrollY + 12,
          left: rect.left + rect.width / 2 + window.scrollX,
        });
        setHoveredCommentId(uniqueCommentId);
      }
    };

    const handleIconLeave = () => {
      // Hide tooltip when mouse leaves
      if (hoveredCommentId === uniqueCommentId) {
        setHoveredCommentId(null);
      }
    };

    return (
      <div 
        data-status-circle="true"
        ref={(el) => { if (el && uniqueCommentId) iconRefs.current[uniqueCommentId] = el; }}
        style={{ 
          position: 'relative', 
          display: 'inline-block',
          cursor: isClickable ? 'pointer' : 'default'
        }}
        onClick={handleIconClick}
        onMouseEnter={handleIconHover}
        onMouseLeave={handleIconLeave}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: circleColor,
            border: borderStyle,
            display: 'inline-block',
            position: 'relative',
            boxSizing: 'border-box',
          }}
        >
          {shouldShowComment && (
            <img
              src="/assets/Vector (4).png"
              alt="Comment"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                width: '12px',
                height: '12px',
                objectFit: 'contain',
              }}
              onError={(e) => {
                // Fallback if image doesn't load - try URL encoded version
                e.target.src = '/assets/Vector%20(4).png';
              }}
            />
          )}
        </div>
        {/* Red notification dot for unread comments on incomplete status */}
        {normalizedStatus === 'incomplete' && shouldShowComment && commentText && (
          <div
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#EF4444',
              border: '1.5px solid #FFFFFF',
              boxSizing: 'border-box',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
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
    // Prepare filter values to use for sorting (use new values from config if provided, otherwise current state)
    const addProductsValuesToUse = filterConfig.addProductsFilterValues !== undefined 
      ? filterConfig.addProductsFilterValues 
      : addProductsFilterValues;
    
    const filtersToUse = { ...filters };
    if (filterConfig.filterField && filterConfig.filterCondition && filterConfig.filterValue) {
      const filterObj = {
        condition: filterConfig.filterCondition,
        value: filterConfig.filterValue,
      };
      // Include second value for between conditions
      if (filterConfig.filterValue2) {
        filterObj.value2 = filterConfig.filterValue2;
      }
      filtersToUse[filterConfig.filterField] = filterObj;
    }
    
    // Update sort config
    if (filterConfig.sortField && filterConfig.sortOrder) {
      setSortConfig({ field: filterConfig.sortField, order: filterConfig.sortOrder });
      
      // Perform one-time sort and store the order
      let rowsToSort = [...rows];
      
      // Apply addProducts filter first if needed
      if (addProductsValuesToUse.size > 0 && addProductsValuesToUse.size < 3) {
        rowsToSort = rowsToSort.filter(row => {
          const status = row.addProducts?.toLowerCase() || 'pending';
          return addProductsValuesToUse.has(status);
        });
      }
      
      // Apply other filters
      Object.keys(filtersToUse).forEach(field => {
        const filter = filtersToUse[field];
        rowsToSort = rowsToSort.filter(row => {
          const value = row[field];
          const filterValue = filter.value.toLowerCase();
          const rowValue = String(value || '').toLowerCase();

          switch (filter.condition) {
            case 'greaterThan':
              return rowValue > filterValue;
            case 'greaterThanOrEqual':
              return rowValue >= filterValue;
            case 'lessThan':
              return rowValue < filterValue;
            case 'lessThanOrEqual':
              return rowValue <= filterValue;
            case 'isEqual':
              return rowValue === filterValue;
            case 'isNotEqual':
              return rowValue !== filterValue;
            case 'isBetween':
              if (filter.value2) {
                const filterValue2 = filter.value2.toLowerCase();
                return rowValue >= filterValue && rowValue <= filterValue2;
              }
              return true;
            case 'isNotBetween':
              if (filter.value2) {
                const filterValue2 = filter.value2.toLowerCase();
                return !(rowValue >= filterValue && rowValue <= filterValue2);
              }
              return true;
            default:
              return true;
          }
        });
      });
      
      // Apply sorting
      rowsToSort.sort((a, b) => {
        // Special handling for timestamp sorting
        if (filterConfig.sortField === 'createdAt' && a.createdAt && b.createdAt) {
          const aDate = new Date(a.createdAt);
          const bDate = new Date(b.createdAt);
          return filterConfig.sortOrder === 'asc' 
            ? aDate - bDate 
            : bDate - aDate;
        }
        
        const aVal = String(a[filterConfig.sortField] || '').toLowerCase();
        const bVal = String(b[filterConfig.sortField] || '').toLowerCase();
        
        if (filterConfig.sortOrder === 'asc') {
          return aVal.localeCompare(bVal);
        } else {
          return bVal.localeCompare(aVal);
        }
      });
      
      // Store the sorted order (array of IDs)
      setSortedRowOrder(rowsToSort.map(row => row.id));
    } else {
      // If no sort is being applied, clear the sorted order (filters changed, need to re-sort)
      setSortedRowOrder(null);
    }
    
    // Update filters
    if (filterConfig.filterField && filterConfig.filterCondition && filterConfig.filterValue) {
      const filterObj = {
        condition: filterConfig.filterCondition,
        value: filterConfig.filterValue,
      };
      // Include second value for between conditions
      if (filterConfig.filterValue2) {
        filterObj.value2 = filterConfig.filterValue2;
      }
      setFilters(prev => ({
        ...prev,
        [filterConfig.filterField]: filterObj
      }));
      // If filters changed but sort wasn't reapplied, clear sorted order
      if (!filterConfig.sortField || !filterConfig.sortOrder) {
        setSortedRowOrder(null);
      }
    }

    // Update addProducts filter values if provided
    if (filterConfig.addProductsFilterValues !== undefined) {
      setAddProductsFilterValues(filterConfig.addProductsFilterValues);
      // If addProducts filter changed but sort wasn't reapplied, clear sorted order
      if (!filterConfig.sortField || !filterConfig.sortOrder) {
        setSortedRowOrder(null);
      }
    }
    
    setOpenFilterColumn(null);
  };

  // Handle filter reset
  const handleResetFilter = () => {
    setSortConfig({ field: '', order: '' });
    setSortedRowOrder(null); // Clear stored sorted order
    setFilters({});
    setAddProductsFilterValues(new Set(['completed', 'pending', 'in progress'])); // Reset to default
  };

  // Apply filters and sorting to rows
  const getFilteredAndSortedRows = () => {
    let filteredRows = [...rows];

    // Apply addProducts filter by values
    if (addProductsFilterValues.size > 0 && addProductsFilterValues.size < 3) {
      // Only filter if not all values are selected (default state)
      filteredRows = filteredRows.filter(row => {
        const status = row.addProducts?.toLowerCase() || 'pending';
        return addProductsFilterValues.has(status);
      });
    }

    // Apply other filters
    Object.keys(filters).forEach(field => {
      const filter = filters[field];
      filteredRows = filteredRows.filter(row => {
        const value = row[field];
        const filterValue = filter.value.toLowerCase();
        const rowValue = String(value || '').toLowerCase();

        switch (filter.condition) {
          case 'greaterThan':
            return rowValue > filterValue;
          case 'greaterThanOrEqual':
            return rowValue >= filterValue;
          case 'lessThan':
            return rowValue < filterValue;
          case 'lessThanOrEqual':
            return rowValue <= filterValue;
          case 'isEqual':
            return rowValue === filterValue;
          case 'isNotEqual':
            return rowValue !== filterValue;
          case 'isBetween':
            if (filter.value2) {
              const filterValue2 = filter.value2.toLowerCase();
              return rowValue >= filterValue && rowValue <= filterValue2;
            }
            return true;
          case 'isNotBetween':
            if (filter.value2) {
              const filterValue2 = filter.value2.toLowerCase();
              return !(rowValue >= filterValue && rowValue <= filterValue2);
            }
            return true;
          default:
            return true;
        }
      });
    });

    // Apply sorting - use stored sorted order if available (one-time sort)
    if (sortedRowOrder && sortedRowOrder.length > 0) {
      // Create a map for quick lookup
      const rowMap = new Map(filteredRows.map(row => [row.id, row]));
      
      // Order rows according to stored sorted order
      const orderedRows = [];
      const remainingRows = [];
      
      sortedRowOrder.forEach(id => {
        if (rowMap.has(id)) {
          orderedRows.push(rowMap.get(id));
          rowMap.delete(id);
        }
      });
      
      // Add any rows that weren't in the original sorted order (new rows)
      rowMap.forEach(row => {
        remainingRows.push(row);
      });
      
      // Sort remaining rows by default (newest first)
      remainingRows.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          const aDate = new Date(a.createdAt);
          const bDate = new Date(b.createdAt);
          return bDate - aDate; // Newest first
        }
        return (b.id || 0) - (a.id || 0);
      });
      
      // Combine: sorted rows first, then new rows (newest first)
      filteredRows = [...orderedRows, ...remainingRows];
    } else if (sortConfig.field && sortConfig.order) {
      // If sort config exists but no stored order, apply sorting (shouldn't happen normally, but fallback)
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

  // Fetch products inventory on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        const productsData = await getProductsInventory();
        setProducts(productsData || []);
      } catch (error) {
        console.error('Error fetching products inventory:', error);
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Clear sorted order when new shipments are added and ensure they're visible
  const prevRowsRef = useRef(rows);
  const tableContainerRef = useRef(null);
  useEffect(() => {
    const prevRowIds = new Set(prevRowsRef.current.map(r => r.id));
    
    // Check if there are new rows (rows in current but not in previous)
    const hasNewRows = rows.some(row => !prevRowIds.has(row.id));
    
    if (hasNewRows) {
      // Clear sorted order and sort config when new shipments are added so they appear with default sort (newest first)
      setSortedRowOrder(null);
      setSortConfig({ field: '', order: '' });
      
      // Scroll to top to show new shipment
      if (tableContainerRef.current) {
        tableContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    
    prevRowsRef.current = rows;
  }, [rows]);

  const displayRows = getFilteredAndSortedRows();
  
  // Debug: Log row count and new shipments
  useEffect(() => {
    console.log('Total rows:', rows.length, 'Display rows:', displayRows.length);
    if (rows.length > 0) {
      console.log('First row:', rows[0]);
      console.log('First display row:', displayRows[0]);
    }
  }, [rows, displayRows]);

  // Calculate card values based on Required DOI filter
  const calculateCardValues = () => {
    // Use requiredDOI from filter (default 130 days)
    const DOI_GOAL = requiredDOI;
    
    // Calculate products at risk (products with DOI < Required DOI)
    const productsAtRisk = products.filter(product => {
      const doi = product.doi_total_days || product.doi_total || product.days_of_inventory || 0;
      if (doi === 9999 || doi === null || doi === undefined || doi === 0) {
        return true;
      }
      return doi < DOI_GOAL;
    }).length;

    // Calculate critical and low risk products
    const criticalRisk = products.filter(product => {
      const doi = product.doi_total_days || product.doi_total || product.days_of_inventory || 0;
      return doi > 0 && doi < 7 && doi !== 9999;
    }).length;

    const lowRisk = products.filter(product => {
      const doi = product.doi_total_days || product.doi_total || product.days_of_inventory || 0;
      return doi >= 7 && doi < DOI_GOAL && doi !== 9999;
    }).length;

    // Calculate Total DOI across all products (weighted by inventory)
    const totalDOI = (() => {
      if (products.length === 0) return 0;
      
      // Sum total inventory across all products
      const totalInventory = products.reduce((sum, p) => {
        return sum + (p.total_inventory || p.totalInventory || p.fba_available || 0);
      }, 0);
      
      // Sum total daily sales velocity
      const totalDailySalesRate = products.reduce((sum, p) => {
        // Calculate daily sales from 30-day sales or use provided velocity
        const sales30 = p.sales_30_day || p.sales30Day || p.units_sold_30_days || 0;
        const dailySales = p.daily_sales_velocity || (sales30 > 0 ? sales30 / 30.0 : 0);
        return sum + dailySales;
      }, 0);
      
      // Total DOI = Total Inventory / Total Daily Sales Rate
      if (totalDailySalesRate > 0) {
        return Math.round(totalInventory / totalDailySalesRate);
      }
      
      return 0;
    })();

    // Calculate Units to Make based on Required DOI filter
    // Formula: For each product, units needed = (Required DOI * daily_sales) - current_inventory
    const unitsToMake = Math.round(products.reduce((sum, product) => {
      const currentInventory = product.total_inventory || product.totalInventory || product.fba_available || 0;
      const sales30 = product.sales_30_day || product.sales30Day || product.units_sold_30_days || 0;
      const dailySales = product.daily_sales_velocity || (sales30 > 0 ? sales30 / 30.0 : 0);
      
      if (dailySales > 0) {
        // Units needed to reach Required DOI
        const unitsNeeded = (DOI_GOAL * dailySales) - currentInventory;
        // Only count positive values (negative means we have enough)
        return sum + Math.max(0, unitsNeeded);
      }
      
      return sum;
    }, 0));
    
    // Calculate Pallets to Make based on calculated units to make
    const palletsToMake = (() => {
      let totalPallets = 0;
      
      products.forEach(product => {
        const currentInventory = product.total_inventory || product.totalInventory || product.fba_available || 0;
        const sales30 = product.sales_30_day || product.sales30Day || product.units_sold_30_days || 0;
        const dailySales = product.daily_sales_velocity || (sales30 > 0 ? sales30 / 30.0 : 0);
        
        if (dailySales > 0) {
          const unitsNeeded = (DOI_GOAL * dailySales) - currentInventory;
          
          if (unitsNeeded > 0) {
            const unitsPerCase = product.finished_units_per_case || product.units_per_case || 60;
            const boxesNeeded = unitsNeeded / unitsPerCase;
            
            let palletShare = 0;
            if (product.single_box_pallet_share && product.single_box_pallet_share > 0) {
              palletShare = boxesNeeded * product.single_box_pallet_share;
            } else if (product.boxes_per_pallet && product.boxes_per_pallet > 0) {
              palletShare = boxesNeeded / product.boxes_per_pallet;
            } else {
              palletShare = boxesNeeded / 50;
            }
            
            totalPallets += palletShare;
          }
        }
      });
      
      return Math.round(totalPallets * 10) / 10; // Round to 1 decimal
    })();
    
    return { totalDOI, unitsToMake, palletsToMake, productsAtRisk, criticalRisk, lowRisk };
  };

  const cardValues = calculateCardValues();

  return (
    <>
      {/* Required DOI Filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <label
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: isDarkMode ? '#E5E7EB' : '#374151',
          }}
        >
          Required DOI:
        </label>
        <input
          type="number"
          value={requiredDOI}
          onChange={(e) => {
            const newValue = parseInt(e.target.value) || 130;
            setRequiredDOI(newValue);
          }}
          style={{
            width: '80px',
            padding: '8px 12px',
            borderRadius: '6px',
            border: isDarkMode ? '1px solid #4B5563' : '1px solid #D1D5DB',
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            color: isDarkMode ? '#F9FAFB' : '#111827',
            fontSize: '14px',
            fontWeight: 500,
          }}
          min="1"
        />
        <span
          style={{
            fontSize: '12px',
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
          }}
        >
          days
        </span>
      </div>

      {/* Informational Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Total DOI Card */}
        <div
          style={{
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            borderRadius: '8px',
            border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            borderTop: '3px solid #10B981',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            Total DOI
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: isDarkMode ? '#F9FAFB' : '#111827',
            }}
          >
            {cardValues.totalDOI.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 400,
              color: '#10B981',
            }}
          >
            Across all products
          </div>
        </div>

        {/* Units to Make Card */}
        <div
          style={{
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            borderRadius: '8px',
            border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            borderTop: '3px solid #F59E0B',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            Units to Make
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: isDarkMode ? '#F9FAFB' : '#111827',
            }}
          >
            {cardValues.unitsToMake.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 400,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            Across all products
          </div>
        </div>

        {/* Pallets to Make Card */}
        <div
          style={{
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            borderRadius: '8px',
            border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            borderTop: '3px solid #06B6D4',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            Pallets to Make
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: isDarkMode ? '#F9FAFB' : '#111827',
            }}
          >
            {cardValues.palletsToMake.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 400,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            With Inventory
          </div>
        </div>

        {/* Products at Risk Card */}
        <div
          style={{
            backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
            borderRadius: '8px',
            border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            borderTop: '3px solid #EF4444',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            Products at Risk
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: isDarkMode ? '#F9FAFB' : '#111827',
            }}
          >
            {cardValues.productsAtRisk.toLocaleString()}
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 400,
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            {cardValues.productsAtRisk > 0 ? (
              <span>Below {requiredDOI} DOI</span>
            ) : (
              <span style={{ color: '#10B981' }}>All products healthy</span>
            )}
          </div>
        </div>
      </div>

      <div
        ref={tableContainerRef}
        className="border rounded-xl"
        style={{ 
          overflowX: 'hidden',
          overflowY: 'visible',
          position: 'relative',
          backgroundColor: '#111827',
          borderColor: '#111827',
          borderWidth: '1px',
          borderStyle: 'solid',
          minHeight: 'auto',
        }}
      >
        {/* Table with 100% width to fit container */}
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'auto', display: 'table' }}>
        <thead style={{ backgroundColor: '#111827' }}>
          <tr style={{ borderBottom: '1px solid #374151', height: 'auto' }}>
            <th
              className="text-center text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '1rem 1rem',
                width: '11%',
                height: 'auto',
                backgroundColor: '#111827',
                borderRight: 'none',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: (isFilterActive('status') || openFilterColumn === 'status') ? '#007AFF' : '#9CA3AF' }}>
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
              className="text-center text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '1rem 1rem',
                width: '13%',
                height: 'auto',
                backgroundColor: '#111827',
                borderRight: 'none',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: (isFilterActive('shipment') || openFilterColumn === 'shipment') ? '#007AFF' : '#9CA3AF' }}>
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
              className="text-center text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '1rem 1rem',
                width: '8%',
                height: 'auto',
                backgroundColor: '#111827',
                borderRight: 'none',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: (isFilterActive('marketplace') || openFilterColumn === 'marketplace') ? '#007AFF' : '#9CA3AF' }}>
                  TYPE
                </span>
                <svg
                  ref={(el) => { if (el) filterIconRefs.current['marketplace'] = el; }}
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={(isFilterActive('marketplace') || openFilterColumn === 'marketplace') ? '#007AFF' : '#9CA3AF'}
                  strokeWidth="2"
                  className={`transition-opacity cursor-pointer ${
                    (isFilterActive('marketplace') || openFilterColumn === 'marketplace')
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onClick={(e) => handleFilterClick('marketplace', e)}
                  style={{ cursor: 'pointer' }}
                >
                  <path d="M5 15l7-7 7 7" />
                </svg>
              </div>
            </th>
            <th
              className="text-center text-xs font-bold text-white uppercase tracking-wider group cursor-pointer"
              style={{
                padding: '1rem 1rem',
                width: '14%',
                height: 'auto',
                borderRight: 'none',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <span style={{ color: (isFilterActive('account') || openFilterColumn === 'account') ? '#007AFF' : '#9CA3AF' }}>
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
              onClick={(e) => {
                // Only open filter if clicking on header, not on filter icon
                if (!e.target.closest('img')) {
                  handleFilterClick('addProducts', e);
                }
              }}
              style={{
                padding: '1rem 0.75rem',
                width: '9%',
                height: 'auto',
                backgroundColor: '#111827',
                borderRight: 'none',
                boxSizing: 'border-box',
                position: 'relative',
                color: (isFilterActive('addProducts') || openFilterColumn === 'addProducts') ? '#007AFF' : '#9CA3AF',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 600, color: (isFilterActive('addProducts') || openFilterColumn === 'addProducts') ? '#007AFF' : '#9CA3AF' }}>ADD</span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: (isFilterActive('addProducts') || openFilterColumn === 'addProducts') ? '#007AFF' : '#9CA3AF' }}>PRODUCTS</span>
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
                padding: '1rem 0.75rem',
                width: '9%',
                height: 'auto',
                backgroundColor: '#111827',
                borderRight: 'none',
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 600, color: '#9CA3AF' }}>LABEL</span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: '#9CA3AF' }}>CHECK</span>
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
                padding: '1rem 0.75rem',
                width: '9%',
                height: 'auto',
                backgroundColor: '#111827',
                borderRight: 'none',
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 600, color: '#9CA3AF' }}>FORMULA</span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: '#9CA3AF' }}>CHECK</span>
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
                padding: '1rem 0.75rem',
                width: '9%',
                height: 'auto',
                backgroundColor: '#111827',
                borderRight: 'none',
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 600, color: '#9CA3AF' }}>BOOK</span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: '#9CA3AF' }}>SHIPMENT</span>
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
                padding: '1rem 0.75rem',
                width: '9%',
                height: 'auto',
                backgroundColor: '#111827',
                borderRight: 'none',
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 600, color: '#9CA3AF' }}>SORT</span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: '#9CA3AF' }}>PRODUCTS</span>
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
                padding: '1rem 0.75rem',
                width: '9%',
                height: 'auto',
                backgroundColor: '#111827',
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '1.1', gap: '1px' }}>
                <span style={{ fontSize: '9px', fontWeight: 600, color: '#9CA3AF' }}>SORT</span>
                <span style={{ fontSize: '9px', fontWeight: 600, color: '#9CA3AF' }}>FORMULAS</span>
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
                padding: '1rem 0.75rem',
                width: '5%',
                height: 'auto',
                backgroundColor: '#111827',
                boxSizing: 'border-box',
              }}
            >
            </th>
          </tr>
        </thead>
        <tbody
          style={{ borderColor: '#374151', display: 'table-row-group' }}
        >
          {displayRows.map((row, index) => (
            <React.Fragment key={row.id || row.shipment || `row-${index}`}>
              <tr
                onClick={(e) => {
                  // Don't navigate if clicking on label check cell
                  if (e.target.closest('td') && e.target.closest('td').getAttribute('data-label-check-cell')) {
                    return;
                  }
                  if (onRowClick) onRowClick(row);
                }}
                style={{
                  backgroundColor: '#111827',
                  height: 'auto',
                  minHeight: '40px',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'table-row',
                }}
                className="hover:bg-gray-800 transition-colors"
              >
                <td
                  style={{
                    padding: '0.75rem 1.25rem',
                    verticalAlign: 'middle',
                    backgroundColor: '#111827',
                    borderTop: 'none',
                    height: 'auto',
                    minHeight: '40px',
                    display: 'table-cell',
                  }}
                >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    backgroundColor: '#374151',
                    minWidth: '137px',
                    width: '100%',
                    maxWidth: '171.5px',
                    height: '24px',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onStatusClick) {
                      onStatusClick(row, 'status');
                    }
                  }}
                >
                  {renderStatusIcon(row.status)}
                  <span
                    style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 500, 
                      color: '#FFFFFF',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.status || 'Planning'}
                  </span>
                  <svg
                    style={{ width: '0.85rem', height: '0.85rem', marginLeft: 'auto' }}
                    fill="none"
                    stroke="#FFFFFF"
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
                  padding: '0.75rem 1.25rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: '#111827',
                  borderTop: 'none',
                  height: 'auto',
                  minHeight: '40px',
                  display: 'table-cell',
                }}
              >
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRowClick) onRowClick(row);
                  }}
                  style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: 500, 
                    color: '#3B82F6',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  {row.shipment || '2025.11.18'}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1.25rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: '#111827',
                  borderTop: 'none',
                  height: 'auto',
                  minHeight: '40px',
                  display: 'table-cell',
                }}
              >
                <span style={{ fontSize: '0.875rem', color: '#FFFFFF' }}>
                  {(() => {
                    // Prioritize shipment type fields over marketplace
                    const typeValue = (row.type || row.shipmentType || '').toLowerCase();
                    
                    // If type is found, format and return it
                    if (typeValue === 'fba') return 'FBA';
                    if (typeValue === 'awd') return 'AWD';
                    if (typeValue === 'hazmat') return 'Hazmat';
                    
                    // If no type field, try to extract from shipment number
                    const shipment = (row.shipment || '').toUpperCase();
                    if (shipment.includes('FBA')) return 'FBA';
                    if (shipment.includes('AWD')) return 'AWD';
                    if (shipment.includes('HAZMAT')) return 'Hazmat';
                    
                    // Default fallback
                    return 'AWD';
                  })()}
                </span>
              </td>
              <td
                style={{
                  padding: '0.75rem 1.25rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: '#111827',
                  borderTop: 'none',
                  height: 'auto',
                  minHeight: '40px',
                  display: 'table-cell',
                }}
              >
                <span style={{ fontSize: '0.875rem', color: '#FFFFFF' }}>
                  {row.account || 'TPS Nutrients'}
                </span>
              </td>
              <td
                style={{
                  padding: '1rem 1.25rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: '#111827',
                  borderTop: 'none',
                  height: 'auto',
                  minHeight: '40px',
                  display: 'table-cell',
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
                data-label-check-cell="true"
                style={{
                  padding: '1rem 1.25rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: '#111827',
                  borderTop: 'none',
                  height: 'auto',
                  cursor: onLabelCheckClick ? 'pointer' : 'default',
                  overflow: 'visible',
                  position: 'relative',
                }}
                onClick={async (e) => {
                  // Don't handle click if it's on the status circle (let the circle handle its own clicks)
                  if (e.target.closest('[data-status-circle]')) {
                    return;
                  }
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
                  padding: '1rem 1.25rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: '#111827',
                  borderTop: 'none',
                  height: 'auto',
                  minHeight: '40px',
                  display: 'table-cell',
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
                style={{
                  padding: '1rem 1.25rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: '#111827',
                  borderTop: 'none',
                  height: 'auto',
                  minHeight: '40px',
                  display: 'table-cell',
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
                  padding: '1rem 1.25rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: '#111827',
                  borderTop: 'none',
                  height: 'auto',
                  minHeight: '40px',
                  display: 'table-cell',
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
                  padding: '1rem 1.25rem',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  backgroundColor: '#111827',
                  borderTop: 'none',
                  height: 'auto',
                  minHeight: '40px',
                  display: 'table-cell',
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
                  textAlign: 'center',
                  backgroundColor: '#111827',
                  borderTop: 'none',
                  height: 'auto',
                  minHeight: '40px',
                  display: 'table-cell',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  ref={(el) => { if (el) actionMenuRefs.current[row.id || row.shipment || `row-${index}`] = el; }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const rowId = row.id || row.shipment || `row-${index}`;
                    setOpenActionMenu(openActionMenu === rowId ? null : rowId);
                  }}
                  className="hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '28px',
                    height: '28px',
                    borderRadius: '9999px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    color: '#9CA3AF',
                  }}
                  aria-label="Row actions"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="12" cy="18" r="1.5" fill="currentColor"/>
                  </svg>
                </button>
              </td>
            </tr>
              <tr style={{ height: '1px', backgroundColor: '#111827' }}>
                <td colSpan={11} style={{ padding: 0, backgroundColor: '#111827' }}>
                  <div
                    style={{
                      marginLeft: '1.25rem',
                      marginRight: '1.25rem',
                      height: '1px',
                      backgroundColor: '#374151',
                    }}
                  />
                </td>
              </tr>
            </React.Fragment>
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
          addProductsFilterValues={openFilterColumn === 'addProducts' ? addProductsFilterValues : undefined}
        />
      )}

      {/* Action Menu Dropdown */}
      {openActionMenu !== null && displayRows.find((row, idx) => {
        const rowId = row.id || row.shipment || `row-${idx}`;
        return rowId === openActionMenu;
      }) && (
        <ActionMenuDropdown
          ref={actionMenuDropdownRef}
          row={displayRows.find((row, idx) => {
            const rowId = row.id || row.shipment || `row-${idx}`;
            return rowId === openActionMenu;
          })}
          menuIconRef={actionMenuRefs.current[openActionMenu]}
          onClose={() => setOpenActionMenu(null)}
          onShipmentDetails={() => {
            const selectedRow = displayRows.find((row, idx) => {
              const rowId = row.id || row.shipment || `row-${idx}`;
              return rowId === openActionMenu;
            });
            setSelectedRow(selectedRow);
            setShowShipmentDetailsModal(true);
            setOpenActionMenu(null);
          }}
          onDelete={() => {
            const selectedRow = displayRows.find((row, idx) => {
              const rowId = row.id || row.shipment || `row-${idx}`;
              return rowId === openActionMenu;
            });
            if (onDeleteRow && selectedRow) {
              onDeleteRow(selectedRow);
            }
            setOpenActionMenu(null);
          }}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
    
    {/* Shipment Details Modal */}
    <ShipmentDetailsModal
      isOpen={showShipmentDetailsModal}
      onClose={() => {
        setShowShipmentDetailsModal(false);
        setSelectedRow(null);
      }}
      row={selectedRow}
      onUpdate={onUpdateShipment}
    />
    
    {/* Key/Legend - Outside table container */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        marginTop: '24px',
        justifyContent: 'flex-end',
        width: '100%',
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
            backgroundColor: '#F59E0B',
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
          Incomplete
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
const FilterDropdown = React.forwardRef(({ columnKey, filterIconRef, onClose, onApply, onReset, currentSort, currentFilters, isDarkMode, addProductsFilterValues: initialAddProductsFilterValues }, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [sortField, setSortField] = useState(currentSort?.field || '');
  const [sortOrder, setSortOrder] = useState(currentSort?.order || '');
  
  // Initialize filter fields from current filters if they exist
  const existingFilter = currentFilters ? Object.entries(currentFilters)[0] : null;
  const [filterField, setFilterField] = useState(existingFilter ? existingFilter[0] : '');
  const [filterCondition, setFilterCondition] = useState(existingFilter ? existingFilter[1].condition : '');
  const [filterValue, setFilterValue] = useState(existingFilter ? existingFilter[1].value : '');
  const [filterValue2, setFilterValue2] = useState(existingFilter ? existingFilter[1].value2 || '' : '');
  
  // State to control if "Filter by condition" section is expanded
  const [isFilterConditionOpen, setIsFilterConditionOpen] = useState(false);
  
  // For addProducts column: Filter by values
  const defaultAddProductsValues = new Set(['completed', 'pending', 'in progress']);
  const [addProductsFilterValues, setAddProductsFilterValues] = useState(
    initialAddProductsFilterValues || defaultAddProductsValues
  );

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
    setFilterValue2('');
    if (columnKey === 'addProducts') {
      setAddProductsFilterValues(defaultAddProductsValues);
    }
    if (onReset) {
      onReset();
    }
    onClose();
  };

  const handleLocalApply = () => {
    if (onApply) {
      const applyData = {
        sortField,
        sortOrder,
        filterField,
        filterCondition,
        filterValue,
      };
      // Include second value for between conditions
      if (filterCondition === 'isBetween' || filterCondition === 'isNotBetween') {
        applyData.filterValue2 = filterValue2;
      }
      if (columnKey === 'addProducts') {
        applyData.addProductsFilterValues = addProductsFilterValues;
      }
      onApply(applyData);
    }
    onClose();
  };

  const handleToggleAddProductsValue = (value) => {
    setAddProductsFilterValues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(value)) {
        newSet.delete(value);
      } else {
        newSet.add(value);
      }
      return newSet;
    });
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
    { value: 'labelCheck', label: 'Label Check' },
    { value: 'formulaCheck', label: 'Formula Check' },
    { value: 'bookShipment', label: 'Book Shipment' },
    { value: 'sortProducts', label: 'Sort Products' },
    { value: 'sortFormulas', label: 'Sort Formulas' },
  ];

  const filterConditions = [
    { value: '', label: 'Select condition' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'greaterThanOrEqual', label: 'Greater than or equal to' },
    { value: 'lessThan', label: 'Less than' },
    { value: 'lessThanOrEqual', label: 'Less than or equal to' },
    { value: 'isEqual', label: 'Is equal to' },
    { value: 'isNotEqual', label: 'Is not equal to' },
    { value: 'isBetween', label: 'Is between' },
    { value: 'isNotBetween', label: 'Is not between' },
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

      {/* Filter by values section (for addProducts column) */}
      {columnKey === 'addProducts' && (
        <div style={{ marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
            Filter by values:
          </label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '6px 0',
              }}
            >
              <input
                type="checkbox"
                checked={addProductsFilterValues.has('completed')}
                onChange={() => handleToggleAddProductsValue('completed')}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: '#3B82F6',
                }}
              />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Added</span>
            </label>
            
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                padding: '6px 0',
              }}
            >
              <input
                type="checkbox"
                checked={addProductsFilterValues.has('pending') && addProductsFilterValues.has('in progress')}
                onChange={() => {
                  const hasPending = addProductsFilterValues.has('pending');
                  const hasInProgress = addProductsFilterValues.has('in progress');
                  if (hasPending && hasInProgress) {
                    // Both checked, uncheck both
                    setAddProductsFilterValues(prev => {
                      const newSet = new Set(prev);
                      newSet.delete('pending');
                      newSet.delete('in progress');
                      return newSet;
                    });
                  } else {
                    // Check both
                    setAddProductsFilterValues(prev => {
                      const newSet = new Set(prev);
                      newSet.add('pending');
                      newSet.add('in progress');
                      return newSet;
                    });
                  }
                }}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: '#3B82F6',
                }}
              />
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Not Added</span>
            </label>
          </div>
        </div>
      )}

      {/* Filter by condition section */}
      {columnKey !== 'addProducts' && (
        <div style={{ marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: isFilterConditionOpen ? '12px' : '0',
              cursor: 'pointer',
            }}
            onClick={() => setIsFilterConditionOpen(!isFilterConditionOpen)}
          >
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', display: 'block' }}>
              Filter by condition:
            </label>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#374151"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isFilterConditionOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
          
          {isFilterConditionOpen && (
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
                onChange={(e) => {
                  setFilterCondition(e.target.value);
                  // Clear second value if condition is not between
                  if (e.target.value !== 'isBetween' && e.target.value !== 'isNotBetween') {
                    setFilterValue2('');
                  }
                }}
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
              
              <div style={{ position: 'relative', width: '100%' }}>
                <input
                  type="text"
                  placeholder="Value here..."
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    paddingRight: filterValue ? '32px' : '12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    color: '#374151',
                    backgroundColor: '#FFFFFF',
                    boxSizing: 'border-box',
                  }}
                />
                {filterValue && (
                  <button
                    type="button"
                    onClick={() => setFilterValue('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '16px',
                      height: '16px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '4px',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#9CA3AF';
                      e.currentTarget.style.backgroundColor = '#F3F4F6';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6B7280"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
              {(filterCondition === 'isBetween' || filterCondition === 'isNotBetween') && (
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    placeholder="Second value here..."
                    value={filterValue2}
                    onChange={(e) => setFilterValue2(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      paddingRight: filterValue2 ? '32px' : '12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                  {filterValue2 && (
                    <button
                      type="button"
                      onClick={() => setFilterValue2('')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '16px',
                        height: '16px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '4px',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#9CA3AF';
                        e.currentTarget.style.backgroundColor = '#F3F4F6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#D1D5DB';
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#6B7280"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
        <button
          type="button"
          onClick={handleLocalReset}
          style={{
            width: '57px',
            height: '23px',
            padding: '0',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            backgroundColor: '#FFFFFF',
            color: '#374151',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleLocalApply}
          style={{
            width: '57px',
            height: '23px',
            padding: '0',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
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
const ActionMenuDropdown = React.forwardRef(({ row, menuIconRef, onClose, onShipmentDetails, onDelete, isDarkMode }, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (menuIconRef) {
      const rect = menuIconRef.getBoundingClientRect();
      const dropdownWidth = 150;
      const dropdownHeight = 100;
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
          if (onShipmentDetails) {
            onShipmentDetails();
          }
        }}
        style={{
          padding: '8px 12px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: 'transparent',
          color: isDarkMode ? '#E5E7EB' : '#111827',
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
        Shipment Details
      </button>
      <div
        style={{
          height: '1px',
          backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
          margin: '4px 0',
        }}
      />
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