import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'

export interface KVStoreRecord {
  [key: string]: unknown
}

export class StoreService {
  private readonly baseDir: string

  constructor() {
    this.baseDir = path.join(app.getPath('userData'), 'store')
  }

  private getStorePath(name: string): string {
    return path.join(this.baseDir, name)
  }

  async load(name: string): Promise<KVStoreRecord> {
    const filePath = this.getStorePath(name)
    try {
      const content = await fs.readFile(filePath, 'utf8')
      const parsed = JSON.parse(content)
      return parsed && typeof parsed === 'object' ? parsed as KVStoreRecord : {}
    } catch {
      return {}
    }
  }

  async save(name: string, data: KVStoreRecord): Promise<void> {
    const filePath = this.getStorePath(name)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
  }
}
