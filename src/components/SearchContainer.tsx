import React from 'react'
import styles from './SearchContainer.module.css'

interface SearchContainerProps {
  searchTerm?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  showSearchResults?: boolean
  searchResultsCount?: number
  onClearSearch?: () => void
  filters?: Array<{
    label: string
    value: string
    onChange: (value: string) => void
    options: Array<{ value: string; label: string }>
  }>
  sortOptions?: Array<{
    label: string
    value: string
    onChange: (value: string) => void
    options: Array<{ value: string; label: string }>
  }>
  onSortToggle?: () => void
  sortOrder?: 'asc' | 'desc'
  onClearFilters?: () => void
  hasActiveFilters?: boolean
}

const SearchContainer: React.FC<SearchContainerProps> = ({
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = "Search...",
  showSearchResults = false,
  searchResultsCount = 0,
  onClearSearch,
  filters = [],
  sortOptions = [],
  onSortToggle,
  sortOrder = 'desc',
  onClearFilters,
  hasActiveFilters = false
}) => {
  return (
    <div className={styles.searchContainer}>
      {/* Search Bar */}
      {onSearchChange && (
        <div className={styles.searchBarSection}>
          <div className={styles.searchBarWrapper}>
            <div className={styles.searchInputWrapper}>
              <i className={`fa-solid fa-search ${styles.searchIcon}`}></i>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className={styles.searchInput}
              />
              {searchTerm && onClearSearch && (
                <button
                  onClick={onClearSearch}
                  className={styles.clearButton}
                  title="Clear search"
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              )}
            </div>
            
            {showSearchResults && searchTerm && (
              <div className={styles.searchResults}>
                <span className={styles.resultsCount}>
                  {searchResultsCount} result{searchResultsCount !== 1 ? 's' : ''} found
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Filters Section */}
      {(filters.length > 0 || sortOptions.length > 0 || onSortToggle || hasActiveFilters) && (
        <div className={styles.filtersSection}>
          <div className={styles.filtersContainer}>
            {filters.map((filter, index) => (
              <div key={index} className={styles.filterGroup}>
                <label className={styles.filterLabel}>{filter.label}:</label>
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className={styles.filterSelect}
                >
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            
            {sortOptions.map((sort, index) => (
              <div key={index} className={styles.filterGroup}>
                <label className={styles.filterLabel}>{sort.label}:</label>
                <select
                  value={sort.value}
                  onChange={(e) => sort.onChange(e.target.value)}
                  className={styles.filterSelect}
                >
                  {sort.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            
            {onSortToggle && (
              <button
                onClick={onSortToggle}
                className={styles.sortToggleButton}
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
              </button>
            )}
            
            {hasActiveFilters && onClearFilters && (
              <button
                onClick={onClearFilters}
                className={styles.clearFiltersButton}
                title="Clear all filters"
              >
                <i className="fa-solid fa-times"></i>
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchContainer
