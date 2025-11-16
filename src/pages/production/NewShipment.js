import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const NewShipment = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [isNgoosOpen, setIsNgoosOpen] = useState(false);
  const [allVariations, setAllVariations] = useState(true);
  const [forecastView, setForecastView] = useState(true);

  const themeClasses = {
    pageBg: isDarkMode ? 'bg-dark-bg-primary' : 'bg-light-bg-primary',
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#2C3544]',
  };

  const rows = [
    { id: 1, brand: 'TPS Plant Foods', product: 'Cherry Tree Fertilizer', size: '8oz', qty: 240 },
    { id: 2, brand: 'TPS Plant Foods', product: 'Cherry Tree Fertilizer', size: 'Quart', qty: 96 },
    { id: 3, brand: 'TPS Plant Foods', product: 'Cherry Tree Fertilizer', size: 'Gallon', qty: 28 },
  ];

  return (
    <div className={`min-h-screen ${themeClasses.pageBg}`} style={{ padding: '1.5rem 2rem' }}>
      {/* Top header (no card container, just page background) */}
      <div
        className={themeClasses.cardBg}
        style={{
          padding: '0.75rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {/* First row: back + shipment summary + review button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            height: '40px',
          }}
        >
          {/* Back + meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.7rem',
                borderRadius: '9999px',
                border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                backgroundColor: 'transparent',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              <svg
                style={{ width: '0.95rem', height: '0.95rem' }}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 19L8 12L15 5"
                  stroke={isDarkMode ? '#E5E7EB' : '#111827'}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Back</span>
            </button>

            {/* Shipment meta */}
            <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
              <div>
                <p className="text-[0.7rem] uppercase tracking-wide text-gray-400">Shipment #</p>
                <p className={`${themeClasses.text} text-sm font-semibold`}>2025-09-23</p>
              </div>
              <div>
                <p className="text-[0.7rem] uppercase tracking-wide text-gray-400">Shipment Type</p>
                <p className={`${themeClasses.text} text-sm font-semibold`}>AWD</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <p className="text-[0.7rem] uppercase tracking-wide text-gray-400">Marketplace</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg"
                    alt="Amazon"
                    style={{ height: '0.95rem', objectFit: 'contain' }}
                  />
                </div>
              </div>
              <div>
                <p className="text-[0.7rem] uppercase tracking-wide text-gray-400">Account</p>
                <p className={`${themeClasses.text} text-sm font-semibold`}>TPS</p>
              </div>
            </div>
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Table mode toggle (visual only) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
              }}
              className={themeClasses.textSecondary}
            >
              <span>Table Mode</span>
              <button
                type="button"
                style={{
                  width: '34px',
                  height: '18px',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: '#4B5563',
                  padding: '0 2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                <span
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '9999px',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </button>
            </div>
            {/* Settings icon */}
            <button
              type="button"
              className="hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary transition-colors"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src="/assets/settings-icon.png" alt="Settings" style={{ width: '1.1rem', height: '1.1rem' }} />
            </button>
            {/* Review Shipment */}
            <button
              type="button"
              style={{
                padding: '0.5rem 1.1rem',
                borderRadius: '0.45rem',
                border: 'none',
                backgroundColor: '#E5E7EB',
                color: '#4B5563',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
            >
              Review Shipment
            </button>
          </div>
        </div>

        {/* Second row: stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div
            style={{
              display: 'flex',
              gap: '2.5rem',
              paddingBottom: '0.05rem',
              paddingLeft: '0.25rem',
            }}
            className={themeClasses.textSecondary}
          >
            {[
              { label: 'Palettes', value: 0 },
              { label: 'Total Boxes', value: 0 },
              { label: 'Units', value: 0 },
              { label: 'Time (Hrs)', value: 0 },
              { label: 'Weight (Lbs)', value: 0 },
            ].map((stat) => (
              <div key={stat.label} style={{ fontSize: '0.75rem' }}>
                <span style={{ textTransform: 'uppercase', marginRight: '0.4rem' }}>{stat.label}</span>
                <span className="font-semibold">{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Search bar below Review Shipment (right aligned) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              paddingRight: '0.25rem',
              paddingBottom: '0',
              marginTop: '-4px',
            }}
          >
            <div
              style={{
                maxWidth: '420px',
                width: '100%',
                height: '36px',
                borderRadius: '9999px',
                border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                backgroundColor: isDarkMode ? '#020617' : '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                padding: '0 0.9rem',
                boxShadow: isDarkMode ? 'none' : '0 0 0 1px rgba(229,231,235,0.7)',
              }}
            >
              {/* Search icon */}
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{
                  width: '16px',
                  height: '16px',
                  marginRight: '0.5rem',
                  flexShrink: 0,
                }}
              >
                <path
                  d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79L19 20.49 20.49 19 15.5 14zm-6 0C8.01 14 6 11.99 6 9.5S8.01 5 10.5 5 15 7.01 15 9.5 12.99 14 10.5 14z"
                  fill={isDarkMode ? '#6B7280' : '#D1D5DB'}
                />
              </svg>
              {/* Input */}
              <input
                type="text"
                placeholder="Search..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '0.85rem',
                  color: isDarkMode ? '#E5E7EB' : '#111827',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main table card */}
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
                          ? 160 // Brand
                          : idx === 1
                          ? 200 // Product
                          : idx === 2
                          ? 70 // Size more compact
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
                  {/* Today / Goal row */}
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
                  {/* Months + timeline (absolute for precise alignment) */}
                  <div
                    style={{
                      position: 'relative',
                      height: '22px',
                      marginTop: '-6px',
                    }}
                  >
                    {/* Month labels */}
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
                    {/* Rail */}
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
                    {/* Markers - aligned so first/last sit at the rail ends */}
                    {[
                      '6%', // start of rail (matches left)
                      '24%',
                      '42%',
                      '60%',
                      '78%',
                      '92%', // end of rail (matches right)
                    ].map((left) => (
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
                      onClick={() => setIsNgoosOpen(true)}
                      className="text-xs text-blue-500 hover:text-blue-600"
                    >
                      Cherry Tree Fertilizer...
                    </button>
                  </td>
                  <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }} className={themeClasses.textSecondary}>
                    {row.size}
                  </td>
                  {/* Add button */}
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
                  {/* Qty input */}
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
                  {/* Bar chart - width aligned visually with the header timeline */}
                  <td style={{ padding: '0.65rem 1rem', minWidth: '380px' }}>
                    <div
                      style={{
                        width: '86%',
                        margin: '0 auto',
                        transform: 'translateX(-7px)',
                        position: 'relative',
                      }}
                    >
                      {/* Vertical dashed lines aligned with the start/end markers (simple dashed border, like reference image) */}
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

       {/* Legend below table */}
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

       {/* N-GOOS Modal - starts when clicking product name */}
       {isNgoosOpen && (
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
             }}
           >
             {/* Modal header bar */}
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
                 {/* Top-right pills from reference (Label Inventory + Add Units) */}
                 <button
                   type="button"
                   style={{
                     padding: '0.3rem 0.6rem',
                     borderRadius: '9999px',
                     border: 'none',
                     backgroundColor: '#B91C1C',
                     color: '#F9FAFB',
                     fontSize: '0.7rem',
                     display: 'inline-flex',
                     alignItems: 'center',
                     gap: '0.3rem',
                   }}
                 >
                   <span
                     style={{
                       width: 8,
                       height: 8,
                       borderRadius: 9999,
                       backgroundColor: '#FEE2E2',
                     }}
                   />
                   <span>Label Inventory: 180</span>
                 </button>
                 <button
                   type="button"
                   style={{
                     padding: '0.4rem 0.9rem',
                     borderRadius: '9999px',
                     border: 'none',
                     backgroundColor: '#2563EB',
                     color: '#EFF6FF',
                     fontSize: '0.75rem',
                     fontWeight: 500,
                   }}
                 >
                   Add Units (240)
                 </button>
                 <button
                   type="button"
                   onClick={() => setIsNgoosOpen(false)}
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

             {/* Tabs row */}
             <div
               style={{
                 display: 'inline-flex',
                 gap: '0.5rem',
                 padding: '0.1rem',
                 borderRadius: '9999px',
                 backgroundColor: isDarkMode ? '#111827' : '#E5E7EB',
                 alignSelf: 'flex-start',
               }}
             >
               {['Inventory', 'Sales', 'Ads'].map((tab, idx) => (
                 <button
                   key={tab}
                   type="button"
                   style={{
                     padding: '0.25rem 0.85rem',
                     borderRadius: '9999px',
                     border: 'none',
                     fontSize: '0.75rem',
                     fontWeight: 500,
                     backgroundColor: idx === 0 ? '#2563EB' : 'transparent',
                     color: idx === 0 ? '#F9FAFB' : isDarkMode ? '#9CA3AF' : '#4B5563',
                   }}
                 >
                   {tab}
                 </button>
               ))}
             </div>

             {/* Main content area: top cards + timeline */}
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
                     background:
                       isDarkMode ?
                         'linear-gradient(135deg, #020617, #111827)' :
                         'linear-gradient(135deg, #FFFFFF, #F9FAFB)',
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
                       Monstera Plant Food
                     </div>
                     <div style={{ fontSize: '0.75rem' }} className={themeClasses.textSecondary}>
                       <div>SIZE: <span className={themeClasses.text}>8oz</span></div>
                       <div>ASIN: <span className={themeClasses.text}>B0BRTK1PBZ</span></div>
                       <div>BRAND: <span className={themeClasses.text}>TPS Plant Foods</span></div>
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
                     <div>Total: <span className={themeClasses.text}>60</span></div>
                     <div>Available: <span className={themeClasses.text}>12</span></div>
                     <div>Reserved: <span className={themeClasses.text}>24</span></div>
                     <div>Inbound: <span className={themeClasses.text}>0</span></div>
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
                     <div>Total: <span className={themeClasses.text}>60</span></div>
                     <div>Outbound to FBA: <span className={themeClasses.text}>60</span></div>
                     <div>Available: <span className={themeClasses.text}>12</span></div>
                     <div>Reserved: <span className={themeClasses.text}>24</span></div>
                   </div>
                 </div>
               </div>

               {/* Large timeline banner like reference */}
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
                 {/* Today / Goal labels */}
                 <div
                   style={{
                     display: 'flex',
                     justifyContent: 'space-between',
                     fontSize: '0.75rem',
                   }}
                   className={themeClasses.textSecondary}
                 >
                   <div>
                     <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>Today</div>
                     <div className={themeClasses.text} style={{ fontWeight: 600 }}>
                       11/11/25
                     </div>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                     <div style={{ fontSize: '0.7rem', opacity: 0.85 }}>DOI Goal</div>
                     <div className={themeClasses.text} style={{ fontWeight: 600 }}>
                       4/13/25
                     </div>
                   </div>
                 </div>

                 {/* Timeline bar */}
                 <div
                   style={{
                     position: 'relative',
                     marginTop: '0.35rem',
                     padding: '0 0.25rem',
                   }}
                 >
                   {/* Rail markers row (Dec–Mar) */}
                   <div
                     style={{
                       position: 'relative',
                       height: '18px',
                       marginBottom: '0.5rem',
                     }}
                   >
                     {/* Horizontal timeline line */}
                     <div
                       style={{
                         position: 'absolute',
                         left: '5%',
                         right: '5%',
                         top: '50%',
                         transform: 'translateY(-50%)',
                         height: '2px',
                         backgroundColor: '#FFFFFF',
                         borderRadius: '1px',
                       }}
                     />
                     {/* Month labels */}
                     {[
                       { label: 'Dec', left: '10%' },
                       { label: 'Jan', left: '32%' },
                       { label: 'Feb', left: '56%' },
                       { label: 'Mar', left: '78%' },
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
                     {/* Timeline markers/dots */}
                     {['10%', '32%', '56%', '78%'].map((left) => (
                       <div
                         key={left}
                         style={{
                           position: 'absolute',
                           left,
                           top: '50%',
                           transform: 'translate(-50%, -50%)',
                           width: '6px',
                           height: '6px',
                           borderRadius: '9999px',
                           backgroundColor: '#FFFFFF',
                           border: `2px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
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
                    }}
                  >
                     {/* Background rail */}
                     <div
                       style={{
                         position: 'absolute',
                         inset: 0,
                         borderRadius: '8px',
                         backgroundColor: isDarkMode ? '#020617' : '#E5E7EB',
                       }}
                     />
                     {/* Colored segments */}
                     <div
                       style={{
                         position: 'relative',
                         display: 'flex',
                         height: '100%',
                       }}
                     >
                       <div
                         style={{
                           flex: 3,
                           backgroundColor: '#A855F7',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           color: '#FDF2FF',
                           fontSize: '0.8rem',
                           fontWeight: 600,
                         }}
                       >
                         23 Days
                         <span style={{ fontSize: '0.65rem', marginLeft: 4 }}>FBA Available</span>
                       </div>
                       <div
                         style={{
                           flex: 4,
                           backgroundColor: '#22C55E',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           color: '#ECFDF3',
                           fontSize: '0.8rem',
                           fontWeight: 600,
                         }}
                       >
                         92 Days
                         <span style={{ fontSize: '0.65rem', marginLeft: 4 }}>Total</span>
                       </div>
                       <div
                         style={{
                           flex: 7,
                           backgroundColor: '#1D4ED8',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           color: '#DBEAFE',
                           fontSize: '0.8rem',
                           fontWeight: 600,
                         }}
                       >
                         162 Days
                         <span style={{ fontSize: '0.65rem', marginLeft: 4 }}>Forecast</span>
                       </div>
                     </div>

                     {/* Right-side +5 tag */}
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

               {/* Unit Forecast placeholder area */}
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
                   <div
                     style={{
                       display: 'flex',
                       alignItems: 'center',
                       gap: '0.85rem',
                     }}
                   >
                     {/* All Variations toggle */}
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                       <span
                         style={{
                           fontSize: '0.75rem',
                           color: isDarkMode ? '#9CA3AF' : '#6B7280',
                         }}
                       >
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

                     {/* Forecast View toggle */}
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                       <span
                         style={{
                           fontSize: '0.75rem',
                           color: isDarkMode ? '#9CA3AF' : '#6B7280',
                         }}
                       >
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

                     {/* Settings gear icon */}
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

                     {/* 2 Years dropdown */}
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
       )}
    </div>
  );
};

export default NewShipment;


