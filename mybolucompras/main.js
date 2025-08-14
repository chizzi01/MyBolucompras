const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');
const log = require('electron-log');
//require('dotenv').config();
app.setName('MyBolucompras');
app.setAppUserModelId('com.mybolucompras.app');


let mainWindow;
let splashWindow;
let appIcon = null;

log.initialize({ spyConsole: true });
log.catchErrors({ showDialog: false });
log.transports.file.level = 'info';
// Muestra la ruta real del archivo de log:
log.info('Log file:', log.transports.file.getFile().path);

function loadAppIcon() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'build', 'icon.ico')
    : path.join(__dirname, 'build', 'icon.ico'); const icon = nativeImage.createFromPath(iconPath);
  log.info('Icon path:', iconPath);
  log.info('Icon exists:', fs.existsSync(iconPath));
  log.info('Icon isEmpty:', icon.isEmpty());
  return icon;
}

// Función para obtener la ruta correcta en desarrollo o producción
function getAppPath() {
  return app.isPackaged ? path.join(process.resourcesPath, 'app') : app.getAppPath();
}

// Inicialización de la aplicación
app.whenReady().then(() => {
  console.log('App is ready');
  appIcon = loadAppIcon();
  createSplashWindow();
  setTimeout(() => {
    createWindow();
    setupAutoUpdater();
  }, 2000);
});

autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// Configuración del autoUpdater
function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Eventos del autoUpdater -> Renderer via IPC
  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info);
    mainWindow?.webContents.send('update_available', info);
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log('Download progress:', progress.percent);
    mainWindow?.webContents.send('update_progress', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info);
    mainWindow?.webContents.send('update_downloaded', info);
  });

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err);
    mainWindow?.webContents.send('update_error', String(err));
  });

  // Chequeo inicial y periódico
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 3000);
  setInterval(() => autoUpdater.checkForUpdates(), 60 * 60 * 1000); // cada hora
}

// IPC handler para reiniciar la app desde el renderer
ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

function createWindow() {
  console.log('Creating main window...');
  console.log('App is packaged:', app.isPackaged);
  console.log('App path:', getAppPath());

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'build', 'icon.ico')
    : path.join(__dirname, 'build', 'icon.ico');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 600,
    icon: iconPath,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      devTools: true
    }
  });


  // Manejadores de eventos para debugging
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    dialog.showErrorBox('Error de carga', `Error al cargar la aplicación: ${errorDescription}`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded:', mainWindow.webContents.getURL());
  });

  // Carga la aplicación
  if (app.isPackaged) {
    // En producción, usa la ruta relativa al ejecutable
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    console.log('Loading production path:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));

    // Lista el contenido del directorio para debugging
    try {
      const files = fs.readdirSync(path.dirname(indexPath));
      console.log('Directory contents:', files);
    } catch (err) {
      console.error('Error reading directory:', err);
    }

    mainWindow.loadFile(indexPath)
      .catch((err) => {
        console.error('Error loading index.html:', err);
        dialog.showErrorBox('Error', `Failed to load application: ${err.message}`);
      });
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.destroy();
    }
    mainWindow.show();
  });

  mainWindow.maximize();
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    skipTaskbar: true,
    icon: appIcon,
    webPreferences: {
      contextIsolation: true
    }
  });

  const splashPath = path.join(getAppPath(), 'public', 'splash.html');
  splashWindow.loadFile(splashPath);
}


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('ready', () => {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Actualización disponible',
      message: 'Hay una nueva versión disponible. Se descargará en segundo plano.',
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Actualización lista',
      message: 'La nueva versión está lista. Reinicia la aplicación para aplicar los cambios.',
    }).then(() => {
      autoUpdater.quitAndInstall();
    });
  });
});
// Manejo de archivos y datos
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

// IPC handlers
ipcMain.handle('read-data', async (event, archivo) => {
  const rutaArchivo = path.join(directorio, `${archivo}.json`);
  try {
    const data = JSON.parse(fs.readFileSync(rutaArchivo, 'utf8'));
    return data;
  } catch (error) {
    console.error('Error reading data:', error);
    throw error;
  }
});

ipcMain.handle('write-data', async (event, { archivo, newData }) => {
  const rutaArchivo = path.join(directorio, `${archivo}.json`);
  try {
    fs.writeFileSync(rutaArchivo, JSON.stringify(newData, null, 2));
    return 'Data saved';
  } catch (error) {
    console.error('Error writing data:', error);
    throw error;
  }
});