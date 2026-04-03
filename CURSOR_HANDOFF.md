# 项目交接说明

## 1. 当前项目状态

- 项目名称：`金屋藏胶 / Gunpla Manager`
- 桌面端：`Electron + React + Vite`
- 移动端：`H5/PWA`，按 **GitHub Pages** 部署（`main` 推送触发 Actions）
- 当前移动端公开地址配置为：
  - `https://hhf20.github.io/gunpla-manager/`
- 当前仓库源码已推到 GitHub：
  - 分支：`main`
  - 最近一次推送提交：`e2a090d`

## 2. 最近已经完成的更新

### 桌面端

- 修复了安装版桌面端黑屏 / 白屏相关问题
- 恢复了桌面端入口加载稳定性
- 增加了“移动端入口”按钮
- 增加了“导出到移动端”引导
- 保留桌面端独立打包与 GitHub Release 发布流程

### 移动端

- 新增移动端首页、详情页、统计页、筛选抽屉
- 增加移动端 PWA 基础壳
- 增加 GitHub Pages 部署（`.github/workflows/deploy-github-pages.yml`）与可选 Vercel 配置：
  - `vercel.json`（备选）
  - `public/manifest.webmanifest`
  - `public/sw.js`
- 增加移动端地址配置能力：
  - `src/config/mobileWeb.js`
- 桌面端可通过 `VITE_MOBILE_WEB_URL` 打开移动端站点

### 发布约定

- `打包更新`：
  - 默认指桌面端打包并发布到 GitHub Release
- `本地更新`：
  - 默认指桌面端只打包本地安装包
- `更新移动端`：
  - 默认指把源码推到 `main`，触发 **GitHub Actions** 重新部署 Pages

## 3. 当前仍需继续处理的重点

### A. 移动端图片显示

当前问题：

- 线上移动端导入 JSON 后，图片仍可能不显示

根因已确认：

- 原有 `exportPortableData()` 会把本地 `file://` 图片清空
- 手机端拿不到桌面本地路径，所以导入后没有封面

当前本地代码状态：

- 已开始把 `exportPortableData()` 改成：
  - 导出时读取本地 `file://` 封面
  - 转成 `data:image/...;base64,...`
  - 内嵌进移动 JSON
- 当前这部分修复已经在本地工作区里，`lint` 和 `build` 通过
- 但这次修复还没有再次推到 GitHub，也还没触发 Vercel 重部署

后续建议优先处理：

1. 完成并复核 `src/context/GunplaContext.jsx` 中 `exportPortableData()` 的返回文案和导出逻辑
2. 本地导出一个包含本地封面的 JSON
3. 在手机或浏览器移动模式导入，确认首页和详情页都能看到封面
4. 通过后把源码推到 GitHub，触发 Vercel 重部署

### B. 移动端风格仍需继续提升

当前已完成：

- 基础移动布局已搭建
- 页面结构已经与桌面分流

仍建议继续：

- 把移动端卡片进一步改成“潮流卡片”风格
- 增加更完整的信息密度
- 详情页继续补充关键字段
- 导入后的空状态、引导提示再精修一轮

## 4. 本地测试方式

### 桌面端测试

在项目根目录执行：

```powershell
cd C:\jlzxm\wj
cmd /c npm run electron
```

用于验证：

- 桌面主界面是否正常
- “移动端入口”是否能打开网址
- “导出到移动端”是否能生成 JSON

### Web / 移动端本地预览

```powershell
cd C:\jlzxm\wj
cmd /c npm run dev
```

然后本机浏览器打开：

- `http://localhost:5173`

如果要手机真机访问，建议：

```powershell
cd C:\jlzxm\wj
cmd /c npx vite --host 0.0.0.0 --port 5173
```

再用手机访问：

- `http://你的局域网IP:5173`

### 本地构建检查

```powershell
cd C:\jlzxm\wj
cmd /c npm run lint
cmd /c npm run build
```

### 桌面端本地打包

```powershell
cd C:\jlzxm\wj
cmd /c npm run dist:win
```

## 5. 移动端上线方式

### GitHub Pages（当前）

- 详见仓库内 [`MOBILE_WEB_DEPLOYMENT.md`](MOBILE_WEB_DEPLOYMENT.md)
- 桌面端 `.env` 中配置：

```env
VITE_MOBILE_WEB_URL=https://hhf20.github.io/gunpla-manager/
```

### 用户使用路径

1. 在桌面端点击“导出到移动端”
2. 让用户手机打开 `https://hhf20.github.io/gunpla-manager/`
3. 在移动端首页导入 JSON
4. 可选：添加到手机桌面

## 6. 后续更新规则

### 更新桌面端

- 继续按现在的桌面发布流程
- 可走：
  - `本地更新`
  - `打包更新`

### 更新移动端

- 需要把源码推到 GitHub 的 `main` 分支
- **GitHub Actions** 会构建并部署 GitHub Pages；仅打桌面安装包不会更新线上 H5

## 7. 关键文件参考

- 移动端入口与路由：
  - `src/App.jsx`
- 移动端页面：
  - `src/components/MobileHomePage.jsx`
  - `src/components/MobileDetailPage.jsx`
  - `src/components/MobileStatsPage.jsx`
  - `src/components/MobileFilterDrawer.jsx`
- 桌面端移动入口：
  - `src/components/Header.jsx`
- 移动端地址配置：
  - `src/config/mobileWeb.js`
- 移动数据导入导出：
  - `src/context/GunplaContext.jsx`
- 部署与说明：
  - `.github/workflows/deploy-github-pages.yml`
  - `vercel.json`（若仍使用 Vercel 备选）
  - `MOBILE_WEB_DEPLOYMENT.md`

## 8. 给后续接手人的一句话

当前最优先的事情不是继续堆新功能，而是：

1. 把移动端图片导出链路彻底打通
2. 验证一次完整的“桌面导出 -> 手机导入 -> 显示封面”
3. 再继续做移动端 UI 深化
