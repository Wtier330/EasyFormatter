import sys
import os
from PySide6.QtWidgets import QApplication
from app.ui.main_window import MainWindow
from app.adapters.resource_adapter import ResourceAdapter

def load_stylesheet(app) -> None:
    """加载 QSS 样式表。"""
    adapter = ResourceAdapter()
    style_path = adapter.resource_path("app/ui/styles.qss")
    if not os.path.exists(style_path):
        return
    with open(style_path, "r", encoding="utf-8") as f:
        app.setStyleSheet(f.read())

def main():
    app = QApplication(sys.argv)

    app.setApplicationName("EasyFormatter")
    app.setOrganizationName("EasyFormatter")

    load_stylesheet(app)

    window = MainWindow()
    window.show()

    sys.exit(app.exec())

if __name__ == "__main__":
    main()
