import csv
from io import StringIO
from typing import Set
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPlainTextEdit, QCheckBox, QSplitter, QToolBar,
    QStatusBar, QLabel, QScrollArea, QFileDialog, QInputDialog,
    QPushButton, QStackedWidget, QComboBox, QGroupBox, QButtonGroup,
    QTabWidget, QDockWidget, QToolButton, QLineEdit, QSizePolicy
)
from PySide6.QtCore import Qt, QTimer, QSize, QPropertyAnimation, QEasingCurve, QRect, QVariantAnimation
from PySide6.QtGui import QAction, QKeySequence
from app.adapters.resource_adapter import ResourceAdapter

from app.core.pipeline import get_all_rules
from app.services.text_service import TextService
from app.services.clipboard_service import ClipboardService
from app.services.file_service import FileService
from app.services.settings_service import SettingsService
from app.services.preset_service import PresetService
from app.services.json_service import JsonService

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("数据格式化工具")
        self.resize(1000, 650)
        self.is_dark_theme = False
        self.active_rules: Set[str] = set()

        self.text_service = TextService()
        self.clipboard_service = ClipboardService()
        self.file_service = FileService()
        self.preset_service = PresetService()
        self.settings_service = SettingsService()
        self.resource_adapter = ResourceAdapter()
        self.json_service = JsonService()

        self.debounce_timer = QTimer()
        self.debounce_timer.setSingleShot(True)
        self.debounce_timer.setInterval(150)
        self.debounce_timer.timeout.connect(self.perform_formatting)
        
        self.create_actions()
        self.setup_ui()
        self.init_rules_state()
        self.load_settings()
        self.perform_formatting()

    def create_actions(self):
        """创建所有 QAction"""
        style = self.style()
        
        # 1. 主路径 (Main Path)
        self.act_paste = QAction(style.standardIcon(style.StandardPixmap.SP_ArrowDown), "粘贴", self)
        self.act_paste.setToolTip("粘贴到输入")
        self.act_paste.triggered.connect(self.paste_input)
        
        self.act_clear = QAction(style.standardIcon(style.StandardPixmap.SP_DialogDiscardButton), "清空", self)
        self.act_clear.setToolTip("清空输入")
        self.act_clear.triggered.connect(self.clear_all)
        
        self.act_copy = QAction(style.standardIcon(style.StandardPixmap.SP_DialogYesButton), "复制输出", self)
        self.act_copy.setToolTip("复制处理结果")
        self.act_copy.triggered.connect(self.copy_output)
        
        self.act_save = QAction(style.standardIcon(style.StandardPixmap.SP_DialogSaveButton), "保存", self)
        self.act_save.setToolTip("保存结果到文件")
        self.act_save.triggered.connect(self.save_file)
        
        # 2. 高级 (Advanced)
        self.act_batch = QAction(style.standardIcon(style.StandardPixmap.SP_FileDialogDetailedView), "批处理", self)
        self.act_batch.triggered.connect(self.batch_process_files)
        
        self.act_export_csv = QAction(style.standardIcon(style.StandardPixmap.SP_DriveDVDIcon), "导出CSV", self)
        self.act_export_csv.triggered.connect(self.save_csv)
        
        # 3. 外观/设置 (Settings)
        self.act_preset = QAction(style.standardIcon(style.StandardPixmap.SP_DialogYesButton), "预设", self)
        self.act_preset.triggered.connect(self.save_preset)
        
        self.act_apply_preset = QAction(style.standardIcon(style.StandardPixmap.SP_FileDialogListView), "应用预设", self)
        self.act_apply_preset.triggered.connect(self.apply_preset)
        
        self.act_theme = QAction(style.standardIcon(style.StandardPixmap.SP_DesktopIcon), "主题", self)
        self.act_theme.triggered.connect(self.toggle_theme)

    def setup_ui(self):
        # 1. Setup Toolbar
        self.toolbar = QToolBar("Main Toolbar")
        self.toolbar.setMovable(False)
        self.toolbar.setIconSize(QSize(20, 20))
        self.addToolBar(self.toolbar)
        
        # Group 1: Main Path
        self.toolbar.addAction(self.act_paste)
        self.toolbar.addAction(self.act_clear)
        self.toolbar.addAction(self.act_copy)
        
        self.toolbar.addSeparator()
        
        # Group 2: Options (Realtime Checkbox)
        self.chk_realtime = QCheckBox("实时预览")
        self.chk_realtime.setChecked(True)
        self.chk_realtime.setToolTip("输入变化时自动处理")
        self.toolbar.addWidget(self.chk_realtime)
        
        self.toolbar.addSeparator()
        
        # Group 3: Advanced
        self.toolbar.addAction(self.act_preset)
        self.toolbar.addAction(self.act_batch)
        self.toolbar.addAction(self.act_export_csv)
        
        # Spacer
        spacer = QWidget()
        spacer.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        self.toolbar.addWidget(spacer)
        
        # Group 4: Theme
        self.toolbar.addAction(self.act_theme)
        
        # 2. Setup Dock Widget (Rules Panel)
        self.dock_rules = QDockWidget("规则面板", self)
        self.dock_rules.setAllowedAreas(Qt.LeftDockWidgetArea | Qt.RightDockWidgetArea)
        self.dock_rules.setFeatures(QDockWidget.DockWidgetClosable | QDockWidget.DockWidgetMovable | QDockWidget.DockWidgetFloatable)
        
        dock_content = QWidget()
        dock_layout = QVBoxLayout(dock_content)
        dock_layout.setContentsMargins(0, 0, 0, 0)
        dock_layout.setSpacing(5)
        
        # Search Bar
        self.search_bar = QLineEdit()
        self.search_bar.setPlaceholderText("🔍 搜索规则...")
        self.search_bar.textChanged.connect(self.filter_rules)
        # Add some margin for search bar
        search_container = QWidget()
        search_layout = QVBoxLayout(search_container)
        search_layout.setContentsMargins(10, 10, 10, 0)
        search_layout.addWidget(self.search_bar)
        dock_layout.addWidget(search_container)
        
        # Tab Widget (Rules / JSON)
        self.sidebar_tabs = QTabWidget()
        self.sidebar_tabs.setObjectName("sidebarTabs")
        
        # Tab 1: Text Rules
        self.page_format = self._create_format_options_page()
        self.sidebar_tabs.addTab(self.page_format, "文本清洗")
        
        # Tab 2: JSON Tools
        self.page_json = self._create_json_tools_page()
        self.sidebar_tabs.addTab(self.page_json, "JSON 工具")
        
        dock_layout.addWidget(self.sidebar_tabs)
        self.dock_rules.setWidget(dock_content)
        self.addDockWidget(Qt.LeftDockWidgetArea, self.dock_rules)

        # 3. Central Area (Input/Output Splitter)
        # Note: We don't need a root layout for central widget if we just set the splitter as central widget,
        # but wrapping in a QWidget is safer for styling and margins.
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        central_layout = QVBoxLayout(central_widget)
        central_layout.setContentsMargins(0, 0, 0, 0)
        central_layout.setSpacing(0)
        
        # 垂直分割：上输入，下输出
        editor_splitter = QSplitter(Qt.Orientation.Vertical)
        editor_splitter.setHandleWidth(1)
        
        # --- Upper: Input Area ---
        input_container = QWidget()
        input_layout = QVBoxLayout(input_container)
        input_layout.setContentsMargins(0, 0, 0, 0)
        input_layout.setSpacing(0)
        
        # Input Header
        input_header = QWidget()
        input_header.setObjectName("editorHeader")
        input_header.setFixedHeight(36)
        ih_layout = QHBoxLayout(input_header)
        ih_layout.setContentsMargins(10, 0, 10, 0)
        
        ih_label = QLabel("输入")
        ih_label.setStyleSheet("font-weight: bold; color: #555;")
        ih_layout.addWidget(ih_label)
        ih_layout.addStretch()
        
        # Inline Buttons (Paste, Clear) - Linked to Actions
        btn_paste = QToolButton()
        btn_paste.setDefaultAction(self.act_paste)
        btn_paste.setToolButtonStyle(Qt.ToolButtonTextBesideIcon)
        btn_paste.setAutoRaise(True)
        ih_layout.addWidget(btn_paste)
        
        btn_clear = QToolButton()
        btn_clear.setDefaultAction(self.act_clear)
        btn_clear.setToolButtonStyle(Qt.ToolButtonTextBesideIcon)
        btn_clear.setAutoRaise(True)
        ih_layout.addWidget(btn_clear)
        
        input_layout.addWidget(input_header)
        
        self.input_edit = QPlainTextEdit()
        self.input_edit.setPlaceholderText("在此粘贴混乱数据或 JSON...")
        self.input_edit.setFrameShape(QPlainTextEdit.NoFrame)
        self.input_edit.textChanged.connect(self.on_input_changed)
        input_layout.addWidget(self.input_edit)
        
        # --- Lower: Output Area ---
        output_container = QWidget()
        output_layout = QVBoxLayout(output_container)
        output_layout.setContentsMargins(0, 0, 0, 0)
        output_layout.setSpacing(0)
        
        # Output Header
        output_header = QWidget()
        output_header.setObjectName("editorHeader")
        output_header.setFixedHeight(36)
        oh_layout = QHBoxLayout(output_header)
        oh_layout.setContentsMargins(10, 0, 10, 0)
        
        oh_label = QLabel("结果")
        oh_label.setStyleSheet("font-weight: bold; color: #555;")
        oh_layout.addWidget(oh_label)
        oh_layout.addStretch()
        
        # Inline Buttons (Copy, Save) - Linked to Actions
        btn_copy = QToolButton()
        btn_copy.setDefaultAction(self.act_copy)
        btn_copy.setToolButtonStyle(Qt.ToolButtonTextBesideIcon)
        btn_copy.setAutoRaise(True)
        oh_layout.addWidget(btn_copy)
        
        btn_save = QToolButton()
        btn_save.setDefaultAction(self.act_save)
        btn_save.setToolButtonStyle(Qt.ToolButtonTextBesideIcon)
        btn_save.setAutoRaise(True)
        oh_layout.addWidget(btn_save)
        
        output_layout.addWidget(output_header)
        
        self.output_edit = QPlainTextEdit()
        self.output_edit.setReadOnly(True)
        self.output_edit.setPlaceholderText("结果将显示在这里...")
        self.output_edit.setFrameShape(QPlainTextEdit.NoFrame)
        output_layout.addWidget(self.output_edit)
        
        editor_splitter.addWidget(input_container)
        editor_splitter.addWidget(output_container)
        editor_splitter.setStretchFactor(0, 55)
        editor_splitter.setStretchFactor(1, 45)
        
        central_layout.addWidget(editor_splitter)

        # 4. Status Bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_label_chars = QLabel("字符数: 0")
        self.status_label_lines = QLabel("行数: 0")
        self.status_msg = QLabel("")
        self.status_bar.addPermanentWidget(self.status_label_lines)
        self.status_bar.addPermanentWidget(self.status_label_chars)
        self.status_bar.addWidget(self.status_msg)
        
        # 默认选中 Rules tab
        self.sidebar_tabs.setCurrentIndex(0)

    def _add_separator(self, layout):
        line = QWidget()
        line.setFixedWidth(1)
        line.setFixedHeight(24)
        line.setStyleSheet("background-color: #e0e0e0;")
        layout.addWidget(line)

    def _create_nav_tool_btn(self, text, icon_name, slot):
        """创建顶部导航栏右侧的工具按钮"""
        btn = QPushButton(text)
        style = self.style()
        if icon_name:
            icon = style.standardIcon(getattr(style.StandardPixmap, icon_name))
            btn.setIcon(icon)
        btn.setFlat(True)
        btn.setObjectName("navToolBtn")
        btn.setCursor(Qt.PointingHandCursor)
        btn.clicked.connect(slot)
        return btn

    def on_nav_btn_clicked(self, index):
        """已废弃：导航按钮点击处理"""
        pass
        # self.sidebar_stack.setCurrentIndex(index)

    def _create_json_tools_page(self):
        """创建 JSON 工具页"""
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(15)
        
        title = QLabel("JSON 工具箱")
        title.setObjectName("sectionTitle")
        layout.addWidget(title)
        
        # 校验
        btn_validate = QPushButton("JSON 校验")
        btn_validate.clicked.connect(self.do_json_validate)
        layout.addWidget(btn_validate)
        
        # 美化
        btn_pretty = QPushButton("JSON 美化")
        btn_pretty.clicked.connect(self.do_json_pretty)
        layout.addWidget(btn_pretty)
        
        # 压缩
        btn_minify = QPushButton("JSON 压缩")
        btn_minify.clicked.connect(self.do_json_minify)
        layout.addWidget(btn_minify)
        
        # 转义
        btn_escape = QPushButton("转义 (Stringify)")
        btn_escape.clicked.connect(self.do_json_escape)
        layout.addWidget(btn_escape)
        
        # 去转义
        btn_unescape = QPushButton("去转义 (Unescape)")
        btn_unescape.clicked.connect(self.do_json_unescape)
        layout.addWidget(btn_unescape)
        
        layout.addStretch()
        return page

    def _create_format_options_page(self):
        """创建格式化选项页（包含 JSON 配置和文本规则）"""
        page = QWidget()
        layout = QVBoxLayout(page)
        layout.setContentsMargins(0, 0, 0, 0)
        
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QScrollArea.NoFrame)
        content = QWidget()
        c_layout = QVBoxLayout(content)
        c_layout.setContentsMargins(15, 15, 15, 15)
        c_layout.setSpacing(20)
        
        # 1. JSON 配置
        json_group = QGroupBox("JSON 配置")
        jg_layout = QVBoxLayout(json_group)
        
        # 缩进设置
        jg_layout.addWidget(QLabel("缩进风格:"))
        self.combo_indent = QComboBox()
        self.combo_indent.addItems(["2 空格", "4 空格", "Tab"])
        self.combo_indent.setCurrentIndex(1) # 默认 4 空格
        jg_layout.addWidget(self.combo_indent)
        
        # 排序设置
        self.chk_sort_keys = QCheckBox("属性排序 (Sort Keys)")
        jg_layout.addWidget(self.chk_sort_keys)
        
        c_layout.addWidget(json_group)
        
        # 2. 文本清洗规则
        rules_label = QLabel("文本清洗规则")
        rules_label.setObjectName("sectionTitle")
        c_layout.addWidget(rules_label)
        
        self.rule_checkboxes = {}
        for rule in get_all_rules():
            cb = QCheckBox(rule.label)
            cb.setToolTip(rule.description)
            cb.toggled.connect(self.on_rule_toggled)
            cb.setProperty("rule_id", rule.id)
            self.rule_checkboxes[rule.id] = cb
            c_layout.addWidget(cb)
            
        c_layout.addStretch()
        scroll.setWidget(content)
        layout.addWidget(scroll)
        return page

    def filter_rules(self, text):
        """根据搜索框内容过滤规则"""
        text = text.lower()
        for rule_id, checkbox in self.rule_checkboxes.items():
            rule_text = checkbox.text().lower()
            if text in rule_text:
                checkbox.show()
            else:
                checkbox.hide()

    def _create_header_btn(self, text, icon_name, slot):
        """辅助方法：创建 Header 上的扁平按钮"""
        from PySide6.QtWidgets import QPushButton
        style = self.style()
        icon = style.standardIcon(getattr(style.StandardPixmap, icon_name))
        btn = QPushButton(text)
        btn.setIcon(icon)
        btn.setCursor(Qt.PointingHandCursor)
        btn.clicked.connect(slot)
        btn.setObjectName("headerBtn")
        btn.setFlat(True) 
        return btn

    # --- JSON 功能实现 ---
    def do_json_validate(self):
        text = self.input_edit.toPlainText()
        valid, msg = self.json_service.validate(text)
        if valid:
            self.status_bar.showMessage("✔ JSON 格式正确", 3000)
        else:
            self.status_bar.showMessage(f"✘ {msg}", 5000)

    def do_json_pretty(self):
        text = self.input_edit.toPlainText()
        # 获取缩进设置
        idx = self.combo_indent.currentIndex()
        indent = 2 if idx == 0 else 4 if idx == 1 else "\t"
        sort_keys = self.chk_sort_keys.isChecked()
        
        res = self.json_service.pretty_print(text, indent, sort_keys)
        self.output_edit.setPlainText(res)
        self.status_bar.showMessage("JSON 美化完成", 2000)

    def do_json_minify(self):
        text = self.input_edit.toPlainText()
        res = self.json_service.minify(text)
        self.output_edit.setPlainText(res)
        self.status_bar.showMessage("JSON 压缩完成", 2000)

    def do_json_escape(self):
        text = self.input_edit.toPlainText()
        res = self.json_service.escape(text)
        self.output_edit.setPlainText(res)
        self.status_bar.showMessage("转义完成", 2000)

    def do_json_unescape(self):
        text = self.input_edit.toPlainText()
        res = self.json_service.unescape(text)
        self.output_edit.setPlainText(res)
        self.status_bar.showMessage("去转义完成", 2000)

    # --- 原有功能 ---
    def init_rules_state(self):
        for rule in get_all_rules():
            if rule.default_enabled:
                self.rule_checkboxes[rule.id].setChecked(True)
                self.active_rules.add(rule.id)
            else:
                self.rule_checkboxes[rule.id].setChecked(False)

    def load_settings(self):
        saved_rules = self.settings_service.load_active_rules()
        if saved_rules:
            for rid, cb in self.rule_checkboxes.items():
                cb.blockSignals(True)
                cb.setChecked(rid in saved_rules)
                cb.blockSignals(False)
            self.active_rules = set(saved_rules)

        self._apply_dark_theme(self.settings_service.load_dark_theme(), notify=False)

    def on_input_changed(self):
        self.debounce_timer.start()

    def on_rule_toggled(self, checked):
        sender = self.sender()
        if isinstance(sender, QCheckBox):
            rule_id = sender.property("rule_id")
            if checked:
                self.active_rules.add(rule_id)
            else:
                self.active_rules.discard(rule_id)
            self.settings_service.save_active_rules(set(self.active_rules))
            self.perform_formatting()

    def perform_formatting(self):
        # 1. 检查是否开启实时预览
        if not self.chk_realtime.isChecked():
            return

        # 如果当前是“格式化”页面，且没有任何规则被选中，可能用户想用 JSON 功能？
        # 目前保持原有逻辑：只要输入变动，尝试应用“文本清洗规则”。
        # JSON 操作是手动的（点击按钮），互不冲突。
        input_text = self.input_edit.toPlainText()
        if not input_text:
            self.output_edit.setPlainText("")
            self.update_stats(0, 0)
            self.status_msg.setText("")
            return
        
        # 只有当有激活的规则时才自动处理，否则如果是 JSON 模式，用户可能不想自动应用文本规则
        # 但为了保持“实时预览”，我们还是运行 pipeline，如果 active_rules 为空，pipeline 也会返回原文本（或基础处理）
        result, chars, lines, ms = self.text_service.format_text(input_text, self.active_rules)
        
        # 避免覆盖掉用户刚刚点击 JSON 按钮生成的结果
        # 解决方案：Pipeline 的结果应该只在 active_rules 不为空时覆盖？
        # 或者：JSON 美化结果是显示在 output 的，pipeline 也是输出到 output。
        # 简单处理：Pipeline 始终运行。如果用户想保留 JSON 结果，不要乱动输入。
        # 或者：当在 JSON 工具页时，禁用自动 pipeline？
        if self.sidebar_tabs.currentIndex() == 1: # JSON 工具页 (Index 1)
             # 在 JSON 页，我们不自动运行文本清洗 pipeline，除非用户切换回格式化页
             # 但为了统计字数，我们还是计算一下
             self.update_stats(len(input_text), len(input_text.splitlines()))
             return

        scrollbar = self.output_edit.verticalScrollBar()
        old_val = scrollbar.value()
        self.output_edit.setPlainText(result)
        if scrollbar.maximum() >= old_val:
            scrollbar.setValue(old_val)
        self.update_stats(chars, lines)
        self.status_msg.setText(f"耗时: {ms}ms")

    def update_stats(self, chars, lines):
        self.status_label_chars.setText(f"字符数: {chars}")
        self.status_label_lines.setText(f"行数: {lines}")

    def copy_output(self):
        text = self.output_edit.toPlainText()
        if text:
            self.clipboard_service.set_text(text)
            self.status_bar.showMessage("已复制到剪贴板", 3000)
        else:
            self.status_bar.showMessage("没有内容可复制", 2000)

    def paste_input(self):
        text = self.clipboard_service.get_text()
        if text:
            self.input_edit.setPlainText(text)
            self.status_bar.showMessage("已粘贴", 2000)

    def clear_all(self):
        self.input_edit.clear()
        self.output_edit.clear()
        self.status_bar.showMessage("已清空", 2000)

    def save_file(self):
        text = self.output_edit.toPlainText()
        if not text:
            self.status_bar.showMessage("没有内容可保存", 2000)
            return
        file_path, _ = QFileDialog.getSaveFileName(self, "保存文件", "", "文本文件 (*.txt);;所有文件 (*)")
        if file_path:
            try:
                self.file_service.save_text(file_path, text)
                self.status_bar.showMessage(f"已保存到: {file_path}", 5000)
            except Exception as e:
                self.status_bar.showMessage(f"保存失败: {str(e)}", 5000)

    def _apply_dark_theme(self, enabled: bool, notify: bool = True):
        if enabled:
            path = self.resource_adapter.resource_path("app/ui/themes/dark.qss")
            try:
                with open(path, "r", encoding="utf-8") as f:
                    self.setStyleSheet(f.read())
                self.is_dark_theme = True
                self.settings_service.save_dark_theme(True)
                if notify:
                    self.status_bar.showMessage("已切换为深色主题", 2000)
            except Exception:
                if notify:
                    self.status_bar.showMessage("主题切换失败", 2000)
        else:
            self.setStyleSheet("")
            self.is_dark_theme = False
            self.settings_service.save_dark_theme(False)
            if notify:
                self.status_bar.showMessage("已切换为浅色主题", 2000)

    def toggle_theme(self):
        self._apply_dark_theme(not self.is_dark_theme)

    def save_preset(self):
        name, ok = QInputDialog.getText(self, "保存预设", "预设名称：")
        if ok and name:
            self.preset_service.save_preset(name, set(self.active_rules))
            self.status_bar.showMessage(f"已保存预设: {name}", 2000)

    def apply_preset(self):
        presets = self.preset_service.list_presets()
        if not presets:
            self.status_bar.showMessage("暂无可用预设", 2000)
            return
        name, ok = QInputDialog.getItem(self, "应用预设", "选择预设：", presets, 0, False)
        if ok and name:
            rule_ids = self.preset_service.load_preset(name)
            for rid, cb in self.rule_checkboxes.items():
                cb.blockSignals(True)
                cb.setChecked(rid in rule_ids)
                cb.blockSignals(False)
            self.active_rules = set(rule_ids)
            self.settings_service.save_active_rules(set(self.active_rules))
            self.perform_formatting()
            self.status_bar.showMessage(f"已应用预设: {name}", 2000)

    def save_csv(self):
        text = self.output_edit.toPlainText()
        if not text:
            self.status_bar.showMessage("没有内容可保存", 2000)
            return
        path, _ = QFileDialog.getSaveFileName(self, "保存为CSV", "", "CSV 文件 (*.csv);;所有文件 (*)")
        if path:
            try:
                buf = StringIO()
                writer = csv.writer(buf, lineterminator="\n")
                for line in text.splitlines():
                    writer.writerow([line])
                self.file_service.save_text(path, buf.getvalue())
                self.status_bar.showMessage(f"已保存为: {path}", 5000)
            except Exception as e:
                self.status_bar.showMessage(f"保存失败: {str(e)}", 5000)

    def batch_process_files(self):
        paths, _ = QFileDialog.getOpenFileNames(self, "选择要处理的文件", "", "文本文件 (*.txt);;所有文件 (*)")
        if not paths:
            return
        try:
            count = self.file_service.batch_process(paths, set(self.active_rules))
            self.status_bar.showMessage(f"批处理完成: {count} 个文件", 3000)
            self.settings_service.save_active_rules(set(self.active_rules))
        except Exception as e:
            self.status_bar.showMessage(f"批处理失败: {str(e)}", 3000)

    def closeEvent(self, event):
        self.settings_service.save_active_rules(set(self.active_rules))
        self.settings_service.save_dark_theme(self.is_dark_theme)
        super().closeEvent(event)

    def toggle_sidebar(self):
        """切换侧边栏的显示/隐藏"""
        if self.dock_rules.isVisible():
            self.dock_rules.close()
        else:
            self.dock_rules.show()
