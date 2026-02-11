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
 * - "Save as Default" → persists to backend API database
 * - "Apply" → applies for this shipment (persisted per shipment; survives navigation)
 */

// Toggle to switch between local and production API
const USE_LOCAL_API = false;

const LOCAL_API_URL = 'http://127.0.0.1:8000';
const RAILWAY_API_URL = 'https://web-production-015c7.up.railway.app';

const FORECAST_API_URL = USE_LOCAL_API ? LOCAL_API_URL : RAILWAY_API_URL;

const DEFAULT_SETTINGS = {
  amazonDoiGoal: 93,
  inboundLeadTime: 30,
  manufactureLeadTime: 7,
};

const STORAGE_KEY = 'doi_default_settings'; // Fallback for localStorage if API fails

/** Load default DOI settings from API or localStorage. Exported for parent revert-to-default. */
export const getDefaultDoiSettings = async () => {
  try {
    const response = await fetch(`${FORECAST_API_URL}/settings/doi`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      const data = await response.json();
      return {
        amazonDoiGoal: data.amazon_doi_goal || DEFAULT_SETTINGS.amazonDoiGoal,
        inboundLeadTime: data.inbound_lead_time || DEFAULT_SETTINGS.inboundLeadTime,
        manufactureLeadTime: data.manufacture_lead_time || DEFAULT_SETTINGS.manufactureLeadTime,
      };
    }
  } catch (e) {
    console.warn('Failed to load DOI settings from API, using fallback:', e);
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading DOI settings from localStorage:', e);
  }
  return DEFAULT_SETTINGS;
};

