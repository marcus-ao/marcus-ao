import fs from 'fs';
import path from 'path';
import { parseFrontmatter } from './frontmatter';
import { unified, Plugin } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkWikiLink from 'remark-wiki-link';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeExternalLinks from 'rehype-external-links';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema, type Options as RehypeSanitizeOptions } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { h } from 'hastscript';
import { toPostTimestamp } from './dates';
import { createPostHref, encodeSitePath, encodeSlugPath } from './site';
import type { Root as MdastRoot, Content as MdastContent, Text as MdastText, Image as MdastImage, Paragraph as MdastParagraph, Blockquote as MdastBlockquote, HTML as MdastHTML } from 'mdast';
import type { Element as HastElement, Parents as HastParents, Properties as HastProperties, Root as HastRoot } from 'hast';

// 接口定义
export interface Frontmatter {
  title?: string;
  date?: string;
  tags?: string[];
  description?: string;
  image?: string;
  locale?: string;
  external?: string;
  album?: string;
  artist?: string;
  albumDate?: string;
  [key: string]: unknown;
}

export interface NoteData {
  slug: string;
  frontmatter: Frontmatter;
  contentHtml: string;
  markdownBody: string;
  toc: TocItem[];
  readingTimeMinutes: number;
}

export interface NoteListItem {
  slug: string;
  frontmatter: Frontmatter;
  readingTimeMinutes?: number;
}

export type ContentSection = 'share' | 'blog';

type AbsoluteAssetPathMode = 'content-root' | 'site-root';

interface ResolvedMarkdownPath {
  fullPath: string;
  markdownFileDir: string;
  normalizedSlug: string;
}

export interface TocItem {
  id: string;
  text: string;
  depth: number;
}

export type AdjacentPost = NoteListItem | null;

export interface IndexedPost extends NoteListItem {
  section: ContentSection;
  href: string;
  external: boolean;
}

// --- 内容目录 ---
const contentDirectory = path.join(process.cwd(), 'content');

const markdownSanitizeSchema: RehypeSanitizeOptions = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'abbr',
    'cite',
    'del',
    'details',
    'dfn',
    'div',
    'figcaption',
    'figure',
    'kbd',
    'mark',
    'sub',
    'summary',
    'sup',
    'span',
    'time',
  ],
  attributes: {
    ...defaultSchema.attributes,
    abbr: [
      ...(defaultSchema.attributes?.abbr || []),
      'title',
    ],
    dfn: [
      ...(defaultSchema.attributes?.dfn || []),
      'title',
    ],
    details: [
      ...(defaultSchema.attributes?.details || []),
      'open',
      ['className', 'callout', /^callout-[a-z0-9-]+$/],
    ],
    div: [
      ...(defaultSchema.attributes?.div || []),
      ['className', 'callout', /^callout-[a-z0-9-]+$/, 'callout-title', 'callout-content'],
    ],
    figure: [
      ...(defaultSchema.attributes?.figure || []),
      ['className', 'markdown-figure'],
    ],
    figcaption: [
      ...(defaultSchema.attributes?.figcaption || []),
      ['className', 'markdown-figure-caption'],
    ],
    span: [
      ...(defaultSchema.attributes?.span || []),
      ['className', 'callout-type-name', 'callout-title-text'],
    ],
    summary: [
      ...(defaultSchema.attributes?.summary || []),
      ['className', 'callout-title'],
    ],
    time: [
      ...(defaultSchema.attributes?.time || []),
      'dateTime',
      'datetime',
    ],
  },
};

function getSectionDirectory(section: ContentSection): string {
  return path.join(contentDirectory, section);
}

