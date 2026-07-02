"use client";

import { useEffect, useId, useRef } from 'react';

interface EnhancedMarkdownProps {
  htmlContent: string;
  locale?: string;
}

type CodeBlockLabels = {
  code: string;
  collapse: string;
  collapseAria: string;
  copy: string;
  copied: string;
  copiedAria: string;
  copyAria: string;
  copyFailed: string;
  copyFailedAria: string;
  expand: string;
  expandAria: string;
  imgZoomIn: string;
  imgZoomOut: string;
  imgReset: string;
  imgRotate: string;
  imgOpen: string;
  imgCopy: string;
  imgCopied: string;
  imgCopyFailed: string;
  imgDownload: string;
  imgClose: string;
  imgDialog: string;
};

const ICONS = {
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  zoomIn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/></svg>',
  zoomOut: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  rotate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M5 21h14"/></svg>',
};

const copyResetTimers = new WeakMap<HTMLButtonElement, number>();

function clearCopyResetTimer(button: HTMLButtonElement) {
  const pendingReset = copyResetTimers.get(button);
  if (!pendingReset) return;

  window.clearTimeout(pendingReset);
  copyResetTimers.delete(button);
}

function getCodeBlockLabels(locale = 'en'): CodeBlockLabels {
  if (locale.toLowerCase().startsWith('zh')) {
    return {
      code: '代码',
      collapse: '收起代码',
      collapseAria: '收起代码块',
      copy: '复制',
      copied: '已复制',
      copiedAria: '代码已复制',
      copyAria: '复制代码',
      copyFailed: '复制失败',
      copyFailedAria: '代码复制失败',
      expand: '展开代码',
      expandAria: '展开代码块',
      imgZoomIn: '放大',
      imgZoomOut: '缩小',
      imgReset: '还原',
      imgRotate: '旋转',
      imgOpen: '打开图片查看器',
      imgCopy: '复制图片',
      imgCopied: '已复制图片',
      imgCopyFailed: '复制失败',
      imgDownload: '下载图片',
      imgClose: '关闭',
      imgDialog: '图片查看器',
    };
  }

  return {
    code: 'Code',
    collapse: 'Collapse code',
    collapseAria: 'Collapse code block',
    copy: 'Copy',
    copied: 'Copied',
    copiedAria: 'Code copied',
    copyAria: 'Copy code',
    copyFailed: 'Failed',
    copyFailedAria: 'Copy failed',
    expand: 'Expand code',
    expandAria: 'Expand code block',
    imgZoomIn: 'Zoom in',
    imgZoomOut: 'Zoom out',
    imgReset: 'Reset',
    imgRotate: 'Rotate',
    imgOpen: 'Open image viewer',
    imgCopy: 'Copy image',
    imgCopied: 'Image copied',
    imgCopyFailed: 'Copy failed',
    imgDownload: 'Download image',
    imgClose: 'Close',
    imgDialog: 'Image viewer',
  };
}

const languageMap: Record<string, string> = {
  js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript',
  py: 'Python', python: 'Python', html: 'HTML', css: 'CSS', scss: 'SCSS', sass: 'Sass',
  less: 'LESS', md: 'Markdown', markdown: 'Markdown', json: 'JSON', bash: 'Bash', sh: 'Shell',
  shell: 'Shell', zsh: 'Zsh', fish: 'Fish', sql: 'SQL', go: 'Go', golang: 'Go', java: 'Java',
  c: 'C', cpp: 'C++', cxx: 'C++', cc: 'C++', cs: 'C#', csharp: 'C#', rust: 'Rust', rs: 'Rust',
  rb: 'Ruby', ruby: 'Ruby', php: 'PHP', swift: 'Swift', kt: 'Kotlin', kotlin: 'Kotlin',
  dart: 'Dart', yaml: 'YAML', yml: 'YAML', xml: 'XML', r: 'R', scala: 'Scala', sc: 'Scala',
  groovy: 'Groovy', lua: 'Lua', perl: 'Perl', pl: 'Perl', hs: 'Haskell', haskell: 'Haskell',
  erl: 'Erlang', erlang: 'Erlang', elixir: 'Elixir', ex: 'Elixir', clj: 'Clojure',
  clojure: 'Clojure', coffee: 'CoffeeScript', coffeescript: 'CoffeeScript', fsharp: 'F#', fs: 'F#',
  vb: 'Visual Basic', vba: 'Visual Basic', matlab: 'MATLAB', m: 'MATLAB', pas: 'Pascal',
  pascal: 'Pascal', delphi: 'Delphi', d: 'D', ada: 'Ada', fortran: 'Fortran', f: 'Fortran',
  cobol: 'COBOL', lisp: 'Lisp', scm: 'Scheme', scheme: 'Scheme', rkt: 'Racket', racket: 'Racket',
  jl: 'Julia', julia: 'Julia', tcl: 'Tcl', awk: 'Awk', v: 'V', zig: 'Zig', nim: 'Nim',
  crystal: 'Crystal', cr: 'Crystal', htm: 'HTML', vue: 'Vue', svelte: 'Svelte', toml: 'TOML',
  ini: 'INI', ps1: 'PowerShell', powershell: 'PowerShell', bat: 'Batch', cmd: 'Batch', h: 'C',
  hh: 'C++', hpp: 'C++', glsl: 'GLSL', hlsl: 'HLSL', cuda: 'CUDA', pro: 'Prolog', plg: 'Prolog',
};

