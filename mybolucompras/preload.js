const { contextBridge, ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});

contextBridge.exposeInMainWorld('electron', {
  readData: (archivo) => ipcRenderer.invoke('read-data', archivo),
  writeData: (archivo, newData) => ipcRenderer.invoke('write-data', { archivo, newData }),

  updater: {
    onUpdateAvailable: (cb) => ipcRenderer.on('update_available', (_e, info) => cb(info)),
    onDownloadProgress: (cb) => ipcRenderer.on('update_progress', (_e, progress) => cb(progress)),
    onUpdateDownloaded: (cb) => ipcRenderer.on('update_downloaded', (_e, info) => cb(info)),
    onUpdateError: (cb) => ipcRenderer.on('update_error', (_e, err) => cb(err)),
    restart: () => ipcRenderer.send('restart_app'),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  },
});
