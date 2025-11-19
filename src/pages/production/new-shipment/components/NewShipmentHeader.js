import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../../../context/ThemeContext';

const NewShipmentHeader = ({ tableMode, onTableModeToggle, onReviewShipmentClick, shipmentData, totalUnits = 0, totalBoxes = 0 }) => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  // Default values if shipmentData is not provided
  const shipmentNumber = shipmentData?.shipmentNumber || '2025-09-23';
  const shipmentType = shipmentData?.shipmentType || 'AWD';
  const location = shipmentData?.location || '-';
  const account = shipmentData?.account || 'TPS';

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  return (
    <div
      className={themeClasses.cardBg}
      style={{
        padding: '0.75rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        borderRadius: '0.75rem',
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
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.7rem',
              borderRadius: '6px',
              border: '1px solid #E5E7EB',
              backgroundColor: '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: '#374151',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F9FAFB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
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
                stroke="#374151"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ color: '#374151' }}>Back</span>
          </button>

          {/* Shipment meta */}
            <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '0.25rem', fontWeight: 600 }}>Shipment #</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: isDarkMode ? '#E5E7EB' : '#111827' }}>{shipmentNumber}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '0.25rem', fontWeight: 600 }}>Shipment Type</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: isDarkMode ? '#E5E7EB' : '#111827' }}>{shipmentType}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '0.25rem', fontWeight: 600 }}>Location</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: isDarkMode ? '#E5E7EB' : '#111827' }}>{location}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '0.25rem', fontWeight: 600 }}>Marketplace</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  {shipmentData?.supplier === 'walmart' ? (
                    <img
                      src="/assets/Walmart_logo_(2008).svg 1.png"
                      alt="Walmart"
                      style={{ height: '0.95rem', objectFit: 'contain' }}
                    />
                  ) : (
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg"
                      alt="Amazon"
                      style={{ height: '0.95rem', objectFit: 'contain' }}
                    />
                  )}
                </div>
              </div>
              <div>
                <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: isDarkMode ? '#9CA3AF' : '#6B7280', marginBottom: '0.25rem', fontWeight: 600 }}>Account</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: isDarkMode ? '#E5E7EB' : '#111827' }}>{account}</p>
              </div>
            </div>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Table mode toggle */}
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
              onClick={onTableModeToggle}
              style={{
                width: '34px',
                height: '18px',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: '#4B5563',
                padding: '0 2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: tableMode ? 'flex-end' : 'flex-start',
                cursor: 'pointer',
                transition: 'all 0.2s',
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
            onClick={onReviewShipmentClick}
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
            { label: 'Total Boxes', value: totalBoxes },
            { label: 'Units', value: totalUnits },
            { label: 'Time (Hrs)', value: 0 },
            { label: 'Weight (Lbs)', value: 0 },
          ].map((stat) => (
            <div key={stat.label} style={{ fontSize: '0.875rem', fontWeight: 500, color: isDarkMode ? '#E5E7EB' : '#111827' }}>
              <span style={{ textTransform: 'uppercase', marginRight: '0.4rem', fontWeight: 600 }}>{stat.label}</span>
              <span style={{ fontWeight: 700 }}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Search bar */}
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
  );
};

export default NewShipmentHeader;


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

            { label: 'Total Boxes', value: totalBoxes },
            { label: 'Units', value: totalUnits },
            { label: 'Time (Hrs)', value: 0 },

            { label: 'Weight (Lbs)', value: 0 },

          ].map((stat) => (

            <div key={stat.label} style={{ fontSize: '0.875rem', fontWeight: 500, color: isDarkMode ? '#E5E7EB' : '#111827' }}>
              <span style={{ textTransform: 'uppercase', marginRight: '0.4rem', fontWeight: 600 }}>{stat.label}</span>
              <span style={{ fontWeight: 700 }}>{stat.value}</span>
            </div>

          ))}

        </div>



        {/* Search bar */}

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

  );

};



export default NewShipmentHeader;




