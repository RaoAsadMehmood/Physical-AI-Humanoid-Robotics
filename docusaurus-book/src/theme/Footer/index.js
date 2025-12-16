import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">

        <div className={styles.top}>
          <h2 className={styles.title}>
            Physical AI & Humanoid Robotics
          </h2>
          <p className={styles.tagline}>
            Bridging the Digital Brain to the Physical Body
          </p>
        </div>

        <div className={styles.grid}>
          <div>
            <h4>Learn</h4>
            <Link to="/docs/intro">Getting Started</Link>
            <Link to="/docs">Modules</Link>
            <Link to="/blog">Blog</Link>
          </div>

          <div>
            <h4>Project</h4>
            <Link to="/about">About</Link>
            <Link to="/blog">Blog</Link>

            {/* <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
              Twitter
            </a> */}
          </div>

          <div>
            <h4>AI Stack</h4>
            <span>ROS 2</span>
            <span>Isaac Sim</span>
            <span>RAG Chatbot</span>
          </div>
        </div>

        <div className={styles.bottom}>
          © {new Date().getFullYear()} Physical AI & Humanoid Robotics• Built with Docusaurus by{' '}
          <a
            href="https://raoadad.site"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--ifm-color-primary)', marginLeft: 4 }}
          >
            Rao Asad Mehmood
          </a>
        </div>

      </div>
    </footer>
  );
}
