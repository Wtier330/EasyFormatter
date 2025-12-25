import os
import sys
from typing import Dict, Any, List

from PySide6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QToolBar, QStatusBar,
    QSplitter, QDockWidget, QTabWidget, QPlainTextEdit, QGroupBox, QCheckBox,
    QScrollArea, QLabel, QToolButton, QMenu, QApplication, QStyle, QFrame,
    QSizePolicy, QLineEdit
)
from PySide6.QtCore import Qt, QTimer, QSize, Slot, QEvent
from PySide6.QtGui import QAction, QIcon, QKeySequence, QFont, QCloseEvent

from app.core.formatter import TextFormatter
from app.core.json_tools import JsonTools
from app.core.preset_manager import PresetManager
from app.services.settings_service import SettingsService

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("数据格式化工具 (EasyFormatter)")
        self.resize(1200, 800)

        # Services
        self.settings_service = SettingsService()
        self.preset_manager = PresetManager()

        # State
        self.auto_process = True
        self.current_theme = "light"
        self.current_preset = "custom"
        self.is_restoring_state = False # Flag to prevent feedback loops during init

        self.debounce_timer = QTimer()
        self.debounce_timer.setSingleShot(True)
        self.debounce_timer.setInterval(150)
        self.debounce_timer.timeout.connect(self.process_content)

        # Data structures for rules
        self.rule_checkboxes: Dict[str, QCheckBox] = {}
        self.separator_checkboxes: Dict[str, QCheckBox] = {}
        self.preset_buttons: Dict[str, QToolButton] = {}
        
        # Initialize UI
        self.setup_actions()
        self.setup_ui()
        self.setup_connections()
        
        # Restore State
        self.restore_state()
        
        # Initial Processing
        self.process_content()

    def get_icon(self, name: str, fallback_std_icon: QStyle.StandardPixmap = None) -> QIcon:
        """Load icon from assets or fallback to standard style icon."""
        icon_path = os.path.join("assets", "icons", f"{name}.png")
        if os.path.exists(icon_path):
            return QIcon(icon_path)
        if fallback_std_icon:
            return self.style().standardIcon(fallback_std_icon)
        return QIcon()

    def setup_actions(self):
        """Create all QActions here to be reused across Toolbar, Menus, and Buttons."""
        
        # --- File / Clipboard Actions ---
        self.act_paste = QAction(self.get_icon("paste", QStyle.SP_FileIcon), "粘贴", self)
        self.act_paste.setShortcut(QKeySequence.Paste)
        self.act_paste.setToolTip("粘贴文本到输入区 (Ctrl+V)")
        self.act_paste.triggered.connect(self.on_paste)

        self.act_clear = QAction(self.get_icon("clear", QStyle.SP_DialogDiscardButton), "清空", self)
        self.act_clear.setShortcut("Ctrl+L")
        self.act_clear.setToolTip("清空输入区 (Ctrl+L)")
        self.act_clear.triggered.connect(self.on_clear)

        self.act_copy = QAction(self.get_icon("copy", QStyle.SP_DialogSaveButton), "复制输出", self)
        self.act_copy.setShortcut("Ctrl+Return")
        self.act_copy.setToolTip("复制处理结果到剪贴板 (Ctrl+Enter)")
        self.act_copy.triggered.connect(self.on_copy_output)

        # --- Control Actions ---
        self.act_realtime = QAction(self.get_icon("refresh", QStyle.SP_BrowserReload), "实时预览", self)
        self.act_realtime.setCheckable(True)
        self.act_realtime.setChecked(True)
        self.act_realtime.setShortcut("Ctrl+R")
        self.act_realtime.setToolTip("开启/关闭实时处理 (Ctrl+R)")
        self.act_realtime.toggled.connect(self.on_toggle_realtime)

        # --- JSON Actions ---
        self.act_json_validate = QAction("JSON 校验", self)
        self.act_json_validate.triggered.connect(lambda: self.process_json("validate"))
        
        self.act_json_format = QAction("JSON 美化", self)
        self.act_json_format.triggered.connect(lambda: self.process_json("format"))
        
        self.act_json_minify = QAction("JSON 压缩", self)
        self.act_json_minify.triggered.connect(lambda: self.process_json("minify"))
        
        self.act_json_escape = QAction("转义 (Stringify)", self)
        self.act_json_escape.triggered.connect(lambda: self.process_json("escape"))
        
        self.act_json_unescape = QAction("去转义 (Unescape)", self)
        self.act_json_unescape.triggered.connect(lambda: self.process_json("unescape"))

        # --- More Menu Actions ---
        self.act_theme_light = QAction("浅色模式", self)
        self.act_theme_light.triggered.connect(lambda: self.set_theme("light"))
        self.act_theme_dark = QAction("深色模式", self)
        self.act_theme_dark.triggered.connect(lambda: self.set_theme("dark"))

    def setup_ui(self):
        """Build the complete Layout."""
        # 1. Top Toolbar
        self.toolbar = QToolBar("Main Toolbar")
        self.toolbar.setObjectName("MainToolbar") # Required for saveState
        self.toolbar.setIconSize(QSize(24, 24))
        self.toolbar.setMovable(False)
        self.addToolBar(Qt.TopToolBarArea, self.toolbar)

        # Add Actions to Toolbar (Grouped)
        self.toolbar.addAction(self.act_paste)
        self.toolbar.addAction(self.act_clear)
        self.toolbar.addAction(self.act_copy)
        self.toolbar.addSeparator()
        self.toolbar.addAction(self.act_realtime)
        
        # Preset Menu (Dropdown - as requested in V1.1)
        # Note: We also have a chip bar, but the user asked for "Preset Entry" in toolbar too.
        # Let's keep it as a menu for quick access if panel is closed, 
        # or remove if redundancy is bad. The requirement says "预设入口" in toolbar.
        btn_preset_menu = QToolButton()
        btn_preset_menu.setText("预设")
        btn_preset_menu.setIcon(self.get_icon("preset", QStyle.SP_FileDialogListView))
        btn_preset_menu.setPopupMode(QToolButton.InstantPopup)
        menu_preset = QMenu(btn_preset_menu)
        for preset in self.preset_manager.get_all_presets():
            action = QAction(preset['name'], self)
            action.triggered.connect(lambda checked=False, p=preset['key']: self.apply_preset(p))
            menu_preset.addAction(action)
        btn_preset_menu.setMenu(menu_preset)
        self.toolbar.addWidget(btn_preset_menu)
        
        self.toolbar.addSeparator()

        # Theme Menu
        btn_theme = QToolButton()
        btn_theme.setText("主题")
        btn_theme.setIcon(self.get_icon("theme", QStyle.SP_DesktopIcon))
        btn_theme.setPopupMode(QToolButton.InstantPopup)
        menu_theme = QMenu(btn_theme)
        menu_theme.addAction(self.act_theme_light)
        menu_theme.addAction(self.act_theme_dark)
        btn_theme.setMenu(menu_theme)
        self.toolbar.addWidget(btn_theme)

        # More Menu
        btn_more = QToolButton()
        btn_more.setText("更多")
        btn_more.setIcon(self.get_icon("more", QStyle.SP_TitleBarMenuButton))
        btn_more.setPopupMode(QToolButton.InstantPopup)
        menu_more = QMenu(btn_more)
        menu_more.addAction("批处理 (未实现)")
        menu_more.addAction("导出 CSV (未实现)")
        menu_more.addSeparator()
        menu_more.addAction("关于")
        btn_more.setMenu(menu_more)
        self.toolbar.addWidget(btn_more)

        # 2. Left Dock Widget (Rules / Tools)
        self.dock_rules = QDockWidget("工具面板", self)
        self.dock_rules.setFeatures(QDockWidget.DockWidgetClosable | QDockWidget.DockWidgetMovable)
        self.dock_rules.setAllowedAreas(Qt.LeftDockWidgetArea | Qt.RightDockWidgetArea)
        
        self.tab_widget = QTabWidget()
        self.tab_widget.addTab(self.create_text_rules_panel(), "文本清洗")
        self.tab_widget.addTab(self.create_json_tools_panel(), "JSON 工具")
        self.dock_rules.setWidget(self.tab_widget)
        
        self.addDockWidget(Qt.LeftDockWidgetArea, self.dock_rules)

        # 3. Central Area (Input / Output Splitter)
        self.main_splitter = QSplitter(Qt.Vertical)
        
        # Input Area
        input_container = QWidget()
        input_layout = QVBoxLayout(input_container)
        input_layout.setContentsMargins(0, 0, 0, 0)
        
        # Input Header
        input_header = QHBoxLayout()
        input_header.addWidget(QLabel("输入"))
        input_header.addStretch()
        
        # Inline Buttons
        btn_paste_inline = QToolButton()
        btn_paste_inline.setDefaultAction(self.act_paste)
        btn_paste_inline.setText("") 
        input_header.addWidget(btn_paste_inline)
        
        btn_clear_inline = QToolButton()
        btn_clear_inline.setDefaultAction(self.act_clear)
        btn_clear_inline.setText("")
        input_header.addWidget(btn_clear_inline)
        
        input_layout.addLayout(input_header)
        
        self.input_edit = QPlainTextEdit()
        self.input_edit.setPlaceholderText("粘贴任意文本，如：abc，123；10,131,257 …")
        input_layout.addWidget(self.input_edit)
        
        self.main_splitter.addWidget(input_container)

        # Output Area
        output_container = QWidget()
        output_layout = QVBoxLayout(output_container)
        output_layout.setContentsMargins(0, 0, 0, 0)
        
        # Output Header
        output_header = QHBoxLayout()
        self.lbl_output_title = QLabel("输出 🔒只读")
        output_header.addWidget(self.lbl_output_title)
        output_header.addStretch()
        
        btn_copy_inline = QToolButton()
        btn_copy_inline.setDefaultAction(self.act_copy)
        btn_copy_inline.setText("")
        output_header.addWidget(btn_copy_inline)
        
        output_layout.addLayout(output_header)
        
        self.output_edit = QPlainTextEdit()
        self.output_edit.setReadOnly(True)
        # Apply specific read-only styling
        self.output_edit.setStyleSheet("QPlainTextEdit { background-color: #F5F5F5; color: #333; }")
        output_layout.addWidget(self.output_edit)
        
        self.main_splitter.addWidget(output_container)
        
        # Set Splitter Defaults
        self.main_splitter.setStretchFactor(0, 1)
        self.main_splitter.setStretchFactor(1, 1)

        self.setCentralWidget(self.main_splitter)

        # 4. Status Bar
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        
        # Status Labels
        self.lbl_input_info = QLabel("输入: 0 行 / 0 字符")
        self.lbl_output_info = QLabel("输出: 0 行 / 0 字符")
        self.lbl_time_info = QLabel("耗时: 0ms")
        self.lbl_preset_info = QLabel("当前规则: 自定义")
        
        self.status_bar.addPermanentWidget(self.lbl_preset_info)
        self.status_bar.addPermanentWidget(self.lbl_input_info)
        self.status_bar.addPermanentWidget(self.lbl_output_info)
        self.status_bar.addPermanentWidget(self.lbl_time_info)
        
        self.status_bar.showMessage("就绪")

    def create_text_rules_panel(self) -> QWidget:
        """Create the Rules Tab content."""
        panel = QWidget()
        layout = QVBoxLayout(panel)
        
        # 1. Preset Chips Bar
        preset_layout = QHBoxLayout()
        preset_layout.setSpacing(4)
        preset_layout.setContentsMargins(0, 5, 0, 5)
        
        presets = self.preset_manager.get_all_presets()
        for preset in presets:
            btn = QToolButton()
            btn.setText(preset['name'])
            btn.setCheckable(True)
            btn.setAutoExclusive(True)
            # Use property to style chips in QSS if needed
            btn.setProperty("class", "chip")
            btn.clicked.connect(lambda checked=False, p=preset['key']: self.apply_preset(p))
            preset_layout.addWidget(btn)
            self.preset_buttons[preset['key']] = btn
            
        preset_layout.addStretch()
        layout.addLayout(preset_layout)

        # 2. Search Bar
        search_bar = QLineEdit()
        search_bar.setPlaceholderText("搜索规则...")
        search_bar.textChanged.connect(self.filter_rules)
        layout.addWidget(search_bar)
        
        # 3. Scroll Area
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.NoFrame)
        
        content = QWidget()
        content_layout = QVBoxLayout(content)
        
        # --- Group: Basic Cleaning ---
        grp_basic = QGroupBox("基础清洗")
        grp_basic_layout = QVBoxLayout(grp_basic)
        
        self.add_rule(grp_basic_layout, "strip_lines", "去每行首尾空格", 
                      "逐行去除首尾空白字符", True)
        
        # Separators (Parent/Child)
        cb_separators = QCheckBox("去除分隔符")
        cb_separators.setToolTip("去除逗号、分号等标点")
        cb_separators.setChecked(True)
        cb_separators.stateChanged.connect(self.on_separator_parent_changed)
        grp_basic_layout.addWidget(cb_separators)
        self.rule_checkboxes['remove_separators'] = cb_separators
        
        # Separator Children container
        sep_children_widget = QWidget()
        sep_children_layout = QHBoxLayout(sep_children_widget)
        sep_children_layout.setContentsMargins(20, 0, 0, 0)
        
        seps = [
            ("comma", ",", ","),
            ("comma_cn", "，", "，"),
            ("semicolon", ";", ";"),
            ("semicolon_cn", "；", "；"),
            ("dunhao", "、", "、")
        ]
        
        for key, char, label in seps:
            cb = QCheckBox(label)
            cb.setChecked(True)
            cb.stateChanged.connect(self.on_separator_child_changed)
            sep_children_layout.addWidget(cb)
            self.separator_checkboxes[key] = (char, cb)
            
        grp_basic_layout.addWidget(sep_children_widget)
        
        self.add_rule(grp_basic_layout, "merge_whitespace", "合并连续空白", 
                      "将连续的空格/制表符合并为一个空格", False)
        
        content_layout.addWidget(grp_basic)
        
        # --- Group: Line Processing ---
        grp_lines = QGroupBox("行处理")
        grp_lines_layout = QVBoxLayout(grp_lines)
        
        self.add_rule(grp_lines_layout, "remove_empty_lines", "去空行", "删除完全为空的行", False)
        self.add_rule(grp_lines_layout, "unique_lines", "去重 (保持顺序)", "删除重复行，保留首次出现", False)
        
        content_layout.addWidget(grp_lines)
        
        # --- Group: Extraction ---
        grp_extract = QGroupBox("提取/约束")
        grp_extract_layout = QVBoxLayout(grp_extract)
        
        self.add_rule(grp_extract_layout, "keep_digits", "只保留数字", "仅保留行内的数字字符，去除其他", False)
        
        content_layout.addWidget(grp_extract)
        
        content_layout.addStretch()
        scroll.setWidget(content)
        layout.addWidget(scroll)
        
        # Pipeline Info
        lbl_pipeline = QLabel("处理顺序: 分隔符 → Strip → 合并空白 → 只保留数字 → 去空行 → 去重")
        lbl_pipeline.setWordWrap(True)
        lbl_pipeline.setStyleSheet("color: gray; font-size: 10px;")
        layout.addWidget(lbl_pipeline)
        
        return panel

    def add_rule(self, layout, key, label, tooltip, checked):
        cb = QCheckBox(label)
        cb.setToolTip(tooltip)
        cb.setChecked(checked)
        cb.stateChanged.connect(self.on_rule_changed)
        layout.addWidget(cb)
        self.rule_checkboxes[key] = cb

    def create_json_tools_panel(self) -> QWidget:
        panel = QWidget()
        layout = QVBoxLayout(panel)
        
        layout.addWidget(QLabel("工具箱"))
        
        # Tools
        grid = QVBoxLayout()
        
        btn_validate = QToolButton()
        btn_validate.setDefaultAction(self.act_json_validate)
        btn_validate.setToolButtonStyle(Qt.ToolButtonTextBesideIcon)
        btn_validate.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        grid.addWidget(btn_validate)
        
        btn_format = QToolButton()
        btn_format.setDefaultAction(self.act_json_format)
        btn_format.setToolButtonStyle(Qt.ToolButtonTextBesideIcon)
        btn_format.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        grid.addWidget(btn_format)
        
        btn_minify = QToolButton()
        btn_minify.setDefaultAction(self.act_json_minify)
        btn_minify.setToolButtonStyle(Qt.ToolButtonTextBesideIcon)
        btn_minify.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        grid.addWidget(btn_minify)
        
        layout.addLayout(grid)
        
        layout.addWidget(QLabel("转义工具"))
        
        btn_escape = QToolButton()
        btn_escape.setDefaultAction(self.act_json_escape)
        btn_escape.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        layout.addWidget(btn_escape)
        
        btn_unescape = QToolButton()
        btn_unescape.setDefaultAction(self.act_json_unescape)
        btn_unescape.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        layout.addWidget(btn_unescape)

        layout.addStretch()
        return panel

    def setup_connections(self):
        self.input_edit.textChanged.connect(self.on_input_changed)
        self.tab_widget.currentChanged.connect(self.process_content)

    # --- Persistence Logic ---

    def restore_state(self):
        """Restore app state from settings."""
        self.is_restoring_state = True
        try:
            state = self.settings_service.load_app_state()
            rule_states = self.settings_service.load_rule_states()
            
            # 1. Restore Window State
            if state.get("geometry"):
                self.restoreGeometry(state["geometry"])
            if state.get("window_state"):
                self.restoreState(state["window_state"])
                
            # 2. Restore Rules
            for key, checked in rule_states.items():
                if key in self.rule_checkboxes:
                    self.rule_checkboxes[key].setChecked(checked)
                    
            # 3. Restore App Controls
            self.tab_widget.setCurrentIndex(state.get("last_tab_index", 0))
            self.act_realtime.setChecked(state.get("realtime_enabled", True))
            
            # 4. Restore Preset (Visual only, rules already set)
            preset_key = state.get("active_preset", "custom")
            self.current_preset = preset_key
            self.update_preset_ui(preset_key)
            
            self.status_bar.showMessage("已恢复上次使用状态", 3000)
            
        finally:
            self.is_restoring_state = False

    def closeEvent(self, event: QCloseEvent):
        """Save state on close."""
        # Collect rule states
        rule_states = {k: cb.isChecked() for k, cb in self.rule_checkboxes.items()}
        
        self.settings_service.save_rule_states(rule_states)
        self.settings_service.save_app_state(
            tab_index=self.tab_widget.currentIndex(),
            preset=self.current_preset,
            realtime=self.act_realtime.isChecked(),
            geometry=self.saveGeometry(),
            window_state=self.saveState()
        )
        super().closeEvent(event)

    # --- Preset Logic ---

    def apply_preset(self, preset_key: str):
        """Apply a preset's rules."""
        self.is_restoring_state = True # Block feedback loop temporarily
        try:
            data = self.preset_manager.get_preset(preset_key)
            if not data:
                return

            rules = data['rules']
            for key, enabled in rules.items():
                if key in self.rule_checkboxes:
                    self.rule_checkboxes[key].setChecked(enabled)
            
            # Special handling for Separators logic if needed (sync child/parent)
            # Logic in on_separator_parent_changed handles UI, but we set parent check explicitly above
            # If parent is Checked, children should default to checked?
            # Or should preset define granular separators? For now simplified.
            if rules.get("remove_separators"):
                 for _, cb in self.separator_checkboxes.values():
                     cb.setChecked(True)
            
            self.current_preset = preset_key
            self.update_preset_ui(preset_key)
            
            # Trigger process immediately
            if self.auto_process:
                self.process_content()
                
        finally:
            self.is_restoring_state = False
            
    def update_preset_ui(self, active_key: str):
        """Update chips visual state and status bar."""
        # Update chips
        for key, btn in self.preset_buttons.items():
            btn.setChecked(key == active_key)
            
        # Update Status Bar
        name = "自定义"
        if active_key != "custom":
            data = self.preset_manager.get_preset(active_key)
            if data:
                name = data['name']
        self.lbl_preset_info.setText(f"当前规则: {name}")

    def detect_custom_state(self):
        """Switch to custom state if rules change manually."""
        if self.is_restoring_state:
            return
        if self.current_preset != "custom":
            self.current_preset = "custom"
            self.update_preset_ui("custom")

    # --- Feedback Logic ---

    def show_rule_feedback(self):
        """Show ephemeral message about active rules."""
        active_rules = []
        for key, cb in self.rule_checkboxes.items():
            if cb.isChecked():
                active_rules.append(cb.text())
        
        if not active_rules:
            msg = "规则已更新: 无"
        else:
            summary = ", ".join(active_rules[:2])
            if len(active_rules) > 2:
                summary += f" +{len(active_rules)-2}"
            msg = f"规则已更新: {summary}"
            
        self.status_bar.showMessage(msg, 2000)

    # --- Event Handlers ---

    def on_input_changed(self):
        if self.auto_process:
            self.debounce_timer.start()
        self.update_info_labels()
        
        # Empty state handling
        if not self.input_edit.toPlainText().strip():
             self.output_edit.setPlaceholderText("等待输入...")
        else:
             self.output_edit.setPlaceholderText("")

    def on_rule_changed(self):
        self.detect_custom_state()
        if not self.is_restoring_state:
            self.show_rule_feedback()
            
        if self.auto_process:
            self.debounce_timer.start()

    def on_separator_parent_changed(self, state):
        checked = (state == Qt.Checked)
        for _, cb in self.separator_checkboxes.values():
            cb.blockSignals(True)
            cb.setChecked(checked)
            cb.blockSignals(False)
        self.on_rule_changed()

    def on_separator_child_changed(self):
        any_checked = any(cb.isChecked() for _, cb in self.separator_checkboxes.values())
        all_checked = all(cb.isChecked() for _, cb in self.separator_checkboxes.values())
        
        parent = self.rule_checkboxes['remove_separators']
        parent.blockSignals(True)
        if all_checked:
            parent.setCheckState(Qt.Checked)
        elif any_checked:
            parent.setCheckState(Qt.PartiallyChecked)
        else:
            parent.setCheckState(Qt.Unchecked)
        parent.blockSignals(False)
        
        self.on_rule_changed()

    def on_toggle_realtime(self, checked):
        self.auto_process = checked
        if checked:
            self.process_content()

    def process_content(self):
        current_tab_idx = self.tab_widget.currentIndex()
        if current_tab_idx == 0: # Text Rules
            self.process_text_rules()
        elif current_tab_idx == 1: # JSON Tools
            pass 
        self.update_info_labels()

    def process_text_rules(self):
        text = self.input_edit.toPlainText()
        
        # Build Config
        config = {}
        active_count = 0
        for key, cb in self.rule_checkboxes.items():
            config[key] = cb.isChecked()
            if cb.isChecked():
                active_count += 1
            
        # Active Separators
        active_seps = []
        for key, (char, cb) in self.separator_checkboxes.items():
            if cb.isChecked():
                active_seps.append(char)
        config['active_separators'] = active_seps
        
        import time
        start_time = time.time()
        
        result = TextFormatter.process(text, config)
        
        end_time = time.time()
        duration = (end_time - start_time) * 1000
        
        self.output_edit.setPlainText(result)
        self.lbl_time_info.setText(f"耗时: {duration:.1f}ms")
        
        # Execution Feedback
        self.lbl_output_title.setText(f"输出 (已应用 {active_count} 条规则)")
        QTimer.singleShot(1500, lambda: self.lbl_output_title.setText("输出 🔒只读"))

    def process_json(self, action_type):
        text = self.input_edit.toPlainText()
        if not text.strip():
            self.status_bar.showMessage("输入为空", 2000)
            return

        import time
        start_time = time.time()
        
        result = ""
        success = True
        
        if action_type == "validate":
            valid, msg = JsonTools.validate(text)
            result = msg
            success = valid
        elif action_type == "format":
            result = JsonTools.format_json(text)
        elif action_type == "minify":
            result = JsonTools.minify_json(text)
        elif action_type == "escape":
            result = JsonTools.escape_string(text)
        elif action_type == "unescape":
            result = JsonTools.unescape_string(text)
            
        end_time = time.time()
        
        self.output_edit.setPlainText(result)
        self.lbl_time_info.setText(f"耗时: {(end_time - start_time) * 1000:.1f}ms")
        
        if not success:
            self.status_bar.showMessage(f"JSON 解析失败", 3000)
        else:
            self.lbl_output_title.setText("输出 (JSON 操作成功)")
            QTimer.singleShot(1500, lambda: self.lbl_output_title.setText("输出 🔒只读"))

    def update_info_labels(self):
        in_text = self.input_edit.toPlainText()
        out_text = self.output_edit.toPlainText()
        
        in_lines = len(in_text.splitlines())
        in_chars = len(in_text)
        
        out_lines = len(out_text.splitlines())
        out_chars = len(out_text)
        
        self.lbl_input_info.setText(f"输入: {in_lines} 行 / {in_chars} 字符")
        self.lbl_output_info.setText(f"输出: {out_lines} 行 / {out_chars} 字符")

    def filter_rules(self, text):
        text = text.lower()
        for key, cb in self.rule_checkboxes.items():
            visible = text in cb.text().lower() or not text
            cb.setVisible(visible)

    # --- Action Slots ---
    def on_paste(self):
        self.input_edit.paste()

    def on_clear(self):
        self.input_edit.clear()

    def on_copy_output(self):
        text = self.output_edit.toPlainText()
        if text:
            clipboard = QApplication.clipboard()
            clipboard.setText(text)
            self.status_bar.showMessage("已复制 ✓", 2000)
        else:
            self.status_bar.showMessage("没有可复制的内容", 2000)

    def set_theme(self, theme_name):
        self.current_theme = theme_name
        self.settings_service.save_dark_theme(theme_name == "dark")
        # Theme logic would go here
