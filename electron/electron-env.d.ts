import { ElectronAPI } from '@electron-toolkit/preload'
import { type Logger } from 'electron-log'
import type { AgentConfig, AgentInstance, AgentMessage, AgentsConfig, AgentStderr } from '../src/lib/types'

interface AcpHostApi {
  getConfig(): Promise<AgentsConfig>
  reloadConfig(): Promise<AgentsConfig>
  getConfigPath(): Promise<string>
  addAgent(name: string, config: AgentConfig): Promise<AgentsConfig>
  updateAgent(name: string, config: AgentConfig): Promise<AgentsConfig>
  removeAgent(name: string): Promise<AgentsConfig>
  spawnAgent(name: string): Promise<AgentInstance>
  sendToAgent(agentId: string, message: string): Promise<void>
  killAgent(agentId: string): Promise<void>
  listRunningAgents(): Promise<string[]>
  getMachineId(): Promise<string>
  getAppVersion(): Promise<string>
  pickFolder(title?: string): Promise<string | null>
  readTextFile(filePath: string): Promise<string>
  writeTextFile(filePath: string, content: string): Promise<void>
  loadStore(name: string): Promise<Record<string, unknown>>
  saveStore(name: string, data: Record<string, unknown>): Promise<void>
  onAgentMessage(callback: (payload: AgentMessage) => void): () => void
  onAgentClosed(callback: (payload: string) => void): () => void
  onAgentStderr(callback: (payload: AgentStderr) => void): () => void
  onConfigChanged(callback: (payload: AgentsConfig) => void): () => void
}

declare namespace NodeJS {
  interface ProcessEnv {
  }
}

declare global {
  interface Window {
    electron: ElectronAPI,
    acpHost: AcpHostApi,
    __electronLog: Logger & {
      sendToMain:any
    }
  }
}
