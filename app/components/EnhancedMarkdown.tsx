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
  };
}

const languageMap: Record<string, string> = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  py: 'Python',
  python: 'Python',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'Sass',
  less: 'LESS',
  md: 'Markdown',
  markdown: 'Markdown',
  json: 'JSON',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  zsh: 'Zsh',
  fish: 'Fish',
  sql: 'SQL',
  go: 'Go',
  golang: 'Go',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
  cxx: 'C++',
  cc: 'C++',
  cs: 'C#',
  csharp: 'C#',
  rust: 'Rust',
  rs: 'Rust',
  rb: 'Ruby',
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kt: 'Kotlin',
  kotlin: 'Kotlin',
  dart: 'Dart',
  yaml: 'YAML',
  yml: 'YAML',
  xml: 'XML',
  r: 'R',
  scala: 'Scala',
  sc: 'Scala',
  groovy: 'Groovy',
  lua: 'Lua',
  perl: 'Perl',
  pl: 'Perl',
  hs: 'Haskell',
  haskell: 'Haskell',
  erl: 'Erlang',
  erlang: 'Erlang',
  elixir: 'Elixir',
  ex: 'Elixir',
  clj: 'Clojure',
  clojure: 'Clojure',
  coffee: 'CoffeeScript',
  coffeescript: 'CoffeeScript',
  fsharp: 'F#',
  fs: 'F#',
  vb: 'Visual Basic',
  vba: 'Visual Basic',
  matlab: 'MATLAB',
  m: 'MATLAB',
  pas: 'Pascal',
  pascal: 'Pascal',
  delphi: 'Delphi',
  d: 'D',
  ada: 'Ada',
  fortran: 'Fortran',
  f: 'Fortran',
  cobol: 'COBOL',
  lisp: 'Lisp',
  scm: 'Scheme',
  scheme: 'Scheme',
  rkt: 'Racket',
  racket: 'Racket',
  jl: 'Julia',
  julia: 'Julia',
  tcl: 'Tcl',
  awk: 'Awk',
  v: 'V',
  zig: 'Zig',
  nim: 'Nim',
  crystal: 'Crystal',
  cr: 'Crystal',
  htm: 'HTML',
  vue: 'Vue',
  svelte: 'Svelte',
  toml: 'TOML',
  ini: 'INI',
  ps1: 'PowerShell',
  powershell: 'PowerShell',
  bat: 'Batch',
  cmd: 'Batch',
  h: 'C',
  hh: 'C++',
  hpp: 'C++',
  glsl: 'GLSL',
  hlsl: 'HLSL',
  cuda: 'CUDA',
  pro: 'Prolog',
  plg: 'Prolog',
};

function formatLanguageName(lang: string): string {
  if (!lang) return '';

  return languageMap[lang.toLowerCase()]
    || lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
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
    if (langClass) {
      language = langClass;
    }
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
  button.textContent = state === 'copied' ? labels.copied : state === 'failed' ? labels.copyFailed : labels.copy;
  button.setAttribute(
    'aria-label',
    state === 'copied' ? labels.copiedAria : state === 'failed' ? labels.copyFailedAria : labels.copyAria,
  );
}

async function copyCodeToClipboard(code: string, button: HTMLButtonElement, labels: CodeBlockLabels) {
  clearCopyResetTimer(button);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
    } else if (!fallbackCopyToClipboard(code)) {
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

function setExpandButtonState(button: HTMLButtonElement, isCollapsed: boolean, labels: CodeBlockLabels) {
  button.textContent = isCollapsed ? labels.expand : labels.collapse;
  button.setAttribute('aria-expanded', String(!isCollapsed));
  button.setAttribute('aria-label', isCollapsed ? labels.expandAria : labels.collapseAria);
}

function toggleCodeVisibility(pre: HTMLElement, button: HTMLButtonElement, labels: CodeBlockLabels) {
  const isCollapsed = pre.classList.toggle('code-block-collapsed');
  setExpandButtonState(button, isCollapsed, labels);
}

type CodeBlockEnhancement = {
  cleanup: () => void;
};

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
  windowControls.setAttribute('aria-hidden', 'true');

  const windowDots = document.createElement('div');
  windowDots.className = 'window-dots';

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
  copyButton.textContent = labels.copy;
  copyButton.setAttribute('aria-label', labels.copyAria);
  copyButton.setAttribute('aria-controls', codeContainerId);
  copyButton.setAttribute('aria-live', 'polite');
  copyButton.setAttribute('aria-atomic', 'true');
  copyButton.onclick = () => copyCodeToClipboard(originalCode, copyButton, labels);

  preElement.replaceChildren(windowControls, codeContainer, copyButton);

  if (lines.length > 20) {
    preElement.classList.add('code-block-collapsed');

    const nextExpandButton = document.createElement('button');
    nextExpandButton.type = 'button';
    nextExpandButton.className = 'code-block-expand-button';
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
      const enhancement = enhanceCodeBlock(
        pre as HTMLElement,
        labels,
        `${codeBlockIdPrefix}-code-block-${index}`,
      );
      if (enhancement) {
        enhancements.push(enhancement);
      }
    });

    return () => {
      enhancements.forEach(enhancement => enhancement.cleanup());
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
