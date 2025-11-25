import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';

const CycleCountsTable = forwardRef(({ themeClasses, onCreateCount }, ref) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  // Sample data - in production this would come from an API
  const [cycleCounts, setCycleCounts] = useState([
    {
      id: 1,
      countId: 'CC-DC-1',
      type: 'Daily Count',
      initiatedBy: 'Christian R.',
      date: '2025-11-20',
      status: 'In Progress',
    },
    {
      id: 2,
      countId: 'CC-SC-2',
      type: 'Shipment Check',
      initiatedBy: 'Patricia S.',
      date: '2025-11-19',
      status: 'In Progress',
    },
    {
      id: 3,
      countId: 'CC-FC-7',
      type: 'Full Count',
      initiatedBy: 'James B.',
      date: '2025-11-14',
      status: 'In Progress',
    },
  ]);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('labelCycleCounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCycleCounts(parsed);
        }
      }
    } catch {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem('labelCycleCounts', JSON.stringify(cycleCounts));
    } catch {}
  }, [cycleCounts]);

  // Expose createCount function to parent
  useImperativeHandle(ref, () => ({
    createCount: (type) => {
      const typeMap = {
        'Daily Count': 'DC',
        'Shipment Check': 'SC',
        'Full Count': 'FC',
      };
      
      const prefix = typeMap[type] || 'CC';
      const existingCounts = cycleCounts.filter(c => c.type === type);
      const nextNumber = existingCounts.length + 1;
      const countId = `CC-${prefix}-${nextNumber}`;
      
      // Get current date in YYYY-MM-DD format (local timezone)
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const currentDate = `${year}-${month}-${day}`;
      
      const newCount = {
        id: Date.now(),
        countId,
        type,
        initiatedBy: 'Current User', // TODO: Get from auth context
        date: currentDate,
        status: 'In Progress',
      };
      
      setCycleCounts([newCount, ...cycleCounts]);
    },
  }));

  return (
    <div className={`${themeClasses.cardBg} rounded-xl border ${themeClasses.border} shadow-lg overflow-hidden`}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead className={themeClasses.headerBg}>
          <tr>
            <th className="text-xs font-bold text-white uppercase tracking-wider border-r border-white" style={{ padding: '0 1rem', textAlign: 'left', height: '40px' }}>
              STATUS
            </th>
            <th className="text-xs font-bold text-white uppercase tracking-wider border-r border-white" style={{ padding: '0 1rem', textAlign: 'left', height: '40px' }}>
              COUNT ID
            </th>
            <th className="text-xs font-bold text-white uppercase tracking-wider border-r border-white" style={{ padding: '0 1rem', textAlign: 'left', height: '40px' }}>
              TYPE
            </th>
            <th className="text-xs font-bold text-white uppercase tracking-wider border-r border-white" style={{ padding: '0 1rem', textAlign: 'left', height: '40px' }}>
              INITIATED BY
            </th>
            <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', textAlign: 'left', height: '40px' }}>
              DATE
            </th>
            <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', textAlign: 'center', width: '60px', height: '40px' }}>
            </th>
          </tr>
        </thead>
        <tbody>
          {cycleCounts.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-6 text-center text-sm italic text-gray-400">
                No cycle counts available.
              </td>
            </tr>
          ) : (
            cycleCounts.map((count) => (
              <tr key={count.id} className={themeClasses.rowHover}>
                {/* STATUS */}
                <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#F3F4F6', padding: '4px 12px', borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                    <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L12 6M12 18L12 22M2 12L6 12M18 12L22 12M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" strokeLinecap="round" />
                    </svg>
                    <span style={{ fontSize: '14px', color: '#000000', fontWeight: 400 }}>In Progress</span>
                  </div>
                </td>

                {/* COUNT ID */}
                <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/supply-chain/labels/cycle-counts/detail', {
                      state: { countData: count }
                    })}
                    style={{
                      color: '#3B82F6',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    {count.countId}
                  </button>
                </td>

                {/* TYPE */}
                <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                  <span className={themeClasses.textPrimary} style={{ fontSize: '14px' }}>
                    {count.type}
                  </span>
                </td>

                {/* INITIATED BY */}
                <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                  <span className={themeClasses.textPrimary} style={{ fontSize: '14px' }}>
                    {count.initiatedBy}
                  </span>
                </td>

                {/* DATE */}
                <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                  <span className={themeClasses.textPrimary} style={{ fontSize: '14px' }}>
                    {count.date}
                  </span>
                </td>

                {/* Actions */}
                <td style={{ padding: '0.65rem 1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="More options"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
});

CycleCountsTable.displayName = 'CycleCountsTable';

export default CycleCountsTable;

