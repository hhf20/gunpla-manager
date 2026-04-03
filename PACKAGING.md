# 打包 / 发版指南（必读）

> 目的：把“如何打包”的流程固化在项目里。以后**每次需要打包**，都应先阅读本文件，再执行对应命令。

## 适用范围

- 本项目为 **Vite + React + Electron** 桌面端。
- Windows 安装包使用 **electron-builder（NSIS）** 生成。

## 打包前检查

- **Node / npm**：确保已安装并可用（建议使用你机器当前环境）。
- **依赖**：首次或依赖变动后先执行 `npm install`。
- **环境变量**：若功能依赖 Supabase，请参考 `.env.example` 在本地准备 `.env`（打包不一定强制需要，但运行时可能需要）。

## 常用命令（以项目根目录为工作目录）

### 开发调试

- 启动前端开发服务：

```bash
npm run dev
```

- 启动 Electron（使用已构建/开发资源，按项目脚本为准）：

```bash
npm run electron
```

### 仅构建前端产物（生成 `dist/`）

```bash
npm run build
```

构建完成后会生成：

- `dist/`：前端静态资源（electron-builder 会把它打进安装包）

### Windows 安装包（推荐）

```bash
npm run dist:win
```

该命令会做两步：

1. `npm run build`（生成 `dist/`）
2. `electron-builder --win nsis`（打出 NSIS 安装包）

产物默认输出到（见 `package.json` 的 `build.directories.output`）：

- `release/`
  - `Gunpla Manager Setup <version>.exe`
  - `Gunpla Manager Setup <version>.exe.blockmap`
  - `win-unpacked/`（未打包目录，可用于排查）

## 客户端更新（GitHub Releases + 点击按钮检查更新）

本项目桌面端已接入 **GitHub Releases** 更新源（通过 `electron-updater`）。用户在客户端点击“检查更新”后会：

- 检查 GitHub Release 是否有新版本
- 若有新版本则自动下载
- 下载完成后显示“立即安装”，点击后重启生效

### 你需要准备什么

- 一个 GitHub 仓库（用来托管源码与 Releases）：见 [GitHub](https://github.com/)
- 每次发版都要有一个 **Release**，并上传由 electron-builder 生成的更新相关文件（安装包与元数据）

### 发版（发布到 GitHub Release）的推荐方式

> 本项目采用“**做法 1：不再推送源码，只发 Release 附件**”。

1. 更新 `package.json` 的 `version`（这会影响更新比较与安装包文件名）
   - 同步维护 `src/data/changelog.js`（用户可见更新日志）
2. 打包 Windows 安装包：

```bash
npm run dist:win
```

3. 打包成功后，确认 `release/` 中生成了：
   - `Gunpla Manager Setup <version>.exe`
   - `Gunpla Manager Setup <version>.exe.blockmap`
   - `latest.yml`
4. 在 GitHub 创建一个与版本一致的 Release（tag 建议用 `v<version>`，例如 `v2.0.5`）
5. 在该 Release 的附件（Assets）里上传上面的 3 个文件：

- `Gunpla Manager Setup <version>.exe`
- `Gunpla Manager Setup <version>.exe.blockmap`
- `latest.yml`

> 注意：不要把 `release/` 目录提交到 git（本项目已在 `.gitignore` 忽略）。Release 附件才是给用户更新用的发布物。

## 每次打包时的“执行约定”（避免反复踩坑）

当你让我“重新打包”时，应按如下顺序执行并在输出中确认关键点：

1. **确认版本号**：查看 `package.json` 的 `version`（安装包文件名会带版本号）。
2. **执行打包命令**：优先使用 `npm run dist:win`（不要手打 electron-builder 参数，避免遗漏）。
3. **确认产物**：检查 `release/` 下是否生成了对应版本的 `Setup <version>.exe`。
4. **如果失败**：优先从 electron-builder 输出定位（常见是签名、图标、原生依赖 rebuild、路径权限等）。

## 常见提示（非错误）

- `description/author is missed in the package.json`：不影响打包，只是元信息缺失提示。
- `default Electron icon is used`：不影响打包，只是未设置应用图标。
- Vite 提示 chunk 较大：不影响打包，只是性能/体积建议。

