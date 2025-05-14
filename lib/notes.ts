import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified, Plugin } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkWikiLink from 'remark-wiki-link';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import { h } from 'hastscript';
import type { Root as MdastRoot, Content as MdastContent, Text as MdastText, Image as MdastImage, Paragraph as MdastParagraph, Blockquote as MdastBlockquote, HTML as MdastHTML } from 'mdast';

// 接口定义
export interface Frontmatter {
  title?: string;
  date?: string;
  tags?: string[];
  description?: string;
  [key: string]: any;
}

export interface NoteData {
  slug: string;
  frontmatter: Frontmatter;
  contentHtml: string;
  markdownBody: string;
}

export interface NoteListItem {
  slug: string;
  frontmatter: Frontmatter;
}

// --- 笔记目录 ---
const notesDirectory = path.join(process.cwd(), 'share_notes');


// --- 自定义 Remark 插件 ---

/**
 * remark 插件：处理 Obsidian 嵌入式图片/附件
 * @param options - 插件选项，包含 markdownFileDir
 * @param options.markdownFileDir - Markdown 文件所在的目录，相对于 notesDirectory
 */
const remarkObsidianImage: Plugin<[{ markdownFileDir?: string }], MdastRoot> = (options) => {
  // 获取 Markdown 文件相对于 share_notes 的目录路径。
  // 例如，如果 slug 是 "AMERICA/MyNote", markdownFileDir 会是 "AMERICA".
  // 如果 slug 是 "MyRootNote" (在 share_notes 根目录), markdownFileDir 会是 "".
  const markdownFileDir = options?.markdownFileDir || ''; 

  return (tree: MdastRoot) => {
    visit(tree, 'text', (node: MdastText, index, parent: MdastParagraph | any) => {
      if (!parent || typeof index !== 'number') return;

      const obsidianEmbedRegex = /!\[\[([^|\]\n]+)(?:\|([^\]\n]+))?\]\]/g;
      let match;
      let lastIndex = 0;
      const newNodes: MdastContent[] = [];
      obsidianEmbedRegex.lastIndex = 0;

      while ((match = obsidianEmbedRegex.exec(node.value)) !== null) {
        const [fullMatch, rawFileName, altText] = match;
        let imageName = String(rawFileName).trim(); 
        const alt = String(altText || path.parse(imageName).name).trim();

        if (match.index > lastIndex) {
          newNodes.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
        }
        
        let imagePathInPublicDir: string; // 这是图片在 public/notes_assets/ 下的最终相对路径

        if (imageName.startsWith('/') || imageName.startsWith('\\')) {
          // 情况1: Markdown 中的图片链接以 / 或 \ 开头 (例如 ![[/shared/image.jpg]])
          // 我们将其视为相对于 /notes_assets/ 的“绝对”路径。
          // 例如，![[/foo/bar.jpg]] 会解析为 /notes_assets/foo/bar.jpg
          imagePathInPublicDir = imageName.substring(1);
        } else if (imageName.includes('/') || imageName.includes('\\')) {
          // 情况2: Markdown 中的图片链接包含路径分隔符 (例如 ![[subfolder/image.jpg]] 或 ![[assets/image.jpg]])
          // 这被视为相对于当前 Markdown 文件所在目录 (markdownFileDir) 的路径。
          // 例如，如果 markdownFileDir 是 "AMERICA"，链接是 ![[images/pic.jpg]]
          // imagePathInPublicDir 会是 "AMERICA/images/pic.jpg".
          imagePathInPublicDir = path.join(markdownFileDir, imageName).replace(/\\/g, '/');
        } else {
          // 情况3: Markdown 中的图片链接只是一个文件名 (例如 ![[MyImage.jpg]])
          // 这被视为图片与当前 Markdown 文件在同一个文件夹内。
          // 例如，如果 markdownFileDir 是 "AMERICA"，链接是 ![[MyImage.jpg]]
          // imagePathInPublicDir 会是 "AMERICA/MyImage.jpg".
          imagePathInPublicDir = path.join(markdownFileDir, imageName).replace(/\\/g, '/');
        }
        
        // 最终的 URL 是 /notes_assets/ 加上上面计算出的 imagePathInPublicDir
        // 这个 URL 对应于 public/notes_assets/ 目录下的文件。
        // copy-assets.js 脚本负责将源文件复制到这个 public 目录下的相应位置。
        const imageUrl = `/share_notes/${imagePathInPublicDir}`;

        newNodes.push({
          type: 'image',
          url: imageUrl,
          alt: alt,
          title: null,
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

// Callouts 插件
const remarkObsidianCallouts: Plugin<[], MdastRoot> = () => {
  return (tree: MdastRoot) => {
    visit(tree, 'blockquote', (node: MdastBlockquote, index, parent: any) => {
      if (!parent || typeof index !== 'number') return; 
      if (!node.children.length || node.children[0].type !== 'paragraph') return;
      const firstParagraph = node.children[0] as MdastParagraph;
      if (!firstParagraph.children.length || firstParagraph.children[0].type !== 'text') return;
      const firstTextNode = firstParagraph.children[0] as MdastText;
      const calloutRegex = /^\[!([A-Z]+)\](?:[ \t](.*))?$/; 
      const match = calloutRegex.exec(firstTextNode.value.trim());
      if (match) {
        const [, calloutTypeInput, calloutTitleInput] = match;
        const calloutType = calloutTypeInput.toLowerCase();
        const calloutTitle = calloutTitleInput ? calloutTitleInput.trim() : '';
        if (firstTextNode.value.includes('\n')) {
            firstTextNode.value = firstTextNode.value.substring(firstTextNode.value.indexOf('\n') + 1);
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
        let titleHtml = `<div class="callout-title">`;
        titleHtml += `<span class="callout-type-name">${calloutType.toUpperCase()}</span>`;
        if (calloutTitle) {
          titleHtml += `<span class="callout-title-text">${calloutTitle}</span>`;
        }
        titleHtml += `</div>`;
        let contentHtml = '';
        if (node.children.length > 0) {
            const tempProcessor = unified()
                .use(remarkRehype, { allowDangerousHtml: true })
                .use(rehypeStringify);
            const tempMdastRoot: MdastRoot = { type: 'root', children: node.children };
            const contentHast = tempProcessor.runSync(tempMdastRoot);
            contentHtml = tempProcessor.stringify(contentHast);
        }
        const calloutNode: MdastHTML = { 
          type: 'html',
          value: `<div class="callout callout-${calloutType}">${titleHtml}<div class="callout-content">${contentHtml || ''}</div></div>`
        };
        parent.children.splice(index, 1, calloutNode);
        return index + 1; 
      }
    });
  };
};


// 核心Markdown处理函数
async function markdownToHtml(markdown: string, markdownFileDir?: string): Promise<string> {
  const result = await unified()
    .use(remarkParse) 
    .use(remarkObsidianImage, { markdownFileDir: markdownFileDir || '' }) 
    .use(remarkObsidianCallouts) 
    .use(remarkWikiLink, { 
      pageResolver: (name: string) => [name.toLowerCase().replace(/\s+/g, '-').replace(/[/\\?%*:|"<>#.]/g, '')],
      hrefTemplate: (permalink: string) => `/share/${permalink}`, 
      aliasDivider: '|',
    })
    .use(remarkGfm) 
    .use(remarkMath) 
    .use(remarkRehype, { allowDangerousHtml: true }) 
    .use(rehypeRaw) 
    .use(rehypeKatex) 
    .use(rehypeHighlight, { detect: true, ignoreMissing: true }) 
    .use(rehypeSlug) 
    .use(rehypeAutolinkHeadings, { 
      behavior: 'append', 
      properties: { className: ['anchor-heading-link'], ariaHidden: true, tabIndex: -1 },
      content: h('span', '#') 
    })
    .use(rehypeStringify) 
    .process(markdown);

  return result.toString();
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
  try {
    return getAllNoteSlugsRecursive(notesDirectory, notesDirectory);
  } catch (error) {
    console.error("Error reading notes directory for slugs:", error);
    return [];
  }
}

export async function getNoteData(slug: string): Promise<NoteData | null> {
  const fullPath = path.join(notesDirectory, `${slug}.md`);
  try {
    if (!fs.existsSync(fullPath)) {
      console.warn(`Note file not found: ${fullPath}`);
      return null;
    }
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const matterResult = matter(fileContents);
    const markdownFileDir = path.dirname(slug) === '.' ? '' : path.dirname(slug);
    const contentHtml = await markdownToHtml(matterResult.content, markdownFileDir); 

    return {
      slug,
      frontmatter: matterResult.data as Frontmatter,
      contentHtml,
      markdownBody: matterResult.content,
    };
  } catch (error) {
    console.error(`Error reading or processing note "${slug}.md":`, error);
    return null;
  }
}

export async function getSortedNotesData(): Promise<NoteListItem[]> {
  const allSlugs = getAllNoteSlugs();
  const allNotesDataPromises: Promise<NoteListItem | null>[] = allSlugs.map(async (slugObj) => {
    const slug = slugObj.params.slug;
    const fullPath = path.join(notesDirectory, `${slug}.md`);
    try {
      if (!fs.existsSync(fullPath)) return null;
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const matterResult = matter(fileContents);
      return {
        slug,
        frontmatter: matterResult.data as Frontmatter,
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
      const dateA = new Date(a.frontmatter.date);
      const dateB = new Date(b.frontmatter.date);
      return dateB.getTime() - dateA.getTime();
    }
    if (a.frontmatter.date) return -1;
    if (b.frontmatter.date) return 1;
    return 0;
  });
}
