import React from 'react'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  placeholder?: string
  showResults?: boolean
  resultsCount?: number
  onClearSearch?: () => void
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  placeholder = "Search...",
  showResults = false,
  resultsCount = 0,
  onClearSearch
}) => {
  return (
    <div className={styles.searchBarContainer}>
      <div className={styles.searchInputWrapper}>
        <i className={`fa-solid fa-search ${styles.searchIcon}`}></i>
        <input
          type="text"
          placeholder={placeholder}
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
      
      {showResults && searchTerm && (
        <div className={styles.searchResults}>
          <span className={styles.resultsCount}>
            {resultsCount} result{resultsCount !== 1 ? 's' : ''} found
          </span>
        </div>
      )}
    </div>
  )
}

export default SearchBar
