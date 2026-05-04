# ACP UI Electron 重写计划

## 目标

将 `D:\Code\Github Repo\acp-ui` 的 Tauri 应用以 Electron 框架在当前仓库中重写实现，优先采用“保留现有 Vue/Pinia 前端，替换 Tauri/Rust 宿主层”的迁移策略。

## 总体策略

- 复用 `acp-ui` 现有前端应用结构、Vue 组件、Pinia stores、ACP 协议桥接逻辑。
- 将所有 Tauri / Rust 宿主能力重写到 Electron `main` / `preload` / Node 服务层。
- 尽量保持前端调用接口不变，优先在 `src/lib/host/*` 层做兼容替换，降低 UI 和业务逻辑改动范围。
- 分阶段落地：先打通主链路，再补齐增强能力与细节兼容。

## 逐文件实施清单

### 1. `electron/main.ts`

**职责**
- 继续负责 Electron 应用启动、窗口创建、页面加载。
- 增加宿主服务初始化。
- 注册所有 `ipcMain.handle` / 事件桥接逻辑。

**需要实现/迁移的内容**
- 对齐 `acp-ui/src-tauri/src/lib.rs` 中的命令接口：
  - `get_config`
  - `reload_config`
  - `get_config_path`
  - `spawn_agent`
  - `send_to_agent`
  - `kill_agent`
  - `list_running_agents`
  - `add_agent`
  - `remove_agent`
  - `update_agent`
  - `get_machine_id`
- 初始化配置服务、Agent 进程服务、应用级事件分发。
- 将主进程事件转发给渲染进程，事件名尽量保持与现有前端兼容：
  - `agent-message`
  - `agent-closed`
  - `agent-stderr`
  - `config-changed`

**验证点**
- 应用启动后窗口正常打开。
- IPC handlers 注册成功。
- 渲染进程能收到主进程主动事件。

---

### 2. `electron/preload.ts`

**职责**
- 暴露安全、受限的 Electron Host API 给渲染进程。
- 隔离 Node / Electron 原生能力，避免渲染进程直接访问高权限 API。

**需要实现/迁移的内容**
- 定义如 `window.acpHost` 的桥接对象。
- 暴露以下接口：
  - 配置相关：
    - `getConfig`
    - `reloadConfig`
    - `getConfigPath`
    - `addAgent`
    - `updateAgent`
    - `removeAgent`
    - `onConfigChanged`
  - Agent 生命周期：
    - `spawnAgent`
    - `sendToAgent`
    - `killAgent`
    - `listRunningAgents`
    - `onAgentMessage`
    - `onAgentClosed`
    - `onAgentStderr`
  - 系统能力：
    - `getMachineId`
    - `getAppVersion`
    - `pickFolder`
    - `readTextFile`
    - `writeTextFile`
  - 本地存储能力：
    - `loadKvStore` 或等价抽象接口
- 提供事件订阅与取消订阅机制。

**验证点**
- 渲染进程中能通过 `window` 安全调用所有宿主接口。
- 事件监听可注册、触发、释放。

---

### 3. `electron/services/config.ts`（新增）

**职责**
- 重写 `acp-ui/src-tauri/src/config.rs` 的配置管理逻辑。
- 管理 `agents.json` 的读取、写入、默认生成、热更新监听。

**需要实现/迁移的内容**
- 定义 `AgentTransport`、`AgentConfig`、`AgentsConfig` 对应的数据结构。
- 保留历史配置路径语义，优先延续桌面端配置位置：
  - Windows: `%APPDATA%/acp-ui/agents.json`
  - macOS/Linux: 对应 `dirs.configDir()/acp-ui/agents.json`
- 实现：
  - `getConfig()`
  - `reload()`
  - `getConfigPath()`
  - `save()`
  - `addAgent()`
  - `removeAgent()`
  - `updateAgent()`
- 创建默认 9 个 stdio agents。
- 增加文件监听，在外部修改配置文件时触发 `config-changed` 事件。

**验证点**
- 首次运行时可生成默认配置。
- 修改配置后能持久化到磁盘。
- 手动编辑配置文件后前端可热更新。

---

### 4. `electron/services/agents.ts`（新增）

**职责**
- 重写 `acp-ui/src-tauri/src/agent.rs` 的本地 stdio agent 管理逻辑。
- 负责进程启动、消息收发、stderr 采集、退出清理。

**需要实现/迁移的内容**
- 使用 Node `child_process.spawn` 实现 stdio agent 启动。
- 保留按 transport 类型区分行为：
  - `stdio` 由 Electron main 管理
  - `websocket` / `http` 继续由前端 transport 处理
- 维护运行中 agent 映射表。
- 实现：
  - `spawnAgent()`
  - `sendMessage()`
  - `killAgent()`
  - `listRunningAgents()`
- 向渲染进程广播：
  - stdout 行消息 → `agent-message`
  - stderr 行消息 → `agent-stderr`
  - 进程退出 → `agent-closed`
