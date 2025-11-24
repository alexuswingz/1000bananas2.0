import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const SortFormulasTable = () => {
  const { isDarkMode } = useTheme();
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Sample data matching the image
  const [formulas, setFormulas] = useState([
    {
      id: 1,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 2,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 3,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 4,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 5,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 6,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 7,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 8,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
    {
      id: 9,
      formula: 'F.UltraGrow',
      size: 'Tote',
      qty: 1,
      tote: 'Clean',
      volume: 275,
      measure: 'Gallon',
      type: 'Liquid',
    },
  ]);

  const columns = [
    { key: 'drag', label: '', width: '50px' },
    { key: 'formula', label: 'FORMULA', width: '150px' },
    { key: 'size', label: 'SIZE', width: '100px' },
    { key: 'qty', label: 'QTY', width: '80px' },
    { key: 'tote', label: 'TOTE', width: '100px' },
    { key: 'volume', label: 'VOLUME', width: '100px' },
    { key: 'measure', label: 'MEASURE', width: '120px' },
    { key: 'type', label: 'TYPE', width: '100px' },
    { key: 'notes', label: 'NOTES', width: '80px' },
    { key: 'menu', label: '', width: '50px' },
  ];

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      return;
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      return;
    }

    const newFormulas = [...formulas];
    const draggedItem = newFormulas[draggedIndex];
    
    // Remove the dragged item
    newFormulas.splice(draggedIndex, 1);
    
    // Insert it at the new position
    newFormulas.splice(dropIndex, 0, draggedItem);
    
    setFormulas(newFormulas);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

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
                    padding: (column.key === 'drag' || column.key === 'menu') ? '0 8px' : '0 16px',
                    textAlign: (column.key === 'drag' || column.key === 'menu') ? 'center' : 'left',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: column.width,
                    whiteSpace: 'nowrap',
                    borderRight: (column.key === 'drag' || column.key === 'menu') ? 'none' : '1px solid #FFFFFF',
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
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                style={{
                  backgroundColor: draggedIndex === index
                    ? (isDarkMode ? '#4B5563' : '#E5E7EB')
                    : index % 2 === 0
                    ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                    : (isDarkMode ? '#1A1F2E' : '#F9FAFB'),
                  borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                  transition: 'background-color 0.2s',
                  height: '40px',
                  opacity: draggedIndex === index ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (draggedIndex !== index) {
                    e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (draggedIndex !== index) {
                    e.currentTarget.style.backgroundColor = index % 2 === 0
                      ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                      : (isDarkMode ? '#1A1F2E' : '#F9FAFB');
                  }
                }}
              >
                <td style={{
                  padding: '0 8px',
                  textAlign: 'center',
                  height: '40px',
                }}>
                  <div
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      cursor: draggedIndex === index ? 'grabbing' : 'grab',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto',
                      width: 'fit-content',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="3" width="12" height="2" rx="1" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                      <rect x="2" y="7" width="12" height="2" rx="1" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                      <rect x="2" y="11" width="12" height="2" rx="1" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                    </svg>
                  </div>
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
                  {formula.size}
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
                  {formula.tote}
                </td>
                <td style={{
                  padding: '0 16px',
                  height: '40px',
                }}>
                  <input
                    type="text"
                    value={formula.volume}
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
                  {formula.type}
                </td>
                <td style={{
                  padding: '0 16px',
                  textAlign: 'center',
                  height: '40px',
                }}>
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
                </td>
                <td style={{
                  padding: '0 8px',
                  textAlign: 'center',
                  height: '40px',
                }}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SortFormulasTable;

