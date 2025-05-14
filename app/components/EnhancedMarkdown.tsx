"use client";

import React, { useEffect, useRef } from 'react';

interface EnhancedMarkdownProps {
  htmlContent: string;
}

export default function EnhancedMarkdown({ htmlContent }: EnhancedMarkdownProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!contentRef.current) return;
    
    // 查找所有还未增强的pre元素
    const preElements = contentRef.current.querySelectorAll('pre:not(.enhanced)');
    
    preElements.forEach((pre) => {
      const preElement = pre as HTMLElement;
      preElement.classList.add('enhanced');
      
      const codeElement = preElement.querySelector('code');
      if (!codeElement) return;
      
      const codeHtmlElement = codeElement as HTMLElement;
      const originalCode = codeHtmlElement.textContent || '';
      const lines = originalCode.split('\n');
      
      // 移除末尾可能的空行
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop();
      }
      
      // 获取语言信息
      const language = getLanguageFromCode(codeHtmlElement);
      
      // 创建窗口控件
      const windowControls = document.createElement('div');
      windowControls.className = 'window-controls';
      
      // 添加窗口按钮
      const windowDots = document.createElement('div');
      windowDots.className = 'window-dots';
      
      // 关闭按钮
      const closeButton = document.createElement('div');
      closeButton.className = 'window-dot close';
      
      // 最小化按钮
      const minimizeButton = document.createElement('div');
      minimizeButton.className = 'window-dot minimize';
      
      // 最大化按钮
      const maximizeButton = document.createElement('div');
      maximizeButton.className = 'window-dot maximize';
      
      // 组合窗口按钮
      windowDots.appendChild(closeButton);
      windowDots.appendChild(minimizeButton);
      windowDots.appendChild(maximizeButton);
      
      // 添加语言标题
      const windowTitle = document.createElement('div');
      windowTitle.className = 'window-title';
      windowTitle.textContent = language || 'Code';
      
      // 将窗口按钮和标题添加到控件
      windowControls.appendChild(windowDots);
      windowControls.appendChild(windowTitle);
      
      // 创建代码容器
      const codeContainer = document.createElement('div');
      codeContainer.className = 'code-container';
      
      // 保留原始代码元素，保持语法高亮
      codeContainer.appendChild(codeHtmlElement);
      
      // 添加复制按钮
      const copyButton = document.createElement('button');
      copyButton.className = 'code-block-copy-button';
      copyButton.textContent = 'Copy';
      copyButton.onclick = () => copyCodeToClipboard(originalCode, copyButton);
      
      // 清空原始pre内容并添加新元素
      preElement.innerHTML = '';
      preElement.appendChild(windowControls);
      preElement.appendChild(codeContainer);
      preElement.appendChild(copyButton);
      
      // 折叠/展开功能
      if (lines.length > 20) {
        preElement.classList.add('code-block-collapsed');
        
        const expandButton = document.createElement('button');
        expandButton.className = 'code-block-expand-button';
        expandButton.textContent = '展开代码';
        expandButton.onclick = () => toggleCodeVisibility(preElement, expandButton);
        
        if (preElement.parentNode) {
          preElement.parentNode.insertBefore(expandButton, preElement.nextSibling);
        }
      }
    });
  }, [htmlContent]);
  
  // 获取代码语言
  const getLanguageFromCode = (codeElement: HTMLElement): string => {
    // 从class中提取语言
    let language = '';
    for (const className of codeElement.classList) {
      if (className.startsWith('language-')) {
        language = className.replace('language-', '');
        break;
      }
    }
    
    // 如果没有language-前缀类，尝试从其他类名获取
    if (!language) {
      const langClass = Array.from(codeElement.classList).find(
        cls => cls !== 'hljs' && !cls.startsWith('language-')
      );
      if (langClass) {
        language = langClass;
      }
    }
    
    // 格式化语言名称为更易读的形式
    return formatLanguageName(language);
  };
  
  // 格式化语言名称
  const formatLanguageName = (lang: string): string => {
    if (!lang) return '';
    
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
      plg: 'Prolog'
};
    
    return languageMap[lang.toLowerCase()] || 
           lang.charAt(0).toUpperCase() + lang.slice(1).toLowerCase();
  };
  
  // 复制代码到剪贴板
  const copyCodeToClipboard = async (code: string, button: HTMLButtonElement) => {
    try {
      await navigator.clipboard.writeText(code);
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.style.backgroundColor = '#27c93f'; // 成功绿色
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = ''; // 恢复原始颜色
      }, 2000);
    } catch (err) {
      console.error('Copy failed:', err);
      button.textContent = 'Copy failed';
      button.style.backgroundColor = '#ff5f56'; // 错误红色
      
      setTimeout(() => {
        button.textContent = 'Copy';
        button.style.backgroundColor = ''; // 恢复原始颜色
      }, 2000);
    }
  };
  
  // 切换代码块展开/折叠状态
  const toggleCodeVisibility = (pre: HTMLElement, button: HTMLButtonElement) => {
    const isCollapsed = pre.classList.contains('code-block-collapsed');
    
    if (isCollapsed) {
      pre.classList.remove('code-block-collapsed');
      button.textContent = '折叠代码';
    } else {
      pre.classList.add('code-block-collapsed');
      button.textContent = '展开代码';
    }
  };

  return (
    <div 
      ref={contentRef} 
      className="markdown-body" 
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
