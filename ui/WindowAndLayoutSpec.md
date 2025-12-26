# Window and Layout Specifications

> This document defines the mandatory UI/UX principles for EasyFormatter.
> All UI modifications must adhere to these specifications.

## Core Principles

### 1. Editor First Principle (编辑器优先原则)
- The **Code Editor** is the primary interface element.
- It must occupy the majority of the screen space.
- Vertical space is precious; avoid unnecessary headers or footers.
- The editor should auto-resize to fill available space.

### 2. Configuration Panel Subordinate Principle (配置面板从属原则)
- Configuration options (sidebars, settings panels) should be secondary to the editor.
- They should be collapsible or unobtrusive.
- Do not let configuration controls steal focus or space from the editing task.

### 3. Line Width Readability Principle (行宽可读性原则)
- Ensure code/text lines do not become uncomfortably long on wide screens.
- Provide options or defaults that respect typographic best practices for code readability.

### 4. Primary Action Reachability Principle (主操作可达性原则)
- Primary actions (e.g., Format, Sort, Validate) must be immediately accessible.
- Avoid burying key actions in nested menus.
- Use clear visual hierarchy to distinguish primary actions from secondary ones.

## Layout Implementation Guidelines

- **Full Height**: The main view must utilize 100% of the window height.
- **Flex Layout**: Use Flexbox to ensure dynamic resizing without scrollbars on the main container.
- **Visual Noise**: Minimize borders and background variations to keep focus on the content.
