from typing import Dict, List, Set

class PresetService:
    def __init__(self):
        self._presets: Dict[str, Set[str]] = {}

    def list_presets(self) -> List[str]:
        return list(self._presets.keys())

    def save_preset(self, name: str, rule_ids: Set[str]) -> None:
        if not name:
            return
        self._presets[name] = set(rule_ids or set())

    def load_preset(self, name: str) -> Set[str]:
        return set(self._presets.get(name, set()))

    def delete_preset(self, name: str) -> None:
        self._presets.pop(name, None)

