"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { themeColors } from '../../lib/site';

type Theme = 'light' | 'dark';
type ToggleOrigin = { x: number; y: number };
type ThemeContextType = {
  theme: Theme;
  toggleTheme: (origin?: ToggleOrigin) => void;
};
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => unknown;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;

  let themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta');
    themeColorMeta.setAttribute('name', 'theme-color');
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.setAttribute('content', themeColors[theme]);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  
  useEffect(() => {
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const getSystemTheme = (): Theme => colorSchemeQuery.matches ? 'dark' : 'light';
    let storedTheme: string | null = null;
    try {
      storedTheme = localStorage.getItem('theme');
    } catch {}

    if (isTheme(storedTheme)) {
      setTheme(storedTheme);
      applyTheme(storedTheme);
    } else {
      try {
        localStorage.removeItem('theme');
      } catch {}
      const initialTheme = getSystemTheme();
      setTheme(initialTheme);
      applyTheme(initialTheme);
    }

    const syncSystemTheme = (event: MediaQueryListEvent) => {
      try {
        if (isTheme(localStorage.getItem('theme'))) return;
      } catch {}

      const nextTheme = event.matches ? 'dark' : 'light';
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    colorSchemeQuery.addEventListener('change', syncSystemTheme);
    return () => colorSchemeQuery.removeEventListener('change', syncSystemTheme);
  }, []);
  
  const toggleTheme = useCallback((origin?: ToggleOrigin) => {
    // Read the live attribute so the toggle is correct even before React state settles.
    const currentTheme: Theme =
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const newTheme: Theme = currentTheme === 'light' ? 'dark' : 'light';

    const applyNext = () => {
      applyTheme(newTheme);
      setTheme(newTheme);
      try {
        localStorage.setItem('theme', newTheme);
      } catch {}
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startViewTransition = (document as DocumentWithViewTransition).startViewTransition;

    if (typeof startViewTransition !== 'function' || prefersReducedMotion) {
      applyNext();
      return;
    }

    const root = document.documentElement;
    const x = origin?.x ?? window.innerWidth;
    const y = origin?.y ?? 0;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    );
    root.style.setProperty('--vt-x', `${x}px`);
    root.style.setProperty('--vt-y', `${y}px`);
    root.style.setProperty('--vt-r', `${endRadius}px`);

    startViewTransition.call(document, applyNext);
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
