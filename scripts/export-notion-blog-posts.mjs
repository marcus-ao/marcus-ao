import fs from "node:fs/promises";
import dns from "node:dns/promises";
import net from "node:net";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const NOTION_API = "https://www.notion.so/api/v3";
const ASSET_DOWNLOAD_TIMEOUT_MS = 30_000;
const MAX_ASSET_BYTES = 15 * 1024 * 1024;
const MAX_ASSET_REDIRECTS = 5;
const IMAGE_MAX_DIMENSION = 2000;
const IMAGE_WEBP_QUALITY = 86;
const SAFE_IMAGE_EXTENSIONS = new Set([".gif", ".jpg", ".jpeg", ".png", ".webp"]);
const SAFE_IMAGE_MIME_TYPES = new Set(["image/gif", "image/jpeg", "image/jpg", "image/png", "image/webp"]);
const OPTIMIZABLE_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const OPTIMIZABLE_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const DISALLOWED_ASSET_EXTENSIONS = new Set([
  ".cjs",
  ".htm",
  ".html",
  ".js",
  ".jsx",
  ".mjs",
  ".svg",
  ".ts",
  ".tsx",
]);
const DISALLOWED_ASSET_MIME_TYPES = new Set([
  "application/ecmascript",
  "application/javascript",
  "application/xhtml+xml",
  "image/svg+xml",
  "text/ecmascript",
  "text/html",
  "text/javascript",
]);

const POSTS = [
  {
    key: "pyspider",
    slug: "docker-pyspider-web-crawlers",
    pageId: "13b3fbee-72ff-4c48-9868-049774bfc3e4",
    markdownPath: "content/blog/docker-pyspider-web-crawlers.md",
    locale: "zh-CN",
  },
  {
    key: "computational-graphs",
    slug: "computational-graphs-backpropagation",
    pageId: "3c8f6070-7d01-4797-9920-eac5c2b7a940",
    markdownPath: "content/blog/computational-graphs-backpropagation.md",
    locale: "zh-CN",
  },
  {
    key: "scrapy",
    slug: "scrapy-primary-information-crawling",
    pageId: "1075a746-145f-8008-a11f-d091bcbe496b",
    markdownPath: "content/blog/scrapy-primary-information-crawling.md",
    locale: "zh-CN",
  },
  {
    key: "optimization",
    slug: "optimization-learning-methods-in-deep-learning",
    pageId: "1265a746-145f-8044-8c36-d3df7227eae7",
    markdownPath: "content/blog/optimization-learning-methods-in-deep-learning.md",
    locale: "zh-CN",
  },
];

const slugCounts = new Map();

function absolute(...segments) {
  return path.join(ROOT, ...segments);
}

function isPrivateIPv4(address) {
  const octets = address.split(".").map((part) => Number.parseInt(part, 10));

  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  const [first, second] = octets;

  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19))
    || first >= 224;
}

function isPrivateIPv6(address) {
  const normalizedAddress = address.toLowerCase();

  if (
    normalizedAddress === "::"
    || normalizedAddress === "::1"
    || normalizedAddress.startsWith("fe80:")
    || normalizedAddress.startsWith("fc")
    || normalizedAddress.startsWith("fd")
  ) {
    return true;
  }

  const mappedIPv4 = normalizedAddress.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mappedIPv4 ? isPrivateIPv4(mappedIPv4[1]) : false;
}

function isPrivateAddress(address) {
  const ipVersion = net.isIP(address);

  if (ipVersion === 4) {
    return isPrivateIPv4(address);
  }

  if (ipVersion === 6) {
    return isPrivateIPv6(address);
  }

  return true;
}

async function assertSafeAssetUrl(rawUrl, context = "asset URL") {
  let parsedUrl;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(`Rejected invalid ${context}: ${rawUrl}`);
  }

  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error(`Rejected unsupported ${context} scheme: ${parsedUrl.protocol}`);
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error(`Rejected ${context} with embedded credentials: ${parsedUrl.host}`);
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (
    hostname === "localhost"
    || hostname.endsWith(".localhost")
    || hostname.endsWith(".local")
  ) {
    throw new Error(`Rejected local ${context} host: ${hostname}`);
  }

  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname)) {
      throw new Error(`Rejected private ${context} address: ${hostname}`);
    }
    return parsedUrl.toString();
  }

  const records = await dns.lookup(hostname, { all: true, verbatim: true });

  if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
    throw new Error(`Rejected ${context} resolving to private address: ${hostname}`);
  }

  return parsedUrl.toString();
}

