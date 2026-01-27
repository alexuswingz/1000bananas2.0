import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';

const VineDetailsModal = ({ isOpen, onClose, productData, onUpdateProduct, onAddClaim, onOpenAddClaimed }) => {
  const { isDarkMode } = useTheme();
  const [claimHistory, setClaimHistory] = useState([]);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, left: 0 });
  const actionButtonRefs = useRef({});
  const [editingClaimId, setEditingClaimId] = useState(null);
  const [editClaimDate, setEditClaimDate] = useState('');
  const [editClaimUnits, setEditClaimUnits] = useState('');
  const [editModalClaimId, setEditModalClaimId] = useState(null);
  const [editModalPosition, setEditModalPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && productData) {
      // Load claim history from productData or initialize empty
      const history = productData.claimHistory || [];
      setClaimHistory(history);
    }
  }, [isOpen, productData]);

  // Handle click outside to close action menu and edit modal
  useEffect(() => {
    if (!actionMenuId && !editModalClaimId) return;

    const handleClickOutside = (event) => {
      if (actionMenuId && !event.target.closest('[data-action-menu]') && !event.target.closest('[data-action-button]')) {
        setActionMenuId(null);
      }
      if (editModalClaimId && !event.target.closest('[data-edit-modal]') && !event.target.closest('[data-action-button]')) {
        setEditModalClaimId(null);
        setEditClaimDate('');
        setEditClaimUnits('');
      }
    };

    // Add a small delay before attaching the listener to prevent immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionMenuId, editModalClaimId]);

  if (!isOpen || !productData) return null;

  const themeClasses = {
    modalBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    overlayBg: isDarkMode ? 'bg-black/80' : 'bg-black/60',
    textPrimary: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    inputBg: isDarkMode ? 'bg-dark-bg-tertiary' : 'bg-gray-50',
    headerBg: isDarkMode ? 'bg-[#1F2937]' : 'bg-gray-100',
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // Try to parse as Date object first
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }
    
    // Handle MM/DD/YYYY format
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0]) - 1;
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        const parsedDate = new Date(year, month, day);
        if (!isNaN(parsedDate.getTime())) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${monthNames[parsedDate.getMonth()]} ${parsedDate.getDate()}, ${parsedDate.getFullYear()}`;
        }
      }
    }
    
    // Handle YYYY-MM-DD format (from date input)
    if (dateString.includes('-') && dateString.length === 10) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1;
        const day = parseInt(parts[2]);
        const parsedDate = new Date(year, month, day);
        if (!isNaN(parsedDate.getTime())) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${monthNames[parsedDate.getMonth()]} ${parsedDate.getDate()}, ${parsedDate.getFullYear()}`;
        }
      }
    }
    
    return dateString;
  };

  const handleDeleteClaim = (claimId) => {
    const claim = claimHistory.find(c => c.id === claimId);
    if (claim) {
      const updatedHistory = claimHistory.filter(c => c.id !== claimId);
      setClaimHistory(updatedHistory);

      if (onUpdateProduct) {
        const updatedProduct = {
          ...productData,
          claimHistory: updatedHistory,
          claimed: Math.max(0, (productData.claimed || 0) - claim.units),
        };
        onUpdateProduct(updatedProduct);
      }
    }
    setActionMenuId(null);
  };

  const handleActionButtonClick = (claimId, e, isPlusButton = false) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isPlusButton) {
      // Show popup modal for editing this claim
      const claim = claimHistory.find(c => c.id === claimId);
      if (claim) {
        // Convert date to YYYY-MM-DD format for date input
        let dateValue = '';
        if (claim.date) {
          // Try parsing the date
          const date = new Date(claim.date);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateValue = `${year}-${month}-${day}`;
          } else if (claim.date.includes('-') && claim.date.length === 10) {
            // Already in YYYY-MM-DD format
            dateValue = claim.date;
          } else {
            // Try to parse MM/DD/YYYY format
            const parts = claim.date.split('/');
            if (parts.length === 3) {
              const month = parts[0].padStart(2, '0');
              const day = parts[1].padStart(2, '0');
              const year = parts[2];
              dateValue = `${year}-${month}-${day}`;
            } else {
              dateValue = claim.date;
            }
          }
        }
        setEditClaimDate(dateValue);
        setEditClaimUnits(claim.units ? claim.units.toString() : '0');
        
        // Calculate modal position
        const buttonRect = e.currentTarget.getBoundingClientRect();
        const modalWidth = 400;
        const modalHeight = 250;
        
        let top = buttonRect.bottom + 8;
        let left = buttonRect.left;
        
        // Adjust if modal would go off screen
        if (top + modalHeight > window.innerHeight) {
          top = buttonRect.top - modalHeight - 8;
        }
        if (left + modalWidth > window.innerWidth) {
          left = window.innerWidth - modalWidth - 16;
        }
        
        setEditModalPosition({ top, left });
        setEditModalClaimId(claimId);
      }
      setActionMenuId(null);
    } else {
      // Show action menu
      const buttonRect = e.currentTarget.getBoundingClientRect();
      const menuWidth = 150;
      const menuHeight = 100;
      
      let top = buttonRect.bottom + 8;
      let left = buttonRect.left;
      
      // Adjust if menu would go off screen
      if (top + menuHeight > window.innerHeight) {
        top = buttonRect.top - menuHeight - 8;
      }
      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 16;
      }
      
      setActionMenuPosition({ top, left });
      setActionMenuId(actionMenuId === claimId ? null : claimId);
    }
  };

  const handleSaveEdit = (claimId) => {
    if (editClaimDate && editClaimUnits && parseInt(editClaimUnits) > 0) {
      const claim = claimHistory.find(c => c.id === claimId);
      if (claim) {
        const oldUnits = claim.units;
        const updatedHistory = claimHistory.map(c => 
          c.id === claimId 
            ? { ...c, date: editClaimDate, units: parseInt(editClaimUnits) }
            : c
        ).sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB - dateA; // Sort descending
        });

        setClaimHistory(updatedHistory);

        if (onUpdateProduct) {
          const updatedProduct = {
            ...productData,
            claimHistory: updatedHistory,
            claimed: (productData.claimed || 0) - oldUnits + parseInt(editClaimUnits),
          };
          onUpdateProduct(updatedProduct);
        }
      }
    }
    setEditingClaimId(null);
    setEditModalClaimId(null);
    setEditClaimDate('');
    setEditClaimUnits('');
  };

  const handleCancelEdit = () => {
    setEditingClaimId(null);
    setEditModalClaimId(null);
    setEditClaimDate('');
    setEditClaimUnits('');
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '600px',
          height: 'auto',
          borderRadius: '12px',
          border: '1px solid #111827',
          backgroundColor: '#111827',
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            width: '600px',
            height: '52px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid #374151',
            backgroundColor: '#111827',
            boxSizing: 'border-box',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#FFFFFF' }}>Vine Details</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9CA3AF';
            }}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem', overflow: 'visible', flex: 1, minHeight: 0, backgroundColor: '#111827', display: 'flex', flexDirection: 'column' }}>
          {/* Product Info */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Product Image */}
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '8px',
                backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {productData.imageUrl ? (
                <img
                  src={productData.imageUrl}
                  alt={productData.productName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              )}
            </div>

            {/* Product Details */}
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                {productData.productName || 'N/A'}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                {productData.brand && (
                  <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{productData.brand}</span>
                )}
                {productData.size && (
                  <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{productData.size}</span>
                )}
                {productData.asin && (
                  <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{productData.asin}</span>
                )}
                {productData.launchDate && (
                  <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                    Launched: {formatDate(productData.launchDate)}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  width: '63px',
                  height: '19px',
                  paddingTop: '6px',
                  paddingRight: '16px',
                  paddingBottom: '6px',
                  paddingLeft: '16px',
                  borderRadius: '4px',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: '#10B981',
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  boxSizing: 'border-box',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                }}
              >
                Active
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem', flexShrink: 0 }}>
            <div
              style={{
                width: '276px',
                height: '87px',
                paddingTop: '12px',
                paddingRight: '16px',
                paddingBottom: '12px',
                paddingLeft: '16px',
                borderRadius: '8px',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: '#374151',
                backgroundColor: '#0F172A',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Units Enrolled</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#FFFFFF', lineHeight: '1' }}>
                {productData.enrolled || 0}
              </div>
            </div>
            <div
              style={{
                width: '276px',
                height: '87px',
                paddingTop: '12px',
                paddingRight: '16px',
                paddingBottom: '12px',
                paddingLeft: '16px',
                borderRadius: '8px',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: '#374151',
                backgroundColor: '#0F172A',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Claimed</div>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#007AFF', lineHeight: '1' }}>
                {productData.claimed || 0}
              </div>
            </div>
          </div>

          {/* Claim History */}
          <div style={{ flex: 'none', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0 }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF' }}>Claim History</h4>
              {onOpenAddClaimed && (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onClose();
                    if (onOpenAddClaimed) {
                      onOpenAddClaimed(productData);
                    }
                  }}
                  style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#3B82F6',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#2563EB';
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#3B82F6';
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  + Add Claim Entry
                </span>
              )}
            </div>

            <div
              style={{
                width: '100%',
                border: '1px solid #374151',
                borderRadius: '12px',
                paddingTop: '24px',
                paddingRight: '16px',
                paddingBottom: '12px',
                paddingLeft: '16px',
                boxSizing: 'border-box',
                overflow: 'hidden',
                backgroundColor: '#111827',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '60%' }} />
                  <col style={{ width: '40%' }} />
                </colgroup>
                <tbody>
                  {claimHistory.length > 0 && claimHistory.map((claim, index) => (
                    <tr
                      key={claim.id}
                      style={{
                        backgroundColor: '#111827',
                        borderBottom: index < claimHistory.length - 1 ? '1px solid #374151' : 'none',
                      }}
                    >
                      <td
                        style={{ 
                          padding: '0.75rem 1rem', 
                          fontSize: '0.875rem',
                          color: '#FFFFFF',
                          textAlign: 'left',
                          width: '60%',
                          boxSizing: 'border-box',
                        }}
                      >
                        {formatDate(claim.date)}
                      </td>
                      <td
                        style={{ 
                          padding: '0.75rem 1rem', 
                          fontSize: '0.875rem',
                          color: '#FFFFFF',
                          textAlign: 'left',
                          width: '40%',
                          boxSizing: 'border-box',
                        }}
                      >
                        {claim.units}
                      </td>
                    </tr>
                  ))}
                  {claimHistory.length === 0 && (
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
                        No claim history yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Action Menu Popup */}
      {actionMenuId && createPortal(
        <div
          data-action-menu
          style={{
            position: 'fixed',
            top: `${actionMenuPosition.top}px`,
            left: `${actionMenuPosition.left}px`,
            zIndex: 1001,
            minWidth: '150px',
            padding: '8px',
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ color: '#FFFFFF', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px', borderBottom: '1px solid #374151', marginBottom: '4px' }}>
            ACTIONS
          </div>
          <button
            onClick={() => {
              const claim = claimHistory.find(c => c.id === actionMenuId);
              if (claim) {
                handleDeleteClaim(actionMenuId);
              }
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span>Delete</span>
          </button>
        </div>,
        document.body
      )}

      {/* Edit Claim Modal Popup */}
      {editModalClaimId && createPortal(
        <div
          data-edit-modal
          style={{
            position: 'fixed',
            top: `${editModalPosition.top}px`,
            left: `${editModalPosition.left}px`,
            zIndex: 10002,
            width: '400px',
            padding: '1.5rem',
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 style={{ color: '#FFFFFF', fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            Edit Claim Entry
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', color: '#9CA3AF', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Date Claimed
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="date"
                  value={editClaimDate}
                  onChange={(e) => setEditClaimDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    paddingLeft: '2.5rem',
                    fontSize: '0.875rem',
                    color: '#FFFFFF',
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                />
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="2"
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                  }}
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', color: '#9CA3AF', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                Units
              </label>
              <input
                type="number"
                value={editClaimUnits}
                onChange={(e) => setEditClaimUnits(e.target.value)}
                placeholder="0"
                min="0"
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  color: '#FFFFFF',
                  backgroundColor: '#111827',
                  border: '1px solid #007AFF',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: '#374151',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(editModalClaimId)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  backgroundColor: '#007AFF',
                  color: '#FFFFFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>,
    document.body
  );
};

export default VineDetailsModal;

