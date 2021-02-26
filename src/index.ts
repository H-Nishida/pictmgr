const electron_app = require('electron');
const app = electron_app.app;
const BrowserWindow = electron_app.BrowserWindow;
const Main = require('./main.ts');

async function main() {
    console.info("Start pictmgr")
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
        nodeIntegration: false,
        width: 800,
        height: 600
    })
    mainWindow.loadURL(`http://localhost:${Main.getPortNumber()}/`);

    // Open the DevTools.
    //mainWindow.webContents.openDevTools()
}
//debugger;
main().then();


