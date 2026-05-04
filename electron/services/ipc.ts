import { BrowserWindow, ipcMain } from 'electron'
import type { AgentConfig, AgentMessage, AgentsConfig, AgentStderr } from './types'
import { ConfigService } from './config'
import { AgentService } from './agents'
import { StoreService } from './store'
import { getAppVersion, getMachineId, pickFolder, readTextFile, writeTextFile } from './system'

export interface MainServices {
  config: ConfigService
  agents: AgentService
  store: StoreService
}

function broadcast(channel: string, payload: unknown) {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, payload)
  }
}

export function registerIpcHandlers(services: MainServices): void {
  const { config, agents, store } = services

  ipcMain.handle('acp-host:get-config', () => config.getConfig())
  ipcMain.handle('acp-host:reload-config', () => config.reload())
  ipcMain.handle('acp-host:get-config-path', () => config.getConfigPath())
  ipcMain.handle('acp-host:add-agent', (_, name: string, agentConfig: AgentConfig) => config.addAgent(name, agentConfig))
  ipcMain.handle('acp-host:update-agent', (_, name: string, agentConfig: AgentConfig) => config.updateAgent(name, agentConfig))
  ipcMain.handle('acp-host:remove-agent', (_, name: string) => config.removeAgent(name))

  ipcMain.handle('acp-host:spawn-agent', (_, name: string) => {
    const currentConfig = config.getConfig()
    const agentConfig = currentConfig.agents[name]
    if (!agentConfig) {
      throw new Error(`Agent '${name}' not found in config`)
    }
    return agents.spawnAgent(name, agentConfig)
  })
  ipcMain.handle('acp-host:send-to-agent', (_, agentId: string, message: string) => agents.sendMessage(agentId, message))
  ipcMain.handle('acp-host:kill-agent', (_, agentId: string) => agents.killAgent(agentId))
  ipcMain.handle('acp-host:list-running-agents', () => agents.listRunningAgents())

  ipcMain.handle('acp-host:get-machine-id', () => getMachineId())
  ipcMain.handle('acp-host:get-app-version', () => getAppVersion())
  ipcMain.handle('acp-host:pick-folder', (_, title?: string) => pickFolder(title))
  ipcMain.handle('acp-host:read-text-file', (_, filePath: string) => readTextFile(filePath))
  ipcMain.handle('acp-host:write-text-file', (_, filePath: string, content: string) => writeTextFile(filePath, content))

  ipcMain.handle('acp-host:store-load', (_, name: string) => store.load(name))
  ipcMain.handle('acp-host:store-save', (_, name: string, data: Record<string, unknown>) => store.save(name, data))

  config.on('config-changed', (payload: AgentsConfig) => broadcast('acp-host:config-changed', payload))
  agents.on('agent-message', (payload: AgentMessage) => broadcast('acp-host:agent-message', payload))
  agents.on('agent-stderr', (payload: AgentStderr) => broadcast('acp-host:agent-stderr', payload))
  agents.on('agent-closed', (payload: string) => broadcast('acp-host:agent-closed', payload))
}
