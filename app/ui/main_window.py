import csv
from io import StringIO
from typing import Set
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPlainTextEdit, QCheckBox, QSplitter, QToolBar,
    QStatusBar, QLabel, QScrollArea, QFileDialog, QInputDialog
)
from PySide6.QtCore import Qt, QTimer, QSize
from PySide6.QtGui import QAction, QKeySequence
from app.adapters.resource_adapter import ResourceAdapter

from app.core.pipeline import get_all_rules
from app.services.text_service import TextService
from app.services.clipboard_service import ClipboardService
from app.services.file_service import FileService
from app.services.settings_service import SettingsService
from app.services.preset_service import PresetService

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("数据格式化工具")
        self.resize(900, 600)
        self.is_dark_theme = False
        self.active_rules: Set[str] = set()

        self.text_service = TextService()
        self.clipboard_service = ClipboardService()
        self.file_service = FileService()
        self.preset_service = PresetService()
        self.settings_service = SettingsService()
        self.resource_adapter = ResourceAdapter()

        self.debounce_timer = QTimer()
        self.debounce_timer.setSingleShot(True)
        self.debounce_timer.setInterval(150)
        self.debounce_timer.timeout.connect(self.perform_formatting)
        self.setup_ui()
        self.init_rules_state()
        self.load_settings()
        self.perform_formatting()

    def setup_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        self.rules_panel = QWidget()
        self.rules_panel.setObjectName("rulesContainer")
        self.rules_panel.setFixedWidth(220)
        rules_layout = QVBoxLayout(self.rules_panel)
        rules_layout.setContentsMargins(15, 15, 15, 15)
        rules_title = QLabel("转换规则")
        rules_title.setObjectName("sectionTitle")
        rules_layout.addWidget(rules_title)
        self.rule_checkboxes = {}
        for rule in get_all_rules():
            cb = QCheckBox(rule.label)
            cb.setToolTip(rule.description)
            cb.toggled.connect(self.on_rule_toggled)
            cb.setProperty("rule_id", rule.id)
            self.rule_checkboxes[rule.id] = cb
            rules_layout.addWidget(cb)
        rules_layout.addStretch()
        rules_scroll = QScrollArea()
        rules_scroll.setWidget(self.rules_panel)
        rules_scroll.setWidgetResizable(True)
        rules_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        rules_scroll.setFixedWidth(220)
        main_layout.addWidget(rules_scroll)

        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        right_layout.setContentsMargins(10, 10, 10, 10)
        splitter = QSplitter(Qt.Orientation.Vertical)
        input_container = QWidget()
        input_layout = QVBoxLayout(input_container)
        input_layout.setContentsMargins(0, 0, 0, 0)
        input_label = QLabel("输入内容")
        self.input_edit = QPlainTextEdit()
        self.input_edit.setPlaceholderText("在此粘贴混乱数据...")
        self.input_edit.textChanged.connect(self.on_input_changed)
        input_layout.addWidget(input_label)
        input_layout.addWidget(self.input_edit)
        output_container = QWidget()
        output_layout = QVBoxLayout(output_container)
        output_layout.setContentsMargins(0, 0, 0, 0)
        output_label = QLabel("格式化结果")
        self.output_edit = QPlainTextEdit()
        self.output_edit.setReadOnly(True)
        self.output_edit.setPlaceholderText("格式化结果将显示在这里...")
        output_layout.addWidget(output_label)
        output_layout.addWidget(self.output_edit)
        splitter.addWidget(input_container)
        splitter.addWidget(output_container)
        splitter.setStretchFactor(0, 1)
        splitter.setStretchFactor(1, 1)
        right_layout.addWidget(splitter)
        main_layout.addWidget(right_panel)

        self.toolbar = QToolBar()
        self.toolbar.setIconSize(QSize(24, 24))
        self.toolbar.setMovable(False)
        self.toolbar.setToolButtonStyle(Qt.ToolButtonIconOnly)
        self.addToolBar(Qt.ToolBarArea.TopToolBarArea, self.toolbar)
        style = self.style()
        action_copy = QAction(style.standardIcon(style.StandardPixmap.SP_DialogYesButton), "复制输出", self)
        action_copy.setShortcut(QKeySequence.Copy)
        action_copy.triggered.connect(self.copy_output)
        self.toolbar.addAction(action_copy)
        action_paste = QAction(style.standardIcon(style.StandardPixmap.SP_ArrowDown), "粘贴到输入", self)
        action_paste.triggered.connect(self.paste_input)
        self.toolbar.addAction(action_paste)
        action_clear = QAction(style.standardIcon(style.StandardPixmap.SP_DialogDiscardButton), "清空", self)
        action_clear.triggered.connect(self.clear_all)
        self.toolbar.addAction(action_clear)
        self.toolbar.addSeparator()
        action_save = QAction(style.standardIcon(style.StandardPixmap.SP_DialogSaveButton), "保存文件", self)
        action_save.triggered.connect(self.save_file)
        self.toolbar.addAction(action_save)
        action_save_csv = QAction(style.standardIcon(style.StandardPixmap.SP_DriveDVDIcon), "保存为CSV", self)
        action_save_csv.triggered.connect(self.save_csv)
        self.toolbar.addAction(action_save_csv)
        action_batch = QAction(style.standardIcon(style.StandardPixmap.SP_FileDialogDetailedView), "批处理文件", self)
        action_batch.triggered.connect(self.batch_process_files)
        self.toolbar.addAction(action_batch)
        action_save_preset = QAction(style.standardIcon(style.StandardPixmap.SP_DialogYesButton), "保存预设", self)
        action_save_preset.triggered.connect(self.save_preset)
        self.toolbar.addAction(action_save_preset)
        action_apply_preset = QAction(style.standardIcon(style.StandardPixmap.SP_FileDialogListView), "应用预设", self)
        action_apply_preset.triggered.connect(self.apply_preset)
        self.toolbar.addAction(action_apply_preset)
        self.toolbar.addSeparator()
        action_theme = QAction(style.standardIcon(style.StandardPixmap.SP_DesktopIcon), "切换主题", self)
        action_theme.triggered.connect(self.toggle_theme)
        self.toolbar.addAction(action_theme)

        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_label_chars = QLabel("字符数: 0")
        self.status_label_lines = QLabel("行数: 0")
        self.status_msg = QLabel("")
        self.status_bar.addPermanentWidget(self.status_label_lines)
        self.status_bar.addPermanentWidget(self.status_label_chars)
        self.status_bar.addWidget(self.status_msg)

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
        input_text = self.input_edit.toPlainText()
        if not input_text:
            self.output_edit.setPlainText("")
            self.update_stats(0, 0)
            self.status_msg.setText("")
            return
        result, chars, lines, ms = self.text_service.format_text(input_text, self.active_rules)
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
