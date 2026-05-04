import { isElectronHost, isDesktop } from '../platform';

export interface KVStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  save(): Promise<void>;
}

class WebKVStore implements KVStore {
  private readonly storageKey: string;
  private data: Record<string, unknown>;

  constructor(name: string) {
    this.storageKey = `acp-ui:${name}`;
    this.data = {};
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        try {
          this.data = JSON.parse(raw) ?? {};
        } catch {
          this.data = {};
        }
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const v = this.data[key];
    return v === undefined ? null : (v as T);
  }

  async set(key: string, value: unknown): Promise<void> {
    this.data[key] = value;
  }

  async save(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }
}

class ElectronKVStore implements KVStore {
  private readonly name: string;
  private data: Record<string, unknown>;

  constructor(name: string, data: Record<string, unknown>) {
    this.name = name;
    this.data = data;
  }

  async get<T>(key: string): Promise<T | null> {
    const v = this.data[key];
    return v === undefined ? null : (v as T);
  }

  async set(key: string, value: unknown): Promise<void> {
    this.data[key] = value;
  }

  async save(): Promise<void> {
    await window.acpHost.saveStore(this.name, this.data);
  }
}

export async function loadKvStore(name: string): Promise<KVStore> {
  if (isElectronHost()) {
    const data = await window.acpHost.loadStore(name);
    return new ElectronKVStore(name, data);
  }
  void isDesktop;
  return new WebKVStore(name);
}
