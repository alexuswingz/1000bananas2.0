import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const LabelCheckTable = () => {
  const { isDarkMode } = useTheme();

  // Sample data matching the image
  const [rows] = useState([
    {
      id: 1,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 1000,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 2,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 50,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 3,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 480,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 4,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 160,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 5,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 240,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 6,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 600,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 7,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 120,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 8,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 240,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 9,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 480,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 10,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 6480,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 11,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 300,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 12,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 240,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 13,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 120,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
    {
      id: 14,
      brand: 'TPS Plant Foods',
      product: 'Lime Tree Fertilizer',
      size: '8oz',
      quantity: 300,
      lblCurrentInv: 11522,
      labelLocation: 'LBL-PLANT-567',
      totalCount: '',
    },
  ]);

  const columns = [
    { key: 'start', label: '', width: '100px' },
    { key: 'brand', label: 'BRAND', width: '150px' },
    { key: 'product', label: 'PRODUCT', width: '200px' },
    { key: 'size', label: 'SIZE', width: '100px' },
    { key: 'quantity', label: 'QUANTITY', width: '120px' },
    { key: 'lblCurrentInv', label: 'LBL CURRENT INV', width: '150px' },
    { key: 'labelLocation', label: 'LABEL LOCATION', width: '150px' },
    { key: 'totalCount', label: 'TOTAL COUNT', width: '120px' },
  ];

  const formatNumber = (num) => {
    if (num === '' || num === null || num === undefined) return '';
    return num.toLocaleString();
  };

  return (
    <div>
      {/* Header Section */}
      <div style={{
        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
        borderRadius: '12px',
        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
        padding: '16px 24px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '32px',
        flexWrap: 'wrap',
      }}>
        <button
          type="button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            backgroundColor: '#FFFFFF',
            color: '#374151',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
            <path d="M12 2v20M2 12h20" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="4" fill="#3B82F6"/>
          </svg>
          In Progress
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 400,
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            COUNT ID
          </span>
          <span style={{
            fontSize: '14px',
            fontWeight: 400,
            color: isDarkMode ? '#FFFFFF' : '#000000',
          }}>
            CC-DC-1
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 400,
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            COUNT TYPE
          </span>
          <span style={{
            fontSize: '14px',
            fontWeight: 400,
            color: isDarkMode ? '#FFFFFF' : '#000000',
          }}>
            Shipment Count
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 400,
            color: isDarkMode ? '#9CA3AF' : '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            DATE CREATED
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '14px',
              fontWeight: 400,
              color: isDarkMode ? '#FFFFFF' : '#000000',
            }}>
              2025-11-20
            </span>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} strokeWidth="2">
              <path d="M1 1L6 6L11 1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
        borderRadius: '12px',
        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
        overflow: 'hidden',
      }}>
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
                      padding: column.key === 'start' ? '0 8px' : '0 16px',
                      textAlign: column.key === 'start' ? 'center' : 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      width: column.width,
                      whiteSpace: 'nowrap',
                      borderRight: column.key === 'start' ? 'none' : '1px solid #FFFFFF',
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
              {rows.map((row, index) => (
                <tr
                  key={row.id}
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
                    <button
                      type="button"
                      style={{
                        padding: '6px 16px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563EB';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#3B82F6';
                      }}
                    >
                      Start
                    </button>
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {row.brand}
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {row.product}
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {row.size}
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {formatNumber(row.quantity)}
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {formatNumber(row.lblCurrentInv)}
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {row.labelLocation}
                  </td>
                  <td style={{
                    padding: '0 16px',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDarkMode ? '#E5E7EB' : '#374151',
                    height: '40px',
                  }}>
                    {row.totalCount || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LabelCheckTable;

