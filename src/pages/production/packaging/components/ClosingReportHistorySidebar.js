import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const ClosingReportHistorySidebar = ({ isOpen, onClose, onViewReport }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Most Recent');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load reports from localStorage when sidebar opens
  useEffect(() => {
    if (isOpen) {
      loadReports();
    }
  }, [isOpen]);

  const loadReports = () => {
    try {
      // Get reports from localStorage
      const savedReports = JSON.parse(localStorage.getItem('closingReports') || '[]');
      
      // Sample data for fallback/demo
      const sampleReports = [
    {
      id: 1,
      date: 'January 19, 2026',
      generatedBy: 'Christian R.',
      prodToday: '$108,450',
      wtdProd: '$108,450',
      wtdGoal: '$721,117',
      ytdPercent: '125%',
      ytdColor: '#10B981',
    },
    {
      id: 2,
      date: 'January 16, 2026',
      generatedBy: 'Christian R.',
      prodToday: '$95,320',
      wtdProd: '$837,272',
      wtdGoal: '$611,420',
      ytdPercent: '120%',
      ytdColor: '#10B981',
    },
    {
      id: 3,
      date: 'January 15, 2026',
      generatedBy: 'Christian R.',
      prodToday: '$120,500',
      wtdProd: '$741,952',
      wtdGoal: '$611,420',
      ytdPercent: '113%',
      ytdColor: '#10B981',
    },
    {
      id: 4,
      date: 'January 14, 2026',
      generatedBy: 'Christian R.',
      prodToday: '$98,150',
      wtdProd: '$621,452',
      wtdGoal: '$611,420',
      ytdPercent: '110%',
      ytdColor: '#10B981',
    },
    {
      id: 5,
      date: 'January 13, 2026',
      generatedBy: 'Christian R.',
      prodToday: '$112,340',
      wtdProd: '$523,302',
      wtdGoal: '$611,420',
      ytdPercent: '107%',
      ytdColor: '#10B981',
    },
    {
      id: 6,
      date: 'January 12, 2026',
      generatedBy: 'Christian R.',
      prodToday: '$107,699',
      wtdProd: '$410,962',
      wtdGoal: '$611,420',
      ytdPercent: '102%',
      ytdColor: '#10B981',
    },
  ];
      
      // Merge saved reports with sample data (saved reports first)
      const allReports = [...savedReports, ...sampleReports];
      setReports(allReports);
      
      console.log('📊 Loaded closing reports:', allReports);
    } catch (error) {
      console.error('Error loading closing reports:', error);
      setReports([]);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          transition: 'opacity 0.3s ease',
        }}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: isMobile ? '100%' : '520px',
          backgroundColor: '#FFFFFF',
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.3s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
            Closing Report History
          </h2>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Search and Filter Section */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E5E7EB' }}>
          {/* Search Bar */}
          <div
            style={{
              position: 'relative',
              marginBottom: '12px',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9CA3AF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                fontSize: '14px',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Stats and Sort */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '14px', color: '#6B7280' }}>
              Showing <strong>{reports.length}</strong> reports
            </span>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '14px',
                  color: '#374151',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Sort by <strong>{sortBy}</strong>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {showSortDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    zIndex: 10,
                    minWidth: '150px',
                  }}
                >
                  <button
                    onClick={() => {
                      setSortBy('Most Recent');
                      setShowSortDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: '14px',
                      color: '#374151',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Most Recent
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('Oldest');
                      setShowSortDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontSize: '14px',
                      color: '#374151',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Oldest
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
          }}
        >
          {reports.map((report) => (
            <div
              key={report.id}
              onClick={() => {
                if (onViewReport) {
                  onViewReport(report);
                }
              }}
              style={{
                marginBottom: '16px',
                padding: '16px',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.borderColor = '#D1D5DB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E5E7EB';
              }}
            >
              {/* Report Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Avatar */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: '#06B6D4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    CR
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                      {report.date}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                      Generated by {report.generatedBy}
                    </div>
                  </div>
                </div>
                {/* Three-dot menu */}
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  <svg width="4" height="16" viewBox="0 0 4 16" fill="none">
                    <circle cx="2" cy="2" r="2" fill="#6B7280" />
                    <circle cx="2" cy="8" r="2" fill="#6B7280" />
                    <circle cx="2" cy="14" r="2" fill="#6B7280" />
                  </svg>
                </button>
              </div>

              {/* Metrics - Single Row */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  justifyContent: 'space-between',
                }}
              >
                {/* PROD. TODAY */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px', fontWeight: '500' }}>
                    PROD. TODAY
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#F59E0B' }}>
                    {report.prodToday}
                  </div>
                </div>

                {/* WTD PROD. */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px', fontWeight: '500' }}>
                    WTD PROD.
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#F59E0B' }}>
                    {report.wtdProd}
                  </div>
                </div>

                {/* WTD GOAL */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px', fontWeight: '500' }}>
                    WTD GOAL
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                    {report.wtdGoal}
                  </div>
                </div>

                {/* YTD % */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '4px', fontWeight: '500' }}>
                    YTD %
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#10B981' }}>
                    {report.ytdPercent}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>,
    document.body
  );
};

export default ClosingReportHistorySidebar;

