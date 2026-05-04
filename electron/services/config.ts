import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { EventEmitter } from 'node:events'
import type { AgentConfig, AgentsConfig } from './types'

function getDefaultAgents(): AgentsConfig {
  return {
    agents: {
      'GitHub Copilot': { command: 'npx', args: ['@github/copilot-language-server@latest', '--acp'], env: {} },
      'Claude Code': { command: 'npx', args: ['@zed-industries/claude-code-acp@latest'], env: {} },
      'Gemini CLI': { command: 'npx', args: ['@google/gemini-cli@latest', '--experimental-acp'], env: {} },
      'Qwen Code': { command: 'npx', args: ['@qwen-code/qwen-code@latest', '--acp', '--experimental-skills'], env: {} },
      'Auggie CLI': { command: 'npx', args: ['@augmentcode/auggie@latest', '--acp'], env: { AUGMENT_DISABLE_AUTO_UPDATE: '1' } },
      'Qoder CLI': { command: 'npx', args: ['@qoder-ai/qodercli@latest', '--acp'], env: {} },
      'Codex CLI': { command: 'npx', args: ['@zed-industries/codex-acp@latest'], env: {} },
      'OpenCode': { command: 'npx', args: ['opencode-ai@latest', 'acp'], env: {} },
      'OpenClaw': { command: 'npx', args: ['openclaw', 'acp'], env: {} },
    },
  }
}

function normalizeAgentConfig(input: AgentConfig): AgentConfig {
  const transport = input.transport ?? 'stdio'
  if (transport === 'stdio') {
    return {
      transport,
      command: input.command,
      args: input.args ?? [],
      env: input.env ?? {},
    }
  }

  return {
    transport,
    url: input.url,
    headers: input.headers && Object.keys(input.headers).length > 0 ? input.headers : undefined,
  }
}

export class ConfigService extends EventEmitter {
  private config: AgentsConfig = { agents: {} }
  private watcher: fs.FSWatcher | null = null
  private saveInFlight = false
  private reloadTimer: NodeJS.Timeout | null = null
  readonly configPath: string

  constructor() {
    super()
    const baseDir = process.platform === 'win32'
      ? process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming')
      : path.join(os.homedir(), '.config')
    this.configPath = path.join(baseDir, 'acp-ui', 'agents.json')
  }

  async init(): Promise<void> {
    await fsp.mkdir(path.dirname(this.configPath), { recursive: true })
    if (!fs.existsSync(this.configPath)) {
      this.config = getDefaultAgents()
      await this.save()
    } else {
      this.config = await this.readFromDisk()
    }
    this.setupWatcher()
  }

  getConfig(): AgentsConfig {
    return this.config
  }

  async reload(): Promise<AgentsConfig> {
    this.config = await this.readFromDisk()
    return this.config
  }

  getConfigPath(): string {
    return this.configPath
  }

  async addAgent(name: string, config: AgentConfig): Promise<AgentsConfig> {
    this.config = {
      agents: {
        ...this.config.agents,
        [name]: normalizeAgentConfig(config),
      },
    }
    await this.save()
    return this.config
  }

  async removeAgent(name: string): Promise<AgentsConfig> {
    const nextAgents = { ...this.config.agents }
    delete nextAgents[name]
    this.config = { agents: nextAgents }
    await this.save()
    return this.config
  }

  async updateAgent(name: string, config: AgentConfig): Promise<AgentsConfig> {
    if (!this.config.agents[name]) {
      throw new Error(`Agent '${name}' not found`)
    }
    this.config = {
      agents: {
        ...this.config.agents,
        [name]: normalizeAgentConfig(config),
      },
    }
    await this.save()
    return this.config
  }

  private async save(): Promise<void> {
    this.saveInFlight = true
    try {
      await fsp.writeFile(this.configPath, JSON.stringify(this.config, null, 2), 'utf8')
    } finally {
      setTimeout(() => {
        this.saveInFlight = false
      }, 100)
    }
  }

  private async readFromDisk(): Promise<AgentsConfig> {
    const content = await fsp.readFile(this.configPath, 'utf8')
    const parsed = JSON.parse(content) as AgentsConfig
    return {
      agents: Object.fromEntries(
        Object.entries(parsed.agents ?? {}).map(([name, config]) => [name, normalizeAgentConfig(config)])
      ),
    }
  }

  private setupWatcher(): void {
    this.watcher?.close()
    this.watcher = fs.watch(path.dirname(this.configPath), async (_, fileName) => {
      const normalizedFileName = typeof fileName === 'string' ? fileName : ''
      if (normalizedFileName !== path.basename(this.configPath)) {
        return
      }
      if (this.saveInFlight) {
        return
      }
      if (this.reloadTimer) {
        clearTimeout(this.reloadTimer)
      }
      this.reloadTimer = setTimeout(async () => {
        try {
          this.config = await this.readFromDisk()
          this.emit('config-changed', this.config)
        } catch {
        }
      }, 100)
    })
  }
}
