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
      {/* Hairline toolbar - Tasks page style */}
      <div className={styles.searchBarSection}>
        <div className={styles.searchBarWrapper}>
          {/* Search */}
          {onSearchChange && (
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
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              )}
            </div>
          )}
          
          {/* Search Results */}
          {showSearchResults && searchTerm && (
            <div className={styles.searchResults}>
              <span className={styles.resultsCount}>
                {searchResultsCount} result{searchResultsCount !== 1 ? 's' : ''} found
              </span>
            </div>
          )}
          
          {/* Filters - Inline with search */}
          <div className={styles.filtersSection}>
            {filters.map((filter, index) => (
              <select
                key={index}
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
            ))}
            
            {sortOptions.map((sort, index) => (
              <select
                key={index}
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
            ))}
            
            {onSortToggle && (
              <button
                onClick={onSortToggle}
                className={styles.sortToggleButton}
              >
                <i className={`fa-solid fa-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
              </button>
            )}
            
            {hasActiveFilters && onClearFilters && (
              <button
                onClick={onClearFilters}
                className={styles.clearFiltersButton}
              >
                <i className="fa-solid fa-times"></i>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchContainer
