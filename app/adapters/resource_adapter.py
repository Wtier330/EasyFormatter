import os
import sys

class ResourceAdapter:
    def base_path(self) -> str:
        if getattr(sys, "frozen", False):
            return sys._MEIPASS  # type: ignore[attr-defined]
        return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    def resource_path(self, relative: str) -> str:
        base = self.base_path()
        return os.path.join(base, relative)