function formatLanguageName(lang: string): string {
  if (!lang) return '';
  return languageMap[lang.toLowerCase()] || lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
}

function getLanguageFromCode(codeElement: HTMLElement): string {
  let language = '';
  for (const className of codeElement.classList) {
    if (className.startsWith('language-')) {
      language = className.replace('language-', '');
      break;
    }
  }
  if (!language) {
    const langClass = Array.from(codeElement.classList).find(
      className => className !== 'hljs' && !className.startsWith('language-'),
    );
    if (langClass) language = langClass;
  }
  return formatLanguageName(language);
}

function fallbackCopyToClipboard(code: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = code;
  textArea.setAttribute('aria-hidden', 'true');
  textArea.setAttribute('readonly', '');
  textArea.tabIndex = -1;
  textArea.style.position = 'fixed';
  textArea.style.inset = '0 auto auto 0';
  textArea.style.opacity = '0';
  textArea.style.pointerEvents = 'none';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textArea);
  }
}

function setCopyButtonState(button: HTMLButtonElement, state: 'idle' | 'copied' | 'failed', labels: CodeBlockLabels) {
  button.classList.toggle('is-copied', state === 'copied');
  button.classList.toggle('is-failed', state === 'failed');
  const label = state === 'copied' ? labels.copied : state === 'failed' ? labels.copyFailed : labels.copy;
  const icon = state === 'copied' ? ICONS.check : state === 'failed' ? ICONS.cross : ICONS.copy;
  const labelEl = button.querySelector('.cb-label');
  const iconEl = button.querySelector('.cb-icon');
  if (labelEl) labelEl.textContent = label;
  if (iconEl) iconEl.innerHTML = icon;
  button.setAttribute(
    'aria-label',
    state === 'copied' ? labels.copiedAria : state === 'failed' ? labels.copyFailedAria : labels.copyAria,
  );
}

async function copyCodeToClipboard(code: string, button: HTMLButtonElement, labels: CodeBlockLabels) {
  clearCopyResetTimer(button);
  try {
    let copied = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(code);
        copied = true;
      } catch (error) {
        console.warn('Falling back to legacy code copy:', error);
      }
    }

    if (!copied && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([code], { type: 'text/plain' }),
          }),
        ]);
        copied = true;
      } catch (error) {
        console.warn('Falling back to legacy code copy after ClipboardItem:', error);
      }
    }

    if (!copied) {
      copied = fallbackCopyToClipboard(code);
    }

    if (!copied) {
      throw new Error('Fallback copy command was not accepted.');
    }

    setCopyButtonState(button, 'copied', labels);
  } catch (error) {
    console.error('Copy failed:', error);
    setCopyButtonState(button, 'failed', labels);
  }
  const resetTimer = window.setTimeout(() => {
    setCopyButtonState(button, 'idle', labels);
    copyResetTimers.delete(button);
  }, 2000);
  copyResetTimers.set(button, resetTimer);
}

async function copyImageToClipboard(src: string): Promise<void> {
  const absoluteSrc = new URL(src, window.location.href).href;

  if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      const response = await fetch(src, { credentials: 'same-origin' });
      if (!response.ok) {
        throw new Error(`Image fetch failed: ${response.status}`);
      }

      const blob = await response.blob();
      const contentType = blob.type || response.headers.get('content-type') || 'image/png';
      const typedBlob = blob.type ? blob : new Blob([blob], { type: contentType });
      await navigator.clipboard.write([
        new ClipboardItem({
          [contentType]: typedBlob,
        }),
      ]);
      return;
    } catch (error) {
      console.warn('Falling back to copying the image URL:', error);
    }
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(absoluteSrc);
    return;
  }

  throw new Error('Clipboard API is not available.');
}

