import os
from typing import Iterable, Set
from app.core.pipeline import process_text

class FileService:
    def save_text(self, path: str, text: str) -> None:
        if not path:
            return
        with open(path, "w", encoding="utf-8") as f:
            f.write(text or "")

    def open_text(self, path: str) -> str:
        if not path or not os.path.exists(path):
            return ""
        with open(path, "r", encoding="utf-8") as f:
            return f.read()

    def batch_process(self, src_files: Iterable[str], active_rule_ids: Set[str]) -> int:
        count = 0
        for src in src_files:
            if not os.path.isfile(src):
                continue
            text = self.open_text(src)
            result = process_text(text, active_rule_ids)
            out = src + ".formatted.txt"
            self.save_text(out, result)
            count += 1
        return count

