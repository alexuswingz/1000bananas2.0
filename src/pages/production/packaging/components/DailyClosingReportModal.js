import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

const DailyClosingReportModal = ({ isOpen, onClose, productionData = [], viewOnly = false, initialDate = '', reportData = null }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Set date when modal opens
    if (isOpen) {
      if (initialDate) {
        // Use the provided initial date (for view-only mode)
        setSelectedDate(initialDate);
      } else {
        // Set today's date (for new report creation)
        const today = new Date();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[today.getMonth()];
        const day = today.getDate();
        const year = today.getFullYear();
        setSelectedDate(`${monthName} ${day}, ${year}`);
      }
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  // Sample data for demonstration
  const sampleData = [
    { brand: 'TPS Plant Foods', product: 'Cherry Tree Fertilizer', size: '8oz', quantity: 60000 },
    { brand: 'TPS Plant Foods', product: 'Cherry Tree Fertilizer', size: 'Gallon', quantity: 60000 },
    { brand: 'TPS Plant Foods', product: 'Cherry Tree Fertilizer', size: 'Quart', quantity: 60000 },
    { brand: 'TPS Plant Foods', product: 'Cherry Tree Fertilizer', size: '8oz', quantity: 60000 },
  ];

  const displayData = productionData.length > 0 ? productionData : sampleData;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 10000,
        paddingTop: isMobile ? '60px' : '80px',
        paddingLeft: isMobile ? '16px' : '0',
        paddingRight: isMobile ? '16px' : '0',
        paddingBottom: isMobile ? '20px' : '0',
        overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          width: isMobile ? '100%' : '90%',
          maxWidth: isMobile ? '500px' : '1000px',
          maxHeight: 'calc(100vh - 100px)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Date Picker */}
        <div
          style={{
            backgroundColor: '#2C3544',
            padding: isMobile ? '16px' : '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ color: '#FFFFFF', fontSize: isMobile ? '16px' : '18px', fontWeight: '600', margin: 0 }}>
              Daily Closing Report
            </h2>
            {/* Date Picker */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                borderRadius: '4px',
                border: '1px solid #E5E7EB',
                padding: '6px 10px',
                minWidth: isMobile ? 'auto' : 'auto',
                height: 'auto',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span style={{ fontSize: '11px', color: '#374151', fontWeight: '500', whiteSpace: 'nowrap' }}>{selectedDate}</span>
            </div>
          </div>
          {/* Close Button */}
          <button
            onClick={onClose}
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div
          style={{
            padding: isMobile ? '16px' : '24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {/* Production Summary Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: isMobile ? '12px' : '16px',
              marginBottom: isMobile ? '16px' : '24px',
            }}
          >
            {/* PRODUCTION TODAY */}
            <div
              style={{
                backgroundColor: '#F9FAFB',
                padding: isMobile ? '12px' : '16px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
              }}
            >
              <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#6B7280', marginBottom: '8px', fontWeight: '500' }}>
                PRODUCTION TODAY
              </div>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                {reportData?.prodToday || '$107,699'}
              </div>
              <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
                </svg>
                -1.2% vs avg
              </div>
            </div>

            {/* WTD PRODUCTION */}
            <div
              style={{
                backgroundColor: '#F9FAFB',
                padding: isMobile ? '12px' : '16px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
              }}
            >
              <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#6B7280', marginBottom: '8px', fontWeight: '500' }}>
                WTD PRODUCTION
              </div>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                {reportData?.wtdProd || '$410,962'}
              </div>
              <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 11l5-5 5 5M7 18l5-5 5 5" />
                </svg>
                +2.8% vs avg
              </div>
            </div>

            {/* WTD GOAL */}
            <div
              style={{
                backgroundColor: '#F9FAFB',
                padding: isMobile ? '12px' : '16px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
              }}
            >
              <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#6B7280', marginBottom: '8px', fontWeight: '500' }}>
                WTD GOAL
              </div>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                {reportData?.wtdGoal || '$611,420'}
              </div>
              <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#10B981', fontWeight: '500' }}>
                on track
              </div>
            </div>

            {/* YTD % */}
            <div
              style={{
                backgroundColor: '#F9FAFB',
                padding: isMobile ? '12px' : '16px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
              }}
            >
              <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#6B7280', marginBottom: '8px', fontWeight: '500' }}>
                YTD %
              </div>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                {reportData?.ytdPercent || '102%'}
              </div>
              <div style={{ fontSize: isMobile ? '10px' : '12px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 11l5-5 5 5M7 18l5-5 5 5" />
                </svg>
                +12% vs avg
              </div>
            </div>
          </div>

          {/* Completed Production Items */}
          <div style={{ marginBottom: isMobile ? '16px' : '24px', marginTop: isMobile ? '0' : '32px' }}>
            <h3
              style={{
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: isMobile ? '8px' : '12px',
              }}
            >
              Completed Production Items
            </h3>
            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F9FAFB' }}>
                    <th style={{ padding: isMobile ? '8px' : '12px', textAlign: 'left', fontSize: isMobile ? '10px' : '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>
                      BRAND
                    </th>
                    <th style={{ padding: isMobile ? '8px' : '12px', textAlign: 'left', fontSize: isMobile ? '10px' : '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>
                      PRODUCT
                    </th>
                    <th style={{ padding: isMobile ? '8px' : '12px', textAlign: 'left', fontSize: isMobile ? '10px' : '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>
                      SIZE
                    </th>
                    <th style={{ padding: isMobile ? '8px' : '12px', textAlign: 'right', fontSize: isMobile ? '10px' : '12px', fontWeight: '600', color: '#6B7280', borderBottom: '1px solid #E5E7EB' }}>
                      QTY
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.slice(0, 4).map((item, index) => (
                    <tr key={index} style={{ borderBottom: index < 3 ? '1px solid #E5E7EB' : 'none' }}>
                      <td style={{ padding: isMobile ? '8px' : '12px', fontSize: isMobile ? '12px' : '14px', color: '#111827' }}>
                        {item.brand || '-'}
                      </td>
                      <td style={{ padding: isMobile ? '8px' : '12px', fontSize: isMobile ? '12px' : '14px', color: '#111827' }}>
                        {item.product || '-'}
                      </td>
                      <td style={{ padding: isMobile ? '8px' : '12px', fontSize: isMobile ? '12px' : '14px', color: '#111827' }}>
                        {item.size || '-'}
                      </td>
                      <td style={{ padding: isMobile ? '8px' : '12px', fontSize: isMobile ? '12px' : '14px', color: '#111827', textAlign: 'right' }}>
                        {item.quantity?.toLocaleString() || '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* View More Link */}
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button
                onClick={() => console.log('View more clicked')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3B82F6',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  margin: '0 auto',
                }}
              >
                View more (12)
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Closing Report Notes */}
          <div style={{ marginBottom: isMobile ? '16px' : '24px' }}>
            <h3
              style={{
                fontSize: isMobile ? '14px' : '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: isMobile ? '8px' : '12px',
              }}
            >
              Closing Report Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any specific notes regarding today's production run, downtime, or maintenance issues..."
              style={{
                width: '100%',
                minHeight: isMobile ? '80px' : '120px',
                padding: isMobile ? '10px' : '12px',
                fontSize: isMobile ? '12px' : '14px',
                color: '#111827',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Action Buttons - Only show when not in view-only mode */}
          {!viewOnly && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: isMobile ? '8px' : '12px',
                paddingTop: isMobile ? '8px' : '12px',
                paddingBottom: isMobile ? '8px' : '0',
              }}
            >
              <button
                onClick={onClose}
                style={{
                  padding: isMobile ? '8px 16px' : '10px 20px',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TEMPORARY: Save to localStorage for frontend demo
                  try {
                    const reports = JSON.parse(localStorage.getItem('closingReports') || '[]');
                    
                    const newReport = {
                      id: Date.now(),
                      date: selectedDate,
                      generatedBy: 'Christian R.', // You can make this dynamic later
                      prodToday: reportData?.prodToday || '$107,699',
                      wtdProd: reportData?.wtdProd || '$410,962',
                      wtdGoal: reportData?.wtdGoal || '$611,420',
                      ytdPercent: reportData?.ytdPercent || '102%',
                      ytdColor: '#10B981',
                      notes: notes,
                      productionData: displayData,
                      createdAt: new Date().toISOString(),
                    };
                    
                    // Add new report to beginning of array (most recent first)
                    reports.unshift(newReport);
                    localStorage.setItem('closingReports', JSON.stringify(reports));
                    
                    console.log('✅ Saved closing report to localStorage:', newReport);
                    
                    // Show success toast
                    toast.success(`${selectedDate} Closing Report created.`, {
                      duration: 4000,
                      style: {
                        width: '372px',
                        height: '36px',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        gap: '24px',
                      },
                    });
                    
                    // Clear notes and close
                    setNotes('');
                    onClose();
                  } catch (error) {
                    console.error('Error saving closing report:', error);
                    toast.error('Failed to save closing report');
                  }
                }}
                style={{
                  padding: isMobile ? '8px 16px' : '10px 20px',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: '500',
                  color: '#FFFFFF',
                  backgroundColor: '#3B82F6',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Generate & Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DailyClosingReportModal;

