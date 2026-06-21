"use client";

import { usePageLocale } from './usePageLocale';

export default function SkipLink() {
  const { isChineseLocale } = usePageLocale();
  const label = isChineseLocale ? '跳到正文' : 'Skip to content';

  return (
    <a href="#main-content" className="skip-link">
      {label}
    </a>
  );
}