function isInsideDirectory(rootDirectory: string, candidatePath: string): boolean {
  const relativePath = path.relative(rootDirectory, candidatePath);
  return relativePath === ''
    || (!!relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function getSafeSlugSegments(slug: string): string[] | null {
  const normalizedSlug = slug.replace(/\\/g, '/').trim();

  if (!normalizedSlug || normalizedSlug.startsWith('/') || normalizedSlug.includes('\0')) {
    return null;
  }

  const segments = normalizedSlug.split('/').filter(Boolean);

  if (
    segments.length === 0
    || segments.some(segment => segment === '.' || segment === '..' || path.isAbsolute(segment))
  ) {
    return null;
  }

  return segments;
}

function resolveMarkdownPath(section: ContentSection, slug: string): ResolvedMarkdownPath | null {
  const sectionDirectory = path.resolve(getSectionDirectory(section));
  const segments = getSafeSlugSegments(slug);

  if (!segments) {
    return null;
  }

  const normalizedSlug = segments.join('/');
  const fullPath = path.resolve(sectionDirectory, `${normalizedSlug}.md`);

  if (!isInsideDirectory(sectionDirectory, fullPath)) {
    return null;
  }

  const markdownFileDir = path.posix.dirname(normalizedSlug);

  return {
    fullPath,
    markdownFileDir: markdownFileDir === '.' ? '' : markdownFileDir,
    normalizedSlug,
  };
}

function isPassthroughUrl(url: string): boolean {
  return /^(?:https?:)?\/\//i.test(url)
    || /^(?:data|mailto|tel):/i.test(url)
    || url.startsWith('#');
}

function toSafeAssetPath(markdownFileDir: string, rawPath: string): string {
  const normalizedDir = markdownFileDir.replace(/\\/g, '/');
  const relativePath = rawPath.startsWith('/')
    ? rawPath.slice(1)
    : path.posix.join(normalizedDir, rawPath);
  const normalizedAssetPath = path.posix.normalize(relativePath);

  return normalizedAssetPath
    .split('/')
    .filter(segment => segment && segment !== '.' && segment !== '..')
    .join('/');
}

function toContentAssetUrl(
  section: ContentSection,
  markdownFileDir: string,
  rawPath: string,
  absolutePathMode: AbsoluteAssetPathMode = 'content-root',
): string {
  const normalizedPath = rawPath.replace(/\\/g, '/').trim();

  if (
    isPassthroughUrl(normalizedPath)
  ) {
    return normalizedPath;
  }

  if (
    normalizedPath.startsWith('/content/')
    || (absolutePathMode === 'site-root' && normalizedPath.startsWith('/'))
  ) {
    return encodeSitePath(normalizedPath);
  }

  const assetPath = toSafeAssetPath(markdownFileDir, normalizedPath);
  if (!assetPath) {
    return normalizedPath;
  }

  return `/content/${section}/${encodeSlugPath(assetPath)}`;
}

function getFallbackTitle(markdown: string, slug: string): string {
  const headingMatch = markdown.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }

  return path.basename(slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function normalizeTextField(value: unknown): string | undefined {
  if (value == null || typeof value === 'boolean') {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized || undefined;
}

function normalizeExternalUrl(value: unknown): string | undefined {
  const normalized = normalizeTextField(value);
  if (!normalized) return undefined;

  try {
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function normalizeFrontmatter(data: Record<string, unknown>, markdown: string, slug: string): Frontmatter {
  const frontmatter = { ...data } as Frontmatter;
  const rawDate = data.date;
  const rawTags = data.tags;
  const rawTitle = data.title;
  const rawDescription = data.description;
  const rawImage = data.image;
  const rawLocale = data.locale;
  const rawExternal = data.external;
  const rawAlbum = data.album;
  const rawArtist = data.artist;
  const rawAlbumDate = data.albumDate;

  frontmatter.title = normalizeTextField(rawTitle);
  frontmatter.description = normalizeTextField(rawDescription);
  frontmatter.image = normalizeTextField(rawImage);
  frontmatter.locale = normalizeTextField(rawLocale);
  frontmatter.external = normalizeExternalUrl(rawExternal);
  frontmatter.album = normalizeTextField(rawAlbum);
  frontmatter.artist = normalizeTextField(rawArtist);
  frontmatter.albumDate = normalizeTextField(rawAlbumDate);

  if (rawDate instanceof Date) {
    frontmatter.date = rawDate.toISOString().slice(0, 10);
  } else if (rawDate != null) {
    frontmatter.date = normalizeTextField(rawDate);
  }

  if (Array.isArray(rawTags)) {
    frontmatter.tags = rawTags
      .map(tag => String(tag).trim())
      .filter(Boolean);
  } else if (typeof rawTags === 'string') {
    frontmatter.tags = rawTags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
  } else if (rawTags != null && typeof rawTags !== 'boolean') {
    frontmatter.tags = [String(rawTags).trim()].filter(Boolean);
  }

  frontmatter.title = frontmatter.title || getFallbackTitle(markdown, slug);

  return frontmatter;
}

function estimateReadingTime(markdown: string): number {
  const withoutCode = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ');
  const chineseChars = (withoutCode.match(/[\u4e00-\u9fff]/g) || []).length;
  const latinWords = (withoutCode
    .replace(/[\u4e00-\u9fff]/g, ' ')
    .match(/\b[\w'-]+\b/g) || []).length;

  return Math.max(1, Math.ceil(chineseChars / 300 + latinWords / 200));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// CommonMark 的强调（emphasis）flanking 规则在「**」紧邻引号、尤其与中日韩字符相邻时
// 无法正确配对，导致 **“短语”** 这类写法加粗失效、直接显示出原始星号。这里把
// 「星号在引号外侧」统一改写为「引号在星号内侧」（**“X”** → “**X**”，单星号、下划线同理），
// 语义不变但能在所有平台稳定渲染。仅匹配“引号紧贴星号”的窄模式，不影响其它写法与代码。
function normalizeEmphasisQuotes(markdown: string): string {
  return markdown.replace(
    /(\*\*|\*|__|_)(["“])([^"“”*_\n]+?)(["”])\1/g,
    (_match, marker: string, openQuote: string, inner: string, closeQuote: string) =>
      `${openQuote}${marker}${inner}${marker}${closeQuote}`,
  );
}

function normalizeMarkdownImageDestinations(markdown: string): string {
  return markdown.replace(
    /!\[([^\]\n]*)\]\(([^)\n<>]*\s[^)\n<>]*)\)/g,
    (fullMatch, alt: string, destination: string) => {
      if (/["']/.test(destination)) {
        return fullMatch;
      }

      return `![${alt}](<${destination.trim()}>)`;
    },
  );
}

function isStandaloneImageLine(line: string): boolean {
  const trimmed = line.trim();

  return /^!\[\[[^\]\n]+(?:\|[^\]\n]+)?\]\]$/.test(trimmed)
    || /^!\[[^\]\n]*\]\((?:<[^>\n]+>|[^)\n]+)\)$/.test(trimmed);
}

function separateStandaloneImageLines(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const output: string[] = [];
  let inCodeFence = false;

  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inCodeFence = !inCodeFence;
      output.push(line);
      return;
    }

    if (!inCodeFence && isStandaloneImageLine(line)) {
      const previousOutputLine = output[output.length - 1];
      if (previousOutputLine && previousOutputLine.trim() !== '') {
        output.push('');
      }

      output.push(line);

      const nextLine = lines[index + 1];
      if (nextLine && nextLine.trim() !== '') {
        output.push('');
      }

      return;
    }

    output.push(line);
  });

  return output.join('\n');
}


// --- 自定义 Remark 插件 ---

/**
 * remark 插件：处理 Obsidian 嵌入式图片/附件
 * @param options - 插件选项，包含 markdownFileDir 和 section
 * @param options.markdownFileDir - Markdown 文件所在的目录，相对于 notesDirectory
 */
const remarkObsidianImage: Plugin<[{ markdownFileDir?: string; section?: ContentSection }], MdastRoot> = (options) => {
  // 获取 Markdown 文件相对于 content/<section> 的目录路径。
  // 例如，如果 slug 是 "AMERICA/MyNote", markdownFileDir 会是 "AMERICA".
  // 如果 slug 是 "MyRootNote" (在 section 根目录), markdownFileDir 会是 "".
  const markdownFileDir = options?.markdownFileDir || ''; 
  const section = options?.section || 'share';

  return (tree: MdastRoot) => {
    visit(tree, 'text', (node: MdastText, index, parent: unknown) => {
      if (!isMdastParent(parent) || typeof index !== 'number') return;

      const obsidianEmbedRegex = /!\[\[([^|\]\n]+)(?:\|([^\]\n]+))?\]\]/g;
      let match;
      let lastIndex = 0;
      const newNodes: MdastContent[] = [];
      obsidianEmbedRegex.lastIndex = 0;

      while ((match = obsidianEmbedRegex.exec(node.value)) !== null) {
        const [, rawFileName, altText] = match;
        const imageName = String(rawFileName).trim(); 
        const explicitCaption = altText ? String(altText).trim() : '';
        const alt = explicitCaption || path.parse(imageName).name;

        if (match.index > lastIndex) {
          newNodes.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
        }
        
        newNodes.push({
          type: 'image',
          url: toContentAssetUrl(section, markdownFileDir, imageName),
          alt: alt,
          title: explicitCaption || null,
        } as MdastImage);
        lastIndex = obsidianEmbedRegex.lastIndex;
      }

      if (newNodes.length > 0) {
        if (lastIndex < node.value.length) {
          newNodes.push({ type: 'text', value: node.value.slice(lastIndex) });
        }
        parent.children.splice(index, 1, ...newNodes);
        return index + newNodes.length; 
      }
    });
  };
};

const remarkRelativeImages: Plugin<[{ markdownFileDir?: string; section?: ContentSection }], MdastRoot> = (options) => {
  const markdownFileDir = options?.markdownFileDir || '';
  const section = options?.section || 'share';

  return (tree: MdastRoot) => {
    visit(tree, 'image', (node: MdastImage) => {
      node.url = toContentAssetUrl(section, markdownFileDir, node.url, 'site-root');
    });
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function isMdastParent(node: unknown): node is { children: MdastContent[] } {
  return isRecord(node) && Array.isArray(node.children);
}

// Callouts 插件
const remarkObsidianCallouts: Plugin<[], MdastRoot> = () => {
  return (tree: MdastRoot) => {
    visit(tree, 'blockquote', (node: MdastBlockquote, index, parent: unknown) => {
      if (!isMdastParent(parent) || typeof index !== 'number') return;
      if (!node.children.length || node.children[0].type !== 'paragraph') return;
      const firstParagraph = node.children[0] as MdastParagraph;
      if (!firstParagraph.children.length || firstParagraph.children[0].type !== 'text') return;
      const firstTextNode = firstParagraph.children[0] as MdastText;
      const [calloutMarkerLine, ...remainingLines] = firstTextNode.value.split(/\r?\n/);
      const calloutRegex = /^\[!([A-Za-z][A-Za-z0-9_-]*)\]([+-]?)(?:[ \t]+(.+))?$/;
      const match = calloutRegex.exec(calloutMarkerLine.trim());
      if (match) {
        const [, calloutTypeInput, collapseMarker, calloutTitleInput] = match;
        const calloutType = calloutTypeInput.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
        const calloutTypeLabel = calloutTypeInput
          .replace(/[-_]+/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, char => char.toUpperCase());
        const calloutTitle = calloutTitleInput ? calloutTitleInput.trim() : '';
        const isCollapsible = collapseMarker === '+' || collapseMarker === '-';
        const detailsOpenAttribute = collapseMarker === '+' ? ' open' : '';
        const remainingFirstText = remainingLines.join('\n');
        if (remainingFirstText) {
            firstTextNode.value = remainingFirstText;
        } else {
            if (firstParagraph.children.length === 1) {
                node.children.shift(); 
            } else {
                 firstParagraph.children.shift();
            }
        }
        if (firstParagraph.children.length === 0 && node.children[0] === firstParagraph) {
            node.children.shift();
        }
        const showTypeLabel = calloutType !== 'note' || isCollapsible;
        let titleContentHtml = showTypeLabel
          ? `<span class="callout-type-name">${escapeHtml(calloutTypeLabel)}</span>`
          : '';
        if (calloutTitle) {
          titleContentHtml += `<span class="callout-title-text">${escapeHtml(calloutTitle)}</span>`;
        }
        const titleHtml = titleContentHtml ? `<div class="callout-title">${titleContentHtml}</div>` : '';
        const openCalloutNode: MdastHTML = {
          type: 'html',
          value: isCollapsible
            ? `<details class="callout callout-${calloutType}"${detailsOpenAttribute}><summary class="callout-title">${titleContentHtml || `<span class="callout-type-name">${escapeHtml(calloutTypeLabel)}</span>`}</summary><div class="callout-content">`
            : `<div class="callout callout-${calloutType}">${titleHtml}<div class="callout-content">`,
        };
        const closeCalloutNode: MdastHTML = {
          type: 'html',
          value: isCollapsible ? '</div></details>' : '</div></div>',
        };
        const replacementNodes: MdastContent[] = [
          openCalloutNode,
          ...node.children,
          closeCalloutNode,
        ];

        parent.children.splice(index, 1, ...replacementNodes);
        return index + replacementNodes.length;
      }
    });
  };
};

function isHastElement(node: unknown): node is HastElement {
  return isRecord(node)
    && node.type === 'element'
    && typeof node.tagName === 'string'
    && isRecord(node.properties)
    && Array.isArray(node.children);
}

function hasHastChildren(node: unknown): node is HastParents {
  return isRecord(node) && Array.isArray(node.children);
}

function toClassList(className: HastProperties[string]): string[] {
  if (Array.isArray(className)) {
    return className.map(String);
  }

  return typeof className === 'string'
    ? className.split(/\s+/).filter(Boolean)
    : [];
}

function nodeToText(node: unknown): string {
  if (!isRecord(node)) return '';
  if (typeof node.value === 'string') return node.value;
  if (Array.isArray(node.children)) {
    return node.children.map(nodeToText).join('');
  }
  return '';
}

function normalizeNodeText(node: unknown): string {
  return nodeToText(node).replace(/\s+/g, ' ').trim();
}

const rehypeCollectToc: Plugin<[{ toc: TocItem[] }], HastRoot> = (options) => {
  const toc = options?.toc;

  return (tree: HastRoot) => {
    if (!toc) return;

    visit(tree, 'element', (node) => {
      if (!isHastElement(node)) return;

      const tagName = node.tagName;
      if (!/^h[2-6]$/.test(tagName)) return;

      const id = node.properties.id;
      if (!id) return;

      const classes = toClassList(node.properties.className);
      if (classes.includes('sr-only') || String(id).includes('footnote-label')) {
        return;
      }

      toc.push({
        id: String(id),
        text: normalizeNodeText(node),
        depth: Number(tagName.slice(1)),
      });
    });
  };
};

const rehypeEnhanceImages: Plugin<[], HastRoot> = () => {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node) => {
      if (!isHastElement(node) || node.tagName !== 'img') return;

      node.properties = {
        ...node.properties,
        loading: node.properties.loading || 'lazy',
        decoding: node.properties.decoding || 'async',
      };
    });
  };
};

