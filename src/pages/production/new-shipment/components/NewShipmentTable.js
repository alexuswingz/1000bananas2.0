import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { useTheme } from '../../../../context/ThemeContext';
import { useSidebar } from '../../../../context/SidebarContext';
import { toast } from 'sonner';
import SortFormulasFilterDropdown from './SortFormulasFilterDropdown';
import ProductsFilterDropdown from './ProductsFilterDropdown';

const parseSuggestedQtyValue = (value) => {
  if (value === undefined || value === null) return undefined;
  const cleaned = typeof value === 'number'
    ? String(value)
    : String(value).trim();
  if (cleaned === '') return undefined;
  const numeric = Number(cleaned.replace(/,/g, ''));
  return Number.isNaN(numeric) ? undefined : numeric;
};

const getSuggestedQtyFromRow = (row) => {
  const candidates = [row.suggestedQty, row.units_to_make, row.unitsToMake];
  for (const candidate of candidates) {
    const parsed = parseSuggestedQtyValue(candidate);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
};

// Memoized bar fill so adding/updating other rows doesn't re-render this bar and interrupt its transition
const BarFill = React.memo(function BarFill({ widthPct, backgroundColor, durationSec = 1.2 }) {
  return (
    <div
      style={{
        width: `${widthPct}%`,
        height: '100%',
        backgroundColor,
        transition: `width ${durationSec}s ease-in-out`,
      }}
    />
  );
});

const NewShipmentTable = ({
  rows,
  tableMode,
  hideFooter = false, // Hide footer when e.g. N-GOOS modal is open
  onProductClick,
  qtyValues,
  onQtyChange,
  onAddedRowsChange,
  addedRows: externalAddedRows = null,
  labelsAvailabilityMap = {},
  forecastRange = 120,
  manuallyEditedIndicesRef = null, // Ref to expose manually edited indices to parent
  onBrandFilterChange = null, // Callback to pass brand filter to parent
  account = null, // Account name to determine which brands to show
  doiSettingsChangeCount = 0, // Track when DOI settings have changed
  totalPalettes = 0,
  totalProducts = 0,
  totalBoxes = 0,
  totalUnits = 0,
  totalTimeHours = 0,
  onClear = null, // Callback for Clear button
  onExport = null, // Callback for Export button
  totalWeightLbs = 0,
  totalFormulas = 0,
  addProductsUndoStackLength = 0,
  addProductsRedoStackLength = 0,
  onAddProductsUndo = null,
  onAddProductsRedo = null,
}) => {
  // Account to Brand mapping (for checking if all brands are selected)
  const ACCOUNT_BRAND_MAPPING = {
    'TPS Nutrients': ['TPS Nutrients', 'Bloom City', 'TPS Plant Foods'],
    'The Plant Shoppe, LLC': ['TPS Nutrients', 'TPS Plant Foods', 'Bloom City'],
    'Total Pest Supply': ['NatureStop', "Ms. Pixie's", "Burke's", 'Mint +'],
  };
  const { isDarkMode } = useTheme();
  const { sidebarWidth } = useSidebar();
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [addedRows, setAddedRows] = useState(new Set());
  const [selectionFilter, setSelectionFilter] = useState('all'); // all | checked | unchecked
  const selectAllCheckboxRef = useRef(null);
  const nonTableSelectAllCheckboxRef = useRef(null);
  const [clickedQtyIndex, setClickedQtyIndex] = useState(null);
  const [hoveredQtyIndex, setHoveredQtyIndex] = useState(null);
  const [hoveredAddIndex, setHoveredAddIndex] = useState(null);
  const [hoveredWarningIndex, setHoveredWarningIndex] = useState(null);
  const [hoveredInventoryWarningIndex, setHoveredInventoryWarningIndex] = useState(null);
  const [inventoryTooltipPosition, setInventoryTooltipPosition] = useState({ top: 0, left: 0, visible: false, label: '' });
  const [labelsTooltipPosition, setLabelsTooltipPosition] = useState({ top: 0, left: 0, visible: false, labelsAvailable: 0 });
  const inventoryWarningIconRefs = useRef({});
  const labelsWarningIconRefs = useRef({});
  const qtyContainerRefs = useRef({});
  const popupRefs = useRef({});
  const qtyInputRefs = useRef({});
  const addButtonRefs = useRef({});
  const addPopupRefs = useRef({});
  const warningIconRefs = useRef({});
  // Track when the "Use Available" label-inventory suggestion has been applied per product
  // so we can show a permanent reset icon in those cases
  const [labelSuggestionUsage, setLabelSuggestionUsage] = useState({});
  // Toggle to show FBA Available bar (how much you need to get to 30-day DOI goal) per product
  const [showFbaBar, setShowFbaBar] = useState(false);
  const [showDoiBar, setShowDoiBar] = useState(true);
  // Initialize local ref once
  const localManuallyEditedIndicesRef = useRef(new Set());
  
  // On mount, if parent provided a ref, copy any existing values and use parent's Set
  useEffect(() => {
    if (manuallyEditedIndicesRef) {
      // If parent has no Set yet, create one
      if (!manuallyEditedIndicesRef.current) {
        manuallyEditedIndicesRef.current = new Set();
      }
    }
  }, []); // Only on mount
  
  // Always use parent's Set if provided, otherwise use local Set
  // This creates a getter that always returns the current Set
  const getManuallyEditedSet = () => {
    return manuallyEditedIndicesRef?.current || localManuallyEditedIndicesRef.current;
  };
  
  // Create a ref-like object that always points to the correct Set
  const manuallyEditedIndices = {
    get current() {
      return getManuallyEditedSet();
    }
  };
  const rawQtyInputValues = useRef({}); // Store raw input values while typing (before rounding)
  const originalSuggestedQtyValues = useRef({}); // Store original suggested quantities for reset functionality (keyed by product ID)
  const originalSuggestedQtyValuesByIndex = useRef({}); // Also store by index for quick lookup
  const originalDoiValues = useRef({}); // Store original DOI values to detect changes (keyed by product ID)
  const getStoredOriginalQtyValue = (productId, idx) => {
    if (productId && Object.prototype.hasOwnProperty.call(originalSuggestedQtyValues.current, productId)) {
      return originalSuggestedQtyValues.current[productId];
    }
    if (idx !== undefined && Object.prototype.hasOwnProperty.call(originalSuggestedQtyValuesByIndex.current, idx)) {
      return originalSuggestedQtyValuesByIndex.current[idx];
    }
    return '';
  };
  const storeOriginalQtyValue = (row, storageIndex, value) => {
    const normalizedValue = value !== undefined && value !== null ? value : '';
    const productId = row.id || row.asin || row.child_asin || row.childAsin;
    if (productId && originalSuggestedQtyValues.current[productId] === undefined) {
      originalSuggestedQtyValues.current[productId] = normalizedValue;
    }
    originalSuggestedQtyValuesByIndex.current[storageIndex] = normalizedValue;
  };
  const [qtyInputUpdateTrigger, setQtyInputUpdateTrigger] = useState(0); // Trigger re-renders during typing
  const [openFilterIndex, setOpenFilterIndex] = useState(null);
  const filterRefs = useRef({});
  const filterModalRefs = useRef({});
  
  // Filter dropdown state for bottles, closures, boxes, labels
  const [openFilterColumns, setOpenFilterColumns] = useState(() => new Set());
  const filterIconRefs = useRef({});
  const filterDropdownRefs = useRef({}); // Store refs to dropdown DOM elements
  const [columnFilters, setColumnFilters] = useState({});
  const [columnSortConfig, setColumnSortConfig] = useState([]);
  // Store the sorted order (array of row IDs) to preserve positions after sorting
  const [sortedRowOrder, setSortedRowOrder] = useState(null);
  
  // Store original row order when component first loads (for Reset functionality)
  const originalRowOrder = useRef(null);
  
  // Ref to store current filtered rows (without sorting) for use in sort handler
  const currentFilteredRowsRef = useRef([]);
  
  // Non-table mode filter state
  const [nonTableOpenFilterColumn, setNonTableOpenFilterColumn] = useState(null);
  const nonTableFilterIconRefs = useRef({});
  const nonTableFilterDropdownRef = useRef(null);
  const [nonTableFilters, setNonTableFilters] = useState({});
  const nonTableContainerRef = useRef(null);
  const nonTableDataScrollRef = useRef(null);
  const nonTableDataScrollWrapperRef = useRef(null);
  const [showDataScrollThumb, setShowDataScrollThumb] = useState(false);
  const [dataScrollMetrics, setDataScrollMetrics] = useState({ scrollTop: 0, scrollHeight: 0, clientHeight: 0 });
  const nonTableThumbDragRef = useRef(false);
  const nonTableThumbRef = useRef(null);

  // Horizontal scrollbar visibility state
  const tableContainerRef = useRef(null);
  const [isScrollingHorizontally, setIsScrollingHorizontally] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const lastScrollLeftRef = useRef(0);

  // Shipment Stats popup (three-dots next to Export for Upload)
  const [shipmentStatsMenuOpen, setShipmentStatsMenuOpen] = useState(false);
  const shipmentStatsPopupRef = useRef(null);
  const [footerStatsVisibility, setFooterStatsVisibility] = useState({
    products: true,
    palettes: true,
    boxes: true,
    weightLbs: true,
    units: false,
    formulas: true,
    timeHours: true,
  });

  // Close Shipment Stats popup when clicking outside
  useEffect(() => {
    if (!shipmentStatsMenuOpen) return;
    const handleClick = (e) => {
      const popup = shipmentStatsPopupRef.current;
      const isTrigger = e.target.closest('[data-shipment-stats-trigger]');
      if (popup && !popup.contains(e.target) && !isTrigger) setShipmentStatsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [shipmentStatsMenuOpen]);

  // Add style tag for horizontal scrollbar visibility
  useEffect(() => {
    const styleId = 'new-shipment-table-scrollbar-style';
    let style = document.getElementById(styleId);
    
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    
    style.textContent = `
      .new-shipment-table-scroll {
        /* Firefox - hidden by default, show on hover/scroll */
        scrollbar-width: thin;
        scrollbar-color: transparent transparent;
        box-sizing: border-box !important;
        overflow-y: overlay !important;
      }
      .new-shipment-table-scroll:hover,
      .new-shipment-table-scroll.is-scrolling {
        scrollbar-color: ${isDarkMode ? '#64748B' : '#6B7280'} transparent;
      }
      /* Webkit - overlay scrollbar, hidden by default, only show when scrolling */
      .new-shipment-table-scroll::-webkit-scrollbar {
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
      }
      /* Show horizontal scrollbar only when there's overflow and user is scrolling/hovering */
      .new-shipment-table-scroll.scrolling-horizontal::-webkit-scrollbar,
      .new-shipment-table-scroll:hover::-webkit-scrollbar {
        height: 8px !important;
        width: 0 !important;
      }
      .new-shipment-table-scroll::-webkit-scrollbar:vertical {
        width: 12px !important;
        background: transparent !important;
      }
      .new-shipment-table-scroll::-webkit-scrollbar-track {
        background: transparent !important;
        border-radius: 6px !important;
      }
      .new-shipment-table-scroll::-webkit-scrollbar-thumb {
        background: transparent !important;
        border-radius: 6px !important;
        border: 2px solid transparent !important;
        min-height: 30px !important;
        cursor: pointer !important;
      }
      /* Show scrollbar on hover or while scrolling */
      .new-shipment-table-scroll:hover::-webkit-scrollbar-thumb,
      .new-shipment-table-scroll.is-scrolling::-webkit-scrollbar-thumb {
        background: ${isDarkMode ? '#64748B' : '#6B7280'} !important;
        border: 2px solid ${isDarkMode ? '#1F2937' : '#F3F4F6'} !important;
      }
      .new-shipment-table-scroll:hover::-webkit-scrollbar-thumb:hover,
      .new-shipment-table-scroll.is-scrolling::-webkit-scrollbar-thumb:hover {
        background: ${isDarkMode ? '#94A3B8' : '#4B5563'} !important;
      }
      /* Horizontal scrollbar - already handled above */
      .new-shipment-table-scroll.scrolling-horizontal::-webkit-scrollbar-thumb,
      .new-shipment-table-scroll:hover::-webkit-scrollbar-thumb {
        background: ${isDarkMode ? '#4B5563' : '#9CA3AF'} !important;
      }
      .new-shipment-table-scroll.scrolling-horizontal::-webkit-scrollbar-thumb:hover,
      .new-shipment-table-scroll:hover::-webkit-scrollbar-thumb:hover {
        background: ${isDarkMode ? '#94A3B8' : '#6B7280'} !important;
      }
      /* Ensure table structure integrity - prevent row splitting */
      .new-shipment-table-scroll table {
        table-layout: auto !important;
        border-collapse: separate !important;
        border-spacing: 0 !important;
        width: max-content !important;
        min-width: 100% !important;
        display: table !important;
      }
      .new-shipment-table-scroll thead {
        display: table-header-group !important;
      }
      .new-shipment-table-scroll tbody {
        display: table-row-group !important;
      }
      .new-shipment-table-scroll tr {
        display: table-row !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .new-shipment-table-scroll th,
      .new-shipment-table-scroll td {
        display: table-cell !important;
        word-break: keep-all !important;
        overflow-wrap: normal !important;
        box-sizing: border-box !important;
      }
      /* Prevent row breaking - ensure cells stay in their rows */
      /* Ensure rows scroll together */
      .new-shipment-table-scroll tbody tr {
        position: relative !important;
      }
      .new-shipment-table-scroll {
        background: transparent !important;
      }
      /* Ensure table extends naturally without compression; add outer border */
      .new-shipment-table-scroll table {
        margin: 0 !important;
        max-width: none !important;
        border: 1px solid ${isDarkMode ? '#334155' : '#E2E8F0'} !important;
        border-radius: 8px !important;
      }
      /* Checkbox: default (unchecked) - no inline background so :checked can apply */
      .new-shipment-checkbox {
        background-color: ${isDarkMode ? '#1A2235' : '#FFFFFF'} !important;
      }
      /* Checkbox: checked state - blue background + white check mark */
      .new-shipment-checkbox:checked {
        background-color: #3B82F6 !important;
        border-color: #3B82F6 !important;
        background-image: url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%278%27 viewBox=%270 0 10 8%27 fill=%27none%27%3E%3Cpath d=%27M1 4L4 7L9 1%27 stroke=%27white%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E") !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        background-size: 10px 8px !important;
      }
    `;
  }, [isDarkMode]);

  // Handle scroll events to show/hide horizontal scrollbar
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const checkHorizontalScroll = () => {
      const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
      // Always show scrollbar if there's horizontal overflow
      setIsScrollingHorizontally(hasHorizontalScroll);
    };

    const handleScroll = () => {
      const currentScrollLeft = container.scrollLeft;
      const hasHorizontalScroll = container.scrollWidth > container.clientWidth;
      
      // Always show scrollbar if there's horizontal scroll available
      if (hasHorizontalScroll) {
        setIsScrollingHorizontally(true);
        lastScrollLeftRef.current = currentScrollLeft;
        
        // Don't hide it automatically - keep it visible when there's overflow
        // The hover state will handle visibility
      } else {
        // No horizontal scroll available, ensure it's hidden
        setIsScrollingHorizontally(false);
      }
    };

    // Handle wheel events for horizontal scrolling
    const handleWheel = (e) => {
      // Check if this is a horizontal scroll (shift+wheel or trackpad horizontal scroll)
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        handleScroll();
      }
    };

    // Check on mount and resize
    checkHorizontalScroll();
    const resizeObserver = new ResizeObserver(() => {
      checkHorizontalScroll();
    });
    resizeObserver.observe(container);

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: true });
    
    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Custom thumb: rAF loop updates thumb every frame while scrolling so it never lags behind
  useEffect(() => {
    const container = nonTableDataScrollRef.current;
    if (!container) return;
    let scrollTimeout;
    let scrollActive = false;
    let rafId = null;
    let cachedScrollable = null;
    let cachedTrackHeight = null;
    let cachedThumbHeight = null;

    const updateThumb = () => {
      const thumbEl = nonTableThumbRef.current;
      if (!thumbEl || nonTableThumbDragRef.current) return;
      if (cachedScrollable == null || cachedScrollable <= 0) return;
      const scrollTop = container.scrollTop;
      const thumbTop = (scrollTop / cachedScrollable) * cachedTrackHeight;
      thumbEl.style.transform = `translateY(${thumbTop}px)`;
    };

    const tick = () => {
      if (!scrollActive) return;
      updateThumb();
      rafId = requestAnimationFrame(tick);
    };

    const handleScroll = () => {
      if (nonTableThumbDragRef.current) return;
      const thumbEl = nonTableThumbRef.current;
      if (!thumbEl) return;
      if (cachedScrollable == null) {
        const sh = container.scrollHeight;
        const ch = container.clientHeight;
        cachedScrollable = sh - ch;
        if (cachedScrollable <= 0) return;
        cachedThumbHeight = Math.max(20, (ch / sh) * ch);
        cachedTrackHeight = ch - cachedThumbHeight;
      }
      if (cachedScrollable <= 0) return;
      scrollActive = true;
      thumbEl.classList.add('non-table-thumb-scroll-visible');
      container.classList.add('is-scrolling');
      updateThumb();
      if (rafId == null) rafId = requestAnimationFrame(tick);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        scrollActive = false;
        if (rafId != null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        cachedScrollable = null;
        cachedTrackHeight = null;
        cachedThumbHeight = null;
        const el = nonTableThumbRef.current;
        if (el) el.classList.remove('non-table-thumb-scroll-visible');
        setDataScrollMetrics({
          scrollTop: container.scrollTop,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
        });
        container.classList.remove('is-scrolling');
        setShowDataScrollThumb(false);
      }, 1500);
    };
    const handleWheel = () => {
      if (nonTableThumbDragRef.current) return;
      const thumbEl = nonTableThumbRef.current;
      if (!thumbEl) return;
      if (cachedScrollable == null) {
        const sh = container.scrollHeight;
        const ch = container.clientHeight;
        cachedScrollable = sh - ch;
        if (cachedScrollable <= 0) return;
        cachedThumbHeight = Math.max(20, (ch / sh) * ch);
        cachedTrackHeight = ch - cachedThumbHeight;
      }
      if (cachedScrollable <= 0) return;
      scrollActive = true;
      thumbEl.classList.add('non-table-thumb-scroll-visible');
      container.classList.add('is-scrolling');
      updateThumb();
      if (rafId == null) rafId = requestAnimationFrame(tick);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        scrollActive = false;
        if (rafId != null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        cachedScrollable = null;
        cachedTrackHeight = null;
        cachedThumbHeight = null;
        const el = nonTableThumbRef.current;
        if (el) el.classList.remove('non-table-thumb-scroll-visible');
        setDataScrollMetrics({
          scrollTop: container.scrollTop,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
        });
        container.classList.remove('is-scrolling');
        setShowDataScrollThumb(false);
      }, 1500);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      scrollActive = false;
      if (rafId != null) cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      clearTimeout(scrollTimeout);
    };
  }, [tableMode]);

  // Update tooltip positions on scroll/resize when tooltips are visible
  useEffect(() => {
    if (inventoryTooltipPosition.visible && hoveredInventoryWarningIndex !== null) {
      const updatePosition = () => {
        const icon = inventoryWarningIconRefs.current[hoveredInventoryWarningIndex];
        if (icon) {
          const rect = icon.getBoundingClientRect();
          const headerHeight = 67; // Sticky header height
          const tooltipHeight = 31; // Approximate tooltip height
          const spaceAbove = rect.top;
          const spaceBelow = window.innerHeight - rect.bottom;
          // If not enough space above or would be clipped by header, position below
          const positionAbove = spaceAbove >= tooltipHeight + 8 && rect.top > headerHeight + 8;
          const tooltipTop = positionAbove 
            ? rect.top - tooltipHeight - 8
            : rect.bottom + 8;
          setInventoryTooltipPosition(prev => ({
            ...prev,
            top: tooltipTop,
            left: rect.left + rect.width / 2,
          }));
        }
      };
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [inventoryTooltipPosition.visible, hoveredInventoryWarningIndex]);

  // Update labels tooltip positions on scroll/resize when tooltips are visible
  useEffect(() => {
    if (labelsTooltipPosition.visible && hoveredWarningIndex !== null) {
      const updatePosition = () => {
        const icon = labelsWarningIconRefs.current[hoveredWarningIndex];
        if (icon) {
          const rect = icon.getBoundingClientRect();
          const headerHeight = 67; // Sticky header height
          const tooltipHeight = 31; // Approximate tooltip height
          const spaceAbove = rect.top;
          const spaceBelow = window.innerHeight - rect.bottom;
          // If not enough space above or would be clipped by header, position below
          const positionAbove = spaceAbove >= tooltipHeight + 8 && rect.top > headerHeight + 8;
          const tooltipTop = positionAbove 
            ? rect.top - tooltipHeight - 8
            : rect.bottom + 8;
          setLabelsTooltipPosition(prev => ({
            ...prev,
            top: tooltipTop,
            left: rect.left + rect.width / 2,
          }));
        }
      };
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [labelsTooltipPosition.visible, hoveredWarningIndex]);

  // Custom scroll thumb drag (non-table data cell) – only thumb is visible, no track
  const handleNonTableThumbMouseDown = useCallback((e) => {
    e.preventDefault();
    const container = nonTableDataScrollRef.current;
    const thumbEl = nonTableThumbRef.current;
    if (!container || !thumbEl) return;
    nonTableThumbDragRef.current = true;
    const startY = e.clientY;
    const startScrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const scrollable = scrollHeight - clientHeight;
    if (scrollable <= 0) return;
    const thumbHeight = Math.max(20, (clientHeight / scrollHeight) * clientHeight);
    const trackHeight = clientHeight - thumbHeight;
    if (trackHeight <= 0) return;
    const ratio = scrollable / trackHeight;
    const onMouseMove = (e2) => {
      const deltaY = e2.clientY - startY;
      const newScrollTop = Math.max(0, Math.min(scrollable, startScrollTop + deltaY * ratio));
      container.scrollTop = newScrollTop;
      const thumbTop = (newScrollTop / scrollable) * (clientHeight - thumbHeight);
      thumbEl.style.transform = `translateY(${thumbTop}px)`;
    };
    const onMouseUp = (e) => {
      nonTableThumbDragRef.current = false;
      setDataScrollMetrics({
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
      });
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      // If cursor left the wrapper during drag, hide thumb now that drag ended
      const wrapper = nonTableDataScrollWrapperRef.current;
      if (e && wrapper) {
        const at = document.elementFromPoint(e.clientX, e.clientY);
        if (!at || !wrapper.contains(at)) {
          const thumbEl = nonTableThumbRef.current;
          if (thumbEl) thumbEl.classList.remove('non-table-thumb-scroll-visible');
          setShowDataScrollThumb(false);
        }
      }
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Clean up any invalid brand filters when account changes or on mount
  // If a brand filter has all brands selected, treat it as no filter
  // Also clear filter if it has fewer brands than expected for the account
  useEffect(() => {
    if (!tableMode && account && nonTableFilters.product && nonTableFilters.product.selectedBrands) {
      const filter = nonTableFilters.product;
      if (filter.selectedBrands instanceof Set && filter.selectedBrands.size > 0) {
        const accountBrands = ACCOUNT_BRAND_MAPPING[account] || ACCOUNT_BRAND_MAPPING['TPS Nutrients'];
        
        // Check if all brands for this account are selected
        const allBrandsSelected = filter.selectedBrands.size === accountBrands.length &&
          accountBrands.every(brand => filter.selectedBrands.has(brand));
        
        // If all brands are selected, clear the brand filter (treat as no filter)
        // Also clear if filter has fewer brands than expected (likely a stale filter)
        if (allBrandsSelected || filter.selectedBrands.size < accountBrands.length) {
          setNonTableFilters(prev => {
            const newFilters = { ...prev };
            if (newFilters.product) {
              newFilters.product = {
                ...newFilters.product,
                selectedBrands: null,
              };
            }
            return newFilters;
          });
          // Clear brand filter in parent
          if (onBrandFilterChange) {
            onBrandFilterChange(null);
          }
        }
      }
    }
  }, [tableMode, account]); // Run when account changes
  const [nonTableSortField, setNonTableSortField] = useState('');
  const [nonTableSortOrder, setNonTableSortOrder] = useState('');
  // Store the sorted order (array of row IDs) to preserve positions after sorting (one-time sort)
  const [nonTableSortedRowOrder, setNonTableSortedRowOrder] = useState(null);
  // Ref to store current filtered rows (without sorting) for use in sort handler
  const currentNonTableFilteredRowsRef = useRef([]);
  
  // Multi-select state for non-table mode bulk operations
  const [nonTableSelectedIndices, setNonTableSelectedIndices] = useState(() => new Set());
  const lastClickTimeRef = useRef({});
  const [nonTableLastSelectedIndex, setNonTableLastSelectedIndex] = useState(null);
  
  // Filter state
  const [activeFilters, setActiveFilters] = useState({
    popularFilter: '',
    sortField: '',
    sortOrder: '',
    filterField: '',
    filterCondition: '',
    filterValue: '',
  });

  // Calculate available labels for a product, accounting for other products with same label_location
  const getAvailableLabelsForRow = (row, rowIndex) => {
    if (!row?.label_location) return row?.label_inventory || row?.labelsAvailable || 0;
    
    const labelLoc = row.label_location;
    // PRIORITY: Use Railway API label_inventory first, fall back to AWS Lambda
    const baseAvailable = row?.label_inventory || row?.labelsAvailable || labelsAvailabilityMap[labelLoc]?.labels_available || 0;
    
    // Subtract labels used by OTHER products with same label_location in current shipment
    const usedByOthers = rows.reduce((sum, otherRow, idx) => {
      if (idx !== rowIndex && otherRow.label_location === labelLoc) {
        const qty = qtyValues?.[idx] || 0;
        return sum + (typeof qty === 'number' ? qty : parseInt(qty, 10) || 0);
      }
      return sum;
    }, 0);
    
    return Math.max(0, baseAvailable - usedByOthers);
  };

  // Check if a row's qty exceeds available labels
  const isQtyExceedingLabels = (row, rowIndex) => {
    const qty = qtyValues?.[rowIndex] || 0;
    const numQty = typeof qty === 'number' ? qty : parseInt(qty, 10) || 0;
    if (numQty === 0) return false;
    
    const available = getAvailableLabelsForRow(row, rowIndex);
    return numQty > available;
  };

  // Use local state if props not provided (for backward compatibility)
  const [internalQtyValues, setInternalQtyValues] = useState(() => {
    if (qtyValues) return null; // Use props if provided
    const initialValues = {};
    rows.forEach((row, index) => {
      initialValues[index] = ''; // Default to empty
    });
    return initialValues;
  });

  const effectiveQtyValues = qtyValues || internalQtyValues || {};
  const effectiveSetQtyValues = onQtyChange || setInternalQtyValues;
  const effectiveSetQtyValuesRef = useRef(effectiveSetQtyValues);
  effectiveSetQtyValuesRef.current = effectiveSetQtyValues;

  // Update qtyValues when rows change (only if using internal state)
  useEffect(() => {
    if (!qtyValues && !onQtyChange && internalQtyValues) {
      const newValues = {};
      rows.forEach((row, index) => {
        newValues[index] = internalQtyValues[index] ?? ''; // Default to empty
      });
      setInternalQtyValues(newValues);
    }
  }, [rows.length]);

  // Create a stable signature for rows to detect actual changes (must be before any useEffect that uses it)
  const previousRowsSignatureRef = useRef('');
  const rowsSignature = useMemo(() => {
    if (!rows || rows.length === 0) return '';
    return rows.map(r => {
      const id = r.id || r.asin || r.child_asin || r.childAsin;
      return id ? String(id) : '';
    }).filter(Boolean).sort().join('|');
  }, [rows]);

  // Capture original row order on first load (for Reset functionality)
  // Use rowsSignature so dependency array size is always 1 (avoids React "dependency array changed size" error).
  useEffect(() => {
    if (rows.length > 0 && !originalRowOrder.current) {
      originalRowOrder.current = rows.map(r => r.id);
      console.log('[Original Row Order] Stored first', originalRowOrder.current.length, 'product IDs');
    }
  }, [rowsSignature]);

  // Store original forecast values when rows change (for reset functionality)
  useEffect(() => {
    // Skip if signature hasn't changed
    if (previousRowsSignatureRef.current === rowsSignature) {
      return;
    }
    
    previousRowsSignatureRef.current = rowsSignature;
    
    console.log('Storing original suggested qtys for', rows.length, 'rows');
    if (rows && rows.length > 0) {
      rows.forEach((row, index) => {
        const suggestedQty = getSuggestedQtyFromRow(row);
        const storageValue = suggestedQty !== undefined ? suggestedQty : '';
        const doiValue = row.doiTotal || row.daysOfInventory || 0;
        const storageIndex = row._originalIndex !== undefined ? row._originalIndex : index;
        
        storeOriginalQtyValue(row, storageIndex, storageValue);
        
        // Store original DOI value (only if not already set to preserve the original)
        const productId = row.id || row.asin || row.child_asin || row.childAsin;
        if (productId && originalDoiValues.current[productId] === undefined) {
          originalDoiValues.current[productId] = doiValue;
        }
      });
    }
    console.log('All original suggested qtys by ID:', originalSuggestedQtyValues.current);
    console.log('All original suggested qtys by index:', originalSuggestedQtyValuesByIndex.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsSignature]); // Only use stable signature to avoid dependency array size issues

  // Apply filters to rows - preserve original index for qtyValues mapping
  const filteredRows = useMemo(() => {
    // Use existing _originalIndex if already set by parent (from search filter),
    // otherwise use the current index (for backward compatibility)
    let result = rows.map((row, index) => ({ 
      ...row, 
      _originalIndex: row._originalIndex !== undefined ? row._originalIndex : index 
    }));
    
    // Apply popular filter
    if (activeFilters.popularFilter) {
      switch (activeFilters.popularFilter) {
        case 'bestSellers':
          // Top revenue - sort by sales30Day * some average price or just by sales
          result = result.filter(r => (r.sales30Day || 0) > 0);
          result.sort((a, b) => (b.sales30Day || 0) - (a.sales30Day || 0));
          result = result.slice(0, 50); // Top 50
          break;
        case 'fastestMovers':
          // Highest unit velocity - sort by daily sales rate
          result = result.filter(r => (r.sales30Day || 0) > 0);
          result.sort((a, b) => ((b.sales30Day || 0) / 30) - ((a.sales30Day || 0) / 30));
          result = result.slice(0, 50);
          break;
        case 'topProfit':
          // Top profit - sort by margin or profit if available
          result = result.filter(r => (r.profit || r.margin || r.sales30Day || 0) > 0);
          result.sort((a, b) => (b.profit || b.margin || b.sales30Day || 0) - (a.profit || a.margin || a.sales30Day || 0));
          result = result.slice(0, 50);
          break;
        case 'topTraffic':
          // Top traffic - sort by sessions or CTR
          result = result.filter(r => (r.sessions || r.pageViews || 0) > 0);
          result.sort((a, b) => (b.sessions || b.pageViews || 0) - (a.sessions || a.pageViews || 0));
          result = result.slice(0, 50);
          break;
        case 'outOfStock':
          // Out of stock - where FBA available is 0 or very low
          result = result.filter(r => (r.fbaAvailable || 0) === 0 && (r.sales30Day || 0) > 0);
          break;
        case 'overstock':
          // Overstock - where DOI is higher than the forecast range goal
          result = result.filter(r => (r.doiTotal || r.daysOfInventory || 0) > forecastRange);
          break;
        default:
          break;
      }
    }
    
    // Apply custom filter condition
    if (activeFilters.filterField && activeFilters.filterCondition && activeFilters.filterValue) {
      const fieldMap = {
        'brand': 'brand',
        'product': 'product',
        'size': 'size',
        'fbaAvailable': 'fbaAvailable',
        'totalInventory': 'totalInventory',
        'forecast': 'weeklyForecast',
        'qty': 'qty',
      };
      const field = fieldMap[activeFilters.filterField] || activeFilters.filterField;
      const value = activeFilters.filterValue.toLowerCase();
      
      result = result.filter(row => {
        // Special handling for brand filter - search both brand field and product name
        if (activeFilters.filterField === 'brand') {
          const brandValue = row.brand || '';
          const productValue = row.product || '';
          const searchText = (brandValue + ' ' + productValue).toLowerCase();
          const filterValue = activeFilters.filterValue.toLowerCase();
          
          switch (activeFilters.filterCondition) {
            case 'equals':
              return brandValue.toLowerCase() === filterValue;
            case 'contains':
              return searchText.includes(filterValue);
            default:
              return true;
          }
        }
        
        // Standard filtering for other fields
        const rowValue = row[field];
        const strValue = String(rowValue || '').toLowerCase();
        const numValue = parseFloat(rowValue) || 0;
        const filterNum = parseFloat(activeFilters.filterValue) || 0;
        
        switch (activeFilters.filterCondition) {
          case 'equals':
            return strValue === value;
          case 'contains':
            return strValue.includes(value);
          case 'greaterThan':
            return numValue > filterNum;
          case 'lessThan':
            return numValue < filterNum;
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    if (activeFilters.sortField && activeFilters.sortOrder) {
      const fieldMap = {
        'fbaAvailable': 'fbaAvailable',
        'totalInventory': 'totalInventory',
        'forecast': 'weeklyForecast',
        'sales7': 'sales7Day',
        'sales30': 'sales30Day',
      };
      const field = fieldMap[activeFilters.sortField] || activeFilters.sortField;
      
      result.sort((a, b) => {
        const aVal = parseFloat(a[field]) || 0;
        const bVal = parseFloat(b[field]) || 0;
        return activeFilters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }

    // Apply column filters (bottles, closures, boxes, labels)
    Object.keys(columnFilters).forEach(columnKey => {
      const filter = columnFilters[columnKey];
      if (!filter) return;

      // Apply value filters (checkbox selections)
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        result = result.filter(row => {
          // Special handling for Add column and Shipment Actions column
          if (columnKey === 'normal-3' || columnKey === 'add' || columnKey === 'normal-shipmentActions') {
            const isAdded = addedRows.has(row.id);
            const wantsAdded = filter.selectedValues.has('Added');
            const wantsNotAdded = filter.selectedValues.has('Not Added');
            
            // If both are selected, show all rows
            if (wantsAdded && wantsNotAdded) return true;
            // If only Added is selected, show only added rows
            if (wantsAdded && !wantsNotAdded) return isAdded;
            // If only Not Added is selected, show only non-added rows
            if (!wantsAdded && wantsNotAdded) return !isAdded;
            // If neither is selected, show nothing
            return false;
          }
          
          let rowValue;
          switch(columnKey) {
            case 'bottles':
              rowValue = row.bottleInventory || row.bottle_inventory;
              break;
            case 'closures':
              rowValue = row.closureInventory || row.closure_inventory;
              break;
            case 'boxes':
              rowValue = row.boxInventory || row.box_inventory;
              break;
            case 'labels':
              rowValue = row.labelsAvailable || row.label_inventory || row.labels_available;
              break;
            case 'brand':
              rowValue = row.brand;
              break;
            case 'product':
              rowValue = row.product;
              break;
            case 'size':
              rowValue = row.size;
              break;
            case 'qty': {
              const index = row._originalIndex !== undefined ? row._originalIndex : rows.findIndex(r => r.id === row.id);
              rowValue = effectiveQtyValues[index] || 0;
              break;
            }
            case 'fbaAvailable':
              rowValue = row.doiFba || row.doiTotal || 0;
              break;
            case 'totalInventory':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            case 'forecast':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'sales7Day':
              rowValue = row.sales7Day || 0;
              break;
            case 'sales30Day':
              rowValue = row.sales30Day || 0;
              break;
            case 'sales4Month':
              rowValue = Math.round((row.sales30Day || 0) * 4);
              break;
            case 'formula':
              rowValue = row.formula_name || '';
              break;
            case 'normal-asin':
              rowValue = row.asin || row.child_asin || row.childAsin || '';
              break;
            case 'normal-status': {
              const doiValue = row.doiTotal || row.daysOfInventory || 0;
              rowValue = doiValue >= 30 ? 'Good' : 'Low';
              break;
            }
            case 'normal-inventory':
              rowValue = row.fbaAvailable || 0;
              break;
            case 'normal-unitsToMake':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'normal-doi':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            default: {
              const field = getFieldForHeaderFilter(columnKey);
              rowValue = row[field];
              break;
            }
          }
          return filter.selectedValues.has(rowValue) || 
                 filter.selectedValues.has(String(rowValue));
        });
      }

      // Apply condition filters
      if (filter.conditionType && filter.conditionType !== '') {
        result = result.filter(row => {
          let rowValue;
          switch(columnKey) {
            case 'bottles':
              rowValue = row.bottleInventory || row.bottle_inventory || 0;
              break;
            case 'closures':
              rowValue = row.closureInventory || row.closure_inventory || 0;
              break;
            case 'boxes':
              rowValue = row.boxInventory || row.box_inventory || 0;
              break;
            case 'labels':
              rowValue = row.labelsAvailable || row.label_inventory || row.labels_available || 0;
              break;
            case 'brand':
              rowValue = row.brand || '';
              break;
            case 'product':
              rowValue = row.product || '';
              break;
            case 'size':
              rowValue = row.size || '';
              break;
            case 'qty': {
              const index = row._originalIndex !== undefined ? row._originalIndex : rows.findIndex(r => r.id === row.id);
              const qty = effectiveQtyValues[index];
              rowValue = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
              break;
            }
            case 'fbaAvailable':
              rowValue = row.doiFba || row.doiTotal || 0;
              break;
            case 'totalInventory':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            case 'forecast':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'sales7Day':
              rowValue = row.sales7Day || 0;
              break;
            case 'sales30Day':
              rowValue = row.sales30Day || 0;
              break;
            case 'sales4Month':
              rowValue = Math.round((row.sales30Day || 0) * 4);
              break;
            case 'formula':
              rowValue = row.formula_name || '';
              break;
            case 'normal-asin':
              rowValue = row.asin || row.child_asin || row.childAsin || '';
              break;
            case 'normal-status': {
              const doiValue = row.doiTotal || row.daysOfInventory || 0;
              rowValue = doiValue >= 30 ? 'Good' : 'Low';
              break;
            }
            case 'normal-inventory':
              rowValue = row.fbaAvailable || 0;
              break;
            case 'normal-unitsToMake':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'normal-doi':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            default: {
              const field = getFieldForHeaderFilter(columnKey);
              rowValue = row[field] || 0;
              break;
            }
          }

          const numValue = typeof rowValue === 'number' ? rowValue : parseFloat(rowValue) || 0;
          const filterNum = parseFloat(filter.conditionValue) || 0;
          const strValue = String(rowValue || '').toLowerCase();
          const filterStr = (filter.conditionValue || '').toLowerCase();

          switch (filter.conditionType) {
            case 'equals':
              return numValue === filterNum || strValue === filterStr;
            case 'notEquals':
              return numValue !== filterNum && strValue !== filterStr;
            case 'greaterThan':
              return numValue > filterNum;
            case 'lessThan':
              return numValue < filterNum;
            case 'greaterOrEqual':
              return numValue >= filterNum;
            case 'lessOrEqual':
              return numValue <= filterNum;
            case 'contains':
              return strValue.includes(filterStr);
            case 'notContains':
              return !strValue.includes(filterStr);
            case 'startsWith':
              return strValue.startsWith(filterStr);
            case 'endsWith':
              return strValue.endsWith(filterStr);
            case 'isEmpty':
              return rowValue === null || rowValue === undefined || rowValue === '' || rowValue === 0;
            case 'isNotEmpty':
              return rowValue !== null && rowValue !== undefined && rowValue !== '' && rowValue !== 0;
            default:
              return true;
          }
        });
      }
    });

    // Apply column sorting - use stored order if available (one-time sort like SortProductsTable)
    if (sortedRowOrder && sortedRowOrder.length > 0) {
      // Create a map of row ID to row for quick lookup
      const rowMap = new Map(result.map(row => [row.id, row]));
      
      // Reorder result based on stored order
      const orderedResult = [];
      const processedIds = new Set();
      
      // First, add rows in the stored order
      sortedRowOrder.forEach(id => {
        if (rowMap.has(id)) {
          orderedResult.push(rowMap.get(id));
          processedIds.add(id);
        }
      });
      
      // Then, add any new rows that weren't in the original sort (e.g., newly added rows)
      result.forEach(row => {
        if (!processedIds.has(row.id)) {
          orderedResult.push(row);
        }
      });
      
      result = orderedResult;
    } else {
      // Default: put "No Sales History" items at the bottom (no sales 7-day and 30-day)
      const hasSales = (row) => (Number(row.sales30Day) || Number(row.sales7Day) || 0) > 0;
      result = [...result].sort((a, b) => {
        const aHasSales = hasSales(a);
        const bHasSales = hasSales(b);
        if (aHasSales === bHasSales) return 0;
        return aHasSales ? -1 : 1; // has sales first (before no sales)
      });
    }
    
    return result;
  }, [rowsSignature, activeFilters, columnFilters, sortedRowOrder, forecastRange]);

  // Apply selection filter only in table mode
  const filteredRowsWithSelection = useMemo(() => {
    if (selectionFilter === 'checked') {
      return filteredRows.filter((row) => addedRows.has(row.id));
    }
    if (selectionFilter === 'unchecked') {
      return filteredRows.filter((row) => !addedRows.has(row.id));
    }
    return filteredRows;
  }, [filteredRows, selectionFilter, addedRows]);

  // Keep local addedRows/selectedRows in sync with parent state so toggling views preserves selections
  // Use a stable key (sorted IDs string) so we don't re-run on every parent re-render when a new Set with same contents is passed (avoids React #185)
  const externalAddedRowsKey = (() => {
    if (externalAddedRows instanceof Set) {
      return [...externalAddedRows].sort().join(',');
    }
    if (Array.isArray(externalAddedRows)) {
      return [...externalAddedRows].sort().join(',');
    }
    return '';
  })();
  useEffect(() => {
    if (externalAddedRows instanceof Set) {
      setAddedRows(new Set(externalAddedRows));
      setSelectedRows(new Set(externalAddedRows));
    } else if (Array.isArray(externalAddedRows)) {
      const synced = new Set(externalAddedRows);
      setAddedRows(synced);
      setSelectedRows(synced);
    } else if (externalAddedRowsKey === '') {
      setAddedRows(new Set());
      setSelectedRows(new Set());
    }
  }, [externalAddedRowsKey]);
  
  // Handle filter apply
  const handleFilterApply = (filterSettings) => {
    setActiveFilters(filterSettings);
  };
  
  // Handle filter reset – clear both timeline filters and non-table column filters (e.g. Inventory Out of Stock / Best Sellers)
  const handleFilterReset = () => {
    console.log('[handleFilterReset] Resetting all filters and sorts');
    setActiveFilters({
      popularFilter: '',
      sortField: '',
      sortOrder: '',
      filterField: '',
      filterCondition: '',
      filterValue: '',
    });
    setNonTableFilters({});
    setNonTableSortField('');
    setNonTableSortOrder('');
    setNonTableSortedRowOrder(null);
    
    // Restore original row order
    if (originalRowOrder.current) {
      console.log('[handleFilterReset] Restoring original row order');
      setSortedRowOrder(originalRowOrder.current);
    } else {
      setSortedRowOrder(null);
    }
    
    setColumnFilters({}); // Clear all column filters
  };

  // Filter handlers for bottles, closures, boxes, labels columns
  const handleFilterClick = (columnKey, event) => {
    event.stopPropagation();
    // Close timeline filter if open
    if (openFilterIndex === 'doi-goal') {
      setOpenFilterIndex(null);
    }
    setOpenFilterColumns((prev) => {
      const next = new Set();
      // Close all other filters and open only the clicked one (if not already open)
      if (!prev.has(columnKey)) {
        next.add(columnKey);
      }
      // If it was already open, close it (empty set)
      return next;
    });
  };

  // Close column filters when timeline filter opens
  useEffect(() => {
    if (openFilterIndex === 'doi-goal' && openFilterColumns.size > 0) {
      setOpenFilterColumns(new Set());
    }
  }, [openFilterIndex]);

  // Store current filtered rows (without sorting) in ref for use in sort handler
  useEffect(() => {
    // Compute filtered rows without sorting
    let result = rows.map((row, index) => ({ 
      ...row, 
      _originalIndex: row._originalIndex !== undefined ? row._originalIndex : index 
    }));
    
    // Apply all filters except column sorting
    if (activeFilters.popularFilter) {
      switch (activeFilters.popularFilter) {
        case 'bestSellers':
          result = result.filter(r => (r.sales30Day || 0) > 0);
          result.sort((a, b) => (b.sales30Day || 0) - (a.sales30Day || 0));
          result = result.slice(0, 50);
          break;
        case 'fastestMovers':
          result = result.filter(r => (r.sales30Day || 0) > 0);
          result.sort((a, b) => ((b.sales30Day || 0) / 30) - ((a.sales30Day || 0) / 30));
          result = result.slice(0, 50);
          break;
        case 'topProfit':
          result = result.filter(r => (r.profit || r.margin || r.sales30Day || 0) > 0);
          result.sort((a, b) => (b.profit || b.margin || b.sales30Day || 0) - (a.profit || a.margin || a.sales30Day || 0));
          result = result.slice(0, 50);
          break;
        case 'topTraffic':
          result = result.filter(r => (r.sessions || r.pageViews || 0) > 0);
          result.sort((a, b) => (b.sessions || b.pageViews || 0) - (a.sessions || a.pageViews || 0));
          result = result.slice(0, 50);
          break;
        case 'outOfStock':
          result = result.filter(r => (r.fbaAvailable || 0) === 0 && (r.sales30Day || 0) > 0);
          break;
        case 'overstock':
          result = result.filter(r => (r.doiTotal || r.daysOfInventory || 0) > forecastRange);
          break;
      }
    }
    
    if (activeFilters.filterField && activeFilters.filterCondition && activeFilters.filterValue) {
      const fieldMap = {
        'brand': 'brand',
        'product': 'product',
        'size': 'size',
        'fbaAvailable': 'fbaAvailable',
        'totalInventory': 'totalInventory',
        'forecast': 'weeklyForecast',
        'qty': 'qty',
      };
      const field = fieldMap[activeFilters.filterField] || activeFilters.filterField;
      const value = activeFilters.filterValue.toLowerCase();
      
      result = result.filter(row => {
        // Special handling for brand filter - search both brand field and product name
        if (activeFilters.filterField === 'brand') {
          const brandValue = row.brand || '';
          const productValue = row.product || '';
          const searchText = (brandValue + ' ' + productValue).toLowerCase();
          const filterValue = activeFilters.filterValue.toLowerCase();
          
          switch (activeFilters.filterCondition) {
            case 'equals':
              return brandValue.toLowerCase() === filterValue;
            case 'contains':
              return searchText.includes(filterValue);
            default:
              return true;
          }
        }
        
        // Standard filtering for other fields
        const rowValue = row[field];
        const strValue = String(rowValue || '').toLowerCase();
        const numValue = parseFloat(rowValue) || 0;
        const filterNum = parseFloat(activeFilters.filterValue) || 0;
        
        switch (activeFilters.filterCondition) {
          case 'equals':
            return strValue === value;
          case 'contains':
            return strValue.includes(value);
          case 'greaterThan':
            return numValue > filterNum;
          case 'lessThan':
            return numValue < filterNum;
          default:
            return true;
        }
      });
    }
    
    // Apply column filters (but not sorting)
    Object.keys(columnFilters).forEach(key => {
      const filter = columnFilters[key];
      if (!filter || filter.sortOrder) return; // Skip if it's a sort-only filter

      if (filter.selectedValues && filter.selectedValues.size > 0) {
        result = result.filter(row => {
          // Special handling for Add column and Shipment Actions column
          if (key === 'normal-3' || key === 'add' || key === 'normal-shipmentActions') {
            const isAdded = addedRows.has(row.id);
            const wantsAdded = filter.selectedValues.has('Added');
            const wantsNotAdded = filter.selectedValues.has('Not Added');
            
            // If both are selected, show all rows
            if (wantsAdded && wantsNotAdded) return true;
            // If only Added is selected, show only added rows
            if (wantsAdded && !wantsNotAdded) return isAdded;
            // If only Not Added is selected, show only non-added rows
            if (!wantsAdded && wantsNotAdded) return !isAdded;
            // If neither is selected, show nothing
            return false;
          }
          
          let rowValue;
          switch(key) {
            case 'bottles':
              rowValue = row.bottleInventory || row.bottle_inventory;
              break;
            case 'closures':
              rowValue = row.closureInventory || row.closure_inventory;
              break;
            case 'boxes':
              rowValue = row.boxInventory || row.box_inventory;
              break;
            case 'labels':
              rowValue = row.labelsAvailable || row.label_inventory || row.labels_available;
              break;
            case 'brand':
              rowValue = row.brand;
              break;
            case 'product':
              rowValue = row.product;
              break;
            case 'size':
              rowValue = row.size;
              break;
            case 'qty': {
              const index = row._originalIndex !== undefined ? row._originalIndex : rows.findIndex(r => r.id === row.id);
              rowValue = effectiveQtyValues[index] || 0;
              break;
            }
            case 'fbaAvailable':
              rowValue = row.doiFba || row.doiTotal || 0;
              break;
            case 'totalInventory':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            case 'forecast':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'sales7Day':
              rowValue = row.sales7Day || 0;
              break;
            case 'sales30Day':
              rowValue = row.sales30Day || 0;
              break;
            case 'sales4Month':
              rowValue = Math.round((row.sales30Day || 0) * 4);
              break;
            case 'formula':
              rowValue = row.formula_name || '';
              break;
            case 'normal-asin':
              rowValue = row.asin || row.child_asin || row.childAsin || '';
              break;
            case 'normal-status': {
              const doiValue = row.doiTotal || row.daysOfInventory || 0;
              rowValue = doiValue >= 30 ? 'Good' : 'Low';
              break;
            }
            case 'normal-inventory':
              rowValue = row.fbaAvailable || 0;
              break;
            case 'normal-unitsToMake':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'normal-doi':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            default: {
              const field = getFieldForHeaderFilter(key);
              rowValue = row[field];
              break;
            }
          }
          return filter.selectedValues.has(rowValue) || 
                 filter.selectedValues.has(String(rowValue));
        });
      }

      if (filter.conditionType && filter.conditionType !== '') {
        result = result.filter(row => {
          let rowValue;
          switch(key) {
            case 'bottles':
              rowValue = row.bottleInventory || row.bottle_inventory || 0;
              break;
            case 'closures':
              rowValue = row.closureInventory || row.closure_inventory || 0;
              break;
            case 'boxes':
              rowValue = row.boxInventory || row.box_inventory || 0;
              break;
            case 'labels':
              rowValue = row.labelsAvailable || row.label_inventory || row.labels_available || 0;
              break;
            case 'brand':
              rowValue = row.brand || '';
              break;
            case 'product':
              rowValue = row.product || '';
              break;
            case 'size':
              rowValue = row.size || '';
              break;
            case 'qty': {
              const index = row._originalIndex !== undefined ? row._originalIndex : rows.findIndex(r => r.id === row.id);
              const qty = effectiveQtyValues[index];
              rowValue = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
              break;
            }
            case 'fbaAvailable':
              rowValue = row.doiFba || row.doiTotal || 0;
              break;
            case 'totalInventory':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            case 'forecast':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'sales7Day':
              rowValue = row.sales7Day || 0;
              break;
            case 'sales30Day':
              rowValue = row.sales30Day || 0;
              break;
            case 'sales4Month':
              rowValue = Math.round((row.sales30Day || 0) * 4);
              break;
            case 'formula':
              rowValue = row.formula_name || '';
              break;
            case 'normal-asin':
              rowValue = row.asin || row.child_asin || row.childAsin || '';
              break;
            case 'normal-status': {
              const doiValue = row.doiTotal || row.daysOfInventory || 0;
              rowValue = doiValue >= 30 ? 'Good' : 'Low';
              break;
            }
            case 'normal-inventory':
              rowValue = row.fbaAvailable || 0;
              break;
            case 'normal-unitsToMake':
              rowValue = row.weeklyForecast || row.forecast || 0;
              break;
            case 'normal-doi':
              rowValue = row.doiTotal || row.daysOfInventory || 0;
              break;
            default: {
              const field = getFieldForHeaderFilter(key);
              rowValue = row[field] || 0;
              break;
            }
          }

          const numValue = typeof rowValue === 'number' ? rowValue : parseFloat(rowValue) || 0;
          const filterNum = parseFloat(filter.conditionValue) || 0;
          const strValue = String(rowValue || '').toLowerCase();
          const filterStr = (filter.conditionValue || '').toLowerCase();

          switch (filter.conditionType) {
            case 'equals':
              return numValue === filterNum || strValue === filterStr;
            case 'notEquals':
              return numValue !== filterNum && strValue !== filterStr;
            case 'greaterThan':
              return numValue > filterNum;
            case 'lessThan':
              return numValue < filterNum;
            case 'greaterOrEqual':
              return numValue >= filterNum;
            case 'lessOrEqual':
              return numValue <= filterNum;
            case 'contains':
              return strValue.includes(filterStr);
            case 'notContains':
              return !strValue.includes(filterStr);
            case 'startsWith':
              return strValue.startsWith(filterStr);
            case 'endsWith':
              return strValue.endsWith(filterStr);
            case 'isEmpty':
              return rowValue === null || rowValue === undefined || rowValue === '' || rowValue === 0;
            case 'isNotEmpty':
              return rowValue !== null && rowValue !== undefined && rowValue !== '' && rowValue !== 0;
            default:
              return true;
          }
        });
      }
    });
    
    currentFilteredRowsRef.current = result;
  }, [rowsSignature, activeFilters, columnFilters, forecastRange]);

  // Store current non-table filtered rows (without sorting) in ref for use in sort handler
  useEffect(() => {
    if (tableMode) return; // Only for non-table mode
    
    // Compute filtered rows without sorting
    // Note: filteredRowsWithSelection is already filtered by account in the parent component
    // So we don't need to filter by account again here - just apply user filters
    let result = [...filteredRowsWithSelection];
    
    // Apply non-table filters (but not sorting)
    Object.keys(nonTableFilters).forEach(columnKey => {
      const filter = nonTableFilters[columnKey];
      if (!filter) return;

      const numeric = isNonTableNumericColumn(columnKey);

      // Popular filters (Inventory column) – when set, only apply this (skip value/condition for this column)
      if (columnKey === 'fbaAvailable' && filter.popularFilter) {
        if (filter.popularFilter === 'soldOut') {
          result = result.filter((row) => {
            const totalInv = Number(row.totalInventory ?? row.total_inventory) || 0;
            const sales30 = Number(row.sales30Day ?? row.sales_30_day) || 0;
            const sales7 = Number(row.sales7Day ?? row.sales_7_day) || 0;
            const hasSales = sales30 > 0 || sales7 > 0;
            return totalInv === 0 && hasSales;
          });
        } else if (filter.popularFilter === 'noSalesHistory') {
          result = result.filter((row) => hasNoSalesHistory(row));
        }
        // bestSellers: no row filter, sort is applied via sortOrder/sortField
      } else {
      // Value filters (skip for fbaAvailable when popularFilter is set – already handled above)
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        result = result.filter((row, idx) => {
          if (columnKey === 'product') {
            return filter.selectedValues.has(row.product) || 
                   filter.selectedValues.has(String(row.product)) ||
                   filter.selectedValues.has(row.brand) || 
                   filter.selectedValues.has(String(row.brand)) ||
                   filter.selectedValues.has(row.size) || 
                   filter.selectedValues.has(String(row.size));
          }
          
          let value;
          if (columnKey === 'brand') value = row.brand;
          else if (columnKey === 'size') value = row.size;
          else if (columnKey === 'fbaAvailable') value = row.fbaAvailable || 0;
          else if (columnKey === 'unitsToMake') {
            const index = row._originalIndex !== undefined ? row._originalIndex : idx;
            const qty = effectiveQtyValues[index];
            const numericValue = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
            value = numericValue === 0 ? 'add' : 'added';
          }
          else if (columnKey === 'doiDays') value = row.doiTotal || row.daysOfInventory || 0;
          
          return (
            filter.selectedValues.has(value) ||
            filter.selectedValues.has(String(value))
          );
        });
      }

      // Condition filters (same else: skip for fbaAvailable when popularFilter is set)
      if (filter.conditionType) {
        result = result.filter((row, idx) => {
          if (columnKey === 'product') {
            const productMatch = applyNonTableConditionFilter(
              row.product,
              filter.conditionType,
              filter.conditionValue,
              false
            );
            const brandMatch = applyNonTableConditionFilter(
              row.brand,
              filter.conditionType,
              filter.conditionValue,
              false
            );
            const sizeMatch = applyNonTableConditionFilter(
              row.size,
              filter.conditionType,
              filter.conditionValue,
              false
            );
            return productMatch || brandMatch || sizeMatch;
          }
          
          let value;
          if (columnKey === 'brand') value = row.brand;
          else if (columnKey === 'size') value = row.size;
          else if (columnKey === 'fbaAvailable') value = row.fbaAvailable || 0;
          else if (columnKey === 'unitsToMake') {
            const index = row._originalIndex !== undefined ? row._originalIndex : idx;
            const qty = effectiveQtyValues[index];
            const numericValue = typeof qty === 'number' ? qty : (qty === '' || qty === null || qty === undefined ? 0 : parseInt(qty, 10) || 0);
            value = numericValue === 0 ? 'add' : 'added';
          }
          else if (columnKey === 'doiDays') value = row.doiTotal || row.daysOfInventory || 0;
          
          return applyNonTableConditionFilter(
            value,
            filter.conditionType,
            filter.conditionValue,
            numeric
          );
        });
      }
      }
    });
    
    currentNonTableFilteredRowsRef.current = result;
  }, [filteredRowsWithSelection, nonTableFilters, tableMode, effectiveQtyValues, account]);

  // When user clicks Low/High to Low in non-table dropdown, apply sort after ref has been updated
  useEffect(() => {
    if (tableMode || !nonTableSortField || !nonTableSortOrder) return;
    const rowsToSort = [...currentNonTableFilteredRowsRef.current];
    if (rowsToSort.length === 0) return;
    const sortField = nonTableSortField;
    const sortOrder = nonTableSortOrder;
    const numeric = isNonTableNumericColumn(sortField);
    const originalRows = filteredRowsWithSelection;
    rowsToSort.sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'product') { aVal = a.product; bVal = b.product; }
      else if (sortField === 'brand') { aVal = a.brand; bVal = b.brand; }
      else if (sortField === 'size') { aVal = a.size; bVal = b.size; }
      else if (sortField === 'fbaAvailable') {
        // Inventory column displays totalInventory, so sort by that to match what user sees
        aVal = Number(a.totalInventory ?? a.total_inventory) || 0;
        bVal = Number(b.totalInventory ?? b.total_inventory) || 0;
      }
      else if (sortField === 'unitsToMake') {
        const aIndex = a._originalIndex !== undefined ? a._originalIndex : originalRows.findIndex(r => r.id === a.id);
        const bIndex = b._originalIndex !== undefined ? b._originalIndex : originalRows.findIndex(r => r.id === b.id);
        const aQty = effectiveQtyValues[aIndex];
        const bQty = effectiveQtyValues[bIndex];
        const parseNumericValue = (val) => {
          if (typeof val === 'number') return val;
          if (val === '' || val === null || val === undefined) return 0;
          const parsed = Number(String(val).replace(/,/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        };
        aVal = parseNumericValue(aQty);
        bVal = parseNumericValue(bQty);
      }
      else if (sortField === 'doiDays') { aVal = a.doiTotal || a.daysOfInventory || 0; bVal = b.doiTotal || b.daysOfInventory || 0; }
      else if (sortField === 'sales7Day') { aVal = a.sales7Day ?? a.sales_7_day ?? 0; bVal = b.sales7Day ?? b.sales_7_day ?? 0; }
      if (numeric) {
        const aNum = Number(aVal) || 0;
        const bNum = Number(bVal) || 0;
        if (sortField === 'fbaAvailable' && sortOrder === 'asc') {
          if (aNum === 0 && bNum !== 0) return -1;
          if (aNum !== 0 && bNum === 0) return 1;
          return aNum - bNum;
        }
        if (sortField === 'unitsToMake' && sortOrder === 'asc') {
          if (aNum === 0 && bNum !== 0) return -1;
          if (aNum !== 0 && bNum === 0) return 1;
          return aNum - bNum;
        }
        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      }
      const aStr = String(aVal ?? '').toLowerCase();
      const bStr = String(bVal ?? '').toLowerCase();
      return sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    const sortedIds = rowsToSort.map(row => row.id);
    setNonTableSortedRowOrder(sortedIds);
  }, [tableMode, nonTableSortField, nonTableSortOrder, filteredRowsWithSelection, nonTableFilters, effectiveQtyValues]);

  const handleApplyColumnFilter = (columnKey, filterData) => {
    // If filterData is null, remove the filter (Reset was clicked)
    if (filterData === null) {
      setColumnFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[columnKey];
        return newFilters;
      });
      return;
    }
    
    setColumnFilters(prev => ({
      ...prev,
      [columnKey]: filterData,
    }));
    
    // If sortOrder is provided, apply one-time sort directly (like SortProductsTable)
    if (filterData.sortOrder) {
      const sortField = filterData.sortField || columnKey;
      // Get current filtered rows from ref (updated by useEffect)
      // Use setTimeout to ensure filters are applied and ref is updated
      setTimeout(() => {
        const rowsToSort = [...currentFilteredRowsRef.current];
        
        // Sort the rows (use sortField so dropdown can pass explicit field)
        rowsToSort.sort((a, b) => {
        let aVal, bVal;
        
        // Get the field value based on sortField
        switch(sortField) {
          case 'bottles':
            aVal = a.bottleInventory || a.bottle_inventory || 0;
            bVal = b.bottleInventory || b.bottle_inventory || 0;
            break;
          case 'closures':
            aVal = a.closureInventory || a.closure_inventory || 0;
            bVal = b.closureInventory || b.closure_inventory || 0;
            break;
          case 'boxes':
            aVal = a.boxInventory || a.box_inventory || 0;
            bVal = b.boxInventory || b.box_inventory || 0;
            break;
          case 'labels':
            aVal = a.labelsAvailable || a.label_inventory || a.labels_available || 0;
            bVal = b.labelsAvailable || b.label_inventory || b.labels_available || 0;
            break;
          case 'normal-4':
          case 'qty':
          case 'unitsToMake': {
            // Units to Make / Qty: values in effectiveQtyValues, indexed by original row index
            const aIndex = a._originalIndex !== undefined ? a._originalIndex : rows.indexOf(a);
            const bIndex = b._originalIndex !== undefined ? b._originalIndex : rows.indexOf(b);
            const aQty = effectiveQtyValues[aIndex];
            const bQty = effectiveQtyValues[bIndex];
            const parseQty = (val) => {
              if (typeof val === 'number') return val;
              if (val === '' || val === null || val === undefined) return 0;
              const parsed = Number(String(val).replace(/,/g, ''));
              return isNaN(parsed) ? 0 : parsed;
            };
            aVal = parseQty(aQty);
            bVal = parseQty(bQty);
            break;
          }
          case 'brand':
            aVal = a.brand || '';
            bVal = b.brand || '';
            break;
          case 'product':
            aVal = a.product || '';
            bVal = b.product || '';
            break;
          case 'size':
            aVal = a.size || '';
            bVal = b.size || '';
            break;
          case 'fbaAvailable':
            // Inventory column displays total inventory, sort by that
            aVal = Number(a.totalInventory ?? a.total_inventory) || 0;
            bVal = Number(b.totalInventory ?? b.total_inventory) || 0;
            break;
          case 'totalInventory':
          case 'doiDays':
            aVal = a.doiTotal || a.daysOfInventory || 0;
            bVal = b.doiTotal || b.daysOfInventory || 0;
            break;
          case 'forecast':
            aVal = a.weeklyForecast || a.forecast || 0;
            bVal = b.weeklyForecast || b.forecast || 0;
            break;
          case 'sales7Day':
            aVal = a.sales7Day || 0;
            bVal = b.sales7Day || 0;
            break;
          case 'sales30Day':
            aVal = a.sales30Day || 0;
            bVal = b.sales30Day || 0;
            break;
          case 'sales4Month':
            aVal = Math.round((a.sales30Day || 0) * 4);
            bVal = Math.round((b.sales30Day || 0) * 4);
            break;
          case 'formula':
            aVal = a.formula_name || '';
            bVal = b.formula_name || '';
            break;
          default: {
            const field = getFieldForHeaderFilter(sortField);
            aVal = a[field];
            bVal = b[field];
            break;
          }
        }
        
        let comparison = 0;
        
        // Handle numeric values
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = filterData.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        } else {
          // Handle string values
          const aStr = String(aVal || '').toLowerCase();
          const bStr = String(bVal || '').toLowerCase();
          
          if (filterData.sortOrder === 'asc') {
            comparison = aStr.localeCompare(bStr);
          } else {
            comparison = bStr.localeCompare(aStr);
          }
        }
        
          return comparison;
        });
        
        // Store the sorted order (array of row IDs)
        const sortedIds = rowsToSort.map(row => row.id);
        setSortedRowOrder(sortedIds);
        
        // Clear sort config for this column (one-time sort, not persistent)
        setColumnSortConfig(prev => prev.filter(sort => sort.column !== columnKey));
      }, 0);
    } else {
      // If sortOrder is empty, remove sort from config and clear stored order
      setColumnSortConfig(prev => prev.filter(sort => sort.column !== columnKey));
      setSortedRowOrder(null);
    }
  };

  // Map normal header filter keys to row fields
  function getFieldForHeaderFilter(columnKey) {
    switch (columnKey) {
      case 'normal-0':
        return 'brand';
      case 'normal-1':
      case 'normal-product':
        return 'product';
      case 'normal-2':
        return 'size';
      case 'normal-3':
        return 'add'; // whether product is added (uses boolean/flag)
      case 'normal-4':
        return 'qty'; // quantity field
      case 'normal-asin':
        return 'asin';
      case 'normal-status':
        return 'status';
      case 'normal-inventory':
        return 'fbaAvailable';
      case 'normal-unitsToMake':
        return 'weeklyForecast';
      case 'normal-doi':
        return 'doiTotal';
      case 'normal-shipmentActions':
        return 'add'; // whether product is added (uses boolean/flag)
      default:
        return columnKey;
    }
  }

  // Get unique values for a column
  const getColumnValues = (columnKey) => {
    // Special handling for Add column and Shipment Actions column
    if (columnKey === 'normal-3' || columnKey === 'add' || columnKey === 'normal-shipmentActions') {
      return ['Added', 'Not Added'];
    }
    
    // Always use all rows (not filteredRows) to show all available values
    const values = new Set();
    rows.forEach((row, index) => {
      let val;
      switch(columnKey) {
        case 'bottles':
          val = row.bottleInventory || row.bottle_inventory;
          break;
        case 'closures':
          val = row.closureInventory || row.closure_inventory;
          break;
        case 'boxes':
          val = row.boxInventory || row.box_inventory;
          break;
        case 'labels':
          val = row.labelsAvailable || row.label_inventory || row.labels_available;
          break;
        case 'size':
          val = row.size;
          break;
        case 'brand':
          val = row.brand;
          break;
        case 'product':
          val = row.product;
          break;
        case 'qty':
          val = effectiveQtyValues[row._originalIndex !== undefined ? row._originalIndex : index] || 0;
          break;
        case 'fbaAvailable':
          val = row.doiFba || row.doiTotal || 0;
          break;
        case 'totalInventory':
          val = row.doiTotal || row.daysOfInventory || 0;
          break;
        case 'forecast':
          val = row.weeklyForecast || row.forecast || 0;
          break;
        case 'sales7Day':
          val = row.sales7Day || 0;
          break;
        case 'sales30Day':
          val = row.sales30Day || 0;
          break;
        case 'sales4Month':
          val = Math.round((row.sales30Day || 0) * 4);
          break;
        case 'formula':
          val = row.formula_name || '';
          break;
        case 'normal-asin':
          val = row.asin || row.child_asin || row.childAsin || '';
          break;
        case 'normal-status': {
          const doiValue = row.doiTotal || row.daysOfInventory || 0;
          val = doiValue >= 30 ? 'Good' : 'Low';
          break;
        }
        case 'normal-inventory':
          val = row.fbaAvailable || 0;
          break;
        case 'normal-unitsToMake':
          val = row.weeklyForecast || row.forecast || 0;
          break;
        case 'normal-doi':
          val = row.doiTotal || row.daysOfInventory || 0;
          break;
        default: {
          const field = getFieldForHeaderFilter(columnKey);
          val = row[field];
          break;
        }
      }
      if (val !== undefined && val !== null && val !== '') {
        values.add(val);
      }
    });
    const sortedValues = Array.from(values).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
      }
      return String(a).localeCompare(String(b));
    });
    return sortedValues;
  };

  // Get sort order for a column
  const getColumnSortOrder = (columnKey) => {
    const sort = columnSortConfig.find(sort => sort.column === columnKey);
    return sort ? sort.order : '';
  };

  // Check if a column has active filters
  const hasActiveColumnFilter = (columnKey) => {
    const filter = columnFilters[columnKey];
    if (!filter) return false;
    
    // Check for condition filter
    const hasCondition = filter.conditionType && filter.conditionType !== '';
    if (hasCondition) return true;
    
    // Check for value filters - only active if not all values are selected
    if (!filter.selectedValues || filter.selectedValues.size === 0) return false;
    
    // Special handling for Add column and Shipment Actions column
    if (columnKey === 'normal-3' || columnKey === 'add' || columnKey === 'normal-shipmentActions') {
      // For Add column, both "Added" and "Not Added" selected means no active filter
      return filter.selectedValues.size < 2;
    }
    
    // Get all available values for this column
    const allAvailableValues = getColumnValues(columnKey);
    if (allAvailableValues.length === 0) return false;
    
    const allValuesSet = new Set(allAvailableValues.map(v => String(v)));
    const selectedValuesSet = filter.selectedValues instanceof Set 
      ? new Set(Array.from(filter.selectedValues).map(v => String(v)))
      : new Set(Array.from(filter.selectedValues || []).map(v => String(v)));
    
    // Check if all available values are selected - if so, it's not an active filter
    const allSelected = allValuesSet.size > 0 && 
      selectedValuesSet.size === allValuesSet.size &&
      Array.from(allValuesSet).every(val => selectedValuesSet.has(val));
    
    // Filter is active only if not all values are selected
    return !allSelected;
  };

  // Non-table mode filter helpers
  const getNonTableColumnValues = (columnKey) => {
    const values = new Set();
    filteredRowsWithSelection.forEach((row, idx) => {
      if (columnKey === 'product') {
        // Include product name, brand, and size for compound filtering
        if (row.product !== undefined && row.product !== null && row.product !== '') {
          values.add(row.product);
        }
        if (row.brand !== undefined && row.brand !== null && row.brand !== '') {
          values.add(row.brand);
        }
        if (row.size !== undefined && row.size !== null && row.size !== '') {
          values.add(row.size);
        }
      } else if (columnKey === 'unitsToMake') {
        // Filter by Units to Make: Added | Not Added
        values.add('Not Added');
        values.add('Added');
      } else if (columnKey === 'doiDays') {
        // Get DOI value
        const val = row.doiTotal || row.daysOfInventory || 0;
        values.add(val);
      } else {
        let val;
        if (columnKey === 'brand') {
          val = row.brand;
        } else if (columnKey === 'size') {
          val = row.size;
        } else if (columnKey === 'fbaAvailable') {
          val = row.fbaAvailable || 0;
        }
        if (val !== undefined && val !== null && val !== '') {
          values.add(val);
        }
      }
    });
    const sortedValues = Array.from(values).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') return a - b;
      return String(a).localeCompare(String(b));
    });
    return sortedValues;
  };

  const isNonTableNumericColumn = (columnKey) => columnKey === 'fbaAvailable' || columnKey === 'doiDays' || columnKey === 'unitsToMake' || columnKey === 'sales7Day';

  // Parse sales value (missing, null, "", or non-numeric → 0); used for DOI popular filters
  const parseSalesValue = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  // True when row would show the "NO SALES" badge: NOT out of stock AND no sales history (matches UI badge logic exactly)
  const hasNoSalesHistory = (row) => {
    const totalInv = parseSalesValue(row.totalInventory ?? row.total_inventory);
    const s30 = parseSalesValue(row.sales30Day ?? row.sales_30_day ?? row.units_sold_30_days);
    const s7 = parseSalesValue(row.sales7Day ?? row.sales_7_day ?? row.units_sold_7_days);
    // Match UI logic: "No Sales" tag shows when NOT out of stock (totalInv > 0) AND no sales history
    // UI checks: isOutOfStock ? "Out of Stock" : isNoSales ? "No Sales" : inventory number
    const isOutOfStock = totalInv === 0;
    const hasSalesHistory = s30 > 0 || s7 > 0;
    return !isOutOfStock && !hasSalesHistory;
  };

  const hasNonTableActiveFilter = (columnKey) => {
    const filter = nonTableFilters[columnKey];
    if (!filter || filter === null || filter === undefined) return false;
    
    // Check for brand filter (for product column)
    if (columnKey === 'product' && filter.selectedBrands && filter.selectedBrands instanceof Set && filter.selectedBrands.size > 0) {
      // Get account-specific brands (this would need account prop, but for now use a general check)
      // If selectedBrands is not null and has items, it's an active filter
      // The check for "all brands selected" is handled in the apply logic
      return true; // Brand filter is active
    }
    
    // Check for popular filter (Inventory column only)
    if (columnKey === 'fbaAvailable' && filter.popularFilter) return true;
    
    // Check for condition filter
    const hasCondition = filter.conditionType && filter.conditionType !== '';
    if (hasCondition) return true;
    
    // Check for value filters - only active if not all values are selected
    if (!filter.selectedValues || filter.selectedValues.size === 0) return false;
    
    // Get all available values for this column
    const allAvailableValues = getNonTableColumnValues(columnKey);
    if (allAvailableValues.length === 0) return false;
    
    const allValuesSet = new Set(allAvailableValues.map(v => String(v)));
    const selectedValuesSet = filter.selectedValues instanceof Set 
      ? new Set(Array.from(filter.selectedValues).map(v => String(v)))
      : new Set(Array.from(filter.selectedValues || []).map(v => String(v)));
    
    // Check if all available values are selected - if so, it's not an active filter
    const allSelected = allValuesSet.size > 0 && 
      selectedValuesSet.size === allValuesSet.size &&
      Array.from(allValuesSet).every(val => selectedValuesSet.has(val));
    
    // Filter is active only if not all values are selected
    return !allSelected;
  };

  const applyNonTableConditionFilter = (value, conditionType, conditionValue, numeric) => {
    if (!conditionType) return true;

    const strValue = String(value ?? '').toLowerCase();
    const strCond = String(conditionValue ?? '').toLowerCase();

    switch (conditionType) {
      case 'contains':
        return strValue.includes(strCond);
      case 'notContains':
        return !strValue.includes(strCond);
      case 'equals':
        return numeric ? Number(value) === Number(conditionValue) : strValue === strCond;
      case 'notEquals':
        return numeric ? Number(value) !== Number(conditionValue) : strValue !== strCond;
      case 'startsWith':
        return strValue.startsWith(strCond);
      case 'endsWith':
        return strValue.endsWith(strCond);
      case 'isEmpty':
        return !value || strValue === '';
      case 'isNotEmpty':
        return !!value && strValue !== '';
      case 'greaterThan':
        return Number(value) > Number(conditionValue);
      case 'lessThan':
        return Number(value) < Number(conditionValue);
      case 'greaterOrEqual':
        return Number(value) >= Number(conditionValue);
      case 'lessOrEqual':
        return Number(value) <= Number(conditionValue);
      case 'between':
        if (!conditionValue || !conditionValue.includes('-')) return true;
        const [min, max] = conditionValue.split('-').map(v => Number(v.trim()));
        if (isNaN(min) || isNaN(max)) return true;
        const numValue = Number(value);
        return numValue >= min && numValue <= max;
      case 'notBetween':
        if (!conditionValue || !conditionValue.includes('-')) return true;
        const [minNot, maxNot] = conditionValue.split('-').map(v => Number(v.trim()));
        if (isNaN(minNot) || isNaN(maxNot)) return true;
        const numValueNot = Number(value);
        return numValueNot < minNot || numValueNot > maxNot;
      default:
        return true;
    }
  };

  const handleNonTableApplyFilter = (columnKey, filterData) => {
    console.log('[handleNonTableApplyFilter] columnKey:', columnKey, 'filterData:', filterData);
    // If filterData is null, remove the filter (Reset was clicked) for this column only
    if (filterData === null) {
      console.log('[handleNonTableApplyFilter] Resetting filter for column only:', columnKey);
      
      // Clear only this column's filter (non-table and table column filters)
      setNonTableFilters(prev => {
        const next = { ...prev };
        delete next[columnKey];
        return next;
      });
      setColumnFilters(prev => {
        const next = { ...prev };
        delete next[columnKey];
        return next;
      });
      
      // When resetting Inventory column (e.g. after Out of Stock / No Sales History), clear sort and row order
      // at top level so the table fully resets to show all products in original order
      if (columnKey === 'fbaAvailable') {
        setNonTableSortOrder('');
        setNonTableSortedRowOrder(null);
        setNonTableSortField(prev => (prev === 'doiDays' || prev === 'fbaAvailable' ? '' : prev));
      } else {
        setNonTableSortField(prev => {
          const sortIsForThisColumn = prev === columnKey || (columnKey === 'doiDays' && prev === 'fbaAvailable');
          if (sortIsForThisColumn) {
            setNonTableSortOrder('');
            setNonTableSortedRowOrder(null);
            return '';
          }
          return prev;
        });
      }
      
      // Clear brand filter in parent only when resetting the product column
      if (columnKey === 'product' && onBrandFilterChange) {
        onBrandFilterChange(null);
      }
      
      console.log('[handleNonTableApplyFilter] Reset complete for column:', columnKey);
      return;
    }
    
    // For product column, check if all brands are selected - if so, treat as no brand filter
    let brandFilterToApply = filterData.selectedBrands || null;
    if (columnKey === 'product' && filterData.selectedBrands && filterData.selectedBrands instanceof Set) {
      const accountBrands = account && ACCOUNT_BRAND_MAPPING[account] 
        ? ACCOUNT_BRAND_MAPPING[account]
        : ACCOUNT_BRAND_MAPPING['TPS Nutrients'];
      
      // Check if all brands for this account are selected
      const allBrandsSelected = filterData.selectedBrands.size === accountBrands.length &&
        accountBrands.every(brand => filterData.selectedBrands.has(brand));
      
      // If all brands are selected, treat as no filter
      if (allBrandsSelected) {
        brandFilterToApply = null;
      }
    }
    
    // When applying an Inventory Popular Filter, commit state synchronously so the list updates before the dropdown closes
    const isInventoryPopularFilter = columnKey === 'fbaAvailable' && 
      (filterData.popularFilter === 'soldOut' || 
       filterData.popularFilter === 'noSalesHistory' || 
       filterData.popularFilter === 'bestSellers');
    
    const applyFilter = () => {
      setNonTableFilters(prev => ({
        ...prev,
        [columnKey]: {
          selectedValues: filterData.selectedValues || new Set(),
          conditionType: filterData.conditionType || '',
          conditionValue: filterData.conditionValue || '',
          selectedBrands: brandFilterToApply,
          ...(columnKey === 'fbaAvailable' ? { popularFilter: filterData.popularFilter ?? null } : {}),
        },
      }));
      // Clear sort only when applying Out of Stock/No Sales History *without* an explicit sort (dropdown now sends sort for these)
      if (columnKey === 'fbaAvailable' && (filterData.popularFilter === 'soldOut' || filterData.popularFilter === 'noSalesHistory') && !filterData.sortOrder) {
        setNonTableSortField('');
        setNonTableSortOrder('');
        setNonTableSortedRowOrder(null);
      }
    };
    
    if (isInventoryPopularFilter) {
      try {
        flushSync(applyFilter);
      } catch (e) {
        applyFilter();
      }
    } else {
      applyFilter();
    }
    
    // Pass brand filter to parent component for pre-filtering products
    // This filters the products list, but dropdown checkboxes remain visible
    if (columnKey === 'product' && onBrandFilterChange) {
      console.log('Passing brand filter to parent:', {
        brandFilterToApply: brandFilterToApply ? Array.from(brandFilterToApply) : null,
        account,
        filterDataSelectedBrands: filterData.selectedBrands ? Array.from(filterData.selectedBrands) : null,
        allBrandsSelected: columnKey === 'product' && filterData.selectedBrands ? (() => {
          const accountBrands = account && ACCOUNT_BRAND_MAPPING[account] 
            ? ACCOUNT_BRAND_MAPPING[account]
            : ACCOUNT_BRAND_MAPPING['TPS Nutrients'];
          return filterData.selectedBrands.size === accountBrands.length &&
            accountBrands.every(brand => filterData.selectedBrands.has(brand));
        })() : false
      });
      onBrandFilterChange(brandFilterToApply);
    }

    // If sortOrder is provided, set sort state; useEffect will apply sort after ref is updated (except Best Sellers)
    if (filterData.sortOrder) {
      const sortField = filterData.sortField || columnKey;
      setNonTableSortField(sortField);
      setNonTableSortOrder(filterData.sortOrder);
      
      // Best Sellers: sort the full list and commit order immediately so list updates
      const isBestSellersSort = columnKey === 'fbaAvailable' && filterData.popularFilter === 'bestSellers';
      if (isBestSellersSort) {
        const runSort = () => {
          const rowsToSort = [...filteredRowsWithSelection];
          const sortFieldInner = filterData.sortField || 'sales7Day';
          rowsToSort.sort((a, b) => {
            const aVal = a.sales7Day ?? a.sales_7_day ?? 0;
            const bVal = b.sales7Day ?? b.sales_7_day ?? 0;
            return (bVal - aVal);
          });
          setNonTableSortedRowOrder(rowsToSort.map(row => row.id));
        };
        try {
          flushSync(runSort);
        } catch (e) {
          runSort();
        }
      }
      // Other columns: sort is applied in useEffect when nonTableSortField/nonTableSortOrder are set
    } else if (nonTableSortField === columnKey) {
      // If sortOrder is empty/cleared, remove sort and clear stored order
      setNonTableSortField('');
      setNonTableSortOrder('');
      setNonTableSortedRowOrder(null);
    }
  };

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is on a filter icon (any column filter icon)
      const clickedOnFilterIcon = Object.values(filterIconRefs.current).some(ref => 
        ref && ref.contains && ref.contains(event.target)
      );
      
      // Check if click is inside a filter dropdown (by attribute or ref)
      const clickedInsideDropdown = event.target.closest('[data-filter-dropdown]') ||
        Object.values(filterDropdownRefs.current).some(ref => 
          ref && ref.contains && ref.contains(event.target)
        );
      
      // Check if click is on timeline filter icon
      const clickedOnTimelineFilter = filterRefs.current['doi-goal'] && 
        filterRefs.current['doi-goal'].contains && 
        filterRefs.current['doi-goal'].contains(event.target);
      
      // Check if click is inside timeline filter dropdown
      const clickedInsideTimelineFilter = event.target.closest('[data-timeline-filter]') ||
        (filterModalRefs.current['doi-goal'] && 
         filterModalRefs.current['doi-goal'].contains && 
         filterModalRefs.current['doi-goal'].contains(event.target));
      
      // Check if click is on ANY non-table filter icon
      const clickedOnNonTableFilterIcon = Object.values(nonTableFilterIconRefs.current).some(ref => 
        ref && ref.contains && ref.contains(event.target)
      );
      
      // Check if click is inside non-table filter dropdown
      const clickedInsideNonTableFilterDropdown = 
        (nonTableFilterDropdownRef.current && nonTableFilterDropdownRef.current.contains && nonTableFilterDropdownRef.current.contains(event.target)) ||
        event.target.closest('[data-filter-dropdown]');
      
      // Close column filters if open and click is outside
      if (openFilterColumns.size > 0) {
        if (!clickedOnFilterIcon && !clickedInsideDropdown && 
            !clickedOnTimelineFilter && !clickedInsideTimelineFilter) {
          setOpenFilterColumns(new Set());
        }
      }
      
      // Close timeline filter if open and click is outside
      if (openFilterIndex === 'doi-goal') {
        if (!clickedOnTimelineFilter && !clickedInsideTimelineFilter && 
            !clickedOnFilterIcon && !clickedInsideDropdown) {
          setOpenFilterIndex(null);
        }
      }
      
      // Close non-table filter if open and click is outside
      if (nonTableOpenFilterColumn !== null) {
        // Don't close if clicking on ANY filter icon - let the icon handler manage the transition
        // Only close if clicking truly outside (not on icons, not in dropdown)
        if (!clickedOnNonTableFilterIcon && !clickedInsideNonTableFilterDropdown) {
          setNonTableOpenFilterColumn(null);
        }
      }
    };

    // Use mousedown with capture phase to catch clicks early
    if (openFilterColumns.size > 0 || openFilterIndex === 'doi-goal' || nonTableOpenFilterColumn !== null) {
      // Add a delay to prevent immediate closing when opening or switching
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [openFilterColumns, openFilterIndex, nonTableOpenFilterColumn]);

  // Apply non-table mode filters
  const nonTableFilteredRows = useMemo(() => {
    const inventoryFilter = nonTableFilters.fbaAvailable;
    // When in table mode, only apply Best Sellers sort if that filter is set (so sort works in both views)
    if (tableMode) {
      if (inventoryFilter?.popularFilter === 'bestSellers' && filteredRowsWithSelection.length > 0) {
        console.log('[Best Sellers Filter - TABLE MODE] Starting filter...');
        
        // Helper functions to match product names and sizes
        const pl = (r) => String(r.product || '').toLowerCase();
        const sz = (r) => String(r.size || '').toLowerCase().replace(/\s/g, '');
        
        // Define the exact top 10 products from last week's report (in order)
        const top10Matchers = [
          { name: 'liquid plant food', size: '8oz', rank: 1 },
          { name: 'indoor plant food', size: '8oz', rank: 2 },
          { name: 'monstera plant food', size: '8oz', rank: 3 },
          { name: 'christmas cactus fertilizer', size: '8oz', rank: 4 },
          { name: 'fiddle leaf fig plant food', size: '8oz', rank: 5 },
          { name: 'lemon tree fertilizer', size: '8oz', rank: 6 },
          { name: 'cleankelp seaweed fertilizer', size: 'quart', rank: 7 },
          { name: 'orchid fertilizer', size: '8oz', rank: 8 },
          { name: 'silica gold', size: 'quart', rank: 9 },
          { name: 'ph kit', size: '8ozkit', rank: 10 } // "8oz Kit" becomes "8ozkit" when spaces removed
        ];
        
        // Match each product in the list to a rank (if it's in the top 10)
        const matchedProducts = filteredRowsWithSelection.map((r) => {
          const pName = pl(r);
          const pSize = sz(r);
          const match = top10Matchers.find(m => {
            const nameMatch = pName.includes(m.name);
            const sizeMatch = pSize.includes(m.size) || pSize === m.size;
            return nameMatch && sizeMatch;
          });
          return { row: r, rank: match ? match.rank : null };
        }).filter(item => item.rank !== null); // Only keep top 10 products
        
        // Sort by rank (1, 2, 3, ...)
        matchedProducts.sort((a, b) => a.rank - b.rank);
        
        const top10 = matchedProducts.map(item => item.row);
        console.log('[Best Sellers Filter - TABLE MODE] Matched ' + top10.length + ' products:', top10.map(r => ({ product: r.product, size: r.size })));
        
        // Log which matchers didn't find a match
        const matchedRanks = new Set(matchedProducts.map(m => m.rank));
        const missingMatchers = top10Matchers.filter(m => !matchedRanks.has(m.rank));
        if (missingMatchers.length > 0) {
          console.log('[Best Sellers Filter - TABLE MODE] Missing products:', missingMatchers.map(m => ({ name: m.name, size: m.size, rank: m.rank })));
        }
        
        return top10;
      }
      return filteredRowsWithSelection;
    }
    
    let result = [...filteredRowsWithSelection];

    // Apply Inventory Popular Filter first: show only the chosen subset (Out of Stock = 0 inventory + has sales; No Sales History = all with zero sales only)
    if (inventoryFilter?.popularFilter === 'soldOut') {
      result = result.filter((row) => {
        const totalInv = Number(row.totalInventory ?? row.total_inventory) || 0;
        const s30 = parseSalesValue(row.sales30Day ?? row.sales_30_day ?? row.units_sold_30_days);
        const s7 = parseSalesValue(row.sales7Day ?? row.sales_7_day ?? row.units_sold_7_days);
        return totalInv === 0 && (s30 > 0 || s7 > 0);
      });
    } else if (inventoryFilter?.popularFilter === 'noSalesHistory') {
      // Show only products with no sales history (all such rows from the current list)
      result = result.filter((row) => hasNoSalesHistory(row));
    }
    // Best Sellers: no row filter here; sort is applied at the end of this useMemo
    
    // Apply non-table filters
    Object.keys(nonTableFilters).forEach(columnKey => {
      const filter = nonTableFilters[columnKey];
      if (!filter) return;

      const numeric = isNonTableNumericColumn(columnKey);

      // Skip value/condition for fbaAvailable when Popular Filter is set (applied at end of useMemo)
      if (columnKey === 'fbaAvailable' && filter.popularFilter) return;

      // Brand filter/sort (for product column)
      if (columnKey === 'product' && filter.selectedBrands && filter.selectedBrands instanceof Set && filter.selectedBrands.size > 0) {
        // Get account-specific brands to check if all are selected
        const accountBrands = account && ACCOUNT_BRAND_MAPPING[account] 
          ? ACCOUNT_BRAND_MAPPING[account]
          : ACCOUNT_BRAND_MAPPING['TPS Nutrients'];
        
        // Check if all brands for this account are selected
        const allBrandsSelected = filter.selectedBrands.size === accountBrands.length &&
          accountBrands.every(brand => filter.selectedBrands.has(brand));
        
        // Helper function to check if a brand matches any selected brand
        const isBrandChecked = (brandValue) => {
          return Array.from(filter.selectedBrands).some(selectedBrand => {
            const selectedBrandLower = selectedBrand.toLowerCase().trim();
            const brandValueLower = brandValue.toLowerCase();
            
            // Normalize both strings (remove spaces around +, handle variations)
            const normalizeBrand = (str) => str.replace(/\s*\+\s*/g, '+').replace(/\s+/g, ' ').trim();
            const normalizedSelected = normalizeBrand(selectedBrandLower);
            const normalizedValue = normalizeBrand(brandValueLower);
            
            // Exact match or contains match (handles variations like "Mint +" vs "Mint+")
            return normalizedValue === normalizedSelected ||
                   normalizedValue.includes(normalizedSelected) ||
                   normalizedSelected.includes(normalizedValue) ||
                   brandValueLower === selectedBrandLower ||
                   brandValueLower.includes(selectedBrandLower) ||
                   selectedBrandLower.includes(brandValueLower);
          });
        };
        
        // In non-table mode: Filter to show ONLY products from checked brands
        // If all brands are selected, show all products (no filtering needed)
        // If not all brands are selected, filter to show only products from checked brands
        // The brand checkboxes in the dropdown remain visible even when unchecked (handled by dropdown component)
        if (!allBrandsSelected) {
          result = result.filter(row => {
            const brandValue = (row.brand || '').trim();
            // If no brand value, don't show the product
            if (!brandValue) return false;
            // Show only products from checked brands
            return isBrandChecked(brandValue);
          });
        }
        // If allBrandsSelected is true, don't filter - show all products
      }

      // Value filters
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        result = result.filter((row, idx) => {
          // For product column, check product name, brand, and size
          if (columnKey === 'product') {
            return filter.selectedValues.has(row.product) || 
                   filter.selectedValues.has(String(row.product)) ||
                   filter.selectedValues.has(row.brand) || 
                   filter.selectedValues.has(String(row.brand)) ||
                   filter.selectedValues.has(row.size) || 
                   filter.selectedValues.has(String(row.size));
          }
          
          let value;
          if (columnKey === 'brand') value = row.brand;
          else if (columnKey === 'size') value = row.size;
          else if (columnKey === 'fbaAvailable') value = row.fbaAvailable || 0;
          else if (columnKey === 'unitsToMake') {
            // Units to Make filter: Added | Not Added (based on addedRows)
            const isAdded = addedRows.has(row.id);
            if (filter.selectedValues.has('Added') && filter.selectedValues.has('Not Added')) return true;
            if (filter.selectedValues.has('Added')) return isAdded;
            if (filter.selectedValues.has('Not Added')) return !isAdded;
            return false;
          }
          else if (columnKey === 'doiDays') value = row.doiTotal || row.daysOfInventory || 0;
          
          return (
            filter.selectedValues.has(value) ||
            filter.selectedValues.has(String(value))
          );
        });
      }

      // Condition filters
      if (filter.conditionType) {
        result = result.filter((row, idx) => {
          // For product column, search across product name, brand, and size
          if (columnKey === 'product') {
            const productMatch = applyNonTableConditionFilter(
              row.product,
              filter.conditionType,
              filter.conditionValue,
              false
            );
            const brandMatch = applyNonTableConditionFilter(
              row.brand,
              filter.conditionType,
              filter.conditionValue,
              false
            );
            const sizeMatch = applyNonTableConditionFilter(
              row.size,
              filter.conditionType,
              filter.conditionValue,
              false
            );
            return productMatch || brandMatch || sizeMatch;
          }
          
          let value;
          if (columnKey === 'brand') value = row.brand;
          else if (columnKey === 'size') value = row.size;
          else if (columnKey === 'fbaAvailable') value = row.fbaAvailable || 0;
          else if (columnKey === 'unitsToMake') {
            value = addedRows.has(row.id) ? 'Added' : 'Not Added';
          }
          else if (columnKey === 'doiDays') value = row.doiTotal || row.daysOfInventory || 0;
          
          return applyNonTableConditionFilter(
            value,
            filter.conditionType,
            filter.conditionValue,
            numeric
          );
        });
      }
    });

    // Apply non-table sorting: when user set sort field/order, sort inline so it works immediately (no effect timing)
    if (!tableMode && nonTableSortField && nonTableSortOrder && inventoryFilter?.popularFilter !== 'bestSellers') {
      const sortField = nonTableSortField;
      const sortOrder = nonTableSortOrder;
      const numeric = isNonTableNumericColumn(sortField);
      const parseNumericVal = (val) => {
        if (typeof val === 'number') return val;
        if (val === '' || val === null || val === undefined) return 0;
        const parsed = Number(String(val).replace(/,/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      };
      result = [...result].sort((a, b) => {
        let aVal, bVal;
        if (sortField === 'product') { aVal = a.product; bVal = b.product; }
        else if (sortField === 'brand') { aVal = a.brand; bVal = b.brand; }
        else if (sortField === 'size') { aVal = a.size; bVal = b.size; }
        else if (sortField === 'fbaAvailable') {
          aVal = Number(a.totalInventory ?? a.total_inventory) || 0;
          bVal = Number(b.totalInventory ?? b.total_inventory) || 0;
        }
        else if (sortField === 'unitsToMake') {
          const aIdx = a._originalIndex ?? 0;
          const bIdx = b._originalIndex ?? 0;
          aVal = parseNumericVal(effectiveQtyValues[aIdx]);
          bVal = parseNumericVal(effectiveQtyValues[bIdx]);
        }
        else if (sortField === 'doiDays') { aVal = a.doiTotal || a.daysOfInventory || 0; bVal = b.doiTotal || b.daysOfInventory || 0; }
        else if (sortField === 'sales7Day') { aVal = a.sales7Day ?? a.sales_7_day ?? 0; bVal = b.sales7Day ?? b.sales_7_day ?? 0; }
        if (numeric) {
          const aNum = Number(aVal) || 0;
          const bNum = Number(bVal) || 0;
          if (sortField === 'fbaAvailable' && sortOrder === 'asc') {
            if (aNum === 0 && bNum !== 0) return -1;
            if (aNum !== 0 && bNum === 0) return 1;
            return aNum - bNum;
          }
          if (sortField === 'unitsToMake' && sortOrder === 'asc') {
            if (aNum === 0 && bNum !== 0) return -1;
            if (aNum !== 0 && bNum === 0) return 1;
            return aNum - bNum;
          }
          return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
        }
        const aStr = String(aVal ?? '').toLowerCase();
        const bStr = String(bVal ?? '').toLowerCase();
        return sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
      });
    }
    else if (nonTableSortedRowOrder && nonTableSortedRowOrder.length > 0 && inventoryFilter?.popularFilter !== 'bestSellers') {
      // Create a map of row ID to row for quick lookup
      const rowMap = new Map(result.map(row => [row.id, row]));
      
      // Reorder result based on stored order
      const orderedResult = [];
      const processedIds = new Set();
      
      // First, add rows in the stored order
      nonTableSortedRowOrder.forEach(id => {
        if (rowMap.has(id)) {
          orderedResult.push(rowMap.get(id));
          processedIds.add(id);
        }
      });
      
      // Then, add any new rows that weren't in the original sort (e.g., newly added rows)
      result.forEach(row => {
        if (!processedIds.has(row.id)) {
          orderedResult.push(row);
        }
      });
      
      result = orderedResult;
    } else if (!tableMode && nonTableSortField === '' && !inventoryFilter?.popularFilter) {
      // Default view for non-table mode when no sort/filter is applied:
      // 1. Out of Stock products (DOI = 0) at the top
      // 2. Other products sorted by DOI ascending (low DOI first)
      // 3. No Sales History products at the bottom
      result = [...result].sort((a, b) => {
        const aDOI = a.doiTotal || a.daysOfInventory || 0;
        const bDOI = b.doiTotal || b.daysOfInventory || 0;
        const aTotalInv = Number(a.totalInventory ?? a.total_inventory) || 0;
        const bTotalInv = Number(b.totalInventory ?? b.total_inventory) || 0;
        const aIsOutOfStock = aTotalInv === 0;
        const bIsOutOfStock = bTotalInv === 0;
        const aIsNoSales = hasNoSalesHistory(a);
        const bIsNoSales = hasNoSalesHistory(b);
        
        // Out of Stock products (DOI = 0) at the top
        if (aIsOutOfStock && !bIsOutOfStock) return -1;
        if (!aIsOutOfStock && bIsOutOfStock) return 1;
        
        // No Sales History products at the bottom (but after Out of Stock)
        if (aIsNoSales && !bIsNoSales) return 1;
        if (!aIsNoSales && bIsNoSales) return -1;
        
        // Sort by DOI ascending (low DOI first) for remaining products
        return aDOI - bDOI;
      });
    }

    // Best Sellers: show ONLY the specific top 10 products from last week's report
    if (inventoryFilter?.popularFilter === 'bestSellers' && result.length > 0) {
      console.log('[Best Sellers Filter] Total rows before filter:', result.length);
      
      // Helper functions to match product names and sizes
      const pl = (r) => String(r.product || '').toLowerCase();
      const sz = (r) => String(r.size || '').toLowerCase().replace(/\s/g, '');
      
      // Define the exact top 10 products from last week's report (in order)
      const top10Matchers = [
        { name: 'liquid plant food', size: '8oz', rank: 1 },
        { name: 'indoor plant food', size: '8oz', rank: 2 },
        { name: 'monstera plant food', size: '8oz', rank: 3 },
        { name: 'christmas cactus fertilizer', size: '8oz', rank: 4 },
        { name: 'fiddle leaf fig plant food', size: '8oz', rank: 5 },
        { name: 'lemon tree fertilizer', size: '8oz', rank: 6 },
        { name: 'cleankelp seaweed fertilizer', size: 'quart', rank: 7 },
        { name: 'orchid fertilizer', size: '8oz', rank: 8 },
        { name: 'silica gold', size: 'quart', rank: 9 },
        { name: 'ph kit', size: '8ozkit', rank: 10 } // "8oz Kit" becomes "8ozkit" when spaces removed
      ];
      
      // Match each product in the list to a rank (if it's in the top 10)
      const matchedProducts = result.map((r) => {
        const pName = pl(r);
        const pSize = sz(r);
        const match = top10Matchers.find(m => {
          const nameMatch = pName.includes(m.name);
          const sizeMatch = pSize.includes(m.size) || pSize === m.size;
          return nameMatch && sizeMatch;
        });
        return { row: r, rank: match ? match.rank : null };
      }).filter(item => item.rank !== null); // Only keep top 10 products
      
      // Sort by rank (1, 2, 3, ...)
      matchedProducts.sort((a, b) => a.rank - b.rank);
      
      const top10 = matchedProducts.map(item => item.row);
      console.log('[Best Sellers Filter] Matched ' + top10.length + ' products:', top10.map(r => ({ product: r.product, size: r.size })));
      
      // Log which matchers didn't find a match
      const matchedRanks = new Set(matchedProducts.map(m => m.rank));
      const missingMatchers = top10Matchers.filter(m => !matchedRanks.has(m.rank));
      if (missingMatchers.length > 0) {
        console.log('[Best Sellers Filter] Missing products:', missingMatchers.map(m => ({ name: m.name, size: m.size, rank: m.rank })));
      }
      
      result = top10;
    }

    return result;
  }, [filteredRowsWithSelection, nonTableFilters, nonTableSortedRowOrder, nonTableSortField, nonTableSortOrder, tableMode, account, addedRows, effectiveQtyValues]);

  // When Best Sellers is active, always use nonTableFilteredRows (sorted); otherwise table mode uses filteredRowsWithSelection
  const baseCurrentRows = (tableMode && nonTableFilters.fbaAvailable?.popularFilter !== 'bestSellers')
    ? filteredRowsWithSelection
    : nonTableFilteredRows;

  // Remove duplicate products in table mode (filter by normalized product name)
  const currentRows = useMemo(() => {
    if (!tableMode) return baseCurrentRows;
    
    const seen = new Set();
    const uniqueRows = [];
    
    for (const row of baseCurrentRows) {
      // Normalize product name for comparison (lowercase, trim)
      const productKey = String(row.product || '').toLowerCase().trim();
      
      // Skip if we've already seen this product
      if (productKey && seen.has(productKey)) {
        continue;
      }
      
      // Only track non-empty product names
      if (productKey) {
        seen.add(productKey);
      }
      
      uniqueRows.push(row);
    }
    
    return uniqueRows;
  }, [baseCurrentRows, tableMode]);

  // "BEST SELLER" badge: only for Liquid Plant Food 8oz and Indoor Plant Food 8oz (per last week's report)
  const topSellerIds = useMemo(() => {
    if (!filteredRowsWithSelection || filteredRowsWithSelection.length === 0) return new Set();
    const productLower = (r) => String(r.product || '').toLowerCase();
    const sizeStr = (r) => String(r.size || '').toLowerCase().replace(/\s/g, '');
    const isLiquidPlantFood8oz = (r) => productLower(r).includes('liquid plant food') && (sizeStr(r).includes('8oz') || sizeStr(r) === '8oz');
    const isIndoorPlantFood8oz = (r) => productLower(r).includes('indoor plant food') && (sizeStr(r).includes('8oz') || sizeStr(r) === '8oz');
    const isTopTwoProduct = (r) => isLiquidPlantFood8oz(r) || isIndoorPlantFood8oz(r);
    const candidates = filteredRowsWithSelection.filter((r) => {
      if (!isTopTwoProduct(r)) return false;
      const s30 = Number(r.sales30Day ?? r.sales_30_day ?? r.units_sold_30_days ?? 0) || 0;
      const s7 = Number(r.sales7Day ?? r.sales_7_day ?? r.units_sold_7_days ?? 0) || 0;
      return s30 > 0 || s7 > 0;
    });
    const sorted = [...candidates].sort((a, b) => {
      const a7 = Number(a.sales7Day ?? a.sales_7_day ?? a.units_sold_7_days ?? 0) || 0;
      const b7 = Number(b.sales7Day ?? b.sales_7_day ?? b.units_sold_7_days ?? 0) || 0;
      if (b7 !== a7) return b7 - a7;
      const a30 = Number(a.sales30Day ?? a.sales_30_day ?? a.units_sold_30_days ?? 0) || 0;
      const b30 = Number(b.sales30Day ?? b.sales_30_day ?? b.units_sold_30_days ?? 0) || 0;
      if (b30 !== a30) return b30 - a30;
      return String(a.product || '').localeCompare(String(b.product || ''));
    });
    const topN = Math.min(2, sorted.length);
    return new Set(sorted.slice(0, topN).map((r) => r.id).filter(Boolean));
  }, [filteredRowsWithSelection]);

  // Ensure Units to Make inputs always default to forecast values when empty.
  // This runs for both table and non-table modes and initializes qtyValues
  // anywhere a product has a suggested forecast (suggestedQty / units_to_make)
  // but the qty entry is still blank.
  // Use ref for setter and only depend on rowsSignature so we don't re-run when
  // parent re-renders and passes a new rows array reference (which would cause an infinite loop).
  useEffect(() => {
    if (!rows || rows.length === 0 || !rowsSignature) return;
    const setQty = effectiveSetQtyValuesRef.current;
    if (!setQty) return;

    setQty(prev => {
      const baseValues = prev || {};
      const newValues = { ...baseValues };
      let changed = false;

      rows.forEach((row, arrayIndex) => {
        const index = row._originalIndex !== undefined ? row._originalIndex : arrayIndex;

        const existing = newValues[index];
        const hasExisting =
          existing !== undefined &&
          existing !== null &&
          !(typeof existing === 'string' && existing.trim() === '');

        if (hasExisting) return;

        const suggested =
          row.suggestedQty ??
          row.units_to_make ??
          row.unitsToMake ??
          0;

        if (suggested > 0) {
          newValues[index] = suggested;
          changed = true;
        } else {
          // DOI at goal (green): show 0 instead of blank
          newValues[index] = 0;
          changed = true;
        }
      });

      return changed ? newValues : prev;
    });
  }, [rowsSignature]);

  // Normalize existing qty values for case-based sizes (8oz, 6oz, 1/2 lb, 1 lb,
  // quarts, gallons, etc.), rounding *up* to the nearest increment, but only
  // for values the user has not manually edited.
  // Use ref for setter and only depend on rowsSignature to avoid infinite loop
  // when parent re-renders and passes a new rows array reference.
  useEffect(() => {
    if (!rows || rows.length === 0 || !rowsSignature) return;
    const setQty = effectiveSetQtyValuesRef.current;
    if (!setQty) return;

    setQty(prev => {
      const baseValues = prev || {};
      const newValues = { ...baseValues };
      let changed = false;

      rows.forEach((row, arrayIndex) => {
        const index = row._originalIndex !== undefined ? row._originalIndex : arrayIndex;

        // Don't touch values the user has manually edited
        if (manuallyEditedIndices.current.has(index)) return;

        const raw = newValues[index];
        if (raw === undefined || raw === null || raw === '') return;

        const num = typeof raw === 'number' ? raw : parseInt(raw, 10);
        if (!num || isNaN(num) || num <= 0) return;

        const increment = getQtyIncrement(row);
        if (!increment || increment <= 1) return;

        const rounded = Math.ceil(num / increment) * increment;
        if (rounded !== num) {
          newValues[index] = rounded;
          changed = true;
        }
      });

      return changed ? newValues : prev;
    });
  }, [rowsSignature]);

  // Helper: determine step size for qty increments
  const getQtyIncrement = (row) => {
    const sizeRaw = (row?.size || row?.product || '').toString();
    const size = sizeRaw.toLowerCase();
    const sizeCompact = size.replace(/\s+/g, '');

    // 8oz products change in full-case increments (60 units)
    if (sizeCompact.includes('8oz')) return 60;

    // 6oz products (bag or bottle) change in case increments (40 units)
    const isSixOz =
      sizeCompact.includes('6oz') ||
      size.includes('6 oz') ||
      size.includes('6-ounce') ||
      size.includes('6 ounce') ||
      /\b6\s*oz\b/i.test(size);

    // 1/2 lb bag products also use 40-unit increments
    const isHalfPoundBag =
      sizeCompact.includes('1/2lb') ||
      size.includes('1/2 lb') ||
      size.includes('0.5lb') ||
      size.includes('0.5 lb') ||
      size.includes('half lb') ||
      size.includes('half pound') ||
      size.includes('.5 lb') ||
      sizeCompact.includes('.5lb') ||
      /\b1\/2\s*lb\b/i.test(size) ||
      /\b0\.5\s*lb\b/i.test(size);

    if (isSixOz || isHalfPoundBag) return 40;

    // 1 lb products change in case increments (25 units)
    const isOnePound =
      sizeCompact.includes('1lb') ||
      size.includes('1 lb') ||
      size.includes('1-pound') ||
      size.includes('1 pound') ||
      /\b1\s*lb\b/i.test(size);
    if (isOnePound) return 25;

    // 25 lb products should use single-unit increments
    const isTwentyFivePound =
      sizeCompact.includes('25lb') ||
      size.includes('25 lb') ||
      size.includes('25-pound') ||
      size.includes('25 pound');
    if (isTwentyFivePound) return 1;

    // 5 lb products change in small increments (5 units)
    const isFivePound =
      sizeCompact.includes('5lb') ||
      size.includes('5 lb') ||
      size.includes('5-pound') ||
      size.includes('5 pound') ||
      /\b5\s*lb\b/i.test(size);
    if (isFivePound) return 5;

    // Gallon products change in case increments (4 units)
    if (size.includes('gallon') || size.includes('gal ') || sizeCompact.endsWith('gal') || /\d\s*gal\b/.test(size) || /\d+gal/.test(sizeCompact)) return 4;

    // Quart products change in case increments (12 units)
    if (size.includes('quart') || size.includes(' qt') || sizeCompact.endsWith('qt') || /\d\s*qt\b/.test(size) || /\d+qt/.test(sizeCompact)) return 12;

    return 1;
  };

  // Round quantity to nearest case increment (for non-table mode Add)
  const roundQtyToNearestCase = (qty, row) => {
    const num = typeof qty === 'number' ? qty : parseInt(qty, 10) || 0;
    if (num <= 0) return num;
    const increment = getQtyIncrement(row);
    if (increment <= 1) return num;
    return Math.round(num / increment) * increment;
  };

  // Round quantity up to nearest case increment
  const roundQtyUpToNearestCase = (qty, row) => {
    const num = typeof qty === 'number' ? qty : parseInt(qty, 10) || 0;
    if (num <= 0) return num;
    const increment = getQtyIncrement(row);
    if (increment <= 1) return num;
    return Math.ceil(num / increment) * increment;
  };

  // Round quantity down to nearest case increment
  const roundQtyDownToNearestCase = (qty, row) => {
    const num = typeof qty === 'number' ? qty : parseInt(qty, 10) || 0;
    if (num <= 0) return 0;
    const increment = getQtyIncrement(row);
    if (increment <= 1) return num;
    return Math.floor(num / increment) * increment;
  };

  // Keyboard support for bulk increase/decrease (non-table mode)
  useEffect(() => {
    if (tableMode || nonTableSelectedIndices.size === 0) {
      return; // Only handle in non-table mode with selections
    }

    const handleKeyDown = (e) => {
      // Don't handle if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); // Prevent page scrolling
        
        const isIncrease = e.key === 'ArrowUp';
        
        effectiveSetQtyValues(prev => {
          const newValues = { ...prev };
          nonTableSelectedIndices.forEach(selectedIndex => {
            const selectedRow = currentRows.find(r => r._originalIndex === selectedIndex);
            if (selectedRow) {
              const currentQty = newValues[selectedIndex] ?? 0;
              const numQty = typeof currentQty === 'number' ? currentQty : parseInt(currentQty, 10) || 0;
              
              // Use size-based increment (e.g. 60 units for 8oz)
              const increment = getQtyIncrement(selectedRow);
              
              if (isIncrease) {
                newValues[selectedIndex] = numQty + increment;
              } else {
                if (numQty > 0) {
                  newValues[selectedIndex] = Math.max(0, numQty - increment);
                }
              }
              manuallyEditedIndices.current.add(selectedIndex);
            }
          });
          return newValues;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tableMode, nonTableSelectedIndices, currentRows.length, effectiveSetQtyValues]);

  // Ctrl+Z (undo) and Ctrl+Y / Ctrl+Shift+Z (redo) for Add Products
  useEffect(() => {
    if (!onAddProductsUndo && !onAddProductsRedo) return;

    const handleKeyDown = (e) => {
      // Don't steal shortcuts when user is typing in an input/textarea
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const k = e.key?.toLowerCase();
      if (k === 'z') {
        if (e.shiftKey) {
          // Ctrl+Shift+Z → Redo
          if (onAddProductsRedo && addProductsRedoStackLength > 0) {
            e.preventDefault();
            e.stopPropagation();
            onAddProductsRedo();
          }
        } else {
          // Ctrl+Z → Undo
          if (onAddProductsUndo && addProductsUndoStackLength > 0) {
            e.preventDefault();
            e.stopPropagation();
            onAddProductsUndo();
          }
        }
      } else if (k === 'y' && !e.shiftKey) {
        // Ctrl+Y → Redo
        if (onAddProductsRedo && addProductsRedoStackLength > 0) {
          e.preventDefault();
          e.stopPropagation();
          onAddProductsRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onAddProductsUndo, onAddProductsRedo, addProductsUndoStackLength, addProductsRedoStackLength]);

  // Handle clicks outside the product list to deselect products (non-table mode)
  useEffect(() => {
    if (tableMode || nonTableSelectedIndices.size === 0) {
      return; // Only handle in non-table mode with selections
    }

    const handleClickOutside = (e) => {
      // Check if click is on a filter icon (don't deselect when opening filters)
      const clickedOnNonTableFilterIcon = Object.values(nonTableFilterIconRefs.current).some(
        ref => ref && ref.contains && ref.contains(e.target)
      );
      
      // Check if click is inside the filter dropdown
      const clickedInsideNonTableFilterDropdown = 
        (nonTableFilterDropdownRef.current && nonTableFilterDropdownRef.current.contains && nonTableFilterDropdownRef.current.contains(e.target)) ||
        e.target.closest('[data-filter-dropdown]');
      
      // Check if click is outside the product list container
      if (
        nonTableContainerRef.current &&
        !nonTableContainerRef.current.contains(e.target) &&
        !clickedOnNonTableFilterIcon &&
        !clickedInsideNonTableFilterDropdown &&
        // Don't deselect if clicking on modals or other overlays
        !e.target.closest('[data-modal]')
      ) {
        setNonTableSelectedIndices(new Set());
        setNonTableLastSelectedIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [tableMode, nonTableSelectedIndices.size]);

  // Check if all rows are selected (respect current view/filter)
  const allSelected = useMemo(() => {
    return currentRows.length > 0 && selectedRows.size === currentRows.length;
  }, [currentRows.length, selectedRows.size]);

  // Check if some rows are selected (for indeterminate state)
  const someSelected = useMemo(() => {
    return selectedRows.size > 0 && selectedRows.size < currentRows.length;
  }, [selectedRows.size, currentRows.length]);

  // Non-table mode: all visible products selected (for select-all checkbox in PRODUCTS column)
  const nonTableAllSelected = useMemo(() => {
    if (tableMode || currentRows.length === 0) return false;
    return currentRows.every(row => {
      const idx = row._originalIndex !== undefined ? row._originalIndex : currentRows.indexOf(row);
      return nonTableSelectedIndices.has(idx);
    });
  }, [tableMode, currentRows, nonTableSelectedIndices]);

  // Non-table mode: some but not all selected (for indeterminate)
  const nonTableSomeSelected = useMemo(() => {
    if (tableMode || currentRows.length === 0) return false;
    const selectedCount = currentRows.filter(row => {
      const idx = row._originalIndex !== undefined ? row._originalIndex : currentRows.indexOf(row);
      return nonTableSelectedIndices.has(idx);
    }).length;
    return selectedCount > 0 && selectedCount < currentRows.length;
  }, [tableMode, currentRows, nonTableSelectedIndices]);

  // Set indeterminate state for select all checkbox (table mode)
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  // Set indeterminate state for select all checkbox (non-table mode, PRODUCTS column)
  useEffect(() => {
    if (nonTableSelectAllCheckboxRef.current) {
      nonTableSelectAllCheckboxRef.current.indeterminate = nonTableSomeSelected;
    }
  }, [nonTableSomeSelected]);

  // Function to position the popup - instant updates, no lag
  const positionPopup = useCallback(() => {
    if (clickedQtyIndex !== null) {
      // Try to use warning icon ref first (for non-table mode), fallback to qtyContainer
      const warningIcon = warningIconRefs.current[clickedQtyIndex];
      const qtyContainer = qtyContainerRefs.current[clickedQtyIndex];
      const popup = popupRefs.current[clickedQtyIndex];
      
      const targetElement = warningIcon || qtyContainer;
      
      if (targetElement && popup) {
        // Get current position of the icon relative to viewport
        const rect = targetElement.getBoundingClientRect();
        // Position below the warning icon or container, moved 110px higher total
        const top = rect.bottom - 106;
        const left = rect.left + rect.width / 2;
        
        // Update immediately - direct DOM manipulation for zero lag
        popup.style.position = 'fixed';
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
        popup.style.transform = 'translateX(-50%)';
      }
    }
  }, [clickedQtyIndex]);

  // Position popup when it appears
  useEffect(() => {
    positionPopup();
  }, [positionPopup]);

  // Update popup position on scroll and resize - continuous RAF loop for zero lag
  useEffect(() => {
    if (clickedQtyIndex !== null) {
      let rafId = null;
      let isActive = true;
      
      // Continuous update loop using requestAnimationFrame
      const updateLoop = () => {
        if (isActive && clickedQtyIndex !== null) {
          positionPopup();
          rafId = requestAnimationFrame(updateLoop);
        }
      };
      
      // Start the continuous update loop
      rafId = requestAnimationFrame(updateLoop);
      
      // Also update immediately on scroll/resize events for instant response
      const handleScroll = () => {
        if (isActive) {
          positionPopup();
        }
      };
      
      const handleResize = () => {
        if (isActive) {
          positionPopup();
        }
      };
      
      // Add event listeners to window and all scrollable parents
      // Use capture phase to catch all scroll events (including nested scrollable elements)
      window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
      window.addEventListener('resize', handleResize);
      
      // Also listen to scroll on any scrollable parent containers
      const scrollableParents = document.querySelectorAll('[data-table-container], .scrollable, [style*="overflow"]');
      scrollableParents.forEach(parent => {
        parent.addEventListener('scroll', handleScroll, { capture: true, passive: true });
      });
      
      return () => {
        isActive = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
        }
        window.removeEventListener('scroll', handleScroll, { capture: true, passive: true });
        window.removeEventListener('resize', handleResize);
        scrollableParents.forEach(parent => {
          parent.removeEventListener('scroll', handleScroll, { capture: true, passive: true });
        });
      };
    }
  }, [clickedQtyIndex, positionPopup]);

  // Position Add button popup when it appears
  useEffect(() => {
    if (hoveredAddIndex !== null) {
      const addButton = addButtonRefs.current[hoveredAddIndex];
      const popup = addPopupRefs.current[hoveredAddIndex];
      if (addButton && popup) {
        const rect = addButton.getBoundingClientRect();
        const popupHeight = popup.offsetHeight || 100;
        const top = rect.bottom + 8;
        const left = rect.left + rect.width / 2;
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
        popup.style.transform = 'translateX(-50%)';
        
        // Update position on scroll/resize
        const updatePosition = () => {
          if (addButton && popup) {
            const newRect = addButton.getBoundingClientRect();
            const newTop = newRect.bottom + 8;
            const newLeft = newRect.left + newRect.width / 2;
            popup.style.top = `${newTop}px`;
            popup.style.left = `${newLeft}px`;
          }
        };
        
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        
        return () => {
          window.removeEventListener('scroll', updatePosition, true);
          window.removeEventListener('resize', updatePosition);
        };
      }
    }
  }, [hoveredAddIndex]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clickedQtyIndex !== null) {
        const qtyContainer = qtyContainerRefs.current[clickedQtyIndex];
        const popup = popupRefs.current[clickedQtyIndex];
        
        // Check if click is outside both the QTY container and the popup
        if (qtyContainer && popup) {
          const isClickInsideQty = qtyContainer.contains(event.target);
          const isClickInsidePopup = popup.contains(event.target);
          
          // Only close if click is truly outside
          if (!isClickInsideQty && !isClickInsidePopup) {
            setClickedQtyIndex(null);
          }
        }
      }
    };

    if (clickedQtyIndex !== null) {
      // Use a timeout to add listener after current event cycle completes
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [clickedQtyIndex]);

  // Position filter modal when it appears
  useEffect(() => {
    if (openFilterIndex !== null) {
      const filterButton = filterRefs.current[openFilterIndex];
      const filterModal = filterModalRefs.current[openFilterIndex];
      
      if (filterButton && filterModal) {
        const rect = filterButton.getBoundingClientRect();
        const dropdownWidth = 228;
        const dropdownHeight = 265;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let left = rect.left;
        let top = rect.bottom + 8;
        
        // Adjust if dropdown goes off right edge
        if (left + dropdownWidth > viewportWidth) {
          left = viewportWidth - dropdownWidth - 16;
        }
        
        // Adjust if dropdown goes off bottom
        if (top + dropdownHeight > viewportHeight) {
          top = rect.top - dropdownHeight - 8;
        }
        
        // Don't go off left edge
        if (left < 16) {
          left = 16;
        }
        
        // Don't go off top edge
        if (top < 16) {
          top = 16;
        }
        
        filterModal.style.top = `${top}px`;
        filterModal.style.left = `${left}px`;
      }
    }
  }, [openFilterIndex]);

  // Close filter modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterIndex !== null) {
        const filterButton = filterRefs.current[openFilterIndex];
        const filterModal = filterModalRefs.current[openFilterIndex];
        
        if (filterButton && filterModal) {
          const isClickInsideButton = filterButton.contains(event.target);
          const isClickInsideModal = filterModal.contains(event.target);
          
          if (!isClickInsideButton && !isClickInsideModal) {
            setOpenFilterIndex(null);
          }
        }
      }
    };

    if (openFilterIndex !== null) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterIndex]);

  // Handle select all checkbox: check = select all rows, uncheck = uncheck all data cells
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all current rows (all data cell checkboxes checked)
      const selectedIds = new Set(currentRows.map(row => row.id));
      setSelectedRows(selectedIds);
      if (tableMode) {
        const addedIds = new Set(currentRows.map(row => row.id));
        setAddedRows(addedIds);
        if (onAddedRowsChange) onAddedRowsChange(addedIds);
      }
    } else {
      // Uncheck all data cells
      setSelectedRows(new Set());
      if (tableMode) {
        const newAdded = new Set();
        setAddedRows(newAdded);
        if (onAddedRowsChange) onAddedRowsChange(newAdded);
      }
    }
  };

  // Handle individual row checkbox
  const handleRowSelect = (rowId, e) => {
    const newSelected = new Set(selectedRows);
    if (e.target.checked) {
      newSelected.add(rowId);
    } else {
      newSelected.delete(rowId);
    }
    setSelectedRows(newSelected);

    if (tableMode) {
      const newAdded = new Set(addedRows);
      if (e.target.checked) {
        // Find the row index to check quantity
        const rowIndex = currentRows.findIndex(r => r.id === rowId);
        if (rowIndex >= 0) {
          const row = currentRows[rowIndex];
          const index = row._originalIndex;
          // Check if quantity is 0 before adding
          const currentQty = typeof effectiveQtyValues[index] === 'number' 
            ? effectiveQtyValues[index] 
            : (effectiveQtyValues[index] === '' || effectiveQtyValues[index] === null || effectiveQtyValues[index] === undefined) 
              ? 0 
              : parseInt(effectiveQtyValues[index], 10) || 0;
          
          if (currentQty === 0) {
            // Don't add if quantity is 0 - revert checkbox
            e.target.checked = false;
            newSelected.delete(rowId);
            setSelectedRows(newSelected);
            return;
          }
        }
        newAdded.add(rowId);
      } else {
        newAdded.delete(rowId);
      }
      setAddedRows(newAdded);
      if (onAddedRowsChange) onAddedRowsChange(newAdded);
    }
  };

  // Handle row mousedown to prevent text selection on Shift+Click
  const handleNonTableRowMouseDown = (e, arrayIndex, originalIndex) => {
    // Don't prevent if clicking on interactive elements
    // Exclude checkboxes specifically to allow checkbox selection
    if (
      e.target.closest('button') || 
      (e.target.closest('input') && e.target.type !== 'checkbox') ||
      e.target.type === 'checkbox'
    ) {
      return;
    }

    // Prevent text selection on Shift+Click
    if (e.shiftKey) {
      e.preventDefault();
      // Also prevent text selection via CSS
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    }
  };

  // Handle row click for multi-select (non-table mode)
  // arrayIndex is the position in currentRows (0, 1, 2...), originalIndex is row._originalIndex for qty operations
  const handleNonTableRowClick = (e, arrayIndex, originalIndex) => {
    // Don't handle selection if clicking on interactive elements
    // Exclude checkboxes specifically to allow checkbox selection
    if (
      e.target.closest('button') || 
      (e.target.closest('input') && e.target.type !== 'checkbox') ||
      e.target.type === 'checkbox'
    ) {
      return;
    }

    const isShiftClick = e.shiftKey;
    const isCmdClick = e.metaKey || e.ctrlKey;

    // Prevent text selection on Shift+Click
    if (isShiftClick) {
      e.preventDefault();
      // Clear any existing text selection
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    }

    if (isShiftClick && nonTableLastSelectedIndex !== null) {
      // Shift + Click: Select range between lastSelectedIndex and current arrayIndex
      const start = Math.min(nonTableLastSelectedIndex, arrayIndex);
      const end = Math.max(nonTableLastSelectedIndex, arrayIndex);
      const newSelected = new Set(nonTableSelectedIndices);
      
      // Add all rows in the range by their array positions
      for (let i = start; i <= end; i++) {
        if (i < currentRows.length) {
          const rowAtPosition = currentRows[i];
          newSelected.add(rowAtPosition._originalIndex);
        }
      }
      
      setNonTableSelectedIndices(newSelected);
      setNonTableLastSelectedIndex(arrayIndex);
    } else if (isCmdClick) {
      // Cmd/Ctrl + Click: Toggle selection of this item
      const newSelected = new Set(nonTableSelectedIndices);
      if (newSelected.has(originalIndex)) {
        newSelected.delete(originalIndex);
      } else {
        newSelected.add(originalIndex);
      }
      setNonTableSelectedIndices(newSelected);
      setNonTableLastSelectedIndex(arrayIndex);
    } else {
      // Regular click: Select only this item (modal opens on double-click)
      setNonTableSelectedIndices(new Set([originalIndex]));
      setNonTableLastSelectedIndex(arrayIndex);
    }
  };

  // Handle checkbox click for multi-select (non-table mode)
  // Supports Shift+Click and Cmd+Click for bulk selection
  const handleNonTableCheckboxClick = (e, arrayIndex, originalIndex) => {
    e.stopPropagation(); // Prevent triggering row click handler
    
    const isShiftClick = e.shiftKey;
    const isCmdClick = e.metaKey || e.ctrlKey;
    const wasChecked = nonTableSelectedIndices.has(originalIndex);
    const willBeChecked = e.target.checked;

    // Prevent text selection on Shift+Click
    if (isShiftClick) {
      e.preventDefault();
      // Clear any existing text selection
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
      }
    }

    if (isShiftClick && nonTableLastSelectedIndex !== null) {
      // Shift + Click: Select range between lastSelectedIndex and current arrayIndex
      // Always select the entire range (standard Shift+Click behavior)
      const start = Math.min(nonTableLastSelectedIndex, arrayIndex);
      const end = Math.max(nonTableLastSelectedIndex, arrayIndex);
      const newSelected = new Set(nonTableSelectedIndices);
      
      // Add all rows in the range by their array positions
      for (let i = start; i <= end; i++) {
        if (i < currentRows.length) {
          const rowAtPosition = currentRows[i];
          newSelected.add(rowAtPosition._originalIndex);
        }
      }
      
      setNonTableSelectedIndices(newSelected);
      setNonTableLastSelectedIndex(arrayIndex);
    } else if (isCmdClick) {
      // Cmd/Ctrl + Click: Toggle selection of this item
      const newSelected = new Set(nonTableSelectedIndices);
      if (willBeChecked) {
        newSelected.add(originalIndex);
      } else {
        newSelected.delete(originalIndex);
      }
      setNonTableSelectedIndices(newSelected);
      setNonTableLastSelectedIndex(arrayIndex);
    } else {
      // Regular click: Toggle this item (add/remove) so multiple products can be selected
      const newSelected = new Set(nonTableSelectedIndices);
      if (willBeChecked) {
        newSelected.add(originalIndex);
      } else {
        newSelected.delete(originalIndex);
      }
      setNonTableSelectedIndices(newSelected);
      setNonTableLastSelectedIndex(arrayIndex);
    }
  };

  // Handle select all checkbox (non-table mode, PRODUCTS column) – for multi-selection and bulk actions
  const handleNonTableSelectAll = (e) => {
    if (e.target.checked) {
      const indices = new Set(currentRows.map(row => row._originalIndex !== undefined ? row._originalIndex : currentRows.indexOf(row)));
      setNonTableSelectedIndices(indices);
      if (nonTableSelectAllCheckboxRef.current && indices.size < currentRows.length) {
        nonTableSelectAllCheckboxRef.current.indeterminate = indices.size > 0;
        nonTableSelectAllCheckboxRef.current.checked = false;
      }
    } else {
      setNonTableSelectedIndices(new Set());
    }
  };

  // Handle Add button click (with bulk support)
  const handleAddClick = (row, index) => {
    const newAdded = new Set(addedRows);
    
    // In non-table mode, if multiple products are selected, perform bulk add/remove
    if (!tableMode && nonTableSelectedIndices.size > 1 && nonTableSelectedIndices.has(index)) {
      // Determine if we're adding or removing based on the clicked row's state
      const isRemoving = newAdded.has(row.id);
      const qtyUpdates = {};

      // Apply the action to all selected rows
      nonTableSelectedIndices.forEach(selectedIndex => {
        const selectedRow = currentRows.find(r => r._originalIndex === selectedIndex);
        if (selectedRow) {
          if (isRemoving) {
            // Remove from added - keep the qty value
            newAdded.delete(selectedRow.id);
          } else {
            // Check if quantity is greater than 0 before adding
            let currentQty = typeof effectiveQtyValues[selectedIndex] === 'number'
              ? effectiveQtyValues[selectedIndex]
              : (effectiveQtyValues[selectedIndex] === '' || effectiveQtyValues[selectedIndex] === null || effectiveQtyValues[selectedIndex] === undefined)
                ? 0
                : parseInt(effectiveQtyValues[selectedIndex], 10) || 0;

            // In non-table mode, if quantity is 0, use totalInventory from Ngoos
            if (!tableMode && currentQty === 0 && selectedRow.totalInventory) {
              currentQty = selectedRow.totalInventory;
            }

            // In non-table mode, round quantity to nearest case when adding
            const roundedQty = !tableMode ? roundQtyToNearestCase(currentQty, selectedRow) : currentQty;
            if (roundedQty > 0) {
              qtyUpdates[selectedIndex] = roundedQty;
              newAdded.add(selectedRow.id);
            }
          }
        }
      });

      if (Object.keys(qtyUpdates).length > 0) {
        effectiveSetQtyValues(prev => ({ ...prev, ...qtyUpdates }));
        Object.keys(qtyUpdates).forEach((idx) => {
          if (rawQtyInputValues.current[idx] !== undefined) {
            rawQtyInputValues.current[idx] = undefined;
          }
        });
        setQtyInputUpdateTrigger((t) => t + 1);
      }
    } else {
      // Single product add/remove
      if (newAdded.has(row.id)) {
        // Remove from added - keep the qty value (don't clear it)
        newAdded.delete(row.id);
      } else {
        // Check if quantity is 0 before adding
        let currentQty = typeof effectiveQtyValues[index] === 'number'
          ? effectiveQtyValues[index]
          : (effectiveQtyValues[index] === '' || effectiveQtyValues[index] === null || effectiveQtyValues[index] === undefined)
            ? 0
            : parseInt(effectiveQtyValues[index], 10) || 0;

        // In non-table mode, if quantity is 0, use totalInventory from Ngoos
        if (!tableMode && currentQty === 0 && row.totalInventory) {
          currentQty = row.totalInventory;
        }

        // In non-table mode, round quantity to nearest case when adding (e.g. 61 or 56 -> 60 for 8oz)
        const roundedQty = !tableMode ? roundQtyToNearestCase(currentQty, row) : currentQty;

        if (roundedQty === 0) {
          return;
        }

        // Persist rounded quantity so the field shows the nearest case (e.g. 56 or 61 -> 60 for 8oz)
        if (!tableMode) {
          effectiveSetQtyValues(prev => ({ ...prev, [index]: roundedQty }));
          if (rawQtyInputValues.current[index] !== undefined) {
            rawQtyInputValues.current[index] = undefined;
          }
          setQtyInputUpdateTrigger((t) => t + 1);
        }

        newAdded.add(row.id);
      }
    }
    
    // This will update local state and notify parent
    setAddedRows(newAdded);
    if (onAddedRowsChange) onAddedRowsChange(newAdded);
  };

  const themeClasses = {
    cardBg: isDarkMode ? 'bg-dark-bg-secondary' : 'bg-white',
    text: isDarkMode ? 'text-dark-text-primary' : 'text-gray-900',
    textSecondary: isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500',
    border: isDarkMode ? 'border-dark-border-primary' : 'border-gray-200',
    headerBg: 'bg-[#2C3544]',
  };

  // Helper: DOI number color by days — 0-54 red, 55-89 orange, 90+ green
  const getDoiColor = (doiValue) => {
    const n = Number(doiValue) || 0;
    if (n < 55) return '#EF4444'; // Red
    if (n < 90) return '#F97316'; // Orange
    return '#22C55E'; // Green
  };

  if (!tableMode) {
    // Card/List view layout
    return (
      <>
        {/* Pure CSS hover - fastest possible (browser native) */}
        <style>{`
          /* Row highlight: same width as separator (30px inset), decreased intensity */
          .non-table-row[data-selected="true"][data-dark="true"]:hover .non-table-row-highlight {
            background-color: #1E3A52 !important;
          }
          .non-table-row[data-selected="true"][data-dark="false"]:hover .non-table-row-highlight {
            background-color: #D1E0F7 !important;
          }
          .non-table-row[data-selected="false"]:hover .non-table-row-highlight {
            background-color: #1A2636 !important;
          }
          .non-table-row:hover .pencil-icon-hover {
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          .non-table-row:hover .analyze-icon-hover {
            opacity: 1 !important;
            pointer-events: auto !important;
          }
        `}</style>
        <style>{`
          .non-table-data-scroll {
            overflow-y: auto;
            overflow-x: visible;
            scrollbar-width: none;
            -ms-overflow-style: none;
            will-change: scroll-position;
          }
          .non-table-data-scroll::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
          }
          .non-table-thumb.non-table-thumb-scroll-visible {
            opacity: 1 !important;
            pointer-events: auto !important;
          }
          .non-table-thumb {
            will-change: transform;
          }
        `}</style>
        <div
          ref={nonTableContainerRef}
          className={`${themeClasses.cardBg} ${themeClasses.border} border rounded-xl shadow-sm`}
          style={{ marginTop: '1.25rem', overflowX: 'hidden', borderRadius: '16px' }}
        >
          {/* Header Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 220px 140px',
              padding: '22px 16px 12px 16px',
              height: '67px',
              backgroundColor: '#1A2235',
              alignItems: 'center',
              gap: '32px',
              position: 'sticky',
              top: 0,
              zIndex: 100
            }}
          >
            {/* Border line with 30px margin on both sides */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '30px',
                right: '30px',
                height: '1px',
                backgroundColor: isDarkMode ? '#374151' : '#E5E7EB'
              }}
            />
            <div 
              className="group"
              style={{ 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: 600, 
                fontSize: '12px', 
                textTransform: 'uppercase', 
                color: (hasNonTableActiveFilter('product') || nonTableOpenFilterColumn === 'product') ? '#3B82F6' : (isDarkMode ? '#FFFFFF' : '#111827'), 
                marginLeft: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                position: 'relative'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  ref={nonTableSelectAllCheckboxRef}
                  checked={nonTableAllSelected}
                  onChange={handleNonTableSelectAll}
                  style={{
                    cursor: 'pointer',
                    width: '16px',
                    height: '16px',
                    border: '1px solid #94A3B8',
                    borderRadius: '4px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    pointerEvents: 'auto',
                  }}
                  className="new-shipment-checkbox"
                  aria-label="Select all products"
                />
              </label>
              <span>PRODUCTS</span>
              {hasNonTableActiveFilter('product') && (
                <span style={{ 
                  display: 'inline-block',
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: '#10B981',
                }} />
              )}
              <img
                ref={(el) => {
                  if (el) nonTableFilterIconRefs.current['product'] = el;
                }}
                src="/assets/Vector (1).png"
                alt="Filter"
                className={`w-3 h-3 transition-opacity cursor-pointer ${
                  hasNonTableActiveFilter('product') || nonTableOpenFilterColumn === 'product'
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNonTableOpenFilterColumn(prev => prev === 'product' ? null : 'product');
                }}
                style={{
                  width: '12px',
                  height: '12px',
                  ...(hasNonTableActiveFilter('product') || nonTableOpenFilterColumn === 'product'
                    ? {
                        filter:
                          'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                      }
                    : undefined)
                }}
              />
            </div>
            <div 
              className="group"
              style={{ 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: 600, 
                fontSize: '12px', 
                textTransform: 'uppercase', 
                color: (hasNonTableActiveFilter('fbaAvailable') || nonTableOpenFilterColumn === 'fbaAvailable') ? '#3B82F6' : (isDarkMode ? '#FFFFFF' : '#111827'), 
                textAlign: 'center', 
                paddingLeft: '16px', 
                marginLeft: '-260px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative'
              }}
            >
              <span>INVENTORY</span>
              {hasNonTableActiveFilter('fbaAvailable') && (
                <span style={{ 
                  display: 'inline-block',
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: '#10B981',
                }} />
              )}
              <img
                ref={(el) => {
                  if (el) nonTableFilterIconRefs.current['fbaAvailable'] = el;
                }}
                src="/assets/Vector (1).png"
                alt="Filter"
                className={`w-3 h-3 transition-opacity cursor-pointer ${
                  hasNonTableActiveFilter('fbaAvailable') || nonTableOpenFilterColumn === 'fbaAvailable'
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNonTableOpenFilterColumn(prev => prev === 'fbaAvailable' ? null : 'fbaAvailable');
                }}
                style={{
                  width: '12px',
                  height: '12px',
                  ...(hasNonTableActiveFilter('fbaAvailable') || nonTableOpenFilterColumn === 'fbaAvailable'
                    ? {
                        filter:
                          'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                      }
                    : undefined)
                }}
              />
            </div>
            <div 
              className="group"
              style={{ 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: 600, 
                fontSize: '12px', 
                textTransform: 'uppercase', 
                color: (hasNonTableActiveFilter('unitsToMake') || nonTableOpenFilterColumn === 'unitsToMake') ? '#3B82F6' : (isDarkMode ? '#FFFFFF' : '#111827'), 
                textAlign: 'center', 
                paddingLeft: '16px', 
                marginLeft: '-260px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative'
              }}
            >
              <span>UNITS TO MAKE</span>
              {hasNonTableActiveFilter('unitsToMake') && (
                <span style={{ 
                  display: 'inline-block',
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: '#10B981',
                }} />
              )}
              <img
                ref={(el) => {
                  if (el) nonTableFilterIconRefs.current['unitsToMake'] = el;
                }}
                src="/assets/Vector (1).png"
                alt="Filter"
                className={`w-3 h-3 transition-opacity cursor-pointer ${
                  hasNonTableActiveFilter('unitsToMake') || nonTableOpenFilterColumn === 'unitsToMake'
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNonTableOpenFilterColumn(prev => prev === 'unitsToMake' ? null : 'unitsToMake');
                }}
                style={{
                  width: '12px',
                  height: '12px',
                  ...(hasNonTableActiveFilter('unitsToMake') || nonTableOpenFilterColumn === 'unitsToMake'
                    ? {
                        filter:
                          'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                      }
                    : undefined)
                }}
              />
            </div>
            <div 
              className="group"
              style={{ 
                fontFamily: 'Inter, sans-serif', 
                fontWeight: 600, 
                fontSize: '12px', 
                textTransform: 'uppercase', 
                color: (hasNonTableActiveFilter('doiDays') || nonTableOpenFilterColumn === 'doiDays') ? '#3B82F6' : (isDarkMode ? '#FFFFFF' : '#111827'), 
                textAlign: 'center', 
                paddingLeft: '16px', 
                marginLeft: '-275px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                position: 'relative'
              }}
            >
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginLeft: '-130px' }}>
                <span>DAYS OF INVENTORY</span>
                {hasNonTableActiveFilter('doiDays') && (
                  <span style={{ 
                    display: 'inline-block',
                    width: '6px', 
                    height: '6px', 
                    borderRadius: '50%', 
                    backgroundColor: '#10B981',
                  }} />
                )}
                <img
                  ref={(el) => {
                    if (el) nonTableFilterIconRefs.current['doiDays'] = el;
                  }}
                  src="/assets/Vector (1).png"
                  alt="Filter"
                  className={`w-3 h-3 transition-opacity cursor-pointer ${
                    hasNonTableActiveFilter('doiDays') || nonTableOpenFilterColumn === 'doiDays'
                      ? 'opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setNonTableOpenFilterColumn(prev => prev === 'doiDays' ? null : 'doiDays');
                  }}
                  style={{
                    width: '12px',
                    height: '12px',
                    ...(hasNonTableActiveFilter('doiDays') || nonTableOpenFilterColumn === 'doiDays'
                      ? {
                          filter:
                            'invert(29%) sepia(94%) saturate(2576%) hue-rotate(199deg) brightness(102%) contrast(105%)',
                        }
                      : undefined)
                  }}
                />
              </div>
              {/* Legend: FBA AVAILABLE and TOTAL INVENTORY as buttons; both can be active to show 2 rows */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', marginLeft: '-160px', marginTop: '-3px' }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowFbaBar((prev) => !prev); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    minHeight: '18px',
                    height: '18px',
                    boxSizing: 'border-box',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: showFbaBar ? '#1A5DA7' : (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)'),
                    cursor: 'pointer',
                    background: showFbaBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : (isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'),
                    color: showFbaBar ? '#FFFFFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                    transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                  }}
                  aria-label="Show FBA Available"
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: showFbaBar ? '#22C55E' : '#64758B', flexShrink: 0 }} />
                  FBA AVAILABLE
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowDoiBar((prev) => !prev); }}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    minHeight: '18px',
                    height: '18px',
                    boxSizing: 'border-box',
                    borderRadius: '4px',
                    border: '1px solid',
                    borderColor: showDoiBar ? '#1A5DA7' : (isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)'),
                    cursor: 'pointer',
                    background: showDoiBar ? 'linear-gradient(to right, #1A5DA7, #007AFF)' : (isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'),
                    color: showDoiBar ? '#FFFFFF' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                    transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                  }}
                  aria-label="Show Total Inventory"
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: showDoiBar ? '#3B82F6' : '#64758B', flexShrink: 0 }} />
                  TOTAL INVENTORY
                </button>
              </div>
            </div>
          </div>

          {/* Product Rows - scrollable data cell with custom thumb-only scrollbar */}
          <div
            ref={nonTableDataScrollWrapperRef}
            style={{ position: 'relative', maxHeight: 'calc(100vh - 260px)', overflow: 'visible' }}
            onMouseEnter={() => {
              const el = nonTableDataScrollRef.current;
              if (el) {
                const scrollTop = el.scrollTop;
                const scrollHeight = el.scrollHeight;
                const clientHeight = el.clientHeight;
                setDataScrollMetrics({ scrollTop, scrollHeight, clientHeight });
                setShowDataScrollThumb(true);
                const thumbEl = nonTableThumbRef.current;
                if (thumbEl && scrollHeight > clientHeight) {
                  thumbEl.classList.add('non-table-thumb-scroll-visible');
                  const scrollable = scrollHeight - clientHeight;
                  const thumbHeight = Math.max(20, (clientHeight / scrollHeight) * clientHeight);
                  const trackHeight = clientHeight - thumbHeight;
                  const thumbTop = (scrollTop / scrollable) * trackHeight;
                  thumbEl.style.transform = `translateY(${thumbTop}px)`;
                }
              }
            }}
            onMouseLeave={() => {
              if (nonTableThumbDragRef.current) return; // Keep thumb visible while user is dragging it
              const thumbEl = nonTableThumbRef.current;
              if (thumbEl) thumbEl.classList.remove('non-table-thumb-scroll-visible');
              setShowDataScrollThumb(false);
            }}
          >
            <div
              ref={nonTableDataScrollRef}
              className="non-table-data-scroll"
              style={{ maxHeight: 'calc(100vh - 260px)', height: '100%' }}
            >
            {currentRows.map((row, arrayIndex) => {
              const index = row._originalIndex !== undefined ? row._originalIndex : arrayIndex;
              const effectiveAddedRows = addedRows;
              const doiValue = row.doiTotal || row.daysOfInventory || 0;
              const isAdded = effectiveAddedRows.has(row.id);
              // Average daily demand: used to project DOI from (total inventory + Units to Make)
              const sales7 = Number(row.sales7Day ?? row.sales_7_day ?? row.units_sold_7_days ?? 0) || 0;
              const sales30 = Number(row.sales30Day ?? row.sales_30_day ?? row.units_sold_30_days ?? 0) || 0;
              const avgDailyDemand = sales7 > 0 ? sales7 / 7 : (sales30 > 0 ? sales30 / 30 : 0);
              const totalInventory = Number(row.totalInventory ?? row.total_inventory ?? 0) || 0;
              const currentQtyForDoi = (() => {
                const q = effectiveQtyValues[index];
                if (q === undefined || q === null || q === '') return 0;
                return typeof q === 'number' ? q : (parseInt(q, 10) || 0);
              })();
              // When added: Units to Make is the suggested value from required DOI. Display DOI = projected
              // days of inventory after adding that quantity: (total inventory + Units to Make) / daily demand.
              const effectiveDemand = avgDailyDemand > 0 ? avgDailyDemand : 10;
              const displayDoi = (() => {
                if (!isAdded) return doiValue;
                const projectedInventory = totalInventory + currentQtyForDoi;
                const calculatedDoi = Math.floor(projectedInventory / effectiveDemand);
                return Math.max(0, calculatedDoi);
              })();
              const doiColor = getDoiColor(displayDoi);
              const asin = row.asin || row.child_asin || row.childAsin || '';
              
              const isSelected = nonTableSelectedIndices.has(index);
              
              // Check if product has custom DOI settings (different from general settings)
              const hasCustomDoiSettings = row.customDoiSettings || row.hasCustomDoi || false;
              // Check if product has custom forecast settings
              const hasCustomForecastSettings = row.hasCustomForecastSettings || false;
              
              // Check if this specific product's DOI value has changed from its original value
              const productId = row.id || row.asin || row.child_asin || row.childAsin;
              const originalDoi = productId ? originalDoiValues.current[productId] : undefined;
              const currentDoi = doiValue;
              const hasDoiChanged = originalDoi !== undefined && originalDoi !== currentDoi;
              const originalQtyValueForRow = getStoredOriginalQtyValue(productId, index);
              
              // Determine if pencil should be in "active" (blue) state.
              // This is true whenever the product has custom DOI or forecast settings,
              // regardless of table vs non-table mode.
              const isPencilActive = hasCustomDoiSettings || hasCustomForecastSettings;
              
              // Determine if pencil should be permanently visible.
              // - Non-table (card) mode:
              //     - Default: pencil only shows on hover (CSS handles this).
              //     - When active (blue): always visible, even without hover.
              // - Table mode:
              //     - Keep pencil visible when DOI changed or there are custom settings.
              const shouldShowPencilPermanently =
                (tableMode && (hasDoiChanged || isPencilActive)) ||
                (!tableMode && isPencilActive);
              
              return (
                <div
                  key={`${row.id}-${index}`}
                  onMouseDown={(e) => {
                    // Only handle mousedown if not clicking on interactive elements
                    // Exclude checkboxes specifically to allow checkbox selection
                    if (
                      e.target.type !== 'checkbox' &&
                      !e.target.closest('input[type="checkbox"]') &&
                      !e.target.closest('button') &&
                      !e.target.closest('img[alt="Copy"]')
                    ) {
                      handleNonTableRowMouseDown(e, arrayIndex, index);
                    }
                  }}
                  onClick={(e) => {
                    // Only handle selection if not clicking on interactive elements
                    // Exclude checkboxes specifically to allow checkbox selection
                    if (
                      e.target.type !== 'checkbox' &&
                      !e.target.closest('input[type="checkbox"]') &&
                      !e.target.closest('button') &&
                      !e.target.closest('img[alt="Copy"]')
                    ) {
                      // Track click time for slow double click detection
                      const currentTime = Date.now();
                      lastClickTimeRef.current[index] = currentTime;
                      
                      handleNonTableRowClick(e, arrayIndex, index);
                    }
                  }}
                  onDoubleClick={(e) => {
                    // Check if clicking on interactive elements
                    if (
                      e.target.closest('input') ||
                      e.target.closest('button') ||
                      e.target.closest('img[alt="Copy"]')
                    ) {
                      return;
                    }

                    const currentTime = Date.now();
                    const lastClickTime = lastClickTimeRef.current[index] || 0;
                    const timeBetweenClicks = currentTime - lastClickTime;
                    
                    // Update last click time
                    lastClickTimeRef.current[index] = currentTime;
                    
                    // Slow double click: time between clicks > 500ms
                    if (timeBetweenClicks > 500 && timeBetweenClicks < 2000) {
                      // Remove highlight by deselecting the row
                      const newSelected = new Set(nonTableSelectedIndices);
                      if (newSelected.has(index)) {
                        newSelected.delete(index);
                        setNonTableSelectedIndices(newSelected);
                      }
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    
                    // Fast double click: Open N-GOOS modal
                    if (
                      onProductClick &&
                      arrayIndex < currentRows.length
                    ) {
                      const clickedRow = currentRows[arrayIndex];
                      onProductClick(clickedRow, false);
                    }
                  }}
                  className="non-table-row"
                  data-selected={isSelected}
                  data-dark={isDarkMode}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 220px 140px',
                    height: '66px',
                    minHeight: '66px',
                    maxHeight: '66px',
                    padding: '8px 16px',
                    backgroundColor: '#1A2235',
                    alignItems: 'center',
                    gap: '32px',
                    userSelect: 'none', // Prevent text selection
                    WebkitUserSelect: 'none', // Safari
                    MozUserSelect: 'none', // Firefox
                    msUserSelect: 'none', // IE/Edge
                    boxSizing: 'border-box',
                    position: 'relative',
                    cursor: 'pointer',
                    zIndex: hoveredInventoryWarningIndex === index ? 10001 : 'auto',
                    overflow: 'visible',
                  }}
                >
                  {/* Highlight layer: same width as separator (30px inset), decreased intensity */}
                  <div
                    className="non-table-row-highlight"
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: '30px',
                      right: '30px',
                      top: 0,
                      bottom: 0,
                      zIndex: 0,
                      backgroundColor: (() => {
                        if (isSelected) {
                          return isDarkMode ? '#1A2F4A' : '#E8F0FA';
                        }
                        return 'transparent';
                      })(),
                      pointerEvents: 'none',
                    }}
                  />
                  {/* Border line with 30px margin on both sides */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '30px',
                      right: '30px',
                      height: '1px',
                      backgroundColor: isDarkMode ? '#374151' : '#E5E7EB',
                      zIndex: 1,
                    }}
                  />
                  {/* PRODUCTS Column */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 1 }}>
                    {/* Checkbox for bulk selection */}
                    <label
                      style={{
                        position: 'relative',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        marginLeft: '20px',
                        flexShrink: 0
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleNonTableCheckboxClick(e, arrayIndex, index)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '16px',
                          height: '16px',
                          opacity: 0,
                          margin: 0,
                          cursor: 'pointer',
                          pointerEvents: 'auto',
                          zIndex: 2,
                        }}
                        aria-label="Select row"
                      />
                      <span
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '4px',
                          border: '1px solid',
                          borderColor: isSelected
                            ? (isDarkMode ? '#3B82F6' : '#3B82F6')
                            : '#94A3B8',
                          backgroundColor: isSelected 
                            ? (isDarkMode ? '#3B82F6' : '#3B82F6')
                            : (isDarkMode ? '#1A2235' : '#F9FAFB'),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'background-color 0.2s, border-color 0.2s',
                          pointerEvents: 'none',
                        }}
                      >
                        {isSelected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 4L4 7L9 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </label>
                    {/* Product Icon - Alternating placeholder images */}
                    <div style={{ width: '36px', height: '36px', minWidth: '36px', borderRadius: '3px', overflow: 'hidden', backgroundColor: isDarkMode ? '#374151' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img 
                        src={index % 2 === 0 
                          ? "https://scontent.fcrk1-4.fna.fbcdn.net/v/t39.30808-6/324020813_5698060603642883_3730941176199502248_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=GGxaVG4-pVgQ7kNvwEPLk1T&_nc_oc=AdnEjj3CW2ATnumPvOuJ-FMNwcmhl9bJtNYRiqBX0KP8pIFYhMc84O-nNOk6kE4dvDA&_nc_zt=23&_nc_ht=scontent.fcrk1-4.fna&_nc_gid=9BGxqtl66s2GX15r0D2jdA&oh=00_Afowix4xzmWR-0krARMs91-l_crfPVOv-mYZt6pCBxQvqg&oe=697DA3B3"
                          : "https://scontent.fcrk1-5.fna.fbcdn.net/v/t39.30808-6/487773950_3943908355860406_7417001938099264240_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=a5f93a&_nc_ohc=Q5i960Y67IMQ7kNvwHED1Xh&_nc_oc=AdksAIFb-tZtqjUdT8lcXCdpdtncAEhjlovtG4Wc28FurTc5KNPMj0mo0nnTblhxnAU&_nc_zt=23&_nc_ht=scontent.fcrk1-5.fna&_nc_gid=10fX7hhwHytZNZlfttK-qg&oh=00_AfqRi4SDD09H1FMPJCT0mt9b9LBaaeqw2GjRw966aKV1hg&oe=697D9F4B"
                        }
                        alt={row.product} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => { 
                          e.target.style.display = 'none'; 
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; 
                        }} 
                      />
                      <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: '3px', gap: '7.5px', color: isDarkMode ? '#6B7280' : '#9CA3AF', fontSize: '12px' }}>
                        No img
                      </div>
                    </div>
                    
                    {/* Product Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                      {/* Product Name + Best Seller badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onProductClick && arrayIndex < currentRows.length) {
                              const clickedRow = currentRows[arrayIndex];
                              onProductClick(clickedRow, false);
                            }
                          }}
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#3B82F6',
                            textDecoration: 'underline',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                          }}
                          className="hover:opacity-80"
                          aria-label={`Open ${row.product || 'product'} details`}
                        >
                          {row.product}
                        </button>
                        {topSellerIds.has(row.id) && (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.02em',
                              color: '#B45309',
                              backgroundColor: '#FEF3C7',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              flexShrink: 0,
                            }}
                            title="Top 2 by 7-day (last week) & 30-day sales"
                          >
                            Best Seller
                          </span>
                        )}
                      </div>
                      
                      {/* Product ID and Brand/Size on same line */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                        {/* Product ID with Clipboard Icon */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                            {asin || 'N/A'}
                          </span>
                          {asin && (
                            <img 
                              src="/assets/copyy.png" 
                              alt="Copy" 
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  // Try modern clipboard API first
                                  if (navigator.clipboard && navigator.clipboard.writeText) {
                                    await navigator.clipboard.writeText(asin);
                                  } else {
                                    // Fallback for non-secure contexts or older browsers
                                    const textArea = document.createElement('textarea');
                                    textArea.value = asin;
                                    textArea.style.position = 'fixed';
                                    textArea.style.left = '-999999px';
                                    textArea.style.top = '-999999px';
                                    document.body.appendChild(textArea);
                                    textArea.focus();
                                    textArea.select();
                                    try {
                                      document.execCommand('copy');
                                    } finally {
                                      document.body.removeChild(textArea);
                                    }
                                  }
                                  toast.success('ASIN copied to clipboard', {
                                    description: asin,
                                    duration: 2000,
                                  });
                                } catch (err) {
                                  console.error('Failed to copy ASIN:', err);
                                  toast.error('Failed to copy ASIN', {
                                    description: 'Please try again',
                                    duration: 2000,
                                  });
                                }
                              }}
                              style={{ width: '14px', height: '14px', cursor: 'pointer', flexShrink: 0 }} 
                            />
                          )}
                        </div>
                        
                        {/* Brand and Size (with package hint for 6oz / 1/2lb / 1lb / 5lb) */}
                        <span style={{ fontSize: '12px', color: isDarkMode ? '#9CA3AF' : '#6B7280' }}>
                          {row.brand} • {row.size}
                          {(() => {
                            const rawSize = row.size || '';
                            const sizeLower = rawSize.toLowerCase();
                            const sizeCompact = sizeLower.replace(/\s+/g, '');

                            const isSixOz =
                              sizeCompact.includes('6oz') ||
                              sizeLower.includes('6 oz') ||
                              sizeLower.includes('6-ounce') ||
                              sizeLower.includes('6 ounce');

                            const isHalfPound =
                              sizeCompact.includes('1/2lb') ||
                              sizeLower.includes('1/2 lb') ||
                              sizeLower.includes('0.5lb') ||
                              sizeLower.includes('0.5 lb') ||
                              sizeLower.includes('half lb');

                            const isOnePound =
                              sizeCompact.includes('1lb') ||
                              sizeLower.includes('1 lb') ||
                              sizeLower.includes('1-pound') ||
                              sizeLower.includes('1 pound');

                            const isFivePound =
                              sizeCompact.includes('5lb') ||
                              sizeLower.includes('5 lb') ||
                              sizeLower.includes('5-pound') ||
                              sizeLower.includes('5 pound');

                            if (isSixOz || isHalfPound || isOnePound || isFivePound) {
                              return ' • Bag';
                            }

                            return null;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* INVENTORY Column (number with warning icon for Sold Out / No Sales) */}
                  {(() => {
                    const totalInv = Number(row.totalInventory) || 0;
                    const hasSalesHistory = (Number(row.sales30Day) || Number(row.sales7Day) || 0) > 0;
                    const isOutOfStock = totalInv === 0;
                    const isNoSales = !hasSalesHistory;
                    const warningColor = isOutOfStock ? '#EF4444' : isNoSales ? '#F97316' : null;
                    const warningLabel = isOutOfStock ? 'Sold Out' : isNoSales ? 'No Sales' : null;
                    return (
                      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, color: isDarkMode ? '#FFFFFF' : '#111827', paddingLeft: '16px', marginLeft: '-255px', marginRight: '20px', minWidth: '140px', height: '23px', position: 'relative', overflow: 'visible', zIndex: hoveredInventoryWarningIndex === index ? 100000 : 2 }}>
                        {warningColor && (
                          <span
                            ref={(el) => { if (el) inventoryWarningIconRefs.current[index] = el; }}
                            className="inventory-warning-icon"
                            onMouseEnter={() => {
                              setHoveredInventoryWarningIndex(index);
                              // Calculate tooltip position
                              const icon = inventoryWarningIconRefs.current[index];
                              if (icon) {
                                const rect = icon.getBoundingClientRect();
                                const headerHeight = 67; // Sticky header height
                                const tooltipHeight = 31; // Approximate tooltip height
                                const spaceAbove = rect.top;
                                const spaceBelow = window.innerHeight - rect.bottom;
                                // If not enough space above or would be clipped by header, position below
                                const positionAbove = spaceAbove >= tooltipHeight + 8 && rect.top > headerHeight + 8;
                                const tooltipTop = positionAbove 
                                  ? rect.top - tooltipHeight - 8
                                  : rect.bottom + 8;
                                setInventoryTooltipPosition({
                                  top: tooltipTop,
                                  left: rect.left + rect.width / 2,
                                  visible: true,
                                  label: warningLabel
                                });
                              }
                            }}
                            onMouseLeave={() => {
                              setHoveredInventoryWarningIndex(null);
                              setInventoryTooltipPosition(prev => ({ ...prev, visible: false }));
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              backgroundColor: warningColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              cursor: 'default',
                              position: 'relative',
                              overflow: 'visible',
                              zIndex: hoveredInventoryWarningIndex === index ? 100000 : 'auto',
                            }}
                          >
                            <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '12px', lineHeight: 1 }}>!</span>
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', height: '100%', width: 'fit-content' }}>{totalInv.toLocaleString()}</span>
                      </div>
                    );
                  })()}

                  {/* UNITS TO MAKE Column - match header: same padding so content aligns under header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', paddingLeft: '16px', marginLeft: '-300px', marginRight: '20px', position: 'relative', minWidth: '220px', zIndex: hoveredWarningIndex === index ? 10001 : 2 }}>
                    {/* Label warning icon - shown when QTY exceeds labels, positioned on the left */}
                    {(() => {
                      const labelsAvailable = getAvailableLabelsForRow(row, index);
                      const labelsNeeded = effectiveQtyValues[index] ?? 0;
                      // Only show warning if labels needed exceed available
                      if (labelsNeeded > labelsAvailable && labelsNeeded > 0) {
                        return (
                          <>
                            <span
                              ref={(el) => {
                                if (el) {
                                  warningIconRefs.current[index] = el;
                                  labelsWarningIconRefs.current[index] = el;
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setClickedQtyIndex(clickedQtyIndex === index ? null : index);
                                // Hide tooltip when clicking the icon
                                setHoveredWarningIndex(null);
                                setLabelsTooltipPosition(prev => ({ ...prev, visible: false }));
                              }}
                              onMouseEnter={() => {
                                setHoveredWarningIndex(index);
                                // Calculate tooltip position
                                const icon = labelsWarningIconRefs.current[index];
                                if (icon) {
                                  const rect = icon.getBoundingClientRect();
                                  const headerHeight = 67; // Sticky header height
                                  const tooltipHeight = 31; // Approximate tooltip height
                                  const spaceAbove = rect.top;
                                  const spaceBelow = window.innerHeight - rect.bottom;
                                  // If not enough space above or would be clipped by header, position below
                                  const positionAbove = spaceAbove >= tooltipHeight + 8 && rect.top > headerHeight + 8;
                                  const tooltipTop = positionAbove 
                                    ? rect.top - tooltipHeight - 8
                                    : rect.bottom + 8;
                                  setLabelsTooltipPosition({
                                    top: tooltipTop,
                                    left: rect.left + rect.width / 2,
                                    visible: true,
                                    labelsAvailable: labelsAvailable
                                  });
                                }
                              }}
                              onMouseLeave={() => {
                                setHoveredWarningIndex(null);
                                setLabelsTooltipPosition(prev => ({ ...prev, visible: false }));
                              }}
                              style={{
                                position: 'absolute',
                                left: 'calc(50% - 257px)',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                backgroundColor: '#FEE2E2',
                                color: '#DC2626',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                zIndex: hoveredWarningIndex === index ? 100000 : 10,
                              }}
                            >
                              !
                            </span>
                          </>
                        );
                      }
                      return null;
                    })()}
                    {/* Quantity input container with reset button inside */}
                    <div 
                      ref={(el) => {
                        if (el) qtyContainerRefs.current[index] = el;
                      }}
                      style={{ position: 'relative', width: '110px', height: '28px', cursor: 'text' }}
                      onMouseEnter={() => setHoveredQtyIndex(index)}
                      onMouseLeave={() => setHoveredQtyIndex(null)}
                    >
                      {/* Reset button - inside container */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const originalQtyValue = originalQtyValueForRow;
                          
                          console.log('Reset clicked for index:', index);
                          console.log('Product ID:', productId);
                          console.log('Row data:', row);
                          console.log('Original suggested value:', originalQtyValue);
                          console.log('Current qty value:', effectiveQtyValues[index]);
                          console.log('All original suggested qtys by ID:', originalSuggestedQtyValues.current);
                          console.log('All original suggested qtys by index:', originalSuggestedQtyValuesByIndex.current);
                          
                          effectiveSetQtyValues(prev => {
                            console.log('Previous state:', prev);
                            const newState = { ...prev, [index]: originalQtyValue };
                            console.log('New state:', newState);
                            return newState;
                          });
                          if (rawQtyInputValues.current[index] !== undefined) {
                            rawQtyInputValues.current[index] = undefined;
                            setQtyInputUpdateTrigger(prev => prev + 1);
                          }
                          // Remove from manually edited set when reset to suggestion
                          manuallyEditedIndices.current.delete(index);
                          // Clear any stored label-inventory suggestion usage for this product
                          if (productId) {
                            setLabelSuggestionUsage(prev => {
                              if (!prev || prev[productId] === undefined) return prev;
                              const next = { ...prev };
                              delete next[productId];
                              return next;
                            });
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: '4px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: isDarkMode ? '#9CA3AF' : '#6B7280',
                          cursor: 'pointer',
                          display: (() => {
                            const qtyValue = effectiveQtyValues[index];
                            // Check if value has been manually edited
                            const wasManuallyEdited = manuallyEditedIndices.current.has(index);
                            
                            const isValueSet = qtyValue !== undefined && qtyValue !== null && qtyValue !== '';
                            const currentQty = typeof qtyValue === 'number' 
                              ? qtyValue 
                              : isValueSet 
                                ? parseInt(qtyValue, 10) || 0
                                : 0;
                            const hasChanged = wasManuallyEdited && currentQty !== originalQtyValueForRow;
                          // Determine if we are currently using the value suggested by the
                          // Label Inventory warning (i.e., "Use Available" was clicked and
                          // the qty still matches that suggested value). In this case, the
                          // reset icon should be permanently visible.
                          const suggestedFromLabels = productId && labelSuggestionUsage
                            ? labelSuggestionUsage[productId]
                            : undefined;
                          const isUsingLabelSuggestion =
                            suggestedFromLabels !== undefined && currentQty === suggestedFromLabels;
                          const shouldShowReset = hasChanged && (hoveredQtyIndex === index || isUsingLabelSuggestion);
                          return shouldShowReset ? 'flex' : 'none';
                          })(),
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          outline: 'none',
                          zIndex: 1,
                          transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = isDarkMode ? '#D1D5DB' : '#374151';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                        }}
                        title="Reset to forecasted value"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 6C2 3.79 3.79 2 6 2C7.5 2 8.8 2.8 9.4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          <path d="M10 6C10 8.21 8.21 10 6 10C4.5 10 3.2 9.2 2.6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                          <path d="M9.4 4L11 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          <path d="M9.4 4L11 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        </svg>
                      </button>
                      {/* Quantity input - clean rounded rectangle. In non-table mode we allow free typing and only round to nearest increment on blur/Enter. */}
                      <input 
                        ref={(el) => {
                          if (el) qtyInputRefs.current[index] = el;
                        }}
                        type="text" 
                        value={(() => {
                          // While user is typing, show raw string so they can enter e.g. "120" without "1" rounding to 60
                          if (rawQtyInputValues.current[index] !== undefined) {
                            return rawQtyInputValues.current[index];
                          }
                          const qty = effectiveQtyValues[index];
                          const atDoiGoal = (row.suggestedQty ?? row.units_to_make ?? row.unitsToMake ?? -1) === 0 ||
                            (row.doiTotal || row.daysOfInventory || 0) >= (forecastRange || 120);
                          if (qty === undefined || qty === null || qty === '') {
                            return atDoiGoal ? '0' : '';
                          }
                          const numQty = typeof qty === 'number' ? qty : parseInt(qty, 10);
                          return isNaN(numQty) ? (atDoiGoal ? '0' : '') : numQty.toLocaleString();
                        })()}
                        onChange={(e) => { 
                          const inputValue = e.target.value.replace(/,/g, '').replace(/\D/g, '');
                          manuallyEditedIndices.current.add(index);
                          // Store raw string only; do not commit to parent until blur or Enter
                          rawQtyInputValues.current[index] = inputValue;
                          setQtyInputUpdateTrigger(prev => prev + 1);
                        }}
                        onBlur={(e) => {
                          const raw = (rawQtyInputValues.current[index] ?? e.target.value).toString().replace(/,/g, '').replace(/\D/g, '');
                          rawQtyInputValues.current[index] = undefined;
                          setQtyInputUpdateTrigger(prev => prev + 1);
                          if (raw === '') {
                            effectiveSetQtyValues(prev => ({ ...prev, [index]: '' }));
                            return;
                          }
                          const num = parseInt(raw, 10);
                          if (Number.isNaN(num) || num < 0) {
                            return;
                          }
                          // Don't round on blur - allow custom values to be entered
                          effectiveSetQtyValues(prev => ({ ...prev, [index]: num }));
                        }}
                        onFocus={(e) => {
                          e.target.select(); // Select all text when focused for easy replacement
                          e.stopPropagation();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.target.blur(); // Blur triggers onBlur which commits the value as-is (no rounding)
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()} 
                        style={{ 
                          width: '100%',
                          height: '100%',
                          borderRadius: '6px', 
                          border: 'none',
                          backgroundColor: isDarkMode ? '#2C3544' : '#F3F4F6', 
                          color: isDarkMode ? '#E5E7EB' : '#111827', 
                          textAlign: 'center', 
                          fontSize: '13px', 
                          fontWeight: 500, 
                          outline: 'none', 
                          fontFamily: 'sans-serif',
                          padding: '0 12px',
                          paddingLeft: '28px',
                          paddingRight: '28px',
                          boxSizing: 'border-box',
                          cursor: 'text',
                          position: 'relative',
                          zIndex: 2,
                          pointerEvents: 'auto'
                        }}
                        onWheel={(e) => e.target.blur()}
                      />
                      {/* Arrow buttons wrapper - tight gap between up/down */}
                      <div
                        style={{
                          position: 'absolute',
                          right: '4px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          display: hoveredQtyIndex === index ? 'flex' : 'none',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0px',
                          zIndex: 3,
                          pointerEvents: 'none',
                        }}
                      >
                        {/* Increment arrow (top) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (nonTableSelectedIndices.size > 1 && nonTableSelectedIndices.has(index)) {
                              nonTableSelectedIndices.forEach(selectedIndex => {
                                if (rawQtyInputValues.current[selectedIndex] !== undefined) {
                                  rawQtyInputValues.current[selectedIndex] = undefined;
                                }
                              });
                              setQtyInputUpdateTrigger(prev => prev + 1);
                              effectiveSetQtyValues(prev => {
                                const newValues = { ...prev };
                                nonTableSelectedIndices.forEach(selectedIndex => {
                                  const selectedRow = currentRows.find(r => r._originalIndex === selectedIndex);
                                  if (selectedRow) {
                                    // Get current value (from raw input if available, otherwise from effective values)
                                    const rawValue = rawQtyInputValues.current[selectedIndex];
                                    const currentQty = rawValue !== undefined 
                                      ? (typeof rawValue === 'number' ? rawValue : parseInt(rawValue, 10) || 0)
                                      : (newValues[selectedIndex] ?? 0);
                                    const numQty = typeof currentQty === 'number' ? currentQty : parseInt(currentQty, 10) || 0;
                                    // Round up to nearest case increment (don't add another increment)
                                    const increment = getQtyIncrement(selectedRow);
                                    const rounded = roundQtyUpToNearestCase(numQty, selectedRow);
                                    // If already at a case increment, add one increment; otherwise just round to nearest increment above
                                    const newValue = rounded === numQty ? rounded + increment : rounded;
                                    newValues[selectedIndex] = newValue;
                                    manuallyEditedIndices.current.add(selectedIndex);
                                  }
                                });
                                return newValues;
                              });
                            } else {
                              if (rawQtyInputValues.current[index] !== undefined) {
                                rawQtyInputValues.current[index] = undefined;
                              }
                              // Get current value (from raw input if available, otherwise from effective values)
                              const rawValue = rawQtyInputValues.current[index];
                              const currentQty = rawValue !== undefined 
                                ? (typeof rawValue === 'number' ? rawValue : parseInt(rawValue, 10) || 0)
                                : (effectiveQtyValues[index] ?? 0);
                              const numQty = typeof currentQty === 'number' ? currentQty : parseInt(currentQty, 10) || 0;
                              // Round up to nearest case increment (don't add another increment)
                              const increment = getQtyIncrement(row);
                              const rounded = roundQtyUpToNearestCase(numQty, row);
                              // If already at a case increment, add one increment; otherwise just round to nearest increment above
                              const newValue = rounded === numQty ? rounded + increment : rounded;
                              manuallyEditedIndices.current.add(index);
                              effectiveSetQtyValues(prev => ({ ...prev, [index]: newValue }));
                              setQtyInputUpdateTrigger(prev => prev + 1);
                            }
                          }}
                          style={{
                            width: '20px',
                            height: '10px',
                            border: 'none',
                            borderRadius: '2px',
                            backgroundColor: 'transparent',
                            color: isDarkMode ? '#9CA3AF' : '#6B7280',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            outline: 'none',
                            pointerEvents: 'auto',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = isDarkMode ? '#D1D5DB' : '#374151'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280'; }}
                          title="Increase quantity"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 4L6 1L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {/* Decrement arrow (bottom) - negative margin pulls it closer to top arrow */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (nonTableSelectedIndices.size > 1 && nonTableSelectedIndices.has(index)) {
                              nonTableSelectedIndices.forEach(selectedIndex => {
                                if (rawQtyInputValues.current[selectedIndex] !== undefined) {
                                  rawQtyInputValues.current[selectedIndex] = undefined;
                                }
                              });
                              setQtyInputUpdateTrigger(prev => prev + 1);
                              effectiveSetQtyValues(prev => {
                                const newValues = { ...prev };
                                nonTableSelectedIndices.forEach(selectedIndex => {
                                  const selectedRow = currentRows.find(r => r._originalIndex === selectedIndex);
                                  if (selectedRow) {
                                    // Get current value (from raw input if available, otherwise from effective values)
                                    const rawValue = rawQtyInputValues.current[selectedIndex];
                                    const currentQty = rawValue !== undefined 
                                      ? (typeof rawValue === 'number' ? rawValue : parseInt(rawValue, 10) || 0)
                                      : (newValues[selectedIndex] ?? 0);
                                    const numQty = typeof currentQty === 'number' ? currentQty : parseInt(currentQty, 10) || 0;
                                    if (numQty <= 0) return;
                                    // Round down to nearest case increment (don't subtract another increment)
                                    const increment = getQtyIncrement(selectedRow);
                                    const rounded = roundQtyDownToNearestCase(numQty, selectedRow);
                                    // If already at a case increment, subtract one increment; otherwise just round to nearest increment below
                                    const newValue = rounded === numQty ? Math.max(0, rounded - increment) : rounded;
                                    newValues[selectedIndex] = newValue;
                                    manuallyEditedIndices.current.add(selectedIndex);
                                  }
                                });
                                return newValues;
                              });
                            } else {
                              if (rawQtyInputValues.current[index] !== undefined) {
                                rawQtyInputValues.current[index] = undefined;
                              }
                              // Get current value (from raw input if available, otherwise from effective values)
                              const rawValue = rawQtyInputValues.current[index];
                              const currentQty = rawValue !== undefined 
                                ? (typeof rawValue === 'number' ? rawValue : parseInt(rawValue, 10) || 0)
                                : (effectiveQtyValues[index] ?? 0);
                              const numQty = typeof currentQty === 'number' ? currentQty : parseInt(currentQty, 10) || 0;
                              if (numQty <= 0) return;
                              // Round down to nearest case increment (don't subtract another increment)
                              const increment = getQtyIncrement(row);
                              const rounded = roundQtyDownToNearestCase(numQty, row);
                              // If already at a case increment, subtract one increment; otherwise just round to nearest increment below
                              const newValue = rounded === numQty ? Math.max(0, rounded - increment) : rounded;
                              manuallyEditedIndices.current.add(index);
                              effectiveSetQtyValues(prev => ({ ...prev, [index]: newValue }));
                              setQtyInputUpdateTrigger(prev => prev + 1);
                            }
                          }}
                          style={{
                            width: '20px',
                            height: '10px',
                            marginTop: '-3px',
                            border: 'none',
                            borderRadius: '2px',
                            backgroundColor: 'transparent',
                            color: isDarkMode ? '#9CA3AF' : '#6B7280',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            outline: 'none',
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 10,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = isDarkMode ? '#D1D5DB' : '#374151'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280'; }}
                          title="Decrease quantity"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 8L6 11L9 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    {/* Add button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddClick(row, index);
                      }} 
                      style={{ 
                        width: '64px',
                        height: '24px',
                        minHeight: '24px',
                        maxHeight: '24px',
                        boxSizing: 'border-box',
                        borderRadius: '4px', 
                        border: 'none', 
                        backgroundColor: effectiveAddedRows.has(row.id) ? '#10B981' : '#2563EB', 
                        color: '#FFFFFF', 
                        fontSize: '12px', 
                        fontWeight: 500, 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '4px 8px',
                        outline: 'none',
                        fontFamily: 'sans-serif',
                        position: 'relative',
                        zIndex: 5
                      }}
                    >
                      {!effectiveAddedRows.has(row.id) && (
                        <span style={{ fontSize: '14px', lineHeight: 1, pointerEvents: 'none' }}>+</span>
                      )}
                      <span style={{ pointerEvents: 'none' }}>{effectiveAddedRows.has(row.id) ? 'Added' : 'Add'}</span>
                    </button>
                    {/* Label warning tooltip - shown when warning icon is clicked (only in non-table mode) */}
                    {!tableMode && clickedQtyIndex === index && (() => {
                      const labelsAvailable = getAvailableLabelsForRow(row, index);
                      const labelsNeeded = effectiveQtyValues[index] ?? 0;
                      return labelsNeeded > labelsAvailable;
                    })() && (
                      <div
                        ref={(el) => {
                          if (el) popupRefs.current[index] = el;
                        }}
                        style={{
                          position: 'fixed',
                          backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                          borderRadius: '12px',
                          padding: '6px 8px',
                          width: '199px',
                          height: '76px',
                          boxShadow: isDarkMode 
                            ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
                            : '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                          zIndex: 9999,
                          border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
                          pointerEvents: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          boxSizing: 'border-box',
                          // No transition - instant updates for fast scrolling
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minHeight: 0 }}>
                          <h3 style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isDarkMode ? '#F9FAFB' : '#111827',
                            margin: 0,
                            height: '15px',
                            lineHeight: '15px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            Order exceeds available labels
                          </h3>
                          <p style={{
                            fontSize: '11px',
                            fontWeight: 400,
                            color: '#9CA3AF',
                            margin: 0,
                            lineHeight: '14px',
                            overflow: 'visible',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            Labels Available: {getAvailableLabelsForRow(row, index).toLocaleString()}
                          </p>
                        </div>
                        <button
                          style={{
                            width: '175px',
                            height: '23px',
                            backgroundColor: '#3B82F6',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            flexShrink: 0,
                            padding: 0,
                            alignSelf: 'center',
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#2563EB'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = '#3B82F6'}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const labelsAvailable = getAvailableLabelsForRow(row, index);
                            
                            // Use exact available quantity (no rounding)
                            // Mark as manually edited since user clicked "Use Available"
                            manuallyEditedIndices.current.add(index);
                            effectiveSetQtyValues(prev => ({
                              ...prev,
                              [index]: labelsAvailable
                            }));
                            // Remember that this product is now using the Label Inventory
                            // suggested value so we can show a permanent reset icon until
                            // the quantity is reset or changed away from this value.
                            const productId = row.id || row.asin || row.child_asin || row.childAsin;
                            if (productId) {
                              setLabelSuggestionUsage(prev => ({
                                ...(prev || {}),
                                [productId]: labelsAvailable
                              }));
                            }
                            
                            setTimeout(() => setClickedQtyIndex(null), 100);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          Use Available
                        </button>
                      </div>
                    )}
                  </div>

                  {/* DOI (DAYS) Column - fixed height so FBA bar doesn't move row; no overflow hidden so bars aren't cut; clickable to open row */}
                  <div 
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: '16px', marginLeft: '-275px', marginRight: '20px', position: 'relative', height: '100%', minHeight: 0, zIndex: 2 }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onProductClick && arrayIndex < currentRows.length) {
                          const clickedRow = currentRows[arrayIndex];
                          onProductClick(clickedRow, false);
                        }
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: (showFbaBar && showDoiBar) ? '1px' : 0,
                        position: 'relative',
                        minHeight: 0,
                        border: 'none',
                        background: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        font: 'inherit',
                        textAlign: 'inherit',
                      }}
                      aria-label={`Open ${row.title || row.product_name || 'product'} details`}
                    >
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: (showFbaBar && showDoiBar) ? '1px' : 0, position: 'relative', minHeight: 0, width: '100%' }}>
                      {/* FBA Available bar - shown when FBA button is selected; shows FBA vs needed to reach 30-day DOI goal */}
                      {showFbaBar && (() => {
                        const fbaDays = Number(row.doiFba ?? row.doi_fba ?? 0);
                        const baseWidth = 100;
                        const maxDaysForBar = 100;
                        const daysForWidth = Math.min(maxDaysForBar, fbaDays);
                        const fbaBarWidth = daysForWidth <= 30 ? baseWidth : Math.round(baseWidth * (daysForWidth / 30));
                        const fbaPct = fbaDays <= 30 ? (fbaDays / 30) * 100 : 100;
                        const showFbaWarning = fbaDays < 30;
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', minHeight: '20px', width: '450px', flexShrink: 0, boxSizing: 'border-box' }}>
                            {/* FBA bar: 30 days = 100px; extends up to 100 days */}
                            <div
                              style={{
                                position: 'absolute',
                                left: '-50px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: `${fbaBarWidth}px`,
                                height: '20px',
                                borderRadius: '6px',
                                overflow: 'visible',
                                boxShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.08)',
                              }}
                            >
                              <div style={{ display: 'flex', width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                                <BarFill widthPct={fbaPct} backgroundColor="#22C55E" durationSec={0.6} />
                                <div style={{ flex: 1, height: '100%', backgroundColor: '#DCE8DA', minWidth: 0 }} />
                              </div>
                              {showFbaWarning && (
                                <img
                                  src="/assets/zxcvb.png"
                                  alt="Low FBA"
                                  title="Low FBA days – below 30-day goal"
                                  style={{
                                    position: 'absolute',
                                    left: '4px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: '14px',
                                    height: '14px',
                                    objectFit: 'contain',
                                    zIndex: 2,
                                    pointerEvents: 'none',
                                  }}
                                />
                              )}
                            </div>
                            <div style={{ width: `${fbaBarWidth}px`, flexShrink: 0, marginLeft: '-20px' }} aria-hidden />
                            <span style={{ fontSize: '18px', fontWeight: 600, color: fbaDays >= 30 ? '#22C55E' : fbaDays >= 20 ? '#F97316' : '#EF4444', minWidth: 'fit-content', marginLeft: '-29px' }}>
                              {Math.round(fbaDays)}
                            </span>
                            {/* Placeholder so row width matches DOI row (pencil + gap) for alignment */}
                            <div style={{ width: '26px', flexShrink: 0 }} aria-hidden />
                          </div>
                        );
                      })()}
                      {/* When both toggles off: show only DOI number centered in column */}
                      {!showFbaBar && !showDoiBar && (
                        <span style={{ fontSize: '20px', fontWeight: 500, color: getDoiColor(displayDoi), height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 'fit-content', marginLeft: '-60px' }}>
                          {displayDoi}
                        </span>
                      )}
                      {/* DOI bar row: only render when showDoiBar (bar + number); marginTop when FBA bar also shown */}
                      {showDoiBar && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', position: 'relative', minHeight: '32px', width: '450px', flexShrink: 0, boxSizing: 'border-box', marginTop: showFbaBar ? '-6px' : 0 }}>
                      {/* Bar: fixed position so 2- vs 3-digit number doesn't move it */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-50px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '333px',
                          height: '20px',
                          borderRadius: '6px',
                          overflow: 'visible',
                          boxShadow: isDarkMode ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.1)',
                        }}
                        aria-hidden
                      >
                        <div style={{ display: 'flex', width: '100%', height: '100%', borderRadius: '6px', overflow: 'hidden' }}>
                          <BarFill
                            widthPct={Math.min(100, (Number(displayDoi) / 100) * 100)}
                            backgroundColor="#3399FF"
                            durationSec={0.6}
                          />
                          <div
                            style={{
                              flex: 1,
                              height: '100%',
                              backgroundColor: '#ADD8E6',
                              minWidth: 0,
                            }}
                          />
                        </div>
                        {Number(doiValue) < 30 && (
                          <img
                            src="/assets/zxcvb.png"
                            alt="At risk"
                            title="Low DOI – product at risk"
                            style={{
                              position: 'absolute',
                              left: '6px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: '14px',
                              height: '14px',
                              objectFit: 'contain',
                              zIndex: 2,
                              pointerEvents: 'none',
                            }}
                          />
                        )}
                      </div>
                      {/* Spacer: reserves bar width; -127px shifts number (3px right of -130) */}
                      <div style={{ width: '333px', flexShrink: 0, marginLeft: '-127px' }} aria-hidden />
                      <span style={{ fontSize: showFbaBar ? '18px' : '20px', fontWeight: 500, color: getDoiColor(displayDoi), height: '32px', display: 'flex', alignItems: 'center', gap: '2px', minWidth: 'fit-content', marginLeft: '-25px' }}>
                        {displayDoi}
                      </span>
                      {/* Spacer where pencil was - keeps DOI number position when pencil is in icon group */}
                      <div style={{ width: '16px', flexShrink: 0 }} aria-hidden />
                      </div>
                      )}
                    </div>
                    </button>
                    {/* Icon group: pencil + analyze, aligned at right and vertically centered (aligns with ngoos when FBA bar shown) */}
                    <div
                      style={{
                        position: 'absolute',
                        right: '-5px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src="/assets/pencil.png"
                        alt="Edit Settings"
                        className={shouldShowPencilPermanently ? '' : 'pencil-icon-hover'}
                        data-pencil-active={(hasCustomDoiSettings || hasCustomForecastSettings) ? 'true' : 'false'}
                        onClick={(e) => {
                          e.stopPropagation();
                          onProductClick(row, false, true);
                        }}
                        style={{
                          width: '16px',
                          height: '16px',
                          cursor: 'pointer',
                          opacity: shouldShowPencilPermanently ? 1 : 0,
                          transition: 'none',
                          filter: isPencilActive
                            ? 'brightness(0) saturate(100%) invert(47%) sepia(98%) saturate(2476%) hue-rotate(209deg) brightness(100%) contrast(101%)'
                            : 'brightness(0) saturate(100%) invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(90%)',
                          pointerEvents: shouldShowPencilPermanently ? 'auto' : 'none',
                        }}
                      />
                      <span
                        className="analyze-icon-hover"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onProductClick(row);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onProductClick(row);
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          opacity: 0,
                          pointerEvents: 'none',
                          transition: 'none',
                        }}
                        aria-label="Open N-GOOS"
                      >
                        <img
                          src="/assets/Banana.png"
                          alt="Open N-GOOS"
                          style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                          draggable={false}
                        />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
            {dataScrollMetrics.scrollHeight > dataScrollMetrics.clientHeight && (
              <div
                ref={nonTableThumbRef}
                className="non-table-thumb"
                role="scrollbar"
                aria-orientation="vertical"
                aria-valuenow={dataScrollMetrics.scrollTop}
                aria-valuemin={0}
                aria-valuemax={Math.max(0, dataScrollMetrics.scrollHeight - dataScrollMetrics.clientHeight)}
                onMouseDown={handleNonTableThumbMouseDown}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: 0,
                  width: '8px',
                  height: Math.max(20, dataScrollMetrics.scrollHeight > 0 ? (dataScrollMetrics.clientHeight / dataScrollMetrics.scrollHeight) * dataScrollMetrics.clientHeight : 0),
                  transform: dataScrollMetrics.clientHeight > 0 && dataScrollMetrics.scrollHeight > dataScrollMetrics.clientHeight
                    ? `translateY(${(dataScrollMetrics.scrollTop / (dataScrollMetrics.scrollHeight - dataScrollMetrics.clientHeight)) * (dataScrollMetrics.clientHeight - Math.max(20, (dataScrollMetrics.clientHeight / dataScrollMetrics.scrollHeight) * dataScrollMetrics.clientHeight))}px)`
                    : 'translateY(0)',
                  borderRadius: '5px',
                  backgroundColor: isDarkMode ? '#475569' : '#9CA3AF',
                  cursor: 'grab',
                  pointerEvents: showDataScrollThumb ? 'auto' : 'none',
                  zIndex: 10,
                  opacity: showDataScrollThumb ? 1 : 0,
                  transition: 'opacity 0.2s ease',
                }}
              />
            )}
          </div>
        </div>

      {/* Header Filter Dropdowns */}
      {Array.from(openFilterColumns).map((columnKey) => {
          if (!filterIconRefs.current[columnKey]) return null;
          return (
            <SortFormulasFilterDropdown
              key={columnKey}
              ref={(el) => {
                if (el) filterDropdownRefs.current[columnKey] = el;
                else delete filterDropdownRefs.current[columnKey];
              }}
              filterIconRef={filterIconRefs.current[columnKey]}
              columnKey={columnKey}
              availableValues={getColumnValues(columnKey)}
              currentFilter={columnFilters[columnKey] || {}}
              currentSort={getColumnSortOrder(columnKey)}
              onApply={(filterData) => handleApplyColumnFilter(columnKey, filterData)}
              onClose={() => {
                setOpenFilterColumns((prev) => {
                  const next = new Set(prev);
                  next.delete(columnKey);
                  return next;
                });
              }}
            />
          );
        })}

        {/* Filter Modals */}
        {['normal-0', 'normal-1', 'normal-2', 'normal-3', 'normal-4'].map((filterKey) => (
          openFilterIndex === filterKey && (
            <div
              key={filterKey}
              ref={(el) => {
                if (el) filterModalRefs.current[filterKey] = el;
              }}
              style={{
                position: 'fixed',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '16px',
                width: '228px',
                boxSizing: 'border-box',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: 10000,
                border: '1px solid #E5E7EB',
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sort by section */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>
                    Sort by:
                  </label>
                  <button
                    type="button"
                    onClick={() => setOpenFilterIndex(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#3B82F6',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Clear
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select field</option>
                    <option value="fbaAvailable">FBA Available</option>
                    <option value="totalInventory">Total Inventory</option>
                    <option value="forecast">Forecast</option>
                    <option value="sales7">7 Day Sales</option>
                    <option value="sales30">30 Day Sales</option>
                  </select>
                  
                  <select
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select order</option>
                    <option value="asc">A^Z Sort ascending (A to Z)</option>
                    <option value="desc">Z^A Sort descending (Z to A)</option>
                    <option value="numAsc">0^9 Sort ascending (0 to 9)</option>
                    <option value="numDesc">9^0 Sort descending (9 to 0)</option>
                  </select>
                </div>
              </div>

              {/* Filter by condition section */}
              <div style={{ marginBottom: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
                  Filter by condition:
                </label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <select
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#9CA3AF',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select field</option>
                    <option value="brand">Brand</option>
                    <option value="product">Product</option>
                    <option value="size">Size</option>
                    <option value="qty">Qty</option>
                  </select>
                  
                  <select
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#9CA3AF',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select condition</option>
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greaterThan">Greater than</option>
                    <option value="lessThan">Less than</option>
                  </select>
                  
                  <input
                    type="text"
                    placeholder="Value here..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                <button
                  type="button"
                  onClick={() => setOpenFilterIndex(null)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setOpenFilterIndex(null)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Apply
                </button>
              </div>
            </div>
          )
        ))}
        
        {/* Timeline (doi-goal) Filter Modal with new design */}
        {openFilterIndex === 'doi-goal' && (
          <TimelineFilterDropdown
            ref={(el) => {
              if (el) filterModalRefs.current['doi-goal'] = el;
            }}
            filterIconRef={filterRefs.current['doi-goal']}
            onClose={() => setOpenFilterIndex(null)}
            onApply={handleFilterApply}
            onReset={handleFilterReset}
            currentFilters={activeFilters}
          />
        )}
        
        {/* Non-table mode filter dropdown */}
        {nonTableOpenFilterColumn && nonTableFilterIconRefs.current[nonTableOpenFilterColumn] && (
          (nonTableOpenFilterColumn === 'product' || 
           nonTableOpenFilterColumn === 'fbaAvailable' || 
           nonTableOpenFilterColumn === 'unitsToMake' || 
           nonTableOpenFilterColumn === 'doiDays') ? (
            <ProductsFilterDropdown
              key={nonTableOpenFilterColumn}
              ref={(el) => {
                nonTableFilterDropdownRef.current = el;
              }}
              filterIconRef={nonTableFilterIconRefs.current[nonTableOpenFilterColumn]}
              columnKey={nonTableOpenFilterColumn}
              availableValues={getNonTableColumnValues(nonTableOpenFilterColumn)}
              currentFilter={nonTableFilters[nonTableOpenFilterColumn] || {}}
              currentSort={nonTableSortField === nonTableOpenFilterColumn ? nonTableSortOrder : ''}
              currentSortByFba={nonTableOpenFilterColumn === 'doiDays' && nonTableSortField === 'fbaAvailable' ? nonTableSortOrder : ''}
              onApply={(filterData) => handleNonTableApplyFilter(nonTableOpenFilterColumn, filterData)}
              onClose={() => setNonTableOpenFilterColumn(null)}
              account={account}
            />
          ) : (
            <SortFormulasFilterDropdown
              key={nonTableOpenFilterColumn}
              ref={(el) => {
                nonTableFilterDropdownRef.current = el;
              }}
              filterIconRef={nonTableFilterIconRefs.current[nonTableOpenFilterColumn]}
              columnKey={nonTableOpenFilterColumn}
              availableValues={getNonTableColumnValues(nonTableOpenFilterColumn)}
              currentFilter={nonTableFilters[nonTableOpenFilterColumn] || {}}
              currentSort={nonTableSortField === nonTableOpenFilterColumn ? nonTableSortOrder : ''}
              onApply={(filterData) => handleNonTableApplyFilter(nonTableOpenFilterColumn, filterData)}
              onClose={() => setNonTableOpenFilterColumn(null)}
            />
          )
        )}

        {!hideFooter && (
        <>
        {/* Footer */}
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            left: `calc(${sidebarWidth}px + (100vw - ${sidebarWidth}px) / 2 - 125px)`,
            transform: 'translateX(-50%)',
            width: 'fit-content',
            height: '65px',
            backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
            borderRadius: '32px',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            zIndex: 1000,
            transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div style={{ display: 'flex', gap: '48px', alignItems: 'center', flexShrink: 0 }}>
            {footerStatsVisibility.products && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>PRODUCTS</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalProducts}</span>
              </div>
            )}
            {footerStatsVisibility.palettes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>PALETTES</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalPalettes.toFixed(2)}</span>
              </div>
            )}
            {footerStatsVisibility.boxes && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>BOXES</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{Math.ceil(totalBoxes).toLocaleString()}</span>
              </div>
            )}
            {footerStatsVisibility.units && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>UNITS</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalUnits.toLocaleString()}</span>
              </div>
            )}
            {footerStatsVisibility.timeHours && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center', whiteSpace: 'nowrap' }}>TIME (HRS)</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalTimeHours.toFixed(2)}</span>
              </div>
            )}
            {footerStatsVisibility.weightLbs && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center', whiteSpace: 'nowrap' }}>WEIGHT (LBS)</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{Math.round(totalWeightLbs).toLocaleString()}</span>
              </div>
            )}
            {footerStatsVisibility.formulas && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>FORMULAS</span>
                <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalFormulas}</span>
              </div>
            )}
          </div>
          {(onClear || onExport) && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  style={{
                    height: '31px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Clear
                </button>
              )}
              {onExport && (
                <>
                  <button
                    type="button"
                    onClick={onExport}
                    style={{
                      height: '31px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: (addedRows && addedRows.size > 0) ? '#3B82F6' : '#9CA3AF',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: (addedRows && addedRows.size > 0) ? 'pointer' : 'not-allowed',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      if (addedRows && addedRows.size > 0) {
                        e.currentTarget.style.backgroundColor = '#2563EB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (addedRows && addedRows.size > 0) {
                        e.currentTarget.style.backgroundColor = '#3B82F6';
                      } else {
                        e.currentTarget.style.backgroundColor = '#9CA3AF';
                      }
                    }}
                  >
                    Export for Upload
                  </button>
                  <button
                    type="button"
                    aria-label="Shipment stats"
                    data-shipment-stats-trigger
                    onClick={() => setShipmentStatsMenuOpen((prev) => !prev)}
                    style={{
                      padding: '4px',
                      border: 'none',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      color: shipmentStatsMenuOpen ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                      fontSize: '1.25rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!shipmentStatsMenuOpen) e.currentTarget.style.color = isDarkMode ? '#D1D5DB' : '#4B5563';
                    }}
                    onMouseLeave={(e) => {
                      if (!shipmentStatsMenuOpen) e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                    }}
                  >
                    ⋮
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Shipment Stats popup - above footer */}
        {shipmentStatsMenuOpen && (
          <div
            ref={shipmentStatsPopupRef}
            style={{
              position: 'fixed',
              bottom: '96px',
              left: `calc(${sidebarWidth}px + (100vw - ${sidebarWidth}px) / 2 - 125px + 350px)`,
              transform: 'translateX(-50%)',
              width: '204px',
              minHeight: '264px',
              maxHeight: '80vh',
              backgroundColor: isDarkMode ? '#1F2937' : '#374151',
              borderRadius: '8px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              border: `1px solid ${isDarkMode ? '#374151' : '#4B5563'}`,
              zIndex: 1001,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderBottom: `1px solid ${isDarkMode ? '#374151' : '#4B5563'}` }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>Shipment Stats</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShipmentStatsMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L4 12M4 4l8 8" /></svg>
              </button>
            </div>
            <div style={{ padding: '8px', gap: '2px', display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1, minHeight: 0 }}>
              {[
                { key: 'products', label: 'Products' },
                { key: 'palettes', label: 'Palettes' },
                { key: 'boxes', label: 'Boxes' },
                { key: 'weightLbs', label: 'Weight (lbs)' },
                { key: 'units', label: 'Units' },
                { key: 'formulas', label: 'Formulas' },
                { key: 'timeHours', label: 'Time (hrs)' },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    padding: '6px 8px',
                  }}
                >
                  <span style={{ color: '#9CA3AF', cursor: 'grab', display: 'flex' }} aria-hidden>≡</span>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={!!footerStatsVisibility[key]}
                      onChange={() => setFooterStatsVisibility((prev) => ({ ...prev, [key]: !prev[key] }))}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0, margin: 0, pointerEvents: 'none' }}
                      aria-hidden
                    />
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        border: '1px solid #6B7280',
                        backgroundColor: footerStatsVisibility[key] ? '#3B82F6' : '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {footerStatsVisibility[key] && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 4L4 7L9 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                  </label>
                    <span style={{ flex: 1, fontSize: '13px', color: '#FFFFFF' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
        )}
        {/* Fixed position tooltips to avoid clipping by sticky header */}
        {inventoryTooltipPosition.visible && createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${inventoryTooltipPosition.top}px`,
              left: `${inventoryTooltipPosition.left}px`,
              transform: 'translateX(-50%)',
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              color: isDarkMode ? '#E5E7EB' : '#111827',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
              zIndex: 100000,
              pointerEvents: 'none',
            }}
          >
            {inventoryTooltipPosition.label}
          </div>,
          document.body
        )}
        {labelsTooltipPosition.visible && createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${labelsTooltipPosition.top}px`,
              left: `${labelsTooltipPosition.left}px`,
              transform: 'translateX(-50%)',
              backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
              color: isDarkMode ? '#E5E7EB' : '#111827',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
              zIndex: 100000,
              pointerEvents: 'none',
            }}
          >
            Labels Available: {labelsTooltipPosition.labelsAvailable.toLocaleString()}
          </div>,
          document.body
        )}
      </>
    );
  }

  // Table mode view
  return (
    <>
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
        .new-shipment-table-scroll {
          scrollbar-width: thin !important;
          scrollbar-color: ${isDarkMode ? '#64748B #1F2937' : '#6B7280 #F3F4F6'} !important;
          overflow-y: auto !important;
        }
        /* Always show vertical scrollbar when content overflows */
        .new-shipment-table-scroll::-webkit-scrollbar {
          width: 12px !important;
          height: 4px;
          -webkit-appearance: none;
          display: block !important;
        }
        .new-shipment-table-scroll::-webkit-scrollbar:vertical {
          width: 12px !important;
          display: block !important;
        }
        .new-shipment-table-scroll::-webkit-scrollbar-track {
          background: ${isDarkMode ? '#1F2937' : '#F3F4F6'} !important;
          border-radius: 6px;
          display: block !important;
          visibility: visible !important;
          -webkit-box-shadow: inset 0 0 2px ${isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'} !important;
        }
        .new-shipment-table-scroll::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#64748B' : '#6B7280'} !important;
          border-radius: 6px;
          border: 2px solid ${isDarkMode ? '#1F2937' : '#F3F4F6'} !important;
          min-height: 30px;
          cursor: pointer;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .new-shipment-table-scroll::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#94A3B8' : '#4B5563'} !important;
        }
        /* Make horizontal scrollbar more visible when scrolling or hovering */
        .new-shipment-table-scroll.scrolling-horizontal::-webkit-scrollbar,
        .new-shipment-table-scroll:hover::-webkit-scrollbar {
          height: 8px !important;
        }
        .new-shipment-table-scroll.scrolling-horizontal::-webkit-scrollbar-thumb,
        .new-shipment-table-scroll:hover::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#4B5563' : '#9CA3AF'} !important;
        }
        .new-shipment-table-scroll.scrolling-horizontal::-webkit-scrollbar-thumb:hover,
        .new-shipment-table-scroll:hover::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#94A3B8' : '#6B7280'} !important;
        }
        /* Table mode: border on table container only */
        .new-shipment-table-scroll table {
          border: 1px solid ${isDarkMode ? '#334155' : '#E2E8F0'} !important;
          border-radius: 8px !important;
        }
        /* Table mode: left/right separator lines 20px shorter (inset from top and bottom) */
        .new-shipment-table-scroll {
          border-left: none !important;
          border-right: none !important;
        }
        .new-shipment-table-scroll::before {
          content: '';
          position: absolute;
          left: 0;
          top: 20px;
          bottom: 20px;
          width: 1px;
          background: ${isDarkMode ? '#334155' : '#E2E8F0'};
          pointer-events: none;
          z-index: 1;
        }
        .new-shipment-table-scroll::after {
          content: '';
          position: absolute;
          right: 0;
          top: 20px;
          bottom: 20px;
          width: 1px;
          background: ${isDarkMode ? '#334155' : '#E2E8F0'};
          pointer-events: none;
          z-index: 1;
        }
        /* Table mode: header row +10px height (68px total) */
        .new-shipment-table-scroll thead tr,
        .new-shipment-table-scroll thead th {
          height: 68px !important;
          max-height: 68px !important;
        }
        /* Checkbox checked: blue + white check (table mode) */
        .new-shipment-checkbox { background-color: ${isDarkMode ? '#1A2235' : '#FFFFFF'} !important; }
        .new-shipment-checkbox:checked {
          background-color: #3B82F6 !important;
          border-color: #3B82F6 !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2710%27 height=%278%27 viewBox=%270 0 10 8%27 fill=%27none%27%3E%3Cpath d=%27M1 4L4 7L9 1%27 stroke=%27white%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
          background-size: 10px 8px !important;
        }
        /* Custom styled tooltip for inventory warning icons */
        .inventory-warning-icon {
          position: relative;
        }
        .inventory-warning-icon .inventory-warning-tooltip {
          display: none !important;
          background-color: #1F2937;
          color: #FFFFFF;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          pointer-events: none;
          z-index: 100000;
        }
        .inventory-warning-icon .inventory-warning-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 5px;
          border-style: solid;
          border-color: #1F2937 transparent transparent transparent;
        }
        .inventory-warning-icon:hover .inventory-warning-tooltip {
          display: flex !important;
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
        <label style={{ fontSize: '0.85rem', color: isDarkMode ? '#D1D5DB' : '#4B5563' }}>Show:</label>
        <select
          value={selectionFilter}
          onChange={(e) => setSelectionFilter(e.target.value)}
          style={{
            height: '32px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            backgroundColor: isDarkMode ? '#111827' : '#FFFFFF',
            color: isDarkMode ? '#F9FAFB' : '#111827',
            padding: '6px 10px',
            fontSize: '0.85rem',
          }}
        >
          <option value="all">All</option>
          <option value="checked">Checked</option>
          <option value="unchecked">Unchecked</option>
        </select>
      </div>
      {/* Outer wrapper - dark background in dark mode to match design */}
      <div
        style={{
          marginTop: '1.25rem',
          position: 'relative',
          paddingBottom: hideFooter ? '0' : '97px',
          backgroundColor: isDarkMode ? '#1A2235' : 'transparent',
          borderRadius: isDarkMode ? '12px' : 0,
        }}
      >
        <div
        ref={tableContainerRef}
        className={`new-shipment-table-scroll ${isScrollingHorizontally ? 'scrolling-horizontal' : ''}`}
        style={{ 
          overflowX: 'auto', 
          overflowY: 'auto',
          width: '100%',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
          minHeight: '400px',
          maxHeight: 'calc(100vh - 280px)',
          display: 'block',
          border: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
          borderRadius: '8px',
          boxShadow: 'none',
          backgroundColor: isDarkMode ? '#1A2235' : undefined,
        }}
      >
        <table
          data-add-products-table="true"
          style={{
            width: 'max-content',
            minWidth: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
            tableLayout: 'auto',
            display: 'table',
            position: 'relative',
            backgroundColor: isDarkMode ? '#1A2235' : undefined,
            border: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
            borderRadius: '8px',
          }}
        >
          <thead className={themeClasses.headerBg} style={{
            position: '-webkit-sticky',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
            display: 'table-header-group',
            borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
          }}>
            <tr style={{ 
              height: '58px', 
              maxHeight: '58px',
              position: 'sticky',
              top: 0,
              zIndex: 1000,
              backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
            }}>
              {/* Add Products table columns - dark theme to match design */}
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                width: '40px', 
                minWidth: '40px',
                maxWidth: '40px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                textAlign: 'center',
                position: 'sticky',
                left: 0,
                top: 0,
                zIndex: 1020,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '100%', minHeight: '58px', margin: 0 }}>
                  <input 
                    type="checkbox" 
                  style={{
                    cursor: 'pointer',
                    width: '16px',
                    height: '16px',
                    accentColor: '#3B82F6',
                    border: '1px solid #94A3B8',
                    borderRadius: '4px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    pointerEvents: 'auto',
                  }}
                  className="new-shipment-checkbox"
                  checked={allSelected}
                    ref={selectAllCheckboxRef}
                    onChange={handleSelectAll}
                  />
                </label>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'left',
                position: 'sticky',
                left: '40px',
                top: 0,
                zIndex: 1020,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '150px',
                minWidth: '150px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>BRAND</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                position: 'sticky',
                left: '190px',
                top: 0,
                zIndex: 1020,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '320px',
                minWidth: '320px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>PRODUCT</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 1rem', 
                textAlign: 'center',
                position: 'sticky',
                left: '510px',
                top: 0,
                zIndex: 1020,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '180px',
                minWidth: '180px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>UNITS TO MAKE</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '120px',
                minWidth: '120px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>VARIATION 1</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '120px',
                minWidth: '120px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>VARIATION 2</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '130px',
                minWidth: '130px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>PARENT ASIN</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '130px',
                minWidth: '130px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>CHILD ASIN</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '100px',
                minWidth: '100px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>IN</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '110px',
                minWidth: '110px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>INVENTORY</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '100px',
                minWidth: '100px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>TOTAL DOI</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '130px',
                minWidth: '130px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>FBA AVAILABLE DOI</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '120px',
                minWidth: '120px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>VELOCITY TREND</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '143px',
                minWidth: '143px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>BOX INVENTORY</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '150px',
                minWidth: '150px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>7 DAY UNITS ORDERED</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '150px',
                minWidth: '150px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>30 DAY UNITS ORDERED</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '150px',
                minWidth: '150px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>90 DAY UNITS ORDERED</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '100px',
                minWidth: '100px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>FBA TOTAL</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '120px',
                minWidth: '120px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>FBA AVAILABLE</span>
              </th>
              <th style={{ 
                borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                padding: '0 0.75rem', 
                textAlign: 'center',
                top: 0,
                zIndex: 1010,
                backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                width: '100px',
                minWidth: '100px',
                height: '58px',
                maxHeight: '58px',
                boxSizing: 'border-box',
                fontFamily: 'Inter, sans-serif',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'uppercase',
                color: '#64758B',
              }}>
                <span>AWD TOTAL</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row) => {
              const index = row._originalIndex;
              const rowSeparatorBorder = { borderBottom: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0' };
              return (
              <tr key={`${row.id}-${index}`} style={{ 
                height: '58px', 
                maxHeight: '58px',
                display: 'table-row',
                position: 'relative',
                backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
              }}>
                {/* Checkbox - square with white border in dark mode */}
                <td style={{ 
                  ...rowSeparatorBorder,
                  padding: '0 0.75rem', 
                  textAlign: 'center',
                  position: 'sticky',
                  left: 0,
                  zIndex: 5,
                  backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
                  width: '40px',
                  minWidth: '40px',
                  maxWidth: '40px',
                  height: '58px',
                  verticalAlign: 'middle',
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', width: '100%', height: '100%', minHeight: '58px', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      style={{
                        cursor: 'pointer',
                        width: '16px',
                        height: '16px',
                        accentColor: '#3B82F6',
                        border: '1px solid #94A3B8',
                        borderRadius: '4px',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        pointerEvents: 'auto',
                      }}
                      className="new-shipment-checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={(e) => handleRowSelect(row.id, e)}
                    />
                  </label>
                </td>
                <td style={{ 
                  ...rowSeparatorBorder,
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  position: 'sticky',
                  left: '40px',
                  zIndex: 5,
                  backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
                  width: '150px',
                  minWidth: '150px',
                  maxWidth: '150px',
                  height: '58px',
                  verticalAlign: 'middle',
                  color: isDarkMode ? '#FFFFFF' : '#1E293B',
                }}>
                  {row.brand}
                </td>
                <td style={{ 
                  ...rowSeparatorBorder,
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  position: 'sticky',
                  left: '190px',
                  zIndex: 5,
                  backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
                  height: '58px',
                  verticalAlign: 'middle',
                  width: '320px',
                  minWidth: '320px',
                  maxWidth: '320px',
                }}>
                  <button
                    type="button"
                    onClick={() => onProductClick && onProductClick(row)}
                    style={{ 
                      color: '#3B82F6', 
                      textDecoration: 'underline', 
                      cursor: 'pointer', 
                      background: 'none', 
                      border: 'none', 
                      padding: 0, 
                      fontSize: '0.875rem',
                      textAlign: 'left',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                      display: 'block',
                    }}
                  >
                    {(row.product || '').length > 80 ? `${(row.product || '').substring(0, 80)}...` : (row.product || '')}
                  </button>
                </td>
                {/* UNITS TO MAKE: dark input + blue Add button */}
                <td style={{ 
                  ...rowSeparatorBorder,
                  padding: '0.5rem 0.75rem', 
                  textAlign: 'center',
                  width: '180px',
                  minWidth: '180px',
                  height: '58px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  position: 'sticky',
                  left: '510px',
                  zIndex: 5,
                  backgroundColor: isDarkMode ? '#1A2235' : '#FFFFFF',
                }}>
                  <div style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '4px', width: '100%', justifyContent: 'center' }}>
                    <input
                      type="text"
                      inputMode="numeric"
                      ref={(el) => { if (el) qtyInputRefs.current[index] = el; }}
                      data-row-index={index}
                      value={rawQtyInputValues.current[index] !== undefined ? rawQtyInputValues.current[index] : (effectiveQtyValues[index] !== undefined && effectiveQtyValues[index] !== null && effectiveQtyValues[index] !== '' ? Number(effectiveQtyValues[index]).toLocaleString() : '')}
                      onChange={(e) => {
                        const v = e.target.value.replace(/,/g, '');
                        if (v === '' || /^\d+$/.test(v)) {
                          rawQtyInputValues.current[index] = v;
                          setQtyInputUpdateTrigger(t => t + 1);
                          if (v !== '') manuallyEditedIndices.current.add(index);
                        }
                      }}
                      onBlur={(e) => {
                        const v = (e.target.value || '').replace(/,/g, '');
                        rawQtyInputValues.current[index] = undefined;
                        if (v === '') effectiveSetQtyValues(prev => ({ ...prev, [index]: '' }));
                        else {
                          const num = parseInt(v, 10);
                          if (!isNaN(num) && num >= 0) effectiveSetQtyValues(prev => ({ ...prev, [index]: num }));
                        }
                        setQtyInputUpdateTrigger(t => t + 1);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '107px',
                        minWidth: '107px',
                        height: '34px',
                        padding: '8px 6px',
                        borderRadius: '8px',
                        border: isDarkMode ? '1px solid #334155' : '1px solid #E2E8F0',
                        outline: 'none',
                        backgroundColor: isDarkMode ? '#1A2235' : '#F8FAFC',
                        color: isDarkMode ? '#FFFFFF' : '#0F172A',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textAlign: 'center',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleAddClick(row, index); }}
                      onMouseEnter={() => setHoveredAddIndex(index)}
                      onMouseLeave={() => setHoveredAddIndex(null)}
                      style={{
                        display: 'inline-flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        width: '64px',
                        minWidth: '64px',
                        height: '24px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#3B82F6',
                        color: '#FFFFFF',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    >
                      <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Add
                    </button>
                  </div>
                </td>
                <td style={{ 
                  ...rowSeparatorBorder,
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  width: '120px',
                  minWidth: '120px',
                  height: '58px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  color: isDarkMode ? '#FFFFFF' : '#334155',
                }}>
                  {row.variation1 || row.variation_1 || (Array.isArray(row.variations) && row.variations[0]) || '-'}
                </td>
                <td style={{ 
                  ...rowSeparatorBorder,
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  width: '120px',
                  minWidth: '120px',
                  height: '58px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  color: isDarkMode ? '#FFFFFF' : '#334155',
                }}>
                  {row.variation2 || row.variation_2 || (Array.isArray(row.variations) && row.variations[1]) || '-'}
                </td>
                <td style={{ 
                  ...rowSeparatorBorder,
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  width: '130px',
                  minWidth: '130px',
                  height: '58px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  color: isDarkMode ? '#FFFFFF' : '#334155',
                }}>
                  {row.parent_asin || row.parentAsin || '-'}
                </td>
                <td style={{ 
                  ...rowSeparatorBorder,
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  width: '130px',
                  minWidth: '130px',
                  height: '58px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  color: isDarkMode ? '#FFFFFF' : '#334155',
                }}>
                  {row.child_asin || row.childAsin || row.asin || '-'}
                </td>
                <td style={{ 
                  ...rowSeparatorBorder,
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  width: '100px',
                  minWidth: '100px',
                  height: '58px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  color: isDarkMode ? '#FFFFFF' : '#334155',
                }}>
                  {row.fbaAvailable ?? row.totalInventory ?? row.doiTotal ?? '-'}
                </td>
                <td style={{ ...rowSeparatorBorder, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: '110px', minWidth: '110px', height: '58px', verticalAlign: 'middle', boxSizing: 'border-box', color: isDarkMode ? '#FFFFFF' : '#334155' }}>
                  {row.totalInventory ?? row.label_inventory ?? row.labels_available ?? '-'}
                </td>
                <td style={{ 
                  ...rowSeparatorBorder,
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  width: '100px',
                  minWidth: '100px',
                  height: '58px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  color: isDarkMode ? '#3B82F6' : '#2563EB',
                  fontWeight: 500,
                }}>
                  {(() => {
                    const v = row.doiTotal ?? row.daysOfInventory ?? row.totalInventory;
                    if (v === undefined || v === null || v === '') return '-';
                    return typeof v === 'number' ? v.toLocaleString() : String(v);
                  })()}
                </td>
                <td style={{ 
                  ...rowSeparatorBorder,
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  width: '130px',
                  minWidth: '130px',
                  height: '58px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  color: isDarkMode ? '#A78BFA' : '#7C3AED',
                  fontWeight: 500,
                }}>
                  {(() => {
                    const v = row.doiFba ?? row.fbaAvailable ?? row.doiFbaAvailable;
                    if (v === undefined || v === null || v === '') return '-';
                    return typeof v === 'number' ? v.toLocaleString() : String(v);
                  })()}
                </td>
                <td style={{ ...rowSeparatorBorder, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: '120px', minWidth: '120px', height: '58px', verticalAlign: 'middle', boxSizing: 'border-box', color: isDarkMode ? '#FFFFFF' : '#334155' }}>
                  {row.velocityTrend ?? row.velocity_trend ?? '-'}
                </td>
                <td style={{ 
                  ...rowSeparatorBorder,
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  textAlign: 'center',
                  width: '143px',
                  minWidth: '143px',
                  height: '58px',
                  verticalAlign: 'middle',
                  boxSizing: 'border-box',
                  color: isDarkMode ? '#FFFFFF' : '#334155',
                }}>
                  {row.boxInventory || row.box_inventory || 0}
                </td>
                <td style={{ ...rowSeparatorBorder, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: '150px', minWidth: '150px', height: '58px', verticalAlign: 'middle', boxSizing: 'border-box', color: isDarkMode ? '#FFFFFF' : '#334155' }}>
                  {row.sales7Day ?? row.sales_7_day ?? row.unitsOrdered7 ?? row.units_ordered_7 ?? '-'}
                </td>
                <td style={{ ...rowSeparatorBorder, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: '150px', minWidth: '150px', height: '58px', verticalAlign: 'middle', boxSizing: 'border-box', color: isDarkMode ? '#FFFFFF' : '#334155' }}>
                  {row.sales30Day ?? row.sales_30_day ?? row.unitsOrdered30 ?? row.units_ordered_30 ?? '-'}
                </td>
                <td style={{ ...rowSeparatorBorder, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: '150px', minWidth: '150px', height: '58px', verticalAlign: 'middle', boxSizing: 'border-box', color: isDarkMode ? '#FFFFFF' : '#334155' }}>
                  {row.sales90Day ?? row.sales_90_day ?? row.unitsOrdered90 ?? row.units_ordered_90 ?? '-'}
                </td>
                <td style={{ ...rowSeparatorBorder, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: '100px', minWidth: '100px', height: '58px', verticalAlign: 'middle', boxSizing: 'border-box', color: isDarkMode ? '#FFFFFF' : '#334155' }}>
                  {row.fbaTotal ?? row.fba_total ?? '-'}
                </td>
                <td style={{ ...rowSeparatorBorder, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: '120px', minWidth: '120px', height: '58px', verticalAlign: 'middle', boxSizing: 'border-box', color: isDarkMode ? '#FFFFFF' : '#334155' }}>
                  {row.fbaAvailable ?? row.fba_available ?? '-'}
                </td>
                <td style={{ ...rowSeparatorBorder, padding: '0.5rem 0.75rem', fontSize: '0.875rem', textAlign: 'center', width: '100px', minWidth: '100px', height: '58px', verticalAlign: 'middle', boxSizing: 'border-box', color: isDarkMode ? '#FFFFFF' : '#334155' }}>
                  {row.awdTotal ?? row.awd_total ?? '-'}
                </td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>
      {/* End of table container div */}
      </div>
      {/* End of outer scrollable wrapper */}
    
      {/* Timeline Filter Modal for Table Mode (DOI Goal) */}
    {openFilterIndex === 'doi-goal' && (
      <TimelineFilterDropdown
        ref={(el) => {
          if (el) filterModalRefs.current['doi-goal'] = el;
        }}
        filterIconRef={filterRefs.current['doi-goal']}
        onClose={() => setOpenFilterIndex(null)}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
        currentFilters={activeFilters}
      />
    )}

    {/* Column Filter Dropdowns for all columns */}
    {Array.from(openFilterColumns).map((columnKey) => {
      if (!filterIconRefs.current[columnKey]) return null;
      return (
        <SortFormulasFilterDropdown
          key={columnKey}
          ref={(el) => {
            if (el) filterDropdownRefs.current[columnKey] = el;
            else delete filterDropdownRefs.current[columnKey];
          }}
          filterIconRef={filterIconRefs.current[columnKey]}
          columnKey={columnKey}
          availableValues={getColumnValues(columnKey)}
          currentFilter={columnFilters[columnKey] || {}}
          currentSort={getColumnSortOrder(columnKey)}
          onApply={(filterData) => handleApplyColumnFilter(columnKey, filterData)}
          onClose={() => {
            setOpenFilterColumns((prev) => {
              const next = new Set(prev);
              next.delete(columnKey);
              return next;
            });
          }}
        />
      );
    })}

      {!hideFooter && (
      <>
      {/* Footer */}
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          left: `calc(${sidebarWidth}px + (100vw - ${sidebarWidth}px) / 2 - 125px)`,
          transform: 'translateX(-50%)',
          width: 'fit-content',
          minWidth: '1014px',
          height: '65px',
          backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.85)' : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${isDarkMode ? '#374151' : '#E5E7EB'}`,
          borderRadius: '32px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '32px',
          zIndex: 1000,
          transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div style={{ display: 'flex', gap: '48px', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          {footerStatsVisibility.products && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>PRODUCTS</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalProducts}</span>
            </div>
          )}
          {footerStatsVisibility.palettes && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>PALETTES</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalPalettes.toFixed(2)}</span>
            </div>
          )}
          {footerStatsVisibility.boxes && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>BOXES</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{Math.ceil(totalBoxes).toLocaleString()}</span>
            </div>
          )}
          {footerStatsVisibility.units && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>UNITS</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalUnits.toLocaleString()}</span>
            </div>
          )}
          {footerStatsVisibility.timeHours && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center', whiteSpace: 'nowrap' }}>TIME (HRS)</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalTimeHours.toFixed(2)}</span>
            </div>
          )}
          {footerStatsVisibility.weightLbs && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center', whiteSpace: 'nowrap' }}>WEIGHT (LBS)</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{Math.round(totalWeightLbs).toLocaleString()}</span>
            </div>
          )}
          {footerStatsVisibility.formulas && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 400, color: isDarkMode ? '#9CA3AF' : '#9CA3AF', textAlign: 'center' }}>FORMULAS</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: isDarkMode ? '#FFFFFF' : '#000000', textAlign: 'center' }}>{totalFormulas}</span>
            </div>
          )}
        </div>
        {(onClear || onExport) && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                style={{
                  height: '31px',
                  padding: '0 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Clear
              </button>
            )}
            {onExport && (
              <>
                <button
                  type="button"
                  onClick={onExport}
                  style={{
                    height: '31px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: (addedRows && addedRows.size > 0) ? '#3B82F6' : '#9CA3AF',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: (addedRows && addedRows.size > 0) ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => {
                    if (addedRows && addedRows.size > 0) {
                      e.currentTarget.style.backgroundColor = '#2563EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (addedRows && addedRows.size > 0) {
                      e.currentTarget.style.backgroundColor = '#3B82F6';
                    } else {
                      e.currentTarget.style.backgroundColor = '#9CA3AF';
                    }
                  }}
                >
                  Export for Upload
                </button>
                <button
                  type="button"
                  aria-label="Shipment stats"
                  data-shipment-stats-trigger
                  onClick={() => setShipmentStatsMenuOpen((prev) => !prev)}
                  style={{
                    padding: '4px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    color: shipmentStatsMenuOpen ? '#3B82F6' : (isDarkMode ? '#9CA3AF' : '#6B7280'),
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!shipmentStatsMenuOpen) e.currentTarget.style.color = isDarkMode ? '#D1D5DB' : '#4B5563';
                  }}
                  onMouseLeave={(e) => {
                    if (!shipmentStatsMenuOpen) e.currentTarget.style.color = isDarkMode ? '#9CA3AF' : '#6B7280';
                  }}
                >
                  ⋮
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Shipment Stats popup - above footer (table mode) */}
      {shipmentStatsMenuOpen && (
        <div
          ref={shipmentStatsPopupRef}
          style={{
            position: 'fixed',
            bottom: '96px',
            left: `calc(${sidebarWidth}px + (100vw - ${sidebarWidth}px) / 2 - 125px + 350px)`,
            transform: 'translateX(-50%)',
            width: '204px',
            minHeight: '264px',
            maxHeight: '80vh',
            backgroundColor: isDarkMode ? '#1F2937' : '#374151',
            borderRadius: '8px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            border: `1px solid ${isDarkMode ? '#374151' : '#4B5563'}`,
            zIndex: 1001,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderBottom: `1px solid ${isDarkMode ? '#374151' : '#4B5563'}` }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF' }}>Shipment Stats</span>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShipmentStatsMenuOpen(false)}
              style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L4 12M4 4l8 8" /></svg>
            </button>
          </div>
          <div style={{ padding: '8px', gap: '2px', display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {[
              { key: 'products', label: 'Products' },
              { key: 'palettes', label: 'Palettes' },
              { key: 'boxes', label: 'Boxes' },
              { key: 'weightLbs', label: 'Weight (lbs)' },
              { key: 'units', label: 'Units' },
              { key: 'formulas', label: 'Formulas' },
              { key: 'timeHours', label: 'Time (hrs)' },
            ].map(({ key, label }) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '6px 8px',
                }}
              >
                <span style={{ color: '#9CA3AF', cursor: 'grab', display: 'flex' }} aria-hidden>≡</span>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={!!footerStatsVisibility[key]}
                    onChange={() => setFooterStatsVisibility((prev) => ({ ...prev, [key]: !prev[key] }))}
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0, margin: 0, pointerEvents: 'none' }}
                    aria-hidden
                  />
                  <span
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      border: '1px solid #6B7280',
                      backgroundColor: footerStatsVisibility[key] ? '#3B82F6' : '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {footerStatsVisibility[key] && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 4L4 7L9 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                </label>
                <span style={{ flex: 1, fontSize: '13px', color: '#FFFFFF' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      </>
      )}
    </>
  );
};

// Timeline Filter Dropdown Component
const TimelineFilterDropdown = React.forwardRef(({ filterIconRef, onClose, onApply, onReset, currentFilters = {} }, ref) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [popularFilter, setPopularFilter] = useState(currentFilters.popularFilter || '');
  const [isPopularFilterOpen, setIsPopularFilterOpen] = useState(false);
  const [sortField, setSortField] = useState(currentFilters.sortField || '');
  const [isSortFieldOpen, setIsSortFieldOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState(currentFilters.sortOrder || '');
  const [isFilterConditionExpanded, setIsFilterConditionExpanded] = useState(false);
  const [filterField, setFilterField] = useState(currentFilters.filterField || '');
  const [filterCondition, setFilterCondition] = useState(currentFilters.filterCondition || '');
  const [filterValue, setFilterValue] = useState(currentFilters.filterValue || '');
  const popularFilterRef = useRef(null);
  const sortFieldRef = useRef(null);

  useEffect(() => {
    if (filterIconRef) {
      const rect = filterIconRef.getBoundingClientRect();
      const dropdownWidth = 300;
      const dropdownHeight = 500;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let left = rect.left;
      let top = rect.bottom + 8;
      
      // Adjust if dropdown goes off right edge
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 16;
      }
      
      // Adjust if dropdown goes off bottom
      if (top + dropdownHeight > viewportHeight) {
        top = rect.top - dropdownHeight - 8;
      }
      
      // Don't go off left edge
      if (left < 16) {
        left = 16;
      }
      
      // Don't go off top edge
      if (top < 16) {
        top = 16;
      }
      
      setPosition({ top, left });
    }
  }, [filterIconRef]);

  // Close popular filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popularFilterRef.current && !popularFilterRef.current.contains(event.target)) {
        setIsPopularFilterOpen(false);
      }
      if (sortFieldRef.current && !sortFieldRef.current.contains(event.target)) {
        setIsSortFieldOpen(false);
      }
    };

    if (isPopularFilterOpen || isSortFieldOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopularFilterOpen, isSortFieldOpen]);

  const handleClearPopular = () => {
    setPopularFilter('');
  };

  const handleClearSort = () => {
    setSortField('');
    setSortOrder('');
  };

  const handleReset = () => {
    setPopularFilter('');
    setSortField('');
    setSortOrder('');
    setFilterField('');
    setFilterCondition('');
    setFilterValue('');
    if (onReset) {
      onReset();
    }
    onClose();
  };

  const handleApply = () => {
    if (onApply) {
      onApply({
        popularFilter,
        sortField,
        sortOrder,
        filterField,
        filterCondition,
        filterValue,
      });
    }
    onClose();
  };

  const popularFilters = [
    { value: 'bestSellers', label: 'Best Sellers (Top Revenue)' },
    { value: 'fastestMovers', label: 'Fastest Movers (Highest Unit Velocity)' },
    { value: 'topProfit', label: 'Top Profit Products' },
    { value: 'topTraffic', label: 'Top Traffic Drivers (Sessions/CTR)' },
    { value: 'outOfStock', label: 'Sold Out' },
    { value: 'overstock', label: 'Overstock' },
  ];

  const sortFields = [
    { value: '', label: 'Select field' },
    { value: 'fbaAvailable', label: 'FBA Available' },
    { value: 'totalInventory', label: 'Total Inventory' },
    { value: 'forecast', label: 'Forecast' },
    { value: 'sales7', label: '7 Day Sales' },
    { value: 'sales30', label: '30 Day Sales' },
  ];

  const sortOrders = [
    { value: '', label: 'Select order' },
    { value: 'asc', label: 'A^Z Sort ascending (A to Z)', icon: 'A^Z' },
    { value: 'desc', label: 'Z^A Sort descending (Z to A)', icon: 'Z^A' },
  ];

  const filterFields = [
    { value: '', label: 'Select field' },
    { value: 'brand', label: 'Brand' },
    { value: 'product', label: 'Product' },
    { value: 'size', label: 'Size' },
    { value: 'qty', label: 'Qty' },
    { value: 'fbaAvailable', label: 'FBA Available' },
    { value: 'totalInventory', label: 'Total Inventory' },
    { value: 'forecast', label: 'Forecast' },
  ];

  const filterConditions = [
    { value: '', label: 'Select condition' },
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'lessThan', label: 'Less than' },
  ];

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: '300px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid #E5E7EB',
        zIndex: 10000,
        padding: '12px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Popular filters section */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>
            Popular filters:
          </label>
          <button
            type="button"
            onClick={handleClearPopular}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#3B82F6',
              fontSize: '0.875rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Clear
          </button>
        </div>
        
        <div style={{ position: 'relative' }} ref={popularFilterRef}>
            <button
            type="button"
            onClick={() => setIsPopularFilterOpen(!isPopularFilterOpen)}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: popularFilter ? '#374151' : '#9CA3AF',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>
              {popularFilter 
                ? popularFilters.find(f => f.value === popularFilter)?.label || 'Select filter'
                : 'Select filter'
              }
            </span>
            <svg
              width="12"
              height="8"
              viewBox="0 0 12 8"
              fill="none"
              style={{
                transform: isPopularFilterOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              <path d="M1 1L6 6L11 1" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {isPopularFilterOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '4px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                zIndex: 10001,
              }}
            >
              {popularFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => {
                    setPopularFilter(filter.value);
                    setIsPopularFilterOpen(false);
                    // Apply immediately when selecting a popular filter
                    if (onApply) {
                      onApply({
                        popularFilter: filter.value,
                        sortField,
                        sortOrder,
                        filterField,
                        filterCondition,
                        filterValue,
                      });
                    }
                    onClose();
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    fontSize: '0.875rem',
                    color: popularFilter === filter.value ? '#3B82F6' : '#374151',
                    backgroundColor: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: popularFilter === filter.value ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (popularFilter !== filter.value) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  {popularFilter === filter.value && (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{ flexShrink: 0 }}
                    >
                      <path
                        d="M13.3333 4L6 11.3333L2.66667 8"
                        stroke="#3B82F6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {popularFilter !== filter.value && (
                    <div style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                  )}
                  <span>{filter.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sort by section */}
      <div style={{ marginBottom: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>
            Sort by:
          </label>
          <button
            type="button"
            onClick={handleClearSort}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#3B82F6',
              fontSize: '0.875rem',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Clear
          </button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ position: 'relative' }} ref={sortFieldRef}>
            <button
              type="button"
              onClick={() => setIsSortFieldOpen(!isSortFieldOpen)}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: sortField ? '#374151' : '#9CA3AF',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>
                {sortField 
                  ? sortFields.find(f => f.value === sortField)?.label || 'Select field'
                  : 'Select field'
                }
              </span>
              <svg
                width="12"
                height="8"
                viewBox="0 0 12 8"
                fill="none"
                style={{
                  transform: isSortFieldOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                <path d="M1 1L6 6L11 1" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {isSortFieldOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  overflow: 'hidden',
                  zIndex: 10001,
                }}
              >
                {sortFields.filter(f => f.value !== '').map((field) => (
                  <button
                    key={field.value}
                    type="button"
                    onClick={() => {
                      setSortField(field.value);
                      setIsSortFieldOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      backgroundColor: sortField === field.value ? '#F9FAFB' : '#FFFFFF',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (sortField !== field.value) {
                        e.currentTarget.style.backgroundColor = '#F9FAFB';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = sortField === field.value ? '#F9FAFB' : '#FFFFFF';
                    }}
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 36px 6px 10px',
              border: sortOrder ? '1px solid #3B82F6' : '1px solid #D1D5DB',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: sortOrder ? '#374151' : '#9CA3AF',
              backgroundColor: sortOrder ? '#EFF6FF' : '#FFFFFF',
              cursor: 'pointer',
              appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: '36px',
            }}
          >
            {sortOrders.map((order) => (
              <option key={order.value} value={order.value}>
                {order.icon ? `${order.icon} ${order.label}` : order.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter by condition section - collapsible */}
      <div style={{ marginBottom: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: isFilterConditionExpanded ? '8px' : 0,
            cursor: 'pointer',
          }}
          onClick={() => setIsFilterConditionExpanded(!isFilterConditionExpanded)}
        >
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>
            Filter by condition:
          </label>
          <svg
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            style={{
              transform: isFilterConditionExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <path d="M1 1L6 6L11 1" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {isFilterConditionExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 36px 6px 10px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: filterField ? '#374151' : '#9CA3AF',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '36px',
              }}
            >
              {filterFields.map((field) => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
            
            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 36px 6px 10px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: filterCondition ? '#374151' : '#9CA3AF',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L6 6L11 1' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: '36px',
              }}
            >
              {filterConditions.map((condition) => (
                <option key={condition.value} value={condition.value}>
                  {condition.label}
                </option>
              ))}
            </select>
            
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Value here..."
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 36px 6px 10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#374151',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ cursor: 'pointer' }}>
                  <path d="M1 5L5 1L9 5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ cursor: 'pointer' }}>
                  <path d="M1 1L5 5L9 1" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
        <button
          type="button"
          onClick={handleReset}
          style={{
            width: '57px',
            height: '23px',
            padding: '0',
            border: '1px solid #D1D5DB',
            borderRadius: '4px',
            backgroundColor: '#FFFFFF',
            color: '#374151',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={handleApply}
          style={{
            width: '57px',
            height: '23px',
            padding: '0',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            boxSizing: 'border-box',
          }}
        >
          Apply
        </button>
      </div>
    </div>,
    document.body
  );
});

TimelineFilterDropdown.displayName = 'TimelineFilterDropdown';

export default NewShipmentTable;


