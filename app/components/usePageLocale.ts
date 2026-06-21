"use client";

import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';

type ContentLocaleState = {
  locale: string;
  pathname: string;
};

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function getRouteLocale(_pathname: string): string {
  return 'en-US';
}

function getMainContentLocale(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.getElementById('main-content')?.getAttribute('lang') || null;
}

function startsWithChineseLocale(locale: string | null): boolean {
  return Boolean(locale?.toLowerCase().startsWith('zh'));
}

export function usePageLocale() {
  const pathname = usePathname();
  const [contentLocale, setContentLocale] = useState<ContentLocaleState | null>(null);

  useIsomorphicLayoutEffect(() => {
    const routeLocale = getRouteLocale(pathname);
    const nextLocale = getMainContentLocale() || routeLocale;

    setContentLocale(current => (
      current?.locale === nextLocale && current.pathname === pathname
        ? current
        : { locale: nextLocale, pathname }
    ));

    if (document.documentElement.lang !== nextLocale) {
      document.documentElement.lang = nextLocale;
    }
  }, [pathname]);

  return useMemo(() => {
    const routeLocale = getRouteLocale(pathname);
    const locale = contentLocale?.pathname === pathname
      ? contentLocale.locale
      : routeLocale;

    return {
      isChineseLocale: startsWithChineseLocale(locale),
      locale,
      pathname,
    };
  }, [contentLocale, pathname]);
}
