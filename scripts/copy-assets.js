const fs = require('fs-extra');
const path = require('path');

// 源目录：Markdown 笔记和附件所在的位置
const sourceNotesDir = path.join(process.cwd(), 'share_notes');
// 目标目录：Next.js public 目录下的子文件夹，用于存放复制过来的附件
const targetAssetsDir = path.join(process.cwd(), 'public', 'share_notes');

// 允许的附件文件扩展名
const allowedExtensions = [".pdf", ".doc", ".docx", ".txt", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".mp3", ".mp4", ".avi", ".mov", ".wmv", ".zip", ".rar", ".xls", ".xlsx", ".ppt", ".pptx", ".csv", ".html", ".htm", ".css", ".js", ".php", ".py", ".java", ".c", ".cpp", ".sql", ".xml", ".json", ".epub", ".mobi", ".wav", ".flac", ".ogg", ".mkv", ".3gp", ".7z", ".tar", ".gz", ".rtf", ".odt", ".ods", ".odp", ".psd", ".ai"];

console.log('Starting asset copy process...');
console.log(`Source directory: ${sourceNotesDir}`);
console.log(`Target directory: ${targetAssetsDir}`);

async function copyAssets() {
  try {
    await fs.ensureDir(targetAssetsDir);
    console.log(`Ensured target directory exists: ${targetAssetsDir}`);

    const findAssetsRecursive = async (currentDir) => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const sourcePath = path.join(currentDir, entry.name);
        const relativePath = path.relative(sourceNotesDir, sourcePath);
        const targetPath = path.join(targetAssetsDir, relativePath);

        if (entry.isDirectory()) {
          await fs.ensureDir(targetPath);
          await findAssetsRecursive(sourcePath);
        } else if (entry.isFile() && allowedExtensions.includes(path.extname(entry.name).toLowerCase())) {
          try {
            await fs.copy(sourcePath, targetPath, { overwrite: true });
            console.log(`Copied: ${sourcePath} -> ${targetPath}`);
          } catch (copyError) {
            console.error(`Error copying file ${sourcePath}:`, copyError);
          }
        }
      }
    };

    await findAssetsRecursive(sourceNotesDir);
    console.log('Asset copy process completed successfully.');

  } catch (error) {
    console.error('Error during asset copy process:', error);
    process.exit(1);
  }
}

copyAssets();
