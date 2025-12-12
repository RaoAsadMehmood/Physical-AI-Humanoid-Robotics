import React, { useState, useEffect } from 'react';
import { useSearchQuery } from '@docusaurus/theme-common';
import { translate } from '@docusaurus/Translate';

const MAX_HISTORY_ITEMS = 3;

const SearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState([]);
  const { query } = useSearchQuery();

  // Load search history from localStorage on component mount
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

  // Save search query to history when query changes
  useEffect(() => {
    if (query && query.trim() !== '') {
      const newHistory = [query, ...searchHistory.filter(item => item !== query)].slice(0, MAX_HISTORY_ITEMS);
      setSearchHistory(newHistory);
      localStorage.setItem('docusaurus_search_history', JSON.stringify(newHistory));
    }
  }, [query]);

  const handleHistoryItemClick = (searchTerm) => {
    // This will be handled by the search modal
    window.dispatchEvent(new CustomEvent('searchHistoryClick', { detail: { term: searchTerm } }));
  };

  if (searchHistory.length === 0) {
    return null;
  }

  return (
    <div className="search-history-container">
      <div className="search-history-title">
        {translate({ message: 'Recent Searches', id: 'searchHistoryTitle' })}
      </div>
      {searchHistory.map((item, index) => (
        <div
          key={index}
          className="search-history-item"
          onClick={() => handleHistoryItemClick(item)}
        >
          {item}
        </div>
      ))}
    </div>
  );
};

export default SearchHistory;