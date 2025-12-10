import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className="text--center">
          {/* Futuristic robot graphic placeholder */}
          <div className={styles.heroGraphic}>
            <svg
              className={styles.robotIcon}
              viewBox="0 0 100 100"
              width="120"
              height="120"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Head */}
              <circle cx="50" cy="25" r="12" fill="var(--ifm-color-primary)" />
              {/* Body */}
              <rect x="35" y="37" width="30" height="35" fill="var(--ifm-color-primary-light)" />
              {/* Arms */}
              <rect x="20" y="45" width="15" height="8" fill="var(--ifm-color-primary)" />
              <rect x="65" y="45" width="15" height="8" fill="var(--ifm-color-primary)" />
              {/* Legs */}
              <rect x="40" y="72" width="8" height="20" fill="var(--ifm-color-primary-dark)" />
              <rect x="52" y="72" width="8" height="20" fill="var(--ifm-color-primary-dark)" />
              {/* Tech details */}
              <circle cx="45" cy="22" r="2" fill="#000" />
              <circle cx="55" cy="22" r="2" fill="#000" />
              <rect x="48" y="28" width="4" height="2" fill="#000" />
            </svg>
          </div>

          <Heading as="h1" className="hero__title">
            Physical AI & Humanoid Robotics
          </Heading>
          <p className="hero__subtitle">
            Bridging the Digital Brain to the Physical Body
          </p>

          <div className={styles.buttons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/chapter1">
              START READING
            </Link>
          </div>

          <div className={styles.tagline}>
            <p>Master ROS 2, Simulation, NVIDIA Isaac, and Vision-Language-Action Models</p>
          </div>

          {/* Technical highlights */}
          <div className={styles.techHighlights}>
            <span className={styles.techTag}>#ROS2</span>
            <span className={styles.techTag}>#NVIDIA</span>
            <span className={styles.techTag}>#AI</span>
            <span className={styles.techTag}>#Robotics</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Physical AI & Humanoid Robotics`}
      description="Comprehensive guide to Physical AI and Humanoid Robotics: ROS 2, Simulation, NVIDIA Isaac, and VLA models">
      <HomepageHeader />
      <main>
        <section className={styles.features}>
          <div className="container">
            <div className="row">
              <div className="col col--4">
                <div className="text--center padding-horiz--md">
                  <Heading as="h3">🤖 ADVANCED ROBOTICS</Heading>
                  <p>Learn cutting-edge techniques in humanoid robotics and Physical AI systems.</p>
                </div>
              </div>
              <div className="col col--4">
                <div className="text--center padding-horiz--md">
                  <Heading as="h3">🧠 AI INTEGRATION</Heading>
                  <p>Bridge artificial intelligence with physical systems for intelligent robotics.</p>
                </div>
              </div>
              <div className="col col--4">
                <div className="text--center padding-horiz--md">
                  <Heading as="h3">⚡ PRACTICAL APPLICATIONS</Heading>
                  <p>Real-world examples with NVIDIA Isaac, ROS 2, and Vision-Language-Action models.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
