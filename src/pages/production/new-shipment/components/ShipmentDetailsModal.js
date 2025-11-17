import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ShipmentDetailsModal = ({ isOpen, onClose }) => {
  const { isDarkMode } = useTheme();
  const [expandedFormula, setExpandedFormula] = useState(null);

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
  };

  if (!isOpen) return null;

  const formulas = [
    {
      name: 'F.Fabric Heavy',
      productCount: '1 Product',
      needed: '6.25 gal needed',
      inventory: 'INV: 1.25/6.25',
      status: 'insufficient',
      message: 'Need to make 5 gal',
    },
    {
      name: 'F.Ultra Bloom',
      productCount: '5 Products',
      needed: '225 gal needed',
      inventory: 'INV: 300/225',
      status: 'ready',
      message: 'Ready',
    },
    {
      name: 'F.Ultra Grow',
      productCount: '3 Products',
      needed: '225 gal needed',
      inventory: 'INV: 300/225',
      status: 'ready',
      message: 'Ready',
      products: [
        { name: 'Cherry Tree Fertilizer', qty: '125 gal' },
        { name: 'Apple Orchard Fertilizer', qty: '65 gal' },
        { name: 'Peach Grove Fertilizer', qty: '35 gal' },
      ],
    },
  ];

  const labels = [
    { name: 'Carpet Cleaner for Pets (16oz)', qty: '0/50', status: 'insufficient' },
    { name: 'Petunia Fertilizer (1 Gallon)', qty: '110/100', status: 'ready' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 50,
        }}
        onClick={onClose}
      />
      {/* Modal - slides from right */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '600px',
          maxWidth: '90vw',
          backgroundColor: isDarkMode ? '#0F172A' : '#F9FAFB',
          zIndex: 51,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.3)',
          transform: 'translateX(0)',
          transition: 'transform 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.5rem',
            borderBottom: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 className={themeClasses.text} style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            Shipment Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isDarkMode ? '#9CA3AF' : '#6B7280',
            }}
          >
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>×</span>
          </button>
        </div>

        {/* Content - scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="hide-scrollbar"
        >
          {/* Summary Card */}
          <div
            className={themeClasses.cardBg}
            style={{
              borderRadius: '0.75rem',
              border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
              padding: '1.25rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '1rem',
              }}
            >
              {[
                { label: 'PALETTES', value: '2/24' },
                { label: 'TOTAL BOXES', value: '10/6' },
                { label: 'UNITS', value: '1,040' },
                { label: 'TIME', value: '42 HRS' },
                { label: 'WEIGHT', value: '3,200 LBS' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      color: isDarkMode ? '#9CA3AF' : '#6B7280',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {stat.label}
                  </div>
                  <div className={themeClasses.text} style={{ fontSize: '1rem', fontWeight: 600 }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formula Requirements */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3 className={themeClasses.text} style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                Formula Requirements
              </h3>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}
              >
                3 Formulas
              </span>
            </div>

            {formulas.map((formula, idx) => (
              <div
                key={idx}
                className={themeClasses.cardBg}
                style={{
                  borderRadius: '0.75rem',
                  border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                  padding: '1rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div className={themeClasses.text} style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      {formula.name} ({formula.productCount})
                    </div>
                    <div
                      style={{
                        height: '8px',
                        borderRadius: '4px',
                        backgroundColor: isDarkMode ? '#1F2937' : '#E5E7EB',
                        overflow: 'hidden',
                        marginTop: '0.5rem',
                        width: '200px',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: formula.status === 'insufficient' ? '20%' : '100%',
                          backgroundColor: formula.status === 'insufficient' ? '#DC2626' : '#22C55E',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: formula.status === 'insufficient' ? '#DC2626' : '#22C55E',
                        marginTop: '0.25rem',
                      }}
                    >
                      {formula.message}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: isDarkMode ? '#9CA3AF' : '#6B7280',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {formula.needed}
                    </div>
                    {formula.products && (
                      <button
                        type="button"
                        onClick={() => setExpandedFormula(expandedFormula === idx ? null : idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isDarkMode ? '#9CA3AF' : '#6B7280',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                      >
                        {expandedFormula === idx ? '▲' : '▼'}
                      </button>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: formula.status === 'insufficient' ? '#DC2626' : '#22C55E',
                  }}
                >
                  {formula.inventory}
                </div>
                {expandedFormula === idx && formula.products && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}` }}>
                    {formula.products.map((product, pIdx) => (
                      <div
                        key={pIdx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0',
                          fontSize: '0.75rem',
                        }}
                        className={themeClasses.text}
                      >
                        <span>{product.name}</span>
                        <span style={{ fontWeight: 600 }}>{product.qty}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Label Requirements */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h3 className={themeClasses.text} style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                Label Requirements
              </h3>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}
              >
                3 Labels
              </span>
            </div>

            {labels.map((label, idx) => (
              <div
                key={idx}
                className={themeClasses.cardBg}
                style={{
                  borderRadius: '0.75rem',
                  border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                  padding: '1rem',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div className={themeClasses.text} style={{ fontSize: '0.9rem' }}>
                  {label.name}
                </div>
                <div
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    color: label.status === 'insufficient' ? '#DC2626' : '#22C55E',
                  }}
                >
                  {label.qty}
                </div>
              </div>
            ))}

            <button
              type="button"
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
                backgroundColor: 'transparent',
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                fontSize: '0.875rem',
                cursor: 'pointer',
                marginTop: '0.5rem',
              }}
            >
              View all Labels (1) ▼
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1.5rem',
            borderTop: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
            display: 'flex',
            gap: '1rem',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: `1px solid ${isDarkMode ? '#1F2937' : '#E5E7EB'}`,
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              color: isDarkMode ? '#E5E7EB' : '#111827',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span>✏️</span>
            Edit Shipment
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span>✓</span>
            Book Shipment
          </button>
        </div>
      </div>
    </>
  );
};

export default ShipmentDetailsModal;

