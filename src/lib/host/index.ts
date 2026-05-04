import type {
  AgentsConfig,
  AgentConfig,
  AgentInstance,
  AgentMessage,
  AgentStderr,
  AgentTransportKind,
} from '../types';
import { getTransportKind } from '../types';
import { isElectronHost, isDesktop } from '../platform';

export type Unlisten = () => void;

export interface RemoteAgentOptions {
  transport?: 'websocket' | 'http';
  url?: string;
  headers?: Record<string, string>;
}

const WEB_CONFIG_KEY = 'acp-ui:agents';
const WEB_CONFIG_PATH_LABEL = '(browser local storage)';

function loadWebConfig(): AgentsConfig {
  if (typeof localStorage === 'undefined') return { agents: {} };
  const raw = localStorage.getItem(WEB_CONFIG_KEY);
  if (!raw) return { agents: {} };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.agents) {
      return parsed as AgentsConfig;
    }
  } catch {
  }
  return { agents: {} };
}

function saveWebConfig(config: AgentsConfig): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(WEB_CONFIG_KEY, JSON.stringify(config));
}

function buildAgentConfig(
  command: string | null,
  args: string[],
  env: Record<string, string>,
  remote: RemoteAgentOptions
): AgentConfig {
  const transport: AgentTransportKind = remote.transport ?? 'stdio';

  if (transport === 'stdio') {
    if (!command?.trim()) {
      throw new Error('stdio agent requires a command');
    }

    return {
      transport,
      command,
      args,
      env,
    };
  }

  const url = remote.url?.trim();
  if (!url) throw new Error('remote agent requires a url');
  return {
    transport,
    url,
    headers: remote.headers && Object.keys(remote.headers).length > 0 ? remote.headers : undefined,
  };
}

export async function getConfig(): Promise<AgentsConfig> {
  if (isElectronHost()) {
    return window.acpHost.getConfig();
  }
  return loadWebConfig();
}

export async function reloadConfig(): Promise<AgentsConfig> {
  if (isElectronHost()) {
    return window.acpHost.reloadConfig();
  }
  return loadWebConfig();
}

export async function getConfigPath(): Promise<string> {
  if (isElectronHost()) {
    return window.acpHost.getConfigPath();
  }
  return WEB_CONFIG_PATH_LABEL;
}

export async function addAgent(
  name: string,
  command: string | null,
  args: string[],
  env: Record<string, string> = {},
  remote: RemoteAgentOptions = {}
): Promise<AgentsConfig> {
  const config = buildAgentConfig(command, args, env, remote);
  if (isElectronHost()) {
    return window.acpHost.addAgent(name, config);
  }
  const current = loadWebConfig();
  current.agents[name] = config;
  saveWebConfig(current);
  return current;
}

export async function updateAgent(
  name: string,
  command: string | null,
  args: string[],
  env: Record<string, string> = {},
  remote: RemoteAgentOptions = {}
): Promise<AgentsConfig> {
  const config = buildAgentConfig(command, args, env, remote);
  if (isElectronHost()) {
    return window.acpHost.updateAgent(name, config);
  }
  const current = loadWebConfig();
  current.agents[name] = config;
  saveWebConfig(current);
  return current;
}

export async function removeAgent(name: string): Promise<AgentsConfig> {
  if (isElectronHost()) {
    return window.acpHost.removeAgent(name);
  }
  const current = loadWebConfig();
  delete current.agents[name];
  saveWebConfig(current);
  return current;
}

function throwNoStdio(): never {
  throw new Error('stdio agents are not supported on this platform');
}

export async function spawnAgent(name: string): Promise<AgentInstance> {
  if (isElectronHost()) {
    return window.acpHost.spawnAgent(name);
  }
  throwNoStdio();
}

export async function sendToAgent(agentId: string, message: string): Promise<void> {
  if (isElectronHost()) {
    return window.acpHost.sendToAgent(agentId, message);
  }
  throwNoStdio();
}

export async function killAgent(agentId: string): Promise<void> {
  if (isElectronHost()) {
    return window.acpHost.killAgent(agentId);
  }
  throwNoStdio();
}

export async function listRunningAgents(): Promise<string[]> {
  if (isElectronHost()) {
    return window.acpHost.listRunningAgents();
  }
  return [];
}

export async function onAgentMessage(
  callback: (message: AgentMessage) => void
): Promise<Unlisten> {
  if (isElectronHost()) {
    return window.acpHost.onAgentMessage((payload) => callback(payload as AgentMessage));
  }
  return () => {};
}

export async function onAgentClosed(
  callback: (agentId: string) => void
): Promise<Unlisten> {
  if (isElectronHost()) {
    return window.acpHost.onAgentClosed((payload) => callback(payload as string));
  }
  return () => {};
}

export async function onAgentStderr(
  callback: (stderr: AgentStderr) => void
): Promise<Unlisten> {
  if (isElectronHost()) {
    return window.acpHost.onAgentStderr((payload) => callback(payload as AgentStderr));
  }
  return () => {};
}

export async function onConfigChanged(
  callback: (config: AgentsConfig) => void
): Promise<Unlisten> {
  if (isElectronHost()) {
    return window.acpHost.onConfigChanged((payload) => callback(payload as AgentsConfig));
  }
  void callback;
  return () => {};
}

export async function getMachineId(): Promise<string> {
  if (!isElectronHost()) {
    throw new Error('machine id is not available on this platform');
  }
  return window.acpHost.getMachineId();
}

const FALLBACK_VERSION = '0.0.0-web';

export async function getAppVersion(): Promise<string> {
  if (isElectronHost()) {
    return window.acpHost.getAppVersion();
  }
  const v = (import.meta.env as Record<string, string | undefined>).VITE_APP_VERSION;
  return v ?? FALLBACK_VERSION;
}

export function canPickFolder(): boolean {
  return isDesktop();
}

export async function pickFolder(title?: string): Promise<string | null> {
  if (isElectronHost()) {
    return window.acpHost.pickFolder(title);
  }
  return null;
}

export async function readTextFile(path: string): Promise<string> {
  if (!isElectronHost()) {
    throw new Error('readTextFile is not supported on this platform');
  }
  return window.acpHost.readTextFile(path);
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  if (!isElectronHost()) {
    throw new Error('writeTextFile is not supported on this platform');
  }
  await window.acpHost.writeTextFile(path, content);
}

export { loadKvStore } from './storage';
export type { KVStore } from './storage';
export { getTransportKind };
