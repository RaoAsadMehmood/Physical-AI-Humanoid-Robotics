import React from 'react';
import { motion } from 'framer-motion';
import Layout from '@theme/Layout';

const variants = {
  hidden: { opacity: 0, x: 0, y: 20 },
  enter: { opacity: 1, x: 0, y: 0, transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] } },
  exit: { opacity: 0, x: 0, y: 0, transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] } },
};

const AnimatedLayout = ({ children, ...props }) => {
  return (
    <Layout {...props}>
      <motion.main
        variants={variants}
        initial="hidden"
        animate="enter"
        exit="exit"
        transition={{ type: 'linear' }}
      >
        {children}
      </motion.main>
    </Layout>
  );
};

export default AnimatedLayout;