const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Logger {
  constructor() {
    const userDataPath = app.getPath('userData');
    this.logPath = path.join(userDataPath, 'logs');
    
    // Crear directorio de logs si no existe
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath);
    }
    
    this.logFile = path.join(this.logPath, `app-${new Date().toISOString().split('T')[0]}.log`);
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type}] ${message}\n`;
    
    // Escribir al archivo
    fs.appendFileSync(this.logFile, logMessage);
    
    // También mostrar en consola
    console.log(message);
  }

  error(message) {
    this.log(message, 'ERROR');
  }
}

module.exports = new Logger();