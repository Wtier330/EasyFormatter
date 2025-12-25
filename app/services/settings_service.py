from typing import Set
from PySide6.QtCore import QSettings

class SettingsService:
    def __init__(self):
        self.settings = QSettings("EasyFormatter", "EasyFormatter")

    def _to_bool(self, value) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, int):
            return value != 0
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "y", "on"}
        return False

    def load_active_rules(self) -> Set[str]:
        value = self.settings.value("active_rules", [])
        return set(value) if isinstance(value, list) else set()

    def save_active_rules(self, rule_ids: Set[str]) -> None:
        self.settings.setValue("active_rules", list(rule_ids))

    def load_dark_theme(self) -> bool:
        v = self.settings.value("dark_theme", False)
        return self._to_bool(v)

    def save_dark_theme(self, enabled: bool) -> None:
        self.settings.setValue("dark_theme", enabled)
