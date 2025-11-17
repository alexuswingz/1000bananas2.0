import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const NgoosModal = ({ isOpen, onClose, selectedRow }) => {
  const { isDarkMode } = useTheme();
  const [allVariations, setAllVariations] = useState(true);
  const [forecastView, setForecastView] = useState(true);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  const calculateProgressBarValues = (row) => {
    if (!row) return { fbaDays: 23, totalDays: 92, forecastDays: 162, flex1: 3, flex2: 4, flex3: 7 };
    const baseValues = [
      { fbaDays: 23, totalDays: 92, forecastDays: 162, flex1: 3, flex2: 4, flex3: 7 },
      { fbaDays: 18, totalDays: 75, forecastDays: 140, flex1: 3, flex2: 4, flex3: 7 },
      { fbaDays: 15, totalDays: 60, forecastDays: 120, flex1: 3, flex2: 4, flex3: 7 },
    ];
    return baseValues[row.id - 1] || baseValues[0];
  };

  if (!isOpen || !selectedRow) return null;

  const progressValues = calculateProgressBarValues(selectedRow);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className={themeClasses.cardBg}
        style={{
          width: '100%',
          maxWidth: '1120px',
          maxHeight: '94vh',
          borderRadius: '0.9rem',
          boxShadow: '0 24px 80px rgba(15,23,42,0.75)',
          border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
          padding: '1.25rem 1.5rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'auto',
        }}
      >
        {/* Modal header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.35rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                backgroundColor: isDarkMode ? '#111827' : '#EEF2FF',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: '#22C55E' }} />
              <span className={themeClasses.text}>N-GOOS</span>
            </div>
            <div className={themeClasses.text} style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              Never Go Out Of Stock
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                backgroundColor: isDarkMode ? '#1F2937' : '#374151',
                color: '#F9FAFB',
                fontSize: '0.7rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '24px',
                whiteSpace: 'nowrap',
              }}
            >
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
              <span>Label Inventory: 180</span>
            </button>
            <button
              type="button"
              style={{
                padding: '0 0.75rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '0.75rem',
                fontWeight: 500,
                height: '23px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              Add Units (240)
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: isDarkMode ? '#111827' : '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontSize: '1.1rem',
                  lineHeight: 1,
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}
              >
                ×
              </span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'inline-flex',
            gap: '8px',
            padding: '4px',
            borderRadius: '4px',
            backgroundColor: '#2C3544',
            alignSelf: 'flex-start',
            overflow: 'hidden',
          }}
        >
          {['Inventory', 'Sales', 'Ads'].map((tab, idx) => (
            <button
              key={tab}
              type="button"
              style={{
                padding: '4px 24px',
                borderRadius: '4px',
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 500,
                backgroundColor: idx === 0 ? '#2563EB' : 'transparent',
                color: idx === 0 ? '#FFFFFF' : '#9CA3AF',
                cursor: 'pointer',
                transition: 'all 0.2s',
                height: '23px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Top cards row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr',
              gap: '1rem',
            }}
          >
            {/* Product card */}
            <div
              style={{
                borderRadius: '0.75rem',
                border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                background: isDarkMode
                  ? 'linear-gradient(135deg, #020617, #111827)'
                  : 'linear-gradient(135deg, #FFFFFF, #F9FAFB)',
                padding: '0.85rem 1rem',
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '144px',
                  borderRadius: '0.6rem',
                  backgroundColor: '#1F2937',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <span style={{ fontSize: '0.7rem', color: '#9CA3AF', textAlign: 'center' }}>Bottle Image</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <div className={themeClasses.text} style={{ fontSize: '1rem', fontWeight: 600 }}>
                  {selectedRow.product}
                </div>
                <div style={{ fontSize: '0.75rem' }} className={themeClasses.textSecondary}>
                  <div>
                    SIZE: <span className={themeClasses.text}>{selectedRow.size}</span>
                  </div>
                  <div>
                    ASIN: <span className={themeClasses.text}>B0BRTK1PBZ</span>
                  </div>
                  <div>
                    BRAND: <span className={themeClasses.text}>{selectedRow.brand}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FBA card */}
            <div
              style={{
                borderRadius: '0.75rem',
                border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#22C55E' }}>FBA</div>
              <div style={{ fontSize: '0.75rem' }} className={themeClasses.textSecondary}>
                <div>
                  Total: <span className={themeClasses.text}>60</span>
                </div>
                <div>
                  Available: <span className={themeClasses.text}>12</span>
                </div>
                <div>
                  Reserved: <span className={themeClasses.text}>24</span>
                </div>
                <div>
                  Inbound: <span className={themeClasses.text}>0</span>
                </div>
              </div>
            </div>

            {/* AWD card */}
            <div
              style={{
                borderRadius: '0.75rem',
                border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38BDF8' }}>AWD</div>
              <div style={{ fontSize: '0.75rem' }} className={themeClasses.textSecondary}>
                <div>
                  Total: <span className={themeClasses.text}>60</span>
                </div>
                <div>
                  Outbound to FBA: <span className={themeClasses.text}>60</span>
                </div>
                <div>
                  Available: <span className={themeClasses.text}>12</span>
                </div>
                <div>
                  Reserved: <span className={themeClasses.text}>24</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline banner */}
          <div
            style={{
              borderRadius: '0.9rem',
              border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
              padding: '0.85rem 1rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
            }}
          >
            <div style={{ position: 'relative', marginTop: '0.35rem', padding: '0 0.25rem' }}>
              <div style={{ position: 'relative', height: '18px', marginBottom: '0.5rem', marginTop: '2.5rem' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '5%',
                    right: '5%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    height: '2px',
                    backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
                    borderRadius: '1px',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '5%',
                    top: '-32px',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', opacity: 0.85 }} className={themeClasses.textSecondary}>
                    Today
                  </div>
                  <div className={themeClasses.text} style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    11/11/25
                  </div>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: '95%',
                    top: '-32px',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', opacity: 0.85 }} className={themeClasses.textSecondary}>
                    DOI Goal
                  </div>
                  <div className={themeClasses.text} style={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    4/13/25
                  </div>
                </div>
                {[
                  { label: 'Dec', left: '23%' },
                  { label: 'Jan', left: '41%' },
                  { label: 'Feb', left: '59%' },
                  { label: 'Mar', left: '77%' },
                ].map((m) => (
                  <span
                    key={m.label}
                    style={{
                      position: 'absolute',
                      top: '-14px',
                      left: m.left,
                      transform: 'translateX(-50%)',
                      fontSize: '0.65rem',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    }}
                  >
                    {m.label}
                  </span>
                ))}
                {['5%', '23%', '41%', '59%', '77%', '95%'].map((left) => (
                  <div
                    key={left}
                    style={{
                      position: 'absolute',
                      left,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '8px',
                      height: '8px',
                      borderRadius: '9999px',
                      border: `2px solid ${isDarkMode ? '#FFFFFF' : '#000000'}`,
                      backgroundColor: isDarkMode ? '#FFFFFF' : '#000000',
                    }}
                  />
                ))}
              </div>

              <div
                style={{
                  position: 'relative',
                  height: '54px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginLeft: '53px',
                  marginRight: '53px',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '8px',
                    backgroundColor: isDarkMode ? '#020617' : '#E5E7EB',
                  }}
                />
                <div style={{ position: 'relative', display: 'flex', height: '100%' }}>
                  <div
                    style={{
                      flex: progressValues.flex1,
                      backgroundColor: '#A855F7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FDF2FF',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    {progressValues.fbaDays} Days
                    <span style={{ fontSize: '0.65rem', marginLeft: 4 }}>FBA Available</span>
                  </div>
                  <div
                    style={{
                      flex: progressValues.flex2,
                      backgroundColor: '#22C55E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ECFDF3',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    {progressValues.totalDays} Days
                    <span style={{ fontSize: '0.65rem', marginLeft: 4 }}>Total</span>
                  </div>
                  <div
                    style={{
                      flex: progressValues.flex3,
                      backgroundColor: '#1D4ED8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#DBEAFE',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    {progressValues.forecastDays} Days
                    <span style={{ fontSize: '0.65rem', marginLeft: 4 }}>Forecast</span>
                  </div>
                </div>
                <div
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
                </div>
              </div>
            </div>
          </div>

          {/* Unit Forecast */}
          <div
            style={{
              borderRadius: '0.9rem',
              border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
              padding: '0.9rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.25rem',
              }}
            >
              <div className={themeClasses.text} style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                Unit Forecast
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                    All Variations
                  </span>
                  <button
                    type="button"
                    onClick={() => setAllVariations(!allVariations)}
                    style={{
                      width: '38px',
                      height: '20px',
                      borderRadius: '9999px',
                      border: 'none',
                      backgroundColor: allVariations ? '#2563EB' : '#9CA3AF',
                      padding: '0 2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: allVariations ? 'flex-end' : 'flex-start',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '9999px',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}
                    />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                    Forecast View
                  </span>
                  <button
                    type="button"
                    onClick={() => setForecastView(!forecastView)}
                    style={{
                      width: '38px',
                      height: '20px',
                      borderRadius: '9999px',
                      border: 'none',
                      backgroundColor: forecastView ? '#2563EB' : '#9CA3AF',
                      padding: '0 2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: forecastView ? 'flex-end' : 'flex-start',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '9999px',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      }}
                    />
                  </button>
                </div>
                <button
                  type="button"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '9999px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src="/assets/Icon Button.png"
                    alt="Settings"
                    style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                  />
                </button>
                <button
                  type="button"
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '0.4rem',
                    border: `1px solid ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                    backgroundColor: 'transparent',
                    fontSize: '0.75rem',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    cursor: 'pointer',
                  }}
                >
                  <span>2 Years</span>
                  <span style={{ fontSize: '0.6rem' }}>▾</span>
                </button>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                minHeight: '190px',
                borderRadius: '0.75rem',
                border: `1px dashed ${isDarkMode ? '#374151' : '#D1D5DB'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
              }}
              className={themeClasses.textSecondary}
            >
              Forecast chart placeholder
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NgoosModal;

