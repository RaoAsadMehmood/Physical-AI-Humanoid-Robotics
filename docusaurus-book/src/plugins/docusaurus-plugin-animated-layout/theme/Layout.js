import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import OriginalLayout from '@theme-original/Layout';
import { useHistory } from '@docusaurus/router';

const variants = {
  hidden: { opacity: 0, x: 0, y: 20 },
  enter: { opacity: 1, x: 0, y: 0, transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] } },
  exit: { opacity: 0, x: 0, y: 0, transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] } },
};

const AnimatedLayout = (props) => {
  const history = useHistory();

  return (
    <OriginalLayout {...props}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={history.location.pathname}
          variants={variants}
          initial="hidden"
          animate="enter"
          exit="exit"
          transition={{ type: 'linear' }}
          style={{ width: '100%', minHeight: '100vh' }}
        >
          {props.children}
        </motion.div>
      </AnimatePresence>
    </OriginalLayout>
  );
};

export default AnimatedLayout;