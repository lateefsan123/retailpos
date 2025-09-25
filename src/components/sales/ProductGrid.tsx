import React from 'react'
import { Product, SideBusinessItem } from '../../types/sales'

interface ProductGridProps {
  filteredProducts: Product[]
  filteredSideBusinessItems: SideBusinessItem[]
  showAllProducts: boolean
  totalProducts: number
  currentPage: number
  productsPerPage: number
  isLoadingMore: boolean
  isFiltering: boolean
  onAddProduct: (product: Product) => void
  onAddSideBusinessItem: (item: SideBusinessItem) => void
  onLoadMore: () => void
}

const ProductGrid: React.FC<ProductGridProps> = ({
  filteredProducts,
  filteredSideBusinessItems,
  showAllProducts,
  totalProducts,
  currentPage,
  productsPerPage,
  isLoadingMore,
  isFiltering,
  onAddProduct,
  onAddSideBusinessItem,
  onLoadMore
}) => {
  return (
    <>
      <style>{`
        .product-quantity-text {
          color: #000000 !important;
          -webkit-text-fill-color: #000000 !important;
          -webkit-text-stroke-color: transparent !important;
        }
      `}</style>
    <div style={{ 
      flex: 1, 
      padding: '24px 32px',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#1f2937',
            margin: '0 0 4px 0'
          }}>
            {showAllProducts ? 'All Products' : 'Top Products'}
          </h3>
          {showAllProducts && (
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              Showing {Math.min(currentPage * productsPerPage, totalProducts)} of {totalProducts} products
              {isFiltering && (
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '12px' }}></i>
              )}
            </p>
          )}
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#6b7280'
        }}>
          <i className="fa-solid fa-search" style={{ 
            fontSize: '48px', 
            marginBottom: '16px', 
            opacity: 0.5 
          }}></i>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '500', 
            color: '#374151',
            margin: '0 0 8px 0'
          }}>
            No products found
          </h3>
          <p style={{ 
            fontSize: '14px', 
            margin: '0',
            color: '#6b7280'
          }}>
            Try selecting a different category
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
          gap: '12px' 
        }}>
          {filteredProducts.map(product => (
            <ProductCard 
              key={product.product_id} 
              product={product} 
              onAdd={onAddProduct}
            />
          ))}
          
          {filteredSideBusinessItems.map(item => (
            <SideBusinessCard 
              key={`sb-${item.item_id}`} 
              item={item} 
              onAdd={onAddSideBusinessItem}
            />
          ))}
        </div>
      )}

      {/* Loading indicator for more products */}
      {showAllProducts && isLoadingMore && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#6b7280'
        }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
          Loading more products...
        </div>
      )}

      {/* Load More button */}
      {showAllProducts && !isLoadingMore && (currentPage * productsPerPage) < totalProducts && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={onLoadMore}
            style={{
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e5e7eb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f3f4f6'
            }}
          >
            <i className="fa-solid fa-plus" style={{ fontSize: '12px' }}></i>
            Load More Products ({totalProducts - (currentPage * productsPerPage)} remaining)
          </button>
        </div>
      )}
    </div>
    </>
  )
}