- Windows 下兼容 `npx`/`.cmd` 启动场景。
- 非 Windows 平台兼容 shell 命令与参数传递。

**验证点**
- 本地 agent 可成功启动。
- 前端可收到 stdout/stderr。
- 关闭会话后进程能被正确杀掉。

---

### 5. `electron/services/store.ts`（新增）

**职责**
- 替代 Tauri plugin-store，为前端提供与现有 `KVStore` 接口兼容的持久化能力。

**需要实现/迁移的内容**
- 提供 `get` / `set` / `save` 接口。
- 存储形式可采用：
  - JSON 文件
  - 或 `electron-store` 风格封装
- 存储路径需要稳定，适用于 sessions / preferences 等前端状态持久化。

**验证点**
- 会话列表关闭应用后仍可恢复。
- 读写不存在 schema 破坏性变化。

---

### 6. `electron/services/system.ts`（新增）

**职责**
- 聚合系统级能力：机器 ID、应用版本、文件读写、文件夹选择等。

**需要实现/迁移的内容**
- `getMachineId()`
- `getAppVersion()`
- `pickFolder()`
- `readTextFile()`
- `writeTextFile()`
- 使用 Electron / Node 原生 API 实现。

**验证点**
- 设置页可正确选取目录。
- ACP `fs/*` RPC 能正常访问本地文件。
- 版本号在 UI 中显示正确。

---

### 7. `electron/services/ipc.ts`（新增，可选）

**职责**
- 统一管理 IPC channel 常量、handler 注册、事件广播，减少 `main.ts` 体积。

**需要实现/迁移的内容**
- 抽离 channel 常量。
- 将 handler 注册逻辑从 `main.ts` 拆出。
- 封装事件广播给所有窗口或目标窗口的逻辑。

**验证点**
- 所有主进程 IPC 注册集中可维护。
- `main.ts` 保持精简。

---

### 8. `src/lib/platform.ts`

**职责**
- 替换 Tauri 平台判断为 Electron / Web 平台判断。

**需要实现/迁移的内容**
- 新增或重构：
  - `isElectronHost()`
  - `isDesktopHost()`
- 调整以下判断逻辑：
  - `restrictedTransports()`
  - `hasLocalFs()`
- 保证 Electron 下：
  - 支持 stdio agents
  - 支持本地文件系统
- 保证纯 Web fallback 下：
  - 只支持 remote agents
  - 不暴露本地 fs 能力

**验证点**
- Electron 环境中 UI 不再错误隐藏 stdio agents。
- Web fallback 下仍可运行远程 agent 模式。

---

### 9. `src/lib/host/index.ts`

**职责**
- 作为渲染进程统一宿主抽象层，继续保持前端其余模块对宿主实现无感知。

**需要实现/迁移的内容**
- 移除对 `@tauri-apps/api/*`、`@tauri-apps/plugin-*` 的动态导入依赖。
- 改为：
  - Electron 环境调用 `window.acpHost`
  - Web 环境保留当前 fallback 行为
- 维持函数签名尽可能不变：
  - `getConfig`
  - `reloadConfig`
  - `getConfigPath`
  - `addAgent`
  - `updateAgent`
  - `removeAgent`
  - `spawnAgent`
  - `sendToAgent`
  - `killAgent`
  - `listRunningAgents`
  - `onAgentMessage`
  - `onAgentClosed`
  - `onAgentStderr`
  - `onConfigChanged`
  - `getMachineId`
  - `getAppVersion`
  - `pickFolder`
  - `readTextFile`
  - `writeTextFile`
- 保持 `src/stores/config.ts`、`src/stores/session.ts` 调用点尽量零改动或极小改动。

**验证点**
- Config store 能正常加载配置。
- Session store 能启动 agent 并建立 ACP 会话。

---

### 10. `src/lib/host/storage.ts`

**职责**
- 继续提供 `KVStore` 抽象，替换 Tauri plugin-store 后端。

**需要实现/迁移的内容**
- 将当前 Tauri 分支替换为 Electron 分支。
- 保留 web 的 `localStorage` fallback。
- 保持 `loadKvStore(name)` 和 `KVStore` 接口不变：
  - `get`
  - `set`
  - `save`

**验证点**
- `src/stores/session.ts` 的 session 持久化逻辑无需重写即可运行。
- Electron 关闭重开后历史会话仍在。

---

### 11. `src/index.ts`

**职责**
- 替换当前最小示例入口，承载迁移后的前端应用启动逻辑。

**需要实现/迁移的内容**
- 对齐 `acp-ui/src/main.ts` 的 Vue 启动流程。
- 挂载 Pinia、必要插件与根组件。

**验证点**
- 应用启动后进入真实 ACP UI，而不是当前 hello world 页面。

---

### 12. `src/App.vue`

**职责**
- 承载 ACP UI 的根组件。

