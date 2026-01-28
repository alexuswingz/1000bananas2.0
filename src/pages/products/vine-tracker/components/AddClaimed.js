import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { toast } from 'sonner';

// Calendar Dropdown Component
const CalendarDropdown = ({ value, onChange, onClose, inputRef }) => {
  const { isDarkMode } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const calendarRef = useRef(null);

  // Parse date value (MM/DD/YYYY format)
  const parseDate = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0]) - 1;
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return null;
  };

  const selectedDate = parseDate(value);

  // Format date to MM/DD/YYYY
  const formatDate = (date) => {
    if (!date) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Navigate months
  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // Handle date selection
  const handleDateSelect = (day) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    onChange(formatDate(newDate));
  };

  // Check if date is selected
  const isSelected = (day) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  // Check if date is today
  const isToday = (day) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target) &&
        inputRef &&
        !inputRef.contains(event.target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, inputRef]);

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Get previous month's last days
  const getPreviousMonthDays = () => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    const days = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(daysInPrevMonth - i);
    }
    return days;
  };

  // Get next month's first days
  const getNextMonthDays = () => {
    const totalCells = 42; // 6 weeks * 7 days
    const currentMonthDays = daysInMonth + firstDay;
    const remainingCells = totalCells - currentMonthDays;
    const days = [];
    for (let i = 1; i <= remainingCells; i++) {
      days.push(i);
    }
    return days;
  };

  const previousDays = getPreviousMonthDays();
  const nextDays = getNextMonthDays();

  const inputRect = inputRef?.getBoundingClientRect();

  return (
    <div
      ref={calendarRef}
      data-date-picker-calendar
      style={{
        position: 'fixed',
        bottom: (window.innerHeight - (inputRect?.top || 0)) + 4 + 'px',
        left: (inputRect?.left || 0) + 'px',
        width: '280px',
        backgroundColor: '#111827',
        border: '1px solid #374151',
        borderRadius: '8px',
        padding: '16px',
        zIndex: 10000,
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Month/Year Selector with Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#FFFFFF' }}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            type="button"
            onClick={() => navigateMonth(-1)}
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#9CA3AF',
              cursor: 'pointer',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9CA3AF';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => navigateMonth(1)}
            style={{
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#9CA3AF',
              cursor: 'pointer',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9CA3AF';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day Names Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
        {dayNames.map(day => (
          <div
            key={day}
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#9CA3AF',
              textAlign: 'center',
              padding: '4px',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {/* Previous month days */}
        {previousDays.map((day, index) => (
          <button
            key={`prev-${day}`}
            type="button"
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              border: '1px solid transparent',
              backgroundColor: 'transparent',
              color: '#6B7280',
              fontSize: '0.875rem',
              cursor: 'pointer',
              outline: 'none',
              fontWeight: 400,
            }}
            disabled
          >
            {day}
          </button>
        ))}
        
        {/* Current month days */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const selected = isSelected(day);
          const today = isToday(day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateSelect(day)}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                border: selected ? '1px solid #3B82F6' : '1px solid transparent',
                backgroundColor: selected ? '#3B82F6' : today ? '#1F2937' : 'transparent',
                color: selected ? '#FFFFFF' : today ? '#3B82F6' : '#FFFFFF',
                fontSize: '0.875rem',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: today ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.backgroundColor = '#1F2937';
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.backgroundColor = today ? '#1F2937' : 'transparent';
                }
              }}
            >
              {day}
            </button>
          );
        })}
        
        {/* Next month days */}
        {nextDays.map((day) => (
          <button
            key={`next-${day}`}
            type="button"
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              border: '1px solid transparent',
              backgroundColor: 'transparent',
              color: '#6B7280',
              fontSize: '0.875rem',
              cursor: 'pointer',
              outline: 'none',
              fontWeight: 400,
            }}
            disabled
          >
            {day}
          </button>
        ))}
      </div>
    </div>
  );
};

