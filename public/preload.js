/* global utools */
// preload.js - uTools API 桥接层（CommonJS，不压缩）
// 挂载到 window.markflow，供 Vue 应用调用

window.markflow = {
  // ---- 笔记存储 ----
  getNoteList: function () {
    return utools.dbStorage.getItem('markflow_note_list') || [];
  },

  saveNoteList: function (list) {
    utools.dbStorage.setItem('markflow_note_list', list);
  },

  getNote: function (id) {
    return utools.dbStorage.getItem('markflow_note_' + id) || null;
  },

  saveNote: function (id, data) {
    utools.dbStorage.setItem('markflow_note_' + id, data);
  },

  removeNote: function (id) {
    utools.dbStorage.removeItem('markflow_note_' + id);
  },

  // ---- 文件夹存储 ----
  getFolderList: function () {
    return utools.dbStorage.getItem('markflow_folder_list') || [];
  },

  saveFolderList: function (list) {
    utools.dbStorage.setItem('markflow_folder_list', list);
  },

  // ---- 设置 ----
  getSettings: function () {
    return utools.dbStorage.getItem('markflow_settings') || { theme: 'light', fontSize: 14 };
  },

  saveSettings: function (settings) {
    utools.dbStorage.setItem('markflow_settings', settings);
  },

  // ---- 系统能力 ----
  showNotification: function (msg) {
    utools.showNotification(msg);
  },

  // 导出 .md 文件到本地
  saveMarkdownFile: function (filename, content) {
    var path = utools.showSaveDialog({
      title: '导出 Markdown 文件',
      defaultPath: filename,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    });
    if (path) {
      require('fs').writeFileSync(path, content, 'utf-8');
      return true;
    }
    return false;
  },

  // 读取本地 .md 文件（导入）
  openMarkdownFile: function () {
    var paths = utools.showOpenDialog({
      title: '导入 Markdown 文件',
      filters: [{ name: 'Markdown', extensions: ['md', 'txt'] }],
      properties: ['openFile']
    });
    if (paths && paths.length > 0) {
      var selectedPath = paths[0];
      var path = require('path');
      var fs = require('fs');
      var content = fs.readFileSync(selectedPath, 'utf-8');
      return {
        content: content,
        path: selectedPath,
        name: path.basename(selectedPath),
        images: collectImages(content, selectedPath, fs, path)
      };
    }
    return null;
  },

  // 选择文件夹并扫描 Markdown 文件（导入文件夹，异步分批避免阻塞 UI）
  openMarkdownFolder: function () {
    var paths = utools.showOpenDialog({
      title: '导入文件夹',
      properties: ['openDirectory']
    });
    if (!paths || !paths.length) return Promise.resolve(null);
    return scanMarkdownFolderAsync(paths[0]);
  },

  /**
   * 导出 PDF（Typora 路线：完整 HTML + ubrowser Chromium printToPDF）
   * options: { pageSize, margin, printBackground, landscape, scale, displayHeaderFooter, preferCssPageSize }
   * 返回 Promise<{ ok: true } | { ok: false, reason: string }>
   */
  savePdfFromHtml: function (filename, html, options) {
    var savePath = utools.showSaveDialog({
      title: '导出 PDF',
      defaultPath: filename.replace(/\.md$/, '.pdf'),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (!savePath) return Promise.resolve({ ok: false, reason: 'cancel' });

    var opts = options || {};
    var pageSize = opts.pageSize || 'A4';
    var landscape = opts.landscape === 'landscape';
    var printBackground = opts.printBackground !== false;
    var scale = typeof opts.scale === 'number' && isFinite(opts.scale) ? opts.scale : 1;
    var displayHeaderFooter = opts.displayHeaderFooter === true;
    var preferCssPageSize = opts.preferCssPageSize !== false;
    var marginMap = {
      default: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      narrow: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      wide: { top: '25mm', right: '25mm', bottom: '25mm', left: '25mm' },
      none: { top: '5mm', right: '5mm', bottom: '5mm', left: '5mm' }
    };
    var margin = marginMap[opts.margin] || marginMap.default;

    var fs = require('fs');
    var os = require('os');
    var path = require('path');
    var pathToFileURL = require('url').pathToFileURL;
    var tmpPath = path.join(os.tmpdir(), 'markflow-print-' + Date.now() + '.html');

    function cleanupTmp() {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch (e) {
        /* ignore */
      }
    }

    try {
      try {
        fs.writeFileSync(tmpPath, html, 'utf-8');
      } catch (writeErr) {
        cleanupTmp();
        console.error('[MarkFlow] 写入临时打印文件失败:', writeErr);
        return Promise.resolve({ ok: false, reason: 'write-temp-failed' });
      }
      var fileUrl = pathToFileURL(tmpPath).href;

      if (!utools.ubrowser || typeof utools.ubrowser.goto !== 'function') {
        cleanupTmp();
        console.error('[MarkFlow] utools.ubrowser 不可用');
        return Promise.resolve({ ok: false, reason: 'ubrowser-unavailable' });
      }

      return utools.ubrowser
        .goto(fileUrl)
        .wait(function () {
          return window.__MARKFLOW_PDF_READY__ === true;
        }, 20000)
        .pdf(
          {
            printBackground: printBackground,
            pageSize: pageSize,
            landscape: landscape,
            scale: scale,
            displayHeaderFooter: displayHeaderFooter,
            preferCSSPageSize: preferCssPageSize,
            margin: margin
          },
          savePath
        )
        .run({ show: false, width: 1024, height: 768 })
        .then(function () {
          cleanupTmp();
          return { ok: true };
        })
        .catch(function (err) {
          cleanupTmp();
          console.error('[MarkFlow] PDF 导出失败:', err);
          var msg = err && err.message ? String(err.message) : String(err || '');
          if (/wait|timeout/i.test(msg)) {
            return { ok: false, reason: 'resource-timeout' };
          }
          return { ok: false, reason: 'save-failed' };
        });
    } catch (err) {
      cleanupTmp();
      console.error('[MarkFlow] PDF 导出初始化失败:', err);
      return Promise.resolve({ ok: false, reason: 'error' });
    }
  },



  // 获取 uTools 主题（dark/light）
  isDarkTheme: function () {
    return utools.isDarkColors();
  },

  // 隐藏 uTools 主窗口
  hideMainWindow: function () {
    utools.hideMainWindow();
  },

  // 复制文本到剪贴板（uTools 原生 API，比 Clipboard API 更可靠）
  copyText: function (text) {
    try {
      utools.copyText(text);
      return true;
    } catch (e) {
      console.error('[MarkFlow] utools.copyText 失败:', e);
      return false;
    }
  },

  // ---- 图片资源存储 ----
  getAssetIndex: function () {
    return utools.dbStorage.getItem('markflow_asset_index') || [];
  },

  saveAssetIndex: function (index) {
    utools.dbStorage.setItem('markflow_asset_index', index);
  },

  getAsset: function (id) {
    return utools.dbStorage.getItem('markflow_asset_' + id) || null;
  },

  saveAsset: function (id, record) {
    utools.dbStorage.setItem('markflow_asset_' + id, record);
  },

  removeAsset: function (id) {
    utools.dbStorage.removeItem('markflow_asset_' + id);
  },

  saveBackupFile: function (jsonString, defaultName) {
    var path = utools.showSaveDialog({
      title: '导出 MarkFlow 备份',
      defaultPath: defaultName,
      filters: [{ name: 'MarkFlow Backup', extensions: ['json'] }]
    });
    if (!path) return { ok: false, reason: 'cancel' };
    try {
      require('fs').writeFileSync(path, jsonString, 'utf-8');
      return { ok: true, path: path };
    } catch (e) {
      return { ok: false, reason: 'error' };
    }
  },

  openBackupFile: function () {
    var paths = utools.showOpenDialog({
      title: '从备份恢复',
      filters: [{ name: 'MarkFlow Backup', extensions: ['json'] }],
      properties: ['openFile']
    });
    if (paths && paths.length > 0) {
      return require('fs').readFileSync(paths[0], 'utf-8');
    }
    return null;
  },

  selectBackupDirectory: function () {
    var paths = utools.showOpenDialog({
      title: '选择自动备份目录',
      properties: ['openDirectory']
    });
    if (!paths || !paths.length) return null;
    return paths[0];
  },

  writeBackupFileSilent: function (dirPath, filename, content) {
    try {
      var fs = require('fs');
      var path = require('path');
      if (!dirPath || !path.isAbsolute(dirPath)) {
        return { ok: false, reason: 'error' };
      }
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      var fullPath = path.join(dirPath, filename);
      fs.writeFileSync(fullPath, content, 'utf-8');
      return { ok: true, path: fullPath };
    } catch (e) {
      return { ok: false, reason: 'error' };
    }
  },

  cleanOldBackupFiles: function (dirPath, maxCopies) {
    try {
      var fs = require('fs');
      var path = require('path');
      if (!dirPath || !path.isAbsolute(dirPath)) {
        return { ok: false, reason: 'error' };
      }
      if (!fs.existsSync(dirPath)) return { ok: true, deleted: 0 };
      if (maxCopies <= 0) return { ok: true, deleted: 0 };
      var entries = fs.readdirSync(dirPath)
        .filter(function (f) { return /^markflow-backup-\d{8}T\d{6}\.json$/.test(f); })
        .map(function (f) {
          var full = path.join(dirPath, f);
          return { full: full, mtime: fs.statSync(full).mtimeMs };
        })
        .sort(function (a, b) { return b.mtime - a.mtime; });
      var toDelete = entries.slice(maxCopies);
      for (var i = 0; i < toDelete.length; i++) {
        fs.unlinkSync(toDelete[i].full);
      }
      return { ok: true, deleted: toDelete.length };
    } catch (e) {
      return { ok: false, reason: 'error' };
    }
  },

  getDefaultBackupDirectory: function () {
    try {
      var fs = require('fs');
      var path = require('path');
      var base = utools.getPath('appData');
      var dir = path.join(base, 'markflow-backups');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return dir;
    } catch (e) {
      return null;
    }
  },

  getAutoBackupCapabilities: function () {
    return {
      version: 1,
      available: typeof this.selectBackupDirectory === 'function' &&
        typeof this.writeBackupFileSilent === 'function' &&
        typeof this.cleanOldBackupFiles === 'function' &&
        typeof this.getDefaultBackupDirectory === 'function',
      isDev: typeof utools.isDev === 'function' ? utools.isDev() : false
    };
  },

  openBackupDirectory: function (dirPath) {
    try {
      if (!dirPath) return false;
      utools.shellOpenPath(dirPath);
      return true;
    } catch (e) {
      return false;
    }
  }
};

// ---- 文件夹导入扫描（异步分批，扩展名规则与 importFolderHelpers.ts 保持一致） ----
var SKIP_DIR_NAMES = { '.git': 1, node_modules: 1, '.svn': 1, __pycache__: 1, '.idea': 1, dist: 1, build: 1 };
var TEXT_IMPORT_EXT = {
  md: 1, markdown: 1, mdown: 1, mkd: 1, txt: 1, text: 1,
  json: 1, jsonc: 1, yaml: 1, yml: 1, toml: 1, xml: 1, html: 1, htm: 1, css: 1, scss: 1, sass: 1, less: 1,
  js: 1, mjs: 1, cjs: 1, jsx: 1, ts: 1, tsx: 1, vue: 1, svelte: 1,
  py: 1, rb: 1, go: 1, rs: 1, java: 1, kt: 1, kts: 1, swift: 1, c: 1, cpp: 1, cc: 1, h: 1, hpp: 1, cs: 1,
  sql: 1, sh: 1, bash: 1, zsh: 1, ps1: 1, bat: 1, cmd: 1,
  ini: 1, cfg: 1, conf: 1, env: 1, properties: 1,
  log: 1, csv: 1, tsv: 1,
  adoc: 1, asciidoc: 1, org: 1, tex: 1, latex: 1, bib: 1, rst: 1
};
var IMAGE_IMPORT_EXT = { png: 1, jpg: 1, jpeg: 1, gif: 1, webp: 1, svg: 1, bmp: 1, ico: 1 };
var SKIP_IMPORT_EXT = {
  exe: 1, dll: 1, so: 1, dylib: 1, zip: 1, rar: 1, '7z': 1, tar: 1, gz: 1, bz2: 1, xz: 1,
  pdf: 1, doc: 1, docx: 1, xls: 1, xlsx: 1, ppt: 1, pptx: 1,
  mp3: 1, mp4: 1, avi: 1, mov: 1, mkv: 1, wav: 1, flac: 1, ogg: 1, webm: 1,
  woff: 1, woff2: 1, ttf: 1, otf: 1, eot: 1,
  bin: 1, obj: 1, o: 1, class: 1, jar: 1, wasm: 1, dmg: 1, iso: 1,
  db: 1, sqlite: 1, sqlite3: 1
};
var TEXT_IMPORT_BASENAMES = {
  dockerfile: 1, makefile: 1, license: 1, readme: 1, changelog: 1, authors: 1, contributing: 1
};
var IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i;
var REL_IMAGE_MD_RE = /!\[[^\]]*\]\((?!https?:|markflow-asset:|data:)([^)\s]+)(?:\s+"[^"]*")?\)/g;
var SCAN_MAX_DEPTH = 20;
var SCAN_DIRS_PER_TICK = 12;

function getFileExtension(name) {
  var dot = name.lastIndexOf('.');
  if (dot <= 0) return '';
  return name.slice(dot + 1).toLowerCase();
}

function shouldSkipImportFilename(name) {
  var ext = getFileExtension(name);
  return !!(ext && SKIP_IMPORT_EXT[ext]);
}

function isImportableTextFilename(name) {
  if (shouldSkipImportFilename(name)) return false;
  var lower = name.toLowerCase();
  if (TEXT_IMPORT_BASENAMES[lower]) return true;
  var ext = getFileExtension(name);
  return !!(ext && TEXT_IMPORT_EXT[ext]);
}

function isImportableImageFilename(name) {
  if (shouldSkipImportFilename(name)) return false;
  return !!IMAGE_IMPORT_EXT[getFileExtension(name)];
}

function mimeFromImagePath(fullPath, path) {
  var ext = getFileExtension(path.basename(fullPath));
  if (ext === 'jpg') return 'image/jpeg';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'ico') return 'image/x-icon';
  if (ext === 'bmp') return 'image/bmp';
  return 'image/' + ext;
}

