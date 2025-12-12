import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import {useEffect} from 'react';
import {render} from 'react-dom';

import CustomSearchBar from '@site/src/components/SearchHistory/CustomSearchBar';

export default function SearchMetadata() {
  useEffect(() => {
    if (!ExecutionEnvironment.canUseDOM) {
      return undefined;
    }

    const searchComponent = document.getElementById('custom-search-component');
    if (searchComponent) {
      render(<CustomSearchBar />, searchComponent);
    }

    return () => {
      if (searchComponent) {
        searchComponent.innerHTML = '';
      }
    };
  }, []);

  return null;
}