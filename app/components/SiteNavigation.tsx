"use client";

import ThemeToggle from '../context/theme-toggle';
import NavLinks from './NavLinks';
import SearchModal from './SearchModal';
import { usePageLocale } from './usePageLocale';

export default function SiteNavigation() {
  const { isChineseLocale } = usePageLocale();
  const ariaLabel = isChineseLocale ? '主导航' : 'Main navigation';

  return (
    <nav className="site-nav" aria-label={ariaLabel}>
      {/* Site chrome (nav + search) stays in English regardless of article locale to avoid mixed-language UI. */}
      <NavLinks />
      <SearchModal />
      <ThemeToggle isChineseLocale={isChineseLocale} />
    </nav>
  );
}
