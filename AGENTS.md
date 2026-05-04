# AGENTS.md

- 本仓库是一个 Vue 3 + Electron 应用。
- 主应用入口为 `src/index.ts`；渲染进程组件根为 `src/App.vue`。
- Electron 入口为 `electron/main.ts` 和 `electron/preload.ts`；`tsconfig.json` 同时包含 `src` 和 `electron` 目录。
- 开发流程分为两部分：`pnpm dev:renderer` 运行 `rsbuild dev`，`pnpm dev:main` 运行 Electron，`pnpm dev` 通过 `parallel.config.ts` 中的 `parallel` 并行启动。
- `pnpm build` 在重新构建渲染进程前会先清理 `dist` 和 `dist-electron` 目录。
- 类型检查命令为 `pnpm ts-check`（`vue-tsc --noEmit`），可用于针对性验证。
- `build:dir` 和 `build:win` 封装了 `pnpm build` 及后续的 `electron-builder`，并设置了 `HTTPS_PROXY=http://127.0.0.1:7890`。
- `rsbuild.config.mts` 定义了三个环境：`web`、`electron-main` 和 `electron-preload`；`web` 将 HTML 写入 `template/index.html`，资源输出到 `dist/pages` 和 `dist/static`。
- `electron-main` 和 `electron-preload` 的构建产物写入 `dist-electron/<type>`，且禁用了 source map 和代码压缩。
- `dev` 模式会将构建产物写入磁盘，不要假设产物仅存在于内存中。
- 生成的输出文件不应纳入 git 管理：`dist/`、`dist-electron/` 和 `release/` 已被忽略。
- 除本文件外，仓库中不存在本地指令文件或 CI 工作流配置。
