import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from '@docusaurus/router';
import { translate } from '@docusaurus/Translate';
import SearchHistory from '@site/src/components/SearchHistory/SearchHistory';

const CustomSearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const searchInputRef = useRef(null);
  const location = useLocation();

  const MAX_HISTORY_ITEMS = 3;

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('docusaurus_search_history');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }
  }, []);

  // Close search when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Save search query to history
  const saveToHistory = (query) => {
    if (!query || query.trim() === '') return;

    const newHistory = [query, ...searchHistory.filter(item => item !== query)].slice(0, MAX_HISTORY_ITEMS);
    setSearchHistory(newHistory);
    localStorage.setItem('docusaurus_search_history', JSON.stringify(newHistory));
  };

  const handleSearch = (query) => {
    if (query) {
      saveToHistory(query);
      // Perform the search - this would typically redirect to search results
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  };

  const handleHistoryClick = (term) => {
    setSearchQuery(term);
    handleSearch(term);
    setIsOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSearch(searchQuery);
    setIsOpen(false);
  };

  return (
    <div className="navbar__search" id="search-container">
      <div className="search-wrapper">
        <input
          ref={searchInputRef}
          className="navbar__search-input"
          aria-label={translate({ message: 'Search', id: 'searchAriaLabel' })}
          placeholder={translate({ message: 'Search...', id: 'searchPlaceholder' })}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSearch(searchQuery);
              setIsOpen(false);
            }
          }}
        />
        <button
          className="search-button"
          onClick={() => {
            handleSearch(searchQuery);
            setIsOpen(false);
          }}
        >
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z" fill="currentColor"/>
          </svg>
        </button>

        {isOpen && (
          <div className="search-dropdown">
            <SearchHistory />
            {searchQuery && searchQuery.trim() !== '' && (
              <div className="search-suggestions">
                <div
                  className="search-suggestion-item"
                  onClick={() => {
                    handleSearch(searchQuery);
                    setIsOpen(false);
                  }}
                >
                  Search for: "{searchQuery}"
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomSearchBar;