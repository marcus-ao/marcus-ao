const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

// Minimal YAML frontmatter parser (mirrors lib/frontmatter.ts) — replaces
// gray-matter so the build no longer pulls in its unmaintained js-yaml 3.x.
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
function parseFrontmatter(raw) {
  let input = String(raw);
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);
  const match = FRONTMATTER_PATTERN.exec(input);
  if (!match) return { data: {}, content: input };
  const block = match[1];
  const content = input.slice(match[0].length);
  let data = {};
  if (block.trim()) {
    const loaded = yaml.load(block);
    if (loaded && typeof loaded === 'object') data = loaded;
  }
  return { data, content };
}

const root = process.cwd();
const contentRoot = path.join(root, 'content');
const outputPath = path.join(root, 'public', 'search-index.json');
const sections = ['blog', 'share'];
const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const externalPlaceholderPattern = /^external\s+notion\s+article\.?$/i;

function normalizeDateOnly(value) {
  const match = dateOnlyPattern.exec(value);
  if (!match) return value;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCFullYear(year);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return '';
  }

  return value;
}

function stripMarkdown(markdown) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/`([^`\n]*)`/g, '$1')
    .replace(/!\[\[[^\]\n]+(?:\|[^\]\n]+)?\]\]/g, ' ')
    .replace(/!\[[^\]\n]*]\([^)\n]*\)/g, ' ')
    .replace(/\[\[([^\]|\n]+)\|([^\]\n]+)\]\]/g, '$2')
    .replace(/\[\[([^\]\n]+)\]\]/g, '$1')
    .replace(/^\s{0,3}\[[^\]\n]+]:\s+\S.*$/gm, ' ')
    .replace(/\[([^\]\n]+)]\([^)\n]+\)/g, '$1')
    .replace(/\[([^\]\n]+)]\[[^\]\n]*]/g, '$1')
    .replace(/\[\^([^\]\n]+)]/g, ' ')
    .replace(/^\s*>\s*\[![^\]\n]+]\s*/gm, ' ')
    .replace(/<\/?[^>\n]+>/g, ' ')
    .replace(/^\s{0,3}#{1,6}\s*/gm, ' ')
    .replace(/^\s{0,3}[-*+]\s+\[[ xX]\]\s+/gm, ' ')
    .replace(/^\s{0,3}[-*+]\s+/gm, ' ')
    .replace(/^\s{0,3}\d+[.)]\s+/gm, ' ')
    .replace(/[#>*_`~|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDate(rawDate) {
  if (!rawDate) return '';

  if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
    return rawDate.toISOString().slice(0, 10);
  }

  const date = String(rawDate).trim();
  return normalizeDateOnly(date);
}

function encodeSlugPath(slug) {
  return slug
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}

function createPostHref(section, slug) {
  return `/${section}/${encodeSlugPath(slug)}`;
}

function normalizeTextField(value) {
  if (value == null || typeof value === 'boolean') {
    return '';
  }

  return String(value).trim();
}

function normalizeExternalUrl(value) {
  const normalized = normalizeTextField(value);
  if (!normalized) return '';

  try {
    const url = new URL(normalized);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function getFallbackTitle(markdown, slug) {
  const headingMatch = markdown.match(/^#\s+(.+)$/m);
  if (headingMatch?.[1]) {
    return headingMatch[1].trim();
  }

  return slug
    .split('/')
    .pop()
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function normalizeTags(rawTags) {
  if (Array.isArray(rawTags)) {
    return rawTags.map(tag => String(tag).trim()).filter(Boolean);
  }

  if (typeof rawTags === 'string') {
    return rawTags.split(',').map(tag => tag.trim()).filter(Boolean);
  }

  if (rawTags != null && typeof rawTags !== 'boolean') {
    const tag = String(rawTags).trim();
    return tag ? [tag] : [];
  }

  return [];
}

function getSearchText(markdown, isExternal) {
  const text = stripMarkdown(markdown);

  if (isExternal && externalPlaceholderPattern.test(text)) {
    return '';
  }

  return text.slice(0, 5000);
}

async function collectMarkdownFiles(dir) {
  if (!(await fs.pathExists(dir))) return [];

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectMarkdownFiles(entryPath);
    if (entry.isFile() && entry.name.endsWith('.md')) return [entryPath];
    return [];
  }));

  return nested.flat();
}

async function buildIndex() {
  const records = [];

  for (const section of sections) {
    const sectionDir = path.join(contentRoot, section);
    const files = await collectMarkdownFiles(sectionDir);

    for (const file of files) {
      const relativePath = path.relative(sectionDir, file).replace(/\\/g, '/');
      const slug = relativePath.replace(/\.md$/, '');
      const fileContents = await fs.readFile(file, 'utf8');
      const parsed = parseFrontmatter(fileContents);
      const title = normalizeTextField(parsed.data.title) || getFallbackTitle(parsed.content, slug);
      const external = normalizeExternalUrl(parsed.data.external);
      const isExternal = Boolean(external);

      records.push({
        section,
        slug,
        href: external || createPostHref(section, slug),
        external: isExternal,
        title,
        description: normalizeTextField(parsed.data.description),
        date: normalizeDate(parsed.data.date),
        tags: normalizeTags(parsed.data.tags),
        text: getSearchText(parsed.content, isExternal),
      });
    }
  }

  records.sort((a, b) => {
    if (a.date && b.date) {
      const timestampA = Date.parse(a.date);
      const timestampB = Date.parse(b.date);
      if (Number.isNaN(timestampA) && Number.isNaN(timestampB)) return 0;
      if (Number.isNaN(timestampA)) return 1;
      if (Number.isNaN(timestampB)) return -1;
      return timestampB - timestampA;
    }
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });

  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeJson(outputPath, records, { spaces: 2 });
  console.log(`Wrote ${records.length} search record(s) to ${path.relative(root, outputPath)}.`);
}

buildIndex().catch((error) => {
  console.error('Search index build failed:', error);
  process.exit(1);
});