**需要实现/迁移的内容**
- 用 `acp-ui/src/App.vue` 替换当前示例页面。
- 确保依赖的子组件、stores、样式一并可用。

**验证点**
- 主界面、会话列表、设置页、对话视图均可正常显示。

---

### 13. `src/components/*`

**职责**
- 复用现有前端视图组件。

**需要实现/迁移的内容**
- 迁移 `acp-ui/src/components/*` 下的主要界面组件。
- 仅在宿主能力变化影响时做最小兼容修改。
- 优先检查这些组件涉及的宿主调用：
  - `SettingsView.vue`
  - `ChatView.vue`
  - `SessionList.vue`
  - `TrafficMonitor.vue`
  - `PermissionDialog.vue`
  - `AuthMethodDialog.vue`
  - `StartupProgress.vue`

**验证点**
- UI 行为与 Tauri 版一致。
- 不因宿主 API 改造出现交互回归。

---

### 14. `src/stores/config.ts`

**职责**
- 管理 agent 配置及热更新。

**需要实现/迁移的内容**
- 保持现有逻辑为主。
- 验证以下调用仍成立：
  - `getConfig()`
  - `reloadConfig()`
  - `getConfigPath()`
  - `onConfigChanged()`
- 如有需要，仅调整错误处理或 Electron/Web 平台兼容细节。

**验证点**
- 配置列表正常展示。
- 外部修改 `agents.json` 后 UI 自动刷新。

---

### 15. `src/stores/session.ts`

**职责**
- 管理 ACP session 生命周期、会话持久化、连接状态。

**需要实现/迁移的内容**
- 保持 `createSession()` 主流程尽量不变。
- 验证以下依赖路径在 Electron 下成立：
  - `spawnAgent()`
  - `killAgent()`
  - `onAgentStderr()`
  - `loadKvStore()`
  - `getAppVersion()`
- 保持 stdio agent 的启动进度、stderr 监听、异常断连处理逻辑。

**验证点**
- 可创建本地 stdio 会话。
- 可恢复已保存会话。
- 连接取消、断开、重连行为正常。

---

### 16. `src/lib/acp-bridge.ts`

**职责**
- 继续作为 ACP SDK 与 transport/host 之间的桥。

**需要实现/迁移的内容**
- 尽量不改动其协议桥逻辑。
- 确保本地文件 RPC 使用新的 host API：
  - `readTextFile`
  - `writeTextFile`
- 确认 `hasLocalFs()` 的平台判断在 Electron 下正确。

**验证点**
- ACP `fs/read_text_file` 与 `fs/write_text_file` 请求在 Electron 下可正常工作。

---

### 17. `package.json`

**职责**
- 提供 Electron 版依赖与脚本。

**需要实现/迁移的内容**
- 从 `acp-ui/package.json` 补齐前端依赖：
  - `pinia`
  - `@agentclientprotocol/sdk`
  - `marked`
  - 以及实际使用到的其余前端包
- 清理不再需要的 Tauri 相关依赖。
- 保留并必要时扩展：
  - `dev`
  - `dev:renderer`
  - `dev:main`
  - `ts-check`
  - `build`
- 后续如新增 lint 命令，也应写入这里。

**验证点**
- 依赖安装无冲突。
- `pnpm ts-check` 可用于类型检查。
- `pnpm build` 能产出 Electron 应用构建结果。

---

### 18. `rsbuild.config.mts`

**职责**
- 支持 Electron 主进程、preload、renderer 三端构建。

**需要实现/迁移的内容**
- 保持当前多环境构建模式。
- 确保 renderer 入口适配迁移后的前端入口。
- 如前端需要额外静态资源或环境变量注入，补充相应配置。

**验证点**
- 开发模式下 renderer/main/preload 均可构建输出。
- 打包模式下页面与 Electron 入口均可正常加载。

## 分阶段落地顺序

### 第一阶段：打通最小可运行链路
- 迁移前端入口与核心 UI。
- 实现 Electron host API 基础框架。
- 完成配置读取、agent 启停、消息收发。
- 确保 ACP 会话可成功建立。

### 第二阶段：补齐本地能力
- 实现文件读写。
- 实现 folder picker。
- 实现 app version / machine id。
- 实现 session store 持久化。

### 第三阶段：补齐兼容细节
- 配置热更新 watcher。
- 恢复运行中 agent 状态处理。
- 错误边界、平台细节、跨平台兼容。

## 第一阶段成功标准

满足以下条件即可认为 Electron 重写链路已打通：

- 应用能启动并显示 ACP UI。
- 能加载并展示 `agents.json`。
- 能启动一个本地 stdio agent。
- 能接收并发送 ACP 消息。
- 能正常结束 agent 会话。

## 后续建议

在实际开始编码前，可进一步把以上内容细化为：
- 文件级任务顺序
- 每步修改目标
- 每步验证命令
- 最小提交粒度
