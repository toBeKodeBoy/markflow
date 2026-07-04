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
      return require('fs').readFileSync(paths[0], 'utf-8');
    }
    return null;
  },

  /**
   * 导出 PDF（Typora 路线：完整 HTML + ubrowser Chromium printToPDF）
   * options: { pageSize, margin, printBackground }
   * 返回 Promise<{ ok: true } | { ok: false, reason: 'cancel' | 'error' }>
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
    var printBackground = opts.printBackground !== false;

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
      fs.writeFileSync(tmpPath, html, 'utf-8');
      var fileUrl = pathToFileURL(tmpPath).href;

      if (!utools.ubrowser || typeof utools.ubrowser.goto !== 'function') {
        cleanupTmp();
        console.error('[MarkFlow] utools.ubrowser 不可用');
        return Promise.resolve({ ok: false, reason: 'error' });
      }

      return utools.ubrowser
        .goto(fileUrl)
        .wait(function () {
          var imgs = document.images;
          for (var i = 0; i < imgs.length; i++) {
            if (!imgs[i].complete) return false;
          }
          return true;
        }, 15000)
        .pdf(
          {
            printBackground: printBackground,
            pageSize: pageSize
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
          return { ok: false, reason: 'error' };
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
  }
};