const rehypeFigureImages: Plugin<[], HastRoot> = () => {
  return (tree: HastRoot) => {
    visit(tree, 'element', (node, index, parent) => {
      if (!isHastElement(node)) return;

      if (
        !hasHastChildren(parent) ||
        typeof index !== 'number' ||
        node.tagName !== 'p' ||
        node.children.length !== 1
      ) {
        return;
      }

      const image = node.children[0];
      if (!isHastElement(image) || image.tagName !== 'img') return;

      const properties = image.properties || {};
      const rawTitle = typeof properties.title === 'string' ? properties.title : '';
      const captionText = rawTitle.trim();

      const figureChildren: HastElement['children'] = [image];
      if (captionText) {
        delete image.properties.title;
        figureChildren.push({
          type: 'element',
          tagName: 'figcaption',
          properties: { className: ['markdown-figure-caption'] },
          children: [{ type: 'text', value: captionText }],
        });
      }

      parent.children[index] = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['markdown-figure'] },
        children: figureChildren,
      };
    });
  };
};

const rehypeWrapTables: Plugin<[{ label?: string }], HastRoot> = (options) => {
  const ariaLabel = options?.label || 'Scrollable table';

  return (tree: HastRoot) => {
    visit(tree, 'element', (node, index, parent) => {
      if (!isHastElement(node)) return;

      if (
        !hasHastChildren(parent) ||
        typeof index !== 'number' ||
        node.tagName !== 'table'
      ) {
        return;
      }

      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: {
          ariaLabel,
          className: ['markdown-table-scroll'],
          role: 'region',
          tabIndex: 0,
        },
        children: [node],
      };
    });
  };
};


