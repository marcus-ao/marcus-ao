"use client";

import Fuse from 'fuse.js';
import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

type SearchRecord = {
  section: string;
  slug: string;
  href: string;
  external: boolean;
  title: string;
  description: string;
  date: string;
  tags: string[];
  text: string;
};

type SearchLabels = {
  close: string;
  external: string;
  loadFailed: string;
  loading: string;
  noResults: string;
  openInNewTab: string;
  placeholder: string;
  retry: string;
  search: string;
  searchPosts: string;
  sectionLabels: Record<string, string>;
};

type SearchModalProps = {
  isChineseLocale?: boolean;
};

const englishLabels: SearchLabels = {
  close: 'Close search',
  external: 'External',
  loadFailed: 'Search index could not be loaded.',
  loading: 'Loading...',
  noResults: 'No results',
  openInNewTab: 'opens in a new tab',
  placeholder: 'Search',
  retry: 'Retry',
  search: 'Search',
  searchPosts: 'Search posts',
  sectionLabels: {
    blog: 'Blog',
    share: 'Share',
  },
};

const chineseLabels: SearchLabels = {
  close: '关闭搜索',
  external: '外部',
  loadFailed: '无法加载搜索索引。',
  loading: '加载中...',
  noResults: '没有找到结果',
  openInNewTab: '在新标签页打开',
  placeholder: '搜索文章',
  retry: '重试',
  search: '搜索',
  searchPosts: '搜索文章',
  sectionLabels: {
    blog: '博客',
    share: '分享',
  },
};

function isSearchRecord(record: unknown): record is SearchRecord {
  if (!record || typeof record !== 'object') {
    return false;
  }

  const candidate = record as Partial<SearchRecord>;

  return (
    typeof candidate.section === 'string' &&
    typeof candidate.slug === 'string' &&
    typeof candidate.href === 'string' &&
    typeof candidate.external === 'boolean' &&
    typeof candidate.title === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.date === 'string' &&
    Array.isArray(candidate.tags) &&
    candidate.tags.every(tag => typeof tag === 'string') &&
    typeof candidate.text === 'string'
  );
}

function isEditableShortcutTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable
    || tagName === 'input'
    || tagName === 'select'
    || tagName === 'textarea'
    || Boolean(target.closest('[contenteditable="true"], [role="textbox"]'));
}

function isModalShortcutTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    && Boolean(target.closest('[role="dialog"][aria-modal="true"]'));
}

