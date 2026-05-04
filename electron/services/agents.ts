import { randomUUID } from 'node:crypto'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { EventEmitter } from 'node:events'
import type { AgentConfig, AgentInstance, AgentMessage, AgentStderr } from './types'

interface RunningAgent {
  child: ChildProcessWithoutNullStreams
}

function isWindows() {
  return process.platform === 'win32'
}

function validateStdioConfig(name: string, config: AgentConfig): { command: string, args: string[], env: Record<string, string> } {
  const transport = config.transport ?? 'stdio'
  if (transport !== 'stdio') {
    throw new Error(`Agent '${name}' uses '${transport}' transport which is not stdio; spawnAgent is stdio-only`)
  }

  const command = config.command?.trim()
  if (!command) {
    throw new Error(`stdio agent '${name}' is missing 'command'`)
  }

  return {
    command,
    args: config.args ?? [],
    env: config.env ?? {},
  }
}

export class AgentService extends EventEmitter {
  private readonly agents = new Map<string, RunningAgent>()

  spawnAgent(name: string, config: AgentConfig): AgentInstance {
    const { command, args, env } = validateStdioConfig(name, config)
    const agentId = randomUUID()

    const child = isWindows()
      ? spawn('cmd.exe', ['/C', command, ...args], {
          env: { ...process.env, ...env },
          stdio: 'pipe',
          windowsHide: true,
        })
      : spawn(command, args, {
          env: { ...process.env, ...env },
          stdio: 'pipe',
        })

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')

    let stdoutBuffer = ''
    let stderrBuffer = ''

    child.stdout.on('data', (chunk: string) => {
      stdoutBuffer += chunk
      const lines = stdoutBuffer.split(/\r?\n/)
      stdoutBuffer = lines.pop() ?? ''
      for (const line of lines) {
        const payload: AgentMessage = { agent_id: agentId, message: line }
        this.emit('agent-message', payload)
      }
    })

    child.stderr.on('data', (chunk: string) => {
      stderrBuffer += chunk
      const lines = stderrBuffer.split(/\r?\n/)
      stderrBuffer = lines.pop() ?? ''
      for (const line of lines) {
        const payload: AgentStderr = { agent_id: agentId, line }
        this.emit('agent-stderr', payload)
      }
    })

    child.on('error', (error) => {
      const payload: AgentStderr = { agent_id: agentId, line: `Process error: ${error.message}` }
      this.emit('agent-stderr', payload)
    })

    child.on('close', () => {
      if (stdoutBuffer) {
        const payload: AgentMessage = { agent_id: agentId, message: stdoutBuffer }
        this.emit('agent-message', payload)
      }
      if (stderrBuffer) {
        const payload: AgentStderr = { agent_id: agentId, line: stderrBuffer }
        this.emit('agent-stderr', payload)
      }
      this.agents.delete(agentId)
      this.emit('agent-closed', agentId)
    })

    this.agents.set(agentId, { child })

    return { id: agentId, name }
  }

  sendMessage(agentId: string, message: string): void {
    const agent = this.agents.get(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    agent.child.stdin.write(`${message}\n`)
  }

  killAgent(agentId: string): void {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return
    }

    this.agents.delete(agentId)
    agent.child.kill()
  }

  listRunningAgents(): string[] {
    return Array.from(this.agents.keys())
  }

  dispose(): void {
    for (const [agentId, agent] of this.agents.entries()) {
      this.agents.delete(agentId)
      if (!agent.child.killed) {
        agent.child.kill()
      }
    }
  }
}
