import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { getSellables } from '../../../../services/productionApi';
import { toast } from 'sonner';

const SellablesView = () => {
  const { isDarkMode } = useTheme();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch sellables data from API
  useEffect(() => {
    const fetchSellables = async () => {
      setLoading(true);
      try {
        const data = await getSellables();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching sellables:', error);
        toast.error('Failed to load sellables data');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSellables();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        color: isDarkMode ? '#9CA3AF' : '#6B7280',
      }}>
        Loading sellable products...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
        color: isDarkMode ? '#9CA3AF' : '#6B7280',
      }}>
        <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
          No sellable products found
        </div>
        <div style={{ fontSize: '0.875rem' }}>
          Products need all components (bottles, closures, labels, formula) in stock
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem 1.5rem' }}>
      <div style={{
        backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
        borderRadius: '12px',
        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
        overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{
              backgroundColor: isDarkMode ? '#111827' : '#F9FAFB',
              borderBottom: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
            }}>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Brand
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Product
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Size
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Formula
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'right',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Max Units
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Bottleneck
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'right',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Bottles
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'right',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Closures
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'right',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Labels
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'right',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: isDarkMode ? '#9CA3AF' : '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Formula (gal)
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr
                key={`${product.catalog_id}-${index}`}
                style={{
                  borderBottom: index < products.length - 1 
                    ? (isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB')
                    : 'none',
                  backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                }}
              >
                <td style={{
                  padding: '12px 16px',
                  fontSize: '0.875rem',
                  color: isDarkMode ? '#D1D5DB' : '#111827',
                }}>
                  {product.brand_name || '-'}
                </td>
                <td style={{
                  padding: '12px 16px',
                  fontSize: '0.875rem',
                  color: isDarkMode ? '#D1D5DB' : '#111827',
                }}>
                  {product.product_name || '-'}
                </td>
                <td style={{
                  padding: '12px 16px',
                  fontSize: '0.875rem',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  {product.size || '-'}
                </td>
                <td style={{
                  padding: '12px 16px',
                  fontSize: '0.875rem',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  {product.formula_name || '-'}
                </td>
                <td style={{
                  padding: '12px 16px',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: product.max_sellable_units > 0 
                    ? (isDarkMode ? '#10B981' : '#059669')
                    : (isDarkMode ? '#EF4444' : '#DC2626'),
                }}>
                  {product.max_sellable_units || 0}
                </td>
                <td style={{
                  padding: '12px 16px',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
                    color: isDarkMode ? '#F59E0B' : '#D97706',
                    fontWeight: 500,
                  }}>
                    {product.bottleneck_component || '-'}
                  </span>
                </td>
                <td style={{
                  padding: '12px 16px',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  {product.bottle_inventory || 0}
                </td>
                <td style={{
                  padding: '12px 16px',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  {product.closure_inventory || 0}
                </td>
                <td style={{
                  padding: '12px 16px',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  {product.label_inventory || 0}
                </td>
                <td style={{
                  padding: '12px 16px',
                  textAlign: 'right',
                  fontSize: '0.875rem',
                  color: isDarkMode ? '#9CA3AF' : '#6B7280',
                }}>
                  {product.formula_gallons_available ? product.formula_gallons_available.toFixed(2) : '0.00'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Summary Card */}
      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        backgroundColor: isDarkMode ? '#1F2937' : '#F9FAFB',
        borderRadius: '8px',
        border: isDarkMode ? '1px solid #374151' : '1px solid #E5E7EB',
      }}>
        <div style={{
          fontSize: '0.875rem',
          color: isDarkMode ? '#9CA3AF' : '#6B7280',
        }}>
          <strong style={{ color: isDarkMode ? '#D1D5DB' : '#111827' }}>
            {products.length}
          </strong> products ready to manufacture with all components in stock
        </div>
      </div>
    </div>
  );
};

export default SellablesView;








