# electron-acp-ui

一个基于 Electron 和 Vue 3 构建的桌面端 ACP 客户端。

本项目是 [`acp-ui`](https://github.com/formulahendry/acp-ui) 的 Electron 重写版本，专注于桌面工作流：启动本地 ACP 代理、管理会话、审批权限，以及通过原生桌面外壳与编码代理进行对话。

## 关于本项目

`electron-acp-ui` 保持了原始 `acp-ui` 的核心目标：为 ACP 兼容代理提供统一的 UI。不同之处在于，本仓库使用 **Electron + Vue 3** 实现，当前代码库以桌面应用体验为中心，而非 Tauri、Web 或移动端目标。

如果您正在寻找原始的多平台项目，请参阅上游 `acp-ui` 仓库。如果您想要一个适合 Electron 工作流和打包、专注于桌面的重写版本，本仓库就是那个版本。

## 功能特性

基于本仓库当前实现：

- 从桌面 UI 连接 ACP 兼容代理
- 从应用启动本地 stdio 代理
- 通过 `agents.json` 支持代理配置
- 创建和恢复已保存的会话
- 显示流式聊天消息和代理思考输出
- 在对话过程中展示工具调用
- 审批或拒绝来自代理的权限请求
- 处理代理身份验证方法选择
- 在设置面板中切换和管理代理
- 通过内置流量监视器检查流量
- 持久化本地偏好设置和会话历史
- 当 `agents.json` 变更时热重载代理配置
- 为可恢复会话尝试自动重连

## 默认代理

当前默认生成的配置包括：

- `OpenCode` → `opencode acp`

此默认配置创建于 `electron/services/config.ts:8`。

## 配置

代理配置存储于：

- **Windows**: `%APPDATA%\electron-acp-ui\agents.json`

路径定义于 `electron/services/config.ts:52`。

示例配置：

```json
{
  "agents": {
    "OpenCode": {
      "transport": "stdio",
      "command": "opencode",
      "args": ["acp"],
      "env": {}
    }
  }
}
```

您也可以从应用内的**设置**面板添加或编辑代理。

通过配置使用 `websocket` 或 `http` 传输协议也支持远程代理：

```json
{
  "agents": {
    "Remote Agent": {
      "transport": "websocket",
      "url": "ws://127.0.0.1:3000",
      "headers": {
        "Authorization": "Bearer <token>"
      }
    }
  }
}
```

## 使用方法

典型桌面工作流：

1. 启动应用
2. 选择一个代理
3. 选择或输入工作目录
4. 创建新会话
5. 与代理对话
6. 在提示时审批或拒绝权限请求
7. 在支持时从会话列表恢复之前的会话

当前代码库中的主要 UI 入口点：

- 渲染进程根组件：`src/App.vue:1`
- 渲染进程引导：`src/index.ts:1`
- Electron 主进程：`electron/main.ts:1`
- Electron 预加载桥接：`electron/preload.ts:1`

## 开发

### 前置条件

- Node.js
- pnpm
- 如果想要测试代理集成，需要本地可用的 ACP 代理命令

### 安装依赖

```bash
pnpm install
```

### 开发模式运行

同时启动渲染进程和 Electron：

```bash
pnpm dev
```

或分别运行：

```bash
pnpm dev:renderer
pnpm dev:main
```

开发脚本定义于 `package.json:5`。

## 类型检查

```bash
pnpm ts-check
```

这会运行 `vue-tsc --noEmit`。

## 构建

创建生产构建输出：

```bash
pnpm build
```

构建未打包的 Electron 输出：

```bash
pnpm build:dir
```

构建 Windows 安装程序/包：

```bash
pnpm build:win
```

构建脚本会在重新构建前清理 `dist/` 和 `dist-electron/` 目录。

## 项目结构

```text
src/                 Vue 渲染进程应用
electron/            Electron 主进程/预加载/服务
rsbuild.config.mts   多目标构建配置
parallel.config.ts   开发进程编排
```

重要入口文件：

- `src/index.ts`
- `src/App.vue`
- `electron/main.ts`
- `electron/preload.ts`

## 注意事项

- 本仓库是原始 `acp-ui` 的重写版本，而非逐行移植。
- 当前实现以桌面端为导向。
- 请勿假设原始项目的 Tauri、Web、Android 或 iOS 说明适用于此处。

## 许可证

MIT
