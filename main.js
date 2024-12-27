// Modules to control application life and create native browser window
const { app, BrowserWindow } = require('electron')
const path = require('path')
let mainWindow = null;
function createWindow() {
  // Create the browser window.

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 600,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      enableRemoteModule: true,
      devTools: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.loadFile('index.html')
  mainWindow.maximize();

}


app.whenReady().then(() => {
  createWindow()
  app.on('activate', function () {

    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})