function setExpandButtonState(button: HTMLButtonElement, isCollapsed: boolean, labels: CodeBlockLabels) {
  const labelEl = button.querySelector('.cb-label');
  if (labelEl) labelEl.textContent = isCollapsed ? labels.expand : labels.collapse;
  button.setAttribute('aria-expanded', String(!isCollapsed));
  button.setAttribute('aria-label', isCollapsed ? labels.expandAria : labels.collapseAria);
}

function toggleCodeVisibility(pre: HTMLElement, button: HTMLButtonElement, labels: CodeBlockLabels) {
  const isCollapsed = pre.classList.toggle('code-block-collapsed');
  setExpandButtonState(button, isCollapsed, labels);
}

type CodeBlockEnhancement = { cleanup: () => void };

function enhanceCodeBlock(preElement: HTMLElement, labels: CodeBlockLabels, codeContainerId: string): CodeBlockEnhancement | null {
  const codeElement = preElement.querySelector('code');
  if (!codeElement) return null;

  const originalChildren = Array.from(preElement.childNodes);
  preElement.classList.add('enhanced');

  const codeHtmlElement = codeElement as HTMLElement;
  const originalCode = codeHtmlElement.textContent || '';
  const lines = originalCode.replace(/\n$/, '').split('\n');
  const language = getLanguageFromCode(codeHtmlElement);
  let expandButton: HTMLButtonElement | null = null;
  let cleanedUp = false;

  const windowControls = document.createElement('div');
  windowControls.className = 'window-controls';

  const windowDots = document.createElement('div');
  windowDots.className = 'window-dots';
  windowDots.setAttribute('aria-hidden', 'true');
  for (const className of ['close', 'minimize', 'maximize']) {
    const dot = document.createElement('div');
    dot.className = `window-dot ${className}`;
    windowDots.appendChild(dot);
  }

  const languageTitle = document.createElement('div');
  languageTitle.className = 'code-block-language';
  languageTitle.textContent = language || labels.code;

  windowControls.appendChild(windowDots);
  windowControls.appendChild(languageTitle);

  const codeContainer = document.createElement('div');
  codeContainer.className = 'code-container';
  codeContainer.id = codeContainerId;
  codeContainer.tabIndex = 0;
  codeContainer.setAttribute('aria-label', language ? `${language} ${labels.code}` : labels.code);
  codeContainer.appendChild(codeHtmlElement);

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'code-block-copy-button';
  copyButton.innerHTML = `<span class="cb-icon" aria-hidden="true">${ICONS.copy}</span><span class="cb-label">${labels.copy}</span>`;
  copyButton.setAttribute('aria-label', labels.copyAria);
  copyButton.setAttribute('aria-controls', codeContainerId);
  copyButton.setAttribute('aria-live', 'polite');
  copyButton.setAttribute('aria-atomic', 'true');
  copyButton.onclick = () => copyCodeToClipboard(originalCode, copyButton, labels);

  const codeBlockActions = document.createElement('div');
  codeBlockActions.className = 'code-block-actions';
  codeBlockActions.appendChild(copyButton);
  windowControls.appendChild(codeBlockActions);

  preElement.replaceChildren(windowControls, codeContainer);

  if (lines.length > 20) {
    preElement.classList.add('code-block-collapsed');
    const nextExpandButton = document.createElement('button');
    nextExpandButton.type = 'button';
    nextExpandButton.className = 'code-block-expand-button';
    nextExpandButton.innerHTML = `<span class="cb-icon" aria-hidden="true">${ICONS.chevron}</span><span class="cb-label"></span>`;
    nextExpandButton.setAttribute('aria-controls', codeContainerId);
    setExpandButtonState(nextExpandButton, true, labels);
    nextExpandButton.onclick = () => toggleCodeVisibility(preElement, nextExpandButton, labels);
    expandButton = nextExpandButton;
    preElement.insertAdjacentElement('afterend', nextExpandButton);
  }

  return {
    cleanup: () => {
      if (cleanedUp) return;
      cleanedUp = true;
      clearCopyResetTimer(copyButton);
      expandButton?.remove();
      preElement.classList.remove('enhanced', 'code-block-collapsed');
      preElement.replaceChildren(...originalChildren);
    },
  };
}

