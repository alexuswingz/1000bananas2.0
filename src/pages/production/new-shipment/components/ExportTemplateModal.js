import React, { useState } from 'react';
import { useTheme } from '../../../../context/ThemeContext';

const ExportTemplateModal = ({ isOpen, onClose, onExport }) => {
  const { isDarkMode } = useTheme();
  const [selectedType, setSelectedType] = useState(null);

  if (!isOpen) return null;

  const shipmentTypes = [
    {
      id: 'fba',
      label: 'FBA',
      icon: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            fontSize: '22px', 
            fontWeight: 'bold', 
            color: '#000000', 
            letterSpacing: '-0.5px',
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.2'
          }}>
            amazon
          </div>
          <div style={{ 
            width: '75px', 
            height: '3px', 
            backgroundColor: '#FF9900', 
            borderRadius: '2px',
            marginTop: '2px'
          }}></div>
        </div>
      ),
    },
    {
      id: 'awd',
      label: 'AWD',
      icon: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ 
            fontSize: '22px', 
            fontWeight: 'bold', 
            color: '#000000', 
            letterSpacing: '-0.5px',
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.2'
          }}>
            amazon
          </div>
          <div style={{ 
            width: '75px', 
            height: '3px', 
            backgroundColor: '#FF9900', 
            borderRadius: '2px',
            marginTop: '2px'
          }}></div>
        </div>
      ),
    },
    {
      id: 'production-order',
      label: 'Production Order',
      icon: (
        <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="32" width="34" height="10" fill="#000000" rx="1"/>
          <rect x="12" y="23" width="26" height="10" fill="#000000" rx="1"/>
          <rect x="16" y="14" width="18" height="10" fill="#000000" rx="1"/>
        </svg>
      ),
    },
  ];

  const handleExport = () => {
    if (selectedType && onExport) {
      onExport(selectedType);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 9998,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '800px',
            height: 'auto',
            border: '1px solid #E5E7EB',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 9999,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ 
            padding: '16px 24px',
            borderBottom: '1px solid #E5E7EB',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            height: 'auto',
            width: '100%',
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#374151',
              margin: 0,
            }}>
              Export Template
            </h2>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#374151',
                width: '24px',
                height: '24px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content - scrollable */}
          <div style={{ 
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '24px',
            scrollbarWidth: 'thin',
          }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              color: '#374151',
              marginBottom: '16px',
            }}>
              Select Shipment Type*
            </label>

            {/* Shipment Type Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '176px 176px 176px',
              gap: '15px',
              justifyContent: 'flex-start',
            }}>
              {shipmentTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedType(type.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    padding: '32px',
                    border: selectedType === type.id
                      ? '2px solid #3B82F6'
                      : '1px solid #E5E7EB',
                    borderRadius: '12px',
                    backgroundColor: selectedType === type.id
                      ? 'rgba(59, 130, 246, 0.05)'
                      : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    width: '176px',
                    height: '174px',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedType !== type.id) {
                      e.currentTarget.style.borderColor = '#D1D5DB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedType !== type.id) {
                      e.currentTarget.style.borderColor = '#E5E7EB';
                    }
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flex: '1',
                  }}>
                    {type.icon}
                  </div>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#374151',
                    textAlign: 'center',
                  }}>
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ 
            padding: '16px 24px',
            borderRight: '1px solid #E5E7EB',
            borderBottom: '1px solid #E5E7EB',
            borderLeft: '1px solid #E5E7EB',
            borderTop: '1px solid #E5E7EB',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            display: 'flex', 
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '10px',
            height: '63px',
            width: '100%',
            flexShrink: 0,
            flexGrow: 0,
            backgroundColor: '#FFFFFF',
            boxSizing: 'border-box',
          }}>
            <button
              type="button"
              onClick={handleExport}
              disabled={!selectedType}
              style={{
                padding: '0',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: selectedType ? '#3B82F6' : '#9CA3AF',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: selectedType ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s',
                width: '70px',
                height: '31px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                if (selectedType) {
                  e.currentTarget.style.backgroundColor = '#2563EB';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedType) {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                }
              }}
            >
              Export
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ExportTemplateModal;
