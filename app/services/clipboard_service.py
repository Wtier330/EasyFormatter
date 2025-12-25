from PySide6.QtWidgets import QApplication

class ClipboardService:
    def set_text(self, text: str) -> None:
        QApplication.clipboard().setText(text or "")

    def get_text(self) -> str:
        return QApplication.clipboard().text() or ""

