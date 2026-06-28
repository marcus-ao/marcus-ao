"use client";

import { useEffect, useRef, useState } from 'react';

type BackToTopProps = {
  label?: string;
};

export default function BackToTop({ label = 'Back to the top' }: BackToTopProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [hasFocus, setHasFocus] = useState(false);
  const frameRef = useRef<number | null>(null);
  const visibleRef = useRef(false);

  useEffect(() => {
    const updateVisibility = () => {
      frameRef.current = null;
      const shouldShow = window.scrollY > 300;

      if (visibleRef.current === shouldShow) {
        return;
      }

      visibleRef.current = shouldShow;
      setShowScrollTop(shouldShow);
    };

    const handleScroll = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(updateVisibility);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateVisibility();

    return () => {
      window.removeEventListener('scroll', handleScroll);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  };

  const isAccessible = showScrollTop || hasFocus;

  return (
    <button
      type="button"
      className={`scroll-to-top ${isAccessible ? 'visible' : ''}`}
      onClick={(event) => {
        scrollToTop();
        event.currentTarget.blur();
      }}
      onFocus={() => setHasFocus(true)}
      onBlur={() => setHasFocus(false)}
      aria-label={label}
      aria-hidden={!isAccessible}
      tabIndex={isAccessible ? 0 : -1}
    >
      <svg
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19V5" />
        <path d="m5 12 7-7 7 7" />
      </svg>
    </button>
  );
}
