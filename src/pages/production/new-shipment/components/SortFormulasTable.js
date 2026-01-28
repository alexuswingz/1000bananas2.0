import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { useSidebar } from '../../../../context/SidebarContext';
import SortFormulasFilterDropdown from './SortFormulasFilterDropdown';
import { showInfoToast } from '../../../../utils/notifications';

// Helper: Convert product size to gallons per unit
const sizeToGallons = (size) => {
  const sizeLower = (size || '').toLowerCase();
  if (sizeLower.includes('8oz') || sizeLower.includes('8 oz')) return 0.0625;
  if (sizeLower.includes('16oz') || sizeLower.includes('16 oz') || sizeLower.includes('pint')) return 0.125;
  if (sizeLower.includes('32oz') || sizeLower.includes('32 oz') || sizeLower.includes('quart')) return 0.25;
  if (sizeLower.includes('gallon') && !sizeLower.includes('5')) return 1.0;
  if (sizeLower.includes('5 gallon') || sizeLower.includes('5gallon')) return 5.0;
  return 0;
};

// Calculate manufacturing volume with spillage and rounding
// Formula: Round to nearest 5 gallons after adding 8% spillage factor
const calculateManufacturingVolume = (rawGallons) => {
  if (!rawGallons || rawGallons <= 0) return 0;
  
  const SPILLAGE_FACTOR = 1.08; // 8% spillage adjustment
  const adjustedVolume = rawGallons * SPILLAGE_FACTOR;
  
  // Round to nearest 5 gallons
  return Math.round(adjustedVolume / 5) * 5;
};

const GALLONS_PER_TOTE = 275;

