import { app, dialog } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

export async function getMachineId(): Promise<string> {
  return `${os.hostname()}-${os.userInfo().username}`
}

export function getAppVersion(): string {
  return app.getVersion()
}

export async function pickFolder(title?: string): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: title ?? 'Select Folder',
    properties: ['openDirectory'],
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return result.filePaths[0]
}

export async function readTextFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf8')
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf8')
}