// Individual product card component
const ProductCard: React.FC<{ product: Product; onAdd: (product: Product) => void }> = ({ product, onAdd }) => (
  <div style={{
    background: '#ffffff',
    border: '1px solid #6b7280',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    position: 'relative'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-1px)'
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)'
    e.currentTarget.style.boxShadow = 'none'
  }}
  >
    {/* Quantity display in top left corner */}
    <div style={{
      position: 'absolute',
      top: '8px',
      left: '8px',
      background: 'rgba(255, 255, 255, 0.9)',
      borderRadius: '4px',
      padding: '2px 6px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#000000',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      zIndex: 1,
      textShadow: 'none'
    }}>
      <span 
        className="product-quantity-text"
        style={{ 
          color: '#000000',
          WebkitTextFillColor: '#000000',
          WebkitTextStrokeColor: 'transparent'
        }}
      >
        {product.stock_quantity}
      </span>
    </div>
    <div style={{
      width: '100%',
      height: '100px',
      background: product.image_url 
        ? `url(${product.image_url})` 
        : 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      borderRadius: '6px',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {!product.image_url && (
        <i className="fa-solid fa-image" style={{ 
          fontSize: '24px', 
          color: '#9ca3af' 
        }}></i>
      )}
    </div>
    <h4 style={{ 
      fontSize: '13px', 
      fontWeight: '500', 
      color: '#1f2937',
      margin: '0 0 6px 0',
      lineHeight: '1.3',
      height: '34px',
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical'
    }}>
      {product.name}
    </h4>
    <p style={{ 
      fontSize: '14px', 
      fontWeight: '600',
      color: '#7d8d86',
      margin: '0 0 4px 0'
    }}>
      {product.is_weighted && product.price_per_unit && product.weight_unit ? (
        (() => {
          if (product.weight_unit === 'g' && product.price_per_unit < 1) {
            const pricePerKg = product.price_per_unit * 1000
            return `€${pricePerKg.toFixed(2)}/kg`
          } else if (product.weight_unit === 'kg' && product.price_per_unit >= 1) {
            return `€${product.price_per_unit.toFixed(2)}/kg`
          } else {
            return `€${product.price_per_unit.toFixed(2)}/${product.weight_unit}`
          }
        })()
      ) : (
        `€${product.price.toFixed(2)}`
      )}
    </p>
    {product.barcode && (
      <p style={{ 
        fontSize: '10px', 
        color: '#9ca3af',
        margin: '0 0 8px 0',
        fontFamily: 'monospace',
        background: '#f9fafb',
        padding: '2px 6px',
        borderRadius: '4px',
        border: '1px solid #e5e7eb'
      }}>
        <i className="fa-solid fa-barcode" style={{ marginRight: '4px', fontSize: '8px' }}></i>
        {product.barcode}
      </p>
    )}
    <button
      onClick={() => onAdd(product)}
      style={{
        background: '#7d8d86',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer',
        width: '100%',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#3e3f29'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#7d8d86'
      }}
    >
      <i className="fa-solid fa-plus" style={{ fontSize: '10px' }}></i>
      Add
    </button>
  </div>
)

// Side business card component
const SideBusinessCard: React.FC<{ item: SideBusinessItem; onAdd: (item: SideBusinessItem) => void }> = ({ item, onAdd }) => (
  <div style={{
    background: '#ffffff',
    border: '1px solid #6b7280',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    position: 'relative'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-1px)'
    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)'
    e.currentTarget.style.boxShadow = 'none'
  }}
  >
    <div style={{
      width: '100%',
      height: '100px',
      background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
      borderRadius: '6px',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <i className="fa-solid fa-briefcase" style={{ 
        fontSize: '24px', 
        color: '#9ca3af' 
      }}></i>
    </div>
    <h4 style={{ 
      fontSize: '13px', 
      fontWeight: '500', 
      color: '#1f2937',
      margin: '0 0 6px 0',
      lineHeight: '1.3',
      height: '34px',
      overflow: 'hidden',
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical'
    }}>
      {item.name}
    </h4>
    <p style={{ 
      fontSize: '14px', 
      fontWeight: '600', 
      color: '#7d8d86',
      margin: '0 0 8px 0'
    }}>
      {item.price ? `€${item.price.toFixed(2)}` : 'Custom Price'}
    </p>
    <button
      onClick={() => onAdd(item)}
      style={{
        background: '#7d8d86',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: '500',
        cursor: 'pointer',
        width: '100%',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#3e3f29'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#7d8d86'
      }}
    >
      <i className="fa-solid fa-plus" style={{ fontSize: '10px' }}></i>
      Add
    </button>
  </div>
)

export default ProductGrid
