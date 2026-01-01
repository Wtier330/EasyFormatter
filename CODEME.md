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

## 主要功能特性

### 文本变换功能 (Text Transformation)
提供四种文本变换模式，支持选区优先和无选区输出到结果区策略：
1. **转义 (Escape)**: 仅对反斜杠 `\` 进行转义 (`\` -> `\\`)。不处理引号、换行等其他字符。
2. **去转义 (Unescape)**: 仅对双反斜杠 `\\` 进行还原 (`\\` -> `\`)。不处理 `\"`, `\n` 等序列。
3. **中文转 Unicode**: 将非 ASCII 字符转换为 `\uXXXX` 格式，支持 surrogate pairs。
4. **Unicode 转中文**: 将 `\uXXXX` 还原为字符。

### 智能 JSON 提取模式 (Smart Extraction Mode)
针对非标准 JSON 格式（如 Jenkins `update-center.json`），系统实现了自动识别与兼容解析：
1. **自动检测**: 解析失败时自动尝试识别 JSONP 函数调用 (`func({...})`) 或变量赋值 (`var x = {...}`)。
2. **兼容模式**: 识别成功后进入兼容模式，在预览面板显示内部 JSON 结构，并提供明显的黄色警告横幅。
3. **提取功能**: 用户点击“提取内部 JSON”按钮后，将自动剥离外层包裹代码，仅保留有效的 JSON 内容。
4. **可逆性**: 提取操作仅更新编辑器内容，用户可通过撤销操作（Ctrl+Z）恢复原始数据。

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

## UI 显示规范

### 系统提示框 (Toast/Message)
所有系统级提示框必须遵循以下显示标准：

1.  **安全边距 (Margins)**:
    - 顶部距离 (Top): **48px** (避免被自定义标题栏遮挡)。
    - 内边距 (Padding): **12px** (确保文字不贴边)。
    
2.  **层级 (Z-Index)**:
    - 必须高于应用标题栏和侧边栏。
    - `naive-ui` 的 `n-message-provider` 已默认处理高层级，但需确保 `container-style` 设置正确。

3.  **交互行为**:
    - 非模态 (Non-modal): 不打断用户操作。
    - 自动消失: 默认持续 2-3 秒。
    - 内容完整性: 确保在小窗口模式下文字不被截断。

### 数据预览与格式化 (Preview Rendering)
1. **字符串转义**:
   - 在 JSON 树视图中，字符串值中的特殊字符必须转义显示，以保持原始格式可见。
   - 需要处理的字符: `\n` (换行), `\t` (制表符), `\r` (回车), `\\` (反斜杠), `\"` (双引号)。
   - 例如: 包含实际换行符的字符串应显示为 `"Line 1\nLine 2"` 而不是实际换行。

2. **标点符号处理**:
   - 逗号 `,` 应仅在非最后一行元素后显示。
   - 避免在已展开的对象/数组块末尾重复显示逗号。

## v1.1.0 更新日志
- 新增 Scratch 临时文档功能
- 优化多标签页管理逻辑
- 移除废弃的解密 (Decrypt) 模块
- 全面中文化代码注释

## 常见问题排查 (Troubleshooting)

### "fs.exists not allowed" 错误
**症状**: 在控制台看到 `[ConfigStore] Error checking file existence fs.exists not allowed`，且无法正确检测文件删除状态。
**原因**: Tauri v2 的 `tauri-plugin-fs` 默认权限非常严格，未授权访问任意文件路径。
**解决方案**:
1. 弃用 `tauri-plugin-fs` 的 `exists` 方法。
2. 使用自定义 Rust 命令 `file_exists` (在 `src-tauri/src/commands/mod.rs` 中实现)。
3. 该命令直接调用 Rust 标准库 `std::path::Path::exists`，绕过 Tauri 插件的 Scope 限制，与 `read_text` 行为保持一致。
4. 在 `ui/src/tauri/index.ts` 中将 `exists` 映射到 `invoke('file_exists', ...)`。