async function fetchAssetResponse(rawUrl, redirectsRemaining = MAX_ASSET_REDIRECTS) {
  const safeUrl = await assertSafeAssetUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ASSET_DOWNLOAD_TIMEOUT_MS);

  try {
    const res = await fetch(safeUrl, {
      redirect: "manual",
      signal: controller.signal,
    });

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      if (redirectsRemaining <= 0) {
        throw new Error(`Too many redirects while downloading ${rawUrl}`);
      }

      const location = res.headers.get("location");

      if (!location) {
        throw new Error(`Redirect without location while downloading ${rawUrl}`);
      }

      return fetchAssetResponse(new URL(location, safeUrl).toString(), redirectsRemaining - 1);
    }

    await assertSafeAssetUrl(res.url || safeUrl, "final asset URL");
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function readResponseBufferWithLimit(res) {
  const contentLength = Number.parseInt(res.headers.get("content-length") ?? "", 10);

  if (Number.isFinite(contentLength) && contentLength > MAX_ASSET_BYTES) {
    throw new Error(`Asset is too large: ${contentLength} bytes`);
  }

  if (!res.body) {
    const fallbackBuffer = Buffer.from(await res.arrayBuffer());

    if (fallbackBuffer.length > MAX_ASSET_BYTES) {
      throw new Error(`Asset is too large: ${fallbackBuffer.length} bytes`);
    }

    return fallbackBuffer;
  }

  const reader = res.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    const chunk = Buffer.from(value);
    totalBytes += chunk.length;

    if (totalBytes > MAX_ASSET_BYTES) {
      await reader.cancel();
      throw new Error(`Asset is too large: ${totalBytes} bytes`);
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks, totalBytes);
}

function notionHeaders() {
  return {
    "content-type": "application/json",
    "notion-client-version": "23.13.0.4808",
    "x-notion-active-user-header": "",
  };
}

