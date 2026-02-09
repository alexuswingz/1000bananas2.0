import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const PackagingArchiveTable = ({ data = [], searchQuery = '' }) => {
  const { isDarkMode } = useTheme();
  const [actionMenuId, setActionMenuId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, right: 0 });
  const actionMenuRef = useRef(null);
  const actionButtonRefs = useRef({});
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  // Detect mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    rowHover: isDarkMode ? 'hover:bg-dark-bg-tertiary' : 'hover:bg-gray-50',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-white',
  };

  // Sample archive data matching the image
  const sampleArchiveData = [
    {
      id: 1,
      status: 'Done',
      dateComplete: '10-03-2025',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: '8oz',
      qty: 72000,
      caseNumber: 488,
      formula: 'F.Ultra Grow',
      labelLocation: 'LBL-PLANT-218',
    },
    {
      id: 2,
      status: 'Done',
      dateComplete: '10-03-2025',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: 'Quart',
      qty: 72000,
      caseNumber: 488,
      formula: 'F.Ultra Grow',
      labelLocation: 'LBL-PLANT-218',
    },
    {
      id: 3,
      status: 'Done',
      dateComplete: '10-03-2025',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
      formula: 'F.Ultra Grow',
      labelLocation: 'LBL-PLANT-218',
    },
    {
      id: 4,
      status: 'Done',
      dateComplete: '10-03-2025',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
      formula: 'F.Ultra Grow',
      labelLocation: 'LBL-PLANT-218',
    },
    {
      id: 5,
      status: 'Done',
      dateComplete: '10-03-2025',
      tpsShipNumber: '10-01-2025',
      type: 'AWD',
      brand: 'TPS Plant Foods',
      product: 'Cherry Tree Fertilizer',
      size: '1 Gallon',
      qty: 72000,
      caseNumber: 488,
      formula: 'F.Ultra Grow',
      labelLocation: 'LBL-PLANT-218',
    },
  ];

  const archiveData = data.length > 0 ? data : sampleArchiveData;

  useEffect(() => {
    if (actionMenuId === null) return;
    const handleClickOutside = (event) => {
      const menuElement = document.querySelector('[data-action-menu-portal]');
      const buttonElement = actionButtonRefs.current[actionMenuId];
      
      if (
        menuElement && !menuElement.contains(event.target) &&
        buttonElement && !buttonElement.contains(event.target)
      ) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuId]);

  const filteredData = archiveData.filter((row) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      row.product?.toLowerCase().includes(query) ||
      row.brand?.toLowerCase().includes(query) ||
      row.tpsShipNumber?.toLowerCase().includes(query) ||
      row.type?.toLowerCase().includes(query)
    );
  });

  const columns = [
    { key: 'status', label: 'STATUS', width: '140px' },
    { key: 'dateComplete', label: 'DATE COMPLETE', width: '140px' },
    { key: 'tpsShipNumber', label: 'TPS SHIP #', width: '140px' },
    { key: 'type', label: 'TYPE', width: '100px' },
    { key: 'brand', label: 'BRAND', width: '160px' },
    { key: 'product', label: 'PRODUCT', width: '200px' },
    { key: 'size', label: 'SIZE', width: '120px' },
    { key: 'qty', label: 'QTY', width: '140px' },
    { key: 'caseNumber', label: 'CASE #', width: '100px' },
    { key: 'actions', label: '', width: '60px' },
  ];

  // Mobile Card Layout
  if (isMobile) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '0 16px',
          paddingLeft: '16px',
          paddingRight: '16px',
          alignItems: 'stretch',
          backgroundColor: isDarkMode ? '#000000' : '#F3F4F6',
          minHeight: '100vh',
        }}
      >
        {filteredData.length === 0 ? (
          <div
            className={`px-6 py-6 text-center text-sm ${themeClasses.textSecondary}`}
          >
            No archived data available.
          </div>
        ) : (
          filteredData.map((row, index) => (
            <div
              key={row.id || index}
              data-mobile-card
              style={{
                width: '100%',
                minHeight: 'auto',
                padding: '16px',
                gap: '16px',
                borderRadius: '12px',
                border: row.isSplit 
                  ? `1px solid ${isDarkMode ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.3)'}`
                  : isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                backgroundColor: row.status === 'moved_s' || row.status === 'moved_fg'
                  ? '#F3F4F6'
                  : row.isSplit
                    ? isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)'
                    : isDarkMode ? '#1F2937' : '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                opacity: (row.status === 'moved_s' || row.status === 'moved_fg') ? 0.6 : 1,
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              {/* Three-dot menu button */}
              <button
                ref={(el) => {
                  if (el) actionButtonRefs.current[row.id] = el;
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const buttonRect = e.currentTarget.getBoundingClientRect();
                  const cardElement = e.currentTarget.closest('[data-mobile-card]');
                  const cardRect = cardElement?.getBoundingClientRect();
                  
                  const menuWidth = 200;
                  const menuHeight = 120;
                  
                  let menuTop = buttonRect.bottom + 8;
                  let menuLeft = cardRect ? cardRect.left + 16 : 16;
                  
                  const maxTop = window.innerHeight - menuHeight - 16;
                  if (menuTop > maxTop) {
                    menuTop = Math.max(buttonRect.top - menuHeight - 8, 60);
                  }
                  
                  const maxLeft = window.innerWidth - menuWidth - 16;
                  if (menuLeft > maxLeft) {
                    menuLeft = maxLeft;
                  }
                  
                  menuTop = Math.max(menuTop, 60);
                  menuLeft = Math.max(menuLeft, 16);
                  
                  const menuRight = window.innerWidth - (menuLeft + menuWidth);
                  
                  setActionMenuPosition({ top: menuTop, right: menuRight });
                  setActionMenuId(actionMenuId === row.id ? null : row.id);
                }}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '24px',
                  height: '24px',
                  padding: '0',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="4" r="1.5" fill={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                  <circle cx="10" cy="10" r="1.5" fill={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                  <circle cx="10" cy="16" r="1.5" fill={isDarkMode ? '#9CA3AF' : '#6B7280'} />
                </svg>
              </button>

              {/* Card Content - Image + Details */}
              <div style={{ display: 'flex', gap: '12px', flex: 1, alignItems: 'flex-start' }}>
                {/* Product Image Container */}
                <div 
                  style={{ 
                    flexShrink: 0,
                    position: 'relative',
                    width: '120px',
                    height: '160px',
                    borderRadius: '8px',
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {/* Product Image */}
                  <img
                    src="/assets/TPS_Cherry Tree_8oz_Wrap (1).png"
                    alt={row.product || 'Cherry Tree Fertilizer'}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  {/* Expand Icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle expand action if needed
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '24px',
                      height: '24px',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid #E5E7EB',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0,
                      zIndex: 2,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </button>
                </div>

                {/* Product Info */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0, padding: 0, margin: 0 }}>
                  {/* Title and Subtitle */}
                  <div style={{ display: 'block', position: 'relative', paddingRight: '32px', paddingLeft: 0, paddingTop: 0, paddingBottom: 0, margin: 0, width: '100%' }}>
                    <h3
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: isDarkMode ? '#F9FAFB' : '#111827',
                        margin: 0,
                        padding: 0,
                        marginBottom: '4px',
                        lineHeight: '1.3',
                        textAlign: 'left',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        width: '100%',
                        wordBreak: 'break-word',
                      }}
                    >
                      {row.product || 'Cherry Tree Fertilizer'}
                    </h3>
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: 400,
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                        margin: 0,
                        padding: 0,
                        textAlign: 'left',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        width: '100%',
                      }}
                    >
                      {row.brand || 'TPS Plant Foods'} • {row.size || '1 Gallon'}
                    </p>
                  </div>

                  {/* Product Details List */}
                  <div
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      width: '100%',
                      padding: 0,
                      margin: 0,
                    }}
                  >
                    <div style={{ textAlign: 'left', lineHeight: '1.5', width: '100%', display: 'block', marginBottom: '12px', padding: 0, marginLeft: 0, marginRight: 0, marginTop: 0 }}>
                      <span style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 400, display: 'inline' }}>Formula: </span>
                      <span style={{ color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 700, display: 'inline' }}>{row.formula || 'F.Ultra Grow'}</span>
                    </div>
                    <div style={{ textAlign: 'left', lineHeight: '1.5', width: '100%', display: 'block', marginBottom: '12px', padding: 0, marginLeft: 0, marginRight: 0 }}>
                      <span style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 400, display: 'inline' }}>TPS Ship #: </span>
                      <span style={{ color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 700, display: 'inline' }}>{row.tpsShipNumber || '10-01-2025'}</span>
                    </div>
                    {row.labelLocation && (
                      <div style={{ textAlign: 'left', lineHeight: '1.5', width: '100%', display: 'block', marginBottom: '12px', padding: 0, marginLeft: 0, marginRight: 0 }}>
                        <span style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 400, display: 'inline' }}>Label Location: </span>
                        <span style={{ color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 700, display: 'inline' }}>{row.labelLocation || 'LBL-PLANT-218'}</span>
                      </div>
                    )}
                    <div style={{ textAlign: 'left', lineHeight: '1.5', width: '100%', display: 'block', marginBottom: '12px', padding: 0, marginLeft: 0, marginRight: 0 }}>
                      <span style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 400, display: 'inline' }}>QTY: </span>
                      <span style={{ color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 700, display: 'inline' }}>{row.qty ? row.qty.toLocaleString() : '72,000'}</span>
                    </div>
                    {row.caseNumber && (
                      <div style={{ textAlign: 'left', lineHeight: '1.5', width: '100%', display: 'block', marginBottom: '0', padding: 0, marginLeft: 0, marginRight: 0 }}>
                        <span style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280', fontWeight: 400, display: 'inline' }}>Case #: </span>
                        <span style={{ color: isDarkMode ? '#F9FAFB' : '#111827', fontWeight: 700, display: 'inline' }}>{row.caseNumber || 488}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Done Button */}
              <button
                style={{
                  width: '100%',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0',
                  margin: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Done
              </button>
            </div>
          ))
        )}

        {/* Action Menu Portal - Mobile */}
        {actionMenuId && isMobile && (() => {
          const selectedRow = filteredData.find(r => r.id === actionMenuId);
          if (!selectedRow) return null;

          return createPortal(
            <div
              data-action-menu-portal
              style={{
                position: 'fixed',
                top: `${actionMenuPosition.top}px`,
                right: `${actionMenuPosition.right}px`,
                zIndex: 10000,
                minWidth: '200px',
                maxWidth: 'calc(100vw - 32px)',
                padding: '6px',
                backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: isDarkMode 
                  ? '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)'
                  : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.06)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActionMenuId(null)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#FFFFFF' : '#111827',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setActionMenuId(null)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#EF4444',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Delete</span>
              </button>
            </div>,
            document.body
          );
        })()}
      </div>
    );
  }

  // Desktop Table Layout
  return (
    <div
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
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Table header */}
      <div
        style={{ 
          backgroundColor: '#111827',
          width: '100%',
        }}
      >
        <div
          className="grid h-full"
          style={{
            gridTemplateColumns: columns.slice(0, -1).map((col) => col.width).join(' ') + ' 1fr',
            gap: '0',
            width: '100%',
            minWidth: '0',
          }}
        >
          {columns.map((column, idx) => (
            <div
              key={column.key}
              className="h-full text-xs font-bold uppercase tracking-wider flex items-center justify-center"
              style={{
                padding: '0.75rem 1.25rem',
                position: 'relative',
                borderRight: 'none',
                boxSizing: 'border-box',
              }}
            >
              {column.key === 'actions' ? (
                <div />
              ) : (
                <span
                  style={{
                    color: '#9CA3AF',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {column.label}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Table body */}
      <div className="w-full">
        {filteredData.length === 0 ? (
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: '#9CA3AF',
            }}
          >
            No archived data available.
          </div>
        ) : (
          filteredData.map((row, index) => (
            <React.Fragment key={row.id || index}>
              {/* Separator line above each row */}
              <div
                style={{
                  marginLeft: '1.25rem',
                  marginRight: '1.25rem',
                  height: '1px',
                  backgroundColor: '#374151',
                }}
              />
              <div
                className="grid hover:bg-gray-800 transition-colors"
                style={{
                  gridTemplateColumns: columns.slice(0, -1).map((col) => col.width).join(' ') + ' 1fr',
                  gap: '0',
                  borderBottom: 'none',
                  minHeight: '60px',
                  backgroundColor: '#111827',
                  width: '100%',
                  minWidth: '0',
                  fontSize: '12px',
                }}
              >
              {/* STATUS */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                }}
              >
                <span
                  className="text-xs font-semibold px-3 py-1 rounded"
                  style={{ 
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    borderRadius: '9999px',
                  }}
                >
                  {row.status || 'Done'}
                </span>
              </div>

              {/* DATE COMPLETE */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.dateComplete || '10-03-2025'}
              </div>

              {/* TPS SHIP # */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.tpsShipNumber || '10-01-2025'}
              </div>

              {/* TYPE */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.type || 'AWD'}
              </div>

              {/* BRAND */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.brand || 'TPS Plant Foods'}
              </div>

              {/* PRODUCT */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.product || 'Cherry Tree Fertilizer'}
              </div>

              {/* SIZE */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.size || '1 Gallon'}
              </div>

              {/* QTY */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                }}
              >
                <input
                  type="text"
                  defaultValue={row.qty?.toLocaleString() || '72,000'}
                  style={{
                    width: '100%',
                    maxWidth: '120px',
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    textAlign: 'center',
                    color: '#FFFFFF',
                    padding: '0.5rem',
                    fontSize: '12px',
                  }}
                  readOnly
                />
              </div>

              {/* CASE # */}
              <div
                className="flex items-center justify-center"
                style={{ 
                  padding: '0.75rem 1.25rem',
                  color: '#FFFFFF',
                }}
              >
                {row.caseNumber || 488}
              </div>

              {/* ACTIONS */}
              <div
                className="flex items-center justify-end relative action-menu-container"
                style={{ 
                  padding: '0.75rem 1.25rem',
                }}
              >
                <button
                  onClick={() => setActionMenuId(actionMenuId === row.id ? null : row.id)}
                  className="rounded transition-colors"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#374151'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  style={{
                    color: '#9CA3AF',
                    padding: '4px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '3px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="4" height="14" viewBox="0 0 4 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="2" cy="2" r="1.5" fill="currentColor" />
                    <circle cx="2" cy="7" r="1.5" fill="currentColor" />
                    <circle cx="2" cy="12" r="1.5" fill="currentColor" />
                  </svg>
                </button>
                {actionMenuId === row.id && (
                  <div
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '36px',
                      zIndex: 20,
                      width: '128px',
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '6px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
                      fontSize: '12px',
                      overflow: 'hidden',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setActionMenuId(null)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#374151';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionMenuId(null)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#EF4444',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#374151';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
};

export default PackagingArchiveTable;
