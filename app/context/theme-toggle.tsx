"use client";

import { useState, useEffect } from 'react';
import { useTheme } from './theme-context';

type ThemeToggleProps = {
  isChineseLocale?: boolean;
};

export default function ThemeToggle({ isChineseLocale = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isLightTheme = theme === 'light';
  const labels = isChineseLocale
    ? {
      title: isLightTheme ? '深色模式' : '浅色模式',
      aria: isLightTheme ? '切换到深色模式' : '切换到浅色模式',
    }
    : {
      title: isLightTheme ? 'Dark mode' : 'Light mode',
      aria: isLightTheme ? 'Switch to dark mode' : 'Switch to light mode',
    };
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <div className="theme-toggle-placeholder" aria-hidden="true" />;
  }

  return (
    <button 
      type="button"
      onClick={toggleTheme}
      className="theme-toggle"
      title={labels.title}
      aria-label={labels.aria}
      aria-pressed={theme === 'dark'}
    >
      {isLightTheme ? (
        <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      ) : (
        <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      )}
    </button>
  );
}
