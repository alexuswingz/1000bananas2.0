import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const FormulaCheckTable = () => {
  const { isDarkMode } = useTheme();
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Sample data matching the image
  const [formulas] = useState([
    {
      id: 1,
      formula: 'F.Tomato Veggie',
      vessel: 'Tote',
      qty: 1,
      vesselType: 'Clean',
      totalVolume: 275,
      measure: 'Gallon',
      formulaType: 'Liquid',
    },
    {
      id: 2,
      formula: 'F.TPS One',
      vessel: 'Tote',
      qty: 1,
      vesselType: 'Clean',
      totalVolume: 275,
      measure: 'Gallon',
      formulaType: 'Liquid',
    },
    {
      id: 3,
      formula: 'F.Succulent',
      vessel: 'Barrel',
      qty: 1,
      vesselType: 'Clean',
      totalVolume: 55,
      measure: 'Gallon',
      formulaType: 'Liquid',
    },
    {
      id: 4,
      formula: 'F.CleanKelp',
      vessel: 'Tote',
      qty: 1,
      vesselType: 'Clean',
      totalVolume: 275,
      measure: 'Gallon',
      formulaType: 'Liquid',
    },
    {
      id: 5,
      formula: 'F.UltraGrow',
      vessel: 'Tote',
      qty: 3,
      vesselType: 'Clean',
      totalVolume: 825,
      measure: 'Gallon',
      formulaType: 'Liquid',
    },
    {
      id: 6,
      formula: 'F.Indoor Plant Food',
      vessel: 'Tote',
      qty: 1,
      vesselType: 'Clean',
      totalVolume: 275,
      measure: 'Gallon',
      formulaType: 'Liquid',
    },
    {
      id: 7,
      formula: 'F.Silica for Plants',
      vessel: 'Tote',
      qty: 1,
      vesselType: 'Clean',
      totalVolume: 275,
      measure: 'Gallon',
      formulaType: 'Liquid',
    },
    {
      id: 8,
      formula: 'F.Silica',
      vessel: 'Tote',
      qty: 1,
      vesselType: 'Clean',
      totalVolume: 275,
      measure: 'Gallon',
      formulaType: 'Liquid',
    },
    {
      id: 9,
      formula: 'F.Worm Tea',
      vessel: 'Tote',
      qty: 1,
      vesselType: 'Clean',
      totalVolume: 275,
      measure: 'Gallon',
      formulaType: 'Liquid',
    },
  ]);

  const handleCheckboxChange = (id) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const columns = [
    { key: 'checkbox', label: '', width: '50px' },
    { key: 'formula', label: 'FORMULA', width: '200px' },
    { key: 'vessel', label: 'VESSEL', width: '120px' },
    { key: 'qty', label: 'QTY', width: '80px' },
    { key: 'vesselType', label: 'VESSEL TYPE', width: '120px' },
    { key: 'totalVolume', label: 'TOTAL VOLUME', width: '140px' },
    { key: 'measure', label: 'MEASURE', width: '120px' },
    { key: 'formulaType', label: 'FORMULA TYPE', width: '120px' },
    { key: 'notes', label: 'NOTES', width: '100px' },
  ];

  return (
    <div style={{
      backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
      borderRadius: '12px',
      border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
      overflow: 'hidden',
    }}>
      {/* Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}>
          {/* Header */}
          <thead>
            <tr style={{
              backgroundColor: '#1C2634',
              borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
              height: '40px',
            }}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    padding: column.key === 'checkbox' ? '0 8px' : '0 16px',
                    textAlign: column.key === 'checkbox' ? 'center' : 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: column.width,
                    whiteSpace: 'nowrap',
                    borderRight: column.key === 'checkbox' ? 'none' : '1px solid #FFFFFF',
                    height: '40px',
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {formulas.map((formula, index) => (
              <tr
                key={formula.id}
                style={{
                  backgroundColor: index % 2 === 0
                    ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                    : (isDarkMode ? '#1A1F2E' : '#F9FAFB'),
                  borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                  transition: 'background-color 0.2s',
                  height: '40px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = index % 2 === 0
                    ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                    : (isDarkMode ? '#1A1F2E' : '#F9FAFB');
                }}
              >
                <td style={{
                  padding: '0 8px',
                  textAlign: 'center',
                  height: '40px',
                }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.has(formula.id)}
                    onChange={() => handleCheckboxChange(formula.id)}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer',
                    }}
                  />
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.formula}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.vessel}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.qty}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.vesselType}
                </td>
                <td style={{
                  padding: '0 16px',
                  height: '40px',
                }}>
                  <input
                    type="text"
                    value={formula.totalVolume}
                    readOnly
                    style={{
                      width: '107px',
                      height: '24px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                      color: isDarkMode ? '#E5E7EB' : '#374151',
                      fontSize: '14px',
                      fontWeight: 400,
                      textAlign: 'center',
                      outline: 'none',
                      cursor: 'default',
                      boxSizing: 'border-box',
                    }}
                  />
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.measure}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.formulaType}
                </td>
                <td style={{
                  padding: '0 16px',
                  textAlign: 'center',
                  height: '40px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#3B82F6">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8" fill="#3B82F6"/>
                        <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="2"/>
                        <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="2"/>
                        <polyline points="10 9 9 9 8 9" stroke="white" strokeWidth="2"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} strokeWidth="2">
                        <circle cx="12" cy="5" r="1" fill="currentColor"/>
                        <circle cx="12" cy="12" r="1" fill="currentColor"/>
                        <circle cx="12" cy="19" r="1" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FormulaCheckTable;