// 核心Markdown处理函数
async function markdownToHtml(markdown: string, markdownFileDir?: string, section: ContentSection = 'share'): Promise<{ contentHtml: string; toc: TocItem[] }> {
  const toc: TocItem[] = [];
  const normalizedMarkdown = separateStandaloneImageLines(
    normalizeMarkdownImageDestinations(normalizeEmphasisQuotes(markdown)),
  );
  const result = await unified()
    .use(remarkParse) 
    .use(remarkRelativeImages, { markdownFileDir: markdownFileDir || '', section })
    .use(remarkObsidianImage, { markdownFileDir: markdownFileDir || '', section })
    .use(remarkObsidianCallouts) 
    .use(remarkWikiLink, { 
      pageResolver: (name: string) => [name.toLowerCase().replace(/\s+/g, '-').replace(/[/\\?%*:|"<>#.]/g, '')],
      hrefTemplate: (permalink: string) => createPostHref(section, permalink),
      aliasDivider: '|',
    })
    .use(remarkGfm) 
    .use(remarkMath) 
    .use(remarkRehype, { allowDangerousHtml: true }) 
    .use(rehypeRaw) 
    .use(rehypeSanitize, markdownSanitizeSchema)
    .use(rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] })
    .use(rehypeKatex) 
    .use(rehypeHighlight, { detect: true, ignoreMissing: true }) 
    .use(rehypeSlug) 
    .use(rehypeCollectToc, { toc })
    .use(rehypeAutolinkHeadings, { 
      behavior: 'append', 
      properties: {
        className: ['anchor-heading-link'],
        ariaLabel: section === 'share' ? '本节链接' : 'Link to this section',
      },
      content: h('span', '#') 
    })
    .use(rehypeEnhanceImages)
    .use(rehypeFigureImages)
    .use(rehypeWrapTables, { label: section === 'share' ? '可横向滚动的表格' : 'Scrollable table' })
    .use(rehypeStringify) 
    .process(normalizedMarkdown);

  return {
    contentHtml: result.toString(),
    toc,
  };
}


// 数据获取函数
function getAllNoteSlugsRecursive(dir: string, baseDir: string): { params: { slug: string } }[] {
  let results: { params: { slug: string } }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllNoteSlugsRecursive(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relativePath = path.relative(baseDir, fullPath);
      const slug = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');
      results.push({ params: { slug } });
    }
  }
  return results;
}

