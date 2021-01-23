const { app, BrowserWindow } = require('electron');
require('./index.js');

async function main() {
    app.whenReady().then(() => {
        createWindow()
    
        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow()
        })
    });

    // for Mac
    app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') app.quit()
    });
}

async function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600
    })
    mainWindow.loadURL(`http://localhost:3000/`);

    // Open the DevTools.
    mainWindow.webContents.openDevTools()
}

main().then();

