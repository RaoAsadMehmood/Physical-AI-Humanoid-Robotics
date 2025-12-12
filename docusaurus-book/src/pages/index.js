// docusaurus-book/src/pages/index.js
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';
import { motion } from 'framer-motion';
import React, { useState } from 'react';

const ACCENT = '#9A4EAE';

const STATS_DATA = [
  { value: '4', label: 'CORE MODULES', sublabel: 'Modular Learning' },
  { value: '150+', label: 'TECHNICAL TOPICS', sublabel: 'In-Depth Topics' },
  { value: '2', label: 'LANGUAGES', sublabel: 'English & Roman Urdu' },
  { value: '2025', label: 'JAZZY EDITION', sublabel: 'Latest Release' },
];

const FEATURES_DATA = [
  { title: 'Simulation-First Approach', description: "Master concepts in Gazebo and Isaac Sim before hardware deployment.", icon: '🔬' },
  { title: 'Production ROS 2', description: 'Nodes, lifecycle & best practices for production-grade systems.', icon: '⚡' },
  { title: 'Bilingual Support', description: 'Complete content in English and Roman Urdu.', icon: '🌐' },
  { title: 'Open Source', description: '100% Free & Open.', icon: '💾' },
  { title: 'Physical AI Integration', description: 'Bridge LLMs with physical actuation using VLA.', icon: '🧠' },
];

const AUDIENCE_DATA = [
  { title: 'ROBOTICS ENGINEERS', description: 'From classical control to AI-driven robotics.' },
  { title: 'AI RESEARCHERS', description: 'Apply LLMs and VLA to embodied systems.' },
  { title: 'STUDENTS', description: 'From Hello World to humanoid control.' },
  { title: 'HOBBYISTS', description: 'Build advanced robots without expensive hardware.' },
];

const container = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { y: 24, opacity: 0 }, visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 14, stiffness: 120 } } };
const floatAnim = { hover: { y: -8, boxShadow: '0 18px 40px rgba(154,78,174,0.22)', scale: 1.02 } };
const breathingKeyframes = {
  y: [0, -10, 0],
  scale: [1, 1.03, 1],
  boxShadow: [
    '0 18px 46px rgba(0,0,0,0.45)',
    '0 30px 72px rgba(0,0,0,0.62)',
    '0 18px 46px rgba(0,0,0,0.45)',
  ],
};

function HeroSection() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <motion.div variants={container} initial="hidden" animate="visible" className="text--center">
          <motion.div variants={item} className={styles.heroEyebrow} style={{ borderColor: ACCENT }}>
            THE FUTURE OF ROBOTICS — ROS 2 & ISAAC SIM
          </motion.div>
          <motion.div variants={item}>
            <Heading as="h1" className={clsx('hero__title', styles.gradientTitle)}>{siteConfig.title}</Heading>
          </motion.div>
          <motion.div variants={item}>
            <p className="hero__subtitle" style={{ color: 'var(--ifm-color-wash)' }}>
              Master the stack: ROS 2, NVIDIA Isaac, digital twins, and Vision-Language-Action models.
            </p>
          </motion.div>

          <motion.div variants={item} className={styles.buttons}>
            <Link className={clsx('button button--lg', styles.primaryButton)} to="/docs/chapter1/week-plan/week1-lesson1-introduction-ros2-physical-ai">Start Learning ROS 2</Link>
            <Link className={clsx('button button--lg', styles.secondaryButton)} to="/docs/intro">Explore Modules</Link>
          </motion.div>
        </motion.div>
      </div>
    </header>
  );
}

