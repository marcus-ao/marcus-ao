import yaml from 'js-yaml';

export type ParsedFrontmatter = {
  data: Record<string, unknown>;
  content: string;
};

// Opening `---`, the YAML block, then a closing `---` on its own line.
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * Minimal YAML frontmatter parser (replaces gray-matter, which pinned an
 * unmaintained js-yaml 3.x). Behaviour is verified to match gray-matter's
 * `{ data, content }` output across the repo's content files.
 */
export function parseFrontmatter(raw: string): ParsedFrontmatter {
  let input = raw;
  if (input.charCodeAt(0) === 0xfeff) {
    input = input.slice(1); // strip a leading UTF-8 BOM
  }

  const match = FRONTMATTER_PATTERN.exec(input);
  if (!match) {
    return { data: {}, content: input };
  }

  const block = match[1];
  const content = input.slice(match[0].length);

  let data: Record<string, unknown> = {};
  if (block.trim()) {
    const loaded = yaml.load(block);
    if (loaded && typeof loaded === 'object') {
      data = loaded as Record<string, unknown>;
    }
  }

  return { data, content };
}
