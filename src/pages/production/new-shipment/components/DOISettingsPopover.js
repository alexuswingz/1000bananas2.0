import React, { useState, useEffect, useRef } from 'react';

/**
 * DOI Settings Popover Component
 * 
 * Displays Required DOI with a settings dropdown for:
 * - Amazon DOI Goal
 * - Inbound Lead Time
 * - Manufacture Lead Time
 * - Total Required DOI (calculated)
 * 
 * Save modes:
 * - "Save as Default" → persists to localStorage (will use database when API is available)
 * - "Apply" → session only (temporary)
 */

const DEFAULT_SETTINGS = {
  amazonDoiGoal: 130,
  inboundLeadTime: 30,
  manufactureLeadTime: 7,
};

const STORAGE_KEY = 'doi_default_settings';

const DOISettingsPopover = ({ 
  onSettingsChange, 
  isDarkMode = true,
  initialSettings = null,
  openByDefault = false 
}) => {
  const [isOpen, setIsOpen] = useState(openByDefault);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);
  
  // Load default settings from localStorage on mount
  const loadDefaultSettings = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading DOI settings:', e);
    }
    return DEFAULT_SETTINGS;
  };
  
  // Current session settings (what's actually being used)
  const [sessionSettings, setSessionSettings] = useState(() => {
    return initialSettings || loadDefaultSettings();
  });
  
  // Popover form values (editable)
  const [formValues, setFormValues] = useState(sessionSettings);
  
  // Calculate total DOI
  const calculateTotal = (settings) => {
    return (parseInt(settings.amazonDoiGoal) || 0) + 
           (parseInt(settings.inboundLeadTime) || 0) + 
           (parseInt(settings.manufactureLeadTime) || 0);
  };
  
  const totalRequiredDOI = calculateTotal(sessionSettings);
  
  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        // Reset form values to session values when closing without applying
        setFormValues(sessionSettings);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, sessionSettings]);
  
  // Handle input changes
  const handleInputChange = (field, value) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setFormValues(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };
  
  // Apply settings (session only)
  const handleApply = () => {
    const newSettings = {
      amazonDoiGoal: parseInt(formValues.amazonDoiGoal) || DEFAULT_SETTINGS.amazonDoiGoal,
      inboundLeadTime: parseInt(formValues.inboundLeadTime) || DEFAULT_SETTINGS.inboundLeadTime,
      manufactureLeadTime: parseInt(formValues.manufactureLeadTime) || DEFAULT_SETTINGS.manufactureLeadTime,
    };
    
    setSessionSettings(newSettings);
    
    // Notify parent of change
    if (onSettingsChange) {
      onSettingsChange(newSettings, calculateTotal(newSettings));
    }
    
    setIsOpen(false);
  };
  
  // Save as default (persists to localStorage/database)
  const handleSaveAsDefault = () => {
    const newSettings = {
      amazonDoiGoal: parseInt(formValues.amazonDoiGoal) || DEFAULT_SETTINGS.amazonDoiGoal,
      inboundLeadTime: parseInt(formValues.inboundLeadTime) || DEFAULT_SETTINGS.inboundLeadTime,
      manufactureLeadTime: parseInt(formValues.manufactureLeadTime) || DEFAULT_SETTINGS.manufactureLeadTime,
    };
    
    // Save to localStorage (will be replaced with API call when backend is ready)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Error saving DOI settings:', e);
    }
    
    setSessionSettings(newSettings);
    
    // Notify parent of change
    if (onSettingsChange) {
      onSettingsChange(newSettings, calculateTotal(newSettings));
    }
    
    setIsOpen(false);
  };
  
  // Notify parent on initial mount with current settings
  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange(sessionSettings, totalRequiredDOI);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Theme styles
  const theme = {
    // Popover background
    popoverBg: isDarkMode ? '#1F2937' : '#FFFFFF',
    popoverBorder: isDarkMode ? '#374151' : '#E5E7EB',
    
    // Text colors
    textPrimary: isDarkMode ? '#F9FAFB' : '#111827',
    textSecondary: isDarkMode ? '#9CA3AF' : '#6B7280',
    textMuted: isDarkMode ? '#6B7280' : '#9CA3AF',
    
    // Input styles
    inputBg: isDarkMode ? '#111827' : '#FFFFFF',
    inputBorder: isDarkMode ? '#374151' : '#D1D5DB',
    inputBorderFocus: '#3B82F6',
    inputText: isDarkMode ? '#F9FAFB' : '#111827',
    
    // Divider
    divider: isDarkMode ? '#374151' : '#E5E7EB',
    
    // Button styles
    primaryBtnBg: '#3B82F6',
    primaryBtnHover: '#2563EB',
    secondaryBtnBg: isDarkMode ? '#374151' : '#F3F4F6',
    secondaryBtnHover: isDarkMode ? '#4B5563' : '#E5E7EB',
    secondaryBtnText: isDarkMode ? '#F9FAFB' : '#374151',
    secondaryBtnBorder: isDarkMode ? '#4B5563' : '#D1D5DB',
    
    // Total highlight
    totalText: '#3B82F6',
  };
  
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* Label */}
      <span style={{ 
        fontSize: '14px', 
        fontWeight: 400, 
        color: theme.textSecondary 
      }}>
        Required DOI
      </span>
      
      {/* DOI Value Button (opens popover) */}
      <button
        ref={buttonRef}
        onClick={() => {
          setFormValues(sessionSettings); // Reset form to current session values
          setIsOpen(!isOpen);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '6px',
          border: `1px solid ${isOpen ? theme.inputBorderFocus : theme.inputBorder}`,
          backgroundColor: theme.inputBg,
          color: theme.inputText,
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          minWidth: '80px',
          justifyContent: 'center',
          transition: 'border-color 0.15s ease',
        }}
      >
        <span>{totalRequiredDOI}</span>
        {/* Dropdown arrow */}
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 12 12" 
          fill="none"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        >
          <path 
            d="M2.5 4.5L6 8L9.5 4.5" 
            stroke={theme.textSecondary} 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </button>
      
      {/* Days label */}
      <span style={{ 
        fontSize: '14px', 
        fontWeight: 400, 
        color: theme.textSecondary 
      }}>
        days
      </span>
      
      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: '0',
            backgroundColor: theme.popoverBg,
            border: `1px solid ${theme.popoverBorder}`,
            borderRadius: '12px',
            boxShadow: isDarkMode 
              ? '0 10px 40px rgba(0, 0, 0, 0.5)' 
              : '0 10px 40px rgba(0, 0, 0, 0.15)',
            padding: '20px',
            minWidth: '340px',
            zIndex: 10000,
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '15px',
                fontWeight: 600,
                color: theme.textPrimary,
              }}>
                DOI Settings
              </span>
              {/* Info icon */}
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: theme.inputBorder,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'help',
                }}
                title="Days of Inventory settings determine how far ahead to plan production"
              >
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: theme.textSecondary 
                }}>
                  i
                </span>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => {
                setIsOpen(false);
                setFormValues(sessionSettings);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.textMuted,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path 
                  d="M12 4L4 12M4 4L12 12" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          
          {/* Settings Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Amazon DOI Goal */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <label style={{ 
                fontSize: '14px', 
                color: theme.textPrimary,
                fontWeight: 400,
              }}>
                Amazon DOI Goal
              </label>
              <input
                type="text"
                value={formValues.amazonDoiGoal}
                onChange={(e) => handleInputChange('amazonDoiGoal', e.target.value)}
                style={{
                  width: '107px',
                  height: '24px',
                  padding: '4px 6px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.inputText,
                  fontSize: '14px',
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = theme.inputBorderFocus}
                onBlur={(e) => e.target.style.borderColor = theme.inputBorder}
              />
            </div>
            
            {/* Inbound Lead Time */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <label style={{ 
                fontSize: '14px', 
                color: theme.textPrimary,
                fontWeight: 400,
              }}>
                Inbound Lead Time
              </label>
              <input
                type="text"
                value={formValues.inboundLeadTime}
                onChange={(e) => handleInputChange('inboundLeadTime', e.target.value)}
                style={{
                  width: '107px',
                  height: '24px',
                  padding: '4px 6px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.inputText,
                  fontSize: '14px',
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = theme.inputBorderFocus}
                onBlur={(e) => e.target.style.borderColor = theme.inputBorder}
              />
            </div>
            
            {/* Manufacture Lead Time */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <label style={{ 
                fontSize: '14px', 
                color: theme.textPrimary,
                fontWeight: 400,
              }}>
                Manufacture Lead Time
              </label>
              <input
                type="text"
                value={formValues.manufactureLeadTime}
                onChange={(e) => handleInputChange('manufactureLeadTime', e.target.value)}
                style={{
                  width: '107px',
                  height: '24px',
                  padding: '4px 6px',
                  borderRadius: '8px',
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.inputText,
                  fontSize: '14px',
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = theme.inputBorderFocus}
                onBlur={(e) => e.target.style.borderColor = theme.inputBorder}
              />
            </div>
            
            {/* Divider */}
            <div style={{ 
              height: '1px', 
              backgroundColor: theme.divider,
              margin: '4px 0',
            }} />
            
            {/* Total Required DOI */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <span style={{ 
                fontSize: '14px', 
                color: theme.textPrimary,
                fontWeight: 400,
              }}>
                Total Required DOI
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: 600,
                color: theme.totalText,
              }}>
                {calculateTotal(formValues)} days
              </span>
            </div>
          </div>
          
          {/* Actions */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: '20px',
          }}>
            {/* Save as Default */}
            <button
              onClick={handleSaveAsDefault}
              style={{
                width: '113px',
                height: '23px',
                padding: 0,
                borderRadius: '4px',
                border: `1px solid ${theme.secondaryBtnBorder}`,
                backgroundColor: theme.secondaryBtnBg,
                color: theme.secondaryBtnText,
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = theme.secondaryBtnHover}
              onMouseLeave={(e) => e.target.style.backgroundColor = theme.secondaryBtnBg}
            >
              Save as Default
            </button>
            
            {/* Apply */}
            <button
              onClick={handleApply}
              style={{
                width: '57px',
                height: '23px',
                padding: 0,
                borderRadius: '4px',
                border: 'none',
                backgroundColor: theme.primaryBtnBg,
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = theme.primaryBtnHover}
              onMouseLeave={(e) => e.target.style.backgroundColor = theme.primaryBtnBg}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DOISettingsPopover;
