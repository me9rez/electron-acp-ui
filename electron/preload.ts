import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { AgentConfig } from './services/types'

const acpHost = {
  getConfig: () => ipcRenderer.invoke('acp-host:get-config'),
  reloadConfig: () => ipcRenderer.invoke('acp-host:reload-config'),
  getConfigPath: () => ipcRenderer.invoke('acp-host:get-config-path'),
  addAgent: (name: string, config: AgentConfig) => ipcRenderer.invoke('acp-host:add-agent', name, config),
  updateAgent: (name: string, config: AgentConfig) => ipcRenderer.invoke('acp-host:update-agent', name, config),
  removeAgent: (name: string) => ipcRenderer.invoke('acp-host:remove-agent', name),
  spawnAgent: (name: string) => ipcRenderer.invoke('acp-host:spawn-agent', name),
  sendToAgent: (agentId: string, message: string) => ipcRenderer.invoke('acp-host:send-to-agent', agentId, message),
  killAgent: (agentId: string) => ipcRenderer.invoke('acp-host:kill-agent', agentId),
  listRunningAgents: () => ipcRenderer.invoke('acp-host:list-running-agents'),
  getMachineId: () => ipcRenderer.invoke('acp-host:get-machine-id'),
  getAppVersion: () => ipcRenderer.invoke('acp-host:get-app-version'),
  pickFolder: (title?: string) => ipcRenderer.invoke('acp-host:pick-folder', title),
  readTextFile: (filePath: string) => ipcRenderer.invoke('acp-host:read-text-file', filePath),
  writeTextFile: (filePath: string, content: string) => ipcRenderer.invoke('acp-host:write-text-file', filePath, content),
  loadStore: (name: string) => ipcRenderer.invoke('acp-host:store-load', name),
  saveStore: (name: string, data: Record<string, unknown>) => ipcRenderer.invoke('acp-host:store-save', name, data),
  onAgentMessage: (callback: (payload: unknown) => void) => subscribe('acp-host:agent-message', callback),
  onAgentClosed: (callback: (payload: unknown) => void) => subscribe('acp-host:agent-closed', callback),
  onAgentStderr: (callback: (payload: unknown) => void) => subscribe('acp-host:agent-stderr', callback),
  onConfigChanged: (callback: (payload: unknown) => void) => subscribe('acp-host:config-changed', callback),
}

function subscribe(channel: string, callback: (payload: unknown) => void) {
  const listener = (_event: unknown, payload: unknown) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

contextBridge.exposeInMainWorld('electron', electronAPI)
contextBridge.exposeInMainWorld('acpHost', acpHost)
