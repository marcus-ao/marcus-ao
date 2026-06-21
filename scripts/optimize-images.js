const fs = require('fs-extra');
const path = require('path');
const sharp = require('sharp');

const root = process.cwd();
const maxDimension = 1400;
const quality = 74;
const includeWebp = process.argv.includes('--include-webp');
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png']);
const reoptimizableExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const targets = [
  path.join(root, 'public', 'marcusao.jpg'),
  path.join(root, 'public', 'marcusao.webp'),
  path.join(root, 'public', 'pics'),
  path.join(root, 'public', 'content'),
  path.join(root, 'content'),
];

async function collectImages(targetPath) {
  if (!(await fs.pathExists(targetPath))) {
    return [];
  }

  const stat = await fs.stat(targetPath);
  if (stat.isFile()) {
    return shouldOptimize(targetPath) ? [targetPath] : [];
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const entryPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      return collectImages(entryPath);
    }
    if (entry.isFile() && shouldOptimize(entryPath)) {
      return [entryPath];
    }
    return [];
  }));

  return nested.flat();
}

function webpPathFor(sourcePath) {
  return sourcePath.replace(/\.(jpe?g|png|webp)$/i, '.webp');
}

function shouldOptimize(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return includeWebp ? reoptimizableExtensions.has(extension) : supportedExtensions.has(extension);
}

async function optimizeImage(sourcePath) {
  const outputPath = webpPathFor(sourcePath);
  const tempPath = `${outputPath}.tmp`;
  const originalSize = (await fs.stat(sourcePath)).size;

  await fs.ensureDir(path.dirname(outputPath));
  const sourceBuffer = await fs.readFile(sourcePath);

  await sharp(sourceBuffer)
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 5 })
    .toFile(tempPath);

  await moveWithRetry(tempPath, outputPath);

  if (path.resolve(sourcePath) !== path.resolve(outputPath)) {
    await removeWithRetry(sourcePath);
  }

  const optimizedSize = (await fs.stat(outputPath)).size;

  return {
    sourcePath,
    outputPath,
    originalSize,
    optimizedSize,
    savedBytes: originalSize - optimizedSize,
  };
}

async function removeWithRetry(filePath, attempts = 10) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await fs.remove(filePath);
      return;
    } catch (error) {
      if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
}

async function moveWithRetry(sourcePath, outputPath, attempts = 10) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await fs.move(sourcePath, outputPath, { overwrite: true });
      return;
    } catch (error) {
      if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
  const imageGroups = await Promise.all(targets.map(collectImages));
  const images = Array.from(new Set(imageGroups.flat().map((file) => path.resolve(file))));

  if (images.length === 0) {
    console.log(includeWebp
      ? 'No source JPG/PNG/WebP images found to optimize.'
      : 'No source JPG/PNG images found to optimize.'
    );
    return;
  }

  console.log(`Optimizing ${images.length} image(s) to WebP...`);

  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const imagePath of images) {
    const result = await optimizeImage(imagePath);
    totalOriginal += result.originalSize;
    totalOptimized += result.optimizedSize;

    const relativeInput = path.relative(root, result.sourcePath);
    const relativeOutput = path.relative(root, result.outputPath);
    console.log(
      `${relativeInput} -> ${relativeOutput} ` +
      `(${formatBytes(result.originalSize)} -> ${formatBytes(result.optimizedSize)})`
    );
  }

  const saved = totalOriginal - totalOptimized;
  console.log(
    `Done. ${formatBytes(totalOriginal)} -> ${formatBytes(totalOptimized)} ` +
    `(${formatBytes(saved)} saved).`
  );
}

main().catch((error) => {
  console.error('Image optimization failed:', error);
  process.exit(1);
});
