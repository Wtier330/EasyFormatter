# CODEME.md - 项目 AI 解释层

> **最后更新日期**: 2025-12-25
> **用途**: 本文件旨在帮助 AI 模型快速理解“EasyFormatter”项目的上下文、架构与业务逻辑，以减少 Token 消耗并提高协作效率。

## 1. 项目概述

*   **项目目标**: 开发一款 Windows 桌面应用“数据格式化工具”，用于将网页、日志或 Excel 中的混乱文本数据快速清洗为规范格式。
*   **当前状态**: MVP 版本已完成。
    *   核心格式化规则（去除空格、去分隔符、去重等）已实现。
    *   UI 界面（实时预览、规则侧边栏）已实现。
    *   全中文本地化已完成。
    *   PyInstaller 打包流程已验证通过。
*   **核心行为逻辑**: **输入文本** -> **防抖触发** -> **管道处理（按顺序应用激活的规则）** -> **实时更新输出**。

## 2. 技术栈说明

*   **开发语言**: Python 3.9+
*   **GUI 框架**: PySide6 (Qt for Python)
*   **打包工具**: PyInstaller
*   **架构风格**: 分层架构 (Layered Architecture)
    *   **Core 层**: 纯 Python 实现的业务逻辑，无 GUI 依赖。
    *   **UI 层**: 负责界面展示与用户交互，调用 Core 层接口。
    *   **样式**: QSS (Qt Style Sheets) 实现界面美化。

## 3. 项目目录解读

*   `/app/` **(应用代码)**
    *   `core/`: 核心规则与处理管道（纯 Python，无 GUI 依赖）。
        *   `rules.py`: 定义所有格式化规则的具体实现函数，以及规则注册表 (`ALL_RULES`)。
        *   `pipeline.py`: 负责接收文本和激活的规则 ID，按预定顺序执行处理逻辑。
    *   `ui/`: 界面层（PySide6），主窗口与样式资源。
        *   `main_window.py`: 主窗口类，管理控件布局、信号槽连接、状态管理（如激活的规则集合）。
        *   `styles.qss`: 全局样式表，定义颜色、字体、边距等视觉规范。
        *   `themes/dark.qss`: 深色主题样式表。
    *   `services/`: 面向 UI 的服务封装（剪贴板、文件、预设、设置、耗时统计等）。
    *   `adapters/`: 适配层（例如资源路径适配冻结环境）。
*   `/` **(根目录)**
    *   `main.py`: 应用程序入口，负责初始化 QApplication 和加载样式。
    *   `build_exe.bat`: Windows 下的一键打包脚本。
*   `/tests/` **(单元测试)**
    *   `test_core_pipeline.py`: 核心规则管道测试。
    *   `test_services_text.py`: 文本服务测试。

## 4. 关键业务流程

1.  **启动流程**: `main.py` -> 加载 QSS -> 初始化 `MainWindow` -> 渲染界面。
2.  **格式化流程**:
    *   用户输入文本 或 切换规则 CheckBox。
    *   触发 `debounce_timer` (150ms 防抖)。
    *   调用 `MainWindow.perform_formatting()`。
    *   收集当前激活的规则 ID (`active_rules`)。
    *   调用 `app.core.pipeline.process_text(text, active_rules)`。
    *   `pipeline` 根据 `order` 对规则排序并依次执行。
    *   返回处理后的文本 -> 更新输出框 -> 更新状态栏统计信息。
3.  **扩展流程 (新增规则)**:
    *   在 `app/core/rules.py` 中编写新的处理函数。
    *   在 `ALL_RULES` 列表中注册新规则（指定 ID、标签、描述、顺序）。
    *   **无需修改 UI 代码**，界面会自动生成对应的 CheckBox。

## 5. 每个模块的职责与依赖

| 模块 | 文件 | 职责 | 依赖 |
| :--- | :--- | :--- | :--- |
| **Rules** | `app/core/rules.py` | 实现具体字符串处理函数；维护规则列表。 | `re`, `typing` |
| **Pipeline** | `app/core/pipeline.py` | 规则执行引擎，负责调度规则。 | `app.core.rules` |
| **Main Window** | `app/ui/main_window.py` | UI 布局；处理用户输入；管理防抖；调用 Pipeline；剪贴板/文件/设置交互。 | `PySide6`, `app.core.pipeline`, `app.services.*` |
| **Entry** | `main.py` | 程序入口；样式加载。 | `sys`, `os`, `PySide6`, `app.ui.main_window` |

## 6. 当前已知问题与未来计划

*   **图标资源**: 目前使用 Qt 内置标准图标 (`QStyle.StandardPixmap`)，未来需替换为自定义 SVG/PNG 图标。
*   **扩展计划**:
    *   支持“正则提取”规则。
    *   支持“CSV 导出”功能。
    *   支持“自定义字符替换”配置。

## 7. 给 AI 的使用说明

1.  **回答前必读**: 在回答任何代码相关问题前，请先阅读本文件以获取上下文。
2.  **一致性维护**: 修改代码时，请确保不破坏上述架构分层（例如不要在 `ui` 层写复杂的文本处理逻辑，应下沉至 `core`）。
3.  **文档更新**: 如果你的代码修改改变了项目结构或核心流程，请同步更新本文件，或提醒用户更新。