export function getAllNoteSlugs(): { params: { slug: string } }[] {
  return getAllPostSlugs('share');
}

export function getAllPostSlugs(section: ContentSection): { params: { slug: string } }[] {
  const sectionDirectory = getSectionDirectory(section);
  try {
    return getAllNoteSlugsRecursive(sectionDirectory, sectionDirectory);
  } catch (error) {
    console.error(`Error reading ${section} content directory for slugs:`, error);
    return [];
  }
}

export async function getNoteData(slug: string): Promise<NoteData | null> {
  return getPostData('share', slug);
}

export async function getPostData(section: ContentSection, slug: string): Promise<NoteData | null> {
  const resolvedPath = resolveMarkdownPath(section, slug);

  if (!resolvedPath) {
    console.warn(`Rejected unsafe ${section} note slug: ${slug}`);
    return null;
  }

  const { fullPath, markdownFileDir, normalizedSlug } = resolvedPath;

  try {
    if (!fs.existsSync(fullPath)) {
      console.warn(`Note file not found: ${fullPath}`);
      return null;
    }
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const matterResult = parseFrontmatter(fileContents);
    const frontmatter = normalizeFrontmatter(matterResult.data, matterResult.content, normalizedSlug);
    const { contentHtml, toc } = await markdownToHtml(matterResult.content, markdownFileDir, section);

    return {
      slug: normalizedSlug,
      frontmatter,
      contentHtml,
      markdownBody: matterResult.content,
      toc,
      readingTimeMinutes: estimateReadingTime(matterResult.content),
    };
  } catch (error) {
    console.error(`Error reading or processing ${section} note "${slug}.md":`, error);
    return null;
  }
}