async function notionPost(endpoint, body) {
  const res = await fetch(`${NOTION_API}/${endpoint}`, {
    method: "POST",
    headers: notionHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Notion ${endpoint} failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

function blockValue(entry) {
  let value = entry;
  while (value?.value) {
    value = value.value;
  }
  return value;
}

function mergeBlocks(target, source = {}) {
  for (const [id, entry] of Object.entries(source)) {
    const value = blockValue(entry);
    if (value?.id) {
      target.set(id, value);
    }
  }
}

async function loadBlocks(pageId) {
  const blocks = new Map();
  let cursor = { stack: [] };
  let chunkNumber = 0;

  do {
    const page = await notionPost("loadPageChunk", {
      pageId,
      limit: 1000,
      cursor,
      chunkNumber,
      verticalColumns: false,
    });

    mergeBlocks(blocks, page.recordMap?.block);
    cursor = page.cursor ?? { stack: [] };
    chunkNumber += 1;
  } while ((cursor.stack ?? []).length > 0);

  let missing = collectMissingChildren(blocks);
  while (missing.length > 0) {
    const values = await getBlockValues(missing);
    for (const value of values) {
      blocks.set(value.id, value);
    }

    const newMissing = collectMissingChildren(blocks);
    if (newMissing.length === missing.length && newMissing.every((id, index) => id === missing[index])) {
      break;
    }
    missing = newMissing;
  }

  return blocks;
}

async function getBlockValues(ids) {
  if (ids.length === 0) return [];

  try {
    const response = await notionPost("getRecordValues", {
      requests: ids.map((id) => ({ table: "block", id })),
    });

    const values = [];
    const mapBlocks = response.recordMapWithRoles?.block ?? {};
    for (const entry of Object.values(mapBlocks)) {
      const value = blockValue(entry);
      if (value?.id) values.push(value);
    }
    for (const result of response.results ?? []) {
      const value = blockValue(result);
      if (value?.id && !values.some((candidate) => candidate.id === value.id)) {
        values.push(value);
      }
    }
    return values;
  } catch (error) {
    if (ids.length === 1) {
      console.warn(`Skipping unreadable block ${ids[0]}: ${error.message}`);
      return [];
    }

    const middle = Math.ceil(ids.length / 2);
    const left = await getBlockValues(ids.slice(0, middle));
    const right = await getBlockValues(ids.slice(middle));
    return [...left, ...right];
  }
}

function collectMissingChildren(blocks) {
  const missing = new Set();
  for (const block of blocks.values()) {
    for (const childId of block.content ?? []) {
      if (!blocks.has(childId)) {
        missing.add(childId);
      }
    }
  }
  return [...missing];
}

function readRichTextProperty(block, name = "title") {
  return block.properties?.[name] ?? [];
}

function plainText(segments = []) {
  return segments
    .map((segment) => {
      const text = segment?.[0] ?? "";
      const annotations = segment?.[1] ?? [];
      const equation = annotations.find((annotation) => annotation?.[0] === "e");
      return equation ? equation[1] : text;
    })
    .join("");
}

function escapeInline(text) {
  return text.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function inlineCode(text) {
  const longest = Math.max(0, ...[...text.matchAll(/`+/g)].map((match) => match[0].length));
  const fence = "`".repeat(longest + 1);
  const padded = text.startsWith(" ") || text.endsWith(" ") ? ` ${text} ` : text;
  return `${fence}${padded}${fence}`;
}

function wrapDelimited(text, delimiter) {
  const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match || !match[2]) return text;

  const [, leading, body, trailing] = match;
  return `${leading}${delimiter}${body}${delimiter}${trailing}`;
}

function wrapHtmlTag(text, tagName) {
  const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match || !match[2]) return text;

  const [, leading, body, trailing] = match;
  return `${leading}<${tagName}>${escapeHtml(body)}</${tagName}>${trailing}`;
}

function hasRiskyStrongBoundary(text) {
  const body = text.trim();
  if (!body) return false;

  return /^[“”"‘’'「『《（(\[{]/.test(body)
    || /[“”"‘’'」』》）)\]}，。、：；？！；：,.!?]$/.test(body);
}

function wrapStrong(rawText, escapedText) {
  if (hasRiskyStrongBoundary(rawText)) {
    return wrapHtmlTag(rawText, "strong");
  }

  return wrapDelimited(escapedText, "**");
}

function renderRichText(segments = []) {
  const output = [];
  let pendingEquation = "";

  const flushEquation = () => {
    if (!pendingEquation) return;
    output.push(`$${pendingEquation}$`);
    pendingEquation = "";
  };

  for (const segment of segments) {
    const rawText = segment?.[0] ?? "";
    const annotations = segment?.[1] ?? [];
    const equation = annotations.find((annotation) => annotation?.[0] === "e");
    const link = annotations.find((annotation) => annotation?.[0] === "a");
    const flags = new Set(annotations.map((annotation) => annotation?.[0]));

    if (equation) {
      if (/^\^\d+$/.test(equation[1])) {
        flushEquation();
        output.push(`<sup>${equation[1].slice(1)}</sup>`);
        continue;
      }

      pendingEquation += equation[1];
      continue;
    }

    flushEquation();

    let text = escapeInline(rawText);
    if (!text) continue;

    if (flags.has("c")) {
      text = inlineCode(rawText);
    }
    if (flags.has("b")) {
      text = wrapStrong(rawText, text);
    }
    if (flags.has("i")) {
      text = wrapDelimited(text, "*");
    }
    if (flags.has("s")) {
      text = wrapDelimited(text, "~~");
    }
    if (link?.[1]) {
      text = `[${text}](${link[1]})`;
    }

    output.push(text);
  }

  flushEquation();
  return output.join("");
}

function cleanDisplayFormula(formula) {
  const cleaned = formula.trim().replace(/^\\\\\s*/, "");
  if (!cleaned.includes("\\\\")) {
    return cleaned;
  }

  const alignedBody = cleaned
    .replace(/\s*\\\\\s*/g, " \\\\\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  return `\\begin{aligned}\n${alignedBody}\n\\end{aligned}`;
}

function captionFor(block) {
  return plainText(readRichTextProperty(block, "caption")).trim();
}

function normalizeLanguage(language) {
  const value = language.trim().toLowerCase();
  const map = new Map([
    ["plain text", "text"],
    ["shell", "bash"],
    ["javascript", "js"],
    ["typescript", "ts"],
    ["python", "python"],
    ["html", "html"],
    ["css", "css"],
    ["json", "json"],
    ["xml", "xml"],
  ]);
  return map.get(value) ?? value.replace(/\s+/g, "-");
}

function fencedCode(code, language) {
  const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map((match) => match[0].length));
  const fence = "`".repeat(longest + 1);
  const suffix = language ? normalizeLanguage(language) : "";
  return `${fence}${suffix}\n${code.replace(/\n+$/g, "")}\n${fence}`;
}

function blockquote(markdown) {
  return markdown
    .split("\n")
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n");
}

function indent(markdown, spaces = 2) {
  const prefix = " ".repeat(spaces);
  return markdown
    .split("\n")
    .map((line) => (line ? `${prefix}${line}` : line))
    .join("\n");
}

function sanitizeFilename(name) {
  const fallback = "attachment";
  return (name || fallback)
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || fallback;
}

function extensionFromUrl(url, contentType) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if (ext && ext.length <= 8) return ext;
  } catch {
    // Fall through to content type.
  }

  const map = new Map([
    ["image/jpeg", ".jpg"],
    ["image/jpg", ".jpg"],
    ["image/png", ".png"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"],
    ["application/json", ".json"],
    ["text/csv", ".csv"],
    ["application/xml", ".xml"],
    ["text/xml", ".xml"],
  ]);

  return map.get((contentType ?? "").split(";")[0].trim().toLowerCase()) ?? ".bin";
}

function mimeType(contentType) {
  return (contentType ?? "").split(";")[0].trim().toLowerCase();
}

function assertAllowedAssetType(ext, contentType, kind) {
  const normalizedExt = ext.toLowerCase();
  const normalizedMimeType = mimeType(contentType);

  if (
    DISALLOWED_ASSET_EXTENSIONS.has(normalizedExt)
    || DISALLOWED_ASSET_MIME_TYPES.has(normalizedMimeType)
  ) {
    throw new Error(`Rejected active asset type: ${normalizedMimeType || normalizedExt}`);
  }

  if (
    kind === "image"
    && !SAFE_IMAGE_EXTENSIONS.has(normalizedExt)
    && !SAFE_IMAGE_MIME_TYPES.has(normalizedMimeType)
  ) {
    throw new Error(`Rejected unsupported image asset type: ${normalizedMimeType || normalizedExt}`);
  }
}

function replaceExtension(fileName, ext) {
  const parsed = path.parse(fileName);
  return `${parsed.name}${ext}`;
}

async function optimizeImageAsset(buffer, contentType, ext) {
  const normalizedMimeType = mimeType(contentType);
  const normalizedExt = ext.toLowerCase();
  const isOptimizable = OPTIMIZABLE_IMAGE_MIME_TYPES.has(normalizedMimeType)
    || OPTIMIZABLE_IMAGE_EXTENSIONS.has(normalizedExt);

  if (!isOptimizable) {
    return null;
  }

  try {
    const metadata = await sharp(buffer).metadata();
    if ((metadata.pages ?? 1) > 1) {
      return null;
    }

    const optimizedBuffer = await sharp(buffer)
      .rotate()
      .resize({
        width: IMAGE_MAX_DIMENSION,
        height: IMAGE_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: IMAGE_WEBP_QUALITY,
        effort: 5,
      })
      .toBuffer();

    if (optimizedBuffer.length >= buffer.length) {
      return null;
    }

    return {
      buffer: optimizedBuffer,
      ext: ".webp",
      contentType: "image/webp",
    };
  } catch (error) {
    console.warn(`Skipping image optimization: ${error.message}`);
    return null;
  }
}

async function signedUrl(block, source) {
  if (!source) return "";
  const response = await notionPost("getSignedFileUrls", {
    urls: [
      {
        url: source,
        permissionRecord: {
          table: "block",
          id: block.id,
          spaceId: block.space_id,
        },
      },
    ],
  });
  return response.signedUrls?.[0] ?? source;
}

function shouldSignNotionAsset(source) {
  try {
    const hostname = new URL(source).hostname.toLowerCase();
    return hostname === "secure.notion-static.com" || hostname.includes("prod-files-secure");
  } catch {
    return false;
  }
}

function displaySource(block) {
  return (
    block.format?.display_source
    ?? plainText(readRichTextProperty(block, "source"))
    ?? plainText(readRichTextProperty(block, "title"))
  );
}

async function downloadAsset({ block, source, slug, kind, requestedName }) {
  const url = shouldSignNotionAsset(source)
    ? await signedUrl(block, source)
    : source;

  const res = await fetchAssetResponse(url);
  if (!res.ok) {
    throw new Error(`Failed to download ${source}: ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get("content-type");
  const buffer = await readResponseBufferWithLimit(res);
  const originalExt = extensionFromUrl(res.url || source, contentType);
  assertAllowedAssetType(originalExt, contentType, kind);

  const optimizedAsset = kind === "image"
    ? await optimizeImageAsset(buffer, contentType, originalExt)
    : null;
  const fileBuffer = optimizedAsset?.buffer ?? buffer;
  const ext = optimizedAsset?.ext ?? originalExt;

  const sourceDir = absolute("content", "blog", slug);
  const publicDir = absolute("public", "content", "blog", slug);
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(publicDir, { recursive: true });

  const baseName = requestedName
    ? sanitizeFilename(requestedName)
    : `${kind}-${String((slugCounts.get(slug) ?? 0) + 1).padStart(2, "0")}${ext}`;

  slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);

  const nameWithExt = path.extname(baseName) ? replaceExtension(baseName, ext) : `${baseName}${ext}`;
  const fileName = await uniqueFileName(sourceDir, nameWithExt);
  const sourcePath = path.join(sourceDir, fileName);
  const publicPath = path.join(publicDir, fileName);
  await fs.writeFile(sourcePath, fileBuffer);
  await fs.writeFile(publicPath, fileBuffer);

  return `${slug}/${fileName}`;
}

async function uniqueFileName(dir, fileName) {
  const parsed = path.parse(fileName);
  let candidate = fileName;
  let index = 2;
  while (true) {
    try {
      await fs.access(path.join(dir, candidate));
      candidate = `${parsed.name}-${index}${parsed.ext}`;
      index += 1;
    } catch {
      return candidate;
    }
  }
}

function markdownImage(alt, relativePath, title) {
  const safeAlt = alt.replace(/\]/g, "\\]");
  const safePath = relativePath.includes(" ") ? `<${relativePath}>` : relativePath;
  const safeTitle = title ? ` "${title.replace(/"/g, "&quot;")}"` : "";
  return `![${safeAlt}](${safePath}${safeTitle})`;
}

class Renderer {
  constructor(post, blocks) {
    this.post = post;
    this.blocks = blocks;
    this.orderedListIndex = 1;
  }

  async renderPage() {
    const page = this.blocks.get(this.post.pageId);
    if (!page) {
      throw new Error(`Page block missing for ${this.post.pageId}`);
    }
    return this.renderChildren(page.content ?? []);
  }

  async renderChildren(ids = []) {
    const rendered = [];

    for (const id of ids) {
      const block = this.blocks.get(id);
      if (!block) continue;

      const markdown = await this.renderBlock(block);

      if (markdown.trim()) {
        rendered.push(markdown.trim());
      }
    }
    return rendered.join("\n\n");
  }

  async renderBlock(block) {
    const text = renderRichText(readRichTextProperty(block)).trim();
    const children = await this.renderChildren(block.content ?? []);

    switch (block.type) {
      case "page":
        return children;

      case "text":
        return [text, children].filter(Boolean).join("\n\n");

      case "header":
        this.orderedListIndex = 1;
        return [`## ${text}`, children].filter(Boolean).join("\n\n");

      case "sub_header":
        this.orderedListIndex = 1;
        return [`### ${text}`, children].filter(Boolean).join("\n\n");

      case "sub_sub_header":
        this.orderedListIndex = 1;
        return [`#### ${text}`, children].filter(Boolean).join("\n\n");

      case "divider":
        this.orderedListIndex = 1;
        return "---";

      case "quote":
        return blockquote([text, children].filter(Boolean).join("\n\n"));

      case "callout": {
        const calloutText = ["> [!NOTE]", blockquote([text, children].filter(Boolean).join("\n\n"))]
          .filter(Boolean)
          .join("\n");
        return calloutText;
      }

      case "code": {
        const language = plainText(readRichTextProperty(block, "language"));
        return fencedCode(plainText(readRichTextProperty(block)), language);
      }

      case "equation": {
        const formula = cleanDisplayFormula(plainText(readRichTextProperty(block)));
        return formula ? `$$\n${formula}\n$$` : "";
      }

      case "image":
        return this.renderImage(block);

      case "file":
        return this.renderFile(block);

      case "bulleted_list":
        return this.renderListItem(block, "-", text, children);

      case "numbered_list": {
        const marker = `${this.orderedListIndex}.`;
        this.orderedListIndex += 1;
        return this.renderListItem(block, marker, text, children);
      }

      case "column_list":
      case "column":
        return children;

      default:
        return [text, children].filter(Boolean).join("\n\n");
    }
  }

  renderListItem(_block, marker, text, children) {
    const firstLine = `${marker} ${text}`;
    if (!children) return firstLine;
    return `${firstLine}\n${indent(children)}`;
  }

  async renderImage(block) {
    const source = displaySource(block);
    if (!source) return "";

    const caption = captionFor(block);
    const relativePath = await downloadAsset({
      block,
      source,
      slug: this.post.slug,
      kind: "image",
    });
    return markdownImage(caption || "Image", relativePath, caption);
  }

  async renderFile(block) {
    const source = displaySource(block);
    if (!source) return "";

    const label = plainText(readRichTextProperty(block, "title")).trim()
      || decodeURIComponent(path.basename(new URL(source).pathname));
    const relativePath = await downloadAsset({
      block,
      source,
      slug: this.post.slug,
      kind: "file",
      requestedName: label,
    });
    const safePath = relativePath.includes(" ") ? `<${relativePath}>` : relativePath;
    return `[${label}](${safePath})`;
  }
}

async function updateMarkdown(post, body) {
  const filePath = absolute(post.markdownPath);
  const markdown = await fs.readFile(filePath, "utf8");
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    throw new Error(`Frontmatter not found in ${post.markdownPath}`);
  }

  const frontmatterLines = match[1]
    .split("\n")
    .filter((line) => !line.trim().startsWith("external:"));

  if (post.locale) {
    const localeIndex = frontmatterLines.findIndex((line) => line.trim().startsWith("locale:"));
    const localeLine = `locale: "${post.locale}"`;

    if (localeIndex >= 0) {
      frontmatterLines[localeIndex] = localeLine;
    } else {
      const imageIndex = frontmatterLines.findIndex((line) => line.trim().startsWith("image:"));
      frontmatterLines.splice(imageIndex >= 0 ? imageIndex + 1 : frontmatterLines.length, 0, localeLine);
    }
  }

  const frontmatter = frontmatterLines.join("\n");

  await fs.writeFile(filePath, `---\n${frontmatter}\n---\n\n${body.trim()}\n`);
}

async function prepareAssetDirs(slug) {
  await fs.rm(absolute("content", "blog", slug), { recursive: true, force: true });
  await fs.rm(absolute("public", "content", "blog", slug), { recursive: true, force: true });
  slugCounts.set(slug, 0);
}

async function exportPost(post) {
  console.log(`Exporting ${post.key}...`);
  await prepareAssetDirs(post.slug);
  const blocks = await loadBlocks(post.pageId);
  const renderer = new Renderer(post, blocks);
  const body = await renderer.renderPage();
  await updateMarkdown(post, body);
  console.log(`Wrote ${post.markdownPath}`);
}

async function main() {
  const selected = process.argv.slice(2);
  const posts = selected.length === 0 || selected.includes("all")
    ? POSTS
    : POSTS.filter((post) => selected.includes(post.key) || selected.includes(post.slug));

  if (posts.length === 0) {
    console.error(`No matching posts. Available keys: ${POSTS.map((post) => post.key).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  for (const post of posts) {
    await exportPost(post);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
