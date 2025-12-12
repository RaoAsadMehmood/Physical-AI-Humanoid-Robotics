import React from 'react';
import {useEffect} from 'react';
import {AnimatePresence} from 'framer-motion';
import { useHistory } from '@docusaurus/router';

// This component handles the AnimatePresence wrapper for page transitions
export const PageTransitionWrapper = ({children}) => {
  const history = useHistory();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <div key={history.location.pathname} style={{ width: '100%', minHeight: '100vh' }}>
        {children}
      </div>
    </AnimatePresence>
  );
};

export default PageTransitionWrapper;