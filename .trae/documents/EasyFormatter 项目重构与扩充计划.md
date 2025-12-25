# EasyFormatter 项目重构与扩充计划

## 当前理解
- 目标：提供桌面端文本清洗工具，支持实时预览、规则组合、可扩展规则、一键复制/保存。
- 技术：Python 3.9+、PySide6、PyInstaller；分层架构（Core/UI/QSS）。
- 现状：核心规则与管道已完成，UI 基础与本地化完成，可打包为 EXE；规则默认开启 strip/separators/newlines。

## 目标结构
```
project/
├ app/
│ ├ core/            # 核心逻辑（规则、管道）
│ ├ services/        # 业务服务（文本、文件、剪贴板、预设）
│ ├ adapters/        # 外部依赖适配（OS、资源、日志、PyInstaller）
│ ├ ui/              # GUI 层（窗口、组件、样式、资源）
│ └ models/          # 数据结构（Rule、Preset、Settings）
├ config/            # 配置与默认值（settings.json、hooks）
├ tests/             # 单元与集成测试
└ main.py            # 入口（保持根目录）
```

## 重构计划
- 代码迁移：
  - `core/rules.py` → `app/core/rules.py`；将 `Rule` 抽取到 `app/models/rule.py`。
  - `core/pipeline.py` → `app/core/pipeline.py`；管道仅依赖 `models` 与 `rules`。
  - `ui/main_window.py` → `app/ui/main_window.py`；拆分子组件：`rule_panel.py`、`editor_pane.py`、`toolbar.py`、`status_bar.py`。
  - `ui/styles.qss` → `app/ui/styles.qss`；按主题分拆：`themes/light.qss`、`themes/dark.qss`（先保留统一入口）。
- 服务层新增：
  - `TextService`：聚合规则选择、调用管道、性能计时、指标统计。
  - `ClipboardService`：统一剪贴板操作与提示。
  - `FileService`：打开/保存、批处理目录、导出 CSV/JSON。
  - `PresetService`：管理规则预设（保存/加载/应用）。
- 适配层新增：
  - `ResourceAdapter`：PyInstaller 路径处理、资源定位。
  - `LoggerAdapter`：统一日志（到文件与控制台）。
- 入口：
  - `main.py` 仅负责 QApplication 初始化、样式加载、主窗口启动，使用 `ResourceAdapter` 处理冻结路径。

## UI 扩充
- 规则面板：
  - 规则搜索与分组（基础清洗/结构处理/提取转换）。
  - 可参数化规则的可视化编辑（例如“合并空白”的分隔符选择）。
  - 预设管理（保存/加载/恢复默认）。
- 编辑区：
  - 双栏模式：原始/结果并排，支持同步滚动。
  - Diff 视图（逐行变化高亮）。
  - 字数/词数/行数/去重率等指标。
- 工具栏：
  - 快捷操作：复制输出、粘贴到输入、清空、保存为 TXT/CSV。
  - 主题切换：亮色/暗色；字号调整。
  - 批处理入口：对文件/目录执行规则集，生成输出文件。
- 状态栏：
  - 实时性能指标（处理耗时、吞吐量）。
  - 操作反馈（复制成功、保存路径）。

## 功能增强
- 规则系统：
  - 扩展规则类型：正则提取、自定义字符替换、列分割与重排、JSON/CSV 清洗。
  - 规则依赖与冲突提示（例如“只保留数字”建议配合“去除空行”）。
  - 参数化与持久化（通过 `Settings`/`Preset` 保存）。
- 性能与稳定：
  - 大文本处理的流式管道（生成器/分块），避免整块拷贝。
  - 预编译正则、短路优化、分支统计。
  - 统一异常捕获与用户可读提示。

## 配置与持久化
- `config/settings.json`：默认配置（主题、开关、规则顺序、预设）。
- `QSettings`：用户偏好落地（本机）；同时支持导入/导出 JSON。
- 资源定位统一通过 `ResourceAdapter`，兼容源码运行与 PyInstaller 冻结。

## 测试与质量
- 单元测试：
  - `tests/test_core_rules.py`、`tests/test_core_pipeline.py`。
  - `tests/test_services_text.py`（预设/参数化规则）。
- 集成测试：
  - 简单 UI 冒烟（窗口可启动、信号不死循环）。
- 性能基线：
  - 典型 100k 行文本的处理耗时与内存占用记录。

## 打包与发布
- PyInstaller：
  - onefile + windowed；包含资源与样式目录；版本与元数据。
  - 自动生成 `VERSION.txt` 注入到关于窗口。
- 清理与忽略：保持 `clean.bat` 与 `.gitignore` 控制构建产物。

## 迁移步骤
- 第 1 步：创建 `app/`、`config/`、`tests/` 基本结构（不改行为）。
- 第 2 步：迁移 `core` → `app/core`，抽取 `models/Rule`，修正导入。
- 第 3 步：拆分 `ui/main_window.py` 为组件，接入 `services`。
- 第 4 步：新增 `PresetService/ClipboardService/FileService` 并替换旧逻辑。
- 第 5 步：引入主题切换与指标统计；保留现有样式为默认主题。
- 第 6 步：补充测试与打包脚本资源收集；验证 EXE。

## 验收标准
- 结构符合目标结构；`main.py` 启动成功；现有功能不回归。
- 100k 行文本处理流畅（防抖与无卡顿感）；EXE 可运行。
- 新增预设管理、主题切换、批处理、指标统计可用。

## 说明
- 将严格遵循 `CODEME.md`；如与代码不一致，将以代码为准并提醒更新文档。
