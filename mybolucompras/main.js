const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;
let splashWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 600,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  mainWindow.once('ready-to-show', () => {
    splashWindow.close();
    mainWindow.show();
  });

  mainWindow.loadURL('http://localhost:5173');
  mainWindow.maximize();
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    webPreferences: {
      contextIsolation: true,
    }
  });

  splashWindow.loadFile(path.join(__dirname, './public/splash.html'));
}

app.whenReady().then(() => {
  createSplashWindow();
  setTimeout(() => {
    createWindow();
  }, 4000);
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Ensure the directory and files exist
const archivos = ['data', 'misdatos'];
const directorio = path.join('C:', 'DatosMybolucompras');

if (!fs.existsSync(directorio)) {
  fs.mkdirSync(directorio);
}

archivos.forEach(archivo => {
  const rutaArchivo = path.join(directorio, `${archivo}.json`);
  if (!fs.existsSync(rutaArchivo)) {
    fs.writeFileSync(rutaArchivo, '[]');
  }
});

ipcMain.handle('read-data', async (event, archivo) => {
  const directorio = path.join('C:', 'DatosMybolucompras');
  const rutaArchivo = path.join(directorio, `${archivo}.json`);
  const data = JSON.parse(fs.readFileSync(rutaArchivo, 'utf8'));
  return data;
});

ipcMain.handle('write-data', async (event, { archivo, newData }) => {
  const directorio = path.join('C:', 'DatosMybolucompras');
  const rutaArchivo = path.join(directorio, `${archivo}.json`);
  try {
    fs.writeFileSync(rutaArchivo, JSON.stringify(newData, null, 2));
    return 'Data saved';
  } catch (error) {
    console.error('Error writing data:', error);
    throw error;
  }
});