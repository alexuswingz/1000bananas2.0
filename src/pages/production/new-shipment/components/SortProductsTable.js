import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import SortProductsFilterDropdown from './SortProductsFilterDropdown';
import { showInfoToast } from '../../../../utils/notifications';

const SortProductsTable = ({ shipmentProducts = [], shipmentType = 'AWD', shipmentId = null }) => {
  const { isDarkMode } = useTheme();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // { index: number, position: 'above' | 'below' }
  const [lockedProductIds, setLockedProductIds] = useState(() => new Set());
  const [openFilterColumns, setOpenFilterColumns] = useState(() => new Set());
  const filterIconRefs = useRef({});
  const filterDropdownRefs = useRef({}); // Store refs to dropdown DOM elements
  const tableContainerRef = useRef(null);
  const [filters, setFilters] = useState({});
  // sortConfig is now an array of sort objects: [{column: 'size', order: 'asc'}, {column: 'formula', order: 'asc'}]
  // The order in the array determines the sort priority (first = primary, second = secondary, etc.)
  const [sortConfig, setSortConfig] = useState([]);
  
  // Selection state for bulk operations
  const [selectedIndices, setSelectedIndices] = useState(() => new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);

  // Split functionality state
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const menuRefs = useRef({});
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [firstBatchQty, setFirstBatchQty] = useState(1);
  const splitsLoadedRef = useRef(null); // Track which shipmentId we've loaded splits for
  const isUndoingSplitRef = useRef(false); // Flag to prevent reloading splits during undo

  // Transform shipment products into table format
  const [products, setProducts] = useState([]);
  const locksLoadedRef = useRef(null); // Track which shipmentId we've loaded locks for
  const previousShipmentIdRef = useRef(null); // Track previous shipmentId to detect actual changes
  const orderLoadedRef = useRef(null); // Track which shipmentId we've loaded order for
  const isInitialOrderLoadRef = useRef(true); // Track if we're in initial order load phase
  const isRestoringRef = useRef(false); // Track if we're currently restoring order

  // Helper function to get a stable identifier for a product
  // Uses product properties (brand + product + size) + splitTag (if exists) as unique identifier
  // This ensures the identifier is stable even if product IDs change
  const getProductIdentifier = (product) => {
    const baseIdentifier = `${product.brand || ''}::${product.product || ''}::${product.size || ''}`;
    return product.splitTag ? `${baseIdentifier}::${product.splitTag}` : baseIdentifier;
  };

  // Helper function to get the increment step based on product size
  // Returns the step value for the number input (e.g., 4 for Gallons, 12 for Quarts, 60 for 8oz, 1 for others)
  const getIncrementStep = (size) => {
    if (!size) return 1;
    const sizeLower = (size || '').toLowerCase();
    if (sizeLower.includes('gallon') && !sizeLower.includes('5')) {
      return 4; // Gallons increment by 4
    }
    if (sizeLower.includes('quart') || sizeLower.includes('32oz') || sizeLower === '32 oz') {
      return 12; // Quarts increment by 12
    }
    if (sizeLower.includes('8oz') || sizeLower.includes('8 oz')) {
      return 60; // 8oz increment by 60
    }
    // For other sizes, increment by 1
    return 1;
  };

  // Save product order to localStorage
  const saveProductOrder = (productsToSave) => {
    if (!shipmentId || isInitialOrderLoadRef.current) return;
    
    try {
      const order = productsToSave.map(p => getProductIdentifier(p));
      localStorage.setItem(`sortProductsOrder_${shipmentId}`, JSON.stringify(order));
      console.log('Saved product order:', order);
    } catch (error) {
      console.error('Error saving product order to localStorage:', error);
    }
  };

  // Reset locks loaded flag when shipmentId actually changes (not on remount)
  useEffect(() => {
    const previousShipmentId = previousShipmentIdRef.current;
    previousShipmentIdRef.current = shipmentId;
    
    // Only clear locks if shipmentId actually changed to a different value
    if (previousShipmentId !== null && previousShipmentId !== shipmentId) {
      locksLoadedRef.current = null;
      orderLoadedRef.current = null;
      splitsLoadedRef.current = null;
      isInitialOrderLoadRef.current = true;
      setLockedProductIds(new Set());
    } else if (previousShipmentId === null && shipmentId !== null) {
      // Initial mount with shipmentId - mark order load as initial
      isInitialOrderLoadRef.current = true;
    }
  }, [shipmentId]);

  // Update products when shipmentProducts prop changes
  useEffect(() => {
    // Don't reload if we're in the middle of undoing a split
    if (isUndoingSplitRef.current) {
      isUndoingSplitRef.current = false;
      return;
    }
    
    if (shipmentProducts && shipmentProducts.length > 0) {
      const transformedProducts = shipmentProducts.map((product, index) => ({
        id: product.id || product.catalogId || product.catalog_id || `product_${index}`,
        type: shipmentType,
        brand: product.brand || '',
        product: product.product || '',
        size: product.size || '',
        qty: product.qty || 0,
        formula: product.formula_name || product.formula || '',
        volume: product.volume || product.volume_gallons || '',
        productType: 'Liquid', // Default to Liquid for fertilizers
      }));
      
      // Load and apply saved splits before setting products
      // Always reload splits when products are regenerated to ensure they persist across navigation
      let finalProducts = [...transformedProducts];
      // Find the max ID to ensure unique IDs for split products
      const maxId = finalProducts.length > 0 ? Math.max(...finalProducts.map(p => p.id || 0), 0) : 0;
      let nextId = maxId + 1;
      
      if (shipmentId) {
        try {
          const storedSplits = localStorage.getItem(`sortProductsSplits_${shipmentId}`);
          if (storedSplits) {
            const parsedSplits = JSON.parse(storedSplits);
            if (Array.isArray(parsedSplits) && parsedSplits.length > 0) {
              // Group splits by product ID to handle multiple splits on the same product
              // Note: productId in splits is the base product ID, but we'll match by stable identifier
              const splitsByProductId = {};
              parsedSplits.forEach((splitInfo) => {
                const { productId } = splitInfo;
                if (!splitsByProductId[productId]) {
                  splitsByProductId[productId] = [];
                }
                splitsByProductId[productId].push(splitInfo);
              });
              
              // Apply splits: for each product ID with splits, find the product by ID or by stable identifier
              // and replace ALL products with that identifier with the stored split products
              Object.keys(splitsByProductId).forEach((productId) => {
                const splitInfo = splitsByProductId[productId][splitsByProductId[productId].length - 1];
                const stableIdentifier = splitInfo.stableIdentifier;
                
                // First, try to find products by ID (for backward compatibility)
                let matchingIndices = [];
                finalProducts.forEach((p, idx) => {
                  if (p.id === productId || (p.originalId && p.originalId === productId)) {
                    matchingIndices.push(idx);
                  }
                });
                
                // If no match by ID and we have a stable identifier, try to find by stable identifier
                if (matchingIndices.length === 0 && stableIdentifier) {
                  finalProducts.forEach((p, idx) => {
                    // Match by stable identifier (base identifier without splitTag)
                    const pFullIdentifier = getProductIdentifier(p);
                    const pStableIdentifier = p.splitTag 
                      ? pFullIdentifier.replace(`::${p.splitTag}`, '')
                      : pFullIdentifier;
                    if (pStableIdentifier === stableIdentifier && !p.splitTag) {
                      matchingIndices.push(idx);
                    }
                  });
                }
                
                // If still no match, try to find products that might be the base product
                if (matchingIndices.length === 0) {
                  // Look for products without splitTag that could be the original
                  finalProducts.forEach((p, idx) => {
                    if (!p.splitTag && (p.id === productId || p.id?.startsWith(productId))) {
                      matchingIndices.push(idx);
                    }
                  });
                }
                
                if (matchingIndices.length === 0) {
                  console.warn('Could not find product to restore split. ProductId:', productId, 'StableIdentifier:', stableIdentifier, 'Available products:', finalProducts.map(p => ({ id: p.id, identifier: getProductIdentifier(p) })));
                }
                
                if (matchingIndices.length > 0) {
                  // Get the most recent split info for this product (already retrieved above)
                  const { firstBatch, secondBatch, additionalBatches = [] } = splitInfo;
                  
                  // Get the first matching product as template (use the first unsplit one if available, otherwise any)
                  const templateIndex = matchingIndices.find(idx => !finalProducts[idx].splitTag) || matchingIndices[0];
                  const templateProduct = finalProducts[templateIndex];
                  
                  // Use the template product's ID as the base (not the saved productId which might be outdated)
                  const baseIdForSplits = templateProduct.id;
                  
                  // Remove all products with this ID
                  // Sort indices descending to remove from end first
                  matchingIndices.sort((a, b) => b - a).forEach(idx => {
                    finalProducts.splice(idx, 1);
                  });
                  
                  // Create all split products
                  const splitProducts = [];
                  const totalBatches = 2 + additionalBatches.length;
                  
                  // First batch
                  splitProducts.push({
                    ...templateProduct,
                    id: `${baseIdForSplits}_split_1`,
                    qty: firstBatch.qty,
                    volume: firstBatch.volume !== undefined ? firstBatch.volume : templateProduct.volume,
                    splitTag: firstBatch.splitTag || `1/${totalBatches}`,
                    originalId: baseIdForSplits,
                  });
                  
                  // Second batch
                  splitProducts.push({
                    ...templateProduct,
                    id: `${baseIdForSplits}_split_2`,
                    qty: secondBatch.qty,
                    volume: secondBatch.volume !== undefined ? secondBatch.volume : templateProduct.volume,
                    splitTag: secondBatch.splitTag || `2/${totalBatches}`,
                    originalId: baseIdForSplits,
                  });
                  
                  // Additional batches (for multiple splits)
                  additionalBatches.forEach((batch, idx) => {
                    splitProducts.push({
                      ...templateProduct,
                      id: `${baseIdForSplits}_split_${idx + 3}`,
                      qty: batch.qty,
                      volume: batch.volume !== undefined ? batch.volume : templateProduct.volume,
                      splitTag: batch.splitTag || `${idx + 3}/${totalBatches}`,
                      originalId: baseIdForSplits,
                    });
                  });
                  
                  // Insert at the position of the first removed product
                  const insertIndex = Math.min(...matchingIndices);
                  finalProducts.splice(insertIndex, 0, ...splitProducts);
                  
                  console.log('Applied split for product:', productId, 'total batches:', splitProducts.length, 'split product IDs:', splitProducts.map(p => p.id), 'batches:', splitProducts.map(p => ({ qty: p.qty, tag: p.splitTag })));
                } else {
                  console.warn('Could not find product to apply split:', productId, 'Available products:', finalProducts.map(p => p.id));
                }
              });
              console.log('Applied', parsedSplits.length, 'saved splits');
            }
          }
          splitsLoadedRef.current = shipmentId;
        } catch (error) {
          console.error('Error loading sort products splits from localStorage:', error);
        }
      }
      
      // Restore saved order if it exists
      // Always restore order when products are regenerated (on mount or when shipmentProducts changes)
      // Use finalProducts (which includes splits) for order restoration
      let orderedProducts = finalProducts;
      
      if (shipmentId) {
        // Set initial load flag to true before restoring to prevent saving during restoration
        const wasInitialLoad = isInitialOrderLoadRef.current;
        if (orderLoadedRef.current !== shipmentId) {
          isInitialOrderLoadRef.current = true;
        }
        
        try {
          const storedOrder = localStorage.getItem(`sortProductsOrder_${shipmentId}`);
          if (storedOrder) {
            const parsedOrder = JSON.parse(storedOrder);
            if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
              // Create a map of identifier -> product for quick lookup
              // Use finalProducts which includes split products
              // Support both stable identifiers and product IDs for backward compatibility
              const productMap = new Map();
              const productIdMap = new Map(); // Map for backward compatibility with old product ID-based orders
              
              finalProducts.forEach(p => {
                const identifier = getProductIdentifier(p);
                productMap.set(identifier, p);
                // Also map by product ID for backward compatibility
                productIdMap.set(p.id, p);
              });
              
              // Reorder products according to saved order
              const ordered = [];
              const usedIdentifiers = new Set();
              const usedIds = new Set(); // Track used product IDs for backward compatibility
              
              // First, add products in the saved order
              // Try to match by stable identifier first, then by product ID (for backward compatibility)
              parsedOrder.forEach(identifier => {
                // Try stable identifier first (new format)
                if (productMap.has(identifier) && !usedIdentifiers.has(identifier)) {
                  ordered.push(productMap.get(identifier));
                  usedIdentifiers.add(identifier);
                  usedIds.add(productMap.get(identifier).id);
                } 
                // Try product ID for backward compatibility (old format)
                else if (productIdMap.has(identifier) && !usedIds.has(identifier)) {
                  const product = productIdMap.get(identifier);
                  ordered.push(product);
                  usedIds.add(identifier);
                  usedIdentifiers.add(getProductIdentifier(product));
                } 
                else if (!productMap.has(identifier) && !productIdMap.has(identifier)) {
                  // Log missing products for debugging
                  console.warn('Product identifier in saved order not found:', identifier);
                }
              });
              
              // Then, add any products that weren't in the saved order (new products, split products, or products with changed identifiers)
              finalProducts.forEach(p => {
                const identifier = getProductIdentifier(p);
                if (!usedIdentifiers.has(identifier) && !usedIds.has(p.id)) {
                  ordered.push(p);
                  usedIdentifiers.add(identifier);
                  usedIds.add(p.id);
                }
              });
              
              // Always use the ordered products (they include all products, just reordered)
              // The ordered array should contain all products from finalProducts
              orderedProducts = ordered;
              console.log('Restored product order:', parsedOrder.length, 'IDs in saved order,', finalProducts.length, 'products available,', ordered.length, 'products in restored order');
              console.log('Final product IDs:', orderedProducts.map(p => p.id));
              
              // Warn if count doesn't match (shouldn't happen, but log for debugging)
              if (ordered.length !== finalProducts.length) {
                console.warn('Order restoration count mismatch - some products may be missing or extra:', {
                  savedOrderCount: parsedOrder.length,
                  availableCount: finalProducts.length,
                  restoredCount: ordered.length,
                  missingFromOrder: finalProducts.filter(p => {
                    const id = getProductIdentifier(p);
                    return !usedIdentifiers.has(id) && !usedIds.has(p.id);
                  }).map(p => ({ id: p.id, identifier: getProductIdentifier(p) })),
                  missingFromAvailable: parsedOrder.filter(id => !productMap.has(id) && !productIdMap.has(id))
                });
                
                // If we're missing products, add them at the end to ensure nothing is lost
                if (ordered.length < finalProducts.length) {
                  finalProducts.forEach(p => {
                    const identifier = getProductIdentifier(p);
                    if (!usedIdentifiers.has(identifier) && !usedIds.has(p.id)) {
                      orderedProducts.push(p);
                      console.log('Added missing product to restored order:', p.id, identifier);
                    }
                  });
                }
              }
            }
          }
          
          // Mark that we've checked for order and allow saving after a delay
          if (orderLoadedRef.current !== shipmentId) {
            orderLoadedRef.current = shipmentId;
            // Mark that initial order load is complete after a short delay
            setTimeout(() => {
              isInitialOrderLoadRef.current = false;
            }, 200);
          } else if (wasInitialLoad) {
            // If we were in initial load but already loaded order before, still wait a bit
            setTimeout(() => {
              isInitialOrderLoadRef.current = false;
            }, 200);
          }
        } catch (error) {
          console.error('Error loading product order from localStorage:', error);
          if (orderLoadedRef.current !== shipmentId) {
            orderLoadedRef.current = shipmentId;
            setTimeout(() => {
              isInitialOrderLoadRef.current = false;
            }, 200);
          }
        }
      }
      
      setProducts(orderedProducts);
      
      // Load locked IDs from localStorage whenever products are set
      // This handles both initial mount and remount scenarios
      if (shipmentId) {
        // Only load if we haven't loaded for this shipmentId yet, or if shipmentId changed
        if (locksLoadedRef.current !== shipmentId) {
          try {
            const stored = localStorage.getItem(`sortProductsLocks_${shipmentId}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                // Filter to only include IDs that exist in current products
                const productIds = new Set(orderedProducts.map(p => p.id));
                const validLockedIds = parsed.filter(id => productIds.has(id));
                setLockedProductIds(new Set(validLockedIds));
                console.log('Loaded locked product IDs:', validLockedIds);
              }
            } else {
              // If no stored locks, ensure we start with empty set
              setLockedProductIds(new Set());
            }
            locksLoadedRef.current = shipmentId;
          } catch (error) {
            console.error('Error loading sort products locks from localStorage:', error);
          }
        }
      }
    } else {
      setProducts([]);
    }
  }, [shipmentProducts, shipmentType, shipmentId]);

  // Restore order when products are set and we have a saved order
  // This runs after products are set to ensure order is always restored
  // NOTE: Disabled this useEffect because order restoration is already handled in the main useEffect
  // This was causing issues with split products disappearing
  // useEffect(() => {
  //   if (!shipmentId || products.length === 0 || isInitialOrderLoadRef.current || isRestoringRef.current) return;
  //   
  //   // Check if current order matches any saved order
  //   try {
  //     const storedOrder = localStorage.getItem(`sortProductsOrder_${shipmentId}`);
  //     if (storedOrder) {
  //       const parsedOrder = JSON.parse(storedOrder);
  //       if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
  //         const currentOrder = products.map(p => getProductIdentifier(p));
  //         const orderMatches = currentOrder.length === parsedOrder.length && 
  //           currentOrder.every((id, idx) => id === parsedOrder[idx]);
  //         
  //         if (!orderMatches && parsedOrder.length === products.length) {
  //           // Order doesn't match, restore it
  //           isRestoringRef.current = true;
  //           
  //           const productMap = new Map();
  //           products.forEach(p => {
  //             const identifier = getProductIdentifier(p);
  //             productMap.set(identifier, p);
  //           });
  //           
  //           const ordered = [];
  //           const usedIdentifiers = new Set();
  //           
  //           // First, add products in the saved order
  //           parsedOrder.forEach(identifier => {
  //             if (productMap.has(identifier) && !usedIdentifiers.has(identifier)) {
  //               ordered.push(productMap.get(identifier));
  //               usedIdentifiers.add(identifier);
  //             }
  //           });
  //           
  //           // Then, add any products that weren't in the saved order (new products)
  //           products.forEach(p => {
  //             const identifier = getProductIdentifier(p);
  //             if (!usedIdentifiers.has(identifier)) {
  //               ordered.push(p);
  //               usedIdentifiers.add(identifier);
  //             }
  //           });
  //           
  //           if (ordered.length === products.length) {
  //             // Temporarily prevent saving during restoration
  //             isInitialOrderLoadRef.current = true;
  //             setProducts(ordered);
  //             console.log('Restored product order from useEffect:', parsedOrder);
  //             
  //             // Allow saving after a delay
  //             setTimeout(() => {
  //               isInitialOrderLoadRef.current = false;
  //               isRestoringRef.current = false;
  //             }, 200);
  //           } else {
  //             isRestoringRef.current = false;
  //           }
  //         }
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error checking/restoring product order in useEffect:', error);
  //     isRestoringRef.current = false;
  //   }
  // }, [products, shipmentId]); // Run when products or shipmentId changes

  // Persist locked product IDs to localStorage whenever they change
  useEffect(() => {
    if (!shipmentId) return;

    try {
      const idsArray = Array.from(lockedProductIds);
      localStorage.setItem(`sortProductsLocks_${shipmentId}`, JSON.stringify(idsArray));
    } catch (error) {
      console.error('Error saving sort products locks to localStorage:', error);
    }
  }, [lockedProductIds, shipmentId]);

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterColumns.size > 0) {
        // Check if click is on any filter icon
        const clickedOnFilterIcon = Object.values(filterIconRefs.current).some(ref => 
          ref && ref.contains && ref.contains(event.target)
        );
        
        // Check if click is inside any dropdown (by attribute or ref)
        const clickedInsideDropdown = 
          event.target.closest('[data-filter-dropdown]') ||
          Object.values(filterDropdownRefs.current).some(ref => 
            ref && ref.contains && ref.contains(event.target)
          );
        
        if (!clickedOnFilterIcon && !clickedInsideDropdown) {
          setOpenFilterColumns(new Set());
        }
      }
    };

    if (openFilterColumns.size > 0) {
      // Use mousedown with capture phase to catch clicks early
      document.addEventListener('mousedown', handleClickOutside, true);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [openFilterColumns]);

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

  const columns = [
    { key: 'drag', label: '', width: '50px' },
    { key: 'type', label: 'TYPE', width: '80px' },
    { key: 'brand', label: 'BRAND', width: '150px' },
    { key: 'product', label: 'PRODUCT', width: '200px' },
    { key: 'size', label: 'SIZE', width: '100px' },
    { key: 'qty', label: 'QTY', width: '80px' },
    { key: 'formula', label: 'FORMULA', width: '180px' },
    { key: 'productType', label: 'TYPE', width: '100px' },
    { key: 'notes', label: 'NOTES', width: '80px' },
    { key: 'menu', label: '', width: '50px' },
  ];

  const handleRowClick = (e, index) => {
    // Don't handle selection if clicking on interactive elements
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('img[alt="Lock"]') || e.target.closest('img[alt="Unlock"]') || e.target.closest('img[alt="Split"]')) {
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

    // Work with filtered products for display, but update the original products array
    const filteredList = filteredProducts;
    const dropItem = filteredList[dropIndex];
    
    // Check if we're dragging multiple items
    const isMultiDrag = selectedIndices.size > 1 && selectedIndices.has(draggedIndex);
    
    if (isMultiDrag) {
      // Multi-drag: move all selected items
      const sortedSelectedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
      
      // Step 1: Collect all selected item IDs from the filtered list
      // This preserves the visual order of selection
      const selectedItemIds = [];
      const selectedItemIdsSet = new Set();
      const selectedItemsFromFiltered = []; // Store the actual items for fallback
      
      sortedSelectedIndices.forEach(idx => {
        if (idx >= 0 && idx < filteredList.length) {
          const item = filteredList[idx];
          if (item) {
            selectedItemsFromFiltered.push(item); // Always store the item
            if (item.id) {
              // Track unique IDs
              if (!selectedItemIdsSet.has(item.id)) {
                selectedItemIds.push(item.id);
                selectedItemIdsSet.add(item.id);
              } else {
                // If we've seen this ID before, still add it to handle potential duplicates
                console.warn('Duplicate ID found in selection:', item.id, 'at index:', idx);
                selectedItemIds.push(item.id);
              }
            } else {
              console.warn('Selected item has no ID at index:', idx, 'item:', item);
            }
          } else {
            console.warn('Selected item is null/undefined at index:', idx);
          }
        } else {
          console.warn('Selected index out of bounds:', idx, 'filteredList length:', filteredList.length, 'selectedIndices:', Array.from(selectedIndices));
        }
      });
      
      // Ensure we have the same number of items as selected indices
      if (selectedItemsFromFiltered.length !== selectedIndices.size) {
        console.error('Mismatch in selected items from filtered list:', {
          selectedIndicesCount: selectedIndices.size,
          collectedItemsCount: selectedItemsFromFiltered.length,
          sortedSelectedIndices: sortedSelectedIndices,
          filteredListLength: filteredList.length
        });
      }
      
      // Step 2: Get the actual product objects from the original products array
      // Use selectedItemsFromFiltered directly to ensure we get ALL items in the correct order
      const draggedItems = [];
      const draggedItemIds = new Set();
      const usedProductRefs = new Set(); // Track actual product object references to avoid duplicates
      
      // Match each selected item from filtered list to products array
      // This ensures we get all items even if there are edge cases with IDs
      selectedItemsFromFiltered.forEach((filteredItem, idx) => {
        // First, try to find by ID
        let matchingProduct = null;
        
        if (filteredItem.id) {
          matchingProduct = products.find(p => 
            !usedProductRefs.has(p) && 
            p.id === filteredItem.id
          );
        }
        
        // If not found by ID, try matching by all properties (for edge cases)
        if (!matchingProduct) {
          matchingProduct = products.find(p => 
            !usedProductRefs.has(p) &&
            p.brand === filteredItem.brand && 
            p.product === filteredItem.product && 
            p.size === filteredItem.size &&
            p.formula === filteredItem.formula &&
            (p.splitTag || '') === (filteredItem.splitTag || '') &&
            p.qty === filteredItem.qty
          );
        }
        
        // If still not found, try matching by stable identifier (brand + product + size + splitTag)
        if (!matchingProduct && filteredItem.id) {
          // Try to find by stable identifier as last resort
          const stableId = `${filteredItem.brand || ''}::${filteredItem.product || ''}::${filteredItem.size || ''}${filteredItem.splitTag ? `::${filteredItem.splitTag}` : ''}`;
          matchingProduct = products.find(p => {
            if (usedProductRefs.has(p)) return false;
            const pStableId = `${p.brand || ''}::${p.product || ''}::${p.size || ''}${p.splitTag ? `::${p.splitTag}` : ''}`;
            return pStableId === stableId && p.qty === filteredItem.qty;
          });
        }
        
        if (matchingProduct) {
          draggedItems.push(matchingProduct);
          if (matchingProduct.id) {
            draggedItemIds.add(matchingProduct.id);
          }
          usedProductRefs.add(matchingProduct);
        } else {
          console.error('Could not find matching product for filtered item:', {
            index: idx,
            filteredItem: {
              id: filteredItem.id,
              brand: filteredItem.brand,
              product: filteredItem.product,
              size: filteredItem.size,
              splitTag: filteredItem.splitTag,
              qty: filteredItem.qty
            },
            availableProducts: products.slice(0, 10).map(p => ({
              id: p.id,
              brand: p.brand,
              product: p.product,
              size: p.size,
              splitTag: p.splitTag,
              qty: p.qty
            }))
          });
        }
      });
      
      // Validate we have all items
      if (draggedItems.length !== selectedIndices.size) {
        console.error('Mismatch in dragged items count:', {
          selectedIndicesCount: selectedIndices.size,
          draggedItemsCount: draggedItems.length,
          selectedItemsFromFilteredCount: selectedItemsFromFiltered.length,
          draggedItemIds: Array.from(draggedItemIds),
          draggedItems: draggedItems.map(d => ({ id: d.id, product: d.product, size: d.size, splitTag: d.splitTag, qty: d.qty }))
        });
        
        // If we're missing items, try one more time with a more aggressive matching
        if (draggedItems.length < selectedItemsFromFiltered.length) {
          console.warn('Attempting aggressive recovery of missing items...');
          const missingCount = selectedItemsFromFiltered.length - draggedItems.length;
          let recovered = 0;
          
          selectedItemsFromFiltered.forEach(filteredItem => {
            // Check if we already have this item
            const alreadyHave = draggedItems.some(d => 
              d === filteredItem || // Same object reference
              (d.id && filteredItem.id && d.id === filteredItem.id) || // Same ID
              (d.brand === filteredItem.brand && 
               d.product === filteredItem.product && 
               d.size === filteredItem.size &&
               d.formula === filteredItem.formula &&
               (d.splitTag || '') === (filteredItem.splitTag || '') &&
               d.qty === filteredItem.qty) // Same properties
            );
            
            if (!alreadyHave) {
              // Try to find ANY product that matches, even if already used
              const anyMatch = products.find(p => 
                (p.id && filteredItem.id && p.id === filteredItem.id) ||
                (p.brand === filteredItem.brand && 
                 p.product === filteredItem.product && 
                 p.size === filteredItem.size &&
                 p.formula === filteredItem.formula &&
                 (p.splitTag || '') === (filteredItem.splitTag || '') &&
                 p.qty === filteredItem.qty)
              );
              
              if (anyMatch && !draggedItems.some(d => d === anyMatch)) {
                draggedItems.push(anyMatch);
                if (anyMatch.id) {
                  draggedItemIds.add(anyMatch.id);
                }
                usedProductRefs.add(anyMatch);
                recovered++;
                console.log('Aggressively recovered item:', anyMatch.id || 'no-id', anyMatch.product);
              }
            }
          });
          
          if (recovered > 0) {
            console.log(`Recovered ${recovered} missing item(s)`);
          }
        }
      }
      
      // Final validation - if we still don't have all items, abort but log details
      if (draggedItems.length === 0) {
        console.error('No items to drag in multi-drag operation - aborting');
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDropPosition(null);
        return;
      }
      
      // If we're still missing items, log warning but proceed with what we have
      if (draggedItems.length < selectedIndices.size) {
        console.warn(`Proceeding with ${draggedItems.length} items out of ${selectedIndices.size} selected`);
      }
      
      // Ensure ALL dragged items have their IDs in draggedItemIds set
      // This is critical for proper removal
      draggedItems.forEach(item => {
        if (item && item.id) {
          draggedItemIds.add(item.id);
        } else {
          console.warn('Dragged item has no ID:', item);
        }
      });
      
      // Create a set of all dragged item IDs for removal
      // Also track by object reference as a fallback for items without IDs
      const draggedItemIdsForRemoval = new Set(draggedItemIds);
      const draggedItemRefs = new Set(draggedItems);
      
      // Check if drop item is one of the selected items BEFORE removing (shouldn't happen, but handle it)
      if (draggedItemIdsForRemoval.has(dropItem.id)) {
        // If dropping on a selected item, don't move anything
        setDraggedIndex(null);
        setDragOverIndex(null);
        setDropPosition(null);
        return;
      }
      
      // Create new products array and remove all dragged items
      // Remove by ID first, then by object reference as fallback for items without IDs
      const newProducts = products.filter(p => {
        // Remove if ID matches
        if (p.id && draggedItemIdsForRemoval.has(p.id)) {
          return false;
        }
        // Remove if it's the same object reference (fallback for items without IDs)
        if (draggedItemRefs.has(p)) {
          return false;
        }
        return true;
      });
      
      // Verify we removed the correct number of items
      const removedCount = products.length - newProducts.length;
      if (removedCount !== draggedItems.length) {
        console.error('Mismatch in removed items - some items may be duplicated!', {
          expected: draggedItems.length,
          removed: removedCount,
          draggedItemIds: Array.from(draggedItemIdsForRemoval),
          draggedItems: draggedItems.map(d => ({ id: d.id, product: d.product, size: d.size, splitTag: d.splitTag, qty: d.qty })),
          originalProductsCount: products.length,
          newProductsCount: newProducts.length,
          productsBeforeRemoval: products.map(p => ({ id: p.id, product: p.product, size: p.size, splitTag: p.splitTag, qty: p.qty })),
          productsAfterRemoval: newProducts.map(p => ({ id: p.id, product: p.product, size: p.size, splitTag: p.splitTag, qty: p.qty }))
        });
        
        // If we didn't remove all items, try to identify which ones weren't removed
        const notRemoved = draggedItems.filter(item => {
          const stillExists = newProducts.some(p => 
            p === item || // Same object reference (most reliable)
            (p.id && item.id && p.id === item.id) || // Same ID
            (p.brand === item.brand && 
             p.product === item.product && 
             p.size === item.size &&
             p.formula === item.formula &&
             (p.splitTag || '') === (item.splitTag || '') &&
             p.qty === item.qty) // Same properties
          );
          return stillExists;
        });
        
        if (notRemoved.length > 0) {
          console.error('Items that were NOT removed - forcing removal:', notRemoved.map(item => ({ id: item.id, product: item.product, size: item.size, splitTag: item.splitTag, qty: item.qty })));
          
          // Force remove them - check by object reference first, then by ID, then by properties
          notRemoved.forEach(item => {
            let removed = false;
            
            // Try to remove by object reference first (most reliable)
            const indexByRef = newProducts.findIndex(p => p === item);
            if (indexByRef !== -1) {
              newProducts.splice(indexByRef, 1);
              removed = true;
              console.log('Force removed item by reference:', item.id, item.product);
            } else if (item.id) {
              // Try to remove by ID
              const indexById = newProducts.findIndex(p => p.id === item.id);
              if (indexById !== -1) {
                newProducts.splice(indexById, 1);
                removed = true;
                console.log('Force removed item by ID:', item.id, item.product);
              } else {
                // Try to remove by properties as last resort
                const indexByProps = newProducts.findIndex(p => 
                  p.brand === item.brand && 
                  p.product === item.product && 
                  p.size === item.size &&
                  p.formula === item.formula &&
                  (p.splitTag || '') === (item.splitTag || '') &&
                  p.qty === item.qty
                );
                if (indexByProps !== -1) {
                  newProducts.splice(indexByProps, 1);
                  removed = true;
                  console.log('Force removed item by properties:', item.id, item.product);
                }
              }
            }
            
            if (!removed) {
              console.error('Could not remove item even with force removal:', item);
            }
          });
          
          // Verify removal was successful
          const finalRemovedCount = products.length - newProducts.length;
          console.log('Final removed count after force removal:', finalRemovedCount, 'expected:', draggedItems.length);
        }
      }
      
      // Find new position after removal
      let newDropIndex = newProducts.findIndex(p => p.id === dropItem.id);
      
      // If drop item not found (shouldn't happen, but handle it)
      if (newDropIndex === -1) {
        // Insert at the end
        newDropIndex = newProducts.length;
      }
      
      // Use drop position to determine insert index
      let insertIndex;
      if (dropPosition && dropPosition.index === dropIndex) {
        insertIndex = dropPosition.position === 'above' ? newDropIndex : newDropIndex + 1;
      } else {
        // Fallback: insert after drop item
        insertIndex = newDropIndex + 1;
      }
      
      // Ensure insertIndex is within bounds
      insertIndex = Math.max(0, Math.min(insertIndex, newProducts.length));
      
      // Final verification: ensure none of the dragged items are already in newProducts
      // Check by both ID and object reference to catch any duplicates
      const existingIds = new Set(newProducts.map(p => p && p.id ? p.id : null).filter(Boolean));
      const existingRefs = new Set(newProducts);
      
      const itemsToInsert = draggedItems.filter(item => {
        // Don't insert if it's already in the array (by reference or ID)
        if (existingRefs.has(item)) {
          return false;
        }
        if (item.id && existingIds.has(item.id)) {
          // Double check - maybe the ID exists but it's a different object
          const existingById = newProducts.find(p => p && p.id === item.id);
          if (existingById === item) {
            return false; // Same object, don't insert
          }
          // Different object with same ID - log warning but still insert
          console.warn('Different object with same ID found, will insert anyway:', item.id);
        }
        return true;
      });
      
      if (itemsToInsert.length !== draggedItems.length) {
        const skippedItems = draggedItems.filter(item => {
          return existingRefs.has(item) || (item.id && existingIds.has(item.id) && newProducts.find(p => p && p.id === item.id) === item);
        });
        
        console.warn('Some dragged items already exist in new array (skipping insertion):', {
          expected: draggedItems.length,
          toInsert: itemsToInsert.length,
          skipped: skippedItems.length,
          skippedItems: skippedItems.map(item => ({ id: item.id, product: item.product, size: item.size, splitTag: item.splitTag, qty: item.qty }))
        });
      }
      
      // Insert all dragged items at the new position
      if (itemsToInsert.length > 0) {
        newProducts.splice(insertIndex, 0, ...itemsToInsert);
      } else {
        console.error('No items to insert after filtering duplicates!');
      }
      
      // Track which items were moved (by ID) to preserve selection
      const movedItemIds = new Set(draggedItems.map(item => item.id));
      
      // Final validation: ensure newProducts doesn't contain duplicates
      // Use both ID and object reference to detect duplicates
      const finalProductIds = new Set();
      const finalProductRefs = new Set();
      const finalProducts = [];
      const duplicateIds = [];
      const duplicateRefs = [];
      
      newProducts.forEach((product, idx) => {
        if (!product) {
          console.warn('Null/undefined product found at index:', idx);
          return; // Skip null/undefined products
        }
        
        // Check for duplicate by object reference (most reliable)
        if (finalProductRefs.has(product)) {
          duplicateRefs.push({ index: idx, id: product.id, product: product.product });
          console.warn('Duplicate product by reference found, skipping:', product.id, product.product);
          return; // Skip this duplicate
        }
        
        // Check for duplicate by ID
        if (product.id && finalProductIds.has(product.id)) {
          // Check if it's the same object or a different one
          const existingProduct = finalProducts.find(p => p.id === product.id);
          if (existingProduct !== product) {
            // Different object with same ID - this is a duplicate
            duplicateIds.push({ index: idx, id: product.id, product: product.product });
            console.warn('Duplicate product by ID found, skipping:', product.id, product.product);
            return; // Skip this duplicate
          }
        }
        
        // Add to final arrays
        if (product.id) {
          finalProductIds.add(product.id);
        }
        finalProductRefs.add(product);
        finalProducts.push(product);
      });
      
      if (duplicateIds.length > 0 || duplicateRefs.length > 0) {
        console.error('Found duplicates in newProducts before state update:', {
          duplicateIds: duplicateIds,
          duplicateRefs: duplicateRefs,
          originalCount: newProducts.length,
          finalCount: finalProducts.length
        });
      }
      
      // Verify we have the correct number of products
      const expectedCount = products.length - draggedItems.length + itemsToInsert.length;
      if (finalProducts.length !== expectedCount) {
        console.error('Product count mismatch:', {
          expected: expectedCount,
          actual: finalProducts.length,
          originalCount: products.length,
          draggedItemsCount: draggedItems.length,
          itemsToInsertCount: itemsToInsert.length
        });
      }
      
      // Update state immediately to ensure UI reflects changes
      // Use a new array reference to force React to re-render
      setProducts([...finalProducts]);
      saveProductOrder(finalProducts);
      
      // Clear drag states after a short delay for smooth animation
      setDragOverIndex(null);
      setDropPosition(null);
      
      setTimeout(() => {
        setDraggedIndex(null);
        
        // Update selection to reflect new positions of moved items
        // Use filteredProducts to get the correct indices in the displayed list
        // But first, we need to recalculate filteredProducts with the new state
        // Since state update is async, we'll use the finalProducts we just set
        const tempFiltered = getFilteredAndSortedProductsForArray(finalProducts);
        const newSelectedIndices = new Set();
        tempFiltered.forEach((product, index) => {
          if (movedItemIds.has(product.id)) {
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
      
      // Find these items in the original products array
      const draggedOriginalIndex = products.findIndex(p => p.id === draggedItem.id);
      const dropOriginalIndex = products.findIndex(p => p.id === dropItem.id);
      
      const newProducts = [...products];
      
      // Remove the dragged item
      newProducts.splice(draggedOriginalIndex, 1);
      
      // Find new position after removal
      const newDropIndex = newProducts.findIndex(p => p.id === dropItem.id);
      
      // Use drop position to determine insert index
      let insertIndex;
      if (dropPosition && dropPosition.index === dropIndex) {
        insertIndex = dropPosition.position === 'above' ? newDropIndex : newDropIndex + 1;
      } else {
        // Fallback to original logic
        insertIndex = draggedOriginalIndex < dropOriginalIndex ? newDropIndex + 1 : newDropIndex;
      }
      
      // Insert it at the new position
      newProducts.splice(insertIndex, 0, draggedItem);
      
      // Track the moved item ID to preserve selection
      const movedItemId = draggedItem.id;
      
      // Clear drag states first for smooth transition
      setDragOverIndex(null);
      setDropPosition(null);
      
      // Small delay to allow drop line to fade out smoothly
      setTimeout(() => {
        setProducts(newProducts);
        saveProductOrder(newProducts);
        setDraggedIndex(null);
        
        // Find the new index of the moved item and keep it selected
        const newIndex = newProducts.findIndex(p => p.id === movedItemId);
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

  // Locking a product means it will NOT be affected by filters,
  // but it can still be moved via drag & drop.
  const handleToggleLock = (productId) => {
    setLockedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
        console.log('Unlocked product:', productId);
      } else {
        next.add(productId);
        console.log('Locked product:', productId);
      }
      console.log('Current locked IDs:', Array.from(next));
      return next;
    });
  };

  const handleMenuClick = (e, index) => {
    e.stopPropagation();
    setOpenMenuIndex(openMenuIndex === index ? null : index);
  };

  const handleMenuAction = (action, product) => {
    if (action === 'split') {
      setSelectedProduct(product);
      // Initialize first batch with the increment step for this product size
      const step = getIncrementStep(product.size);
      setFirstBatchQty(step); // Set to the increment step (e.g., 4 for Gallons, 1 for others)
      setIsSplitModalOpen(true);
    } else if (action === 'undoSplit') {
      handleUndoSplit(product);
    } else if (action === 'undoAllSplits') {
      handleUndoAllSplits(product);
    }
    setOpenMenuIndex(null);
  };

  const handleCloseSplitModal = () => {
    setIsSplitModalOpen(false);
    setSelectedProduct(null);
    // Reset to default step when closing
    if (selectedProduct) {
      const step = getIncrementStep(selectedProduct.size);
      setFirstBatchQty(step);
    } else {
    setFirstBatchQty(1);
    }
  };

  const handleFirstBatchQtyChange = (e) => {
    const newValue = parseFloat(e.target.value) || 0;
    if (!selectedProduct) return;
    
    const originalQty = selectedProduct.qty || 1;
    const step = getIncrementStep(selectedProduct.size);
    
    // Round to nearest step
    const roundedValue = Math.round(newValue / step) * step;
    
    // Ensure value is within valid range (at least step, at most originalQty - step)
    // But allow it to be up to originalQty if that's what user wants
    const minValue = step;
    const maxValue = originalQty;
    
    if (roundedValue < minValue) {
      setFirstBatchQty(minValue);
    } else if (roundedValue > maxValue) {
      setFirstBatchQty(maxValue);
    } else {
      setFirstBatchQty(roundedValue);
    }
  };

  const handleConfirmSplit = () => {
    if (!selectedProduct) return;
    
    // Use the firstBatchQty from state (editable value)
    const originalQty = selectedProduct.qty || 1;
    const firstBatchQtyValue = firstBatchQty;
    const secondBatchQty = originalQty - firstBatchQtyValue;
    
    // Validate that first batch is valid
    if (firstBatchQtyValue <= 0 || firstBatchQtyValue >= originalQty) {
      return; // Don't proceed if invalid
    }
    
    // Find the index of the product to split
    const productIndex = products.findIndex(p => p.id === selectedProduct.id);
    
    if (productIndex === -1) return;
    
    // Always use the base originalId for creating split product IDs
    // This ensures consistent IDs when restoring splits
    const baseProductId = selectedProduct.originalId || selectedProduct.id;
    
    // Find the maximum split number currently in use for this base product
    // This ensures we don't create duplicate IDs when splitting a split product
    let maxSplitNum = 0;
    products.forEach(p => {
      const pOriginalId = p.originalId || p.id;
      if (pOriginalId === baseProductId && typeof p.id === 'string') {
        const match = p.id.match(/_split_(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSplitNum) maxSplitNum = num;
        }
      }
    });
    
    // Generate unique split numbers (if no existing splits, start at 1)
    const firstSplitNum = maxSplitNum > 0 ? maxSplitNum + 1 : 1;
    const secondSplitNum = firstSplitNum + 1;
    
    // Count how many split products will exist after this split
    const currentSplitCount = products.filter(p => {
      const pOriginalId = p.originalId || p.id;
      return pOriginalId === baseProductId && p.splitTag;
    }).length;
    // If the product being split has a splitTag, we're replacing 1 with 2
    // If not, we're adding 2 new splits
    const totalSplitsAfter = selectedProduct.splitTag 
      ? currentSplitCount + 1  
      : currentSplitCount + 2;
    
    // Create two new products from the split with unique IDs
    const firstBatch = {
      ...selectedProduct,
      id: `${baseProductId}_split_${firstSplitNum}`,
      qty: firstBatchQtyValue,
      splitTag: `${firstSplitNum}/${totalSplitsAfter}`,
      originalId: baseProductId,
    };
    
    const secondBatch = {
      ...selectedProduct,
      id: `${baseProductId}_split_${secondSplitNum}`,
      qty: secondBatchQty,
      splitTag: `${secondSplitNum}/${totalSplitsAfter}`,
      originalId: baseProductId,
    };
    
    // Replace the original product with the two split products
    const newProducts = [...products];
    newProducts.splice(productIndex, 1, firstBatch, secondBatch);
    
    // Update splitTags of ALL split products with the same base ID to reflect new total
    // This ensures all split tags show the correct denominator
    newProducts.forEach((p, idx) => {
      const pOriginalId = p.originalId || p.id;
      if (pOriginalId === baseProductId && p.splitTag && typeof p.id === 'string') {
        // Extract the split number from the ID
        const match = p.id.match(/_split_(\d+)$/);
        if (match) {
          const splitNum = parseInt(match[1], 10);
          newProducts[idx] = {
            ...p,
            splitTag: `${splitNum}/${totalSplitsAfter}`,
          };
        }
      }
    });
    
    setProducts(newProducts);
    saveProductOrder(newProducts);
    
    // Save split information to localStorage
    // Store the current state of all split products for this product ID
    if (shipmentId) {
      try {
        // Always use the base originalId for saving splits
        // This ensures we always reference the base product, not a split product
        const productId = baseProductId;
        
        // Also save the stable identifier for matching when product IDs might change
        // Get base identifier without splitTag (remove everything after the last :: if it's a splitTag)
        const fullIdentifier = getProductIdentifier(selectedProduct);
        const stableIdentifier = selectedProduct.splitTag 
          ? fullIdentifier.replace(`::${selectedProduct.splitTag}`, '')
          : fullIdentifier;
        
        // Get all products with this original ID from the updated products array
        // Note: We use the newProducts array that was already created and modified above
        const productsWithThisId = newProducts.filter(p => {
          // Match by originalId if it exists, otherwise match by id
          const pOriginalId = p.originalId || p.id;
          return pOriginalId === productId;
        });
        
        // Get all products that have been split (have splitTag)
        const splitProducts = productsWithThisId.filter(p => p.splitTag);
        
        // Only save if there are split products
        if (splitProducts.length > 0) {
          const storedSplits = localStorage.getItem(`sortProductsSplits_${shipmentId}`);
          const existingSplits = storedSplits ? JSON.parse(storedSplits) : [];
          
          // Remove any existing split for this product (by ID or stable identifier)
          const filteredSplits = existingSplits.filter(s => 
            s.productId !== productId && s.stableIdentifier !== stableIdentifier
          );
          
          // Save all split products for this ID
          // Sort by the numeric split number in the ID for consistent order
          const sortedSplitProducts = [...splitProducts].sort((a, b) => {
            // Extract split numbers from IDs (e.g., "123_split_3" -> 3)
            const getNum = (id) => {
              if (typeof id !== 'string') return 0;
              const match = id.match(/_split_(\d+)$/);
              return match ? parseInt(match[1], 10) : 0;
            };
            return getNum(a.id) - getNum(b.id);
          });
          
          // Store as batches - if there are 2, store as firstBatch/secondBatch
          // If there are more (multiple splits), store the first two as firstBatch/secondBatch
          // and the rest will be handled by the loading logic
          if (sortedSplitProducts.length >= 2) {
            filteredSplits.push({
              productId: productId,
              stableIdentifier: stableIdentifier, // Save stable identifier for matching
              firstBatch: {
                qty: sortedSplitProducts[0].qty,
                volume: sortedSplitProducts[0].volume,
                splitTag: sortedSplitProducts[0].splitTag,
              },
              secondBatch: {
                qty: sortedSplitProducts[1].qty,
                volume: sortedSplitProducts[1].volume,
                splitTag: sortedSplitProducts[1].splitTag,
              },
              // Store additional batches if there are more than 2
              additionalBatches: sortedSplitProducts.slice(2).map(p => ({
                qty: p.qty,
                volume: p.volume,
                splitTag: p.splitTag,
              })),
            });
          } else if (sortedSplitProducts.length === 1) {
            // Edge case: only one split product (shouldn't happen, but handle it)
            filteredSplits.push({
              productId: productId,
              stableIdentifier: stableIdentifier,
              firstBatch: {
                qty: sortedSplitProducts[0].qty,
                volume: sortedSplitProducts[0].volume,
                splitTag: sortedSplitProducts[0].splitTag,
              },
              secondBatch: {
                qty: 0,
                volume: 0,
              },
            });
          }
          
          localStorage.setItem(`sortProductsSplits_${shipmentId}`, JSON.stringify(filteredSplits));
          console.log('Saved split for product:', productId, 'stable identifier:', stableIdentifier, 'total split products:', sortedSplitProducts.length, 'batches:', sortedSplitProducts.map(p => ({ qty: p.qty, tag: p.splitTag })));
        }
      } catch (error) {
        console.error('Error saving sort products splits to localStorage:', error);
      }
    }
    
    handleCloseSplitModal();
  };

  // Helper function to check if a product has splits (is a parent with split children)
  // For split items, check if there are other splits with the same originalId
  // For non-split items, check if there are any split items with this id as originalId
  const hasSplits = (product) => {
    if (!product) return false;
    const originalId = product.originalId || product.id;
    // Count how many split products share this originalId
    const splitCount = products.filter(p => {
      const pOriginalId = p.originalId || p.id;
      return pOriginalId === originalId && p.splitTag;
    }).length;
    return splitCount > 0;
  };

  // Helper function to get all split products for a given product
  const getSplitProducts = (product) => {
    if (!product) return [];
    const originalId = product.originalId || product.id;
    return products.filter(p => {
      const pOriginalId = p.originalId || p.id;
      return pOriginalId === originalId && p.splitTag;
    });
  };

  // Handler for undoing a single split (from a split item)
  const handleUndoSplit = (splitProduct) => {
    if (!splitProduct || !splitProduct.splitTag) return;
    
    // Get the stable identifier (brand + product + size) without splitTag - this is the key
    const fullIdentifier = getProductIdentifier(splitProduct);
    const stableIdentifier = splitProduct.splitTag 
      ? fullIdentifier.replace(`::${splitProduct.splitTag}`, '')
      : fullIdentifier;
    
    // Find all split products with the same stable identifier (like formulas use formula name)
    const allSplitProducts = products.filter(p => {
      if (!p.splitTag) return false;
      const pFullIdentifier = getProductIdentifier(p);
      const pStableIdentifier = p.splitTag 
        ? pFullIdentifier.replace(`::${p.splitTag}`, '')
        : pFullIdentifier;
      return pStableIdentifier === stableIdentifier;
    });
    
    if (allSplitProducts.length === 0) return;
    
    // Calculate the combined quantity and volume
    const combinedQty = allSplitProducts.reduce((sum, p) => sum + (p.qty || 0), 0);
    const combinedVolume = allSplitProducts.reduce((sum, p) => sum + (p.volume || 0), 0);
    
    // Find the first split product to use as template
    const templateProduct = allSplitProducts[0];
    const originalId = templateProduct.originalId || templateProduct.id.replace(/_split_\d+$/, '');
    
    // Create the merged product (remove splitTag and originalId)
    const mergedProduct = {
      ...templateProduct,
      id: originalId,
      qty: combinedQty,
      volume: Math.round(combinedVolume * 100) / 100,
      splitTag: undefined,
      originalId: undefined,
    };
    
    // Remove all split products with this stable identifier (simple filter like formulas)
    const newProducts = products.filter(p => {
      if (!p.splitTag) return true; // Keep all non-split products
      const pFullIdentifier = getProductIdentifier(p);
      const pStableIdentifier = p.splitTag 
        ? pFullIdentifier.replace(`::${p.splitTag}`, '')
        : pFullIdentifier;
      // Remove if it matches our stable identifier
      return pStableIdentifier !== stableIdentifier;
    });
    
    // Find the position of the first split product to insert the merged product there
    const firstSplitIndex = products.findIndex(p => {
      if (!p.splitTag) return false;
      const pFullIdentifier = getProductIdentifier(p);
      const pStableIdentifier = p.splitTag 
        ? pFullIdentifier.replace(`::${p.splitTag}`, '')
        : pFullIdentifier;
      return pStableIdentifier === stableIdentifier;
    });
    
    // Insert merged product at the correct position (don't mutate)
    let finalProducts;
    if (firstSplitIndex !== -1) {
      // Count how many non-split products come before the first split
      let insertIndex = 0;
      for (let i = 0; i < firstSplitIndex; i++) {
        if (!products[i].splitTag) {
          insertIndex++;
        }
      }
      // Create new array with merged product inserted
      finalProducts = [
        ...newProducts.slice(0, insertIndex),
        mergedProduct,
        ...newProducts.slice(insertIndex)
      ];
    } else {
      finalProducts = [...newProducts, mergedProduct];
    }
    
    // Set flag to prevent useEffect from reloading splits
    isUndoingSplitRef.current = true;
    
    // Remove split from localStorage FIRST, before updating state
    if (shipmentId) {
      try {
        const storedSplits = localStorage.getItem(`sortProductsSplits_${shipmentId}`);
        if (storedSplits) {
          const existingSplits = JSON.parse(storedSplits);
          const filteredSplits = existingSplits.filter(s => s.stableIdentifier !== stableIdentifier);
          localStorage.setItem(`sortProductsSplits_${shipmentId}`, JSON.stringify(filteredSplits));
        }
      } catch (error) {
        console.error('Error removing split from localStorage:', error);
      }
    }
    
    // Close menu and clear selection before updating products
    setOpenMenuIndex(null);
    setSelectedIndices(new Set());
    setLastSelectedIndex(null);
    
    // Update products state with new array reference
    setProducts(finalProducts);
    saveProductOrder(finalProducts);
    
    // Clear flag after state update completes
    setTimeout(() => {
      isUndoingSplitRef.current = false;
    }, 200);
    
    // Show info toast
    const productName = `${splitProduct.brand || ''} ${splitProduct.product || ''} ${splitProduct.size || ''}`.trim();
    showInfoToast(`Split undone for ${productName}`, `Combined ${allSplitProducts.length} split item(s) back into one.`);
  };

  // Handler for undoing all splits (from a parent item or any split item)
  // This is the same as handleUndoSplit but called from a parent context
  const handleUndoAllSplits = (product) => {
    if (!product) return;
    
    // If it's a split item, use the same logic as handleUndoSplit
    if (product.splitTag) {
      handleUndoSplit(product);
      return;
    }
    
    // If it's not a split item, find all splits using the stable identifier
    const stableIdentifier = getProductIdentifier(product);
    
    // Find all split products with this stable identifier
    const allSplitProducts = products.filter(p => {
      if (!p.splitTag) return false;
      const pFullIdentifier = getProductIdentifier(p);
      const pStableIdentifier = p.splitTag 
        ? pFullIdentifier.replace(`::${p.splitTag}`, '')
        : pFullIdentifier;
      return pStableIdentifier === stableIdentifier;
    });
    
    if (allSplitProducts.length === 0) return;
    
    // Calculate the combined quantity and volume
    const combinedQty = allSplitProducts.reduce((sum, p) => sum + (p.qty || 0), 0);
    const combinedVolume = allSplitProducts.reduce((sum, p) => sum + (p.volume || 0), 0);
    
    // Use the first split product as template
    const templateProduct = allSplitProducts[0];
    const originalId = templateProduct.originalId || product.id;
    
    // Create the merged product
    const mergedProduct = {
      ...templateProduct,
      id: originalId,
      qty: combinedQty,
      volume: Math.round(combinedVolume * 100) / 100,
      splitTag: undefined,
      originalId: undefined,
    };
    
    // Remove all split products with this stable identifier (simple filter like formulas)
    const newProducts = products.filter(p => {
      if (!p.splitTag) return true; // Keep all non-split products
      const pFullIdentifier = getProductIdentifier(p);
      const pStableIdentifier = p.splitTag 
        ? pFullIdentifier.replace(`::${p.splitTag}`, '')
        : pFullIdentifier;
      // Remove if it matches our stable identifier
      return pStableIdentifier !== stableIdentifier;
    });
    
    // Find the position of the first split product to insert the merged product there
    const firstSplitIndex = products.findIndex(p => {
      if (!p.splitTag) return false;
      const pFullIdentifier = getProductIdentifier(p);
      const pStableIdentifier = p.splitTag 
        ? pFullIdentifier.replace(`::${p.splitTag}`, '')
        : pFullIdentifier;
      return pStableIdentifier === stableIdentifier;
    });
    
    // Insert merged product at the correct position (don't mutate)
    let finalProducts;
    if (firstSplitIndex !== -1) {
      // Count how many non-split products come before the first split
      let insertIndex = 0;
      for (let i = 0; i < firstSplitIndex; i++) {
        if (!products[i].splitTag) {
          insertIndex++;
        }
      }
      // Create new array with merged product inserted
      finalProducts = [
        ...newProducts.slice(0, insertIndex),
        mergedProduct,
        ...newProducts.slice(insertIndex)
      ];
    } else {
      finalProducts = [...newProducts, mergedProduct];
    }
    
    // Set flag to prevent useEffect from reloading splits
    isUndoingSplitRef.current = true;
    
    // Remove split from localStorage FIRST, before updating state
    if (shipmentId) {
      try {
        const storedSplits = localStorage.getItem(`sortProductsSplits_${shipmentId}`);
        if (storedSplits) {
          const existingSplits = JSON.parse(storedSplits);
          const filteredSplits = existingSplits.filter(s => s.stableIdentifier !== stableIdentifier);
          localStorage.setItem(`sortProductsSplits_${shipmentId}`, JSON.stringify(filteredSplits));
        }
      } catch (error) {
        console.error('Error removing split from localStorage:', error);
      }
    }
    
    // Close menu and clear selection before updating products
    setOpenMenuIndex(null);
    setSelectedIndices(new Set());
    setLastSelectedIndex(null);
    
    // Update products state with new array reference
    setProducts(finalProducts);
    saveProductOrder(finalProducts);
    
    // Clear flag after state update completes
    setTimeout(() => {
      isUndoingSplitRef.current = false;
    }, 200);
    
    // Show info toast
    const productName = `${product.brand || ''} ${product.product || ''} ${product.size || ''}`.trim();
    showInfoToast(`All splits undone for ${productName}`, `Combined ${allSplitProducts.length} split item(s) back into one.`);
  };

  // Second batch quantity is the remaining (total - firstBatchQty)
  const secondBatchQty = selectedProduct ? Math.max(0, (selectedProduct.qty || 1) - firstBatchQty) : 0;
  
  // Get increment step for the selected product
  const incrementStep = selectedProduct ? getIncrementStep(selectedProduct.size) : 1;

  const handleFilterClick = (columnKey, event) => {
    event.stopPropagation();
    setOpenFilterColumns((prev) => {
      const next = new Set(prev);
      if (next.has(columnKey)) {
        next.delete(columnKey);
      } else {
        next.add(columnKey);
      }
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
    
    // If sortOrder is provided, apply one-time sort to products array
    // Locked items maintain their positions, only unlocked items are sorted
    if (filterData.sortOrder) {
      setProducts(prevProducts => {
        // Separate locked and unlocked products
        const lockedProducts = [];
        const unlockedProducts = [];
        
        prevProducts.forEach((product, index) => {
          if (lockedProductIds.has(product.id)) {
            lockedProducts.push({ product, originalIndex: index });
          } else {
            unlockedProducts.push(product);
          }
        });
        
        // Sort only unlocked products
        unlockedProducts.sort((a, b) => {
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
        
        for (let i = 0; i < prevProducts.length; i++) {
          const lockedItem = lockedProducts.find(lp => lp.originalIndex === i);
          if (lockedItem) {
            result.push(lockedItem.product);
          } else if (unlockedIndex < unlockedProducts.length) {
            result.push(unlockedProducts[unlockedIndex]);
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
    // setOpenFilterColumns((prev) => {
    //   const next = new Set(prev);
    //   next.delete(columnKey);
    //   return next;
    // });
  };

  // Get unique values for a column (handles all data types)
  const getColumnValues = (columnKey) => {
    const values = new Set();
    products.forEach(product => {
      const val = product[columnKey];
      if (val !== undefined && val !== null && val !== '') {
        values.add(val);
      }
    });
    // Sort values - handle numbers and strings differently
    const sortedValues = Array.from(values).sort((a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
      }
      return String(a).localeCompare(String(b));
    });
    return sortedValues;
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

  // Helper function to calculate filtered products for a given array
  // This allows us to calculate filtered products for arrays other than the current state
  const getFilteredAndSortedProductsForArray = (productsArray) => {
    // Separate locked and unlocked products
    const lockedProducts = [];
    const unlockedProducts = [];
    
    productsArray.forEach((product, index) => {
      if (lockedProductIds.has(product.id)) {
        lockedProducts.push({ product, originalIndex: index });
      } else {
        unlockedProducts.push(product);
      }
    });

    // Apply filters to unlocked products only
    let filteredUnlocked = [...unlockedProducts];
    
    Object.keys(filters).forEach(columnKey => {
      const filter = filters[columnKey];
      const isNumericColumn = columnKey === 'qty';
      
      // Apply value filters (checkbox selections)
      if (filter.selectedValues && filter.selectedValues.size > 0) {
        filteredUnlocked = filteredUnlocked.filter(product => {
          const productValue = product[columnKey];
          // Check if value matches (handle both string and number comparisons)
          return filter.selectedValues.has(productValue) || 
                 filter.selectedValues.has(String(productValue));
        });
      }
      
      // Apply condition filters
      if (filter.conditionType) {
        filteredUnlocked = filteredUnlocked.filter(product => {
          return applyConditionFilter(
            product[columnKey],
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
    
    for (let i = 0; i < productsArray.length; i++) {
      const lockedItem = lockedProducts.find(lp => lp.originalIndex === i);
      if (lockedItem) {
        result.push(lockedItem.product);
      } else if (unlockedIndex < filteredUnlocked.length) {
        result.push(filteredUnlocked[unlockedIndex]);
        unlockedIndex++;
      }
    }

    return result;
  };

  // Apply filters to products
  // Locked items maintain their positions and are not affected by filters
  // Unlocked items are filtered, filling in the gaps
  // Note: Sorting is now one-time (applied directly to products array), not continuous
  const getFilteredAndSortedProducts = () => {
    return getFilteredAndSortedProductsForArray(products);
  };

  const filteredProducts = getFilteredAndSortedProducts();

  return (
    <>
      <style>{`
        @keyframes dropLineFadeIn {
          from {
            opacity: 0;
            transform: scaleX(0);
          }
          to {
            opacity: 1;
            transform: scaleX(1);
          }
        }
      `}</style>
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
            <tr style={{
              backgroundColor: '#1C2634',
              borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
              height: '40px',
            }}>
              {columns.map((column) => {
                const isActive = hasActiveFilter(column.key);
                const isDropdownOpen = openFilterColumns.has(column.key);
                const isActiveOrOpen = isActive || isDropdownOpen;
                return (
                <th
                  key={column.key}
                  className={column.key === 'drag' || column.key === 'menu' ? undefined : 'group'}
                  style={{
                    padding: column.key === 'drag' || column.key === 'menu' ? '0 8px' : '12px 16px',
                    textAlign: column.key === 'drag' || column.key === 'menu' ? 'center' : 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isActiveOrOpen ? '#3B82F6' : '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: column.width,
                    whiteSpace: 'nowrap',
                    borderRight: column.key === 'drag' || column.key === 'menu' ? 'none' : '1px solid #FFFFFF',
                    height: '40px',
                    position: column.key === 'drag' || column.key === 'menu' ? 'static' : 'relative',
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
                        {(() => {
                          if (isActiveOrOpen) {
                            return (
                              <span style={{ 
                                display: 'inline-block',
                                width: '6px', 
                                height: '6px', 
                                borderRadius: '50%', 
                                backgroundColor: '#10B981',
                              }} />
                            );
                          }
                          return null;
                        })()}
                      </span>
                      <img
                        src="/assets/Vector (1).png"
                        alt="Filter"
                        className={`w-3 h-3 transition-opacity ${isActiveOrOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
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
                          filter: isActiveOrOpen ? 'brightness(0) saturate(100%) invert(42%) sepia(93%) saturate(1352%) hue-rotate(196deg) brightness(95%) contrast(96%)' : 'none',
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
          <tbody style={{ position: 'relative' }}>
            {filteredProducts.length === 0 ? (
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
                  No products to sort. Add products to the shipment first.
                </td>
              </tr>
            ) : filteredProducts.map((product, index) => {
              const isDragging = draggedIndex === index || (selectedIndices.has(index) && selectedIndices.size > 1 && draggedIndex !== null);
              const isDragOver = dragOverIndex === index;
              const isSelected = selectedIndices.has(index);
              const showDropLineAbove = dropPosition && dropPosition.index === index && dropPosition.position === 'above';
              const showDropLineBelow = dropPosition && dropPosition.index === index && dropPosition.position === 'below';
              
              return (
                <React.Fragment key={product.id}>
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
                        : (isDarkMode ? '#1F2937' : '#FFFFFF'),
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
                          : (isDarkMode ? '#1F2937' : '#FFFFFF');
                      }
                    }}
                  >
                {(() => {
                  const isLocked = lockedProductIds.has(product.id);
                  return (
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
                        pointerEvents: 'auto',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleToggleLock(product.id);
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
                  );
                })()}
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {product.type}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {product.brand}
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
                  <span>{product.product}</span>
                  {product.splitTag && (
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
                  {product.size}
                </td>
                <td style={{
                  padding: '0 16px',
                  height: '40px',
                }}>
                  <input
                    type="text"
                    value={product.qty}
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
                  {product.formula}
                </td>
                <td style={{
                  padding: '0 16px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: isDarkMode ? '#E5E7EB' : '#374151',
                  height: '40px',
                }}>
                  {product.productType}
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
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
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
                      {/* Show Split Product option - for split products, only on the one with highest qty (parent) */}
                      {product.qty > 1 && (() => {
                        // If this is not a split product, show the button
                        if (!product.splitTag) return true;
                        
                        // If this is a split product, only show if it has the highest qty among siblings
                        const originalId = product.originalId || product.id;
                        const siblingProducts = products.filter(p => {
                          const pOriginalId = p.originalId || p.id;
                          return pOriginalId === originalId && p.splitTag;
                        });
                        
                        if (siblingProducts.length <= 1) return true; // Only one split, show it
                        
                        // Find the max qty among siblings
                        const maxQty = Math.max(...siblingProducts.map(p => p.qty));
                        
                        // Only show on the product with the highest qty (parent)
                        return product.qty === maxQty;
                      })() && (
                        <button
                          type="button"
                          onClick={() => handleMenuAction('split', product)}
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
                          <span>Split Product</span>
                        </button>
                      )}
                      
                      {/* Show Undo All Splits option for split items */}
                      {product.splitTag && (
                        <button
                          type="button"
                          onClick={() => handleMenuAction('undoAllSplits', product)}
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
          <SortProductsFilterDropdown
            key={columnKey}
            ref={(el) => {
              if (el) filterDropdownRefs.current[columnKey] = el;
              else delete filterDropdownRefs.current[columnKey];
            }}
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

      {/* Split Product Modal */}
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
                  Split Product Quantity
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
                {/* Product Info */}
                {selectedProduct && (
                  <div style={{
                    backgroundColor: '#F3F4F6',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '20px',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                      {selectedProduct.brand} - {selectedProduct.product} ({selectedProduct.size})
                    </div>
                    <div style={{ fontSize: '13px', color: '#6B7280' }}>
                      Total: {selectedProduct.qty} unit{selectedProduct.qty > 1 ? 's' : ''}
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
                    {selectedProduct && incrementStep > 1 
                      ? `Increments by ${incrementStep} unit${incrementStep > 1 ? 's' : ''} (based on product size).`
                      : 'Enter the quantity for the first batch.'}
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={firstBatchQty}
                        onChange={handleFirstBatchQtyChange}
                        min={incrementStep}
                        max={selectedProduct ? (selectedProduct.qty || 1) : 1}
                        step={incrementStep}
                        style={{
                          width: '100%',
                          height: '40px',
                          padding: '0 12px',
                          borderRadius: '6px',
                          border: '1px solid #D1D5DB',
                          backgroundColor: '#FFFFFF',
                          color: '#374151',
                          fontSize: '14px',
                          fontWeight: 400,
                          outline: 'none',
                          cursor: 'text',
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
                    The remaining units after the split.
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>
                        Quantity
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
                  disabled={!selectedProduct || (selectedProduct?.qty || 1) <= incrementStep || firstBatchQty <= 0 || firstBatchQty >= (selectedProduct?.qty || 1)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: (!selectedProduct || (selectedProduct?.qty || 1) <= incrementStep || firstBatchQty <= 0 || firstBatchQty >= (selectedProduct?.qty || 1)) ? '#9CA3AF' : '#3B82F6',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: (!selectedProduct || (selectedProduct?.qty || 1) <= incrementStep || firstBatchQty <= 0 || firstBatchQty >= (selectedProduct?.qty || 1)) ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedProduct && (selectedProduct?.qty || 1) > incrementStep && firstBatchQty > 0 && firstBatchQty < (selectedProduct?.qty || 1)) {
                      e.currentTarget.style.backgroundColor = '#2563EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedProduct && (selectedProduct?.qty || 1) > incrementStep && firstBatchQty > 0 && firstBatchQty < (selectedProduct?.qty || 1)) {
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
      </div>
    </>
  );
};

export default SortProductsTable;