export async function getSortedNotesData(): Promise<NoteListItem[]> {
  return getSortedPostsData('share');
}

export async function getSortedPostsData(section: ContentSection): Promise<NoteListItem[]> {
  const sectionDirectory = getSectionDirectory(section);
  const allSlugs = getAllPostSlugs(section);
  const allNotesDataPromises: Promise<NoteListItem | null>[] = allSlugs.map(async (slugObj) => {
    const slug = slugObj.params.slug;
    const fullPath = path.join(sectionDirectory, `${slug}.md`);
    try {
      if (!fs.existsSync(fullPath)) return null;
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const matterResult = parseFrontmatter(fileContents);
      const frontmatter = normalizeFrontmatter(matterResult.data, matterResult.content, slug);
      return {
        slug,
        frontmatter,
        readingTimeMinutes: estimateReadingTime(matterResult.content),
      };
    } catch (mapError) {
      console.error(`Error processing frontmatter for ${slug}.md:`, mapError);
      return null;
    }
  });

  const allNotesDataSettled = await Promise.all(allNotesDataPromises);
  const validNotesData = allNotesDataSettled.filter(note => note !== null) as NoteListItem[];

  return validNotesData.sort((a, b) => {
    if (a.frontmatter.date && b.frontmatter.date) {
      return toPostTimestamp(b.frontmatter.date) - toPostTimestamp(a.frontmatter.date);
    }
    if (a.frontmatter.date) return -1;
    if (b.frontmatter.date) return 1;
    return 0;
  });
}