const SortFormulasTable = ({ shipmentProducts = [], shipmentId = null, onCompleteClick = null }) => {
  const { isDarkMode } = useTheme();
  const { sidebarWidth } = useSidebar();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // { index: number, position: 'above' | 'below' }
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const menuRefs = useRef({});
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [selectedFormula, setSelectedFormula] = useState(null);
  const [firstBatchQty, setFirstBatchQty] = useState(1);
  const [openFilterColumns, setOpenFilterColumns] = useState(() => new Set());
  const filterIconRefs = useRef({});
  const tableContainerRef = useRef(null);
  
  // Locking state - use formula name as stable identifier
  const [lockedFormulaIds, setLockedFormulaIds] = useState(() => new Set());
  const locksLoadedRef = useRef(null); // Track which shipmentId we've loaded locks for

  // Filter and sort state
  // Initialize from localStorage immediately to prevent save effect from overwriting
  const [filters, setFilters] = useState(() => {
    if (shipmentId) {
      try {
        const stored = localStorage.getItem(`sortFormulasFilters_${shipmentId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            // Convert Set objects back from arrays
            const restored = {};
            Object.keys(parsed).forEach(key => {
              if (parsed[key] && parsed[key].selectedValues && Array.isArray(parsed[key].selectedValues)) {
                restored[key] = {
                  ...parsed[key],
                  selectedValues: new Set(parsed[key].selectedValues)
                };
              } else {
                restored[key] = parsed[key];
              }
            });
            return restored;
          }
        }
      } catch (error) {
        console.error('Error loading filters from localStorage on init:', error);
      }
    }
    return {};
  });
  // sortConfig is now an array of sort objects: [{column: 'formula', order: 'asc'}, {column: 'qty', order: 'desc'}]
  // The order in the array determines the sort priority (first = primary, second = secondary, etc.)
  // Initialize from localStorage immediately to prevent save effect from overwriting
  const [sortConfig, setSortConfig] = useState(() => {
    if (shipmentId) {
      try {
        const stored = localStorage.getItem(`sortFormulasSortConfig_${shipmentId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch (error) {
        console.error('Error loading sort config from localStorage on init:', error);
      }
    }
    return [];
  });
  const sortConfigLoadedRef = useRef(shipmentId); // Track which shipmentId we've loaded sortConfig for
  const filtersLoadedRef = useRef(shipmentId); // Track which shipmentId we've loaded filters for
  const isInitialLoadRef = useRef(true); // Track if we're in initial load phase
  
  // Selection state for bulk operations
  const [selectedIndices, setSelectedIndices] = useState(() => new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

  // Transform shipment products into formula data
  const [formulas, setFormulas] = useState([]);
  const previousShipmentIdRef = useRef(null); // Track previous shipmentId to detect actual changes
  const splitsLoadedRef = useRef(null); // Track which shipmentId we've loaded splits for
  const orderLoadedRef = useRef(null); // Track which shipmentId we've loaded order for
  const isInitialOrderLoadRef = useRef(true); // Track if we're in initial order load phase

  // Helper function to get a stable identifier for a formula
  // Uses formula name + splitTag (if exists) as unique identifier
  const getFormulaIdentifier = (formula) => {
    return `${formula.formula}${formula.splitTag ? `::${formula.splitTag}` : ''}`;
  };

  // Save formula order to localStorage
  const saveFormulaOrder = (formulasToSave) => {
    if (!shipmentId || isInitialOrderLoadRef.current) return;
    
    try {
      const order = formulasToSave.map(f => getFormulaIdentifier(f));
      localStorage.setItem(`sortFormulasOrder_${shipmentId}`, JSON.stringify(order));
      console.log('Saved formula order:', order);
    } catch (error) {
      console.error('Error saving formula order to localStorage:', error);
    }
  };

  // Reset locks and splits loaded flags when shipmentId actually changes (not on remount)
  useEffect(() => {
    const previousShipmentId = previousShipmentIdRef.current;
    previousShipmentIdRef.current = shipmentId;
    
    // Only clear locks and splits if shipmentId actually changed to a different value
    if (previousShipmentId !== null && previousShipmentId !== shipmentId) {
      locksLoadedRef.current = null;
      splitsLoadedRef.current = null;
      sortConfigLoadedRef.current = null;
      filtersLoadedRef.current = null;
      orderLoadedRef.current = null;
      isInitialLoadRef.current = true;
      isInitialOrderLoadRef.current = true;
      setLockedFormulaIds(new Set());
      setSortConfig([]);
      setFilters({});
    } else if (previousShipmentId === null && shipmentId !== null) {
      // Initial mount with shipmentId - mark order load as initial
      isInitialOrderLoadRef.current = true;
    }
  }, [shipmentId]);

  // Load sortConfig and filters from localStorage when shipmentId changes (not on initial mount since we load in useState)
  useEffect(() => {
    if (!shipmentId) return;
    
    // Only load if shipmentId changed (not on initial mount)
    if (sortConfigLoadedRef.current !== shipmentId) {
      // Load sortConfig
      try {
        const stored = localStorage.getItem(`sortFormulasSortConfig_${shipmentId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSortConfig(parsed);
            console.log('Loaded sort config:', parsed);
          }
        } else {
          setSortConfig([]);
        }
      } catch (error) {
        console.error('Error loading sort config from localStorage:', error);
        setSortConfig([]);
      }
      
      // Load filters
      try {
        const stored = localStorage.getItem(`sortFormulasFilters_${shipmentId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            // Convert Set objects back from arrays
            const restored = {};
            Object.keys(parsed).forEach(key => {
              if (parsed[key] && parsed[key].selectedValues && Array.isArray(parsed[key].selectedValues)) {
                restored[key] = {
                  ...parsed[key],
                  selectedValues: new Set(parsed[key].selectedValues)
                };
              } else {
                restored[key] = parsed[key];
              }
            });
            setFilters(restored);
            console.log('Loaded filters:', restored);
          }
        } else {
          setFilters({});
        }
      } catch (error) {
        console.error('Error loading filters from localStorage:', error);
        setFilters({});
      }
      
      sortConfigLoadedRef.current = shipmentId;
      filtersLoadedRef.current = shipmentId;
      
      // Mark that initial load is complete after a short delay to prevent save effect from running
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 200);
    } else {
      // If same shipmentId, we already loaded in useState, just mark initial load as complete
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 200);
    }
  }, [shipmentId]);

  // Persist sortConfig to localStorage whenever it changes (but not during initial load)
  useEffect(() => {
    if (!shipmentId) return;
    // Don't save during initial load to avoid overwriting with empty array
    if (isInitialLoadRef.current) {
      return;
    }
    // Don't save if we haven't loaded yet (prevent saving before load completes)
    if (sortConfigLoadedRef.current !== shipmentId) {
      return;
    }

    try {
      localStorage.setItem(`sortFormulasSortConfig_${shipmentId}`, JSON.stringify(sortConfig));
      console.log('Saved sort config:', sortConfig);
    } catch (error) {
      console.error('Error saving sort config to localStorage:', error);
    }
  }, [sortConfig, shipmentId]);

  // Persist filters to localStorage whenever they change (but not during initial load)
  useEffect(() => {
    if (!shipmentId) return;
    // Don't save during initial load to avoid overwriting
    if (isInitialLoadRef.current) {
      return;
    }
    // Don't save if we haven't loaded yet (prevent saving before load completes)
    if (filtersLoadedRef.current !== shipmentId) {
      return;
    }

    try {
      // Convert Set objects to arrays for JSON serialization
      const serializable = {};
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key].selectedValues instanceof Set) {
          serializable[key] = {
            ...filters[key],
            selectedValues: Array.from(filters[key].selectedValues)
          };
        } else {
          serializable[key] = filters[key];
        }
      });
      localStorage.setItem(`sortFormulasFilters_${shipmentId}`, JSON.stringify(serializable));
      console.log('Saved filters:', serializable);
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }
  }, [filters, shipmentId]);

  // Update formulas when shipmentProducts prop changes
  useEffect(() => {
    if (shipmentProducts && shipmentProducts.length > 0) {
      // Group products by formula and calculate total gallons needed
      const formulaMap = {};
      
      shipmentProducts.forEach((product) => {
        const formulaName = product.formula_name || product.formula || 'Unknown';
        const gallonsPerUnit = product.formulaGallonsPerUnit || sizeToGallons(product.size);
        const qty = product.qty || 0;
        const totalGallons = gallonsPerUnit * qty;
        
        if (!formulaMap[formulaName]) {
          formulaMap[formulaName] = {
            formula: formulaName,
            totalGallons: 0,
            products: [],
          };
        }
        formulaMap[formulaName].totalGallons += totalGallons;
        formulaMap[formulaName].products.push(product);
      });

      // Convert to array of formula objects for the table
      // Each row represents a formula with qty = number of totes needed
      const transformedFormulas = [];
      let idCounter = 1;

      Object.values(formulaMap).forEach((formulaData) => {
        // Apply manufacturing volume formula (8% spillage + round to nearest 5)
        const manufacturingVolume = calculateManufacturingVolume(formulaData.totalGallons);
        
        // Calculate totes needed based on manufacturing volume
        const totesNeeded = Math.ceil(manufacturingVolume / GALLONS_PER_TOTE);
        
        // Skip formulas that don't need any totes
        if (totesNeeded <= 0 && manufacturingVolume <= 0) return;
        
        // Create one row per formula with qty = total totes needed
        // This allows split functionality when qty > 1
        transformedFormulas.push({
          id: idCounter++,
          formula: formulaData.formula, // Use formula name as stable identifier for locking
          size: 'Tote',
          qty: Math.max(1, totesNeeded), // At least 1 tote if there's any volume
          tote: 'Clean',
          volume: manufacturingVolume, // Manufacturing volume (with spillage + rounded to 5)
          rawVolume: Math.round(formulaData.totalGallons * 100) / 100, // Keep raw for reference
          measure: 'Gallon',
          type: 'Liquid',
        });
      });

      // Load and apply saved splits before setting formulas
      // Always reload splits when formulas are regenerated to ensure they persist across navigation
      let finalFormulas = [...transformedFormulas];
      // Find the max ID to ensure unique IDs for split formulas
      const maxId = finalFormulas.length > 0 ? Math.max(...finalFormulas.map(f => f.id || 0), 0) : 0;
      let nextId = maxId + 1;
      
      if (shipmentId) {
        try {
          const storedSplits = localStorage.getItem(`sortFormulasSplits_${shipmentId}`);
          if (storedSplits) {
            const parsedSplits = JSON.parse(storedSplits);
            if (Array.isArray(parsedSplits) && parsedSplits.length > 0) {
              // Group splits by formula name to handle multiple splits on the same formula
              const splitsByFormula = {};
              parsedSplits.forEach((splitInfo) => {
                const { formulaName } = splitInfo;
                if (!splitsByFormula[formulaName]) {
                  splitsByFormula[formulaName] = [];
                }
                splitsByFormula[formulaName].push(splitInfo);
              });
              
              // Apply splits: for each formula name with splits, replace ALL formulas with that name
              // (whether they have splitTag or not) with the stored split formulas
              Object.keys(splitsByFormula).forEach((formulaName) => {
                // Find all formulas with this name (including already split ones)
                const matchingIndices = [];
                finalFormulas.forEach((f, idx) => {
                  if (f.formula === formulaName) {
                    matchingIndices.push(idx);
                  }
                });
                
                if (matchingIndices.length > 0) {
                  // Get the most recent split info for this formula (last one in array)
                  const splitInfo = splitsByFormula[formulaName][splitsByFormula[formulaName].length - 1];
                  const { firstBatch, secondBatch, additionalBatches = [] } = splitInfo;
                  
                  // Get the first matching formula as template (use the first unsplit one if available, otherwise any)
                  const templateIndex = matchingIndices.find(idx => !finalFormulas[idx].splitTag) || matchingIndices[0];
                  const templateFormula = finalFormulas[templateIndex];
                  
                  // Remove all formulas with this name
                  // Sort indices descending to remove from end first
                  matchingIndices.sort((a, b) => b - a).forEach(idx => {
                    finalFormulas.splice(idx, 1);
                  });
                  
                  // Create all split formulas
                  const splitFormulas = [];
                  
                  // First batch
                  splitFormulas.push({
                    ...templateFormula,
                    id: nextId++,
                    qty: firstBatch.qty,
                    volume: firstBatch.volume,
                    splitTag: '1/2',
                    originalId: templateFormula.id,
                  });
                  
                  // Second batch
                  splitFormulas.push({
                    ...templateFormula,
                    id: nextId++,
                    qty: secondBatch.qty,
                    volume: secondBatch.volume,
                    splitTag: '2/2',
                    originalId: templateFormula.id,
                  });
                  
                  // Additional batches (for multiple splits)
                  additionalBatches.forEach((batch, idx) => {
                    splitFormulas.push({
                      ...templateFormula,
                      id: nextId++,
                      qty: batch.qty,
                      volume: batch.volume,
                      splitTag: `${idx + 3}/${splitFormulas.length + additionalBatches.length}`,
                      originalId: templateFormula.id,
                    });
                  });
                  
                  // Insert at the position of the first removed formula
                  const insertIndex = Math.min(...matchingIndices);
                  finalFormulas.splice(insertIndex, 0, ...splitFormulas);
                  
                  console.log('Applied split for formula:', formulaName, 'total batches:', splitFormulas.length, 'batches:', splitFormulas.map(f => ({ qty: f.qty, volume: f.volume, tag: f.splitTag })));
                } else {
                  console.warn('Could not find formula to apply split:', formulaName, 'Available formulas:', finalFormulas.map(f => f.formula));
                }
              });
              console.log('Applied', parsedSplits.length, 'saved splits');
            }
          }
          splitsLoadedRef.current = shipmentId;
        } catch (error) {
          console.error('Error loading sort formulas splits from localStorage:', error);
        }
      }

      // Restore saved order if it exists
      let orderedFormulas = finalFormulas;
      if (shipmentId) {
        try {
          const storedOrder = localStorage.getItem(`sortFormulasOrder_${shipmentId}`);
          if (storedOrder) {
            const parsedOrder = JSON.parse(storedOrder);
            if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
              // Create a map of identifier -> formula for quick lookup
              const formulaMap = new Map();
              finalFormulas.forEach(f => {
                const identifier = getFormulaIdentifier(f);
                formulaMap.set(identifier, f);
              });
              
              // Reorder formulas according to saved order
              const ordered = [];
              const usedIdentifiers = new Set();
              
              // First, add formulas in the saved order
              parsedOrder.forEach(identifier => {
                if (formulaMap.has(identifier) && !usedIdentifiers.has(identifier)) {
                  ordered.push(formulaMap.get(identifier));
                  usedIdentifiers.add(identifier);
                }
              });
              
              // Then, add any formulas that weren't in the saved order (new formulas)
              finalFormulas.forEach(f => {
                const identifier = getFormulaIdentifier(f);
                if (!usedIdentifiers.has(identifier)) {
                  ordered.push(f);
                  usedIdentifiers.add(identifier);
                }
              });
              
              orderedFormulas = ordered;
              console.log('Restored formula order:', parsedOrder);
              orderLoadedRef.current = shipmentId;
              // Mark that initial order load is complete after a short delay
              setTimeout(() => {
                isInitialOrderLoadRef.current = false;
              }, 200);
            } else {
              // No saved order, mark as loaded
              orderLoadedRef.current = shipmentId;
              setTimeout(() => {
                isInitialOrderLoadRef.current = false;
              }, 200);
            }
          } else {
            // No saved order, mark as loaded
            orderLoadedRef.current = shipmentId;
            setTimeout(() => {
              isInitialOrderLoadRef.current = false;
            }, 200);
          }
        } catch (error) {
          console.error('Error loading formula order from localStorage:', error);
          orderLoadedRef.current = shipmentId;
          setTimeout(() => {
            isInitialOrderLoadRef.current = false;
          }, 200);
        }
      }

      setFormulas(orderedFormulas);
      
      // Load locked formula names from localStorage whenever formulas are set
      // This handles both initial mount and remount scenarios
      if (shipmentId) {
        // Only load if we haven't loaded for this shipmentId yet, or if shipmentId changed
        if (locksLoadedRef.current !== shipmentId) {
          try {
            const stored = localStorage.getItem(`sortFormulasLocks_${shipmentId}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                // Filter to only include formula names that exist in current formulas
                const formulaNames = new Set(orderedFormulas.map(f => f.formula));
                const validLockedNames = parsed.filter(name => formulaNames.has(name));
                setLockedFormulaIds(new Set(validLockedNames));
                console.log('Loaded locked formula names:', validLockedNames);
              }
            } else {
              // If no stored locks, ensure we start with empty set
              setLockedFormulaIds(new Set());
            }
            locksLoadedRef.current = shipmentId;
          } catch (error) {
            console.error('Error loading sort formulas locks from localStorage:', error);
          }
        }
      }
    } else {
      setFormulas([]);
    }
  }, [shipmentProducts, shipmentId]);

  // Persist locked formula names to localStorage whenever they change
  useEffect(() => {
    if (!shipmentId) return;

    try {
      const namesArray = Array.from(lockedFormulaIds);
      localStorage.setItem(`sortFormulasLocks_${shipmentId}`, JSON.stringify(namesArray));
    } catch (error) {
      console.error('Error saving sort formulas locks to localStorage:', error);
    }
  }, [lockedFormulaIds, shipmentId]);

  const columns = [
    { key: 'drag', label: '', width: '50px' },
    { key: 'formula', label: 'FORMULA', width: '150px' },
    { key: 'size', label: 'SIZE', width: '100px' },
    { key: 'qty', label: 'QTY', width: '80px' },
    { key: 'tote', label: 'TOTE', width: '100px' },
    { key: 'volume', label: 'VOLUME', width: '100px' },
    { key: 'measure', label: 'MEASURE', width: '120px' },
    { key: 'type', label: 'TYPE', width: '100px' },
    { key: 'notes', label: 'NOTES', width: '80px' },
    { key: 'menu', label: '', width: '50px' },
  ];

  const handleRowClick = (e, index) => {
    // Don't handle selection if clicking on interactive elements
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('img[alt="Lock"]') || e.target.closest('img[alt="Unlock"]')) {
      return;
    }

    const isShiftClick = e.shiftKey;
    const isCmdClick = e.metaKey || e.ctrlKey;

    if (isShiftClick && lastSelectedIndex !== null) {
      // Shift + Click: Select range between lastSelectedIndex and current index
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSelected = new Set(selectedIndices);
      
      for (let i = start; i <= end; i++) {
        newSelected.add(i);
      }
      
      setSelectedIndices(newSelected);
      setLastSelectedIndex(index);
    } else if (isCmdClick) {
      // Cmd/Ctrl + Click: Toggle selection of this item
      const newSelected = new Set(selectedIndices);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedIndices(newSelected);
      setLastSelectedIndex(index);
    } else {
      // Regular click: Select only this item
      setSelectedIndices(new Set([index]));
      setLastSelectedIndex(index);
    }
  };

  const handleDragStart = (e, index) => {
    // If this index is part of a selection, we'll handle multi-drag
    // Otherwise, just drag this single item
    if (selectedIndices.has(index) && selectedIndices.size > 1) {
      // Multi-drag: set draggedIndex to the first selected item
      const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
      setDraggedIndex(sortedIndices[0]);
    } else {
      setDraggedIndex(index);
      // Clear selection if dragging a single unselected item
      if (!selectedIndices.has(index)) {
        setSelectedIndices(new Set([index]));
        setLastSelectedIndex(index);
      }
    }
    e.dataTransfer.effectAllowed = 'move';
    // Set a simple data transfer to enable drag
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Don't allow dropping on the dragged item or any selected item during multi-drag
    if (draggedIndex === null || draggedIndex === index || (selectedIndices.has(index) && selectedIndices.size > 1)) {
      setDragOverIndex(null);
      setDropPosition(null);
      return;
    }
    
    setDragOverIndex(index);
    
    // Determine if we're in the top or bottom half of the row
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const rowHeight = rect.height;
    const midpoint = rowHeight / 2;
    
    // If dragging from above, place below; if dragging from below, place above
    // But also consider mouse position within the row
    if (draggedIndex < index) {
      // Dragging down - place below the current row
      setDropPosition({ index, position: 'below' });
    } else if (draggedIndex > index) {
      // Dragging up - place above the current row
      setDropPosition({ index, position: 'above' });
    } else {
      // Use mouse position to determine
      setDropPosition({ index, position: y < midpoint ? 'above' : 'below' });
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDropPosition(null);
      return;
    }

    // Work with filtered formulas for display, but update the original formulas array
    const filteredList = filteredFormulas;
    const dropItem = filteredList[dropIndex];
    
    // Check if we're dragging multiple items
    const isMultiDrag = selectedIndices.size > 1 && selectedIndices.has(draggedIndex);
    
    if (isMultiDrag) {
      // Multi-drag: move all selected items
      const sortedSelectedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
      const draggedItems = sortedSelectedIndices.map(idx => filteredList[idx]);
      
      // Find drop item in original formulas array
      const dropOriginalIndex = formulas.findIndex(f => f.id === dropItem.id);
      
      const newFormulas = [...formulas];
      
      // Remove all dragged items (in reverse order to maintain indices)
      const draggedOriginalIndices = draggedItems.map(item => 
        formulas.findIndex(f => f.id === item.id)
      ).sort((a, b) => b - a); // Sort descending to remove from end first
      
      draggedOriginalIndices.forEach(originalIdx => {
        newFormulas.splice(originalIdx, 1);
      });
      
      // Find new position after removal
      let newDropIndex = newFormulas.findIndex(f => f.id === dropItem.id);
      
      // Use drop position to determine insert index
      let insertIndex;
      if (dropPosition && dropPosition.index === dropIndex) {
        insertIndex = dropPosition.position === 'above' ? newDropIndex : newDropIndex + 1;
      } else {
        // Fallback: insert after drop item
        insertIndex = newDropIndex + 1;
      }
      
      // Insert all dragged items at the new position
      newFormulas.splice(insertIndex, 0, ...draggedItems);
      
      // Track which items were moved (by ID) to preserve selection
      const movedItemIds = new Set(draggedItems.map(item => item.id));
      
      // Clear drag states
      setDragOverIndex(null);
      setDropPosition(null);
      
      setTimeout(() => {
        setFormulas(newFormulas);
        saveFormulaOrder(newFormulas);
        setDraggedIndex(null);
        
        // Update selection to reflect new positions of moved items
        // Find the new indices of the moved items in the updated formulas array
        const newSelectedIndices = new Set();
        newFormulas.forEach((formula, index) => {
          if (movedItemIds.has(formula.id)) {
            newSelectedIndices.add(index);
          }
        });
        setSelectedIndices(newSelectedIndices);
        // Set lastSelectedIndex to the first moved item's new position
        if (newSelectedIndices.size > 0) {
          setLastSelectedIndex(Math.min(...Array.from(newSelectedIndices)));
        }
      }, 50);
    } else {
      // Single drag: original logic
      if (draggedIndex === dropIndex) {
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDropPosition(null);
        return;
      }
      
      const draggedItem = filteredList[draggedIndex];
      
      // Find these items in the original formulas array
      const draggedOriginalIndex = formulas.findIndex(f => f.id === draggedItem.id);
      const dropOriginalIndex = formulas.findIndex(f => f.id === dropItem.id);
      
      const newFormulas = [...formulas];
      
      // Remove the dragged item
      newFormulas.splice(draggedOriginalIndex, 1);
      
      // Find new position after removal
      const newDropIndex = newFormulas.findIndex(f => f.id === dropItem.id);
      
      // Use drop position to determine insert index
      let insertIndex;
      if (dropPosition && dropPosition.index === dropIndex) {
        insertIndex = dropPosition.position === 'above' ? newDropIndex : newDropIndex + 1;
      } else {
        // Fallback to original logic
        insertIndex = draggedOriginalIndex < dropOriginalIndex ? newDropIndex + 1 : newDropIndex;
      }
      
      // Insert it at the new position
      newFormulas.splice(insertIndex, 0, draggedItem);
      
      // Track the moved item ID to preserve selection
      const movedItemId = draggedItem.id;
      
      // Clear drag states first for smooth transition
      setDragOverIndex(null);
      setDropPosition(null);
      
      // Small delay to allow drop line to fade out smoothly
      setTimeout(() => {
        setFormulas(newFormulas);
        saveFormulaOrder(newFormulas);
        setDraggedIndex(null);
        
        // Find the new index of the moved item and keep it selected
        const newIndex = newFormulas.findIndex(f => f.id === movedItemId);
        if (newIndex !== -1) {
          setSelectedIndices(new Set([newIndex]));
          setLastSelectedIndex(newIndex);
        } else {
          // Fallback: clear selection if item not found
          setSelectedIndices(new Set());
          setLastSelectedIndex(null);
        }
      }, 50);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
    // Don't clear selection here - let handleDrop handle it
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuIndex !== null) {
        const menuRef = menuRefs.current[openMenuIndex];
        const tdElement = menuRef?.parentElement;
        // Check if click is outside both the menu and its parent td
        if (tdElement && !tdElement.contains(event.target)) {
          setOpenMenuIndex(null);
        }
      }
    };

    if (openMenuIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openMenuIndex]);

  // Close filters when menu opens
  useEffect(() => {
    if (openMenuIndex !== null && openFilterColumns.size > 0) {
      setOpenFilterColumns(new Set());
    }
  }, [openMenuIndex]);

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumns.size > 0) {
        // Check if click is on any filter icon
        const clickedOnFilterIcon = Object.values(filterIconRefs.current).some(ref => 
          ref && ref.contains(event.target)
        );
        
        // Check if click is inside any dropdown (they use portals, so we check by class or data attribute)
        // Since dropdowns are portals, we need to check if the click target is within a dropdown
        const clickedInsideDropdown = event.target.closest('[data-filter-dropdown]');
        
        if (!clickedOnFilterIcon && !clickedInsideDropdown) {
          setOpenFilterColumns(new Set());
        }
      }
    };

    if (openFilterColumns.size > 0) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openFilterColumns]);

  // Clear selection when clicking outside the table
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't clear if clicking on interactive elements
      if (
        openMenuIndex !== null ||
        isSplitModalOpen ||
        openFilterColumns.size > 0 ||
        event.target.closest('[data-filter-dropdown]') ||
        event.target.closest('button') ||
        event.target.closest('input')
      ) {
        return;
      }

      // Check if click is outside the table container
      if (tableContainerRef.current && !tableContainerRef.current.contains(event.target)) {
        setSelectedIndices(new Set());
        setLastSelectedIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuIndex, isSplitModalOpen, openFilterColumns]);

  const handleMenuClick = (e, index) => {
    e.stopPropagation();
    // Close filters when opening a menu
    if (openFilterColumns.size > 0) {
      setOpenFilterColumns(new Set());
    }
    setOpenMenuIndex(openMenuIndex === index ? null : index);
  };

  const handleMenuAction = (action, formula) => {
    if (action === 'split') {
      setSelectedFormula(formula);
      setFirstBatchQty(1); // Always set first batch to 1
      setIsSplitModalOpen(true);
    } else if (action === 'undoSplit') {
      handleUndoSplit(formula);
    } else if (action === 'undoAllSplits') {
      handleUndoAllSplits(formula);
    }
    setOpenMenuIndex(null);
  };

  const handleCloseSplitModal = () => {
    setIsSplitModalOpen(false);
    setSelectedFormula(null);
    setFirstBatchQty(1);
  };

  const handleConfirmSplit = () => {
    if (!selectedFormula) return;
    
    // First quantity is always 1 tote, second is the remaining totes
    const originalQty = selectedFormula.qty || 1;
    const firstBatchQty = 1;
    const secondBatchQty = originalQty - firstBatchQty;
    
    // Calculate volume proportionally
    const totalVolume = selectedFormula.volume || 0;
    const volumePerTote = originalQty > 0 ? totalVolume / originalQty : 0;
    const firstBatchVolume = Math.round(volumePerTote * firstBatchQty * 100) / 100;
    const secondBatchVolume = Math.round(volumePerTote * secondBatchQty * 100) / 100;
    
    // Find the index of the formula to split
    const formulaIndex = formulas.findIndex(f => f.id === selectedFormula.id);
    
    if (formulaIndex === -1) return;
    
    // Create two new formulas from the split
    const firstBatch = {
      ...selectedFormula,
      id: Date.now(), // New ID for first batch
      qty: firstBatchQty, // Always 1 tote
      volume: firstBatchVolume, // Proportional volume
      splitTag: '1/2', // Tag to indicate it's part of a split
      originalId: selectedFormula.id, // Keep reference to original
    };
    
    const secondBatch = {
      ...selectedFormula,
      id: Date.now() + 1, // New ID for second batch
      qty: secondBatchQty, // Remaining totes
      volume: secondBatchVolume, // Proportional volume
      splitTag: '2/2', // Tag to indicate it's part of a split
      originalId: selectedFormula.id, // Keep reference to original
    };
    
    // Replace the original formula with the two split formulas
    const newFormulas = [...formulas];
    newFormulas.splice(formulaIndex, 1, firstBatch, secondBatch);
    setFormulas(newFormulas);
    saveFormulaOrder(newFormulas);
    
    // Save split information to localStorage
    // Store the current state of all split formulas for this formula name
    if (shipmentId) {
      try {
        const formulaName = selectedFormula.formula;
        
        // Get all formulas with this name from the new formulas array (after split)
        const newFormulas = [...formulas];
        newFormulas.splice(formulaIndex, 1, firstBatch, secondBatch);
        const formulasWithThisName = newFormulas.filter(f => f.formula === formulaName);
        
        // Get all formulas that have been split (have splitTag)
        const splitFormulas = formulasWithThisName.filter(f => f.splitTag);
        
        // Only save if there are split formulas
        if (splitFormulas.length > 0) {
          const storedSplits = localStorage.getItem(`sortFormulasSplits_${shipmentId}`);
          const existingSplits = storedSplits ? JSON.parse(storedSplits) : [];
          
          // Remove any existing split for this formula name (in case it was split before)
          const filteredSplits = existingSplits.filter(s => s.formulaName !== formulaName);
          
          // Save all split formulas for this name
          // Sort by splitTag to ensure consistent order
          const sortedSplitFormulas = [...splitFormulas].sort((a, b) => {
            if (a.splitTag && b.splitTag) {
              return a.splitTag.localeCompare(b.splitTag);
            }
            return 0;
          });
          
          // Store as batches - if there are 2, store as firstBatch/secondBatch
          // If there are more (multiple splits), store the first two as firstBatch/secondBatch
          // and the rest will be handled by the loading logic
          if (sortedSplitFormulas.length >= 2) {
            filteredSplits.push({
              formulaName: formulaName,
              firstBatch: {
                qty: sortedSplitFormulas[0].qty,
                volume: sortedSplitFormulas[0].volume,
              },
              secondBatch: {
                qty: sortedSplitFormulas[1].qty,
                volume: sortedSplitFormulas[1].volume,
              },
              // Store additional batches if there are more than 2
              additionalBatches: sortedSplitFormulas.slice(2).map(f => ({
                qty: f.qty,
                volume: f.volume,
              })),
            });
          } else if (sortedSplitFormulas.length === 1) {
            // Edge case: only one split formula (shouldn't happen, but handle it)
            filteredSplits.push({
              formulaName: formulaName,
              firstBatch: {
                qty: sortedSplitFormulas[0].qty,
                volume: sortedSplitFormulas[0].volume,
              },
              secondBatch: {
                qty: 0,
                volume: 0,
              },
            });
          }
          
          localStorage.setItem(`sortFormulasSplits_${shipmentId}`, JSON.stringify(filteredSplits));
          console.log('Saved split for formula:', formulaName, 'total split formulas:', sortedSplitFormulas.length, 'batches:', sortedSplitFormulas.map(f => ({ qty: f.qty, volume: f.volume, tag: f.splitTag })));
        }
      } catch (error) {
        console.error('Error saving sort formulas splits to localStorage:', error);
      }
    }
    
    handleCloseSplitModal();
  };

  // Helper function to check if a formula has splits
  const hasSplits = (formula) => {
    if (!formula) return false;
    const formulaName = formula.formula;
    // Count how many split formulas share this formula name
    const splitCount = formulas.filter(f => 
      f.formula === formulaName && f.splitTag
    ).length;
    return splitCount > 0;
  };

  // Handler for undoing a single split (from a split item)
  const handleUndoSplit = (splitFormula) => {
    if (!splitFormula || !splitFormula.splitTag) return;
    
    const formulaName = splitFormula.formula;
    
    // Find all split formulas with the same formula name
    const allSplitFormulas = formulas.filter(f => 
      f.formula === formulaName && f.splitTag
    );
    
    if (allSplitFormulas.length === 0) return;
    
    // Calculate the combined quantity and volume
    const combinedQty = allSplitFormulas.reduce((sum, f) => sum + (f.qty || 0), 0);
    const combinedVolume = allSplitFormulas.reduce((sum, f) => sum + (f.volume || 0), 0);
    
    // Find the first split formula to use as template
    const templateFormula = allSplitFormulas[0];
    
    // Get the original ID (from the first split's originalId, or generate a new one)
    const originalId = templateFormula.originalId || templateFormula.id;
    
    // Create the merged formula (remove splitTag and originalId)
    const mergedFormula = {
      ...templateFormula,
      id: originalId,
      qty: combinedQty,
      volume: Math.round(combinedVolume * 100) / 100,
      splitTag: undefined,
      originalId: undefined,
    };
    
    // Remove all split formulas and add the merged formula
    const newFormulas = formulas.filter(f => 
      f.formula !== formulaName || !f.splitTag
    );
    
    // Find the position of the first split formula to insert the merged formula there
    const firstSplitIndex = formulas.findIndex(f => 
      f.formula === formulaName && f.splitTag
    );
    
    if (firstSplitIndex !== -1) {
      newFormulas.splice(firstSplitIndex, 0, mergedFormula);
    } else {
      newFormulas.push(mergedFormula);
    }
    
    setFormulas(newFormulas);
    saveFormulaOrder(newFormulas);
    
    // Remove split from localStorage
    if (shipmentId) {
      try {
        const storedSplits = localStorage.getItem(`sortFormulasSplits_${shipmentId}`);
        if (storedSplits) {
          const existingSplits = JSON.parse(storedSplits);
          const filteredSplits = existingSplits.filter(s => s.formulaName !== formulaName);
          localStorage.setItem(`sortFormulasSplits_${shipmentId}`, JSON.stringify(filteredSplits));
        }
      } catch (error) {
        console.error('Error removing split from localStorage:', error);
      }
    }
    
    // Show info toast
    showInfoToast(`Split undone for ${formulaName}`, `Combined ${allSplitFormulas.length} split item(s) back into one.`);
  };

  // Handler for undoing all splits (from a parent item or any split item)
  const handleUndoAllSplits = (formula) => {
    if (!formula) return;
    
    // If it's a split item, use the same logic as handleUndoSplit
    if (formula.splitTag) {
      handleUndoSplit(formula);
      return;
    }
    
    // If it's not a split item, find all splits with the same formula name
    const formulaName = formula.formula;
    
    // Find all split formulas with this formula name
    const allSplitFormulas = formulas.filter(f => 
      f.formula === formulaName && f.splitTag
    );
    
    if (allSplitFormulas.length === 0) return;
    
    // Calculate the combined quantity and volume
    const combinedQty = allSplitFormulas.reduce((sum, f) => sum + (f.qty || 0), 0);
    const combinedVolume = allSplitFormulas.reduce((sum, f) => sum + (f.volume || 0), 0);
    
    // Use the first split formula as template
    const templateFormula = allSplitFormulas[0];
    const originalId = templateFormula.originalId || templateFormula.id;
    
    // Create the merged formula
    const mergedFormula = {
      ...templateFormula,
      id: originalId,
      qty: combinedQty,
      volume: Math.round(combinedVolume * 100) / 100,
      splitTag: undefined,
      originalId: undefined,
    };
    
    // Remove all split formulas and add the merged formula
    const newFormulas = formulas.filter(f => 
      f.formula !== formulaName || !f.splitTag
    );
    
    // Find the position of the first split formula to insert the merged formula there
    const firstSplitIndex = formulas.findIndex(f => 
      f.formula === formulaName && f.splitTag
    );
    
    if (firstSplitIndex !== -1) {
      newFormulas.splice(firstSplitIndex, 0, mergedFormula);
    } else {
      newFormulas.push(mergedFormula);
    }
    
    setFormulas(newFormulas);
    saveFormulaOrder(newFormulas);
    
    // Remove split from localStorage
    if (shipmentId) {
      try {
        const storedSplits = localStorage.getItem(`sortFormulasSplits_${shipmentId}`);
        if (storedSplits) {
          const existingSplits = JSON.parse(storedSplits);
          const filteredSplits = existingSplits.filter(s => s.formulaName !== formulaName);
          localStorage.setItem(`sortFormulasSplits_${shipmentId}`, JSON.stringify(filteredSplits));
        }
      } catch (error) {
        console.error('Error removing split from localStorage:', error);
      }
    }
    
    // Show info toast
    showInfoToast(`All splits undone for ${formulaName}`, `Combined ${allSplitFormulas.length} split item(s) back into one.`);
  };

  // Second batch quantity is always the remaining (total - 1)
  const secondBatchQty = selectedFormula ? (selectedFormula.qty || 1) - 1 : 0;
  
  // Calculate volume per tote for display in modal
  const volumePerTote = selectedFormula && selectedFormula.qty > 0 
    ? Math.round((selectedFormula.volume / selectedFormula.qty) * 100) / 100 
    : 0;
  const firstBatchVolume = volumePerTote; // 1 tote
  const secondBatchVolume = Math.round(volumePerTote * secondBatchQty * 100) / 100;

  const handleFilterClick = (columnKey, event) => {
    event.stopPropagation();
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

  // Locking a formula means it will NOT be affected by filters
  // Use formula name as the identifier since it's stable
  const handleToggleLock = (formulaId) => {
    // Find the formula name from the ID
    const formula = formulas.find(f => f.id === formulaId);
    const formulaName = formula?.formula;
    
    if (!formulaName) {
      console.error('Formula not found for ID:', formulaId, 'Available formulas:', formulas.map(f => ({ id: f.id, formula: f.formula })));
      return;
    }
    
    setLockedFormulaIds((prev) => {
      const next = new Set(prev);
      if (next.has(formulaName)) {
        next.delete(formulaName);
        console.log('Unlocked formula:', formulaName);
      } else {
        next.add(formulaName);
        console.log('Locked formula:', formulaName);
      }
      console.log('Current locked formula names:', Array.from(next));
      return next;
    });
  };

  const handleApplyFilter = (columnKey, filterData) => {
    // If filterData is null, remove the filter (Reset was clicked)
    if (filterData === null) {
      setFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[columnKey];
        return newFilters;
      });
      // Also clear sort config for this column
      setSortConfig(prev => prev.filter(sort => sort.column !== columnKey));
      return;
    }
    
    setFilters(prev => ({
      ...prev,
      [columnKey]: filterData,
    }));
    
    // If sortOrder is provided, apply one-time sort to formulas array
    // Locked items maintain their positions, only unlocked items are sorted
    if (filterData.sortOrder) {
      setFormulas(prevFormulas => {
        // Separate locked and unlocked formulas
        const lockedFormulas = [];
        const unlockedFormulas = [];
        
        prevFormulas.forEach((formula, index) => {
          if (lockedFormulaIds.has(formula.formula)) {
            lockedFormulas.push({ formula, originalIndex: index });
          } else {
            unlockedFormulas.push(formula);
          }
        });
        
        // Sort only unlocked formulas
        unlockedFormulas.sort((a, b) => {
          const aVal = a[columnKey];
          const bVal = b[columnKey];
          
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
        
        // Rebuild the array: locked items at their original positions, sorted unlocked items fill the rest
        const result = [];
        let unlockedIndex = 0;
        
        for (let i = 0; i < prevFormulas.length; i++) {
          const lockedItem = lockedFormulas.find(lf => lf.originalIndex === i);
          if (lockedItem) {
            result.push(lockedItem.formula);
          } else if (unlockedIndex < unlockedFormulas.length) {
            result.push(unlockedFormulas[unlockedIndex]);
            unlockedIndex++;
          }
        }
        
        return result;
      });
      
      // Clear sort config for this column (one-time sort, not persistent)
      setSortConfig(prev => prev.filter(sort => sort.column !== columnKey));
    } else {
      // If sortOrder is empty, remove sort from config
      setSortConfig(prev => prev.filter(sort => sort.column !== columnKey));
    }
    // Keep the dropdown open so user can continue configuring multiple filters
    // setOpenFilterColumn(null);
  };

  // Get unique values for a column
  const getColumnValues = (columnKey) => {
    const values = new Set();
    formulas.forEach(formula => {
      const val = formula[columnKey];
      if (val !== undefined && val !== null && val !== '') {
        values.add(val);
      }
    });
    // Sort values
    const sortedValues = Array.from(values).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
      }
      return String(a).localeCompare(String(b));
    });
    return sortedValues;
  };

  // Get sort priority for a column (1 = primary, 2 = secondary, etc., or null if not sorted)
  const getSortPriority = (columnKey) => {
    const index = sortConfig.findIndex(sort => sort.column === columnKey);
    return index >= 0 ? index + 1 : null;
  };

  // Get sort order for a column
  const getSortOrder = (columnKey) => {
    const sort = sortConfig.find(sort => sort.column === columnKey);
    return sort ? sort.order : '';
  };

  // Check if a column has active filters (excludes sort - only checks for Filter by Values and Filter by Conditions)
  const hasActiveFilter = (columnKey) => {
    const filter = filters[columnKey];
    if (!filter) return false;
    
    // Check for condition filter
    const hasCondition = filter.conditionType && filter.conditionType !== '';
    if (hasCondition) return true;
    
    // Check for value filters - only active if not all values are selected
    if (!filter.selectedValues || filter.selectedValues.size === 0) return false;
    
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

  // Apply condition filter to a value
  const applyConditionFilter = (value, conditionType, conditionValue, isNumeric = false) => {
    if (!conditionType) return true;
    
    const strValue = String(value || '').toLowerCase();
    const strCondition = String(conditionValue || '').toLowerCase();
    
    switch (conditionType) {
      case 'contains':
        return strValue.includes(strCondition);
      case 'notContains':
        return !strValue.includes(strCondition);
      case 'equals':
        if (isNumeric) {
          return Number(value) === Number(conditionValue);
        }
        return strValue === strCondition;
      case 'notEquals':
        if (isNumeric) {
          return Number(value) !== Number(conditionValue);
        }
        return strValue !== strCondition;
      case 'startsWith':
        return strValue.startsWith(strCondition);
      case 'endsWith':
        return strValue.endsWith(strCondition);
      case 'isEmpty':
        return !value || strValue === '';
      case 'isNotEmpty':
        return value && strValue !== '';
      case 'greaterThan':
        return Number(value) > Number(conditionValue);
      case 'lessThan':
        return Number(value) < Number(conditionValue);
      case 'greaterOrEqual':
        return Number(value) >= Number(conditionValue);
      case 'lessOrEqual':
        return Number(value) <= Number(conditionValue);
      default:
        return true;
    }
  };

  // Apply filters to formulas
  // Locked items maintain their positions and are not affected by filters
  // Note: Sorting is now one-time (applied directly to formulas array), not continuous
  const getFilteredAndSortedFormulas = () => {
    // Separate locked and unlocked formulas
    const lockedFormulas = [];
    const unlockedFormulas = [];
    
    formulas.forEach((formula, index) => {
      if (lockedFormulaIds.has(formula.formula)) {
        lockedFormulas.push({ formula, originalIndex: index });
      } else {
        unlockedFormulas.push(formula);
      }
    });

    // Apply filters to unlocked formulas only
    let filteredUnlocked = [...unlockedFormulas];
    
    Object.keys(filters).forEach(columnKey => {
      const filter = filters[columnKey];
      const isNumericColumn = columnKey === 'qty' || columnKey === 'volume';
      
      // Apply value filters (checkbox selections)
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        filteredUnlocked = filteredUnlocked.filter(formula => {
          const formulaValue = formula[columnKey];
          // Check if value matches (handle both string and number comparisons)
          return filter.selectedValues.has(formulaValue) || 
                 filter.selectedValues.has(String(formulaValue));
        });
      }
      
      // Apply condition filters
      if (filter.conditionType) {
        filteredUnlocked = filteredUnlocked.filter(formula => {
          return applyConditionFilter(
            formula[columnKey],
            filter.conditionType,
            filter.conditionValue,
            isNumericColumn
          );
        });
      }
    });

    // Rebuild the array: locked items at their original positions, filtered unlocked items fill the rest
    const result = [];
    let unlockedIndex = 0;
    
    for (let i = 0; i < formulas.length; i++) {
      const lockedItem = lockedFormulas.find(lf => lf.originalIndex === i);
      if (lockedItem) {
        result.push(lockedItem.formula);
      } else if (unlockedIndex < filteredUnlocked.length) {
        result.push(filteredUnlocked[unlockedIndex]);
        unlockedIndex++;
      }
    }

    return result;
  };

  const filteredFormulas = getFilteredAndSortedFormulas();

  return (
    <div 
      ref={tableContainerRef}
      style={{
        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
        borderRadius: '12px',
        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
        overflow: 'hidden',
      }}
    >
      {/* Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}>
          {/* Header */}
          <thead>
            <tr
              style={{
                backgroundColor: '#1C2634',
                borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                height: '40px',
              }}
            >
              {columns.map((column) => {
                const isActive = hasActiveFilter(column.key);
                return (
                <th
                  key={column.key}
                  className={
                    column.key === 'drag' || column.key === 'menu'
                      ? undefined
                      : 'group'
                  }
                  style={{
                    padding:
                      column.key === 'drag' || column.key === 'menu' ? '0 8px' : '12px 16px',
                    textAlign:
                      column.key === 'drag' || column.key === 'menu' ? 'center' : 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isActive ? '#3B82F6' : '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: column.width,
                    whiteSpace: 'nowrap',
                    borderRight:
                      column.key === 'drag' || column.key === 'menu'
                        ? 'none'
                        : '1px solid #FFFFFF',
                    height: '40px',
                    position:
                      column.key === 'drag' || column.key === 'menu' ? 'static' : 'relative',
                    backgroundColor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  }}
                >
                  {column.key === 'drag' || column.key === 'menu' ? (
                    column.label
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {column.label}
                        {isActive && (
                          <span style={{ 
                            display: 'inline-block',
                            width: '6px', 
                            height: '6px', 
                            borderRadius: '50%', 
                            backgroundColor: '#10B981',
                          }} />
                        )}
                      </span>
                      <img
                        src="/assets/Vector (1).png"
                        alt="Filter"
                        className={`w-3 h-3 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        ref={(el) => {
                          if (el) {
                            filterIconRefs.current[column.key] = el;
                          }
                        }}
                        onClick={(e) => handleFilterClick(column.key, e)}
                        style={{ 
                          width: '12px', 
                          height: '12px', 
                          cursor: 'pointer',
                          filter: isActive ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
                        }}
                      />
                    </div>
                  )}
                </th>
                );
              })}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {filteredFormulas.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length} 
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: isDarkMode ? '#9CA3AF' : '#6B7280',
                    fontSize: '14px',
                  }}
                >
                  No formulas to sort. Add products to the shipment first.
                </td>
              </tr>
            ) : filteredFormulas.map((formula, index) => {
              const isLocked = lockedFormulaIds.has(formula.formula);
              const isDragging = draggedIndex === index || (selectedIndices.has(index) && selectedIndices.size > 1 && draggedIndex !== null);
              const isDragOver = dragOverIndex === index;
              const isSelected = selectedIndices.has(index);
              const showDropLineAbove = dropPosition && dropPosition.index === index && dropPosition.position === 'above';
              const showDropLineBelow = dropPosition && dropPosition.index === index && dropPosition.position === 'below';
              
              return (
              <React.Fragment key={formula.id}>
                {/* Drop line above the row */}
                {showDropLineAbove && (
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{
                        padding: 0,
                        height: '2px',
                        backgroundColor: '#3B82F6',
                        border: 'none',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          top: 0,
                          height: '2px',
                          backgroundColor: '#3B82F6',
                          boxShadow: '0 0 4px rgba(59, 130, 246, 0.6)',
                        }}
                      />
                    </td>
                  </tr>
                )}
                <tr
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={(e) => handleRowClick(e, index)}
                  style={{
                    backgroundColor: isDragging
                      ? (isDarkMode ? '#4B5563' : '#E5E7EB')
                      : isSelected
                      ? (isDarkMode ? '#1E3A5F' : '#DBEAFE')
                      : index % 2 === 0
                      ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                      : (isDarkMode ? '#1A1F2E' : '#F9FAFB'),
                    borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                    borderLeft: isSelected ? '3px solid #3B82F6' : 'none',
                    transition: isDragging ? 'none' : 'background-color 0.2s',
                    height: '40px',
                    opacity: isDragging ? 0.5 : 1,
                    cursor: isDragging ? 'grabbing' : 'grab',
                    boxShadow: isDragging ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
                    zIndex: isDragging ? 1000 : 'auto',
                    position: isDragging ? 'relative' : 'static',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDragging && draggedIndex === null) {
                      e.currentTarget.style.backgroundColor = isSelected
                        ? (isDarkMode ? '#1E3A5F' : '#DBEAFE')
                        : (isDarkMode ? '#374151' : '#F3F4F6');
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDragging && draggedIndex === null) {
                      e.currentTarget.style.backgroundColor = isSelected
                        ? (isDarkMode ? '#1E3A5F' : '#DBEAFE')
                        : index % 2 === 0
                        ? (isDarkMode ? '#1F2937' : '#FFFFFF')
                        : (isDarkMode ? '#1A1F2E' : '#F9FAFB');
                    }
                  }}
                >
                <td style={{
                  padding: '0 8px',
                  textAlign: 'center',
                  height: '40px',
                }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        cursor: isDragging ? 'grabbing' : 'grab',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 'fit-content',
                        pointerEvents: 'none', // Prevent double drag events
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="3" width="12" height="2" rx="1" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                        <rect x="2" y="7" width="12" height="2" rx="1" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                        <rect x="2" y="11" width="12" height="2" rx="1" fill={isDarkMode ? '#9CA3AF' : '#6B7280'}/>
                      </svg>
                    </div>

                    {/* Lock / Unlock icon beside hamburger */}
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleToggleLock(formula.id);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                    >
                      {isLocked ? (
                        <img
                          src="/assets/lock.png"
                          alt="Lock"
                          style={{
                            width: '12px',
                            height: '15.75px',
                            display: 'block',
                            position: 'relative',
                            top: '0.75px',
                            left: '3px',
                          }}
                        />
                      ) : (
                        <img
                          src="/assets/unlock.png"
                          alt="Unlock"
                          style={{
                            width: '12px',
                            height: '15.75px',
                            display: 'block',
                            position: 'relative',
                            top: '0.75px',
                            left: '3px',
                          }}
                        />
                      )}
                    </div>
                  </div>
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span>{formula.formula}</span>
                  {formula.splitTag && (
                    <img
                      src="/assets/split.png"
                      alt="Split"
                      style={{
                        width: 'auto',
                        height: '16px',
                        display: 'inline-block',
                      }}
                    />
                  )}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.size}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.qty}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.tote}
                </td>
                <td style={{
                  padding: '0 16px',
                  height: '40px',
                }}>
                  <input
                    type="text"
                    value={formula.volume}
                    readOnly
                    style={{
                      width: '107px',
                      height: '24px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #D1D5DB',
                      backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                      color: isDarkMode ? '#E5E7EB' : '#374151',
                      fontSize: '14px',
                      fontWeight: 400,
                      textAlign: 'center',
                      outline: 'none',
                      cursor: 'default',
                      boxSizing: 'border-box',
                    }}
                  />
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.measure}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {formula.type}
                </td>
                <td style={{
                  padding: '0 16px',
                  textAlign: 'center',
                  height: '40px',
                }}>
                  <button
                    type="button"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#3B82F6">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8" fill="#3B82F6"/>
                      <line x1="16" y1="13" x2="8" y2="13" stroke="white" strokeWidth="2"/>
                      <line x1="16" y1="17" x2="8" y2="17" stroke="white" strokeWidth="2"/>
                      <polyline points="10 9 9 9 8 9" stroke="white" strokeWidth="2"/>
                    </svg>
                  </button>
                </td>
                <td style={{
                  padding: '0 8px',
                  textAlign: 'center',
                  height: '40px',
                  position: 'relative',
                }}>
                  <button
                    type="button"
                    onClick={(e) => handleMenuClick(e, index)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#E5E7EB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDarkMode ? '#9CA3AF' : '#6B7280'} strokeWidth="2">
                      <circle cx="12" cy="5" r="1" fill="currentColor"/>
                      <circle cx="12" cy="12" r="1" fill="currentColor"/>
                      <circle cx="12" cy="19" r="1" fill="currentColor"/>
                    </svg>
                  </button>
                  
                  {/* Dropdown Menu */}
                  {openMenuIndex === index && (
                    <div
                      ref={(el) => { menuRefs.current[index] = el; }}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        right: '100%',
                        transform: 'translateY(-50%)',
                        marginRight: '-4px',
                        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        minWidth: '160px',
                        zIndex: 1000,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Show Split Formula option for all formulas (parent and split items) */}
                      {formula.qty > 1 && (
                        <button
                          type="button"
                          onClick={() => handleMenuAction('split', formula)}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: isDarkMode ? '#E5E7EB' : '#374151',
                            fontSize: '14px',
                            fontWeight: 400,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 16 16" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ flexShrink: 0 }}
                          >
                            {/* Vertical line */}
                            <line 
                              x1="8" 
                              y1="10" 
                              x2="8" 
                              y2="14" 
                              stroke="currentColor" 
                              strokeWidth="1.5" 
                              strokeLinecap="round"
                            />
                            {/* Left branch pointing up and left */}
                            <line 
                              x1="8" 
                              y1="10" 
                              x2="4.5" 
                              y2="6.5" 
                              stroke="currentColor" 
                              strokeWidth="1.5" 
                              strokeLinecap="round"
                            />
                            <polygon 
                              points="4.5,6.5 4,6 3.5,6.5" 
                              fill="currentColor"
                            />
                            {/* Right branch pointing up and right */}
                            <line 
                              x1="8" 
                              y1="10" 
                              x2="11.5" 
                              y2="6.5" 
                              stroke="currentColor" 
                              strokeWidth="1.5" 
                              strokeLinecap="round"
                            />
                            <polygon 
                              points="11.5,6.5 12,6 12.5,6.5" 
                              fill="currentColor"
                            />
                          </svg>
                          <span>Split Formula</span>
                        </button>
                      )}
                      
                      {/* Show Undo All Splits option for split items */}
                      {formula.splitTag && (
                        <button
                          type="button"
                          onClick={() => handleMenuAction('undoAllSplits', formula)}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            color: isDarkMode ? '#E5E7EB' : '#374151',
                            fontSize: '14px',
                            fontWeight: 400,
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 16 16" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                            style={{ flexShrink: 0 }}
                          >
                            {/* Arrow pointing left (undo icon) */}
                            <path 
                              d="M3 8L1 6L3 4" 
                              stroke="currentColor" 
                              strokeWidth="1.5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            />
                            <line 
                              x1="1" 
                              y1="6" 
                              x2="15" 
                              y2="6" 
                              stroke="currentColor" 
                              strokeWidth="1.5" 
                              strokeLinecap="round"
                            />
                          </svg>
                          <span>Undo All Splits</span>
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
              {/* Drop line below the row */}
              {showDropLineBelow && (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{
                      padding: 0,
                      height: '2px',
                      backgroundColor: '#3B82F6',
                      border: 'none',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: 0,
                        height: '2px',
                        backgroundColor: '#3B82F6',
                        boxShadow: '0 0 4px rgba(59, 130, 246, 0.6)',
                      }}
                    />
                  </td>
                </tr>
              )}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Column Filter Dropdowns - Multiple can be open at once */}
      {Array.from(openFilterColumns).map((columnKey) => {
        if (!filterIconRefs.current[columnKey]) return null;
        return (
          <SortFormulasFilterDropdown
            key={columnKey}
            filterIconRef={filterIconRefs.current[columnKey]}
            columnKey={columnKey}
            availableValues={getColumnValues(columnKey)}
            currentFilter={filters[columnKey] || {}}
            currentSort={getSortOrder(columnKey)}
            onApply={(filterData) => handleApplyFilter(columnKey, filterData)}
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

      {/* Split Formula Volume Modal */}
      {isSplitModalOpen && (
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
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={handleCloseSplitModal}
          >
            {/* Modal */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                width: '500px',
                maxWidth: '90vw',
                border: '1px solid #E5E7EB',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                zIndex: 10001,
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
                backgroundColor: '#1C2634',
              }}>
                <h2 style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  margin: 0,
                }}>
                  Split Formula Volume
                </h2>
                <button
                  type="button"
                  onClick={handleCloseSplitModal}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    width: '24px',
                    height: '24px',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div style={{ 
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                padding: '24px',
              }}>
                {/* Formula Info */}
                {selectedFormula && (
                  <div style={{
                    backgroundColor: '#F3F4F6',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                      {selectedFormula.formula}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>
                      Total: {selectedFormula.qty} tote{selectedFormula.qty > 1 ? 's' : ''} • {selectedFormula.volume} gallons
                    </div>
                  </div>
                )}

                {/* First Batch */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    First Batch
                  </label>
                  <p style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    margin: '0 0 12px 0',
                  }}>
                    The first batch is always 1 tote.
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>
                        Totes
                      </label>
                      <input
                        type="number"
                        value={1}
                        readOnly
                        style={{
                          width: '100%',
                          height: '40px',
                          padding: '0 12px',
                          borderRadius: '6px',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#F9FAFB',
                          color: '#6B7280',
                          fontSize: '14px',
                          fontWeight: 400,
                          outline: 'none',
                          cursor: 'not-allowed',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>
                        Volume (Gallons)
                      </label>
                      <input
                        type="text"
                        value={firstBatchVolume}
                        readOnly
                        style={{
                          width: '100%',
                          height: '40px',
                          padding: '0 12px',
                          borderRadius: '6px',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#F9FAFB',
                          color: '#6B7280',
                          fontSize: '14px',
                          fontWeight: 400,
                          outline: 'none',
                          cursor: 'not-allowed',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Second Batch */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px',
                  }}>
                    Second Batch
                  </label>
                  <p style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    margin: '0 0 12px 0',
                  }}>
                    The remaining totes after the split.
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>
                        Totes
                      </label>
                      <input
                        type="number"
                        value={secondBatchQty}
                        readOnly
                        style={{
                          width: '100%',
                          height: '40px',
                          padding: '0 12px',
                          borderRadius: '6px',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#F9FAFB',
                          color: '#6B7280',
                          fontSize: '14px',
                          fontWeight: 400,
                          outline: 'none',
                          cursor: 'not-allowed',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>
                        Volume (Gallons)
                      </label>
                      <input
                        type="text"
                        value={secondBatchVolume}
                        readOnly
                        style={{
                          width: '100%',
                          height: '40px',
                          padding: '0 12px',
                          borderRadius: '6px',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#F9FAFB',
                          color: '#6B7280',
                          fontSize: '14px',
                          fontWeight: 400,
                          outline: 'none',
                          cursor: 'not-allowed',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ 
                padding: '16px 24px',
                borderTop: '1px solid #E5E7EB',
                display: 'flex', 
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#FFFFFF',
              }}>
                <button
                  type="button"
                  onClick={handleCloseSplitModal}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: '#FFFFFF',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 500,
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
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSplit}
                  disabled={!selectedFormula || (selectedFormula?.qty || 1) <= 1}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: (!selectedFormula || (selectedFormula?.qty || 1) <= 1) ? '#9CA3AF' : '#3B82F6',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: (!selectedFormula || (selectedFormula?.qty || 1) <= 1) ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedFormula && (selectedFormula?.qty || 1) > 1) {
                      e.currentTarget.style.backgroundColor = '#2563EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFormula && (selectedFormula?.qty || 1) > 1) {
                      e.currentTarget.style.backgroundColor = '#3B82F6';
                    }
                  }}
                >
                  Confirm Split
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      {onCompleteClick && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            left: `calc(${sidebarWidth}px + (100vw - ${sidebarWidth}px) / 2)`,
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
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            {/* Empty left side */}
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onCompleteClick}
              style={{
                height: '38px',
                padding: '0 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#007AFF',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0056CC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#007AFF';
              }}
            >
              Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SortFormulasTable;
