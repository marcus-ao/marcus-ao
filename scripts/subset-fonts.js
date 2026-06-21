const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.cwd();
const contentRoot = path.join(root, 'content');
const outputDir = path.join(root, 'public', 'fonts');
const fontSources = [
  {
    label: 'Noto Serif SC',
    source: 'C:\\Windows\\Fonts\\NotoSerifSC-VF.ttf',
    output: path.join(outputDir, 'noto-serif-sc-subset.woff2'),
    ogOutput: path.join(outputDir, 'noto-serif-sc-subset.woff'),
    ogSource: 'C:\\Windows\\Fonts\\Deng.ttf',
  },
  {
    label: 'Noto Sans SC',
    source: 'C:\\Windows\\Fonts\\NotoSansSC-VF.ttf',
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
    if (/[\u3000-\u303f\uff00-\uffef\u3400-\u9fff\uf900-\ufaff]/u.test(char)) {
      chars.add(char);
    }
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