export default function SearchModal({ isChineseLocale = false }: SearchModalProps) {
  const searchFieldId = useId();
  const searchDialogId = useId();
  const searchDialogTitleId = useId();
  const searchResultsId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resultRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const restoreFocusTimerRef = useRef<number | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<SearchRecord[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const labels = isChineseLocale ? chineseLabels : englishLabels;

  const openSearch = useCallback(() => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : triggerRef.current;
    setLoadFailed(false);
    setOpen(true);
  }, []);

  const closeSearch = useCallback((options: { restoreFocus?: boolean } = {}) => {
    setOpen(false);
    setQuery('');
    if (restoreFocusTimerRef.current) {
      window.clearTimeout(restoreFocusTimerRef.current);
    }

    if (options.restoreFocus === false) {
      return;
    }

    restoreFocusTimerRef.current = window.setTimeout(() => {
      previouslyFocusedRef.current?.focus();
      restoreFocusTimerRef.current = null;
    }, 0);
  }, []);

  const retrySearchLoad = useCallback(() => {
    setLoadFailed(false);
    setHasLoaded(false);
    setLoadAttempt(attempt => attempt + 1);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (
          event.defaultPrevented
          || event.isComposing
          || isEditableShortcutTarget(event.target)
          || (!open && isModalShortcutTarget(event.target))
        ) {
          return;
        }

        event.preventDefault();
        if (open) {
          inputRef.current?.focus();
        } else {
          openSearch();
        }
      }
      if (!open) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeSearch();
      }
      if (event.key === 'Tab') {
        const focusableElements = Array.from(
          panelRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) || [],
        ).filter(element => element.offsetParent !== null);

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!firstElement || !lastElement) return;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSearch, open, openSearch]);

  useEffect(() => () => {
    if (restoreFocusTimerRef.current) {
      window.clearTimeout(restoreFocusTimerRef.current);
    }
    if (focusFrameRef.current) {
      window.cancelAnimationFrame(focusFrameRef.current);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    focusFrameRef.current = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      focusFrameRef.current = null;
    });

    return () => {
      if (focusFrameRef.current) {
        window.cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || hasLoaded) return;

    const controller = new AbortController();

    setLoadFailed(false);

    fetch('/search-index.json', { signal: controller.signal })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Search index request failed with ${response.status}`);
        }

        return response.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data) || !data.every(isSearchRecord)) {
          throw new Error('Search index response did not match the expected shape');
        }

        setRecords(data);
        setHasLoaded(true);
      })
      .catch(error => {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        console.error('Unable to load search index:', error);
        setLoadFailed(true);
      });

    return () => controller.abort();
  }, [hasLoaded, loadAttempt, open]);

  const fuse = useMemo(() => new Fuse(records, {
    keys: ['title', 'description', 'tags', 'text'],
    threshold: 0.35,
    ignoreLocation: true,
  }), [records]);

  const normalizedQuery = query.trim();
  const results = useMemo(() => (
    normalizedQuery
      ? fuse.search(normalizedQuery).slice(0, 8).map(result => result.item)
      : records.slice(0, 8)
  ), [fuse, normalizedQuery, records]);
  const isLoading = !hasLoaded && !loadFailed;

  const activeResultId = activeIndex >= 0 && activeIndex < results.length
    ? `${searchResultsId}-result-${activeIndex}`
    : undefined;

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      return;
    }

    setActiveIndex(results.length > 0 ? 0 : -1);
  }, [hasLoaded, open, query, results.length]);

  useEffect(() => {
    if (activeIndex < 0) return;

    resultRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  useEffect(() => {
    resultRefs.current = resultRefs.current.slice(0, results.length);
  }, [results.length]);

  const handleDialogKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.nativeEvent.isComposing || results.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(current => current < 0 ? 0 : (current + 1) % results.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(current => current < 0 ? results.length - 1 : (current - 1 + results.length) % results.length);
      return;
    }

    if (event.key === 'Enter') {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        target.closest('button')
      ) {
        return;
      }

      if (activeIndex < 0) return;

      event.preventDefault();
      resultRefs.current[activeIndex]?.click();
    }
  }, [activeIndex, results.length]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="search-trigger"
        title={labels.search}
        onClick={openSearch}
        aria-label={labels.search}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? searchDialogId : undefined}
      >
        <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.3-4.3"></path>
        </svg>
      </button>

      {open && (
        <div className="search-overlay" role="presentation" onPointerDown={() => closeSearch()}>
          <div
            ref={panelRef}
            id={searchDialogId}
            className="search-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={searchDialogTitleId}
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={handleDialogKeyDown}
          >
            <h2 id={searchDialogTitleId} className="sr-only">{labels.searchPosts}</h2>
            <div className="search-field-wrap">
              <label className="sr-only" htmlFor={searchFieldId}>{labels.searchPosts}</label>
              <input
                ref={inputRef}
                id={searchFieldId}
                className="search-field"
                type="search"
                autoComplete="off"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={labels.placeholder}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded="true"
                aria-controls={searchResultsId}
                aria-activedescendant={activeResultId}
              />
              <button type="button" className="search-close" onClick={() => closeSearch()} aria-label={labels.close}>
                ×
              </button>
            </div>

            <div
              id={searchResultsId}
              className="search-results"
              role="listbox"
              aria-busy={isLoading}
              aria-live="polite"
              aria-atomic="true"
            >
              {results.map((record, index) => {
                const resultContent = (
                  <>
                    <span className="search-result-section text-primary">
                      {labels.sectionLabels[record.section] || record.section}
                      {record.external && <span className="search-result-external">{labels.external}</span>}
                    </span>
                    <strong>{record.title}</strong>
                    {record.description && <span>{record.description}</span>}
                  </>
                );
                const resultProps = {
                  id: `${searchResultsId}-result-${index}`,
                  className: `search-result ${activeIndex === index ? 'is-active' : ''}`,
                  role: 'option',
                  'aria-selected': activeIndex === index,
                  'aria-label': record.external ? `${record.title} (${labels.openInNewTab})` : record.title,
                  onClick: () => closeSearch({ restoreFocus: false }),
                  onFocus: () => setActiveIndex(index),
                  onPointerEnter: () => setActiveIndex(index),
                };

                return record.external ? (
                  <a
                    key={`${record.section}:${record.slug}`}
                    ref={(element) => {
                      resultRefs.current[index] = element;
                    }}
                    href={record.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...resultProps}
                  >
                    {resultContent}
                  </a>
                ) : (
                  <Link
                    key={`${record.section}:${record.slug}`}
                    ref={(element) => {
                      resultRefs.current[index] = element;
                    }}
                    href={record.href}
                    {...resultProps}
                  >
                    {resultContent}
                  </Link>
                );
              })}
              {!hasLoaded && !loadFailed && (
                <p className="search-empty">{labels.loading}</p>
              )}
              {loadFailed && (
                <div className="search-empty search-load-error">
                  <p>{labels.loadFailed}</p>
                  <button type="button" className="search-retry" onClick={retrySearchLoad}>
                    {labels.retry}
                  </button>
                </div>
              )}
              {hasLoaded && results.length === 0 && (
                <p className="search-empty">{labels.noResults}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
