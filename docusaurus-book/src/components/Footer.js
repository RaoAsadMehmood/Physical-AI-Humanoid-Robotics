import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import { useThemeConfig } from '@docusaurus/theme-common';
import useBaseUrl from '@docusaurus/useBaseUrl';

import styles from './Footer.module.css';

function FooterLink({ to, href, label, prependBaseUrlToHref, ...props }) {
  const toUrl = useBaseUrl(to);
  const hrefUrl = useBaseUrl(href, { forcePrependBaseUrl: true });

  return (
    <Link
      {...(href
        ? {
            href: prependBaseUrlToHref ? hrefUrl : href,
          }
        : {
            to: toUrl,
          })}
      {...props}>
      {label}
    </Link>
  );
}

function MultiColumnFooter() {
  const themeConfig = useThemeConfig();
  const { footer } = themeConfig;

  if (!footer.links) {
    return null;
  }

  const linksGroups = footer.links.map((linksGroup, i) => (
    <div key={i} className="col footer__col">
      <h4 className="footer__title">{linksGroup.title}</h4>
      <ul className="footer__items">
        {linksGroup.items.map((item, key) => (
          <li key={key} className="footer__item">
            <FooterLink {...item} />
          </li>
        ))}
      </ul>
    </div>
  ));

  return (
    <div className="row">
      {linksGroups}
    </div>
  );
}

function SimpleFooter() {
  const themeConfig = useThemeConfig();
  const { footer } = themeConfig;

  if (!footer.links) {
    return null;
  }

  return (
    <div className="footer__links">
      {footer.links.map((item, key) => (
        <div key={key} className="footer__item margin-horiz--sm">
          <FooterLink {...item} />
        </div>
      ))}
    </div>
  );
}

export default function Footer() {
  const themeConfig = useThemeConfig();
  const { footer } = themeConfig;

  if (!footer) {
    return null;
  }

  const { copyright, links, style } = footer;

  return (
    <footer
      className={clsx('footer', {
        'footer--dark': style === 'dark',
      })}>
      <div className="container container-fluid">
        {links && links.length > 0 && (footer.layout === 'compact' ? <SimpleFooter /> : <MultiColumnFooter />)}
        {copyright && (
          <div className="footer__bottom text--center">
            <div className="margin-horiz--md" dangerouslySetInnerHTML={{ __html: copyright }} />
          </div>
        )}
      </div>
    </footer>
  );
}