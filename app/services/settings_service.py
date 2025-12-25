from typing import Set, Dict, Any, Optional
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

    # --- Rule States ---
    def load_rule_states(self) -> Dict[str, bool]:
        """Load the checked state of all rules."""
        val = self.settings.value("rule_states", {})
        if isinstance(val, dict):
            # Ensure values are bools
            return {k: self._to_bool(v) for k, v in val.items()}
        return {}

    def save_rule_states(self, states: Dict[str, bool]) -> None:
        self.settings.setValue("rule_states", states)

    # --- App State ---
    def load_app_state(self) -> Dict[str, Any]:
        """Load general app state: tab index, preset, realtime toggle."""
        return {
            "last_tab_index": int(self.settings.value("last_tab_index", 0)),
            "active_preset": str(self.settings.value("active_preset", "custom")),
            "realtime_enabled": self._to_bool(self.settings.value("realtime_enabled", True)),
            "geometry": self.settings.value("geometry"),
            "window_state": self.settings.value("window_state")
        }

    def save_app_state(self, tab_index: int, preset: str, realtime: bool, 
                       geometry: Optional[Any] = None, window_state: Optional[Any] = None) -> None:
        self.settings.setValue("last_tab_index", tab_index)
        self.settings.setValue("active_preset", preset)
        self.settings.setValue("realtime_enabled", realtime)
        if geometry:
            self.settings.setValue("geometry", geometry)
        if window_state:
            self.settings.setValue("window_state", window_state)

    # --- Theme ---
    def load_dark_theme(self) -> bool:
        v = self.settings.value("dark_theme", False)
        return self._to_bool(v)

    def save_dark_theme(self, enabled: bool) -> None:
        self.settings.setValue("dark_theme", enabled)
