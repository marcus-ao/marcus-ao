const fs = require('fs-extra');
const path = require('path');

// 源目录：Markdown 内容和附件所在的位置
const sourceContentDir = path.join(process.cwd(), 'content');
// 目标目录：Next.js public 目录下的子文件夹，用于存放复制过来的附件
const targetAssetsDir = path.join(process.cwd(), 'public', 'content');

// 允许复制到 public 的静态附件类型。避免把 HTML/JS/SVG/服务端脚本等可执行或源码文件发布出去。
const allowedExtensions = new Set([
  ".ai", ".avi", ".bmp", ".csv", ".doc", ".docx", ".epub", ".flac",
  ".gif", ".gz", ".jpeg", ".jpg", ".json", ".mkv", ".mobi", ".mov",
  ".mp3", ".mp4", ".odp", ".ods", ".odt", ".ogg", ".pdf", ".png",
  ".ppt", ".pptx", ".psd", ".rar", ".rtf", ".tar", ".txt",
  ".wav", ".webp", ".wmv", ".xls", ".xlsx", ".xml", ".zip", ".7z", ".3gp",
]);

function isHiddenOrSystemEntry(name) {
  return name.startsWith('.') || name === 'Thumbs.db';
}

console.log('Starting asset copy process...');
console.log(`Source directory: ${sourceContentDir}`);
console.log(`Target directory: ${targetAssetsDir}`);

async function copyAssets() {
  try {
    await fs.emptyDir(targetAssetsDir);
    console.log(`Prepared clean target directory: ${targetAssetsDir}`);

    const findAssetsRecursive = async (currentDir) => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (isHiddenOrSystemEntry(entry.name)) {
          continue;
        }

        const sourcePath = path.join(currentDir, entry.name);
        const relativePath = path.relative(sourceContentDir, sourcePath);
        const targetPath = path.join(targetAssetsDir, relativePath);

        if (entry.isDirectory()) {
          await fs.ensureDir(targetPath);
          await findAssetsRecursive(sourcePath);
        } else if (entry.isFile() && allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
          try {
            await fs.copy(sourcePath, targetPath, { overwrite: true });
            console.log(`Copied: ${sourcePath} -> ${targetPath}`);
          } catch (copyError) {
            console.error(`Error copying file ${sourcePath}:`, copyError);
          }
        }
      }
    };

    await findAssetsRecursive(sourceContentDir);
    console.log('Asset copy process completed successfully.');

  } catch (error) {
    console.error('Error during asset copy process:', error);
    process.exit(1);
  }
}

copyAssets();
