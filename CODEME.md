# EasyFormatter 开发指南 (CODEME)

## 项目概述
EasyFormatter 是一个基于 Tauri v2 (Rust) + Vue 3 (TypeScript) 的跨平台桌面应用。
当前版本: **1.2.0**

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
当前项目已引入部分自动化测试，但覆盖仍然有限，功能改动后仍建议配合手动验证。

### Rust 后端 (src-tauri)
- 运行：`cargo test`（仓库已包含测试用例，主要在 `src-tauri/tests` 以及部分模块内测试）

### 前端 (ui)
- 本项目已安装 **Vitest**，并存在 `*.test.ts` 用例（例如 `ui/src/utils/*`、`ui/src/stores/*`）。
- 运行（在 `ui/` 目录）：`npx vitest run`

### 构建/类型检查（推荐每次提交前执行）
- 前端构建 + 类型检查（在根目录）：`npm run build --prefix ui`（等价于 `vue-tsc && vite build`）
- 后端编译/测试（在 `src-tauri/`）：`cargo test`

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

## 历史记录数据格式 (History Payload Format)

历史记录模块使用 SQLite 的 `versions` 表存储版本链（快照/补丁）。为保证“可读性优先”的预览体验，同时保持去重/一致性校验能力，当前采用以下约定：

1. **快照存储**:
   - 新写入的快照（`is_checkpoint=1`）使用明文存储：`codec='none'`，`patch_blob` 直接保存格式化后的内容（JSON 为 pretty 输出，默认 2 空格缩进）。
   - 旧数据可能存在 `codec='zstd'` 的快照：`patch_blob` 为 zstd 压缩后的文本，读取时会自动解压并进行 pretty 输出（向后兼容）。

2. **补丁存储**:
   - 对于 JSON 且差异较小的版本，会以 `json-patch` 形式写入 `patch_blob`，并使用 `codec='zstd'` 压缩补丁内容；回放时按链路还原。

3. **版本标识 (op_meta)**:
   - 新写入记录会在 `op_meta` 中保存 JSON 元信息，例如：
     - `payload_format`: `json_pretty_v1` / `text_plain_v1`
     - `hash_algo`: `sha256`
     - `hash_basis`: `json_minified` / `raw_text`
     - `indent`: `2`（仅 JSON）

4. **一致性校验（Hash Basis）**:
   - JSON：以“语义等价”的 minified 结果作为 hash basis（Rust/前端均为 parse 后 `to_string/JSON.stringify`）。
   - 非 JSON：以原始文本作为 hash basis。

5. **旧数据批量转换**:
   - 在“历史设置与维护”中提供“转换旧压缩记录”操作，会将旧版 `codec='zstd'` 的快照批量转换为 `codec='none'` 的格式化明文存储，并补齐 `op_meta` 标识。
   - 转换过程会进行 hash 校验，避免写入不一致数据；该操作可重复执行。

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
