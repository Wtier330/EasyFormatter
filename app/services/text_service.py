from typing import Set, Tuple
from time import perf_counter
from app.core.pipeline import process_text

class TextService:
    def format_text(self, text: str, active_rule_ids: Set[str]) -> Tuple[str, int, int, int]:
        start = perf_counter()
        result = process_text(text or "", active_rule_ids or set())
        duration_ms = int((perf_counter() - start) * 1000)
        chars = len(result)
        lines = len(result.splitlines()) if result else 0
        return result, chars, lines, duration_ms
