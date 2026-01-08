import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import SortProductsFilterDropdown from './SortProductsFilterDropdown';

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
                  
                  // First batch
                  splitProducts.push({
                    ...templateProduct,
                    id: `${baseIdForSplits}_split_1`,
                    qty: firstBatch.qty,
                    splitTag: '1/2',
                    originalId: baseIdForSplits,
                  });
                  
                  // Second batch
                  splitProducts.push({
                    ...templateProduct,
                    id: `${baseIdForSplits}_split_2`,
                    qty: secondBatch.qty,
                    splitTag: '2/2',
                    originalId: baseIdForSplits,
                  });
                  
                  // Additional batches (for multiple splits)
                  additionalBatches.forEach((batch, idx) => {
                    const totalBatches = 2 + additionalBatches.length;
                    splitProducts.push({
                      ...templateProduct,
                      id: `${baseIdForSplits}_split_${idx + 3}`,
                      qty: batch.qty,
                      splitTag: `${idx + 3}/${totalBatches}`,
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
    { key: 'volume', label: 'VOLUME', width: '100px' },
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
      const draggedItems = sortedSelectedIndices.map(idx => filteredList[idx]);
      
      // Find drop item in original products array
      const dropOriginalIndex = products.findIndex(p => p.id === dropItem.id);
      
      const newProducts = [...products];
      
      // Remove all dragged items (in reverse order to maintain indices)
      const draggedOriginalIndices = draggedItems.map(item => 
        products.findIndex(p => p.id === item.id)
      ).sort((a, b) => b - a); // Sort descending to remove from end first
      
      draggedOriginalIndices.forEach(originalIdx => {
        newProducts.splice(originalIdx, 1);
      });
      
      // Find new position after removal
      let newDropIndex = newProducts.findIndex(p => p.id === dropItem.id);
      
      // Use drop position to determine insert index
      let insertIndex;
      if (dropPosition && dropPosition.index === dropIndex) {
        insertIndex = dropPosition.position === 'above' ? newDropIndex : newDropIndex + 1;
      } else {
        // Fallback: insert after drop item
        insertIndex = newDropIndex + 1;
      }
      
      // Insert all dragged items at the new position
      newProducts.splice(insertIndex, 0, ...draggedItems);
      
      // Track which items were moved (by ID) to preserve selection
      const movedItemIds = new Set(draggedItems.map(item => item.id));
      
      // Clear drag states
      setDragOverIndex(null);
      setDropPosition(null);
      
      setTimeout(() => {
        setProducts(newProducts);
        saveProductOrder(newProducts);
        setDraggedIndex(null);
        
        // Update selection to reflect new positions of moved items
        // Find the new indices of the moved items in the updated products array
        const newSelectedIndices = new Set();
        newProducts.forEach((product, index) => {
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
      setFirstBatchQty(1); // Always set first batch to 1
      setIsSplitModalOpen(true);
    }
    setOpenMenuIndex(null);
  };

  const handleCloseSplitModal = () => {
    setIsSplitModalOpen(false);
    setSelectedProduct(null);
    setFirstBatchQty(1);
  };

  const handleConfirmSplit = () => {
    if (!selectedProduct) return;
    
    // First quantity is always 1 unit, second is the remaining quantity
    const originalQty = selectedProduct.qty || 1;
    const firstBatchQty = 1;
    const secondBatchQty = originalQty - firstBatchQty;
    
    // Find the index of the product to split
    const productIndex = products.findIndex(p => p.id === selectedProduct.id);
    
    if (productIndex === -1) return;
    
    // Always use the base originalId for creating split product IDs
    // This ensures consistent IDs when restoring splits
    const baseProductId = selectedProduct.originalId || selectedProduct.id;
    
    // Create two new products from the split
    const firstBatch = {
      ...selectedProduct,
      id: `${baseProductId}_split_1`,
      qty: firstBatchQty,
      splitTag: '1/2',
      originalId: baseProductId,
    };
    
    const secondBatch = {
      ...selectedProduct,
      id: `${baseProductId}_split_2`,
      qty: secondBatchQty,
      splitTag: '2/2',
      originalId: baseProductId,
    };
    
    // Replace the original product with the two split products
    const newProducts = [...products];
    newProducts.splice(productIndex, 1, firstBatch, secondBatch);
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
        
        // Get all products with this original ID from the new products array (after split)
        const newProducts = [...products];
        newProducts.splice(productIndex, 1, firstBatch, secondBatch);
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
          // Sort by splitTag to ensure consistent order
          const sortedSplitProducts = [...splitProducts].sort((a, b) => {
            if (a.splitTag && b.splitTag) {
              return a.splitTag.localeCompare(b.splitTag);
            }
            return 0;
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
              },
              secondBatch: {
                qty: sortedSplitProducts[1].qty,
              },
              // Store additional batches if there are more than 2
              additionalBatches: sortedSplitProducts.slice(2).map(p => ({
                qty: p.qty,
              })),
            });
          } else if (sortedSplitProducts.length === 1) {
            // Edge case: only one split product (shouldn't happen, but handle it)
            filteredSplits.push({
              productId: productId,
              stableIdentifier: stableIdentifier,
              firstBatch: {
                qty: sortedSplitProducts[0].qty,
              },
              secondBatch: {
                qty: 0,
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

  // Second batch quantity is always the remaining (total - 1)
  const secondBatchQty = selectedProduct ? (selectedProduct.qty || 1) - 1 : 0;

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

  // Apply filters to products
  // Locked items maintain their positions and are not affected by filters
  // Unlocked items are filtered, filling in the gaps
  // Note: Sorting is now one-time (applied directly to products array), not continuous
  const getFilteredAndSortedProducts = () => {
    // Separate locked and unlocked products
    const lockedProducts = [];
    const unlockedProducts = [];
    
    products.forEach((product, index) => {
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
      const isNumericColumn = columnKey === 'qty' || columnKey === 'volume';
      
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
    
    for (let i = 0; i < products.length; i++) {
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
                return (
                <th
                  key={column.key}
                  className={column.key === 'drag' || column.key === 'menu' ? undefined : 'group'}
                  style={{
                    padding: column.key === 'drag' || column.key === 'menu' ? '0 8px' : '12px 16px',
                    textAlign: column.key === 'drag' || column.key === 'menu' ? 'center' : 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: isActive ? '#3B82F6' : '#9CA3AF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    width: column.width,
                    whiteSpace: 'nowrap',
                    borderRight: column.key === 'drag' || column.key === 'menu' ? 'none' : '1px solid #FFFFFF',
                    height: '40px',
                    position: column.key === 'drag' || column.key === 'menu' ? 'static' : 'relative',
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
                        {(() => {
                          if (isActive) {
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
                  {product.volume || ''}
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
                    The first batch is always 1 unit.
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'block' }}>
                        Quantity
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
                  disabled={!selectedProduct || (selectedProduct?.qty || 1) <= 1}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: (!selectedProduct || (selectedProduct?.qty || 1) <= 1) ? '#9CA3AF' : '#3B82F6',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: (!selectedProduct || (selectedProduct?.qty || 1) <= 1) ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedProduct && (selectedProduct?.qty || 1) > 1) {
                      e.currentTarget.style.backgroundColor = '#2563EB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedProduct && (selectedProduct?.qty || 1) > 1) {
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

