# EasyFormatter (Tauri Edition) v1.1.0

EasyFormatter 是一款基于 Tauri + Vue 3 构建的轻量级、高性能桌面端文本处理工具。旨在为开发者提供“开箱即用”的数据清洗与格式化能力，解决日常开发中频繁遇到的 JSON 校验、文本去噪、格式转换等痛点。

## ✨ 核心能力

### 1. 多标签页与临时文档 (Scratch Tabs)
**v1.1.0 新增特性**：
- **临时文档 (Scratch)**：支持快速创建不依赖文件的临时编辑区，应用重启自动恢复内容。
- **智能标签页**：支持多文件同时打开，提供关闭保护与状态记忆。
- **剪贴板集成**：一键从剪贴板创建新文档。

### 2. 文本清洗 (Text Cleaner)
提供了一套灵活的文本处理流水线，支持对杂乱文本进行快速清洗：
- **行处理**：去除首尾空格、去除空行、仅保留数字。
- **全文处理**：合并连续空白、去除特定分隔符、去重（保持顺序）。
- **预设模式**：内置“常规清洗”、“仅保留数字”、“结构化清洗”等常用组合。

### 2. JSON 工具箱 (JSON Tools)
集成了专业的 JSON 编辑与处理环境，基于 Monaco Editor 内核：
- **双栏视图**：左侧输入/右侧预览，支持实时语法校验。
- **格式化**：支持 美化 (Beautify) 与 压缩 (Minify)，可自定义缩进（2空格/4空格/Tab）。
- **智能排序**：支持对 JSON 对象键值进行字母序递归排序 (Sort Keys)。
- **转义处理**：一键 Stringify 转义与 Unescape 反转义。

### 3. 快捷键支持 (Shortcuts)
支持常用快捷键操作，提升编辑效率：
- **新建文件**: `Ctrl + N` (macOS: `Cmd + N`) - 创建带时间戳命名的临时文档
- **打开文件**: `Ctrl + O` (macOS: `Cmd + O`) - 打开本地 JSON/文本文件
- **保存文件**: `Ctrl + S` (macOS: `Cmd + S`) - 保存当前文档更改

## 🛠 技术架构

本项目采用前后端分离架构，充分利用系统原生能力与 Web 生态：

- **后端 (Rust)**: `src-tauri`
  - 负责核心计算逻辑（如 JSON 解析排序、正则处理），确保高性能。
  - 管理系统交互（文件读写、剪贴板、Dialog）。
- **前端 (Vue 3 + TypeScript)**: `ui`
  - 基于 Naive UI 组件库，遵循 [WindowAndLayoutSpec](./ui/WindowAndLayoutSpec.md) 规范。
  - 集成 Monaco Editor 提供 IDE 级的代码编辑体验。
  - 使用 Pinia 进行状态管理与持久化。

## 🚀 快速开始

### 环境准备
- **Node.js**: 推荐 v18+
- **Rust**: 请通过 [rustup](https://rustup.rs/) 安装最新稳定版。
- **Windows**: 需安装 C++ 生成工具 (Visual Studio Build Tools)。

### 开发指南

1. **安装前端依赖**
   ```bash
   cd ui
   npm install
   ```

2. **启动开发环境**
   在项目根目录运行：
   ```bash
   # 自动启动后端与前端热更新服务
   npm run tauri dev --prefix ui
   # 或者直接使用 tauri cli
   tauri dev
   ```

### 构建发布

构建生产环境安装包（支持 MSI/EXE）：
```bash
cd ui
npm run tauri build
```
构建产物将输出至 `src-tauri/target/release/bundle/` 目录。

## 📂 目录结构说明

```
EasyFormatter/
├── src-tauri/              # Rust 后端工程
│   ├── src/
│   │   ├── core/           # 核心业务逻辑 (Formatter, JsonTools)
│   │   └── commands/       # Tauri 命令接口定义
│   ├── capabilities/       # 权限控制配置
│   └── tauri.conf.json     # Tauri 应用配置
├── ui/                     # Vue 前端工程
│   ├── src/
│   │   ├── pages/          # 业务视图 (JsonView, FormatterView)
│   │   ├── components/     # 公共组件 (MonacoEditor)
│   │   └── stores/         # 状态管理
│   └── WindowAndLayoutSpec.md # UI/UX 设计规范
└── README.md               # 项目说明文档
```

## 📝 贡献指南

- 提交代码前请确保运行无报错。
- UI 修改请严格遵循 `ui/WindowAndLayoutSpec.md` 中的布局原则。
- 核心逻辑变更需同步更新 Rust 文档注释。