function shouldSkipImportDir(name) {
  if (SKIP_DIR_NAMES[name]) return true;
  return name.charAt(0) === '.';
}

function collectImages(content, mdFullPath, fs, path) {
  var images = [];
  var m;
  REL_IMAGE_MD_RE.lastIndex = 0;
  while ((m = REL_IMAGE_MD_RE.exec(content)) !== null) {
    var relImg = m[1].trim().replace(/^<|>$/g, '');
    var imgPath = path.resolve(path.dirname(mdFullPath), relImg);
    try {
      if (!fs.existsSync(imgPath) || !IMAGE_EXT_RE.test(imgPath)) continue;
      var buf = fs.readFileSync(imgPath);
      var ext = path.extname(imgPath).slice(1).toLowerCase();
      var mime = ext === 'jpg' ? 'image/jpeg' : 'image/' + ext;
      images.push({ relPath: relImg, base64: buf.toString('base64'), mime: mime });
    } catch (e) {
      /* skip unreadable image */
    }
  }
  return images;
}

function scanMarkdownFolderAsync(rootPath) {
  var fs = require('fs');
  var path = require('path');
  var files = [];
  var queue = [{ dir: rootPath, relBase: '', depth: 0 }];
  var visited = Object.create(null);

  function resolveVisited(dir) {
    try {
      return fs.realpathSync.native ? fs.realpathSync.native(dir) : fs.realpathSync(dir);
    } catch (e) {
      return path.resolve(dir);
    }
  }

  return new Promise(function (resolve) {
    function processTick() {
      var batch = 0;
      while (queue.length > 0 && batch < SCAN_DIRS_PER_TICK) {
        batch++;
        var item = queue.shift();
        if (item.depth > SCAN_MAX_DEPTH) continue;

        var absDir = path.resolve(item.dir);
        var visitKey = resolveVisited(absDir);
        if (visited[visitKey]) continue;
        visited[visitKey] = true;

        var entries;
        try {
          entries = fs.readdirSync(absDir, { withFileTypes: true });
        } catch (e) {
          continue;
        }

        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          if (entry.isDirectory()) {
            if (shouldSkipImportDir(entry.name)) continue;
            var nextRel = item.relBase ? item.relBase + '/' + entry.name : entry.name;
            queue.push({
              dir: path.join(absDir, entry.name),
              relBase: nextRel,
              depth: item.depth + 1
            });
          } else if (entry.isFile()) {
            var relPath = item.relBase ? item.relBase + '/' + entry.name : entry.name;
            var fullPath = path.join(absDir, entry.name);
            relPath = relPath.replace(/\\/g, '/');

            if (isImportableImageFilename(entry.name)) {
              try {
                var imgBuf = fs.readFileSync(fullPath);
                files.push({
                  relativePath: relPath,
                  content: '',
                  images: [],
                  standaloneImage: {
                    relPath: entry.name,
                    base64: imgBuf.toString('base64'),
                    mime: mimeFromImagePath(fullPath, path)
                  }
                });
              } catch (e) {
                /* skip unreadable image */
              }
            } else if (isImportableTextFilename(entry.name)) {
              try {
                var content = fs.readFileSync(fullPath, 'utf-8');
                files.push({
                  relativePath: relPath,
                  content: content,
                  images: collectImages(content, fullPath, fs, path)
                });
              } catch (e) {
                /* skip unreadable text */
              }
            }
          }
        }
      }

      if (queue.length > 0) {
        setImmediate(processTick);
      } else {
        resolve({ rootPath: rootPath, files: files });
      }
    }

    setImmediate(processTick);
  });
}
