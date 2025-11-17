import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const NewShipmentTable = ({ rows, tableMode, onProductClick }) => {
  const { isDarkMode } = useTheme();

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#2C3544]',
  };

  if (!tableMode) {
    // Normal view with timeline
    return (
      <>
        <div
          className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl shadow-sm`}
          style={{ marginTop: '1.25rem' }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
              }}
            >
              <thead className={themeClasses.headerBg}>
                <tr style={{ height: '40px' }}>
                  {['Brand', 'Product', 'Size', 'Add', 'Qty'].map((col, idx) => (
                    <th
                      key={col}
                      className="text-xs font-bold text-white uppercase tracking-wider"
                      style={{
                        padding: '0 1rem',
                        height: '40px',
                        lineHeight: '40px',
                        textAlign: idx === 3 || idx === 4 ? 'center' : 'left',
                        width:
                          idx === 0
                            ? 160
                            : idx === 1
                            ? 200
                            : idx === 2
                            ? 70
                            : idx === 3 || idx === 4
                            ? 120
                            : undefined,
                      }}
                    >
                      {col}
                    </th>
                  ))}
                  <th
                    className="text-xs font-bold text-white tracking-wider"
                    style={{
                      padding: '0 1rem',
                      height: '40px',
                      textAlign: 'left',
                      verticalAlign: 'middle',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.6rem',
                        marginBottom: '2px',
                        paddingRight: '24px',
                      }}
                    >
                      <div style={{ marginLeft: '20px' }}>
                        <div style={{ fontWeight: 600 }}>Today</div>
                        <div style={{ opacity: 0.85 }}>11/11/25</div>
                      </div>
                      <div style={{ textAlign: 'left', marginLeft: '40px' }}>
                        <div style={{ fontWeight: 600 }}>DOI Goal</div>
                        <div style={{ opacity: 0.85 }}>4/13/25</div>
                      </div>
                    </div>
                    <div
                      style={{
                        position: 'relative',
                        height: '22px',
                        marginTop: '-6px',
                      }}
                    >
                      {[
                        { label: 'Dec', left: '20%' },
                        { label: 'Jan', left: '40%' },
                        { label: 'Feb', left: '60%' },
                        { label: 'Mar', left: '80%' },
                      ].map((m) => (
                        <span
                          key={m.label}
                          style={{
                            position: 'absolute',
                            top: -14,
                            left: m.left,
                            transform: 'translateX(-50%)',
                            fontSize: '0.6rem',
                          }}
                        >
                          {m.label}
                        </span>
                      ))}
                      <div
                        style={{
                          position: 'absolute',
                          left: '6%',
                          right: '8%',
                          top: 10,
                          height: '2px',
                          backgroundColor: '#E5E7EB',
                          borderRadius: '9999px',
                        }}
                      />
                      {['6%', '24%', '42%', '60%', '78%', '92%'].map((left) => (
                        <span
                          key={left}
                          style={{
                            position: 'absolute',
                            left,
                            top: 10,
                            transform: 'translate(-50%, -50%)',
                            width: '8px',
                            height: '8px',
                            borderRadius: '9999px',
                            border: '2px solid #FFFFFF',
                            backgroundColor: '#FFFFFF',
                          }}
                        />
                      ))}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="border-t border-gray-200">
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }} className={themeClasses.text}>
                      {row.brand}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}>
                      <button
                        type="button"
                        onClick={() => onProductClick(row)}
                        className="text-xs text-blue-500 hover:text-blue-600"
                      >
                        Cherry Tree Fertilizer...
                      </button>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }} className={themeClasses.textSecondary}>
                      {row.size}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.9rem',
                          borderRadius: '0.5rem',
                          border: 'none',
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}
                      >
                        <span
                          style={{
                            width: '0.7rem',
                            height: '0.7rem',
                            borderRadius: '9999px',
                            backgroundColor: '#FFFFFF',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#2563EB',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          +
                        </span>
                        Add
                      </button>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      <input
                        type="number"
                        value={row.qty}
                        readOnly
                        className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-md text-xs ${themeClasses.text}`}
                        style={{
                          padding: '0.25rem 0.5rem',
                          width: '90px',
                          textAlign: 'center',
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.65rem 1rem', minWidth: '380px' }}>
                      <div
                        style={{
                          width: '86%',
                          margin: '0 auto',
                          transform: 'translateX(-7px)',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            bottom: '-8px',
                            left: 0,
                            borderLeft: `2px dashed ${isDarkMode ? '#9CA3AF' : '#9CA3AF'}`,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            bottom: '-8px',
                            right: 0,
                            borderRight: `2px dashed ${isDarkMode ? '#9CA3AF' : '#9CA3AF'}`,
                          }}
                        />
                        <div
                          style={{
                            marginRight: index === 2 ? '30px' : index === 0 ? '-30px' : 0,
                            position: 'relative',
                          }}
                        >
                          <div
                            style={{
                              borderRadius: '9999px',
                              backgroundColor: isDarkMode ? '#020617' : '#F3F4F6',
                              overflow: 'hidden',
                              height: '18px',
                              display: 'flex',
                            }}
                          >
                            <div style={{ flex: 2, backgroundColor: '#A855F7' }} />
                            <div style={{ flex: 3, backgroundColor: '#22C55E' }} />
                            <div style={{ flex: 3, backgroundColor: '#3B82F6' }} />
                          </div>
                          {index === 0 && (
                            <span
                              style={{
                                position: 'absolute',
                                right: '-18px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#007AFF',
                              }}
                            >
                              +5
                            </span>
                          )}
                          {index === 2 && (
                            <span
                              style={{
                                position: 'absolute',
                                right: '-18px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                color: '#007AFF',
                              }}
                            >
                              -5
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            padding: '0.5rem 1.5rem 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '1.5rem',
          }}
        >
          {[
            { label: 'FBA Avail.', color: '#A855F7' },
            { label: 'Total Inv.', color: '#22C55E' },
            { label: 'Forecast', color: '#3B82F6' },
          ].map((item) => (
            <div
              key={item.label}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
              className={themeClasses.textSecondary}
            >
              <span
                style={{
                  width: '0.75rem',
                  height: '0.75rem',
                  borderRadius: '9999px',
                  backgroundColor: item.color,
                }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Table mode view
  return (
    <div
      className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl shadow-sm`}
      style={{ marginTop: '1.25rem' }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}
        >
          <thead className={themeClasses.headerBg}>
            <tr style={{ height: '40px' }}>
              <th style={{ padding: '0 1rem', width: '40px', textAlign: 'center' }}>
                <input type="checkbox" style={{ cursor: 'pointer' }} />
              </th>
              <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', textAlign: 'left' }}>
                BRAND
              </th>
              <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', textAlign: 'left' }}>
                PRODUCT
              </th>
              <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', textAlign: 'left' }}>
                SIZE
              </th>
              <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', textAlign: 'left' }}>
                QTY
              </th>
              <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', textAlign: 'left' }}>
                INVENTORY FBA AVAILABLE (DAYS)
              </th>
              <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', textAlign: 'left' }}>
                INVENTORY TOTAL (DAYS)
              </th>
              <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', textAlign: 'left' }}>
                FORECAST
              </th>
              <th className="text-xs font-bold text-white uppercase tracking-wider" style={{ padding: '0 1rem', textAlign: 'left' }}>
                7 DAY SALES
              </th>
              <th style={{ padding: '0 1rem', width: '40px', textAlign: 'center' }}>
                <span style={{ color: '#FFFFFF', fontSize: '1rem' }}>⋮</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} className="border-t border-gray-200">
                <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                  <input type="checkbox" style={{ cursor: 'pointer' }} />
                </td>
                <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }} className={themeClasses.text}>
                  {row.brand}
                </td>
                <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}>
                  <button
                    type="button"
                    onClick={() => onProductClick(row)}
                    className="text-xs text-blue-500 hover:text-blue-600"
                    style={{ textDecoration: 'underline' }}
                  >
                    Cherry Tree Fer...
                  </button>
                </td>
                <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }} className={themeClasses.textSecondary}>
                  {row.size}
                </td>
                <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: isDarkMode ? '#1F2937' : '#F3F4F6',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                      className={themeClasses.text}
                    >
                      {row.qty}
                    </span>
                    {index === 0 && (
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '9999px',
                          backgroundColor: '#DC2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ color: '#FFFFFF', fontSize: '10px', fontWeight: 700 }}>!</span>
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }} className={themeClasses.text}>
                  12
                </td>
                <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }} className={themeClasses.text}>
                  {index === 0 ? '32' : index === 1 ? '24' : '12'}
                </td>
                <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }} className={themeClasses.text}>
                  {row.qty}
                </td>
                <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }} className={themeClasses.text}>
                  {index === 0 ? '34' : index === 1 ? '12' : '5'}
                </td>
                <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      cursor: 'pointer',
                      fontSize: '1rem',
                    }}
                  >
                    ⋮
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

export default NewShipmentTable;