const AddClaimed = ({ isOpen, onClose, productData, onAddClaim, onUpdateRow }) => {
  const { isDarkMode } = useTheme();
  const [claimDate, setClaimDate] = useState('');
  const [claimUnits, setClaimUnits] = useState('0');
  const [showClaimDatePicker, setShowClaimDatePicker] = useState(false);
  const [claimHistory, setClaimHistory] = useState([]);
  const claimDateInputRef = useRef(null);

  // Format date for display (e.g., "Jan 15, 2026")
  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    
    // Try to parse as Date object first
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }
    
    // Handle MM/DD/YYYY format
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0]) - 1;
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        const date = new Date(year, month, day);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
      }
    }
    
    return dateString;
  };

  // Format launch date
  const formatLaunchDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[date.getMonth()]}. ${date.getDate()}, ${date.getFullYear()}`;
    }
    return dateString;
  };

  // Load claim history when modal opens
  useEffect(() => {
    if (isOpen && productData) {
      const history = productData.claimHistory || [];
      setClaimHistory(history);
    }
  }, [isOpen, productData]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setClaimDate('');
      setClaimUnits('0');
      setShowClaimDatePicker(false);
    } else {
      // Also reset when modal closes
      setClaimDate('');
      setClaimUnits('0');
      setShowClaimDatePicker(false);
    }
  }, [isOpen]);

  if (!isOpen || !productData) return null;

  const handleSubmit = () => {
    if (claimDate && claimUnits && parseInt(claimUnits) > 0) {
      const newClaim = {
        id: Date.now(),
        date: claimDate,
        units: parseInt(claimUnits),
      };

      const updatedHistory = [...claimHistory, newClaim].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // Sort descending
      });

      setClaimHistory(updatedHistory);

      // Call onAddClaim callback if provided
      if (onAddClaim) {
        onAddClaim(newClaim);
      }

      // Update the row's claimed count
      if (onUpdateRow) {
        const updatedRow = {
          ...productData,
          claimed: (productData.claimed || 0) + parseInt(claimUnits),
          claimHistory: updatedHistory,
        };
        onUpdateRow(updatedRow);
      }

      // Show toast notification
      const productDetails = [productData.size, productData.asin].filter(Boolean).join(' • ');
      
      const toastId = toast.success('', {
        description: (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            minWidth: '400px',
            width: 'fit-content',
            maxWidth: '95vw',
            height: '36px',
            paddingTop: '8px',
            paddingRight: '12px',
            paddingBottom: '8px',
            paddingLeft: '12px',
            borderRadius: '12px',
            backgroundColor: '#F0FDF4',
            color: '#34C759',
            margin: '0 auto',
            overflow: 'visible',
          }}>
            {/* Check Icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#34C759"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {/* Product Name and Details */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
              overflow: 'visible',
            }}>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#34C759',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}>
                Claim entry submitted for{' '}
              </span>
              {productData.productName && (
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#34C759',
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  flexShrink: 0,
                }}>
                  {productData.productName}
                </span>
              )}
              {productDetails && (
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#34C759',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {' • ' + productDetails}
                </span>
              )}
            </div>
            {/* Close Button (X) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(toastId);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#34C759',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ),
        duration: 4000,
        icon: null,
        closeButton: false,
        style: {
          background: 'transparent',
          padding: 0,
          border: 'none',
          boxShadow: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        },
        className: 'claim-entry-submitted-toast',
      });

      // Close modal and reset form
      setClaimDate('');
      setClaimUnits('0');
      setShowClaimDatePicker(false);
      if (onClose) {
        onClose();
      }
    }
  };

  return createPortal(
    <>
      {/* CSS to hide number input spinners and style inputs */}
      <style>{`
        .no-spinner::-webkit-inner-spin-button,
        .no-spinner::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner {
          -moz-appearance: textfield;
        }
        input[type="text"]::placeholder {
          color: #9CA3AF;
          opacity: 1;
        }
        input[type="number"]::placeholder {
          color: #9CA3AF;
          opacity: 1;
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '16px',
        }}
        onClick={() => {
          onClose();
          setClaimDate('');
          setClaimUnits('0');
          setShowClaimDatePicker(false);
        }}
      >
        <div
          style={{
            width: '600px',
            maxHeight: '90vh',
            backgroundColor: '#111827',
            borderRadius: '12px',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: '#374151',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              width: '100%',
              height: '52px',
              padding: '16px',
              borderBottom: '1px solid #374151',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              flexShrink: 0,
              backgroundColor: '#111827',
              boxSizing: 'border-box',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#FFFFFF', margin: 0 }}>
              Vine Details
            </h2>
            <button
              onClick={() => {
                onClose();
                setClaimDate('');
                setClaimUnits('0');
                setShowClaimDatePicker(false);
              }}
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
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: '#111827', 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'visible',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
          }}>
            {/* Product Info */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexShrink: 0 }}>
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
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                  {productData.brand && (
                    <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{productData.brand}</span>
                  )}
                  {productData.size && (
                    <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{productData.size}</span>
                  )}
                  {productData.asin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>{productData.asin}</span>
                      <img 
                        src="/assets/copyy.png" 
                        alt="Copy" 
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            // Try modern clipboard API first
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                              await navigator.clipboard.writeText(productData.asin);
                            } else {
                              // Fallback for non-secure contexts or older browsers
                              const textArea = document.createElement('textarea');
                              textArea.value = productData.asin;
                              textArea.style.position = 'fixed';
                              textArea.style.left = '-999999px';
                              textArea.style.top = '-999999px';
                              document.body.appendChild(textArea);
                              textArea.focus();
                              textArea.select();
                              try {
                                document.execCommand('copy');
                              } finally {
                                document.body.removeChild(textArea);
                              }
                            }
                            toast.success('ASIN copied to clipboard', {
                              description: productData.asin,
                              duration: 2000,
                            });
                          } catch (err) {
                            console.error('Failed to copy ASIN:', err);
                            toast.error('Failed to copy ASIN', {
                              description: 'Please try again',
                              duration: 2000,
                            });
                          }
                        }}
                        style={{ width: '14px', height: '14px', cursor: 'pointer', flexShrink: 0 }} 
                      />
                    </div>
                  )}
                  {productData.launchDate && (
                    <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                      Launched: {formatLaunchDate(productData.launchDate)}
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

            {/* Add Claim Form */}
            <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexShrink: 0 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', margin: 0 }}>Add Claimed Vine</h4>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setClaimDate('');
                    setClaimUnits('0');
                    setShowClaimDatePicker(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <span>Cancel</span>
                </button>
              </div>

              {/* Input Table */}
              <div
                style={{
                  width: '100%',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  padding: '0',
                  boxSizing: 'border-box',
                  overflow: 'visible',
                  backgroundColor: '#111827',
                  flexShrink: 0,
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '40%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '40%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ 
                      backgroundColor: '#0F172A',
                    }}>
                      <th
                        style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#9CA3AF',
                          boxSizing: 'border-box',
                          borderBottom: '1px solid #374151',
                          borderTopLeftRadius: '8px',
                        }}
                      >
                        DATE CLAIMED
                      </th>
                      <th
                        style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#9CA3AF',
                          boxSizing: 'border-box',
                          borderBottom: '1px solid #374151',
                        }}
                      >
                        UNITS
                      </th>
                      <th
                        style={{ 
                          padding: '12px 16px', 
                          textAlign: 'right',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#9CA3AF',
                          boxSizing: 'border-box',
                          borderBottom: '1px solid #374151',
                          borderTopRightRadius: '8px',
                        }}
                      >
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Input row for adding new claim */}
                    <tr style={{ backgroundColor: '#111827' }}>
                      <td
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '0.875rem',
                          color: '#FFFFFF',
                          textAlign: 'left',
                          width: '40%',
                          boxSizing: 'border-box',
                          borderBottomLeftRadius: '8px',
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          <input
                            ref={claimDateInputRef}
                            type="text"
                            placeholder="MM/DD/YYYY"
                            value={claimDate}
                            onChange={(e) => setClaimDate(e.target.value)}
                            onFocus={() => setShowClaimDatePicker(true)}
                            style={{
                              width: '129px',
                              height: '28px',
                              paddingTop: '6px',
                              paddingRight: '12px',
                              paddingBottom: '6px',
                              paddingLeft: '32px',
                              borderRadius: '4px',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                              borderColor: '#374151',
                              backgroundColor: '#4B5563',
                              color: '#FFFFFF',
                              fontSize: '14px',
                              boxSizing: 'border-box',
                            }}
                          />
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 20 20"
                            fill="none"
                            style={{
                              position: 'absolute',
                              left: '12px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              pointerEvents: 'none',
                            }}
                          >
                            {/* Calendar body */}
                            <rect x="4" y="7" width="12" height="9" rx="1" fill="none" stroke="#9CA3AF" strokeWidth="1.5" opacity="0.7"/>
                            {/* Top tabs */}
                            <rect x="5" y="3" width="2.5" height="4" rx="0.5" fill="#9CA3AF" opacity="0.7"/>
                            <rect x="12.5" y="3" width="2.5" height="4" rx="0.5" fill="#9CA3AF" opacity="0.7"/>
                          </svg>
                          {/* Calendar Dropdown */}
                          {showClaimDatePicker && claimDateInputRef.current && (
                            <CalendarDropdown
                              value={claimDate}
                              onChange={(date) => {
                                setClaimDate(date);
                                setShowClaimDatePicker(false);
                              }}
                              onClose={() => setShowClaimDatePicker(false)}
                              inputRef={claimDateInputRef.current}
                            />
                          )}
                        </div>
                      </td>
                      <td
                        style={{ 
                          padding: '12px 16px', 
                          fontSize: '0.875rem',
                          color: '#FFFFFF',
                          textAlign: 'left',
                          width: '20%',
                          boxSizing: 'border-box',
                        }}
                      >
                        <input
                          type="number"
                          value={claimUnits}
                          onChange={(e) => setClaimUnits(e.target.value)}
                          className="no-spinner"
                          style={{
                            width: '91px',
                            height: '27px',
                            padding: '6px',
                            borderRadius: '4px',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            borderColor: '#374151',
                            backgroundColor: '#4B5563',
                            color: '#FFFFFF',
                            fontSize: '14px',
                            textAlign: 'center',
                            boxSizing: 'border-box',
                          }}
                          onWheel={(e) => e.target.blur()}
                          min="0"
                        />
                      </td>
                      <td style={{ 
                        padding: '12px 16px', 
                        width: '40%',
                        boxSizing: 'border-box',
                        textAlign: 'right',
                        borderBottomRightRadius: '8px',
                      }}>
                        <button
                            onClick={handleSubmit}
                            style={{
                              width: '48px',
                              height: '23px',
                              paddingTop: '4px',
                              paddingRight: '12px',
                              paddingBottom: '4px',
                              paddingLeft: '12px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#3B82F6',
                              color: '#FFFFFF',
                              fontSize: '14px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              boxSizing: 'border-box',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginLeft: 'auto',
                            }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#2563EB';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#3B82F6';
                          }}
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Claim History Table */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '24px', marginTop: '24px' }}>Claim History</h4>
              
              <div
                style={{
                  width: '100%',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  padding: '0',
                  boxSizing: 'border-box',
                  overflow: 'visible',
                  backgroundColor: '#111827',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '50%' }} />
                    <col style={{ width: '50%' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ 
                      backgroundColor: '#0F172A',
                    }}>
                      <th
                        style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#9CA3AF',
                          boxSizing: 'border-box',
                          borderBottom: '1px solid #374151',
                          borderTopLeftRadius: '8px',
                        }}
                      >
                        DATE CLAIMED
                      </th>
                      <th
                        style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: '#9CA3AF',
                          boxSizing: 'border-box',
                          borderBottom: '1px solid #374151',
                          borderTopRightRadius: '8px',
                        }}
                      >
                        UNITS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Existing Claim History Entries */}
                    {claimHistory.length > 0 ? (
                      claimHistory.map((claim, index) => {
                        const isLastRow = index === claimHistory.length - 1;
                        return (
                          <tr 
                            key={claim.id || index}
                            style={{ 
                              backgroundColor: '#111827',
                              borderBottom: index < claimHistory.length - 1 ? '1px solid #374151' : 'none',
                            }}
                          >
                            <td
                              style={{ 
                                padding: '12px 16px', 
                                fontSize: '0.875rem',
                                color: '#FFFFFF',
                                textAlign: 'left',
                                boxSizing: 'border-box',
                                borderBottomLeftRadius: isLastRow ? '8px' : '0',
                              }}
                            >
                              {formatDisplayDate(claim.date)}
                            </td>
                            <td
                              style={{ 
                                padding: '12px 16px', 
                                fontSize: '0.875rem',
                                color: '#FFFFFF',
                                textAlign: 'left',
                                boxSizing: 'border-box',
                                borderBottomRightRadius: isLastRow ? '8px' : '0',
                              }}
                            >
                              {claim.units}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td 
                          colSpan="2" 
                          style={{ 
                            padding: '2rem', 
                            textAlign: 'center', 
                            color: '#9CA3AF',
                            fontSize: '0.875rem',
                            borderBottomLeftRadius: '8px',
                            borderBottomRightRadius: '8px',
                          }}
                        >
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
      </div>
    </>,
    document.body
  );
};

export default AddClaimed;
