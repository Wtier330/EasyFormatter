# EasyFormatter 开发指南 (CODEME)

## 项目概述
EasyFormatter 是一个基于 Tauri v2 (Rust) + Vue 3 (TypeScript) 的跨平台桌面应用。
当前版本: **1.1.0**

## 技术栈
- **核心框架**: Tauri v2
- **前端**: Vue 3, Naive UI, Pinia, Monaco Editor
- **后端**: Rust (src-tauri)
- **构建工具**: Vite, Cargo

## 目录结构
- `src-tauri/`: Rust 后端代码
  - `src/commands/`: Tauri 命令定义
  - `src/core/`: 核心业务逻辑 (JSON 处理, 文本格式化)
- `ui/`: 前端代码
  - `src/stores/`: Pinia 状态管理 (App, Config)
  - `src/components/`: Vue 组件
  - `src/tauri/`: Tauri API 封装

## 开发流程

### 1. 安装依赖
```bash
cd ui
npm install
```

### 2. 启动开发服务器
```bash
# 在根目录
npm run dev --prefix ui
# 或使用 Tauri CLI
tauri dev
```

### 3. 构建发布
```bash
# 在根目录运行
npm run tauri build
```

## 测试
当前项目主要依赖手动验证，尚未集成自动化单元测试。
- **Rust 后端**: 可通过 `cargo test` 运行 (目前无测试用例)
- **前端**: 尚未配置 Vitest/Jest

## 贡献规范
- **注释**: 所有代码注释应使用中文。
- **版本控制**: 遵循 SemVer 规范更新 `package.json` 和 `tauri.conf.json`。
- **UI 规范**: 严格遵循 `ui/WindowAndLayoutSpec.md`。

## v1.1.0 更新日志
- 新增 Scratch 临时文档功能
- 优化多标签页管理逻辑
- 移除废弃的解密 (Decrypt) 模块
- 全面中文化代码注释
