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

  // 导出 PDF（使用 @mdpdf/mdpdf Rust 原生引擎）
  savePdfFile: function (filename, markdownContent) {
    var path = utools.showSaveDialog({
      title: '导出 PDF',
      defaultPath: filename.replace(/\.md$/, '.pdf'),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (!path) return false;

    try {
      var mdpdf = require('@mdpdf/mdpdf');
      // markdownToPdf 返回 Promise<Uint8Array>
      var pdfBuf = mdpdf.markdownToPdf(markdownContent);
      // 处理同步化（@mdpdf/mdpdf 是 async，但 preload 可以用 .then）
      // 注意：这里用同步风格等待，uTools preload 中实际是异步执行
      return pdfBuf.then(function (buf) {
        require('fs').writeFileSync(path, Buffer.from(buf));
        return true;
      }).catch(function (err) {
        console.error('[MarkFlow] PDF 导出失败:', err);
        return false;
      });
    } catch (err) {
      console.error('[MarkFlow] PDF 导出初始化失败:', err);
      return false;
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