function StatsSection() {
  return (
    <section className={clsx('padding-vert--xl', styles.statsSection)}>
      <div className="container">
        <motion.div className="row" variants={container} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {STATS_DATA.map((s, i) => (
            <motion.div key={i} className="col col--3" variants={item}>
              <div className={clsx('text--center', styles.statCard)}>
                <div className={styles.statValue}>{s.value}</div>
                <p className={styles.statLabel}>{s.label}</p>
                <p className={styles.statSublabel}>{s.sublabel}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function WhyBookSection() {
  return (
    <section className={clsx('padding-vert--xl', styles.whyBookSection)}>
      <div className="container">
        <Heading as="h2" className={clsx('text--center', styles.sectionTitle)}>Why This Book?</Heading>
        <div className="row">
          {FEATURES_DATA.map((f, idx) => (
            <motion.div key={idx} className={clsx('col', idx === 0 || idx === 3 ? 'col--6' : 'col--3')} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.08 }}>
              <motion.div className={clsx('card', styles.featureBlock)} whileHover="hover" variants={floatAnim}>
                <div className={styles.featureTitle}>{f.title}</div>
                <p>{f.description}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CodeSection() {
  return (
    <section className={clsx('padding-vert--xl', styles.codeSection)}>
      <div className="container">
        <Heading as="h2" className={clsx('text--center', styles.sectionTitle)}>Real World Code. Real World Physics.</Heading>

        <motion.div className={styles.codeBlockWrapper} initial={{ opacity: 0, scale: 0.98, y: 20 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 60 }}>
          <motion.div
            className={styles.codeMockup}
            whileHover={{ y: -12, boxShadow: '0 30px 60px rgba(0,0,0,0.6)' }}
            animate={breathingKeyframes}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className={styles.codeHeader}>
              <div className={styles.windowControls}>
                <span className={clsx(styles.windowDot, styles.dotRed)} />
                <span className={clsx(styles.windowDot, styles.dotYellow)} />
                <span className={clsx(styles.windowDot, styles.dotGreen)} />
              </div>
              <div className={styles.codeTabs}>
                <span className={clsx(styles.codeTab, styles.activeTab)}>robot_controller.py</span>
                <span className={styles.codeTab}>robot.urdf</span>
              </div>
              <span className={styles.spacer} />
            </div>

            <div className={styles.codeBody}>
              <pre className={styles.codePre}>
{`import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist

class RobotController(Node):
    def __init__(self):
        super().__init__('robot_controller')
        self.cmd_pub = self.create_publisher(Twist, '/cmd_vel', 10)
        self.timer = self.create_timer(0.5, self.timer_callback)
        self.get_logger().info("Controller Node Started")

    def timer_callback(self):
        msg = Twist()
        msg.linear.x = 2.0
        msg.angular.z = 0.5
        self.cmd_pub.publish(msg)
`}
              </pre>

              <div className={styles.simOutput}>
                <div>[INFO] Controller Node Started</div>
                <div>[INFO] Publishing Cmd: Linear: 2.0, Angular: 0.5</div>
                <div>[INFO] Publishing Cmd: Linear: 2.0, Angular: 0.5</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <div className={clsx('text--center', 'margin-top--lg')}>
          <Link className={clsx('button button--lg', styles.primaryButton)} to="/docs/chapter1/week-plan/week4-lesson4-understanding-urdf">Build Your First Node →</Link>
        </div>
      </div>
    </section>
  );
}

function InnovatorsSection() {
  return (
    <section className={clsx('padding-vert--xl', styles.innovatorsSection)}>
      <div className="container">
        <Heading as="h2" className={clsx('text--center', styles.sectionTitle)}>Built For Innovators</Heading>
        <div className="row">
          {AUDIENCE_DATA.map((a, idx) => (
            <motion.div key={idx} className="col col--3" initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: idx * 0.06 }}>
              <motion.div className={clsx('card', styles.audienceCard)} whileHover="hover" variants={floatAnim}>
                <Heading as="h4" className={styles.audienceTitle}>{a.title}</Heading>
                <p>{a.description}</p>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <Heading as="h2" className={clsx('text--center', styles.sectionTitle, 'margin-top--xl')}>Trusted by Developers Worldwide</Heading>

        <div className="row">
          <motion.div className="col col--4" initial={{ y: 20 }} whileInView={{ y: 0 }} viewport={{ once: true }}>
            <motion.div className={clsx('card', styles.testimonial)} whileHover={{ y: -8 }}>
              <div className={styles.testimonialHeader}>Sarah Chen</div>
              <p>Helped me transition simulation experiments to production robots with confidence.</p>
            </motion.div>
          </motion.div>
          <motion.div className="col col--4" initial={{ y: 20 }} whileInView={{ y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }}>
            <motion.div className={clsx('card', styles.testimonial)} whileHover={{ y: -8 }}>
              <div className={styles.testimonialHeader}>Marcus Johnson</div>
              <p>Detailed ROS 2 patterns and lifecycle management made our stack stable.</p>
            </motion.div>
          </motion.div>
          <motion.div className="col col--4" initial={{ y: 20 }} whileInView={{ y: 0 }} viewport={{ once: true }} transition={{ delay: 0.12 }}>
            <motion.div className={clsx('card', styles.testimonial)} whileHover={{ y: -8 }}>
              <div className={styles.testimonialHeader}>Aisha Patel</div>
              <p>Excellent bridge between AI models and physical actuation workflows.</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    { q: 'Who is this book for?', a: 'Engineers, researchers, students, and hobbyists who want production-oriented robotics with simulation-first workflows.' },
    { q: 'Do I need expensive hardware?', a: 'No — everything can be learned and tested in simulation before hardware deployment.' },
    { q: 'Which ROS version?', a: 'ROS 2 (latest stable release), with production lifecycle examples.' },
    { q: 'Are code examples bilingual?', a: 'Yes — explanations available in English and Roman Urdu.' },
    { q: 'Is this open source?', a: 'Yes — all materials are freely available.' },
    { q: 'How do I contribute?', a: 'Open a PR on the repo with improvements or new examples.' },
  ];

  const [open, setOpen] = useState(0);

  return (
    <section className={clsx('padding-vert--lg', styles.faqSection)}>
      <div className="container">
        <Heading as="h2" className={clsx('text--center', styles.sectionTitle)}>Frequently Asked Questions</Heading>
        <div className={styles.faqGrid}>
          {faqs.map((f, i) => (
            <div key={i} className={styles.faqItem}>
              <button className={styles.faqQ} onClick={() => setOpen(open === i ? -1 : i)}>
                {f.q}
                <span className={styles.chev}>{open === i ? '-' : '+'}</span>
              </button>
              <div className={clsx(styles.faqA, open === i ? styles.faqOpen : '')}>{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout title="Physical AI & Humanoid Robotics" description="Comprehensive guide to Physical AI and Humanoid Robotics">
      <div className={styles.pageWrap}>
        <HeroSection />
        <main>
          <StatsSection />
          <WhyBookSection />
          <CodeSection />
          <InnovatorsSection />
          <FAQSection />
        </main>
      </div>
    </Layout>
  );
}