function setupImageLightbox(content: HTMLElement, labels: CodeBlockLabels): () => void {
  const images = Array.from(content.querySelectorAll('img')).filter(
    img => !img.closest('a') && !img.closest('.katex'),
  ) as HTMLImageElement[];
  if (!images.length) return () => {};

  const triggerCleanups: Array<() => void> = [];
  let closeActive: (() => void) | null = null;

  const open = (img: HTMLImageElement) => {
    const src = img.currentSrc || img.src;
    if (!src) return;
    closeActive?.();

    const previouslyFocused = document.activeElement as HTMLElement | null;
    let scale = 1;
    let rot = 0;
    let tx = 0;
    let ty = 0;
    let down = false;
    let moved = false;
    let downOnImage = false;
    let sx = 0;
    let sy = 0;
    let otx = 0;
    let oty = 0;

    const overlay = document.createElement('div');
    overlay.className = 'image-lightbox';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', labels.imgDialog);

    const stage = document.createElement('div');
    stage.className = 'image-lightbox-stage';

    const bigImg = document.createElement('img');
    bigImg.className = 'image-lightbox-img';
    bigImg.src = src;
    bigImg.alt = img.alt || '';
    bigImg.draggable = false;

    const toolbar = document.createElement('div');
    toolbar.className = 'image-lightbox-toolbar';
    const status = document.createElement('div');
    status.className = 'image-lightbox-status';
    status.setAttribute('aria-live', 'polite');
    let copyResetTimer = 0;

    const makeButton = (icon: string, label: string, onClick: (event: MouseEvent) => void) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'image-lightbox-btn';
      button.innerHTML = icon;
      button.setAttribute('aria-label', label);
      button.title = label;
      button.onclick = (event) => { event.stopPropagation(); onClick(event); };
      return button;
    };

    const apply = () => {
      bigImg.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${scale})`;
      stage.classList.toggle('is-zoomed', scale > 1);
    };
    const setScale = (next: number) => {
      scale = Math.min(5, Math.max(1, Math.round(next * 100) / 100));
      if (scale === 1) { tx = 0; ty = 0; }
      apply();
    };
    const rotate = () => { rot = (rot + 90) % 360; apply(); };

    const zoomOutBtn = makeButton(ICONS.zoomOut, labels.imgZoomOut, () => setScale(scale - 0.5));
    const zoomInBtn = makeButton(ICONS.zoomIn, labels.imgZoomIn, () => setScale(scale + 0.5));
    const rotateBtn = makeButton(ICONS.rotate, labels.imgRotate, () => rotate());
    const copyBtn = makeButton(ICONS.copy, labels.imgCopy, async () => {
      window.clearTimeout(copyResetTimer);
      try {
        await copyImageToClipboard(src);
        copyBtn.innerHTML = ICONS.check;
        copyBtn.classList.add('is-success');
        copyBtn.classList.remove('is-failed');
        copyBtn.setAttribute('aria-label', labels.imgCopied);
        copyBtn.title = labels.imgCopied;
        status.textContent = labels.imgCopied;
      } catch (error) {
        console.error('Image copy failed:', error);
        copyBtn.innerHTML = ICONS.cross;
        copyBtn.classList.add('is-failed');
        copyBtn.classList.remove('is-success');
        copyBtn.setAttribute('aria-label', labels.imgCopyFailed);
        copyBtn.title = labels.imgCopyFailed;
        status.textContent = labels.imgCopyFailed;
      }

      copyResetTimer = window.setTimeout(() => {
        copyBtn.innerHTML = ICONS.copy;
        copyBtn.classList.remove('is-success', 'is-failed');
        copyBtn.setAttribute('aria-label', labels.imgCopy);
        copyBtn.title = labels.imgCopy;
        status.textContent = '';
      }, 1800);
    });
    const downloadBtn = makeButton(ICONS.download, labels.imgDownload, () => {
      const anchor = document.createElement('a');
      anchor.href = src;
      anchor.download = (src.split('/').pop() || 'image').split('?')[0];
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    });
    const closeBtn = makeButton(ICONS.cross, labels.imgClose, () => close());
    toolbar.append(zoomOutBtn, zoomInBtn, rotateBtn, copyBtn, downloadBtn, closeBtn);

    stage.appendChild(bigImg);
    overlay.append(stage, toolbar, status);
    document.body.appendChild(overlay);

    const rootStyle = document.documentElement.style;
    const prevOverflow = rootStyle.overflow;
    rootStyle.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      else if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        setScale(scale + 0.5);
      } else if (event.key === '-') {
        event.preventDefault();
        setScale(scale - 0.5);
      } else if (event.key === '0') {
        event.preventDefault();
        setScale(1);
      } else if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        rotate();
      }
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setScale(scale + (event.deltaY < 0 ? 0.3 : -0.3));
    };
    const onPointerDown = (event: PointerEvent) => {
      down = true;
      moved = false;
      downOnImage = event.target === bigImg;
      sx = event.clientX;
      sy = event.clientY;
      otx = tx;
      oty = ty;
      try { stage.setPointerCapture(event.pointerId); } catch { /* noop */ }
      if (scale > 1) stage.classList.add('is-grabbing');
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!down) return;
      const dx = event.clientX - sx;
      const dy = event.clientY - sy;
      if (!moved && Math.hypot(dx, dy) > 6) moved = true;
      if (scale > 1) {
        tx = otx + dx;
        ty = oty + dy;
        apply();
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!down) return;
      down = false;
      stage.classList.remove('is-grabbing');
      try { stage.releasePointerCapture(event.pointerId); } catch { /* noop */ }
      if (moved) return;
      if (downOnImage) setScale(scale > 1 ? 1 : 2.2);
      else close();
    };
    const onPointerCancel = () => {
      down = false;
      moved = false;
      stage.classList.remove('is-grabbing');
    };

    document.addEventListener('keydown', onKey);
    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerCancel);

    requestAnimationFrame(() => { overlay.classList.add('is-open'); closeBtn.focus(); });

    function close() {
      if (!closeActive) return;
      closeActive = null;
      document.removeEventListener('keydown', onKey);
      stage.removeEventListener('pointercancel', onPointerCancel);
      rootStyle.overflow = prevOverflow;
      window.clearTimeout(copyResetTimer);
      overlay.classList.remove('is-open');
      window.setTimeout(() => overlay.remove(), 200);
      previouslyFocused?.focus?.();
    }
    closeActive = close;
  };

  images.forEach((img) => {
    const previousRole = img.getAttribute('role');
    const previousTabIndex = img.getAttribute('tabindex');
    const previousAriaLabel = img.getAttribute('aria-label');
    img.classList.add('zoomable-image');
    img.setAttribute('role', 'button');
    img.setAttribute('tabindex', '0');
    img.setAttribute('aria-label', labels.imgOpen);
    const onClick = () => open(img);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(img); }
    };
    img.addEventListener('click', onClick);
    img.addEventListener('keydown', onKey);
    triggerCleanups.push(() => {
      img.removeEventListener('click', onClick);
      img.removeEventListener('keydown', onKey);
      img.classList.remove('zoomable-image');
      if (previousRole === null) img.removeAttribute('role');
      else img.setAttribute('role', previousRole);
      if (previousTabIndex === null) img.removeAttribute('tabindex');
      else img.setAttribute('tabindex', previousTabIndex);
      if (previousAriaLabel === null) img.removeAttribute('aria-label');
      else img.setAttribute('aria-label', previousAriaLabel);
    });
  });

  return () => {
    closeActive?.();
    triggerCleanups.forEach(fn => fn());
  };
}

export default function EnhancedMarkdown({ htmlContent, locale = 'en' }: EnhancedMarkdownProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const codeBlockIdPrefix = useId().replace(/:/g, '');

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const labels = getCodeBlockLabels(locale);
    const preElements = content.querySelectorAll('pre:not(.enhanced)');
    const enhancements: CodeBlockEnhancement[] = [];

    preElements.forEach((pre, index) => {
      const enhancement = enhanceCodeBlock(pre as HTMLElement, labels, `${codeBlockIdPrefix}-code-block-${index}`);
      if (enhancement) enhancements.push(enhancement);
    });

    const cleanupLightbox = setupImageLightbox(content, labels);

    return () => {
      enhancements.forEach(enhancement => enhancement.cleanup());
      cleanupLightbox();
    };
  }, [codeBlockIdPrefix, htmlContent, locale]);

  return (
    <div
      ref={contentRef}
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