const DOISettingsPopover = ({ 
  onSettingsChange, 
  isDarkMode = true,
  initialSettings = null,
  openByDefault = false,
  showCustomDoiBadge = false,
  onRevertDoi = null,
}) => {
  const [isOpen, setIsOpen] = useState(openByDefault);
  const [badgeHover, setBadgeHover] = useState(false);
  const tooltipCloseTimeoutRef = useRef(null);
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);
  
  // Loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load default settings from API or localStorage fallback
  const loadDefaultSettings = async () => {
    try {
      // Try to fetch from backend API first
      const response = await fetch(`${FORECAST_API_URL}/settings/doi`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Map API response to component format
        return {
          amazonDoiGoal: data.amazon_doi_goal || DEFAULT_SETTINGS.amazonDoiGoal,
          inboundLeadTime: data.inbound_lead_time || DEFAULT_SETTINGS.inboundLeadTime,
          manufactureLeadTime: data.manufacture_lead_time || DEFAULT_SETTINGS.manufactureLeadTime,
        };
      }
    } catch (e) {
      console.warn('Failed to load DOI settings from API, using localStorage fallback:', e);
    }
    
    // Fallback to localStorage if API fails
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading DOI settings from localStorage:', e);
    }
    
    return DEFAULT_SETTINGS;
  };
  
  // Current session settings (what's actually being used)
  const [sessionSettings, setSessionSettings] = useState(() => {
    return initialSettings || DEFAULT_SETTINGS;
  });
  
  // Popover form values (editable)
  const [formValues, setFormValues] = useState(sessionSettings);
  
  // When parent passes initialSettings (e.g. restored applied DOI for this shipment), sync into session
  useEffect(() => {
    if (initialSettings && typeof initialSettings === 'object') {
      setSessionSettings(initialSettings);
      setFormValues(initialSettings);
    }
  }, [initialSettings]);

  // Clear tooltip close timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipCloseTimeoutRef.current) clearTimeout(tooltipCloseTimeoutRef.current);
    };
  }, []);

  // Load settings from API on mount (or use initialSettings if provided)
  useEffect(() => {
    const fetchSettings = async () => {
      if (initialSettings && typeof initialSettings === 'object') {
        setSessionSettings(initialSettings);
        setFormValues(initialSettings);
        return;
      }
      
      setLoading(true);
      try {
        const settings = await loadDefaultSettings();
        setSessionSettings(settings);
        setFormValues(settings);
        // Notify parent of loaded settings (initial load – parent should not persist as "applied")
        if (onSettingsChange) {
          onSettingsChange(settings, calculateTotal(settings), { source: 'initialLoad' });
        }
      } catch (err) {
        console.error('Error loading DOI settings:', err);
        setError('Failed to load DOI settings');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
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
  
  // Apply settings (session only - not saved to database)
  const handleApply = async () => {
    const newSettings = {
      amazonDoiGoal: parseInt(formValues.amazonDoiGoal) || DEFAULT_SETTINGS.amazonDoiGoal,
      inboundLeadTime: parseInt(formValues.inboundLeadTime) || DEFAULT_SETTINGS.inboundLeadTime,
      manufactureLeadTime: parseInt(formValues.manufactureLeadTime) || DEFAULT_SETTINGS.manufactureLeadTime,
    };
    
    setSessionSettings(newSettings);
    
    // Notify parent of change (Apply = persist for this shipment)
    if (onSettingsChange) {
      onSettingsChange(newSettings, calculateTotal(newSettings), { source: 'apply' });
    }
    
    setIsOpen(false);
  };
  
  // Save as default (persists to backend API database)
  const handleSaveAsDefault = async () => {
    const newSettings = {
      amazonDoiGoal: parseInt(formValues.amazonDoiGoal) || DEFAULT_SETTINGS.amazonDoiGoal,
      inboundLeadTime: parseInt(formValues.inboundLeadTime) || DEFAULT_SETTINGS.inboundLeadTime,
      manufactureLeadTime: parseInt(formValues.manufactureLeadTime) || DEFAULT_SETTINGS.manufactureLeadTime,
    };
    
    setLoading(true);
    setError(null);
    
    try {
      // Save to backend API
      const response = await fetch(`${FORECAST_API_URL}/settings/doi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amazon_doi_goal: newSettings.amazonDoiGoal,
          inbound_lead_time: newSettings.inboundLeadTime,
          manufacture_lead_time: newSettings.manufactureLeadTime,
          save_as_default: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to save settings' }));
        throw new Error(errorData.detail || errorData.error || 'Failed to save settings');
      }

      // Also save to localStorage as fallback
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
      
      setSessionSettings(newSettings);
      
      // Notify parent of change (Save as Default = also persist for this shipment)
      if (onSettingsChange) {
        onSettingsChange(newSettings, calculateTotal(newSettings), { source: 'saveAsDefault' });
      }
      
      setIsOpen(false);
    } catch (err) {
      console.error('Error saving DOI settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };
  
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
      
      {/* DOI Value Button (opens popover) – badge on top-right when custom DOI applied */}
      <div style={{ position: 'relative', display: 'inline-flex' }}>
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
        {showCustomDoiBadge && onRevertDoi && (
          <span
            style={{ position: 'absolute', top: '-6px', right: '-6px', zIndex: 2 }}
            onMouseEnter={() => {
              if (tooltipCloseTimeoutRef.current) {
                clearTimeout(tooltipCloseTimeoutRef.current);
                tooltipCloseTimeoutRef.current = null;
              }
              setBadgeHover(true);
            }}
            onMouseLeave={() => {
              tooltipCloseTimeoutRef.current = setTimeout(() => setBadgeHover(false), 200);
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBadgeHover(true);
              }}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                fontSize: '12px',
                fontWeight: 700,
                lineHeight: 1,
                transition: 'background-color 0.15s ease, transform 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563EB';
                e.currentTarget.style.transform = 'scale(1.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3B82F6';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              !
            </button>
            {badgeHover && (
              <div
                role="tooltip"
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 10px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '200px',
                  height: '92px',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '10px 12px',
                  backgroundColor: theme.popoverBg,
                  border: `1px solid ${theme.popoverBorder}`,
                  borderRadius: '10px',
                  boxShadow: isDarkMode ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.15)',
                  zIndex: 10001,
                  pointerEvents: 'auto',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={() => {
                  if (tooltipCloseTimeoutRef.current) {
                    clearTimeout(tooltipCloseTimeoutRef.current);
                    tooltipCloseTimeoutRef.current = null;
                  }
                  setBadgeHover(true);
                }}
                onMouseLeave={() => setBadgeHover(false)}
              >
                <p style={{ margin: 0, marginBottom: '10px', fontSize: '12px', color: theme.textPrimary, lineHeight: 1.4, flex: 1 }}>
                  This value differs from the global settings for all products.
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRevertDoi();
                    setBadgeHover(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: '100%',
                    padding: '6px 10px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563EB'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#3B82F6'; }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  Revert to Global DOI
                </button>
                {/* Tooltip tail (downward-pointing triangle) */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: '-6px',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: `6px solid ${theme.popoverBg}`,
                  }}
                />
              </div>
            )}
          </span>
        )}
      </div>
      
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
          
          {/* Error message */}
          {error && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: isDarkMode ? '#7F1D1D' : '#FEE2E2',
              color: isDarkMode ? '#FCA5A5' : '#DC2626',
              fontSize: '12px',
            }}>
              {error}
            </div>
          )}
          
          {/* Actions */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: '20px',
          }}>
            {/* Save as Default */}
            <button
              onClick={handleSaveAsDefault}
              disabled={loading}
              style={{
                width: '113px',
                height: '23px',
                padding: 0,
                borderRadius: '4px',
                border: `1px solid ${theme.secondaryBtnBorder}`,
                backgroundColor: loading ? theme.inputBorder : theme.secondaryBtnBg,
                color: theme.secondaryBtnText,
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = theme.secondaryBtnHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = theme.secondaryBtnBg;
                }
              }}
            >
              {loading ? 'Saving...' : 'Save as Default'}
            </button>
            
            {/* Apply */}
            <button
              onClick={handleApply}
              disabled={loading}
              style={{
                width: '57px',
                height: '23px',
                padding: 0,
                borderRadius: '4px',
                border: 'none',
                backgroundColor: loading ? theme.inputBorder : theme.primaryBtnBg,
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = theme.primaryBtnHover;
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.backgroundColor = theme.primaryBtnBg;
                }
              }}
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
