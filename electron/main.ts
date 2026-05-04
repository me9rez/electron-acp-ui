import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { MAIN_DIST, RENDERER_DIST } from './pathe'
import { ConfigService } from './services/config'
import { AgentService } from './services/agents'
import { StoreService } from './services/store'
import { registerIpcHandlers } from './services/ipc'

const services = {
  config: new ConfigService(),
  agents: new AgentService(),
  store: new StoreService(),
}

async function createWindow(name: 'home') {
  const win = new BrowserWindow({
    webPreferences: {
      preload: path.join(MAIN_DIST, './preload/preload.js'),
    },
    autoHideMenuBar: true,
    title: name,
  })

  await loadPage(win, name)
}

async function loadPage(win: BrowserWindow, name: 'home') {
  if (app.isPackaged) {
    await win.loadFile(path.join(RENDERER_DIST, 'pages', `${name}.html`))
  } else {
    await win.loadURL(`http://localhost:3000/pages/${name}.html`)
    win.webContents.openDevTools()
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow('home')
  }
})

app.on('before-quit', () => {
  services.agents.dispose()
})

app.whenReady().then(async () => {
  await services.config.init()
  registerIpcHandlers(services)
  await createWindow('home')
})
