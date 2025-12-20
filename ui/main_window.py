import os
from typing import Set
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QPlainTextEdit, QCheckBox, QSplitter, QToolBar, 
    QStatusBar, QLabel, QApplication, QScrollArea,
    QSizePolicy, QFileDialog, QToolTip
)
from PySide6.QtCore import Qt, QTimer, Slot, QSize
from PySide6.QtGui import QAction, QIcon, QKeySequence, QClipboard

from core.pipeline import process_text, get_all_rules

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        
        self.setWindowTitle("数据格式化工具")
        self.resize(900, 600)
        
        # 状态
        self.active_rules: Set[str] = set()
        self.debounce_timer = QTimer()
        self.debounce_timer.setSingleShot(True)
        self.debounce_timer.setInterval(150)
        self.debounce_timer.timeout.connect(self.perform_formatting)
        
        # 设置 UI
        self.setup_ui()
        
        # 初始化默认规则
        self.init_rules_state()
        
        # 初始格式化
        self.perform_formatting()

    def setup_ui(self):
        # 中心部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # --- 左侧面板：规则 ---
        self.rules_panel = QWidget()
        self.rules_panel.setObjectName("rulesContainer")
        self.rules_panel.setFixedWidth(220)
        rules_layout = QVBoxLayout(self.rules_panel)
        rules_layout.setContentsMargins(15, 15, 15, 15)
        
        rules_title = QLabel("转换规则")
        rules_title.setObjectName("sectionTitle")
        rules_layout.addWidget(rules_title)
        
        # 规则复选框
        self.rule_checkboxes = {}
        for rule in get_all_rules():
            cb = QCheckBox(rule.label)
            cb.setToolTip(rule.description)
            cb.toggled.connect(self.on_rule_toggled)
            # 将规则 ID 存储在属性中或通过字典查找
            cb.setProperty("rule_id", rule.id)
            self.rule_checkboxes[rule.id] = cb
            rules_layout.addWidget(cb)
            
        rules_layout.addStretch()
        
        # 如果需要，将规则包装在滚动区域中（虽然规则很少，不是严格必要的，但有利于扩展）
        rules_scroll = QScrollArea()
        rules_scroll.setWidget(self.rules_panel)
        rules_scroll.setWidgetResizable(True)
        rules_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        rules_scroll.setFixedWidth(220)
        
        main_layout.addWidget(rules_scroll)
        
        # --- 右侧面板：编辑器 ---
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        right_layout.setContentsMargins(10, 10, 10, 10)
        
        # 分割器
        splitter = QSplitter(Qt.Orientation.Vertical)
        
        # 输入区域
        input_container = QWidget()
        input_layout = QVBoxLayout(input_container)
        input_layout.setContentsMargins(0, 0, 0, 0)
        input_label = QLabel("输入内容")
        self.input_edit = QPlainTextEdit()
        self.input_edit.setPlaceholderText("在此粘贴混乱数据...")
        self.input_edit.textChanged.connect(self.on_input_changed)
        input_layout.addWidget(input_label)
        input_layout.addWidget(self.input_edit)
        
        # 输出区域
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
        
        # --- 工具栏 ---
        self.toolbar = QToolBar()
        self.toolbar.setIconSize(QSize(24, 24))
        self.toolbar.setMovable(False)
        self.toolbar.setToolButtonStyle(Qt.ToolButtonIconOnly)
        self.addToolBar(Qt.ToolBarArea.TopToolBarArea, self.toolbar)
        
        # 动作
        style = self.style()
        
        # 复制
        icon_copy = style.standardIcon(style.StandardPixmap.SP_DialogApplyButton) # 占位符
        # 更好的复制占位符？SP_FileIcon 或创建文本图标。
        # 实际上 PySide6 没有特定的“复制”标准图标，除非使用主题。
        # 我们将使用 SP_DialogApplyButton (勾号) 或 SP_DriveFDIcon (软盘) 等。
        # 让我们使用标准像素图，大致类似于动作。
        
        action_copy = QAction(style.standardIcon(style.StandardPixmap.SP_DialogYesButton), "复制输出", self)
        action_copy.setToolTip("复制格式化后的内容 (Ctrl+C)")
        action_copy.setShortcut(QKeySequence.Copy) # 仅在聚焦时有效，但有总比没有好
        action_copy.triggered.connect(self.copy_output)
        self.toolbar.addAction(action_copy)
        
        # 粘贴
        action_paste = QAction(style.standardIcon(style.StandardPixmap.SP_ArrowDown), "粘贴到输入", self)
        action_paste.setToolTip("从剪贴板粘贴到输入框")
        action_paste.triggered.connect(self.paste_input)
        self.toolbar.addAction(action_paste)
        
        # 清空
        action_clear = QAction(style.standardIcon(style.StandardPixmap.SP_DialogDiscardButton), "清空", self)
        action_clear.setToolTip("清空输入和输出")
        action_clear.triggered.connect(self.clear_all)
        self.toolbar.addAction(action_clear)
        
        self.toolbar.addSeparator()
        
        # 保存
        action_save = QAction(style.standardIcon(style.StandardPixmap.SP_DialogSaveButton), "保存文件", self)
        action_save.setToolTip("将输出保存为文件")
        action_save.triggered.connect(self.save_file)
        self.toolbar.addAction(action_save)
        
        # --- 状态栏 ---
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        
        self.status_label_chars = QLabel("字符数: 0")
        self.status_label_lines = QLabel("行数: 0")
        self.status_msg = QLabel("")
        
        self.status_bar.addPermanentWidget(self.status_label_lines)
        self.status_bar.addPermanentWidget(self.status_label_chars)
        self.status_bar.addWidget(self.status_msg)

    def init_rules_state(self):
        """根据默认启用状态初始化复选框。"""
        for rule in get_all_rules():
            if rule.default_enabled:
                self.rule_checkboxes[rule.id].setChecked(True)
                self.active_rules.add(rule.id)
            else:
                self.rule_checkboxes[rule.id].setChecked(False)

    def on_input_changed(self):
        """使用防抖处理输入文本更改。"""
        self.debounce_timer.start()

    def on_rule_toggled(self, checked):
        """处理规则复选框切换。"""
        sender = self.sender()
        if isinstance(sender, QCheckBox):
            rule_id = sender.property("rule_id")
            if checked:
                self.active_rules.add(rule_id)
            else:
                self.active_rules.discard(rule_id)
            # 规则更改时立即更新
            self.perform_formatting()

    def perform_formatting(self):
        """执行管道。"""
        input_text = self.input_edit.toPlainText()
        
        if not input_text:
            self.output_edit.setPlainText("")
            self.update_stats(0, 0)
            return

        result = process_text(input_text, self.active_rules)
        
        # 保留滚动位置？（可选，良好的用户体验）
        scrollbar = self.output_edit.verticalScrollBar()
        old_val = scrollbar.value()
        
        self.output_edit.setPlainText(result)
        
        # 如果可能，恢复滚动
        if scrollbar.maximum() >= old_val:
            scrollbar.setValue(old_val)
            
        self.update_stats(len(result), len(result.splitlines()))

    def update_stats(self, chars, lines):
        self.status_label_chars.setText(f"字符数: {chars}")
        self.status_label_lines.setText(f"行数: {lines}")

    def copy_output(self):
        text = self.output_edit.toPlainText()
        if text:
            clipboard = QApplication.clipboard()
            clipboard.setText(text)
            self.status_bar.showMessage("已复制到剪贴板", 3000)
        else:
            self.status_bar.showMessage("没有内容可复制", 2000)

    def paste_input(self):
        clipboard = QApplication.clipboard()
        text = clipboard.text()
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
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(text)
                self.status_bar.showMessage(f"已保存到: {file_path}", 5000)
            except Exception as e:
                self.status_bar.showMessage(f"保存失败: {str(e)}", 5000)
