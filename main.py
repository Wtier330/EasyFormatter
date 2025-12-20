import sys
import os
from PySide6.QtWidgets import QApplication
from ui.main_window import MainWindow

def load_stylesheet(app):
    """从 ui 目录加载 QSS 样式表文件。"""
    # 判断是运行源码还是冻结后的程序 (exe) 以确定路径
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))
    
    style_path = os.path.join(base_path, 'ui', 'styles.qss')
    
    if os.path.exists(style_path):
        with open(style_path, 'r', encoding='utf-8') as f:
            app.setStyleSheet(f.read())
    else:
        print(f"警告: 未在 {style_path} 找到样式表")

def main():
    app = QApplication(sys.argv)
    
    # 设置应用程序元数据
    app.setApplicationName("EasyFormatter")
    app.setOrganizationName("MyOrg")
    
    # 加载样式
    load_stylesheet(app)
    
    window = MainWindow()
    window.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
