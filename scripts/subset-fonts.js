const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const contentRoot = path.join(root, 'content');
const outputDir = path.join(root, 'public', 'fonts');
// Source fonts are resolved from a repo-local `fonts-src/` folder first (drop the
// .ttf files there to rebuild the subset on macOS/Linux), then fall back to the
// Windows system font path. This keeps font rebuilding possible on any OS.
const localFontDir = path.join(root, 'fonts-src');

function resolveSource(filename, systemPath) {
  const localPath = path.join(localFontDir, filename);
  return fs.existsSync(localPath) ? localPath : systemPath;
}

const fontSources = [
  {
    label: 'Noto Serif SC',
    source: resolveSource('NotoSerifSC-VF.ttf', 'C:\\Windows\\Fonts\\NotoSerifSC-VF.ttf'),
    output: path.join(outputDir, 'noto-serif-sc-subset.woff2'),
    ogOutput: path.join(outputDir, 'noto-serif-sc-subset.woff'),
    ogSource: resolveSource('Deng.ttf', 'C:\\Windows\\Fonts\\Deng.ttf'),
  },
  {
    label: 'Noto Sans SC',
    source: resolveSource('NotoSansSC-VF.ttf', 'C:\\Windows\\Fonts\\NotoSansSC-VF.ttf'),
    output: path.join(outputDir, 'noto-sans-sc-subset.woff2'),
  },
];
const baseSubsetChars = Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 32)).join('')
  + '·，。；：！？、（）《》“”‘’—…￥';

async function collectTextFiles(dir) {
  if (!(await fs.pathExists(dir))) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectTextFiles(entryPath);
    if (entry.isFile() && entry.name.endsWith('.md')) return [entryPath];
    return [];
  }));
  return nested.flat();
}

function extractChars(text) {
  const chars = new Set(baseSubsetChars);
  for (const char of text) {
    const code = char.codePointAt(0);
    // ASCII is rendered by the Latin web fonts; C0/C1 control characters and
    // whitespace never need a glyph. EVERYTHING else that actually appears in
    // the content \u2014 CJK, fullwidth & CJK punctuation, and symbols such as
    // \u2103 \u2109 \u2116 \u00b1 \u00d7 \u00f7 and en/em dashes \u2014 must be in the subset. Otherwise those
    // characters fall back to a system font (e.g. PingFang on macOS) whose
    // metrics differ from Noto, making glyphs look uneven in size/weight
    // within the same line. Subsetting by the characters actually used (rather
    // than a fixed list of Unicode blocks) guarantees nothing is ever missed.
    if (code < 0x80) continue;
    if (code >= 0x80 && code <= 0x9f) continue;
    if (/\s/u.test(char)) continue;
    chars.add(char);
  }
  return Array.from(chars).join('');
}

async function main() {
  const files = await collectTextFiles(contentRoot);
  const content = (await Promise.all(files.map(file => fs.readFile(file, 'utf8')))).join('\n');
  const chars = extractChars(content);

  if (!chars) {
    console.log('No CJK characters found; skipping font subsetting.');
    return;
  }

  await fs.ensureDir(outputDir);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'marcus-font-subset-'));

  try {
    const textFile = path.join(tempDir, 'chars.txt');
    await fs.writeFile(textFile, chars, 'utf8');

    for (const font of fontSources) {
      const outputs = [
        { output: font.output, source: font.source, args: ['--flavor=woff2'] },
        ...(font.ogOutput ? [{ output: font.ogOutput, source: font.ogSource || font.source, args: ['--flavor=woff'] }] : []),
      ];
      const allOutputsExist = (await Promise.all(outputs.map(({ output }) => fs.pathExists(output)))).every(Boolean);

      if (!(await fs.pathExists(font.source))) {
        if (allOutputsExist) {
          console.warn(`${font.label} source font not found; keeping existing subset.`);
          continue;
        }
        console.warn(`${font.label} source font not found; subset was not generated.`);
        continue;
      }

      for (const { output, source, args } of outputs) {
        if (!(await fs.pathExists(source))) {
          if (await fs.pathExists(output)) {
            console.warn(`${path.basename(source)} not found; keeping ${path.relative(root, output)}.`);
          } else {
            console.warn(`${path.basename(source)} not found; ${path.relative(root, output)} was not generated.`);
          }
          continue;
        }

        execFileSync('pyftsubset', [
          source,
          `--text-file=${textFile}`,
          ...args,
          '--layout-features=*',
          '--drop-tables+=meta',
          '--output-file=' + output,
        ], { stdio: 'inherit' });

        const size = (await fs.stat(output)).size;
        console.log(`Wrote ${path.relative(root, output)} (${(size / 1024).toFixed(1)} KB).`);
      }
    }
  } finally {
    await fs.remove(tempDir);
  }
}

main().catch((error) => {
  console.error('Font subsetting failed:', error);
  process.exit(1);
});
