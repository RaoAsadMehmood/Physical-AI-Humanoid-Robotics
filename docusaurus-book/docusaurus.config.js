// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Physical AI & Humanoid Robotics',
  tagline: 'Bridging the Digital Brain to the Physical Body',
  favicon: 'img/robot-favicon.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://your-docusaurus-site.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'], // Removed Urdu locale for translation feature
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
        gtag: {
          trackingID: 'G-WNEPGR5HWL',
          anonymizeIP: true,
        },
      }),
    ],
  ],

  themes: [
    '@docusaurus/theme-live-codeblock',
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        // ... your options
        hashed: true,
        // For Docs using Chinese, The `language` is recommended to set to:
        // ```
        // language: ["en", "zh"],
        // ```
        language: ["en"],
        // Optional: To search the content of external domain
        // externalUrlRegex: "external-domain\\.com",
        // Optional: To index all website pages
        indexDocs: true,
        indexBlog: true,
        indexPages: true,
        // Optional: To hide the search bar of the page
        hideSearchBarWithNoSearchContext: true,
        // Optional: To search the content of external domain
        // externalUrlRegex: "example-domain\\.com",
      },
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        fromExtensions: ['html'],
        toExtensions: ['html'],
      },
    ],
  ],

  themeConfig:
  /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
  ({
    image: 'img/docusaurus-social-card.jpg',
    metadata: [
      {name: 'keywords', content: 'ai, robotics, humanoid, physical ai, ros, gazebo, isaac'}
    ],
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },

    // --- START NAVBAR OPTIMIZATION ---
    navbar: {
      // Sleek Text Logo
      title: 'Physical AI & Humanoid Robotics',
      logo: {
        alt: 'Physical AI & Humanoid Robotics',
        src: 'img/robot-logo.svg',
        width: 32,
        height: 32,
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Chapters',
        },
        // [1] FUNCTIONAL SEARCH BAR (Standard Docusaurus Search)
        {
          type: 'search',
          position: 'right',
        },
        {
          href: 'https://github.com/RaoAsadMehmood/Physical-AI-Humanoid-Robotics',
          label: 'GitHub',
          position: 'right',
          className: 'header-github-link',
        },
      ],
    },
    // --- END NAVBAR OPTIMIZATION ---

    // ... [baaki settings jese footer aur prism settings remain] ...
  }),
};

export default config;
