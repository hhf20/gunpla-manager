# 移动端上线说明

移动端首版按 `Vercel + H5/PWA` 部署，不需要单独服务器。

## 发布配置

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

## 环境变量

在 Vercel 项目中配置：

```bash
VITE_MOBILE_WEB_URL=https://your-project-name.vercel.app
```

桌面端会用这个地址：

- 打开“移动端入口”
- 在“导出到移动端”后提示用户去哪里访问

## 用户使用方式

1. 在桌面端导出移动端数据包
2. 手机打开移动端网址
3. 在移动端首页导入 JSON 数据包
4. 可选：将网页添加到手机桌面

## 当前定位

- 移动端首版为只读浏览
- 数据保存在手机浏览器本地
- 不需要独立后端
- 不需要登录
