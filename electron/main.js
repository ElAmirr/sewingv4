import { app, BrowserWindow, screen, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

// Aggressive transparency switches for Windows
app.commandLine.appendSwitch('enable-transparent-visuals');
app.commandLine.appendSwitch('disable-gpu'); // Sometimes needed for transparency on some hardware

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create log file in user's home directory or app data
const logPath = path.join(app.getPath('userData'), 'app.log');
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage);
  logStream.write(logMessage);
}

log('=== Application Starting ===');
log(`App path: ${app.getAppPath()}`);
log(`User data path: ${app.getPath('userData')}`);
log(`__dirname: ${__dirname}`);
log(`Process argv: ${JSON.stringify(process.argv)}`);

let mainWindow;
let miniWindow;
let backendProcess;

function createWindow() {
  log('Creating main window...');
  try {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = 500;

    mainWindow = new BrowserWindow({
      width: windowWidth,
      height: height,
      x: width - windowWidth,
      y: 0,
      alwaysOnTop: true,
      frame: true, // Standard frame restored
      icon: path.join(__dirname, 'sewing.png'),
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    log('Loading URL: http://localhost:5000');
    mainWindow.loadURL("http://localhost:5000");

    // Standard Minimize triggers Mini Mode
    mainWindow.on("minimize", (event) => {
      event.preventDefault();
      mainWindow.hide();
      createMiniWindow();
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      log(`Window failed to load: ${errorCode} - ${errorDescription}`);
    });

    mainWindow.webContents.on('did-finish-load', () => {
      log('Window finished loading');
    });

    log('Main window created successfully');
  } catch (error) {
    log(`Error creating window: ${error.message}`);
    log(`Error stack: ${error.stack}`);
  }
}

function createMiniWindow() {
  if (miniWindow) return;

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  miniWindow = new BrowserWindow({
    width: 250,
    height: 120,
    x: screenWidth - 270,
    y: screenHeight - 140,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true, // Should be true by default, but being explicit
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  miniWindow.loadURL("http://localhost:5000?mode=mini");

  miniWindow.on("closed", () => {
    miniWindow = null;
  });
}

// IPC Listeners
ipcMain.on("restore-window", () => {
  if (miniWindow) {
    miniWindow.close();
  }
  if (mainWindow) {
    mainWindow.show();
    mainWindow.restore();
    mainWindow.setAlwaysOnTop(true);
  }
});

ipcMain.on("close-window", () => {
  if (mainWindow) mainWindow.close();
});

function startBackend() {
  return new Promise((resolve, reject) => {
    log('Starting backend...');

    // Priority 1: Check app.asar.unpacked (Correct way to run from built exe)
    // Priority 2: Check process.resourcesPath (Production)
    // Priority 3: Check development path
    const possiblePaths = [
      path.join(app.getAppPath().replace('app.asar', 'app.asar.unpacked'), "backend/server.js"),
      path.join(process.resourcesPath, "backend/server.js"),
      path.join(process.resourcesPath, "app/backend/server.js"),
      path.join(__dirname, "../backend/server.js"),
      path.join(app.getAppPath(), "backend/server.js"),
    ];

    log(`Checking for backend in these locations:`);
    possiblePaths.forEach(p => {
      const exists = fs.existsSync(p);
      log(`  ${p} - ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    });

    const serverPath = possiblePaths.find(p => fs.existsSync(p));

    if (!serverPath) {
      const error = 'Backend server.js not found in any expected location';
      log(error);
      reject(new Error(error));
      return;
    }

    log(`Using backend path: ${serverPath}`);

    try {
      // Use process.execPath (internal Electron Node.js) to run the backend
      const nodePath = process.execPath;

      log(`Spawning backend with Electron's Node: ${nodePath}`);

      backendProcess = spawn(nodePath, [serverPath], {
        stdio: "pipe",
        shell: false, // Use false to avoid overhead and escaping issues
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: "1" // This is CRITICAL to run server.js with internal node
        }
      });

      log(`Backend process spawned with PID: ${backendProcess.pid}`);

      backendProcess.stdout.on("data", (data) => {
        const msg = data.toString().trim();
        log(`[Backend STDOUT] ${msg}`);

        if (msg.includes("Backend running") || msg.includes("http://0.0.0.0:5000")) {
          log('Backend ready signal received');
          resolve();
        }
      });

      backendProcess.stderr.on("data", (data) => {
        const msg = data.toString().trim();
        log(`[Backend STDERR] ${msg}`);
      });

      backendProcess.on("error", (error) => {
        log(`[Backend ERROR Event] ${error.message}`);
        log(`[Backend ERROR Stack] ${error.stack}`);
        reject(error);
      });

      backendProcess.on("close", (code, signal) => {
        log(`Backend process exited with code ${code} and signal ${signal}`);
      });

      // Timeout if backend doesn't start in 10 seconds
      setTimeout(() => {
        if (backendProcess && !backendProcess.killed) {
          log('Backend timeout - assuming ready');
          resolve();
        }
      }, 10000);

    } catch (error) {
      log(`Exception starting backend: ${error.message}`);
      log(`Exception stack: ${error.stack}`);
      reject(error);
    }
  });
}

app.on("ready", async () => {
  log('App ready event fired');
  try {
    await startBackend();
    log('Backend started successfully');
    createWindow();
    checkForUpdates();
  } catch (err) {
    log(`Failed to start: ${err.message}`);
    log(`Error stack: ${err.stack}`);

    // Show error dialog to user
    const { dialog } = await import('electron');
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start application. Check log file at:\n${logPath}\n\nError: ${err.message}`
    );

    app.quit();
  }
});

app.on("window-all-closed", () => {
  log('All windows closed');
  if (process.platform !== "darwin") {
    log('Quitting app');
    app.quit();
  }
});

app.on("before-quit", () => {
  log('App before-quit event');
  if (backendProcess) {
    log('Killing backend process');
    backendProcess.kill();
  }
  logStream.end();
});

/* ===================== AUTO UPDATER ===================== */
autoUpdater.logger = {
  info: (m) => log(`[Updater INFO] ${m}`),
  warn: (m) => log(`[Updater WARN] ${m}`),
  error: (m) => log(`[Updater ERROR] ${m}`)
};

autoUpdater.on("checking-for-update", () => {
  log("Checking for update...");
});

autoUpdater.on("update-available", (info) => {
  log(`Update available: ${info.version}`);
});

autoUpdater.on("update-not-available", (info) => {
  log("Update not available.");
});

autoUpdater.on("error", (err) => {
  log(`Error in auto-updater: ${err}`);
});

autoUpdater.on("download-progress", (progressObj) => {
  log(`Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
});

autoUpdater.on("update-downloaded", (info) => {
  log("Update downloaded; will install on quit");
  // Optional: auto-install immediately
  // autoUpdater.quitAndInstall();
});

function checkForUpdates() {
  log("Initializing auto-updater check...");
  autoUpdater.checkForUpdatesAndNotify();
}

app.on("activate", () => {
  log('App activate event');
  if (mainWindow === null) createWindow();
});

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`);
  log(`Stack: ${error.stack}`);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}`);
  log(`Reason: ${reason}`);
});

log('Main script loaded');