export async function getAdjacentPosts(section: ContentSection, slug: string): Promise<{ previous: AdjacentPost; next: AdjacentPost }> {
  const posts = (await getSortedPostsData(section))
    .filter(post => !post.frontmatter.external);
  const index = posts.findIndex(post => post.slug === slug);

  if (index === -1) {
    return { previous: null, next: null };
  }

  return {
    previous: posts[index - 1] || null,
    next: posts[index + 1] || null,
  };
}

export async function getAllIndexedPosts(): Promise<IndexedPost[]> {
  const sections: ContentSection[] = ['blog', 'share'];
  const groupedPosts = await Promise.all(sections.map(async (section) => {
    const posts = await getSortedPostsData(section);

    return posts.map((post): IndexedPost => {
      const externalHref = post.frontmatter.external;
      const external = Boolean(externalHref);
      return {
        ...post,
        section,
        href: externalHref || createPostHref(section, post.slug),
        external,
      };
    });
  }));

  return groupedPosts
    .flat()
    .sort((a, b) => {
      if (a.frontmatter.date && b.frontmatter.date) {
        return toPostTimestamp(b.frontmatter.date) - toPostTimestamp(a.frontmatter.date);
      }
      if (a.frontmatter.date) return -1;
      if (b.frontmatter.date) return 1;
      return 0;
    });
}

export async function getAllTags(): Promise<{ tag: string; count: number }[]> {
  const posts = await getAllIndexedPosts();
  const tagCounts = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.frontmatter.tags || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}
