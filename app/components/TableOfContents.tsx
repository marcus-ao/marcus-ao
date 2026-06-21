"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { TocItem } from '../../lib/notes';

type TableOfContentsProps = {
  ariaLabel?: string;
  items: TocItem[];
  title?: string;
};

// A heading becomes "active" once its top crosses this line below the viewport top.
const ACTIVE_LINE_OFFSET = 110;
const SMOOTH_SCROLL_SETTLE_MS = 900;

function getDecodedHashId() {
  const hash = window.location.hash.slice(1);
  if (!hash) return '';

  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
}

function getHeadingElements(ids: string[]) {
  return ids
    .map(id => document.getElementById(id))
    .filter((el): el is HTMLElement => Boolean(el));
}

function getScrollableTocRegion(container: HTMLElement) {
  const list = container.querySelector<HTMLElement>('.toc-list');

  return list && list.scrollHeight > list.clientHeight ? list : container;
}

function keepActiveLinkVisible(container: HTMLElement | null) {
  const activeLink = container?.querySelector<HTMLAnchorElement>('a[aria-current="location"]');
  if (!container || !activeLink) return;

  const scrollRegion = getScrollableTocRegion(container);
  const containerRect = scrollRegion.getBoundingClientRect();
  const linkRect = activeLink.getBoundingClientRect();
  const padding = 12;

  if (linkRect.top < containerRect.top + padding) {
    scrollRegion.scrollTop -= containerRect.top + padding - linkRect.top;
  } else if (linkRect.bottom > containerRect.bottom - padding) {
    scrollRegion.scrollTop += linkRect.bottom - containerRect.bottom + padding;
  }
}

export default function TableOfContents({
  ariaLabel = 'Table of contents',
  items,
  title = 'Contents',
}: TableOfContentsProps) {
  const ids = useMemo(() => items.map(item => item.id), [items]);
  const minDepth = useMemo(() => {
    if (items.length === 0) return 2;
    return Math.min(...items.map(item => item.depth));
  }, [items]);
  const [activeId, setActiveId] = useState(ids[0] || '');
  const desktopTocRef = useRef<HTMLElement>(null);
  const mobileTocRef = useRef<HTMLDetailsElement>(null);
  const lockUntilRef = useRef(0);
  const settleTimerRef = useRef<number | null>(null);
  const syncFrameRef = useRef<number | null>(null);

  const commitActiveId = useCallback((id: string) => {
    setActiveId(current => current === id ? current : id);
  }, []);

  const computeActiveId = useCallback((preferredId?: string) => {
    const headings = getHeadingElements(ids);
    if (headings.length === 0) return '';

    if (preferredId) {
      const preferredHeading = document.getElementById(preferredId);
      const preferredRect = preferredHeading?.getBoundingClientRect();
      if (
        preferredRect &&
        preferredRect.bottom > 0 &&
        preferredRect.top < window.innerHeight
      ) {
        return preferredId;
      }
    }

    let currentId = headings[0].id;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= ACTIVE_LINE_OFFSET) {
        currentId = heading.id;
      } else {
        break;
      }
    }

    // At the bottom, short final sections may never cross the active line.
    const reachedBottom =
      window.innerHeight + Math.ceil(window.scrollY) >=
      document.documentElement.scrollHeight - 2;
    if (reachedBottom) {
      const lastVisibleHeading = [...headings]
        .reverse()
        .find(heading => heading.getBoundingClientRect().top < window.innerHeight);

      return lastVisibleHeading?.id || headings[headings.length - 1].id;
    }

    return currentId;
  }, [ids]);

  const updateActiveId = useCallback((options?: { force?: boolean; preferredId?: string }) => {
    if (!options?.force && performance.now() < lockUntilRef.current) return;

    const nextActiveId = computeActiveId(options?.preferredId);
    if (nextActiveId) {
      commitActiveId(nextActiveId);
    }
  }, [commitActiveId, computeActiveId]);

  const scheduleForcedActiveIdUpdate = useCallback((preferredId?: string) => {
    if (syncFrameRef.current) {
      window.cancelAnimationFrame(syncFrameRef.current);
    }

    syncFrameRef.current = window.requestAnimationFrame(() => {
      syncFrameRef.current = null;
      updateActiveId({ force: true, preferredId });
    });
  }, [updateActiveId]);

  useEffect(() => {
    setActiveId(current => ids.includes(current) ? current : ids[0] || '');
  }, [ids]);

  useEffect(() => {
    if (ids.length === 0) return;

    const hashId = getDecodedHashId();
    if (ids.includes(hashId)) {
      commitActiveId(hashId);
      scheduleForcedActiveIdUpdate(hashId);
    } else {
      updateActiveId({ force: true });
    }

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateActiveId();
      });
    };

    const syncActiveFromLocation = () => {
      const nextHashId = getDecodedHashId();
      if (!ids.includes(nextHashId)) {
        scheduleForcedActiveIdUpdate();
        return;
      }

      commitActiveId(nextHashId);
      scheduleForcedActiveIdUpdate(nextHashId);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('hashchange', syncActiveFromLocation);
    window.addEventListener('popstate', syncActiveFromLocation);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      if (syncFrameRef.current) {
        window.cancelAnimationFrame(syncFrameRef.current);
        syncFrameRef.current = null;
      }
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('hashchange', syncActiveFromLocation);
      window.removeEventListener('popstate', syncActiveFromLocation);
    };
  }, [commitActiveId, ids, scheduleForcedActiveIdUpdate, updateActiveId]);

  useEffect(() => {
    keepActiveLinkVisible(desktopTocRef.current);
    keepActiveLinkVisible(mobileTocRef.current);
  }, [activeId]);

  if (items.length === 0) {
    return null;
  }

  const handleSelect = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    event.preventDefault();

    const target = document.getElementById(id);
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const settleDelay = prefersReducedMotion ? 0 : SMOOTH_SCROLL_SETTLE_MS;

    commitActiveId(id);
    lockUntilRef.current = performance.now() + settleDelay;

    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
    }

    window.history.pushState(null, '', `${window.location.pathname}${window.location.search}#${encodeURIComponent(id)}`);

    target?.scrollIntoView({
      block: 'start',
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });

    event.currentTarget.closest<HTMLDetailsElement>('.table-of-contents-mobile')?.removeAttribute('open');

    settleTimerRef.current = window.setTimeout(() => {
      lockUntilRef.current = 0;
      updateActiveId({ force: true, preferredId: id });
    }, settleDelay);
  };

  const renderLinks = () => (
    <ol className="toc-list">
      {items.map(item => {
        const displayDepth = Math.min(6, Math.max(2, item.depth - minDepth + 2));

        return (
          <li key={item.id} className={`toc-depth-${displayDepth}`}>
            <a
              href={`#${encodeURIComponent(item.id)}`}
              className={activeId === item.id ? 'active' : undefined}
              aria-current={activeId === item.id ? 'location' : undefined}
              onClick={(event) => handleSelect(event, item.id)}
            >
              {item.text}
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <>
      <aside ref={desktopTocRef} className="table-of-contents" aria-label={ariaLabel}>
        <p className="toc-title">{title}</p>
        {renderLinks()}
      </aside>

      <details ref={mobileTocRef} className="table-of-contents-mobile" aria-label={ariaLabel}>
        <summary>{title}</summary>
        {renderLinks()}
      </details>
    </>
  );
}
