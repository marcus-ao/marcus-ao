"use client";

import SocialIcon from './SocialIcon';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { usePageLocale } from './usePageLocale';

type EmailButtonProps = {
  email: string;
  icon: string;
  name: string;
};

export default function EmailButton({ email, icon, name }: EmailButtonProps) {
  const { isChineseLocale } = usePageLocale();
  const [showEmailInfo, setShowEmailInfo] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const dialogId = useId();
  const dialogTitleId = useId();
  const dialogDescId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const copyFeedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const lastPointerCopyRef = useRef(0);
  const labels = isChineseLocale
    ? {
      copied: '已复制',
      copyFailed: '复制失败',
      copyFailedFeedback: '复制失败。请手动选中邮箱地址复制。',
      copiedFeedback: '已复制到剪贴板。',
      close: '关闭',
      copyEmail: '复制邮箱',
      title: '我的邮箱地址',
      subtitle: '随时欢迎来信交流。',
    }
    : {
      copied: 'Copied',
      copyFailed: 'Copy failed',
      copyFailedFeedback: 'Copy failed. Select the address and copy it manually.',
      copiedFeedback: 'Copied to clipboard.',
      close: 'Close',
      copyEmail: 'Copy email',
      title: 'My Email Address',
      subtitle: 'Feel free to reach out anytime.',
    };

  const clearCopyFeedbackTimer = useCallback(() => {
    if (copyFeedbackTimeout.current) {
      clearTimeout(copyFeedbackTimeout.current);
      copyFeedbackTimeout.current = null;
    }
  }, []);

  useEffect(() => {
    if (!showEmailInfo) return;

    const originalOverflow = document.body.style.overflow;
    const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    document.body.style.overflow = 'hidden';
    focusFrameRef.current = window.requestAnimationFrame(() => {
      copyButtonRef.current?.focus();
      focusFrameRef.current = null;
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        clearCopyFeedbackTimer();
        setCopySuccess(false);
        setCopyError(false);
        setShowEmailInfo(false);
      }
      if (event.key === 'Tab') {
        const focusableElements = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (focusFrameRef.current) {
        window.cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }
      activeElement?.focus();
    };
  }, [clearCopyFeedbackTimer, showEmailInfo]);

  useEffect(() => () => {
    clearCopyFeedbackTimer();
    if (focusFrameRef.current) {
      window.cancelAnimationFrame(focusFrameRef.current);
    }
  }, [clearCopyFeedbackTimer]);

  const openEmailInfo = () => {
    clearCopyFeedbackTimer();
    setShowEmailInfo(true);
    setCopySuccess(false);
    setCopyError(false);
  };

  const closeEmailInfo = () => {
    clearCopyFeedbackTimer();
    setCopySuccess(false);
    setCopyError(false);
    setShowEmailInfo(false);
  };

  const resetCopyFeedback = () => {
    clearCopyFeedbackTimer();
    copyFeedbackTimeout.current = setTimeout(() => {
      setCopySuccess(false);
      setCopyError(false);
      copyFeedbackTimeout.current = null;
    }, 2000);
  };

  const markCopySuccess = () => {
    setCopySuccess(true);
    setCopyError(false);
    resetCopyFeedback();
  };

  const markCopyError = () => {
    setCopySuccess(false);
    setCopyError(true);
    resetCopyFeedback();
  };

  const copyWithSelectionFallback = (): boolean => {
    let textArea: HTMLTextAreaElement | null = null;

    try {
      textArea = document.createElement("textarea");
      textArea.value = email;
      textArea.setAttribute('aria-hidden', 'true');
      textArea.tabIndex = -1;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      textArea.style.opacity = "0";
      textArea.style.pointerEvents = "none";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, email.length);

      return document.execCommand("copy");
    } catch (err) {
      console.error('The fallback copy method also failed: ', err);
      return false;
    } finally {
      textArea?.remove();
    }
  };

  const copyToClipboard = () => {
    try {
      if (copyWithSelectionFallback()) {
        markCopySuccess();
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        let settled = false;
        const timeout = window.setTimeout(() => {
          if (!settled) {
            settled = true;
            markCopyError();
          }
        }, 1000);

        void navigator.clipboard.writeText(email)
          .then(() => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            markCopySuccess();
          })
          .catch((err) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            console.error('Unable to copy to the clipboard: ', err);
            markCopyError();
          });
      } else {
        markCopyError();
      }
    } catch (err) {
      console.error('Unable to copy to the clipboard: ', err);
      markCopyError();
    }
  };

  const copyToClipboardFromPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;

    lastPointerCopyRef.current = Date.now();
    copyToClipboard();
  };

  const copyToClipboardFromMouse = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || Date.now() - lastPointerCopyRef.current < 700) {
      return;
    }

    lastPointerCopyRef.current = Date.now();
    copyToClipboard();
  };

  const copyToClipboardFromTouch = (_event: ReactTouchEvent<HTMLButtonElement>) => {
    if (Date.now() - lastPointerCopyRef.current < 700) {
      return;
    }

    lastPointerCopyRef.current = Date.now();
    copyToClipboard();
  };

  const copyToClipboardFromClick = () => {
    if (Date.now() - lastPointerCopyRef.current < 700) {
      return;
    }

    copyToClipboard();
  };

  return (
    <>
      <button
        type="button"
        className="social-link mx-2.5 inline-block cursor-pointer border-0 bg-transparent p-0 no-underline max-[768px]:mx-2 max-[480px]:mx-1.5"
        title={name}
        aria-label={name}
        aria-haspopup="dialog"
        aria-expanded={showEmailInfo}
        aria-controls={showEmailInfo ? dialogId : undefined}
        onClick={openEmailInfo}
      >
        <SocialIcon src={icon} />
      </button>

      {showEmailInfo && (
        <div className="email-info-overlay" role="presentation" onPointerDown={closeEmailInfo}>
          <div
            ref={dialogRef}
            id={dialogId}
            className="email-info-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            aria-describedby={dialogDescId}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="email-info-header">
              <span className="email-info-icon" aria-hidden="true">
                <svg focusable="false" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
              </span>
              <div>
                <p id={dialogTitleId} className="email-info-title">{labels.title}</p>
                <p id={dialogDescId} className="email-info-subtitle">{labels.subtitle}</p>
              </div>
            </div>

            <div className="email-address-field">
              <span className="email-address-text">{email}</span>
            </div>

            <div className="email-actions">
              <button
                type="button"
                ref={copyButtonRef}
                className={`email-copy-button${copySuccess ? ' is-copied' : ''}${copyError ? ' is-failed' : ''}`}
                onClick={copyToClipboardFromClick}
                onMouseDown={copyToClipboardFromMouse}
                onPointerDown={copyToClipboardFromPointer}
                onTouchStart={copyToClipboardFromTouch}
              >
                {copySuccess ? labels.copied : copyError ? labels.copyFailed : labels.copyEmail}
              </button>
              <button type="button" className="email-close-button" onClick={closeEmailInfo}>{labels.close}</button>
            </div>

            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {copySuccess ? labels.copiedFeedback : copyError ? labels.copyFailedFeedback : ''}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
