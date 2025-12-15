import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { bottlesApi } from '../../../../services/supplyChainApi';

const CycleCountsTable = forwardRef(({ themeClasses, onCreateCount }, ref) => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  const [cycleCounts, setCycleCounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch cycle counts from API
  const fetchCycleCounts = async () => {
    try {
      setLoading(true);
      const response = await bottlesApi.getCycleCounts();
      if (response.success) {
        // Transform API response to match our format
        const transformed = response.data.map(count => ({
          id: count.id,
          countId: `CC-${count.id}`,
          type: count.notes || 'Cycle Count', // Use notes field or default
          initiatedBy: count.counted_by || 'Unknown',
          date: count.count_date,
          status: count.status === 'completed' ? 'Completed' : 'In Progress',
        }));
        setCycleCounts(transformed);
      }
    } catch (err) {
      console.error('Error fetching cycle counts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycleCounts();
  }, []);

  // Expose createCount function to parent
  useImperativeHandle(ref, () => ({
    createCount: async (type) => {
      try {
        // Get current date in YYYY-MM-DD format (local timezone)
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const currentDate = `${year}-${month}-${day}`;
        
        // Create cycle count via API
        const response = await bottlesApi.createCycleCount({
          countDate: currentDate,
          countedBy: 'Current User', // TODO: Get from auth context
          status: 'draft',
          notes: type,
          lines: [], // Start with empty lines, user will add them
        });
        
        if (response.success) {
          // Refresh the list
          await fetchCycleCounts();
          
          // Navigate to detail page
          const newCountId = response.data.id;
          navigate('/dashboard/supply-chain/bottles/cycle-counts/detail', {
            state: { 
              countId: newCountId,
              countData: {
                id: newCountId,
                countId: `CC-${newCountId}`,
                type,
                initiatedBy: 'Current User',
                date: currentDate,
                status: 'In Progress',
              }
            }
          });
        }
      } catch (err) {
        console.error('Error creating cycle count:', err);
        alert('Failed to create cycle count. Please try again.');
      }
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
          {loading ? (
            <tr>
              <td colSpan={6} className={`px-6 py-6 text-center text-sm italic ${themeClasses.textSecondary}`}>
                Loading cycle counts...
              </td>
            </tr>
          ) : cycleCounts.length === 0 ? (
            <tr>
              <td colSpan={6} className={`px-6 py-6 text-center text-sm italic ${themeClasses.textSecondary}`}>
                No cycle counts available.
              </td>
            </tr>
          ) : (
            cycleCounts.map((count, index) => {
              const isCompleted = count.status === 'Completed';
              return (
              <tr 
                key={count.id} 
                className={themeClasses.rowHover}
                style={{
                  borderBottom: index === cycleCounts.length - 1 ? 'none' : (isDarkMode ? '1px solid rgba(75,85,99,0.3)' : '1px solid #e5e7eb'),
                }}
              >
                {/* STATUS */}
                <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: isCompleted ? '#D1FAE5' : '#F3F4F6', padding: '4px 12px', borderRadius: '8px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                    {isCompleted ? (
                      <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L12 6M12 18L12 22M2 12L6 12M18 12L22 12M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" strokeLinecap="round" />
                      </svg>
                    )}
                    <span className={themeClasses.textPrimary} style={{ fontSize: '14px', fontWeight: 400 }}>{count.status}</span>
                  </div>
                </td>

                {/* COUNT ID */}
                <td style={{ padding: '0.65rem 1rem', verticalAlign: 'middle' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/supply-chain/bottles/cycle-counts/detail', {
                      state: { countId: count.id, countData: count }
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
                    className={`${themeClasses.textSecondary} hover:${themeClasses.textPrimary}`}
                    aria-label="More options"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </td>
              </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
});

CycleCountsTable.displayName = 'CycleCountsTable';

export default CycleCountsTable;











