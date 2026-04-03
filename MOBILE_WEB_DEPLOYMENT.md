# 移动端上线说明

移动端首版按 **GitHub Pages**（推荐）或 **Vercel + H5/PWA** 部署，不需要单独业务服务器。

## 一、GitHub Pages（默认，无自有域名）

仓库：`hhf20/gunpla-manager` 时，线上地址形如：

`https://hhf20.github.io/gunpla-manager/`

### 1. 仓库设置

1. GitHub 仓库 → **Settings** → **Pages** → **Build and deployment** → Source 选 **GitHub Actions**（不要选 Branch 直出 `dist`，除非你自建分支）。
2. 推送 `main` 后，工作流 [`.github/workflows/deploy-github-pages.yml`](.github/workflows/deploy-github-pages.yml) 会执行 `npm run build`，并带上 `VITE_BASE_PATH=/gunpla-manager/`（**须与仓库名一致**；若仓库改名，请同步改工作流里的该变量）。
3. 构建产物会复制一份 `404.html`（与 `index.html` 相同），便于非 Hash 路径下的兜底；本项目路由为 **HashRouter**，主路径仍以 `/#/`、`#/model/...` 为准。

### 2. 本地构建（模拟线上资源路径）

```powershell
cd C:\jlzxm\wj
$env:VITE_BASE_PATH="/gunpla-manager/"
cmd /c npm run build
```

预览：用 `npm run preview` 时需注意 `base` 与预览子路径一致，或直接推送到 GitHub 看 Actions 结果。

### 3. 桌面端环境变量

在 `.env` 或打包前环境中设置（与线上首页一致，**末尾建议带 /**）：

```env
VITE_MOBILE_WEB_URL=https://hhf20.github.io/gunpla-manager/
```

这样「移动端入口」「导出到移动端」提示会指向可打开地址。

---

## 二、Vercel（备选）

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`
- **不要**在 Vercel 设置 `VITE_BASE_PATH`（留空则构建为相对路径 `./`，适合 `*.vercel.app` 根路径）。

环境变量示例：

```bash
VITE_MOBILE_WEB_URL=https://your-project-name.vercel.app
```

---

## 三、环境变量说明

| 变量 | 含义 |
|------|------|
| `VITE_MOBILE_WEB_URL` | 手机端应打开的 **完整站点根 URL**，供桌面端按钮与导出提示使用。 |
| `VITE_BASE_PATH` | **仅** GitHub Pages 项目站构建时设为 `/仓库名/`；日常与 Electron **不要设置**。 |

---

## 四、用户使用方式

1. 在桌面端导出移动端数据包。
2. 手机浏览器打开 `VITE_MOBILE_WEB_URL` 对应站点。
3. 在移动端首页导入 JSON 数据包。
4. 可选：将网页添加到手机桌面（PWA）。

## 五、当前产品定位

- 移动端首版为只读浏览。
- 数据保存在手机浏览器本地。
- 不需要独立后端与登录。
