import re
from typing import List, Set, Dict, Any

class TextFormatter:
    """
    Core text processing logic for EasyFormatter.
    Pipeline Order:
    Separators -> Strip -> Merge Whitespace -> Keep Digits -> Empty Lines -> Unique Lines
    """

    @staticmethod
    def process(text: str, config: Dict[str, Any]) -> str:
        if not text:
            return ""

        # 1. Remove Separators (去除分隔符)
        # config['separators'] should be a list of characters to remove, e.g., [',', '，', ';']
        # or config['remove_separators'] is True and config['active_separators'] is a list
        if config.get('remove_separators', False):
            separators = config.get('active_separators', [])
            if separators:
                # Escape special regex characters if necessary, though most punctuation here is fine or needs simple escaping
                # constructing a character class, e.g. [,\，;\；]
                pattern_str = "[" + "".join(re.escape(s) for s in separators) + "]"
                text = re.sub(pattern_str, "", text)

        lines = text.splitlines()
        
        # 2. Strip per line (去每行首尾空格)
        if config.get('strip_lines', True):
            lines = [line.strip() for line in lines]

        # 3. Merge continuous whitespace (合并连续空白)
        if config.get('merge_whitespace', False):
            # Replace sequence of whitespace with single space
            lines = [re.sub(r'\s+', ' ', line) for line in lines]

        # 4. Keep only digits (只保留数字)
        if config.get('keep_digits', False):
            # 逐行提取数字拼接
            new_lines = []
            for line in lines:
                digits = "".join(re.findall(r"\d+", line))
                new_lines.append(digits)
            lines = new_lines

        # 5. Remove empty lines (去空行)
        if config.get('remove_empty_lines', False):
            lines = [line for line in lines if line] # If strip was run, line is empty string. If not, line might be "   "

        # 6. Unique lines (去重 - 保持顺序)
        if config.get('unique_lines', False):
            seen = set()
            unique_lines = []
            for line in lines:
                if line not in seen:
                    unique_lines.append(line)
                    seen.add(line)
            lines = unique_lines

        return "\n".join(lines)
