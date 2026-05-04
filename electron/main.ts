import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import log from 'electron-log/main'
import { APP_ROOT, MAIN_DIST, RENDERER_DIST } from './pathe'


async function createWindow(name: "home") {
  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(MAIN_DIST, './preload/preload.js'),
    },
    autoHideMenuBar: true,
    title: name
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  await loadPage(win, name)
}


async function loadPage(win: BrowserWindow, name: "home") {
  if (app.isPackaged) {
    await win.loadFile(path.join(RENDERER_DIST, "pages", `${name}.html`))
  } else {
    await win.loadURL(`http://localhost:3000/pages/${name}.html`)
    win.webContents.openDevTools()
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow("home")
  }
})

app.whenReady().then(async () => {
  handleIPC()
  await createWindow("home")
})


function handleIPC() {

}
